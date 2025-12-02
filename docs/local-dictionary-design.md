# 本地词典优化方案 - 技术设计文档

## 📋 需求分析

### 当前问题
- **单词查询慢**: 即使是简单的单词 "hello" 也需要加载 300MB 的翻译模型
- **用户体验差**: 等待 3-5 秒才能看到翻译结果
- **资源浪费**: 大量简单查询占用 GPU/CPU 资源

### 优化目标
- **单词查询**: < 50ms (本地词典)
- **短语查询**: < 100ms (本地词典)
- **句子/段落**: 使用 AI 模型 (保持现有体验)

---

## 🎯 智能路由策略

### 查询类型判断

```javascript
function getQueryType(text) {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const hasSpecialChars = /[。，！？；：""''（）《》【】、]/g.test(trimmed);

  if (wordCount === 1 && !hasSpecialChars) {
    return 'SINGLE_WORD';      // 单个词汇 → 本地词典
  } else if (wordCount <= 5 && !hasSpecialChars) {
    return 'PHRASE';           // 短语 (2-5词) → 本地词典
  } else {
    return 'SENTENCE';         // 句子/段落 → AI 模型
  }
}
```

### 路由决策树

```
用户选中文本
    ↓
文本分析
    ↓
┌──────────────┬──────────────┬──────────────┐
│ 单个词汇     │ 短语 (2-5词) │ 句子/段落     │
│ (1 word)     │ (2-5 words)  │ (>5 words)   │
└──────────────┴──────────────┴──────────────┘
    ↓              ↓              ↓
本地词典       本地词典        AI 模型
(ECDICT)       (ECDICT)       (Transformers)
 < 50ms         < 100ms         1-3s
```

---

## 📚 选定词典: ECDICT

### 基本信息

- **项目**: [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)
- **词条数**: 76万 (基础版) / 222万 (完整版)
- **许可证**: MIT License
- **格式**: CSV / SQLite / JSON
- **大小**: ~50 MB (压缩后)

### 数据结构

```csv
word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange
hello,/hə'ləʊ/,int. hello; hi,int. 喂;你好,int,5,TRUE,zk gk,1234,5678,
dictionary,/'dɪkʃ(ə)n(ə)rɪ/,n. dictionary; lexicon,n. 词典;字典,n,4,TRUE,cet4 cet6 ielts toefl gre,567,1234,p:dictionaries
```

### 字段说明

| 字段 | 说明 | 示例 |
|------|------|------|
| `word` | 单词 | "hello" |
| `phonetic` | 音标 | "/hə'ləʊ/" |
| `definition` | 英文释义 | "int. hello; hi" |
| `translation` | 中文翻译 | "int. 喂;你好" |
| `pos` | 词性 | "int" (interjection) |
| `collins` | 柯林斯星级 (1-5) | 5 |
| `oxford` | 牛津核心词汇 | TRUE/FALSE |
| `tag` | 考试标签 | "zk gk cet4" |
| `bnc` | BNC 词频 | 1234 |
| `frq` | 当代语料库频率 | 5678 |
| `exchange` | 词形变化 | "p:dictionaries" |

---

## 🗄️ 数据存储方案

### 方案对比

| 方案 | 大小 | 查询速度 | 优点 | 缺点 |
|------|------|---------|------|------|
| **CSV 直接加载** | 50 MB | < 10ms | 简单,快速 | 启动时占用内存 |
| **IndexedDB** | 50 MB | < 50ms | 持久化,异步 | 首次导入慢 |
| **SQLite WASM** | 60 MB | < 30ms | 标准 SQL | 需要额外库 |
| **Compressed JSON** | 15 MB | < 20ms | 体积小 | 需解压 |

### 推荐方案: **Compressed JSON + IndexedDB**

**优势**:
1. **体积小**: gzip 压缩后 ~15 MB
2. **查询快**: IndexedDB 索引查询 < 50ms
3. **持久化**: 用户只需下载一次
4. **按需加载**: 可以分片加载(常用词 + 完整词库)

**数据分层**:
```
Tier 1: 高频词汇 (5000 词) - 2 MB
  - 包含: CET4, 柯林斯5星, 牛津核心
  - 用途: 90% 的日常查询
  - 加载: 插件启动时

Tier 2: 扩展词汇 (50000 词) - 8 MB
  - 包含: CET6, IELTS, TOEFL
  - 用途: 学术/专业文本
  - 加载: 首次查询时

Tier 3: 完整词库 (760000 词) - 50 MB
  - 包含: 所有词条
  - 用途: 罕见词/专业术语
  - 加载: 用户主动下载
```

---

## 💻 实现架构

### 1. 数据处理流程

```bash
# 步骤 1: 下载 ECDICT CSV
wget https://github.com/skywind3000/ECDICT/raw/master/ecdict.csv

# 步骤 2: 过滤和分层
node scripts/process-ecdict.js
  → tier1-common.json (5000 词, 2 MB)
  → tier2-extended.json (50000 词, 8 MB)
  → tier3-full.json.gz (760000 词, 15 MB)

# 步骤 3: 验证
node scripts/validate-dictionary.js
```

### 2. IndexedDB 设计

```javascript
// Database: MyDictionary_LocalDict
// Version: 1

const DICTIONARY_DB_CONFIG = {
  name: 'MyDictionary_LocalDict',
  version: 1,
  stores: {
    // 词条表
    words: {
      keyPath: 'word',
      indexes: [
        { name: 'word', unique: true },
        { name: 'collins', unique: false },
        { name: 'oxford', unique: false },
        { name: 'tag', unique: false, multiEntry: true }
      ]
    },
    // 元数据表
    metadata: {
      keyPath: 'key'
    }
  }
};

// 数据结构
interface DictionaryEntry {
  word: string;              // "hello"
  phonetic: string;          // "/hə'ləʊ/"
  definition: string;        // "int. hello; hi"
  translation: string;       // "int. 喂;你好"
  pos: string;               // "int"
  collins: number;           // 5
  oxford: boolean;           // true
  tags: string[];            // ["zk", "gk"]
  bnc: number;              // 1234
  frq: number;              // 5678
  exchange: {               // 词形变化
    plural?: string;        // "p:dictionaries"
    past?: string;          // "d:walked"
    present?: string;       // "3:walks"
    ing?: string;          // "i:walking"
  };
}
```

### 3. 查询模块

```javascript
// src/lib/local-dictionary-manager.js

class LocalDictionaryManager {
  constructor() {
    this.db = null;
    this.tier1Cache = null; // 5000 常用词缓存在内存
  }

  async initialize() {
    // 打开 IndexedDB
    this.db = await this.openDatabase();

    // 检查是否已下载
    const metadata = await this.db.get('metadata', 'tier1_downloaded');

    if (!metadata) {
      // 首次使用,加载 Tier 1
      await this.downloadTier1();
    } else {
      // 加载到内存缓存
      await this.loadTier1Cache();
    }
  }

  async lookup(word) {
    const normalized = word.toLowerCase().trim();

    // 1. 内存缓存查询 (Tier 1)
    if (this.tier1Cache && this.tier1Cache[normalized]) {
      return {
        source: 'cache',
        entry: this.tier1Cache[normalized],
        time: performance.now()
      };
    }

    // 2. IndexedDB 查询 (Tier 2/3)
    const entry = await this.db.get('words', normalized);

    if (entry) {
      return {
        source: 'indexeddb',
        entry: entry,
        time: performance.now()
      };
    }

    // 3. 未找到
    return null;
  }

  async lookupPhrase(phrase) {
    // 短语查询: 拆分后逐词查询
    const words = phrase.toLowerCase().split(/\s+/);
    const results = await Promise.all(
      words.map(word => this.lookup(word))
    );

    return {
      phrase: phrase,
      words: results.filter(r => r !== null)
    };
  }

  async downloadTier1() {
    const response = await fetch(
      chrome.runtime.getURL('data/dictionary/tier1-common.json')
    );
    const data = await response.json();

    // 批量导入 IndexedDB
    const tx = this.db.transaction('words', 'readwrite');
    for (const entry of data) {
      await tx.objectStore('words').add(entry);
    }
    await tx.done;

    // 记录元数据
    await this.db.put('metadata', {
      key: 'tier1_downloaded',
      value: true,
      timestamp: Date.now(),
      count: data.length
    });

    // 加载到内存
    await this.loadTier1Cache();
  }

  async loadTier1Cache() {
    const allEntries = await this.db.getAll('words');
    this.tier1Cache = {};

    for (const entry of allEntries) {
      this.tier1Cache[entry.word] = entry;
    }

    console.log(`✅ Tier 1 缓存已加载: ${allEntries.length} 词`);
  }
}

export default LocalDictionaryManager;
```

---

## 🔀 集成到现有系统

### background.js 修改

```javascript
import LocalDictionaryManager from './src/lib/local-dictionary-manager.js';

// 创建全局词典管理器
const localDict = new LocalDictionaryManager();

// 初始化
chrome.runtime.onInstalled.addListener(async () => {
  await localDict.initialize();
});

// 翻译请求处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslate(request, sendResponse);
    return true;
  }
});

async function handleTranslate(request, sendResponse) {
  const { text } = request;
  const queryType = getQueryType(text);

  console.log(`🔍 查询类型: ${queryType}, 文本: "${text}"`);

  if (queryType === 'SINGLE_WORD') {
    // 单词 → 本地词典
    const result = await localDict.lookup(text);

    if (result) {
      sendResponse({
        success: true,
        source: 'local-dictionary',
        data: {
          translation: result.entry.translation,
          phonetic: result.entry.phonetic,
          definition: result.entry.definition,
          pos: result.entry.pos,
          collins: result.entry.collins,
          oxford: result.entry.oxford
        },
        time: result.time
      });
      return;
    } else {
      // 本地词典未找到 → 降级到 AI 模型
      console.log('⚠️ 本地词典未找到,使用 AI 模型');
    }
  } else if (queryType === 'PHRASE') {
    // 短语 → 尝试本地词典
    const result = await localDict.lookupPhrase(text);

    if (result.words.length > 0) {
      // 组合翻译结果
      const translation = result.words
        .map(w => w.entry.translation)
        .join(' ');

      sendResponse({
        success: true,
        source: 'local-dictionary-phrase',
        data: {
          translation: translation,
          words: result.words
        }
      });
      return;
    }
  }

  // 句子/段落 或 本地词典失败 → AI 模型
  console.log('🤖 使用 AI 模型翻译');
  const aiResult = await translateWithModel(text);
  sendResponse(aiResult);
}

function getQueryType(text) {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const hasSpecialChars = /[。，！？；：""''（）《》【】、]/g.test(trimmed);

  if (wordCount === 1 && !hasSpecialChars) {
    return 'SINGLE_WORD';
  } else if (wordCount <= 5 && !hasSpecialChars) {
    return 'PHRASE';
  } else {
    return 'SENTENCE';
  }
}
```

---

## 📊 性能对比

### 查询性能

| 查询类型 | 旧方案 (AI 模型) | 新方案 (本地词典) | 提升 |
|---------|-----------------|------------------|------|
| 单词 "hello" | 3000ms | **30ms** | **100x** |
| 短语 "good morning" | 3500ms | **50ms** | **70x** |
| 句子 "How are you?" | 4000ms | 4000ms | 1x (保持不变) |

### 资源占用

| 指标 | 旧方案 | 新方案 | 改进 |
|------|--------|--------|------|
| 内存 | 200 MB (模型常驻) | 10 MB (Tier 1 缓存) | **-95%** |
| 网络 | 300 MB (首次下载模型) | 2 MB (Tier 1) | **-99%** |
| CPU | 持续高占用 | 仅查询时 | **显著降低** |

---

## 🎨 UI 优化

### 翻译来源标识

```html
<!-- 本地词典结果 -->
<div class="mydictionary-result local-dict">
  <div class="source-badge">📚 Local Dictionary</div>
  <div class="word">hello</div>
  <div class="phonetic">/hə'ləʊ/</div>
  <div class="translation">int. 喂;你好</div>
  <div class="collins">★★★★★</div>
  <div class="tags">
    <span class="tag oxford">牛津核心</span>
    <span class="tag gk">高考</span>
  </div>
</div>

<!-- AI 模型结果 -->
<div class="mydictionary-result ai-model">
  <div class="source-badge">🤖 AI Translation</div>
  <div class="translation">...</div>
</div>
```

---

## 📦 数据文件结构

```
MyDictionary/
├── data/
│   └── dictionary/
│       ├── tier1-common.json         # 5000 常用词 (2 MB)
│       ├── tier2-extended.json.gz    # 50000 扩展词 (8 MB 压缩)
│       ├── tier3-full.json.gz        # 760000 完整词库 (15 MB 压缩)
│       └── metadata.json             # 元数据 (版本,统计)
├── scripts/
│   ├── download-ecdict.sh           # 下载 ECDICT 原始数据
│   ├── process-ecdict.js            # 处理和分层
│   └── validate-dictionary.js       # 验证数据完整性
└── src/
    └── lib/
        └── local-dictionary-manager.js
```

---

## 🚀 实施计划

### Phase 1: 基础功能 (1-2 天)
- [x] 下载 ECDICT 数据
- [ ] 编写数据处理脚本 (process-ecdict.js)
- [ ] 生成 Tier 1 词库 (5000 词)
- [ ] 实现 LocalDictionaryManager
- [ ] 集成到 background.js

### Phase 2: UI 优化 (1 天)
- [ ] 添加来源标识
- [ ] 显示音标和词性
- [ ] 显示柯林斯星级
- [ ] 显示考试标签

### Phase 3: 扩展功能 (1-2 天)
- [ ] Tier 2/3 按需下载
- [ ] 词形变化查询
- [ ] 短语智能匹配
- [ ] 性能监控和日志

### Phase 4: 测试和优化 (1 天)
- [ ] 性能测试
- [ ] 边界情况处理
- [ ] 文档更新
- [ ] 发布 v0.2.0

---

## 📝 待解决问题

1. **中文到英文**: ECDICT 主要是英→中,需要补充中→英词典 (可用 CC-CEDICT)
2. **词形变化**: 需要处理 "running" → "run" 的查询
3. **短语匹配**: "good morning" 可能不在词典中,需要拆词后组合
4. **离线下载**: 用户如何下载 Tier 2/3 词库

---

**版本**: v1.0
**日期**: 2024-12-02
**状态**: 设计阶段
