# MyDictionary

<div align="center">

<img src="./assets/logo.png" width="40%" align="center" />

**Local AI Dictionary · Translation · Synonyms · Examples · AI-Powered Academic Writing**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Transformers.js](https://img.shields.io/badge/Model-Transformers.js-orange.svg)](https://huggingface.co/docs/transformers.js)
[![BGE Embeddings](https://img.shields.io/badge/BGE-BAAI-purple.svg)](https://huggingface.co/BAAI/bge-base-en-v1.5)

[English](#english) | [中文](#中文)

</div>

---

<h2 id="english">English</h2>

### 🏆 Core Technology Stack

**State-of-the-art AI models running 100% locally in your browser:**

| Component | Technology | Highlights | Performance |
|-----------|-----------|-----------|-------------|
| **🧠 AI Framework** | [Transformers.js](https://huggingface.co/docs/transformers.js) v2.17 | Official HuggingFace browser runtime · WASM + WebGL acceleration · Zero backend dependency | ⚡ Native speed |
| **🌐 Translation Engine** | Meta NLLB-200 | Unified EN↔CN model (600MB shared) · Universal 200-language support · SOTA translation quality | 🏆 BLEU 40+ |
| **🎓 Academic Search** | [BGE-Base-EN-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) | BAAI General Embedding · MTEB Top 5 (84.7% accuracy) · 768-dim semantic vectors | 🥇 MTEB Rank #5 |
| **📚 Academic Database** | [Manchester Phrasebank](https://www.phrasebank.manchester.ac.uk/) | 2,500+ curated phrases · 5 paper sections · University-verified expressions | ✅ Academic-grade |
| **🔍 Synonym Engine** | DistilBERT-base-uncased | Lightweight BERT variant · Context-aware recommendations · 65MB optimized model | 🚀 Fast inference |
| **💬 Example Generator** | MiniLM-L6-v2 | Sentence transformers · Semantic similarity matching · 23MB ultra-light | ⚡ <100ms |
| **📖 Local Dictionary** | [ECDICT](https://github.com/skywind3000/ECDICT) | 770k+ entries · MIT License · Phonetics + Collins ratings · Instant lookup (<50ms) | ⚡ 60x faster |
| **🔊 TTS Engine** | [SpeechT5 ONNX](https://huggingface.co/Xenova/speecht5_tts) | Microsoft SpeechT5 · Browser-native TTS · 120MB model · WebGPU accelerated | 🎵 Real-time |
| **🎙️ TTS Server (Optional)** | [Kokoro-82M](https://github.com/jhfnetboy/Candle-local-AI-Server) | TTS Arena #1 · 82M params · Rust Candle · Port 9527 | 🏆 Native quality |

### ✨ Features

- 🔒 **100% Privacy** - All AI processing runs locally in browser, zero data upload, no API keys needed
- 📖 **Lightning-Fast Dictionary** - 7,400+ high-frequency words with instant lookup (<50ms), 60x faster than AI models
- 🌐 **Smart Translation** - 200 languages with specialized high-quality models for major pairs (EN↔CN)
- 🧠 **AI Semantic Search** - BGE-powered intelligent phrase discovery with similarity scoring
- 📚 **Synonym Suggestions** - Context-aware intelligent recommendations powered by DistilBERT
- 💬 **Example Sentences** - Real-world usage examples from authentic sources
- 🎓 **Academic Writing** - 2,500+ academic phrases + AI semantic search for research papers
- 🔊 **Text-to-Speech** - Browser-native TTS (SpeechT5) + optional high-quality server (Kokoro-82M)
- ⚡ **On-Demand Download** - Only 600MB by default (EN↔CN shared model), other models downloaded as needed
- 🎯 **Hardware Detection** - Auto-recommends optimal models based on your device capabilities

### 🚀 Quick Start

#### Installation

1. Clone the repository (with submodules):
```bash
# Clone with TTS server submodule
git clone --recurse-submodules https://github.com/yourusername/MyDictionary.git
cd MyDictionary

# Or if already cloned, initialize submodules
git submodule update --init --recursive
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the extension:
```bash
pnpm run build
```

4. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` directory

#### Optional: Install High-Quality TTS Server

For native-speaker quality TTS (Kokoro-82M, ranked #1 on TTS Arena):

```bash
cd tts-server
git checkout dev
cargo build --release

# Start server (port 9527)
./target/release/kokoro-tts-server
```

See [tts-server/README.md](./tts-server/README.md) for detailed instructions.

#### Usage

**Method 1: Text Selection**
1. Select text on any webpage
2. Use right-click menu or translation icon
3. Sidebar slides in from the right with translation

**Method 2: Keyboard Shortcut**
1. Select text + `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`)
2. Sidebar appears automatically

**Method 3: Click Extension Icon**
1. Click the extension icon in toolbar
2. Enter text manually in the sidebar

### 📦 Models

#### Default Installation (600MB)
- ✅ **English ↔ Chinese** - Meta NLLB-200-distilled-600M (600MB, shared for both directions)

#### On-Demand Downloads
Models are downloaded automatically when you use the corresponding features:

| Feature | Model | Size | Download Trigger | Technology |
|---------|-------|------|------------------|-----------|
| Other Languages | Meta NLLB-200 (Universal) | 600MB | First non-EN/CN translation | NLLB distilled (same as EN↔CN) |
| Synonyms | DistilBERT-base-uncased | 65MB | Click [Synonyms] button | DistilBERT |
| Examples | MiniLM-L6-v2 | 23MB | Click [Examples] button | Sentence-Transformers |
| Academic Phrases | Phrasebank JSON | 1.1MB | Switch to Academic mode | JSON database |
| **🧠 AI Semantic Search** | **BGE-Base-EN-v1.5** | **270MB** | **Click "Semantic Search" tab** | **BAAI Embeddings** |
| AI Semantic (Lite) | BGE-Small-EN-v1.5 | 130MB | Low-end devices | BAAI Embeddings |
| **🔊 TTS (Browser)** | **SpeechT5 ONNX** | **120MB** | **Click 🔊 button** | **Microsoft SpeechT5** |
| 🔊 TTS (High Quality) | Kokoro-82M | 90MB | Install local server (optional) | Rust Candle |

**Total**: 600MB (default) → **870MB** (with AI semantic search) → **990MB** (with TTS) → 1.8GB (full installation)

> 💡 **High-Quality TTS**: Install optional [Candle TTS Server](./tts-server) for native-speaker quality (Kokoro-82M, TTS Arena #1)

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

#### 4. AI-Powered Academic Writing
- **2,500+ Academic Phrases**: Curated from University of Manchester Academic Phrasebank
- **🧠 AI Semantic Search**: BGE-powered intelligent phrase discovery with similarity scoring (50-100%)
- **Paper Section Specific**: Introduction / Methods / Results / Discussion / Conclusion
- **Dual Search Modes**: Keyword search (instant) + AI semantic search (intelligent)
- **Copy & Paste**: One-click copy to your paper
- **Performance Detection**: Auto-recommends BGE-Base (high-end) or BGE-Small (efficient)

#### 5. Text-to-Speech (TTS) 🔊
- **Browser-Native**: SpeechT5 TTS runs 100% in browser (120MB ONNX model)
- **Smart Loading**: Lazy download on first use, permanently cached offline
- **Academic Phrases**: Click 🔊 button next to any phrase to hear native pronunciation
- **Button States**: Visual feedback (🔊 → ⏳ → ⏸️)
- **Optional High-Quality**: Install [Kokoro-82M server](./tts-server) for native-speaker quality
  - **TTS Arena #1**: Ranked higher than OpenAI TTS and XTTS v2
  - **Lightweight**: Only 82M parameters, runs on CPU
  - **Rust Candle**: Fast inference with minimal memory
  - **Port 9527**: Local server, no internet required

### 🛠️ Tech Stack

- **Frontend**: Chrome Extension Manifest V3
- **AI Library**: [Transformers.js](https://huggingface.co/docs/transformers.js) (@xenova/transformers)
- **Translation Models**: Meta NLLB-200-distilled-600M (EN↔CN) + NLLB-200 (Universal)
- **Academic Models**: SciBERT + Academic Phrasebank
- **Model Download**: Hugging Face Hub (official recommended method)

### 📖 Documentation

- [Product Design](./docs/DESIGN.md)
- [Technical Architecture](./docs/CLAUDE.md)
- [UI Wireframes](./docs/UI_WIREFRAME.md)
- [Model Strategy](./docs/HYBRID_MODEL_STRATEGY.md)
- [Academic Writing Models](./docs/ACADEMIC_WRITING_MODELS.md)
- [Academic Version Plan](./docs/ACADEMIC_VERSION_PLAN.md)
- [Product Summary](./docs/PRODUCT_SUMMARY.md)

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
- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face - Run Transformers models in the browser with ONNX Runtime
- [Xenova/nllb-200-distilled-600M](https://huggingface.co/Xenova/nllb-200-distilled-600M) - English ↔ Chinese translation (Meta NLLB-200, quality: 8/10)
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) - 200 languages universal translation (Meta AI)
- [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) - **BGE embeddings for AI semantic search (MTEB Top 5)**
- [BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) - Lightweight BGE for low-end devices
- [distilbert-base-uncased](https://huggingface.co/distilbert-base-uncased) - Synonym suggestions
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - Sentence embeddings
- [Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/) by University of Manchester - 2,500+ curated academic phrases

---

<div align="center">

**With the wisdom of 🦝, translation made simple**

Made with ❤️ by Jason

</div>

---

<h2 id="中文">中文</h2>

### 🏆 核心技术栈

**业界领先的 AI 模型，100% 浏览器本地运行：**

| 组件 | 技术 | 亮点 | 性能 |
|------|------|------|------|
| **🧠 AI 框架** | [Transformers.js](https://huggingface.co/docs/transformers.js) v2.17 | HuggingFace 官方浏览器运行时 · WASM + WebGL 加速 · 零后端依赖 | ⚡ 原生速度 |
| **🌐 翻译引擎** | Meta NLLB-200 | 统一英中模型 (600MB共享) · 通用200语言支持 · SOTA 翻译质量 | 🏆 BLEU 40+ |
| **🎓 学术搜索** | [BGE-Base-EN-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) | 北京智源 BGE 嵌入 · MTEB 排名第5 (84.7%准确度) · 768维语义向量 | 🥇 MTEB #5 |
| **📚 学术数据库** | [曼彻斯特大学学术短语库](https://www.phrasebank.manchester.ac.uk/) | 2500+精选短语 · 5个论文章节 · 大学认证表达 | ✅ 学术级 |
| **🔍 同义词引擎** | DistilBERT-base-uncased | 轻量BERT变体 · 上下文感知推荐 · 65MB优化模型 | 🚀 快速推理 |
| **💬 例句生成器** | MiniLM-L6-v2 | 句子转换器 · 语义相似度匹配 · 23MB超轻量 | ⚡ <100ms |

### ✨ 特性

- 🔒 **100% 隐私** - 所有 AI 推理在浏览器本地完成,零数据上传,无需 API 密钥
- 🌐 **智能翻译** - 200 种语言,主要语言对 (英↔中) 使用专用高质量模型
- 🧠 **AI 语义搜索** - BGE 驱动的智能短语发现,带相似度评分
- 📚 **近义词推荐** - DistilBERT 驱动的上下文感知智能建议
- 💬 **例句展示** - 来自真实来源的使用场景例句
- 🎓 **学术写作** - 2,500+ 学术短语 + AI 语义搜索助力论文写作
- ⚡ **按需下载** - 默认仅 600MB (英中双向共享模型),其他模型按需下载
- 🎯 **硬件检测** - 根据设备性能自动推荐最优模型

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
1. 选中文本 + `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`)
2. 侧边栏自动出现

**方式 3: 点击插件图标**
1. 点击浏览器工具栏的插件图标
2. 在侧边栏手动输入文本翻译

### 📦 模型说明

#### 默认安装 (600MB)
- ✅ **英译中 / 中译英** - Meta NLLB-200-distilled-600M (600MB，双向共享)

#### 按需下载
当您使用相应功能时,会自动提示下载:

| 功能 | 模型 | 大小 | 下载时机 | 技术 |
|------|------|------|----------|------|
| 其他语言翻译 | Meta NLLB-200 (通用) | 600MB | 翻译非英中语言时 | NLLB distilled (与英中同模型) |
| 近义词 | DistilBERT-base-uncased | 65MB | 点击[近义词]按钮时 | DistilBERT |
| 例句 | MiniLM-L6-v2 | 23MB | 点击[例句]按钮时 | Sentence-Transformers |
| 学术短语库 | Phrasebank JSON | 1.1MB | 切换到学术模式时 | JSON 数据库 |
| **🧠 AI 语义搜索** | **BGE-Base-EN-v1.5** | **270MB** | **点击"语义搜索"标签** | **北京智源 BGE** |
| AI 语义搜索(轻量) | BGE-Small-EN-v1.5 | 130MB | 低性能设备 | 北京智源 BGE |

**总计**: 600MB (默认) → **870MB** (含AI语义搜索) → **990MB** (含TTS) → 1.8GB (完整安装)

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

#### 4. AI 驱动的学术写作
- **2,500+ 学术表达**: 来自曼彻斯特大学学术短语库精选
- **🧠 AI 语义搜索**: BGE 驱动的智能短语发现,带相似度评分 (50-100%)
- **论文各部分专用**: Introduction / Methods / Results / Discussion / Conclusion
- **双重搜索模式**: 关键词搜索 (即时) + AI 语义搜索 (智能)
- **即复即用**: 一键复制到论文中
- **性能检测**: 自动推荐 BGE-Base (高性能) 或 BGE-Small (高效)

### 🛠️ 技术栈

- **前端**: Chrome Extension Manifest V3
- **AI 库**: [Transformers.js](https://huggingface.co/docs/transformers.js) (@xenova/transformers)
- **翻译模型**: Meta NLLB-200-distilled-600M (英中) + NLLB-200 (通用)
- **学术模型**: SciBERT + Academic Phrasebank
- **模型下载**: Hugging Face Hub (官方推荐方式)

### 📖 文档

- [产品设计文档](./docs/DESIGN.md)
- [技术架构指南](./docs/CLAUDE.md)
- [UI 设计稿](./docs/UI_WIREFRAME.md)
- [模型策略](./docs/HYBRID_MODEL_STRATEGY.md)
- [学术写作模型](./docs/ACADEMIC_WRITING_MODELS.md)
- [学术版本开发计划](./docs/ACADEMIC_VERSION_PLAN.md)
- [产品总结](./docs/PRODUCT_SUMMARY.md)

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
- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face - 使用 ONNX Runtime 在浏览器中运行 Transformers 模型
- [Xenova/nllb-200-distilled-600M](https://huggingface.co/Xenova/nllb-200-distilled-600M) - 英中双向翻译 (Meta NLLB-200, 质量 8/10)
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) - 200 种语言通用翻译 (Meta AI)
- [BAAI/bge-base-en-v1.5](https://huggingface.co/BAAI/bge-base-en-v1.5) - **BGE 嵌入用于 AI 语义搜索 (MTEB 排名第5)**
- [BAAI/bge-small-en-v1.5](https://huggingface.co/BAAI/bge-small-en-v1.5) - 轻量级 BGE 用于低性能设备
- [distilbert-base-uncased](https://huggingface.co/distilbert-base-uncased) - 近义词推荐
- [sentence-transformers/all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - 句子嵌入
- [Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/) by University of Manchester - 2,500+ 精选学术短语
- [ECDICT](https://github.com/skywind3000/ECDICT) by skywind3000 - 770,000+ 词条英中词典 (MIT License)

## 📚 词典数据来源与许可

MyDictionary 使用以下开源词典数据,所有数据均遵循其原始许可协议:

### ECDICT (英中词典)
- **项目地址**: [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)
- **作者**: skywind3000
- **许可证**: MIT License
- **词条数**: 770,000+
- **内容**: 英文单词、音标、中文翻译、词形变化、柯林斯星级评分
- **使用范围**:
  - ✅ 个人学习和使用
  - ✅ 开源项目集成
  - ✅ 商业应用 (需保留版权声明)
  - ❌ 禁止直接转售词典数据

**数据分层**:
- **Tier 1** (7,400 词): 高频词汇,内置于插件,立即可用
- **Tier 2** (12,000 词): 扩展词汇 (CET6, IELTS, TOEFL, GRE)
- **Tier 3** (751,000 词): 完整词库

### 版权声明

本插件代码采用 **MIT License**,词典数据保留原始许可证。

使用本插件即表示您同意遵守以下条款:
1. 插件代码可自由使用、修改和分发 (MIT License)
2. 词典数据需遵守 ECDICT 的 MIT License 条款
3. 商业使用需保留版权声明和许可证文件
4. 禁止单独提取词典数据用于转售

---

<div align="center">

**用 🦝 的智慧,让翻译更简单**

Made with ❤️ by Jason, wish my PhD journal published soon.

</div>
