# 🦝 MyDictionary

> [English](#english) | [中文](#中文)

<div align="center">

![Logo](./assets/logo.png)

**Local AI Dictionary · Translation · Synonyms · Examples · Academic Writing**

**智能本地 AI 词典 · 翻译 · 近义词 · 例句 · 学术写作**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Model](https://img.shields.io/badge/Model-Transformers.js-orange.svg)](https://huggingface.co/docs/transformers.js)

</div>

---

## English

### ✨ Features

- 🔒 **Fully Local** - All AI processing runs locally, no data upload, privacy protected
- 🌐 **Smart Translation** - 200 languages support, dedicated high-quality models for major language pairs
- 📚 **Synonym Suggestions** - Context-aware intelligent synonym recommendations
- 💬 **Example Sentences** - Real-world usage examples
- 🎓 **Academic Writing** - 20,000+ academic phrases to boost your research papers
- ⚡ **On-Demand Download** - Only 300MB by default, other models downloaded as needed

## 🚀 快速开始

### 安装

1. Clone 项目:
```bash
git clone https://github.com/yourusername/MyDictionary.git
cd MyDictionary
```

2. 安装依赖:
```bash
pnpm install
```

3. 加载到 Chrome:
   - 打开 Chrome 浏览器,访问 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序",选择项目目录

### 使用方式

#### 方式 1: 网页划词
1. 在任意网页选中文本
2. 显示翻译图标或使用右键菜单
3. 右侧滑出面板自动显示翻译

#### 方式 2: 快捷键
1. 选中文本 + `Ctrl+Shift+F` (Mac: `Cmd+Shift+F`)
2. 右侧滑出面板

#### 方式 3: 点击插件图标
1. 点击浏览器工具栏的插件图标
2. 在侧边栏手动输入文本翻译

## 📦 模型说明

### 默认安装 (仅 300MB)
- ✅ **英译中专用模型** - Helsinki-NLP/opus-mt-en-zh (300MB)

### 按需下载
当您使用相应功能时,会自动提示下载:

| 功能 | 模型 | 大小 | 下载时机 |
|------|------|------|----------|
| 中译英 | Helsinki-NLP/opus-mt-zh-en | 300MB | 首次使用中译英时 |
| 其他语言翻译 | NLLB-200 | 600MB | 翻译非英中语言时 |
| 近义词 | DistilBERT | 65MB | 点击[近义词]按钮时 |
| 例句 | MiniLM | 23MB | 点击[例句]按钮时 |
| 学术短语库 | Academic Phrasebank | 8MB | 切换到学术模式时 |
| 学术专业模型 | SciBERT | 440MB | 学术模式设置中启用 |

**总计**: 300MB (默认) → 1.7GB (完整安装)

## 🎯 核心功能

### 1. 智能翻译
- 自动检测 20+ 种语言 (中、英、日、韩、泰、俄、阿等)
- 主要语言对 (英↔中) 使用专用高质量模型 ⭐⭐⭐⭐⭐
- 其他语言使用通用模型支持 200 种语言 ⭐⭐⭐⭐

### 2. 近义词推荐
- 基于上下文的智能同义词
- 5-10 个相关替换建议
- 点击可重新翻译

### 3. 例句展示
- 3-5 个真实使用场景例句
- 自动翻译每个例句
- 高亮显示目标词汇

### 4. 学术写作模式
- **20,000+ 学术表达**: 来自顶尖期刊论文
- **论文各部分专用**: Introduction / Methods / Results / Discussion / Conclusion
- **即复即用**: 一键复制到论文中
- **可选 SciBERT**: 学术级近义词推荐

## 🛠️ 技术栈

- **前端**: Chrome Extension Manifest V3
- **AI 库**: [Transformers.js](https://huggingface.co/docs/transformers.js) (@xenova/transformers)
- **翻译模型**: Helsinki-NLP/opus-mt + NLLB-200
- **学术模型**: SciBERT + Academic Phrasebank
- **模型下载**: Hugging Face Hub (官方推荐方式)

## 📖 文档

- [产品设计文档](./DESIGN.md)
- [技术架构指南](./CLAUDE.md)
- [UI 设计稿](./UI_WIREFRAME.md)
- [模型策略](./HYBRID_MODEL_STRATEGY.md)
- [学术写作模型](./ACADEMIC_WRITING_MODELS.md)

### 🎨 Logo Design

MyDictionary's logo features a **Raccoon 🦝** holding a dictionary, symbolizing:
- 🧠 **Smart & Clever** - Local AI-powered intelligent translation
- 📚 **Well-Read** - Supporting 200 languages
- 🎓 **Academic Excellence** - Professional academic writing assistance

## 🔧 开发

### 项目结构
```
MyDictionary/
├── manifest.json           # Chrome 插件配置
├── package.json            # 依赖管理
├── background.js           # Service Worker
├── content.js              # Content Script
├── src/
│   ├── config/
│   │   └── models-config.json
│   ├── utils/
│   └── ui/
├── assets/
│   ├── logo.png
│   ├── icons/
│   └── academic-phrasebank.json
└── docs/
```

### 开发命令
```bash
# 安装依赖
pnpm install

# 本地开发 (监听文件变化)
pnpm run dev

# 构建生产版本
pnpm run build

# 打包为 .crx 文件
pnpm run package
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

### 🙏 Acknowledgements

- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face - Run AI models in the browser
- [Helsinki-NLP/opus-mt-en-zh](https://huggingface.co/Helsinki-NLP/opus-mt-en-zh) - English to Chinese translation model
- [Helsinki-NLP/opus-mt-zh-en](https://huggingface.co/Helsinki-NLP/opus-mt-zh-en) - Chinese to English translation model
- [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) - Universal multilingual translation (200 languages)
- [distilbert-base-uncased](https://huggingface.co/distilbert-base-uncased) - Synonym suggestions
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) - Sentence embeddings for example retrieval
- [AllenAI SciBERT](https://huggingface.co/allenai/scibert_scivocab_uncased) - Academic writing model
- [Academic Phrasebank](https://www.phrasebank.manchester.ac.uk/) - University of Manchester - Academic phrases database

---

## 中文

### ✨ 特性

- 🔒 **完全本地化** - 所有 AI 推理在本地完成,无数据上传,保护隐私
- 🌐 **智能翻译** - 支持 200 种语言互译,主要语言对使用专用高质量模型
- 📚 **近义词推荐** - 基于上下文的智能同义词建议
- 💬 **例句展示** - 真实使用场景的例句参考
- 🎓 **学术写作** - 20,000+ 学术常用表达,助力论文写作
- ⚡ **按需下载** - 默认仅 300MB,其他模型按需下载
