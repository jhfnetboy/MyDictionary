/**
 * Academic Phrasebank Manager
 * 管理学术短语库的加载、查询和缓存
 */

export class AcademicPhrasebankManager {
  constructor() {
    this.phrasebankData = null;
    this.isInitialized = false;
    this.cacheKey = 'academic_phrasebank_cache';
    this.cacheVersion = '1.0.0';
  }

  /**
   * 初始化短语库
   * @param {Object} data - 可选的预加载数据
   */
  async initialize(data = null) {
    if (this.isInitialized) {
      console.log('📚 Academic Phrasebank already initialized');
      return;
    }

    console.log('📚 Initializing Academic Phrasebank...');

    try {
      // 如果提供了数据，直接使用
      if (data) {
        this.phrasebankData = data;
        this.isInitialized = true;
        console.log('✅ Academic Phrasebank loaded from provided data');
        console.log(`📊 Total phrases: ${this.phrasebankData.totalPhrases}`);

        // 缓存到 localStorage
        await this.saveToCache();
        return;
      }

      // 尝试从缓存加载
      const cached = await this.loadFromCache();
      if (cached) {
        this.phrasebankData = cached;
        this.isInitialized = true;
        console.log('✅ Academic Phrasebank loaded from cache');
        return;
      }

      // 从文件加载
      await this.loadFromFile();

      // 缓存到 localStorage
      await this.saveToCache();

      this.isInitialized = true;
      console.log('✅ Academic Phrasebank initialized successfully');
      console.log(`📊 Total phrases: ${this.phrasebankData.totalPhrases}`);
    } catch (error) {
      console.error('❌ Failed to initialize Academic Phrasebank:', error);
      throw error;
    }
  }

  /**
   * 从文件加载短语库
   */
  async loadFromFile() {
    try {
      // 在 Service Worker 中，直接导入 JSON 数据
      // 注意：这个方法会在 background.js 中被调用
      const module = await import(chrome.runtime.getURL('academic-phrasebank.json'), {
        assert: { type: 'json' }
      });
      this.phrasebankData = module.default;
      console.log('📖 Phrasebank loaded from file');
    } catch (error) {
      console.error('❌ Failed to load phrasebank from file:', error);
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * 从缓存加载
   */
  async loadFromCache() {
    try {
      const result = await chrome.storage.local.get([this.cacheKey]);
      const cached = result[this.cacheKey];

      if (cached && cached.version === this.cacheVersion) {
        console.log('📦 Found cached phrasebank data');
        return cached.data;
      }

      console.log('📦 No valid cache found');
      return null;
    } catch (error) {
      console.error('⚠️ Failed to load from cache:', error);
      return null;
    }
  }

  /**
   * 保存到缓存
   */
  async saveToCache() {
    try {
      await chrome.storage.local.set({
        [this.cacheKey]: {
          version: this.cacheVersion,
          data: this.phrasebankData,
          timestamp: Date.now()
        }
      });
      console.log('💾 Phrasebank cached successfully');
    } catch (error) {
      console.error('⚠️ Failed to save to cache:', error);
    }
  }

  /**
   * 按论文部分查询短语
   * @param {string} section - 论文部分: introduction, methods, results, discussion, conclusion
   * @param {string} subsection - 子分类 (可选)
   * @returns {Array} 短语列表
   */
  getPhrasesBySection(section, subsection = null) {
    if (!this.isInitialized || !this.phrasebankData) {
      throw new Error('Phrasebank not initialized');
    }

    const sectionData = this.phrasebankData.sections[section];
    if (!sectionData) {
      console.warn(`⚠️ Section "${section}" not found`);
      return [];
    }

    // 如果指定了子分类
    if (subsection) {
      return sectionData[subsection] || [];
    }

    // 返回该部分所有短语
    const allPhrases = [];
    for (const key in sectionData) {
      if (Array.isArray(sectionData[key])) {
        allPhrases.push(...sectionData[key]);
      }
    }

    return allPhrases;
  }

  /**
   * 搜索短语
   * @param {string} query - 搜索关键词
   * @param {object} options - 搜索选项
   * @returns {Array} 匹配的短语
   */
  searchPhrases(query, options = {}) {
    if (!this.isInitialized || !this.phrasebankData) {
      throw new Error('Phrasebank not initialized');
    }

    const {
      section = null,        // 限定在某个部分
      minScore = 0,          // 最低学术度评分
      maxResults = 20        // 最多返回结果数
    } = options;

    const queryLower = query.toLowerCase();
    const results = [];

    // 搜索范围
    const sectionsToSearch = section
      ? { [section]: this.phrasebankData.sections[section] }
      : this.phrasebankData.sections;

    // 遍历所有部分
    for (const sectionName in sectionsToSearch) {
      const sectionData = sectionsToSearch[sectionName];

      for (const subsectionName in sectionData) {
        const phrases = sectionData[subsectionName];

        if (!Array.isArray(phrases)) continue;

        for (const phraseObj of phrases) {
          // 检查学术度评分
          if (phraseObj.academicScore < minScore) continue;

          // 检查短语是否匹配
          if (phraseObj.phrase.toLowerCase().includes(queryLower) ||
              phraseObj.usage.toLowerCase().includes(queryLower)) {
            results.push({
              ...phraseObj,
              section: sectionName,
              subsection: subsectionName
            });
          }
        }
      }
    }

    // 按学术度评分降序排序
    results.sort((a, b) => b.academicScore - a.academicScore);

    return results.slice(0, maxResults);
  }

  /**
   * 获取引用动词
   * @param {string} strength - 强度: strong, moderate, neutral
   * @returns {Array} 引用动词列表
   */
  getCitationVerbs(strength = null) {
    if (!this.isInitialized || !this.phrasebankData) {
      throw new Error('Phrasebank not initialized');
    }

    const citations = this.phrasebankData.citations;

    if (strength) {
      const key = `reporting_verbs_${strength}`;
      return citations[key] || [];
    }

    // 返回所有引用动词
    const allVerbs = [];
    for (const key in citations) {
      if (key.startsWith('reporting_verbs_')) {
        allVerbs.push(...citations[key]);
      }
    }

    return allVerbs;
  }

  /**
   * 获取转折词
   * @param {string} type - 类型: contrast, addition, result
   * @returns {Array} 转折词列表
   */
  getTransitionWords(type = null) {
    if (!this.isInitialized || !this.phrasebankData) {
      throw new Error('Phrasebank not initialized');
    }

    const transitions = this.phrasebankData.transitions;

    if (type) {
      return transitions[type] || [];
    }

    // 返回所有转折词
    const allTransitions = [];
    for (const key in transitions) {
      allTransitions.push(...transitions[key]);
    }

    return allTransitions;
  }

  /**
   * 获取随机推荐短语
   * @param {string} section - 论文部分
   * @param {number} count - 数量
   * @returns {Array} 随机短语
   */
  getRandomPhrases(section, count = 5) {
    const phrases = this.getPhrasesBySection(section);

    // 洗牌算法
    const shuffled = phrases.slice().sort(() => Math.random() - 0.5);

    return shuffled.slice(0, count);
  }

  /**
   * 获取高频短语
   * @param {string} section - 论文部分
   * @param {number} count - 数量
   * @returns {Array} 高频短语
   */
  getHighFrequencyPhrases(section, count = 10) {
    const phrases = this.getPhrasesBySection(section);

    // 筛选高频短语
    const highFreq = phrases.filter(p =>
      p.frequency === 'very_high' || p.frequency === 'high'
    );

    // 按学术度评分降序
    highFreq.sort((a, b) => b.academicScore - a.academicScore);

    return highFreq.slice(0, count);
  }

  /**
   * 清除缓存
   */
  async clearCache() {
    try {
      await chrome.storage.local.remove([this.cacheKey]);
      console.log('🗑️ Phrasebank cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * 获取短语库信息
   */
  getInfo() {
    if (!this.isInitialized || !this.phrasebankData) {
      return null;
    }

    return {
      version: this.phrasebankData.version,
      source: this.phrasebankData.source,
      totalPhrases: this.phrasebankData.totalPhrases,
      lastUpdated: this.phrasebankData.lastUpdated,
      sections: Object.keys(this.phrasebankData.sections),
      isInitialized: this.isInitialized
    };
  }
}

// 创建单例
export const phrasebankManager = new AcademicPhrasebankManager();
