/**
 * Synonyms Manager - IndexedDB + JSON Implementation
 * 替代 SQLite 方案，使用纯 IndexedDB 存储预处理的 JSON 数据
 */

// Synonyms JSON URL - use chrome.runtime.getURL for local file
const SYNONYMS_JSON_FILE = 'synonyms.json.gz';
const getSynonymsURL = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(SYNONYMS_JSON_FILE);
  }
  return `/${SYNONYMS_JSON_FILE}`;
};
const DB_NAME = 'synonyms-db';
const DB_VERSION = 1;
const STORE_NAME = 'synonyms';

/**
 * 同义词管理器类 - IndexedDB 版本
 */
class SynonymsManager {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.synonymsData = null; // 缓存在内存中
  }

  /**
   * 打开 IndexedDB 数据库
   */
  async openDatabase() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB: ' + request.error));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建 object store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
          console.log('✅ IndexedDB store created');
        }
      };
    });
  }

  /**
   * 检查同义词数据是否已下载
   */
  async isDataDownloaded() {
    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('data');

        request.onsuccess = () => {
          const hasData = request.result && Object.keys(request.result).length > 0;
          console.log(hasData ? '✅ Synonyms data found in IndexedDB' : '⚠️ No synonyms data');
          resolve(hasData);
        };

        request.onerror = () => {
          console.log('⚠️ Error checking data:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      console.log('⚠️ Error opening database:', error.message);
      return false;
    }
  }

  /**
   * 下载同义词 JSON 数据
   */
  async downloadSynonyms(onProgress) {
    const url = getSynonymsURL();
    console.log(`📥 Downloading synonyms from: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);

      let loaded = 0;
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        if (onProgress && total) {
          const percentage = Math.round((loaded / total) * 100);
          onProgress({
            loaded,
            total,
            percentage,
            loadedMB: (loaded / 1024 / 1024).toFixed(2),
            totalMB: (total / 1024 / 1024).toFixed(2)
          });
        }
      }

      // 合并 chunks
      const blob = new Blob(chunks);
      const arrayBuffer = await blob.arrayBuffer();

      console.log(`✅ Downloaded: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

      // 解压 gzip（如果是 .gz 文件）
      let jsonText;
      if (url.endsWith('.gz')) {
        console.log('📦 Decompressing gzip...');
        const decompressed = await this.decompressGzip(arrayBuffer);
        jsonText = new TextDecoder().decode(decompressed);
      } else {
        jsonText = new TextDecoder().decode(arrayBuffer);
      }

      console.log('📊 Parsing JSON...');
      const data = JSON.parse(jsonText);

      console.log(`✅ Parsed ${Object.keys(data).length.toLocaleString()} words`);

      return data;
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw new Error('Download failed: ' + error.message);
    }
  }

  /**
   * 解压 gzip 数据
   */
  async decompressGzip(arrayBuffer) {
    // 使用 DecompressionStream API（Chrome 80+）
    if ('DecompressionStream' in self) {
      const stream = new Blob([arrayBuffer]).stream();
      const decompressedStream = stream.pipeThrough(
        new DecompressionStream('gzip')
      );

      const reader = decompressedStream.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }

      return result;
    } else {
      // Fallback: 使用 pako 库（需要单独安装）
      throw new Error('DecompressionStream not supported. Please use uncompressed JSON.');
    }
  }

  /**
   * 保存同义词数据到 IndexedDB
   */
  async saveSynonyms(data) {
    console.log('💾 Saving synonyms to IndexedDB...');

    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const request = store.put(data, 'data');

        request.onsuccess = () => {
          console.log('✅ Synonyms saved to IndexedDB');
          // 缓存到内存
          this.synonymsData = data;
          this.isInitialized = true;
          resolve();
        };

        request.onerror = () => {
          reject(new Error('Failed to save: ' + request.error));
        };
      });
    } catch (error) {
      console.error('❌ Save failed:', error);
      throw error;
    }
  }

  /**
   * 初始化 - 加载数据到内存
   */
  async initialize() {
    if (this.isInitialized && this.synonymsData) {
      return true;
    }

    console.log('🔧 Initializing synonyms manager...');

    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('data');

        request.onsuccess = () => {
          if (request.result) {
            this.synonymsData = request.result;
            this.isInitialized = true;
            console.log(`✅ Loaded ${Object.keys(this.synonymsData).length.toLocaleString()} words`);
            resolve(true);
          } else {
            console.log('⚠️ No data found. Please download first.');
            resolve(false);
          }
        };

        request.onerror = () => {
          reject(new Error('Failed to load: ' + request.error));
        };
      });
    } catch (error) {
      console.error('❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 查询同义词
   */
  async querySynonyms(word, limit = 8) {
    if (!this.synonymsData) {
      await this.initialize();
    }

    if (!this.synonymsData) {
      throw new Error('Synonyms data not loaded. Please download first.');
    }

    const queryWord = word.toLowerCase();
    const synonyms = this.synonymsData[queryWord];

    if (!synonyms || synonyms.length === 0) {
      console.log(`📚 No synonyms found for "${word}"`);
      return [];
    }

    const results = synonyms.slice(0, limit).map(syn => ({
      word: syn.word,
      pos: syn.pos,
      score: syn.score,
      confidence: '100%'
    }));

    console.log(`📚 Found ${results.length} synonyms for "${word}"`);
    return results;
  }

  /**
   * 清空数据（用于调试）
   */
  async clearData() {
    console.log('🗑️ Clearing synonyms data...');

    try {
      const db = await this.openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('data');

        request.onsuccess = () => {
          this.synonymsData = null;
          this.isInitialized = false;
          console.log('✅ Synonyms data cleared');
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error('Failed to clear: ' + request.error));
        };
      });
    } catch (error) {
      console.error('❌ Clear failed:', error);
      return false;
    }
  }
}

// 导出单例
export const synonymsManager = new SynonymsManager();
