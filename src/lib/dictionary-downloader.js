/**
 * 词典下载管理器
 * 从 GitHub Release 下载和管理扩展词库
 */

export class DictionaryDownloader {
  constructor() {
    // GitHub Release 基础 URL
    this.baseURL = 'https://github.com/jhfnetboy/MyDictionary/releases/download';
    this.currentVersion = '0.2.0'; // 从 manifest 获取

    // IndexedDB 配置
    this.dbName = 'MyDictionary';
    this.dbVersion = 1;
    this.db = null;

    // 词典配置
    this.dictionaries = {
      'full': {
        name: '完整词库',
        filename: 'full-dictionary.json.gz',
        size: 26, // MB
        description: '全部 768,739 词条 (包含音标、柯林斯星级、中英释义)',
        count: 768739
      }
    };
  }

  /**
   * 初始化 IndexedDB 连接
   */
  async init() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 词典数据表
        if (!db.objectStoreNames.contains('dictionary')) {
          const store = db.createObjectStore('dictionary', { keyPath: 'word' });
          store.createIndex('collins', 'collins', { unique: false });
          store.createIndex('oxford', 'oxford', { unique: false });
          store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // 元数据表 (与 LocalDictionaryManager 共用)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * 检查词典是否已安装
   */
  async isInstalled(tier) {
    await this.init();

    const tx = this.db.transaction(['metadata'], 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.get(tier);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        const meta = request.result;
        resolve(meta ? meta.installed : false);
      };
      request.onerror = () => resolve(false);
    });
  }

  /**
   * 获取下载元数据
   */
  async getMetadata(tier) {
    await this.init();

    const tx = this.db.transaction(['metadata'], 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.get(tier);

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * 下载词典
   * @param {string} tier - 'tier2' 或 'tier3'
   * @param {Function} progressCallback - 进度回调 (percent, received, total)
   */
  async download(tier, progressCallback) {
    const config = this.dictionaries[tier];
    if (!config) {
      throw new Error(`未知的词典层级: ${tier}`);
    }

    console.log(`📥 开始下载 ${config.name}...`);

    // 构建下载 URL (GitHub Release 不支持子目录)
    const url = `${this.baseURL}/v${this.currentVersion}/${config.filename}`;

    try {
      // 1. 发起下载请求
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const total = contentLength || config.size * 1024 * 1024;

      console.log(`📦 文件大小: ${(total / 1024 / 1024).toFixed(2)} MB`);

      // 2. 读取数据流
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        // 进度回调
        const percent = Math.floor((received / total) * 100);
        if (progressCallback) {
          progressCallback({
            tier,
            percent,
            received,
            total,
            receivedMB: (received / 1024 / 1024).toFixed(2),
            totalMB: (total / 1024 / 1024).toFixed(2)
          });
        }

        console.log(`📊 下载进度: ${percent}% (${(received / 1024 / 1024).toFixed(2)} MB)`);
      }

      // 3. 解压缩 (如果是 .gz 文件)
      console.log('📦 正在解压缩...');
      const compressed = new Uint8Array(
        chunks.reduce((acc, chunk) => {
          const tmp = new Uint8Array(acc.length + chunk.length);
          tmp.set(acc);
          tmp.set(chunk, acc.length);
          return tmp;
        }, new Uint8Array(0))
      );

      // 使用 pako 解压 (需要在 background.js 中导入)
      let jsonString;
      if (config.filename.endsWith('.gz')) {
        // 发送到 background 解压
        const decompressed = await this._decompress(compressed);
        jsonString = new TextDecoder().decode(decompressed);
      } else {
        jsonString = new TextDecoder().decode(compressed);
      }

      // 4. 解析 JSON
      console.log('📝 正在解析数据...');
      const data = JSON.parse(jsonString);
      console.log(`✅ 解析完成: ${data.length} 词条`);

      // 5. 导入 IndexedDB
      await this._importToIndexedDB(tier, data, progressCallback);

      // 6. 保存元数据
      await this._saveMetadata(tier, {
        key: tier,  // metadata 表的 keyPath 是 'key'
        installed: true,
        downloadedAt: new Date().toISOString(),
        version: this.currentVersion,
        count: data.length,
        size: received
      });

      console.log(`✅ ${config.name} 安装完成!`);
      return {
        success: true,
        tier,
        count: data.length
      };

    } catch (error) {
      console.error(`❌ 下载失败:`, error);
      throw error;
    }
  }

  /**
   * 解压缩数据 (使用 pako)
   * @private
   */
  async _decompress(compressed) {
    // 在实际环境中需要导入 pako 库
    // 这里假设有全局 pako 或通过 importScripts 加载
    if (typeof pako !== 'undefined') {
      return pako.inflate(compressed);
    }

    // 备用: 使用原生 DecompressionStream (Chrome 80+)
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const stream = new Response(compressed).body.pipeThrough(ds);
      const blob = await new Response(stream).blob();
      return new Uint8Array(await blob.arrayBuffer());
    }

    throw new Error('无法解压缩: 缺少 pako 库或 DecompressionStream API');
  }

  /**
   * 导入数据到 IndexedDB
   * @private
   */
  async _importToIndexedDB(tier, data, progressCallback) {
    await this.init();

    console.log(`💾 正在导入 ${data.length} 词条到 IndexedDB...`);

    const tx = this.db.transaction(['dictionary'], 'readwrite');
    const store = tx.objectStore('dictionary');

    // 批量写入
    let imported = 0;
    for (const entry of data) {
      store.put({ ...entry, _tier: tier }); // 添加 tier 标记
      imported++;

      // 每 1000 条报告一次进度
      if (imported % 1000 === 0) {
        const percent = Math.floor((imported / data.length) * 100);
        console.log(`   已导入: ${imported}/${data.length} (${percent}%)`);

        // 发送导入进度更新
        if (progressCallback) {
          progressCallback({
            tier,
            phase: 'importing',
            imported,
            total: data.length,
            percent
          });
        }
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`✅ 导入完成: ${imported} 词条`);

        // 发送完成通知
        if (progressCallback) {
          progressCallback({
            tier,
            phase: 'importing',
            imported: data.length,
            total: data.length,
            percent: 100
          });
        }

        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * 保存下载元数据
   * @private
   */
  async _saveMetadata(tier, metadata) {
    await this.init();

    const tx = this.db.transaction(['metadata'], 'readwrite');
    const store = tx.objectStore('metadata');
    store.put(metadata);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * 删除词典
   */
  async uninstall(tier) {
    await this.init();

    console.log(`🗑️ 正在删除 ${tier}...`);

    // 1. 删除词条数据
    const tx = this.db.transaction(['dictionary'], 'readwrite');
    const store = tx.objectStore('dictionary');
    const request = store.openCursor();

    let deleted = 0;
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value._tier === tier) {
          cursor.delete();
          deleted++;
        }
        cursor.continue();
      }
    };

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        console.log(`   已删除 ${deleted} 词条`);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });

    // 2. 删除元数据
    const metaTx = this.db.transaction(['metadata'], 'readwrite');
    const metaStore = metaTx.objectStore('metadata');
    metaStore.delete(tier);

    await new Promise((resolve, reject) => {
      metaTx.oncomplete = () => {
        console.log(`✅ ${tier} 已删除`);
        resolve();
      };
      metaTx.onerror = () => reject(metaTx.error);
    });
  }

  /**
   * 获取所有已安装词典的状态
   */
  async getStatus() {
    const fullMeta = await this.getMetadata('full');

    return {
      tier1: {
        installed: true,
        builtin: true,
        count: 7406,
        description: '内置高频词库 (立即可用)'
      },
      full: {
        installed: fullMeta ? fullMeta.installed : false,
        builtin: false,
        count: fullMeta ? fullMeta.count : this.dictionaries.full.count,
        description: this.dictionaries.full.description,
        downloadedAt: fullMeta ? fullMeta.downloadedAt : null,
        version: fullMeta ? fullMeta.version : null,
        size: this.dictionaries.full.size
      }
    };
  }

  /**
   * 检查是否有新版本
   */
  async checkUpdate() {
    try {
      const url = `${this.baseURL}/v${this.currentVersion}/dictionaries/checksums.json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.warn('无法检查更新');
        return null;
      }

      const remoteInfo = await response.json();
      return {
        hasUpdate: remoteInfo.version > this.currentVersion,
        latestVersion: remoteInfo.version,
        currentVersion: this.currentVersion
      };
    } catch (error) {
      console.error('检查更新失败:', error);
      return null;
    }
  }
}

// 创建全局实例
export const dictDownloader = new DictionaryDownloader();
