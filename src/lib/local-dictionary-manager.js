/**
 * 本地词典管理器
 *
 * 功能:
 * 1. IndexedDB 存储和查询
 * 2. Tier 1 内存缓存 (5000 个高频词)
 * 3. 智能查词路由
 * 4. 词形变化匹配
 */

export class LocalDictionaryManager {
  constructor() {
    this.dbName = 'MyDictionary';
    this.dbVersion = 1;
    this.db = null;

    // Tier 1 内存缓存 (5000 个高频词)
    this.tier1Cache = null;
    this.cacheLoaded = false;

    // 性能统计
    this.stats = {
      hits: 0,
      misses: 0,
      avgLookupTime: 0
    };
  }

  /**
   * 初始化 IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ LocalDictionary IndexedDB 已初始化');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建词典存储 (按 word 索引)
        if (!db.objectStoreNames.contains('dictionary')) {
          const store = db.createObjectStore('dictionary', { keyPath: 'word' });
          store.createIndex('collins', 'collins', { unique: false });
          store.createIndex('oxford', 'oxford', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          console.log('✅ 创建 dictionary 表');
        }

        // 创建元数据存储
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
          console.log('✅ 创建 metadata 表');
        }
      };
    });
  }

  /**
   * 加载 Tier 1 到内存
   */
  async loadTier1() {
    if (this.cacheLoaded) {
      console.log('📦 Tier 1 已在内存中');
      return;
    }

    try {
      const startTime = performance.now();

      // 从扩展资源加载
      const url = chrome.runtime.getURL('data/dictionary/tier1-common.json');
      const response = await fetch(url);
      const tier1Data = await response.json();

      console.log(`📚 加载 Tier 1: ${tier1Data.length} 词`);

      // 存入 IndexedDB
      const tx = this.db.transaction(['dictionary', 'metadata'], 'readwrite');
      const dictStore = tx.objectStore('dictionary');
      const metaStore = tx.objectStore('metadata');

      // 批量写入
      for (const entry of tier1Data) {
        dictStore.put(entry);
      }

      // 保存元数据
      await metaStore.put({
        key: 'tier1',
        loadedAt: new Date().toISOString(),
        count: tier1Data.length
      });

      await tx.complete;

      // 缓存到内存
      this.tier1Cache = new Map(tier1Data.map(e => [e.word.toLowerCase(), e]));
      this.cacheLoaded = true;

      const loadTime = performance.now() - startTime;
      console.log(`✅ Tier 1 加载完成 (${loadTime.toFixed(2)}ms)`);
      console.log(`   内存缓存: ${this.tier1Cache.size} 词`);

    } catch (error) {
      console.error('❌ Tier 1 加载失败:', error);
      throw error;
    }
  }

  /**
   * 查询单词 (优先使用内存缓存)
   * @param {string} word - 要查询的单词
   * @returns {Object|null} 词条数据
   */
  async lookup(word) {
    const startTime = performance.now();
    const normalized = word.toLowerCase().trim();

    // 1. 优先从内存缓存查询 (Tier 1)
    if (this.cacheLoaded && this.tier1Cache.has(normalized)) {
      const result = this.tier1Cache.get(normalized);
      const lookupTime = performance.now() - startTime;

      this.stats.hits++;
      this._updateAvgTime(lookupTime);

      console.log(`🎯 内存命中: "${word}" (${lookupTime.toFixed(2)}ms)`);
      return { ...result, source: 'tier1', lookupTime };
    }

    // 2. 从 IndexedDB 查询 (Tier 2/3)
    try {
      const tx = this.db.transaction(['dictionary'], 'readonly');
      const store = tx.objectStore('dictionary');
      const request = store.get(normalized);

      const result = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const lookupTime = performance.now() - startTime;

      if (result) {
        this.stats.hits++;
        this._updateAvgTime(lookupTime);
        console.log(`📖 IndexedDB 命中: "${word}" (${lookupTime.toFixed(2)}ms)`);
        return { ...result, source: 'indexeddb', lookupTime };
      }

      // 3. 尝试词形变化匹配
      const variantResult = await this._lookupVariant(normalized);
      if (variantResult) {
        const totalTime = performance.now() - startTime;
        this.stats.hits++;
        this._updateAvgTime(totalTime);
        console.log(`🔄 词形匹配: "${word}" → "${variantResult.word}" (${totalTime.toFixed(2)}ms)`);
        return { ...variantResult, source: 'variant', lookupTime: totalTime };
      }

      // 4. 未找到
      this.stats.misses++;
      console.log(`❌ 未找到: "${word}" (${lookupTime.toFixed(2)}ms)`);
      return null;

    } catch (error) {
      console.error('❌ 查询失败:', error);
      return null;
    }
  }

  /**
   * 词形变化匹配 (running → run)
   * @private
   */
  async _lookupVariant(word) {
    // 常见词形变化规则
    const variants = [
      word.replace(/ing$/, ''),      // running → run
      word.replace(/ed$/, ''),       // walked → walk
      word.replace(/s$/, ''),        // books → book
      word.replace(/es$/, ''),       // watches → watch
      word.replace(/ies$/, 'y'),     // studies → study
      word.replace(/er$/, ''),       // bigger → big
      word.replace(/est$/, '')       // biggest → big
    ];

    // 去重
    const uniqueVariants = [...new Set(variants)].filter(v => v !== word && v.length > 2);

    // 逐个查询
    for (const variant of uniqueVariants) {
      // 先查内存
      if (this.cacheLoaded && this.tier1Cache.has(variant)) {
        return this.tier1Cache.get(variant);
      }

      // 再查 IndexedDB
      try {
        const tx = this.db.transaction(['dictionary'], 'readonly');
        const store = tx.objectStore('dictionary');
        const request = store.get(variant);

        const result = await new Promise((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        if (result) return result;
      } catch (error) {
        console.error('词形查询失败:', error);
      }
    }

    return null;
  }

  /**
   * 短语查询 (2-5 个单词)
   * @param {string} phrase - 短语
   * @returns {Array} 各单词的词条
   */
  async lookupPhrase(phrase) {
    const words = phrase.trim().split(/\s+/);
    if (words.length > 5) {
      return null; // 超过 5 个词不处理
    }

    const results = [];
    for (const word of words) {
      const result = await this.lookup(word);
      if (result) {
        results.push(result);
      }
    }

    return results.length > 0 ? results : null;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.tier1Cache?.size || 0,
      cacheLoaded: this.cacheLoaded
    };
  }

  /**
   * 更新平均查询时间
   * @private
   */
  _updateAvgTime(time) {
    const total = this.stats.hits + this.stats.misses;
    this.stats.avgLookupTime =
      (this.stats.avgLookupTime * (total - 1) + time) / total;
  }

  /**
   * 判断查询类型
   * @param {string} text - 输入文本
   * @returns {string} 'SINGLE_WORD' | 'PHRASE' | 'SENTENCE'
   */
  static getQueryType(text) {
    const trimmed = text.trim();

    // 包含中文字符 → 句子
    if (/[\u4e00-\u9fa5]/.test(trimmed)) {
      return 'SENTENCE';
    }

    // 统计单词数
    const words = trimmed.split(/\s+/);
    const wordCount = words.length;

    if (wordCount === 1) {
      // 单个词且没有特殊字符
      return /^[a-zA-Z-']+$/.test(trimmed) ? 'SINGLE_WORD' : 'SENTENCE';
    } else if (wordCount <= 5) {
      // 2-5 个单词 → 短语
      return 'PHRASE';
    } else {
      // 超过 5 个单词 → 句子
      return 'SENTENCE';
    }
  }

  /**
   * 格式化词条为显示文本
   * @param {Object} entry - 词条数据
   * @returns {string} 格式化后的文本
   */
  static formatEntry(entry) {
    let formatted = `📖 ${entry.word}`;

    // 音标
    if (entry.phonetic) {
      formatted += ` /${entry.phonetic}/`;
    }

    // 柯林斯星级
    if (entry.collins > 0) {
      formatted += ` ${'⭐'.repeat(entry.collins)}`;
    }

    // 标签 (CET4, IELTS 等)
    if (entry.tags && entry.tags.length > 0) {
      const displayTags = entry.tags
        .filter(t => ['cet4', 'cet6', 'ielts', 'toefl', 'gre'].includes(t))
        .map(t => t.toUpperCase());
      if (displayTags.length > 0) {
        formatted += ` [${displayTags.join(', ')}]`;
      }
    }

    formatted += '\n\n';

    // 中文翻译
    if (entry.translation) {
      formatted += `📝 ${entry.translation}\n\n`;
    }

    // 英文释义
    if (entry.definition) {
      formatted += `📚 ${entry.definition}\n\n`;
    }

    // 词形变化
    if (entry.exchange && Object.keys(entry.exchange).length > 0) {
      formatted += '🔄 词形变化:\n';
      const exchangeMap = {
        plural: '复数',
        past: '过去式',
        thirdPerson: '三单',
        presentParticiple: '现在分词',
        comparative: '比较级',
        superlative: '最高级'
      };
      for (const [type, value] of Object.entries(entry.exchange)) {
        const label = exchangeMap[type] || type;
        formatted += `   ${label}: ${value}\n`;
      }
    }

    return formatted.trim();
  }
}
