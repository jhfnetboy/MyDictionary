# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyDictionary 是一个 Chrome 插件,利用本地运行的 AI 模型提供智能翻译、相近词推荐和范例句子功能。支持划词翻译和快捷键呼叫侧边栏深度查询。

## Core Features

### 1. 划词翻译 (Selection Translation)
- 用户在网页选中文本后,显示翻译图标或右键菜单
- 点击后在小浮窗中显示翻译结果
- 自动检测语言:中文→英文,英文→中文

### 2. 侧边栏深度查询 (Sidebar Panel)
- 快捷键 `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) 呼出右侧滑动面板
- 显示选中文本的翻译(中英互译)
- 提供扩展功能按钮:
  - **近义词列表**: 基于上下文的同义词推荐
  - **例句展示**: 相关的真实使用场景例句

### 3. 学术写作模式 (Academic Writing Mode)
- 侧边栏双模式切换: Translation ↔ Academic Writing
- 学术短语库存储在 IndexedDB 中,采用按需下载模式
- 提供 120+ 精选学术写作短语,涵盖:
  - Introduction (引言)
  - Methods (方法)
  - Results (结果)
  - Discussion (讨论)
  - Conclusion (结论)
  - Citations (引用动词)
  - Transitions (转折词)
- 每个短语包含:
  - Academic Score (学术度评分 0-10)
  - Frequency (使用频率: very_high, high, medium)
  - Usage (使用说明)
  - Examples (示例句子)
- 功能:
  - 按论文部分浏览短语
  - 实时搜索过滤
  - 一键复制短语

### 4. TTS 文本转语音 (Text-to-Speech)
- **自动发现架构**: 插件自动检测本地 Rust TTS 服务器,无需用户配置
- **智能回退**: 本地服务器不可用时自动使用浏览器 TTS (SpeechT5)
- **双模式支持**:
  - 本地服务器模式 (Rust + Candle): 高质量,支持中英文,音量正常
  - 浏览器模式 (SpeechT5 ONNX): 完全离线,仅支持英文
- **3 个 TTS 按钮位置**:
  - 翻译输入框 🔊
  - 翻译结果框 🔊
  - 学术短语卡片 🔊
- **Offscreen Document**: 在 Service Worker 环境播放音频

## Core Technology Stack

- **前端框架**: Chrome Extension Manifest V3
- **AI 库**: `@huggingface/transformers` (Transformers.js)
- **数据存储**: IndexedDB (同义词数据库 + 学术短语库)
- **推荐模型**:
  - Translation: `Xenova/nllb-200-distilled-600M` (多语言翻译,支持中英互译)
  - Synonyms: Local WordNet JSON Database (同义词推荐,完全离线)
  - Sentence Embedding: `Xenova/all-MiniLM-L6-v2` (例句检索)
  - Academic Phrasebank: IndexedDB (学术短语库,按需下载)
  - TTS (Browser): `Xenova/speecht5_tts` (英文 TTS,浏览器内运行)
  - TTS (Local Server): Rust + Candle (高质量,支持中英文,待实现)

## Project Architecture

```
my-dictionary-plugin/
├── manifest.json                   // 插件配置文件 (Manifest V3)
├── package.json                    // 依赖管理
├── background.js                   // Service Worker: 模型加载和推理核心逻辑
├── content.js                      // Content Script: 监听选词、管理UI
├── popup.html/.js                  // 插件设置界面
├── academic-phrasebank.json        // 学术短语库源数据 (120+ phrases)
├── src/
│   ├── config/
│   │   └── i18n.json               // 国际化翻译配置
│   ├── lib/
│   │   ├── db-manager.js           // 同义词 IndexedDB 管理器
│   │   ├── academic-db-manager.js  // 学术短语库 IndexedDB 管理器
│   │   ├── tts-manager.js          // TTS 管理器 (自动发现 + 智能回退)
│   │   └── academic-phrasebank.js  // 学术短语库管理 (已废弃,迁移到 IndexedDB)
│   ├── offscreen/
│   │   ├── audio-player.html       // Offscreen Document (音频播放)
│   │   └── audio-player.js         // Web Audio API 音频播放逻辑
│   └── ui/
│       ├── sidebar.html            // 右侧滑动面板
│       ├── sidebar.css             // 侧边栏样式 (含学术模式样式)
│       ├── sidebar.js              // 侧边栏交互逻辑
│       ├── tooltip.html            // 划词翻译小浮窗
│       └── tooltip.css             // 浮窗样式
├── data/
│   └── synonyms-db.json            // 本地同义词数据库 (WordNet 精选数据)
├── docs/
│   ├── CLAUDE.md                        // 项目开发文档
│   ├── academic-mode-design.md          // 学术模式设计文档
│   ├── academic-indexeddb-testing.md    // IndexedDB 测试指南
│   ├── TTS-simplification-summary.md    // TTS 简化总结
│   ├── TTS-auto-discovery-architecture.md // TTS 自动发现架构
│   └── rust-service-architecture.md     // Rust 服务模块架构
├── model-runner/                        // Rust TTS 服务器 (本地高质量 TTS)
│   ├── Cargo.toml                       // Rust 依赖配置
│   ├── .gitignore                       // 排除 /target/ 构建产物
│   └── src/
│       ├── main.rs                      // HTTP 服务器 (Axum + Tokio)
│       └── downloader/
│           └── mod.rs                   // Hugging Face 模型下载器
└── assets/
    └── icons/                           // 插件图标资源
```

## User Interaction Flow

### Flow 1: 划词翻译 (Quick Translation)
```
用户选中文本
    ↓
显示翻译图标 (或右键菜单)
    ↓
点击图标/菜单
    ↓
小浮窗显示翻译结果
    ↓
[可选] 点击浮窗上的"详情"按钮 → 打开侧边栏
```

### Flow 2: 侧边栏深度查询 (Sidebar Deep Dive)
```
用户选中文本 + 按下 Ctrl+Shift+D
    ↓
右侧滑出侧边栏面板
    ↓
自动显示:
  - 翻译结果 (中英互译)
  - 原文上下文
    ↓
用户点击功能按钮:
  - [近义词] → 显示同义词列表
  - [例句] → 显示真实使用场景的句子
```

## Key Design Patterns

### 1. 语言自动检测
```javascript
// 使用简单正则判断中英文
function detectLanguage(text) {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  const totalChars = text.length;

  // 如果中文字符占比 > 30%,判定为中文
  return (chineseChars && chineseChars.length / totalChars > 0.3)
    ? 'zh' : 'en';
}

// 根据检测结果设置翻译方向
const direction = detectLanguage(selectedText) === 'zh'
  ? 'zh-en'  // 中译英
  : 'en-zh'; // 英译中
```

### 2. 双 UI 模式管理
```javascript
// content.js
class UIManager {
  constructor() {
    this.tooltip = null;      // 划词翻译小浮窗
    this.sidebar = null;      // 右侧滑动面板
  }

  // 显示划词翻译浮窗
  showTooltip(position, translation) { ... }

  // 显示侧边栏
  showSidebar(selectedText, context) { ... }

  // 确保同时只显示一个 UI
  hideAll() { ... }
}
```

### 3. 同义词查询策略 (本地 WordNet JSON)
```javascript
// background.js - Service Worker
import synonymsDB from './data/synonyms-db.json' assert { type: 'json' };

/**
 * 使用本地同义词数据库获取同义词
 * - 完全离线,无需网络
 * - 查询速度 <10ms
 * - 基于 WordNet 精选数据
 */
async function getSynonymsFromWordNet(word) {
  const queryWord = word.toLowerCase();
  const synonymsList = synonymsDB[queryWord];

  if (!synonymsList || synonymsList.length === 0) {
    return [];
  }

  // 返回前8个同义词,按相关度递减评分
  return synonymsList.slice(0, 8).map((syn, index) => ({
    word: syn,
    score: (1.0 - index * 0.05).toFixed(2),
    confidence: '100%'
  }));
}
```

**扩展 WordNet 数据库**:
- 当前版本: 包含 50+ 常用词及其同义词
- 完整版本: 可从 GitHub 下载完整 WordNet JSON (155,000 词)
  - 仓库: https://github.com/x-englishwordnet/json
  - 文件: oewn-2024.json.zip
  - 提取同义词关系后放入 `data/synonyms-db.json`
- 未来计划: 添加 BERT 语义相似度引擎作为补充

### 4. 模型加载策略
```javascript
// background.js - Service Worker
let translationPipeline;
let similarityPipeline;

async function loadModels() {
  // 优先加载翻译模型 (核心功能)
  translationPipeline = await pipeline(
    'translation',
    'Xenova/nllb-200-distilled-600M'
  );

  // 后台加载例句检索模型
  setTimeout(async () => {
    similarityPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }, 3000);
}
```

### 5. 跨脚本通信协议
```javascript
// Content Script → Service Worker
chrome.runtime.sendMessage({
  action: 'translate',
  text: selectedText,
  direction: 'auto' // 'auto' | 'zh-en' | 'en-zh'
});

chrome.runtime.sendMessage({
  action: 'getSynonyms',
  word: selectedWord,
  context: surroundingSentence
});

chrome.runtime.sendMessage({
  action: 'getExamples',
  word: selectedWord
});

// Service Worker 响应格式
{
  success: true,
  data: {
    translation: "翻译结果",
    sourceLanguage: "zh",
    targetLanguage: "en"
  }
}
```

### 6. 侧边栏滑动动画
```css
/* sidebar.css */
#my-dictionary-sidebar {
  position: fixed;
  top: 0;
  right: -400px; /* 初始隐藏在右侧 */
  width: 400px;
  height: 100vh;
  background: white;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2147483647; /* 确保在所有网页元素之上 */
}

#my-dictionary-sidebar.show {
  right: 0; /* 滑入视口 */
}
```

## Development Workflow

### 安装依赖
```bash
pnpm install @huggingface/transformers
```

### 本地开发
1. 在 Chrome 浏览器打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序",选择项目根目录
4. 修改代码后点击刷新图标重新加载插件

### 调试
- **Service Worker 日志**: 在 `chrome://extensions/` 中点击"Service Worker"查看 console
- **Content Script 日志**: 在目标网页打开 DevTools 查看 console
- **模型推理性能**: 使用 `console.time()` 和 `console.timeEnd()` 测量推理耗时

### 构建 (生产环境)
```bash
# 如果使用构建工具 (如 Vite/Webpack)
pnpm run build

# 打包为 .crx 文件
# Chrome 提供的打包工具在 chrome://extensions/ → "打包扩展程序"
```

## Critical Implementation Notes

### 模型体积优化
- **优先选择蒸馏模型**: `distilbert-*` 系列比 `bert-*` 小 40%
- **离线部署**: 将模型权重预下载到 `models/` 目录,避免首次加载延迟
- **WebGPU 加速**: Transformers.js 自动使用 WebGPU (如果可用),显著提升推理速度

### 权限配置 (manifest.json)
```json
"permissions": [
  "scripting",      // 注入 Content Script
  "activeTab",      // 访问当前活跃 Tab
  "storage"         // 存储用户设置和缓存
],
"host_permissions": [
  "<all_urls>"      // 在所有网页上运行 (根据需要限制)
]
```

### 安全注意事项
- **CSP 限制**: Manifest V3 强制执行严格的 Content Security Policy,禁止内联脚本和 `eval()`
- **沙箱隔离**: Service Worker 运行在隔离环境,无法直接访问 DOM
- **数据隐私**: 所有推理在本地完成,不向服务器发送用户数据

## Technical References

- **Transformers.js 文档**: https://huggingface.co/docs/transformers.js
- **Chrome Extension V3 迁移指南**: https://developer.chrome.com/docs/extensions/mv3/intro/
- **Hugging Face 模型库**: https://huggingface.co/models

## Performance Targets

- **模型加载时间**: < 3 秒 (首次) / < 500ms (缓存)
- **推理延迟**: < 1 秒 (Fill-Mask) / < 500ms (Sentence Similarity)
- **内存占用**: < 200MB (所有模型加载后)
- **IndexedDB 查询**: < 100ms (学术短语搜索)

## Academic IndexedDB Architecture

### 数据库设计

**Database Name**: `MyDictionary_Academic`
**Version**: 1
**Object Store**: `phrases`
**Key Path**: `id`

### 索引 (Indexes)

| 索引名 | 字段 | 唯一性 | 用途 |
|--------|------|--------|------|
| `section` | section | false | 按论文部分查询 (introduction, methods, etc.) |
| `subsection` | subsection | false | 按子分类查询 |
| `phrase` | phrase | false | 短语全文搜索 |
| `academicScore` | academicScore | false | 按学术度评分排序 |
| `frequency` | frequency | false | 按使用频率过滤 |

### 数据结构

```javascript
{
  id: "intro_background_1",           // 唯一标识符
  phrase: "This study aims to...",    // 学术短语
  usage: "用于陈述研究目的",           // 使用说明
  academicScore: 8.5,                  // 学术度评分 (0-10)
  frequency: "very_high",              // 使用频率: very_high | high | medium
  examples: [                          // 示例句子
    "This study aims to investigate the relationship between..."
  ],
  section: "introduction",             // 论文部分
  subsection: "background"             // 子分类
}
```

### 核心方法 (academic-db-manager.js)

**初始化**:
```javascript
await academicDBManager.initialize();
// 创建 Object Store 和索引
```

**检查数据库状态**:
```javascript
const isDownloaded = await academicDBManager.isDataDownloaded();
// 返回: true/false
```

**批量导入**:
```javascript
const count = await academicDBManager.importPhrases(phrasebankData);
// 从 JSON 导入到 IndexedDB,返回导入数量
```

**按部分查询**:
```javascript
const phrases = await academicDBManager.getPhrasesBySection('introduction');
// 使用 section 索引快速查询
```

**搜索短语**:
```javascript
const results = await academicDBManager.searchPhrases('study', {
  section: 'introduction',  // 可选: 限定部分
  minScore: 7.0,            // 可选: 最低评分
  maxResults: 20            // 可选: 最多结果数
});
// 全文搜索,按 academicScore 降序排序
```

**数据库管理**:
```javascript
await academicDBManager.clearDatabase();    // 清空数据
await academicDBManager.deleteDatabase();   // 删除数据库
```

### 消息通信协议

**检查数据库状态**:
```javascript
chrome.runtime.sendMessage({
  action: 'checkAcademicDatabaseStatus'
}, (response) => {
  // response.data: { isDownloaded, totalPhrases, size }
});
```

**下载数据库**:
```javascript
chrome.runtime.sendMessage({
  action: 'downloadAcademicDatabase'
}, (response) => {
  // response.data: { totalPhrases, message }
});
```

**初始化短语库**:
```javascript
chrome.runtime.sendMessage({
  action: 'initializePhrasebank'
}, (response) => {
  // response.data: { totalPhrases, isInitialized, dbName, dbVersion }
});
```

**按部分获取短语**:
```javascript
chrome.runtime.sendMessage({
  action: 'getPhrasesBySection',
  section: 'introduction'
}, (response) => {
  // response.data: [phrase objects]
});
```

**搜索短语**:
```javascript
chrome.runtime.sendMessage({
  action: 'searchPhrases',
  query: 'research'
}, (response) => {
  // response.data: [phrase objects] (最多20个)
});
```

### 用户体验流程

**首次使用** (数据未下载):
```
1. 用户切换到 Academic Writing 标签
2. UI 显示下载提示 (📚 图标 + 描述 + 下载按钮)
3. 用户点击 "📥 Download Now"
4. 后台从 academic-phrasebank.json 批量导入到 IndexedDB
5. 显示成功消息: "✅ Successfully downloaded 120+ academic phrases!"
6. 自动加载 Introduction 部分的短语
```

**已下载** (正常使用):
```
1. 用户切换到 Academic Writing 标签
2. 自动检测数据库已存在
3. 直接显示 Section 选择器和短语列表
4. 用户可浏览不同部分、搜索、复制短语
```

### 性能优化策略

1. **索引查询**: 所有查询使用 IndexedDB 索引,避免全表扫描
2. **结果限制**: 搜索默认限制 20 条结果,减少内存占用
3. **按需加载**: 仅在用户切换到 Academic Writing 标签时初始化
4. **异步操作**: 所有数据库操作异步,不阻塞 UI
5. **缓存管理**: IndexedDB 持久化存储,无需重复下载

### 数据扩展计划

- **当前规模**: 120+ 短语 (~50 KB)
- **短期目标**: 500+ 短语,添加更多学科领域
- **长期目标**: 2000+ 短语,支持多语言学术写作
- **数据来源**: Manchester Academic Phrasebank + 自定义精选
