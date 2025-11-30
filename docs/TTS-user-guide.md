# TTS 功能使用指南 (🔊 Speaker Icon Location)

**版本**: v0.1.6-dev
**更新时间**: 2025-11-30

---

## 📍 Where is the 🔊 Speaker Icon?

### Current Implementation (v0.1.6+)

The **🔊 speaker icon** is now available in **THREE** locations:

### 1️⃣ Translation Tab - Input Box
```
┌─────────────────────────────────────────────────────────┐
│  MyDictionary Sidebar                                   │
├─────────────────────────────────────────────────────────┤
│  [Translation] [Academic Writing]                       │
│                                                          │
│  Source Language: Auto Detect ▼                         │
│  ┌────────────────────────────────────────────────┐    │
│  │ Enter text to translate...               [🔊] │ ← HERE!
│  │                                                 │    │
│  │                                                 │    │
│  └────────────────────────────────────────────────┘    │
│  [Translate]                                            │
└─────────────────────────────────────────────────────────┘
```

### 2️⃣ Translation Tab - Result Box
```
┌─────────────────────────────────────────────────────────┐
│  Target Language: 中文 ▼                                │
│  ┌────────────────────────────────────────────────┐    │
│  │ 电饭锅  [🔊] ← HERE!                            │    │
│  │                                                 │    │
│  │ ⏱️ 850ms  📦 translation-zh-en                 │    │
│  └────────────────────────────────────────────────┘    │
│  [Synonyms] [Examples]                                  │
└─────────────────────────────────────────────────────────┘
```

### 3️⃣ Academic Writing - Phrase Cards
```
┌─────────────────────────────────────────────────────────┐
│  [Translation] [Academic Writing] ← Switch here         │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Section: Introduction ▼                        │    │
│  │                                                 │    │
│  │ ┌─────────────────────────────────────────┐   │    │
│  │ │ 🔵 95% Similarity  ⭐⭐⭐⭐ 8.5        │   │    │
│  │ │                                         │   │    │
│  │ │ "This study aims to investigate..."    │   │    │
│  │ │                                         │   │    │
│  │ │ 用于陈述研究目的                         │   │    │
│  │ │                                         │   │    │
│  │ │ [📋 Copy]  [🔊]  [💡 Examples]        │ ← HERE!
│  │ └─────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 📖 Step-by-Step Instructions

### Usage 1: Translation Input TTS

1. Open sidebar: `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows)
2. Type or paste text in the input box
3. Click the 🔊 icon in the **top-right corner of the textarea**
4. Listen to your input text

### Usage 2: Translation Result TTS

1. Complete a translation
2. Find the 🔊 icon **next to the translation result**
3. Click to hear the translated text
4. Works for any language translation

### Usage 3: Academic Phrase TTS

1. Switch to **[Academic Writing]** tab
2. Download Academic Phrasebank (if needed): Click **"📥 Download Now"**
3. Browse phrases by section (Introduction, Methods, Results, etc.)
4. Click 🔊 on any phrase card
5. Hear native English pronunciation

### First-Time Setup

- **First 🔊 click**: SpeechT5 model (~120MB) downloads automatically
- **Download time**: 1-3 minutes (depends on your internet speed)
- **After download**: TTS works instantly offline

---

## 🎵 Button States

| Icon | Meaning | Action |
|------|---------|--------|
| 🔊 | Ready | Click to play |
| ⏳ | Loading | Model downloading or loading |
| ⏸️ | Playing | Click to stop |
| ❌ | Error | Will auto-recover in 2 seconds |

---

## 🚀 Current & Future Features

### ✅ Implemented (v0.1.6+)
1. ✅ **Translation Input Box** - TTS for source text
2. ✅ **Translation Result Box** - TTS for translated text
3. ✅ **Academic Phrase Cards** - TTS for academic expressions

### ⏳ Upcoming (v0.2.0)
1. ⏳ **Synonym List** - Read each synonym aloud
2. ⏳ **Example Sentences** - Hear sentence pronunciation
3. ⏳ **Popup Tooltip** - Mini TTS for quick translations

---

## 🔧 Technical Details

### Model Information
- **Model**: Microsoft SpeechT5 ONNX
- **Size**: ~120MB
- **Quality**: 7/10 (Natural, browser-native)
- **Speed**: <1 second for short phrases
- **Cache**: Permanent (no re-download after first use)

### Optional High-Quality Server
For **native-speaker quality** (10/10), install the optional TTS server:
- **Model**: Kokoro-82M (TTS Arena #1)
- **Server**: Rust Candle (90MB)
- **Installation**: See [tts-server/README.md](../tts-server/README.md)

---

## ❓ FAQ

### Q1: Where can I find the 🔊 icon?
**A**: The 🔊 icon appears in THREE places:
- Input box (top-right corner of textarea)
- Translation result box (next to translated text)
- Academic phrase cards ([🔊] button)

### Q2: The download is taking too long
**A**: The SpeechT5 model is ~120MB. On a slow connection, it may take 3-5 minutes. The download happens only once.

### Q3: Can I use TTS offline?
**A**: Yes! After the first download, the model is cached permanently. You can use TTS completely offline.

### Q4: Why is there no sound?
**Checklist**:
1. Check your system volume
2. Check browser permissions (Settings → Site Settings → Sound)
3. Look at the Service Worker console for errors:
   - Go to `chrome://extensions/`
   - Find MyDictionary
   - Click "Service Worker" to see logs

### Q5: Can I change the voice or speed?
**A**: The current version uses the default SpeechT5 speaker embedding. Custom voice/speed controls will be added in future versions.

---

## 🐛 Troubleshooting

### Issue: 🔊 button shows ❌ error
**Solution**:
1. Open Service Worker console (`chrome://extensions/` → Service Worker)
2. Check for error messages
3. Try clicking 🔊 again after 2 seconds
4. If persists, clear IndexedDB cache:
   ```javascript
   // In Service Worker console:
   indexedDB.deleteDatabase('transformers-cache');
   location.reload();
   ```

### Issue: Model download stuck at X%
**Solution**:
1. Check your internet connection
2. Disable VPN/proxy temporarily
3. Reload the extension
4. Try again

---

## 📝 Feedback

If you have suggestions for where else you'd like to see the 🔊 button, please create an issue:

👉 https://github.com/jhfnetboy/MyDictionary/issues

---

**Last Updated**: 2025-11-30
**Author**: Claude (Anthropic)
