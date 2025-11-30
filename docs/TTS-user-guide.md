# TTS 功能使用指南 (🔊 Speaker Icon Location)

**版本**: v0.1.6-dev
**更新时间**: 2025-11-30

---

## 📍 Where is the 🔊 Speaker Icon?

### Current Implementation (v0.1.6)

The **🔊 speaker icon** is currently available **ONLY** in the **Academic Writing** mode:

```
┌─────────────────────────────────────────────────────────┐
│  MyDictionary Sidebar                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Translation] [Academic Writing] ← Switch to this tab  │
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

### 1. Open Sidebar
- **Keyboard Shortcut**: Press `Cmd+Shift+D` (Mac) or `Ctrl+Shift+D` (Windows)
- **Or**: Select text on any webpage → Right-click → "Translate with MyDictionary"

### 2. Switch to Academic Writing Mode
- Click the **[Academic Writing]** tab at the top of the sidebar
- If you haven't downloaded the Academic Phrasebank yet, click **"📥 Download Now"**

### 3. Browse Academic Phrases
- Select a section (e.g., Introduction, Methods, Results, Discussion)
- Each phrase card will show:
  - **📋 Copy** - Copy the phrase to clipboard
  - **🔊 Speaker** - Read the phrase aloud (TTS)
  - **💡 Examples** - Show example sentences

### 4. Click the 🔊 Icon
- **First time**: SpeechT5 model (~120MB) will be downloaded automatically
- **Download time**: 1-3 minutes (depends on your internet speed)
- **After download**: Click 🔊 again to hear the phrase

---

## 🎵 Button States

| Icon | Meaning | Action |
|------|---------|--------|
| 🔊 | Ready | Click to play |
| ⏳ | Loading | Model downloading or loading |
| ⏸️ | Playing | Click to stop |
| ❌ | Error | Will auto-recover in 2 seconds |

---

## 🚀 Upcoming Features (v0.2.0)

The TTS feature will be expanded to more locations:

### Planned Locations:
1. ✅ **Academic Writing Mode** (Current)
2. ⏳ **Translation Results Box** (Next)
3. ⏳ **Synonym List** (Planned)
4. ⏳ **Example Sentences** (Planned)

### Example of Future Implementation:
```
┌─────────────────────────────────────────────────────────┐
│  Translation Tab                                         │
├─────────────────────────────────────────────────────────┤
│  Original: "rice cooker"                                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ 🇨🇳 Translation:                               │    │
│  │                                                 │    │
│  │ 电饭锅  [🔊]  ← TTS button (Coming Soon)       │    │
│  │                                                 │    │
│  │ [Synonyms] [Examples]                          │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

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

### Q1: Why don't I see the 🔊 icon in Translation mode?
**A**: Currently, TTS is only available in Academic Writing mode. Translation mode TTS will be added in v0.2.0.

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
