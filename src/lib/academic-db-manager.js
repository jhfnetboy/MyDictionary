/**
 * Academic Phrasebank IndexedDB Manager
 * 管理学术短语库的 IndexedDB 存储和查询
 */

export class AcademicDBManager {
  constructor() {
    this.dbName = 'MyDictionary_Academic';
    this.dbVersion = 1;
    this.storeName = 'phrases';
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * 初始化 IndexedDB
   */
  async initialize() {
    if (this.isInitialized && this.db) {
      console.log('📚 Academic DB already initialized');
      return;
    }

    console.log('📚 Initializing Academic IndexedDB...');

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('❌ Failed to open Academic DB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ Academic IndexedDB opened');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('🔧 Upgrading Academic DB schema...');
        const db = event.target.result;

        // 创建 phrases 对象存储
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id'
          });

          // 创建索引以加速查询
          objectStore.createIndex('section', 'section', { unique: false });
          objectStore.createIndex('subsection', 'subsection', { unique: false });
          objectStore.createIndex('phrase', 'phrase', { unique: false });
          objectStore.createIndex('academicScore', 'academicScore', { unique: false });
          objectStore.createIndex('frequency', 'frequency', { unique: false });

          console.log('✅ Academic DB schema created');
        }
      };
    });
  }

  /**
   * 检查数据库是否已下载
   */
  async isDataDownloaded() {
    try {
      await this.initialize();

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([this.storeName], 'readonly');
        const objectStore = transaction.objectStore(this.storeName);
        const countRequest = objectStore.count();

        countRequest.onsuccess = () => {
          const count = countRequest.result;
          console.log(`📊 Academic DB contains ${count} phrases`);
          resolve(count > 0);
        };

        countRequest.onerror = () => {
          reject(countRequest.error);
        };
      });
    } catch (error) {
      console.error('❌ Failed to check Academic DB status:', error);
      return false;
    }
  }

  /**
   * 批量导入短语数据
   */
  async importPhrases(phrasesData) {
    await this.initialize();

    console.log('📥 Importing academic phrases to IndexedDB...');

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);

      let importedCount = 0;
      const allPhrases = [];

      // 遍历所有部分和子部分
      for (const sectionName in phrasesData.sections) {
        const sectionData = phrasesData.sections[sectionName];

        for (const subsectionName in sectionData) {
          const phrases = sectionData[subsectionName];

          if (!Array.isArray(phrases)) continue;

          for (const phrase of phrases) {
            allPhrases.push({
              ...phrase,
              section: sectionName,
              subsection: subsectionName
            });
          }
        }
      }

      // 添加引用动词
      if (phrasesData.citations) {
        for (const category in phrasesData.citations) {
          const verbs = phrasesData.citations[category];
          for (const verb of verbs) {
            allPhrases.push({
              id: `citation_${category}_${verb.verb}`,
              phrase: verb.verb,
              usage: verb.usage || '',
              academicScore: verb.academicScore,
              frequency: 'high',
              examples: [verb.example],
              section: 'citations',
              subsection: category
            });
          }
        }
      }

      // 添加转折词
      if (phrasesData.transitions) {
        for (const category in phrasesData.transitions) {
          const words = phrasesData.transitions[category];
          for (const word of words) {
            allPhrases.push({
              id: `transition_${category}_${word.word}`,
              phrase: word.word,
              usage: word.usage || '',
              academicScore: word.academicScore,
              frequency: 'very_high',
              examples: [word.example],
              section: 'transitions',
              subsection: category
            });
          }
        }
      }

      // 批量添加到 IndexedDB
      for (const phrase of allPhrases) {
        const request = objectStore.add(phrase);
        request.onsuccess = () => {
          importedCount++;
        };
      }

      transaction.oncomplete = () => {
        console.log(`✅ Imported ${importedCount} phrases to Academic DB`);
        resolve(importedCount);
      };

      transaction.onerror = () => {
        console.error('❌ Failed to import phrases:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * 按部分查询短语
   */
  async getPhrasesBySection(section) {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const index = objectStore.index('section');
      const request = index.getAll(section);

      request.onsuccess = () => {
        const phrases = request.result;
        console.log(`✅ Found ${phrases.length} phrases for section: ${section}`);
        resolve(phrases);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 搜索短语
   */
  async searchPhrases(query, options = {}) {
    await this.initialize();

    const {
      section = null,
      minScore = 0,
      maxResults = 20
    } = options;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);

      let request;
      if (section) {
        const index = objectStore.index('section');
        request = index.getAll(section);
      } else {
        request = objectStore.getAll();
      }

      request.onsuccess = () => {
        const allPhrases = request.result;
        const queryLower = query.toLowerCase();

        // 过滤和搜索
        const results = allPhrases.filter(phrase => {
          // 检查学术度评分
          if (phrase.academicScore < minScore) return false;

          // 检查短语是否匹配
          return phrase.phrase.toLowerCase().includes(queryLower) ||
                 (phrase.usage && phrase.usage.toLowerCase().includes(queryLower));
        });

        // 按学术度评分降序排序
        results.sort((a, b) => b.academicScore - a.academicScore);

        const limitedResults = results.slice(0, maxResults);
        console.log(`✅ Found ${limitedResults.length} matching phrases`);
        resolve(limitedResults);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 获取数据库信息
   */
  async getInfo() {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const objectStore = transaction.objectStore(this.storeName);
      const countRequest = objectStore.count();

      countRequest.onsuccess = () => {
        resolve({
          totalPhrases: countRequest.result,
          isInitialized: this.isInitialized,
          dbName: this.dbName,
          dbVersion: this.dbVersion
        });
      };

      countRequest.onerror = () => {
        reject(countRequest.error);
      };
    });
  }

  /**
   * 清空数据库
   */
  async clearDatabase() {
    await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const objectStore = transaction.objectStore(this.storeName);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('🗑️ Academic DB cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 删除数据库
   */
  async deleteDatabase() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        console.log('🗑️ Academic DB deleted');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// 创建单例
export const academicDBManager = new AcademicDBManager();
