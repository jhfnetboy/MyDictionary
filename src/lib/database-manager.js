/**
 * WordNet Database Manager - wa-sqlite Implementation
 * 使用 wa-sqlite + IndexedDB VFS (Service Worker 兼容)
 */

import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite-async.mjs';
import * as SQLite from 'wa-sqlite';
import { IDBBatchAtomicVFS } from 'wa-sqlite/src/examples/IDBBatchAtomicVFS.js';

// GitHub Release URL for WordNet database
const WORDNET_DB_URL = 'https://github.com/jhfnetboy/MyDictionary/releases/download/v0.2.0-beta/wordnet-synonyms.db';
// wa-sqlite VFS 文件名（不需要路径前缀）
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
      // 1. 加载 wa-sqlite WASM 模块（增加内存限制）
      const module = await SQLiteESMFactory({
        // 增加 WASM 初始内存到 64MB
        wasmMemory: new WebAssembly.Memory({
          initial: 1024,  // 64MB (1024 * 64KB pages)
          maximum: 2048   // 最大 128MB
        })
      });
      this.sqlite3 = SQLite.Factory(module);
      console.log('✅ wa-sqlite WASM loaded (64MB memory)');

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
   * wa-sqlite 在数据库不存在时 open_v2 会抛出错误
   */
  async isDatabaseDownloaded() {
    try {
      await this.initSQLite();

      // 尝试打开数据库（只读模式，如果不存在会失败）
      let db;
      try {
        db = await this.sqlite3.open_v2(
          DB_NAME,
          SQLite.SQLITE_OPEN_READONLY,
          this.vfs.name
        );
      } catch (openError) {
        // 数据库不存在或无法打开
        console.log('⚠️ Database file not found in VFS');
        return false;
      }

      // 数据库存在，检查是否有数据
      try {
        const stmt = await this.sqlite3.prepare_v2(
          db,
          'SELECT COUNT(*) as count FROM synonyms'
        );

        if (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
          const count = this.sqlite3.column_int(stmt, 0);
          await this.sqlite3.finalize(stmt);
          await this.sqlite3.close(db);

          console.log(`📊 Database found with ${count} rows`);
          return count > 0;
        }

        await this.sqlite3.finalize(stmt);
        await this.sqlite3.close(db);
        return false;
      } catch (queryError) {
        // 查询失败，可能表结构不对
        await this.sqlite3.close(db);
        console.log('⚠️ Database exists but query failed:', queryError.message);
        return false;
      }
    } catch (error) {
      console.log('⚠️ Error checking database:', error.message);
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
   * 新策略：使用 ATTACH DATABASE 从内存数据库迁移到 VFS
   */
  async saveDatabaseToStorage(dbData) {
    console.log('💾 Saving database to IndexedDB via wa-sqlite VFS...');

    try {
      await this.initSQLite();

      console.log('📝 Loading database into memory...');

      // 策略：先在内存中加载数据库，然后用 ATTACH + VACUUM INTO 复制到 VFS
      // 这样可以避免直接操作 VFS 底层 API 的复杂性

      // 1. 创建内存数据库并加载数据
      // wa-sqlite 支持直接从 Uint8Array 加载数据库到内存
      const memDb = await this.sqlite3.open_v2(':memory:');

      console.log('📊 Deserializing database...');

      // 2. 使用 SQLite 的 deserialize API（如果 wa-sqlite 支持）
      // 否则需要通过其他方式导入数据

      // 由于 wa-sqlite 没有 deserialize，我们采用 ATTACH 策略：
      // 先将数据写入临时 VFS 文件，再 ATTACH 并复制

      console.log('💾 Writing to temporary VFS file...');

      // 创建临时文件名
      const tempFile = 'temp-import.db';

      // 直接用 VFS API 写入临时文件
      const fileId = 3;
      const flags = SQLite.SQLITE_OPEN_CREATE | SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_MAIN_DB;
      const pOutFlags = new DataView(new ArrayBuffer(4));

      let rc = await this.vfs.xOpen(tempFile, fileId, flags, pOutFlags);
      if (rc !== SQLite.SQLITE_OK) {
        throw new Error(`xOpen temp file failed: ${rc}`);
      }

      // 写入数据
      const CHUNK_SIZE = 1024 * 1024;
      let offset = 0;

      while (offset < dbData.length) {
        const chunkSize = Math.min(CHUNK_SIZE, dbData.length - offset);
        const chunk = dbData.subarray(offset, offset + chunkSize);

        rc = await this.vfs.xWrite(fileId, chunk, offset);
        if (rc !== SQLite.SQLITE_OK) {
          throw new Error(`xWrite failed at ${offset}: ${rc}`);
        }

        offset += chunkSize;
        if (offset % (10 * 1024 * 1024) === 0 || offset === dbData.length) {
          console.log(`💾 ${Math.round((offset / dbData.length) * 100)}%`);
        }
      }

      await this.vfs.xSync(fileId, SQLite.SQLITE_SYNC_NORMAL);
      await this.vfs.xClose(fileId);

      console.log('✅ Temp file written, copying to final database...');

      // 等待 VFS 稳定
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. 使用 SQLite ATTACH 和 VACUUM INTO 复制数据库
      const srcDb = await this.sqlite3.open_v2(
        tempFile,
        SQLite.SQLITE_OPEN_READONLY,
        this.vfs.name
      );

      // 使用 VACUUM INTO 复制整个数据库
      const vacuumStmt = await this.sqlite3.prepare_v2(
        srcDb,
        `VACUUM INTO '${DB_NAME}'`
      );

      rc = await this.sqlite3.step(vacuumStmt);
      await this.sqlite3.finalize(vacuumStmt);
      await this.sqlite3.close(srcDb);

      if (rc !== SQLite.SQLITE_DONE) {
        throw new Error(`VACUUM INTO failed: ${rc}`);
      }

      console.log('✅ Database copied successfully');

      // 4. 删除临时文件
      await this.vfs.xDelete(tempFile, 0);

      // 5. 等待并验证
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('🔍 Verifying...');

      const verifyDb = await this.sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READONLY,
        this.vfs.name
      );

      const stmt = await this.sqlite3.prepare_v2(verifyDb, 'SELECT COUNT(*) FROM synonyms');
      if (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        const count = this.sqlite3.column_int(stmt, 0);
        console.log(`✅ Verified: ${count.toLocaleString()} rows`);
      }

      await this.sqlite3.finalize(stmt);
      await this.sqlite3.close(verifyDb);

      console.log('✅ Database import completed');
    } catch (error) {
      console.error('❌ Database import failed:', error);
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

      // 3. 打开数据库（指定 VFS）
      this.db = await this.sqlite3.open_v2(
        DB_NAME,
        SQLite.SQLITE_OPEN_READONLY,
        this.vfs.name
      );

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

  /**
   * 清空数据库（用于调试和重新下载）
   */
  async clearDatabase() {
    console.log('🗑️ Clearing database...');

    try {
      // 1. 关闭现有连接
      await this.close();

      // 2. 初始化 SQLite 和 VFS
      await this.initSQLite();

      // 3. 删除数据库文件
      try {
        const rc = await this.vfs.xDelete(DB_NAME, 0);
        if (rc === SQLite.SQLITE_OK) {
          console.log('✅ Database file deleted from VFS');
        }
      } catch (deleteError) {
        console.log('⚠️ Delete error (may not exist):', deleteError.message);
      }

      // 4. 清空 IndexedDB（完全重置 VFS）
      if (this.vfs && typeof this.vfs.close === 'function') {
        await this.vfs.close();
      }

      // 5. 重置状态
      this.sqlite3 = null;
      this.vfs = null;
      this.db = null;
      this.isInitialized = false;

      console.log('✅ Database cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      return false;
    }
  }
}

// 导出单例
export const databaseManager = new DatabaseManager();
