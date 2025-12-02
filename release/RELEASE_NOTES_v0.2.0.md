# MyDictionary v0.2.0 Release Notes

## 🎯 统一资源管理系统

v0.2.0 引入了全新的资源管理架构，将 AI 模型、词典、同义词库等资源统一管理，提供可视化的下载、更新、删除功能。

---

## ✨ 主要功能

### 📦 Model Manager (模型管理中心)
全新的模型管理页面，统一管理所有 AI 模型和数据资源：

**支持的资源**:
1. **Translation Model (翻译模型)**
   - 模型: M2M100 418M
   - 大小: ~600 MB
   - 功能: 英中互译专用模型

2. **Semantic Search Model (语义搜索)**
   - 模型: MiniLM-L6-v2
   - 大小: ~90 MB
   - 功能: 语义相似度计算

3. **BGE Academic Model (学术搜索)**
   - 模型: BGE-Base-EN-v1.5
   - 大小: ~420 MB
   - 功能: 学术论文搜索和相似度分析

4. **WordNet Synonyms (同义词库)**
   - 数据: Princeton WordNet
   - 大小: ~50 MB
   - 词条: 117,000+
   - 功能: 同义词、反义词查询

**功能特性**:
- 🎨 渐变紫色界面设计
- 📊 实时状态指示器 (检测中/未安装/已安装/下载中)
- 📥 下载进度实时反馈
- 🗑️ 一键删除已安装模型
- 🌍 中英文双语支持

### 📚 Dictionary Manager (词典管理中心)
独立的词典管理页面：

**完整词库**:
- 词条数: 770,000+
- 来源: ECDICT 开源词典
- 大小: ~218 MB (原始) / ~70 MB (压缩)
- 功能: 完整英汉词典查询

**功能特性**:
- 📥 下载进度分阶段显示 (下载阶段 + 导入阶段)
- 💾 IndexedDB 持久化存储
- 🔄 状态实时同步到翻译面板
- ⚡ 导入进度百分比实时反馈

### 🔊 TTS 系统修复
**修复 WASM 加载错误**:
- ✅ 修正 Transformers.js WASM 文件路径
  - 错误路径: `transformers/dist/`
  - 正确路径: `transformers/`
- ✅ 修复 "no available backend found" 错误
- ✅ 修复 Examples 按钮 WASM 错误

**友好的错误引导**:
- 💡 TTS 失败时显示配置引导对话框
- 🎵 提供两种 TTS 方案选择：
  - 本地 TTS 服务器 (54 种高质量语音)
  - 浏览器内置 TTS (系统自带语音)
- 🔗 一键跳转到 TTS 设置页面

### 📚 Academic Phrasebank (学术短语库)
**自动加载，无需下载**:
- 📊 短语数: 2,500+
- 📦 大小: ~1.1 MB
- 🚀 扩展启动时自动加载到 IndexedDB
- 📖 来源: University of Manchester Academic Phrasebank

---

## 🐛 Bug 修复

### 词典管理
- 🔧 修复下载完成后删除按钮显示 "删除中" 而非 "删除"
- 🔧 添加明确的按钮状态重置逻辑

### 模型下载
- 🔧 修复模型下载参数不匹配
  - 问题: `modelType` vs `modelId` 参数冲突
  - 解决: 添加参数映射层 (modelType → modelId)
- 🔧 修复 "Cannot read properties of undefined (reading 'startsWith')" 错误

### 语义搜索
- 🔧 修复下载 BGE 模型后仍提示下载
  - 问题: 响应格式不一致 (`isDownloaded` vs `downloaded`)
  - 解决: 支持两种响应格式

### UI/UX
- 🎨 Settings 页面统一入口
  - 词典管理、模型管理、TTS 设置集中管理
- 📱 翻译面板底部 Settings 按钮直接跳转管理页面
- ✨ 模型卡片状态实时更新

---

## 🛠️ 技术改进

### 架构优化
- ⚡ 参数映射系统: 支持 `modelType` → `modelId` 转换
- 🔄 响应格式兼容: 同时支持 `isDownloaded` / `downloaded`
- 📦 资源打包: Academic Phrasebank 打包到 dist/ (1.1MB JSON)
- 🏗️ manifest.json 更新 WASM 资源路径

### 文件结构
**新增文件**:
- `src/ui/model-manager.html` - 模型管理界面
- `src/ui/model-manager.js` - 模型管理逻辑
- `src/ui/dictionary-manager.html` - 词典管理界面
- `src/ui/dictionary-manager.js` - 词典管理逻辑
- `src/lib/dictionary-downloader.js` - 词典下载器
- `scripts/build-full-dictionary.js` - 完整词典构建脚本

**主要修改**:
- `background.js`: WASM 路径、模型处理器、学术短语自动加载、WordNet 处理器
- `content.js`: TTS 错误对话框、模型下载状态检查兼容性
- `manifest.json`: WASM 资源路径修复
- `settings.html`: 统一管理页面入口
- `.gitignore`: 排除大文件（原始词典数据）

### 性能优化
- 🚀 Academic Phrasebank 从下载改为内置，启动即可用
- ⚡ IndexedDB 批量导入优化
- 📊 进度反馈细化到下载/导入两阶段

---

## 📦 下载

### 插件主体
- **MyDictionary-0.2.0.zip** (~55 MB)
  - 包含核心功能和 Academic Phrasebank
  - 立即可用，无需额外下载

### 可选资源 (通过插件内管理中心下载)

**AI 模型**:
- Translation Model (M2M100): ~600 MB
- Semantic Search (MiniLM-L6): ~90 MB
- BGE Academic Model: ~420 MB

**数据资源**:
- WordNet Synonyms: ~50 MB
- Full Dictionary (ECDICT): ~218 MB

**注意**: 大文件通过 GitHub Release Assets 分发，不包含在 git 仓库中

---

## 🔨 安装方法

### Chrome 扩展安装
1. 下载 `MyDictionary-0.2.0.zip`
2. 解压到任意目录
3. 打开 Chrome 浏览器
4. 访问 `chrome://extensions/`
5. 开启右上角"开发者模式"
6. 点击"加载已解压的扩展程序"
7. 选择解压后的 `dist` 目录

### 资源下载
1. 点击浏览器工具栏的 MyDictionary 图标
2. 点击右下角"设置"按钮
3. 选择"Model Manager"或"Dictionary Manager"
4. 点击需要的资源卡片上的"下载"按钮
5. 等待下载和导入完成

---

## ⚠️ 重要说明

### Git 仓库清理
本版本从 git 历史中彻底移除了大文件：
- ❌ `data/dictionary/ecdict.csv` (62.88 MB)
- ❌ `release/dictionaries/full-dictionary.json` (218.41 MB)

这些文件现在：
- ✅ 通过 GitHub Release Assets 分发
- ✅ 不计入仓库大小
- ✅ 通过插件内管理中心自动下载

### .gitignore 更新
已添加以下规则防止大文件再次提交：
```gitignore
# Large dictionary files (use GitHub Release for distribution)
release/dictionaries/*.json
!release/dictionaries/*-metadata.json
data/dictionary/*.csv
```

---

## 🗺️ 下个版本计划

基于用户反馈，v0.3.0 将重点开发：

### Dictionary Expansion (词典扩展)
1. **English-English Dictionary (英英词典)**
   - 来源: WordNet 或 Wiktionary
   - 提供专业英语释义

2. **Example Sentences (例句库)**
   - 来源: Tatoeba 开源语料库
   - 12.6M+ 句子，426 种语言

3. **Multi-Dictionary Query (多词典查询)**
   - 自动语言检测 (中文/英文)
   - 并行查询多个词典源
   - 统一结果展示界面

---

## 📄 版权声明

本项目使用以下开源资源：

### 词典数据
- [ECDICT](https://github.com/skywind3000/ECDICT) by skywind3000
  - 许可证: MIT License
  - 词条: 770,000+

- [Academic Phrasebank](http://www.phrasebank.manchester.ac.uk/)
  - 来源: University of Manchester
  - 短语: 2,500+

### AI 模型
- [Transformers.js](https://github.com/xenova/transformers.js) by Xenova
  - 许可证: Apache 2.0

- [M2M100](https://huggingface.co/facebook/m2m100_418M) by Facebook AI
- [MiniLM](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) by Microsoft
- [BGE](https://huggingface.co/BAAI/bge-base-en-v1.5) by BAAI

### 同义词数据
- [WordNet](https://wordnet.princeton.edu/) by Princeton University
  - 许可证: WordNet License

---

## 🙏 致谢

感谢所有开源项目的贡献者和使用 MyDictionary 的用户！

特别感谢:
- skywind3000 - ECDICT 词典作者
- Xenova - Transformers.js 作者
- University of Manchester - Academic Phrasebank
- Princeton University - WordNet

---

## 📞 反馈与支持

- **问题反馈**: [GitHub Issues](https://github.com/jhfnetboy/MyDictionary/issues)
- **功能建议**: [GitHub Discussions](https://github.com/jhfnetboy/MyDictionary/discussions)
- **完整更新日志**: [CHANGELOG.md](../CHANGELOG.md)

---

**🎉 感谢使用 MyDictionary v0.2.0!**
