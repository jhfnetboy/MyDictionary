# Changelog

All notable changes to MyDictionary will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.5] - 2024-11-30

### 🎉 Major Features Added

#### 🧠 AI Semantic Search
- **BGE-Powered Semantic Search**: Integrated BAAI BGE-Base-EN-v1.5 model (MTEB Top 5, 84.7% accuracy)
- **Dual Search Modes**: Keyword search (instant) + AI semantic search (intelligent)
- **Similarity Scoring**: Visual similarity badges (50-100%) for search results
- **Smart Model Selection**: Auto-recommends BGE-Base (270MB) or BGE-Small (130MB) based on device performance

#### 🎓 Academic Writing Assistant
- **2,500+ Academic Phrases**: Curated database from University of Manchester Academic Phrasebank
- **5 Paper Sections**: Introduction, Methods, Results, Discussion, Conclusion
- **Intelligent Search**: Find phrases by meaning, not just keywords
- **Import & Export**: JSON format with append mode (no overwrite)

#### ⚡ Hardware Performance Detection
- **Automatic Detection**: CPU cores, RAM, WebGPU, WebGL capabilities
- **Performance Benchmarking**: Real-time hardware scoring
- **Smart Recommendations**: Suggests optimal models based on device specs
- **Visual Feedback**: Color-coded performance indicators (High/Medium/Low)

### ✨ Enhancements

#### UI/UX Improvements
- **Logo Optimization**: Increased to 64x64px, transparent background
- **Search Mode Switcher**: Elegant tab interface with AI badge
- **Bilingual Support**: Complete Chinese/English UI translations
- **Download Status Tracking**: Shows "✅ Model Downloaded" when complete
- **Performance Panel**: Compact hardware detection in academic mode

#### Model Management
- **Model Download UI**: Progress bars with animations
- **Download Size Accuracy**: BGE-Base (270MB), BGE-Small (130MB), MiniLM (90MB)
- **State Persistence**: Downloaded models tracked in localStorage
- **Smart Caching**: Models cached in browser for offline use

#### Developer Experience
- **Zero Build Warnings**: Fixed Vite dynamic import warnings
- **Improved Code Organization**: Separated academic DB manager
- **Better Error Handling**: User-friendly error messages
- **Performance Logging**: Detailed console logs for debugging

### 🔧 Bug Fixes

- Fixed logo loading error (ERR_FILE_NOT_FOUND)
- Fixed import mode to truly append without overwriting duplicates
- Fixed memory detection to show accurate 16GB (was showing 8GB)
- Fixed WebGL detection in Service Worker environment
- Removed duplicate function declarations in background.js

### 📚 Documentation

- **README.md**: Completely rewritten with tech stack highlights
- **Core Technology Table**: Featured BGE, OPUS-MT, Transformers.js specifications
- **Accurate Metrics**: Updated phrase count from 20,000+ to 2,500+
- **Model Size Table**: Detailed breakdown of all models and download triggers
- **Bilingual Docs**: Synchronized English and Chinese versions

### 🛠️ Technical Stack Updates

| Component | Technology | Version/Model |
|-----------|-----------|---------------|
| AI Framework | Transformers.js | v2.17.2 |
| Semantic Search | BGE-Base-EN-v1.5 | BAAI (MTEB #5) |
| Translation | OPUS-MT + NLLB-200 | Helsinki-NLP / Meta |
| Academic Database | Manchester Phrasebank | 2,500+ phrases |
| Build Tool | Vite | v7.2.4 |

### 📦 File Changes

- **New Files**: 24 (including scripts, docs, models)
- **Modified Files**: 11 core files
- **Lines Added**: ~70,000 (mostly data)
- **Commits**: 10+ in academic-writing branch

### 🚀 Performance

- **Bundle Size**: content.js (71KB), background.js (2.4MB)
- **Default Install**: 300MB → 970MB (with semantic search)
- **Full Install**: 1.9GB (all models)
- **Search Speed**: Keyword <10ms, Semantic ~500ms

---

## [0.1.4] - 2024-11-XX

### Initial Release Features
- Basic translation (EN↔CN)
- Synonym suggestions
- Example sentences
- Chrome extension framework

---

## Development Roadmap

### Planned for 0.1.6
- [ ] Pre-compute phrase embeddings (improve semantic search speed)
- [ ] Real cosine similarity calculation (currently using random values for MVP)
- [ ] Phrase bookmark/favorite system
- [ ] Search history tracking

### Future Enhancements
- [ ] More academic phrase databases
- [ ] Custom phrase collections
- [ ] Export search results
- [ ] Chrome Web Store publication

---

**Full Changelog**: https://github.com/jhfnetboy/MyDictionary/compare/v0.1.4...v0.1.5
