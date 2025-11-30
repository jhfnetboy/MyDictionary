/**
 * WordNet Database Manager - wa-sqlite Implementation
 * 使用 wa-sqlite + IndexedDB VFS (Service Worker 兼容)
 */

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

// GitHub Release URL for WordNet database
const WORDNET_DB_URL = 'https://github.com/jhfnetboy/MyDictionary/releases/download/v0.2.0-beta/wordnet-synonyms.db';
const DB_NAME = 'wordnet-synonyms.db';

/**
 * 数据库管理器类 - wa-sqlite 版本
 */
class DatabaseManager {
  constructor() {
    this.sqlite3 = null;
    this.db = null;
    this.vfs = null;
    this.isInitialized = false;
  }

  /**
   * 初始化 wa-sqlite (Service Worker 兼容)
   */
  async initSQLite() {
    if (this.sqlite3) return this.sqlite3;

    console.log('📦 Initializing wa-sqlite for Service Worker...');

    try {
      // 1. 加载 wa-sqlite WASM 模块
      const module = await SQLiteESMFactory();
      this.sqlite3 = SQLite.Factory(module);
      console.log('✅ wa-sqlite WASM loaded');

      // 2. 创建 IndexedDB VFS (支持 Service Worker)
      this.vfs = new IDBBatchAtomicVFS('wordnet-idb', {
        durability: 'relaxed'  // 更好的性能
      });
      console.log('✅ IndexedDB VFS created');

      // 3. 注册 VFS
      this.sqlite3.vfs_register(this.vfs, true);
      console.log('✅ VFS registered');

      return this.sqlite3;
    } catch (error) {
      console.error('❌ Failed to initialize wa-sqlite:', error);
      throw new Error('wa-sqlite initialization failed: ' + error.message);
    }
  }

  /**
   * 检查数据库是否已下载
   */
  async isDatabaseDownloaded() {
    try {
      await this.initSQLite();

      // 尝试打开数据库
      const db = await this.sqlite3.open_v2(DB_NAME, SQLite.SQLITE_OPEN_READONLY);

      if (db) {
        // 数据库存在，检查是否有数据
        const stmt = await this.sqlite3.prepare_v2(
          db,
          'SELECT COUNT(*) as count FROM synonyms'
        );

        const row = await this.sqlite3.step(stmt);
        const count = this.sqlite3.column_int(stmt, 0);

        await this.sqlite3.finalize(stmt);
        await this.sqlite3.close(db);

        console.log(`📊 Database found with ${count} rows`);
        return count > 0;
      }

      return false;
    } catch (error) {
      console.log('⚠️ Database not found or empty');
      return false;
    }
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
   * 保存数据库到 IndexedDB (通过 wa-sqlite VFS)
   */
  async saveDatabaseToStorage(dbData) {
    console.log('💾 Saving database to IndexedDB via wa-sqlite VFS...');

    try {
      await this.initSQLite();

      // 打开数据库（如果不存在会创建）
      const db = await this.sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
      );

      // 使用 deserialize 写入数据
      const ptr = this.sqlite3.module.ccall(
        'sqlite3_malloc',
        'number',
        ['number'],
        [dbData.length]
      );

      this.sqlite3.module.HEAPU8.set(dbData, ptr);

      const rc = this.sqlite3.module.ccall(
        'sqlite3_deserialize',
        'number',
        ['number', 'string', 'number', 'number', 'number', 'number'],
        [db, 'main', ptr, dbData.length, dbData.length, 0]
      );

      if (rc !== SQLite.SQLITE_OK) {
        throw new Error(`sqlite3_deserialize failed with code ${rc}`);
      }

      // 测试查询确认数据完整
      const stmt = await this.sqlite3.prepare_v2(
        db,
        'SELECT COUNT(*) as count FROM synonyms'
      );

      await this.sqlite3.step(stmt);
      const count = this.sqlite3.column_int(stmt, 0);

      await this.sqlite3.finalize(stmt);
      await this.sqlite3.close(db);

      console.log(`✅ Database saved successfully with ${count} rows`);
    } catch (error) {
      console.error('❌ Failed to save database:', error);
      throw error;
    }
  }

  /**
   * 初始化数据库连接
   */
  async initialize() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    console.log('🔧 Initializing database connection...');

    try {
      // 1. 初始化 wa-sqlite
      await this.initSQLite();

      // 2. 检查数据库是否存在
      const isDownloaded = await this.isDatabaseDownloaded();

      if (!isDownloaded) {
        console.log('⚠️ Database not found. Please download first.');
        return null;
      }

      // 3. 打开数据库
      this.db = await this.sqlite3.open_v2(DB_NAME, SQLite.SQLITE_OPEN_READONLY);

      this.isInitialized = true;
      console.log('✅ Database connection established');

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
      const sql = 'SELECT synonym, pos, score FROM synonyms WHERE word = ? ORDER BY score DESC LIMIT ?';
      const stmt = await this.sqlite3.prepare_v2(this.db, sql);

      await this.sqlite3.bind_text(stmt, 1, queryWord);
      await this.sqlite3.bind_int(stmt, 2, limit);

      const synonyms = [];

      while (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        synonyms.push({
          word: this.sqlite3.column_text(stmt, 0),
          pos: this.sqlite3.column_text(stmt, 1),
          score: this.sqlite3.column_double(stmt, 2).toFixed(2),
          confidence: '100%'
        });
      }

      await this.sqlite3.finalize(stmt);

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
  async close() {
    if (this.db) {
      await this.sqlite3.close(this.db);
      this.db = null;
      this.isInitialized = false;
      console.log('🔒 Database connection closed');
    }
  }
}

// 导出单例
export const databaseManager = new DatabaseManager();
