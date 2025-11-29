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

## Core Technology Stack

- **前端框架**: Chrome Extension Manifest V3
- **AI 库**: `@huggingface/transformers` (Transformers.js)
- **推荐模型**:
  - Translation: `Xenova/nllb-200-distilled-600M` (多语言翻译,支持中英互译)
  - Fill-Mask: `Xenova/distilbert-base-uncased` (相近词替换)
  - Sentence Embedding: `Xenova/all-MiniLM-L6-v2` (例句检索)

## Project Architecture

```
my-dictionary-plugin/
├── manifest.json           // 插件配置文件 (Manifest V3)
├── package.json            // 依赖管理
├── background.js           // Service Worker: 模型加载和推理核心逻辑
├── content.js              // Content Script: 监听选词、管理UI
├── popup.html/.js          // 插件设置界面
├── ui/
│   ├── sidebar.html        // 右侧滑动面板
│   ├── sidebar.css         // 侧边栏样式
│   ├── sidebar.js          // 侧边栏交互逻辑
│   ├── tooltip.html        // 划词翻译小浮窗
│   └── tooltip.css         // 浮窗样式
└── assets/
    └── icons/              // 插件图标资源
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

### 3. 模型加载策略
```javascript
// background.js - Service Worker
let translationPipeline;
let fillMaskPipeline;
let similarityPipeline;

async function loadModels() {
  // 优先加载翻译模型 (核心功能)
  translationPipeline = await pipeline(
    'translation',
    'Xenova/nllb-200-distilled-600M'
  );

  // 后台加载可选模型
  setTimeout(async () => {
    fillMaskPipeline = await pipeline(
      'fill-mask',
      'Xenova/distilbert-base-uncased'
    );
    similarityPipeline = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
  }, 3000);
}
```

### 4. 跨脚本通信协议
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

### 5. 侧边栏滑动动画
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
