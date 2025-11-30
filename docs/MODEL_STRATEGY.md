# MyDictionary - 多语言模型策略设计

## 一、核心设计思路

### 1.1 问题分析
- **挑战**: 支持多种语言翻译,但每个语言对需要不同的模型
- **矛盾**: 用户希望即装即用 vs 模型体积巨大(每个模型 300-600MB)
- **解决方案**: **按需下载** + **智能推荐** + **渐进式加载**

### 1.2 设计原则
1. **基础优先**: 默认仅安装英语模型(覆盖最广泛的使用场景)
2. **用户驱动**: 根据用户实际翻译需求,自动检测并推荐下载相关模型
3. **透明可控**: 用户可手动管理模型,查看已安装模型和可用模型列表
4. **降级方案**: 未安装模型时,提示用户下载或使用在线翻译 API(可选)

---

## 二、模型分类策略

### 2.1 模型架构选择

经过调研,推荐使用 **NLLB-200 系列**模型:

| 模型名称 | 支持语言数 | 模型大小 | 推荐场景 |
|---------|-----------|---------|---------|
| `Xenova/nllb-200-distilled-600M` | 200 种语言 | ~600MB | **推荐** - 单模型支持所有语言对 |
| `Helsinki-NLP/opus-mt-*` | 1 种语言对/模型 | ~300MB | 备选 - 特定语言对专用 |

**最佳方案**: 使用 `Xenova/nllb-200-distilled-600M` 一个模型解决所有语言翻译!

### 2.2 为什么选择 NLLB-200?

✅ **优势**:
- 单模型支持 **200 种语言之间的任意互译**(包括中、英、日、韩、法、德、西、泰等)
- 无需为每个语言对下载单独模型
- 模型大小 600MB,相比下载多个 `opus-mt-*` 模型更省空间

❌ **劣势**:
- 首次下载体积较大(但只需下载一次)
- 特定语言对的翻译质量可能略低于专用模型

**结论**: 对于 Chrome 插件场景,NLLB-200 是最佳选择!

---

## 三、模型加载策略

### 3.1 分层加载架构

```javascript
// 模型分层
const MODEL_TIERS = {
  // 核心层: 默认安装,插件启动时立即加载
  CORE: {
    translation: 'Xenova/nllb-200-distilled-600M',  // 支持所有语言
  },

  // 扩展层: 用户按需启用
  EXTENDED: {
    synonyms: 'Xenova/distilbert-base-uncased',     // 英文近义词
    examples: 'Xenova/all-MiniLM-L6-v2',            // 例句检索
  },

  // 专业层: 特定场景(可选)
  PROFESSIONAL: {
    // 如果用户对某个语言对质量要求极高,可选择专用模型
    'en-zh': 'Helsinki-NLP/opus-mt-en-zh',
    'zh-en': 'Helsinki-NLP/opus-mt-zh-en',
  }
};
```

### 3.2 安装时策略

**首次安装插件**:
```
用户安装插件
    ↓
自动下载核心模型: nllb-200-distilled-600M (600MB)
    ↓
显示欢迎页面:
  "✅ MyDictionary 已安装成功!"
  "📦 已支持 200 种语言翻译"
  "💡 可在设置中启用近义词和例句功能(需额外下载 88MB)"
```

**渐进式加载**:
```javascript
// background.js
async function initializeModels() {
  // 1. 优先加载翻译模型
  console.log('正在加载翻译模型...');
  translationPipeline = await pipeline(
    'translation',
    'Xenova/nllb-200-distilled-600M',
    { progress_callback: (progress) => {
      // 向用户显示下载进度
      chrome.runtime.sendMessage({
        type: 'MODEL_LOADING_PROGRESS',
        model: 'translation',
        progress: progress.progress || 0
      });
    }}
  );

  console.log('✅ 翻译模型加载完成');

  // 2. 检查用户是否启用了扩展功能
  const settings = await chrome.storage.local.get('enabledFeatures');

  if (settings.enabledFeatures?.synonyms) {
    console.log('正在加载近义词模型...');
    synonymsPipeline = await pipeline('fill-mask', 'Xenova/distilbert-base-uncased');
  }

  if (settings.enabledFeatures?.examples) {
    console.log('正在加载例句模型...');
    examplesPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
}
```

---

## 四、语言检测与模型路由

### 4.1 多语言检测算法

```javascript
// utils/languageDetector.js

/**
 * 支持的语言及其 NLLB-200 语言代码
 */
const SUPPORTED_LANGUAGES = {
  'zh': { name: '中文', code: 'zho_Hans', flag: '🇨🇳' },
  'en': { name: 'English', code: 'eng_Latn', flag: '🇺🇸' },
  'ja': { name: '日本語', code: 'jpn_Jpan', flag: '🇯🇵' },
  'ko': { name: '한국어', code: 'kor_Hang', flag: '🇰🇷' },
  'fr': { name: 'Français', code: 'fra_Latn', flag: '🇫🇷' },
  'de': { name: 'Deutsch', code: 'deu_Latn', flag: '🇩🇪' },
  'es': { name: 'Español', code: 'spa_Latn', flag: '🇪🇸' },
  'th': { name: 'ไทย', code: 'tha_Thai', flag: '🇹🇭' },
  'ru': { name: 'Русский', code: 'rus_Cyrl', flag: '🇷🇺' },
  'ar': { name: 'العربية', code: 'arb_Arab', flag: '🇸🇦' },
  'pt': { name: 'Português', code: 'por_Latn', flag: '🇵🇹' },
  'it': { name: 'Italiano', code: 'ita_Latn', flag: '🇮🇹' },
  'vi': { name: 'Tiếng Việt', code: 'vie_Latn', flag: '🇻🇳' },
  'id': { name: 'Indonesia', code: 'ind_Latn', flag: '🇮🇩' },
};

/**
 * 检测文本语言
 * @param {string} text - 待检测文本
 * @returns {string} 语言代码 (如 'zh', 'en', 'ja')
 */
function detectLanguage(text) {
  // Unicode 范围检测
  const patterns = {
    'zh': /[\u4e00-\u9fa5]/g,           // 中文
    'ja': /[\u3040-\u309f\u30a0-\u30ff]/g, // 日文平假名/片假名
    'ko': /[\uac00-\ud7af]/g,          // 韩文
    'th': /[\u0e00-\u0e7f]/g,          // 泰文
    'ar': /[\u0600-\u06ff]/g,          // 阿拉伯文
    'ru': /[\u0400-\u04ff]/g,          // 俄文
  };

  const totalChars = text.length;

  // 1. 先检测特殊字符集
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length / totalChars > 0.3) {
      return lang;
    }
  }

  // 2. 检测日文(需要区分中日混合)
  const hasKana = /[\u3040-\u309f\u30a0-\u30ff]/.test(text);
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  if (hasKana && hasChinese) {
    return 'ja'; // 有假名+汉字 → 日文
  }

  // 3. 默认判断为英文或拉丁字母语言
  return 'en';
}

/**
 * 智能推荐目标语言
 * @param {string} sourceLanguage - 源语言
 * @returns {string} 推荐的目标语言
 */
function recommendTargetLanguage(sourceLanguage) {
  // 用户偏好(从 chrome.storage 读取)
  const userPreferredLanguage = 'zh'; // 示例:用户设置的母语

  // 推荐逻辑:
  // - 如果源语言是用户母语 → 推荐英语
  // - 否则 → 推荐用户母语
  return sourceLanguage === userPreferredLanguage ? 'en' : userPreferredLanguage;
}
```

### 4.2 翻译请求路由

```javascript
// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    const { text, sourceLang, targetLang } = request;

    // 自动检测源语言(如果未指定)
    const detectedSourceLang = sourceLang || detectLanguage(text);

    // 推荐目标语言(如果未指定)
    const finalTargetLang = targetLang || recommendTargetLanguage(detectedSourceLang);

    // 检查是否支持该语言对
    if (!SUPPORTED_LANGUAGES[detectedSourceLang] || !SUPPORTED_LANGUAGES[finalTargetLang]) {
      sendResponse({
        success: false,
        error: `不支持的语言: ${detectedSourceLang} → ${finalTargetLang}`
      });
      return true;
    }

    // 执行翻译
    translateText(text, detectedSourceLang, finalTargetLang)
      .then(translation => {
        sendResponse({
          success: true,
          data: {
            translation,
            sourceLang: detectedSourceLang,
            targetLang: finalTargetLang
          }
        });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });

    return true; // 异步响应
  }
});

async function translateText(text, sourceLang, targetLang) {
  const sourceCode = SUPPORTED_LANGUAGES[sourceLang].code;
  const targetCode = SUPPORTED_LANGUAGES[targetLang].code;

  const result = await translationPipeline(text, {
    src_lang: sourceCode,
    tgt_lang: targetCode
  });

  return result[0].translation_text;
}
```

---

## 五、用户交互设计

### 5.1 首次使用引导

用户首次打开插件时:

```
┌─────────────────────────────────────┐
│  🎉 欢迎使用 MyDictionary!          │
├─────────────────────────────────────┤
│                                     │
│  📦 正在初始化...                   │
│                                     │
│  ████████████░░░░░░░░░  60%         │
│                                     │
│  正在下载翻译模型 (600MB)            │
│  预计还需 30 秒                      │
│                                     │
│  ℹ️ 该模型支持 200 种语言互译       │
│  包括: 中英日韩法德西泰俄...         │
│                                     │
└─────────────────────────────────────┘
```

下载完成后:

```
┌─────────────────────────────────────┐
│  ✅ 安装成功!                        │
├─────────────────────────────────────┤
│                                     │
│  🌐 已支持 200 种语言翻译            │
│                                     │
│  📚 可选功能(点击启用):              │
│  [ ] 近义词推荐 (+65MB)              │
│  [ ] 例句展示 (+23MB)                │
│                                     │
│  [立即开始]  [稍后设置]              │
│                                     │
└─────────────────────────────────────┘
```

### 5.2 语言切换交互

**侧边栏中的语言选择器**:

```
┌─────────────────────────────────────┐
│  ✕  MyDictionary                🌙 │
├─────────────────────────────────────┤
│                                     │
│  原文                                │
│  ┌───────────────────────────────┐ │
│  │ 🇨🇳 中文  ▼  │ artificial ... │ │ ← 点击切换源语言
│  └───────────────────────────────┘ │
│                                     │
│  翻译为                              │
│  ┌───────────────────────────────┐ │
│  │ 🇺🇸 English ▼ │ 人工智能       │ │ ← 点击切换目标语言
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**语言选择下拉菜单**:

```
┌─────────────────────────────┐
│  🔍 搜索语言...              │
├─────────────────────────────┤
│  🇨🇳 中文                   │
│  🇺🇸 English               │
│  🇯🇵 日本語                 │
│  🇰🇷 한국어                 │
│  🇫🇷 Français              │
│  🇩🇪 Deutsch               │
│  🇪🇸 Español               │
│  🇹🇭 ไทย                   │
│  🇷🇺 Русский               │
│  ───────────────────────   │
│  更多语言 (200+) ▼           │
└─────────────────────────────┘
```

### 5.3 模型管理界面

**设置页面 > 模型管理**:

```
┌─────────────────────────────────────┐
│  📦 模型管理                         │
├─────────────────────────────────────┤
│                                     │
│  核心模型                            │
│  ┌───────────────────────────────┐ │
│  │ 🌐 翻译模型 (NLLB-200)         │ │
│  │    状态: ✅ 已加载             │ │
│  │    大小: 600MB                │ │
│  │    支持: 200 种语言            │ │
│  │    [查看详情]                  │ │
│  └───────────────────────────────┘ │
│                                     │
│  扩展功能模型                        │
│  ┌───────────────────────────────┐ │
│  │ 📚 近义词模型                  │ │
│  │    状态: ⬇️ 未安装             │ │
│  │    大小: 65MB                 │ │
│  │    [立即下载]                  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 💬 例句模型                    │ │
│  │    状态: ✅ 已加载             │ │
│  │    大小: 23MB                 │ │
│  │    [卸载]                      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ℹ️ 已使用存储空间: 623MB / ∞       │
│                                     │
│  [清除所有缓存]  [重新下载]          │
│                                     │
└─────────────────────────────────────┘
```

---

## 六、降级方案

### 6.1 模型未加载时的处理

```javascript
// background.js

async function handleTranslationRequest(text, sourceLang, targetLang) {
  // 检查翻译模型是否已加载
  if (!translationPipeline) {
    // 选项 1: 提示用户等待模型加载
    if (isModelLoading) {
      return {
        success: false,
        error: 'MODEL_LOADING',
        message: '模型正在加载中,请稍候...',
        progress: modelLoadingProgress
      };
    }

    // 选项 2: 提示用户下载模型
    return {
      success: false,
      error: 'MODEL_NOT_INSTALLED',
      message: '翻译模型未安装',
      action: {
        type: 'DOWNLOAD_MODEL',
        modelName: 'translation',
        modelSize: '600MB'
      }
    };
  }

  // 正常执行翻译
  return await translateText(text, sourceLang, targetLang);
}
```

### 6.2 UI 提示设计

**模型加载中**:
```
┌─────────────────────────────────────┐
│  ⏳ 正在准备翻译功能...              │
│                                     │
│  ████████░░░░  80%                  │
│                                     │
│  预计还需 10 秒                      │
└─────────────────────────────────────┘
```

**模型未安装**:
```
┌─────────────────────────────────────┐
│  ⚠️ 翻译模型未安装                   │
│                                     │
│  需要下载 600MB 模型才能使用翻译功能 │
│                                     │
│  [立即下载]  [稍后提醒]              │
└─────────────────────────────────────┘
```

---

## 七、存储管理

### 7.1 模型缓存位置

Transformers.js 自动缓存模型到:
```
Chrome 插件缓存目录:
  ~/.cache/transformers-cache/  (Linux/Mac)
  C:\Users\<用户名>\.cache\transformers-cache\  (Windows)
```

### 7.2 缓存清理策略

```javascript
// 提供手动清理接口
async function clearModelCache() {
  // Transformers.js 没有直接清理 API,
  // 需要通过 Chrome Storage API 清理元数据
  await chrome.storage.local.remove(['modelMetadata', 'translationCache']);

  // 提示用户需要重新加载模型
  return {
    success: true,
    message: '缓存已清除,下次使用时将重新下载模型'
  };
}
```

---

## 八、技术实现总结

### 8.1 最终推荐方案

✅ **使用单模型策略: `Xenova/nllb-200-distilled-600M`**

**优势**:
1. 一个模型支持 200 种语言互译
2. 无需复杂的模型下载管理逻辑
3. 用户体验简单:安装即用
4. 总体积更小(600MB vs 多个 300MB 模型)

**实现要点**:
```javascript
// 支持的语言列表(从 200 种中精选常用的 14 种)
const FEATURED_LANGUAGES = [
  'zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'th',
  'ru', 'ar', 'pt', 'it', 'vi', 'id'
];

// 翻译调用示例
const result = await translationPipeline(text, {
  src_lang: 'zho_Hans',  // 中文
  tgt_lang: 'eng_Latn'   // 英文
});
```

### 8.2 扩展功能(近义词/例句)采用按需下载

```javascript
// 用户首次点击"近义词"按钮时
if (!synonymsPipeline) {
  // 显示下载提示
  const confirmed = await showDownloadDialog({
    feature: '近义词功能',
    modelSize: '65MB',
    estimatedTime: '30 秒'
  });

  if (confirmed) {
    synonymsPipeline = await pipeline('fill-mask', 'Xenova/distilbert-base-uncased');
    // 保存用户偏好
    await chrome.storage.local.set({ 'enabledFeatures.synonyms': true });
  }
}
```

### 8.3 性能监控

```javascript
// 记录模型加载和推理性能
async function translateWithMetrics(text, sourceLang, targetLang) {
  const startTime = performance.now();

  const result = await translationPipeline(text, {
    src_lang: SUPPORTED_LANGUAGES[sourceLang].code,
    tgt_lang: SUPPORTED_LANGUAGES[targetLang].code
  });

  const endTime = performance.now();
  const latency = endTime - startTime;

  console.log(`翻译耗时: ${latency.toFixed(2)}ms`);

  // 上报性能数据(可选)
  chrome.storage.local.get('performanceMetrics', (data) => {
    const metrics = data.performanceMetrics || [];
    metrics.push({ timestamp: Date.now(), latency, textLength: text.length });
    chrome.storage.local.set({ performanceMetrics: metrics.slice(-100) }); // 保留最近 100 条
  });

  return result[0].translation_text;
}
```

---

## 九、开发检查清单

- [ ] 实现语言检测算法(`detectLanguage()`)
- [ ] 实现模型加载管理(`ModelManager` 类)
- [ ] 实现翻译路由逻辑(支持 200 种语言)
- [ ] UI: 语言选择器下拉菜单
- [ ] UI: 模型下载进度显示
- [ ] UI: 模型管理界面
- [ ] 错误处理: 模型加载失败
- [ ] 错误处理: 不支持的语言对
- [ ] 性能监控: 记录加载和推理时间
- [ ] 用户设置: 保存首选语言
- [ ] 缓存管理: 翻译结果缓存
