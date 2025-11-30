/**
 * WordNet Database Manager
 * 管理 SQLite 数据库的下载、存储和查询
 */

// 静态导入 SQLite WASM (Service Worker 不支持动态 import)
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

// GitHub Release URL for WordNet database
const WORDNET_DB_URL = 'https://github.com/jhfnetboy/MyDictionary/releases/download/v0.2.0-beta/wordnet-synonyms.db';
const DB_NAME = 'wordnet-synonyms.db';
const DB_SIZE_MB = 31;

/**
 * 数据库管理器类
 */
class DatabaseManager {
  constructor() {
    this.db = null;
    this.sqlite3 = null;
    this.isInitialized = false;
    this.dbStorageKey = 'wordnet-db-blob';
  }

  /**
   * 初始化 SQLite WASM (Service Worker 兼容模式 - 预加载 WASM 二进制)
   */
  async initSQLite() {
    if (this.sqlite3) return this.sqlite3;

    console.log('📦 Initializing SQLite WASM for Service Worker...');

    try {
      // 在 Service Worker 中，模拟 window 环境
      const globalScope = typeof self !== 'undefined' ? self : globalThis;

      // 临时提供 window 别名
      if (typeof window === 'undefined') {
        globalScope.window = globalScope;
      }

      // 关键修复: 先手动加载 WASM 二进制，然后传递给 sqlite3InitModule
      // 这样可以完全避免 SQLite WASM 内部的 fetch 调用
      const wasmUrl = chrome.runtime.getURL('sqlite-wasm/sqlite3.wasm');
      console.log(`📁 预加载 WASM 二进制 from: ${wasmUrl}`);

      // 使用不带 credentials 的 fetch
      const wasmResponse = await fetch(wasmUrl, { credentials: 'omit' });
      if (!wasmResponse.ok) {
        throw new Error(`Failed to fetch WASM: ${wasmResponse.status} ${wasmResponse.statusText}`);
      }

      const wasmBinary = await wasmResponse.arrayBuffer();
      console.log(`✅ WASM 预加载完成: ${(wasmBinary.byteLength / 1024).toFixed(2)} KB`);

      // 传递预加载的 WASM 二进制给 sqlite3InitModule
      this.sqlite3 = await sqlite3InitModule({
        print: console.log,
        printErr: console.error,
        wasmBinary: new Uint8Array(wasmBinary)  // 传递预加载的二进制数据
      });

      console.log('✅ SQLite WASM initialized successfully');
      console.log('📊 SQLite version:', this.sqlite3.version.libVersion);

      return this.sqlite3;
    } catch (error) {
      console.error('❌ Failed to initialize SQLite WASM:', error);
      console.error('Error details:', error.stack);
      throw new Error('SQLite initialization failed: ' + error.message);
    }
  }

  /**
   * 检查数据库是否已下载 (IndexedDB)
   */
  async isDatabaseDownloaded() {
    return new Promise((resolve) => {
      const request = indexedDB.open('WordNetDB', 1);

      request.onerror = () => resolve(false);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['databases'], 'readonly');
        const store = transaction.objectStore('databases');

        const getRequest = store.get(this.dbStorageKey);

        getRequest.onsuccess = () => {
          const exists = !!getRequest.result;
          db.close();
          resolve(exists);
        };

        getRequest.onerror = () => {
          db.close();
          resolve(false);
        };
      };
    });
  }

  /**
   * 下载数据库文件
   */
  async downloadDatabase(onProgress) {
    console.log(`📥 Downloading WordNet database from: ${WORDNET_DB_URL}`);

    try {
      const response = await fetch(WORDNET_DB_URL);

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

      // 合并所有 chunks
      const blob = new Blob(chunks);
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log(`✅ Database downloaded: ${(uint8Array.length / 1024 / 1024).toFixed(2)} MB`);

      return uint8Array;
    } catch (error) {
      console.error('❌ Database download failed:', error);
      throw new Error('Download failed: ' + error.message);
    }
  }

  /**
   * 保存数据库到 IndexedDB (支持大文件)
   */
  async saveDatabaseToStorage(dbData) {
    console.log('💾 Saving database to IndexedDB...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WordNetDB', 1);

      request.onerror = () => reject(new Error('IndexedDB open failed'));

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['databases'], 'readwrite');
        const store = transaction.objectStore('databases');

        const putRequest = store.put(dbData, this.dbStorageKey);

        putRequest.onsuccess = () => {
          console.log('✅ Database saved to IndexedDB');
          db.close();
          resolve();
        };

        putRequest.onerror = () => {
          db.close();
          reject(new Error('IndexedDB put failed'));
        };
      };
    });
  }

  /**
   * 从 IndexedDB 加载数据库
   */
  async loadDatabaseFromStorage() {
    console.log('📂 Loading database from IndexedDB...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WordNetDB', 1);

      request.onerror = () => reject(new Error('IndexedDB open failed'));

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases');
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['databases'], 'readonly');
        const store = transaction.objectStore('databases');

        const getRequest = store.get(this.dbStorageKey);

        getRequest.onsuccess = () => {
          const dbData = getRequest.result;
          db.close();

          if (!dbData) {
            reject(new Error('Database not found in IndexedDB'));
            return;
          }

          console.log(`✅ Database loaded: ${(dbData.length / 1024 / 1024).toFixed(2)} MB`);
          resolve(dbData);
        };

        getRequest.onerror = () => {
          db.close();
          reject(new Error('IndexedDB get failed'));
        };
      };
    });
  }

  /**
   * 初始化数据库连接 (主线程模式)
   */
  async initialize() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    console.log('🔧 Initializing database connection...');

    try {
      // 1. 初始化 SQLite WASM
      await this.initSQLite();

      // 2. 检查是否已下载数据库
      const isDownloaded = await this.isDatabaseDownloaded();

      if (!isDownloaded) {
        console.log('⚠️ Database not found. Please download first.');
        return null;
      }

      // 3. 从存储加载数据库
      const dbData = await this.loadDatabaseFromStorage();

      // 4. 创建内存数据库并加载数据
      this.db = new this.sqlite3.oo1.DB();

      // 使用 deserialize API 加载数据库
      const p = this.sqlite3.wasm.allocFromTypedArray(dbData);

      const rc = this.sqlite3.capi.sqlite3_deserialize(
        this.db.pointer,
        'main',
        p,
        dbData.length,
        dbData.length,
        this.sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
        this.sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
      );

      if (rc !== 0) {
        throw new Error(`sqlite3_deserialize failed with code ${rc}`);
      }

      this.isInitialized = true;
      console.log('✅ Database connection established');

      // 测试查询
      const testResult = this.db.exec({
        sql: 'SELECT COUNT(*) as count FROM synonyms',
        rowMode: 'object'
      });

      if (testResult && testResult.length > 0) {
        console.log(`📊 Database contains ${testResult[0].count} synonym relationships`);
      }

      return this.db;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * 查询同义词
   */
  async querySynonyms(word, limit = 8) {
    if (!this.db) {
      await this.initialize();
    }

    if (!this.db) {
      throw new Error('Database not initialized. Please download database first.');
    }

    const queryWord = word.toLowerCase();

    try {
      const result = this.db.exec({
        sql: 'SELECT synonym, pos, score FROM synonyms WHERE word = ? ORDER BY score DESC LIMIT ?',
        bind: [queryWord, limit],
        rowMode: 'object'
      });

      const synonyms = result.map(row => ({
        word: row.synonym,
        pos: row.pos,
        score: row.score.toFixed(2),
        confidence: '100%'
      }));

      console.log(`📚 Found ${synonyms.length} synonyms for "${word}"`);
      return synonyms;
    } catch (error) {
      console.error('❌ Query failed:', error);
      throw new Error('Query failed: ' + error.message);
    }
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('🔒 Database connection closed');
    }
  }
}

// 导出单例
export const databaseManager = new DatabaseManager();
