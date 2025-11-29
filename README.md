# 🦝 MyDictionary

<div align="center">

![Logo](./assets/logo.png)

**Local AI Dictionary · Translation · Synonyms · Examples · Academic Writing**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Transformers.js](https://img.shields.io/badge/Model-Transformers.js-orange.svg)](https://huggingface.co/docs/transformers.js)

[English](#english) | [中文](#中文)

</div>

---

<h2 id="english">English</h2>

### ✨ Features

- 🔒 **Fully Local** - All AI processing runs locally in your browser, no data upload, privacy protected
- 🌐 **Smart Translation** - Supports 200 languages with dedicated high-quality models for major language pairs
- 📚 **Synonym Suggestions** - Context-aware intelligent synonym recommendations
- 💬 **Example Sentences** - Real-world usage examples from authentic sources
- 🎓 **Academic Writing** - 20,000+ academic phrases to boost your research papers
- ⚡ **On-Demand Download** - Only 300MB by default, other models downloaded as needed

### 🚀 Quick Start

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/MyDictionary.git
cd MyDictionary
```

2. Install dependencies:
```bash
pnpm install
```

3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

#### Usage

**Method 1: Text Selection**
1. Select text on any webpage
2. Use right-click menu or translation icon
3. Sidebar slides in from the right with translation

**Method 2: Keyboard Shortcut**
1. Select text + `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)
2. Sidebar appears automatically

**Method 3: Click Extension Icon**
1. Click the extension icon in toolbar
2. Enter text manually in the sidebar

### 📦 Models

#### Default Installation (300MB Only)
- ✅ **English to Chinese** - Helsinki-NLP/opus-mt-en-zh (300MB)

#### On-Demand Downloads
Models are downloaded automatically when you use the corresponding features:

| Feature | Model | Size | Trigger |
|---------|-------|------|---------|
| Chinese to English | Helsinki-NLP/opus-mt-zh-en | 300MB | First Chinese→English translation |
| Other Languages | NLLB-200 | 600MB | First non-English/Chinese translation |
| Synonyms | DistilBERT | 65MB | Click [Synonyms] button |
| Examples | MiniLM | 23MB | Click [Examples] button |
| Academic Phrases | Phrasebank JSON | 8MB | Switch to Academic mode |
| Academic Pro | SciBERT | 440MB | Enable in Academic settings |

**Total**: 300MB (default) → 1.7GB (full installation)

### 🎯 Core Functions

#### 1. Smart Translation
- Auto-detects 20+ languages (Chinese, English, Japanese, Korean, Thai, Russian, Arabic, etc.)
- Main language pairs (EN↔CN) use dedicated high-quality models ⭐⭐⭐⭐⭐
- Other languages use universal model supporting 200 languages ⭐⭐⭐⭐

#### 2. Synonym Suggestions
- Context-aware intelligent synonyms
- 5-10 relevant replacement suggestions
- Click to re-translate with selected synonym

#### 3. Example Sentences
- 3-5 real-world usage examples
- Auto-translated examples
- Highlighted target vocabulary

#### 4. Academic Writing Mode
- **20,000+ Academic Phrases**: From top-tier journal papers
- **Paper Section Specific**: Introduction / Methods / Results / Discussion / Conclusion
- **Copy & Paste**: One-click copy to your paper
- **Optional SciBERT**: Academic-grade synonym suggestions

### 🛠️ Tech Stack

- **Frontend**: Chrome Extension Manifest V3
- **AI Library**: [Transformers.js](https://huggingface.co/docs/transformers.js) (@xenova/transformers)
- **Translation Models**: Helsinki-NLP/opus-mt + NLLB-200
- **Academic Models**: SciBERT + Academic Phrasebank
- **Model Download**: Hugging Face Hub (official recommended method)

### 📖 Documentation

- [Product Design](./DESIGN.md)
- [Technical Architecture](./CLAUDE.md)
- [UI Wireframes](./UI_WIREFRAME.md)
- [Model Strategy](./HYBRID_MODEL_STRATEGY.md)
- [Academic Writing Models](./ACADEMIC_WRITING_MODELS.md)
- [Product Summary](./PRODUCT_SUMMARY.md)

### 🎨 Logo Design

MyDictionary's logo features a **Raccoon 🦝** holding a dictionary, symbolizing:
- 🧠 **Smart & Clever** - Local AI-powered intelligent translation
- 📚 **Well-Read** - Supporting 200 languages
- 🎓 **Academic Excellence** - Professional academic writing assistance

### 🔧 Development

#### Project Structure
```
MyDictionary/
├── manifest.json           # Chrome Extension config
├── package.json            # Dependencies
├── background.js           # Service Worker (model management)
├── content.js              # Content Script (UI)
├── src/
│   ├── config/
│   │   └── models-config.json
│   ├── utils/
│   └── ui/
│       ├── sidebar.html
│       ├── sidebar.css
│       ├── popup.html
│       └── popup.js
├── assets/
│   ├── logo.png
│   └── icons/
└── docs/
```

#### Development Commands
```bash
# Install dependencies
pnpm install

# Development mode (watch file changes)
pnpm run dev

# Build for production
pnpm run build

# Package as .crx
pnpm run package
```

### 🤝 Contributing

Issues and Pull Requests are welcome!

### 📄 License

MIT License - see [LICENSE](LICENSE) file

### 🙏 Acknowledgements

**AI Models & Libraries:**
- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face - Run Transformers models in the browser
- [Helsinki-NLP/opus-mt-en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh) - English to Chinese translation
- [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en) - Chinese to English translation
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) - 200 languages universal translation
- [distilbert-base-uncased](https://huggingface.co/distilbert-base-uncased) - Synonym suggestions
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - Sentence embeddings
- [allenai/scibert_scivocab_uncased](https://huggingface.co/allenai/scibert_scivocab_uncased) - Scientific paper understanding
- [Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/) by University of Manchester - Academic phrases database

---

<div align="center">

**With the wisdom of 🦝, translation made simple**

Made with ❤️ by Jason

</div>

---

<h2 id="中文">中文</h2>

### ✨ 特性

- 🔒 **完全本地化** - 所有 AI 推理在浏览器本地完成,无数据上传,保护隐私
- 🌐 **智能翻译** - 支持 200 种语言互译,主要语言对使用专用高质量模型
- 📚 **近义词推荐** - 基于上下文的智能同义词建议
- 💬 **例句展示** - 来自真实来源的使用场景例句
- 🎓 **学术写作** - 20,000+ 学术常用表达,助力论文写作
- ⚡ **按需下载** - 默认仅 300MB,其他模型按需下载

### 🚀 快速开始

#### 安装

1. 克隆仓库:
```bash
git clone https://github.com/yourusername/MyDictionary.git
cd MyDictionary
```

2. 安装依赖:
```bash
pnpm install
```

3. 在 Chrome 中加载:
   - 打开 Chrome 浏览器,访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序",选择项目目录

#### 使用方式

**方式 1: 网页划词**
1. 在任意网页选中文本
2. 使用右键菜单或翻译图标
3. 右侧滑出面板显示翻译

**方式 2: 快捷键**
1. 选中文本 + `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)
2. 侧边栏自动出现

**方式 3: 点击插件图标**
1. 点击浏览器工具栏的插件图标
2. 在侧边栏手动输入文本翻译

### 📦 模型说明

#### 默认安装 (仅 300MB)
- ✅ **英译中** - Helsinki-NLP/opus-mt-en-zh (300MB)

#### 按需下载
当您使用相应功能时,会自动提示下载:

| 功能 | 模型 | 大小 | 下载时机 |
|------|------|------|----------|
| 中译英 | Helsinki-NLP/opus-mt-zh-en | 300MB | 首次使用中译英时 |
| 其他语言翻译 | NLLB-200 | 600MB | 翻译非英中语言时 |
| 近义词 | DistilBERT | 65MB | 点击[近义词]按钮时 |
| 例句 | MiniLM | 23MB | 点击[例句]按钮时 |
| 学术短语库 | Phrasebank JSON | 8MB | 切换到学术模式时 |
| 学术专业版 | SciBERT | 440MB | 学术设置中启用 |

**总计**: 300MB (默认) → 1.7GB (完整安装)

### 🎯 核心功能

#### 1. 智能翻译
- 自动检测 20+ 种语言 (中、英、日、韩、泰、俄、阿等)
- 主要语言对 (英↔中) 使用专用高质量模型 ⭐⭐⭐⭐⭐
- 其他语言使用通用模型支持 200 种语言 ⭐⭐⭐⭐

#### 2. 近义词推荐
- 基于上下文的智能同义词
- 5-10 个相关替换建议
- 点击可重新翻译

#### 3. 例句展示
- 3-5 个真实使用场景例句
- 自动翻译每个例句
- 高亮显示目标词汇

#### 4. 学术写作模式
- **20,000+ 学术表达**: 来自顶尖期刊论文
- **论文各部分专用**: Introduction / Methods / Results / Discussion / Conclusion
- **即复即用**: 一键复制到论文中
- **可选 SciBERT**: 学术级近义词推荐

### 🛠️ 技术栈

- **前端**: Chrome Extension Manifest V3
- **AI 库**: [Transformers.js](https://huggingface.co/docs/transformers.js) (@xenova/transformers)
- **翻译模型**: Helsinki-NLP/opus-mt + NLLB-200
- **学术模型**: SciBERT + Academic Phrasebank
- **模型下载**: Hugging Face Hub (官方推荐方式)

### 📖 文档

- [产品设计文档](./DESIGN.md)
- [技术架构指南](./CLAUDE.md)
- [UI 设计稿](./UI_WIREFRAME.md)
- [模型策略](./HYBRID_MODEL_STRATEGY.md)
- [学术写作模型](./ACADEMIC_WRITING_MODELS.md)
- [产品总结](./PRODUCT_SUMMARY.md)

### 🎨 Logo 设计

MyDictionary 的 Logo 采用 **小浣熊 🦝** 抱词典的形象,象征:
- 🧠 **聪明智慧** - 本地 AI 智能翻译
- 📚 **博学多识** - 支持 200 种语言
- 🎓 **学术严谨** - 专业的学术写作辅助

### 🔧 开发

#### 项目结构
```
MyDictionary/
├── manifest.json           # Chrome 插件配置
├── package.json            # 依赖管理
├── background.js           # Service Worker (模型管理)
├── content.js              # Content Script (UI)
├── src/
│   ├── config/
│   │   └── models-config.json
│   ├── utils/
│   └── ui/
│       ├── sidebar.html
│       ├── sidebar.css
│       ├── popup.html
│       └── popup.js
├── assets/
│   ├── logo.png
│   └── icons/
└── docs/
```

#### 开发命令
```bash
# 安装依赖
pnpm install

# 开发模式 (监听文件变化)
pnpm run dev

# 构建生产版本
pnpm run build

# 打包为 .crx 文件
pnpm run package
```

### 🤝 贡献

欢迎提交 Issue 和 Pull Request!

### 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

### 🙏 致谢

**AI 模型与库:**
- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face - 在浏览器中运行 Transformers 模型
- [Helsinki-NLP/opus-mt-en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh) - 英译中翻译模型
- [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en) - 中译英翻译模型
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) - 200 种语言通用翻译
- [distilbert-base-uncased](https://huggingface.co/distilbert-base-uncased) - 近义词推荐
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - 句子嵌入
- [allenai/scibert_scivocab_uncased](https://huggingface.co/allenai/scibert_scivocab_uncased) - 科学论文理解
- [Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/) by University of Manchester - 学术短语库

---

<div align="center">

**用 🦝 的智慧,让翻译更简单**

Made with ❤️ by Jason, wish my PhD journal published soon.

</div>
