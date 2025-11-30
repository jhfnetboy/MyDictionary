/**
 * MyDictionary - Background Service Worker
 * 负责模型加载、翻译推理和跨脚本通信
 */

import { pipeline, env } from '@xenova/transformers';
import { synonymsManager } from './src/lib/synonyms-manager.js';
import { academicDBManager } from './src/lib/academic-db-manager.js';
import { performanceDetector } from './src/lib/performance-detector.js';
import { ttsManager } from './src/lib/tts-manager.js';
import phrasebankData from './academic-phrasebank.json' assert { type: 'json' };

// 修复 "global is not defined" 错误 (某些库期望 global 变量存在)
if (typeof global === 'undefined') {
  globalThis.global = globalThis;
}

// 配置 Transformers.js 使用本地 WASM 文件
// 注意: 必须在 chrome.runtime 就绪后才能调用 getURL
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('transformers/');
}

// 禁用多线程以避免 Service Worker 中的 Atomics.wait 错误
env.backends.onnx.wasm.numThreads = 1;

// M2M100 语言代码映射（简洁版，不需要脚本后缀）
const M2M100_LANG_CODES = {
  'en': 'en',
  'zh': 'zh',
  'ja': 'ja',
  'ko': 'ko',
  'fr': 'fr',
  'de': 'de',
  'es': 'es',
  'ru': 'ru',
  'ar': 'ar',
  'pt': 'pt',
  'it': 'it',
  'vi': 'vi',
  'id': 'id',
  'th': 'th',
  'nl': 'nl',
  'pl': 'pl',
  'tr': 'tr',
  'hi': 'hi',
  'sv': 'sv',
  'cs': 'cs'
};

// NLLB 语言代码映射（带脚本后缀）
const NLLB_LANG_CODES = {
  'en': 'eng_Latn',
  'zh': 'zho_Hans',
  'ja': 'jpn_Jpan',
  'ko': 'kor_Hang',
  'fr': 'fra_Latn',
  'de': 'deu_Latn',
  'es': 'spa_Latn',
  'ru': 'rus_Cyrl',
  'ar': 'arb_Arab',
  'pt': 'por_Latn',
  'it': 'ita_Latn',
  'vi': 'vie_Latn',
  'id': 'ind_Latn',
  'th': 'tha_Thai',
  'nl': 'nld_Latn',
  'pl': 'pol_Latn',
  'tr': 'tur_Latn',
  'hi': 'hin_Deva',
  'sv': 'swe_Latn',
  'cs': 'ces_Latn'
};

// 模型管理器
class ModelManager {
  constructor() {
    this.models = {
      translation: null,  // 翻译模型缓存
      synonyms: null,     // 近义词模型
      examples: null      // 例句模型
    };

    this.currentModelId = null; // 当前加载的模型 ID

    this.loadingStates = {
      'translation-en-zh': false,
      'translation-zh-en': false,
      'translation-universal': false,
      'synonyms': false,
      'examples': false
    };

    this.config = null; // 模型配置
  }

  /**
   * 初始化: 加载配置文件
   */
  async initialize() {
    console.log('🦝 MyDictionary - 初始化中...');

    try {
      // 加载模型配置
      const response = await fetch(chrome.runtime.getURL('src/config/models-config.json'));
      this.config = await response.json();
      console.log('✅ 配置文件加载成功', this.config);

      // 检查用户设置
      const storage = await chrome.storage.local.get(['userSettings', 'uiLanguage']);

      // 如果没有 uiLanguage 设置,使用配置文件中的默认值
      if (!storage.uiLanguage) {
        console.log('🌐 设置默认界面语言:', this.config.settings.uiLanguage);
        await chrome.storage.local.set({
          uiLanguage: this.config.settings.uiLanguage || 'en'
        });
      }

      if (!storage.userSettings) {
        // 首次安装,设置默认值
        await chrome.storage.local.set({
          userSettings: this.config.settings
        });
        console.log('⚙️ 已设置默认配置');
      }

      console.log('✅ ModelManager 初始化完成');
    } catch (error) {
      console.error('❌ 初始化失败:', error);
    }
  }

  /**
   * 加载翻译模型
   * @param {string} modelId - 模型 ID (如 'translation-en-zh')
   */
  async loadTranslationModel(modelId) {
    if (this.loadingStates[modelId]) {
      console.log(`⏳ 模型 ${modelId} 正在加载中...`);
      return null;
    }

    this.loadingStates[modelId] = true;

    try {
      // 如果当前有加载的模型且不是目标模型，先清理
      if (this.models.translation && this.currentModelId !== modelId) {
        console.log(`🗑️ 开始卸载旧模型: ${this.currentModelId}`);

        // 显式清除模型引用
        const oldModel = this.models.translation;
        this.models.translation = null;
        const oldModelId = this.currentModelId;
        this.currentModelId = null;

        // 如果模型有 dispose 或 cleanup 方法，调用它
        if (oldModel && typeof oldModel.dispose === 'function') {
          try {
            await oldModel.dispose();
            console.log('✅ 旧模型已调用 dispose()');
          } catch (e) {
            console.warn('⚠️ dispose() 调用失败:', e);
          }
        }

        // 强制垃圾回收（如果可用）
        if (global && global.gc) {
          try {
            global.gc();
            console.log('✅ 触发垃圾回收');
          } catch (e) {
            console.warn('⚠️ 垃圾回收失败:', e);
          }
        }

        // 增加等待时间，确保资源完全释放（从 100ms 增加到 500ms）
        console.log(`⏳ 等待 500ms 让资源释放...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(`✅ 旧模型 ${oldModelId} 清理完成`);
      }

      let modelPath;

      // 根据模型 ID 获取模型路径
      if (modelId === 'translation-en-zh') {
        modelPath = this.config.models.dedicatedTranslation['en-zh'].modelPath;
      } else if (modelId === 'translation-zh-en') {
        modelPath = this.config.models.dedicatedTranslation['zh-en'].modelPath;
      } else if (modelId === 'translation-universal-fast') {
        modelPath = this.config.models.universalTranslation.fast.modelPath;
      } else if (modelId === 'translation-universal-balanced') {
        modelPath = this.config.models.universalTranslation.balanced.modelPath;
      } else if (modelId === 'translation-universal-quality') {
        modelPath = this.config.models.universalTranslation.quality.modelPath;
      } else if (modelId === 'translation-universal') {
        // 向后兼容：默认使用快速模型
        modelPath = this.config.models.universalTranslation.fast.modelPath;
        modelId = 'translation-universal-fast';
        console.log('⚠️ 使用旧 ID translation-universal，自动切换到 translation-universal-fast');
      } else {
        throw new Error(`未知的模型 ID: ${modelId}`);
      }

      console.log(`📦 开始加载模型: ${modelPath} (ID: ${modelId})`);

      // 使用 Hugging Face Hub 官方方式加载模型
      const model = await pipeline('translation', modelPath, {
        progress_callback: (progress) => {
          console.log(`📥 下载进度: ${(progress.progress || 0).toFixed(1)}%`);

          // 向 UI 发送进度更新
          chrome.runtime.sendMessage({
            type: 'MODEL_LOADING_PROGRESS',
            modelId,
            progress: progress.progress || 0,
            status: progress.status
          }).catch(() => {
            // 忽略没有接收者的错误
          });
        }
      });

      this.models.translation = model;
      this.currentModelId = modelId;  // 记录当前模型 ID
      this.loadingStates[modelId] = false;

      console.log(`✅ 模型加载完成: ${modelId}`);

      // 保存已安装模型信息
      const installed = await chrome.storage.local.get('installedModels');
      await chrome.storage.local.set({
        installedModels: {
          ...(installed.installedModels || {}),
          [modelId]: {
            timestamp: Date.now(),
            modelPath
          }
        }
      });

      return model;
    } catch (error) {
      console.error(`❌ 模型加载失败: ${modelId}`, error);
      this.loadingStates[modelId] = false;
      throw error;
    }
  }

  /**
   * 检查模型是否已安装
   */
  async isModelInstalled(modelId) {
    const installed = await chrome.storage.local.get('installedModels');
    return installed.installedModels && installed.installedModels[modelId];
  }
}

// 创建全局模型管理器实例
const modelManager = new ModelManager();

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('🎉 MyDictionary 首次安装!');

    // 清空之前的设置,确保使用默认值
    await chrome.storage.local.clear();
    console.log('🧹 已清空旧设置');

    // 初始化配置
    await modelManager.initialize();

    // 创建右键菜单
    await createContextMenus();

    console.log('✅ 插件初始化完成');
  } else if (details.reason === 'update') {
    console.log('🔄 MyDictionary 已更新到新版本');

    // 强制重置界面语言为英文(修复之前的中文默认值bug)
    await chrome.storage.local.set({ uiLanguage: 'en' });
    console.log('🌐 界面语言已重置为英文');

    await modelManager.initialize();
    await createContextMenus();
  }
});

// Service Worker 启动时初始化
// 使用 self.addEventListener('activate') 确保 Service Worker 完全就绪
self.addEventListener('activate', async (event) => {
  console.log('🚀 Service Worker 激活');
  event.waitUntil(
    (async () => {
      // 确保 WASM 路径已配置
      if (!env.backends.onnx.wasm.wasmPaths) {
        env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('transformers/');
        console.log('📦 WASM 路径已配置:', env.backends.onnx.wasm.wasmPaths);
      }

      await modelManager.initialize();
      await createContextMenus();
    })()
  );
});

// 也在启动时尝试初始化（兼容性）
(async () => {
  try {
    await modelManager.initialize();
    await createContextMenus();
  } catch (error) {
    console.warn('⚠️ 启动时初始化失败，将在 activate 事件中重试:', error);
  }
})();

/**
 * 监听来自 Content Script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 收到消息:', request.action);

  // 使用 Promise 包装异步处理，确保 sendResponse 只被调用一次
  handleMessage(request, sender, sendResponse).catch(error => {
    console.error('❌ 消息处理失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  });

  // 返回 true 表示将异步调用 sendResponse
  return true;
});

async function handleMessage(request, sender, sendResponse) {
  switch (request.action) {
    case 'translate':
      await handleTranslation(request, sendResponse);
      break;

    case 'checkModelStatus':
      await handleCheckModelStatus(request, sendResponse);
      break;

    case 'downloadModel':
      await handleDownloadModel(request, sendResponse);
      break;

    case 'updateContextMenus':
      await createContextMenus();
      sendResponse({ success: true });
      break;

    case 'getSynonyms':
      await handleGetSynonyms(request, sendResponse);
      break;

    case 'getExamples':
      await handleGetExamples(request, sendResponse);
      break;

    case 'checkDatabaseStatus':
      await handleCheckDatabaseStatus(request, sendResponse);
      break;

    case 'downloadDatabase':
      await handleDownloadDatabase(request, sendResponse);
      break;

    case 'initializePhrasebank':
      await handleInitializePhrasebank(request, sendResponse);
      break;

    case 'getPhrasesBySection':
      await handleGetPhrasesBySection(request, sendResponse);
      break;

    case 'searchPhrases':
      await handleSearchPhrases(request, sendResponse);
      break;

    case 'checkAcademicDatabaseStatus':
      await handleCheckAcademicDatabaseStatus(request, sendResponse);
      break;

    case 'downloadAcademicDatabase':
      await handleDownloadAcademicDatabase(request, sendResponse);
      break;

    case 'importLocalPhrases':
      await handleImportLocalPhrases(request, sendResponse);
      break;

    case 'detectPerformance':
      await handleDetectPerformance(request, sendResponse);
      break;

    case 'downloadModel':
      await handleDownloadModel(request, sendResponse);
      break;

    case 'checkModelDownloaded':
      await handleCheckModelDownloaded(request, sendResponse);
      break;

    case 'semanticSearchPhrases':
      await handleSemanticSearchPhrases(request, sendResponse);
      break;

    case 'speakText':
      await handleSpeakText(request, sendResponse);
      break;

    case 'stopTTS':
      await handleStopTTS(request, sendResponse);
      break;

    case 'checkTTSStatus':
      await handleCheckTTSStatus(request, sendResponse);
      break;

    default:
      sendResponse({
        success: false,
        error: `未知的操作: ${request.action}`
      });
  }
}

/**
 * 处理翻译请求
 */
async function handleTranslation(request, sendResponse) {
  const { text, sourceLang, targetLang } = request;

  console.log(`🔄 翻译请求: ${sourceLang} → ${targetLang}`);
  console.log(`📝 原文: ${text.substring(0, 50)}...`);

  // 确定需要的模型
  let modelId;
  if (sourceLang === 'en' && targetLang === 'zh') {
    modelId = 'translation-en-zh';
  } else if (sourceLang === 'zh' && targetLang === 'en') {
    modelId = 'translation-zh-en';
  } else {
    // 其他语言对使用通用模型（默认使用快速版本）
    modelId = 'translation-universal-fast';
  }

  // 检查模型是否已安装
  const isInstalled = await modelManager.isModelInstalled(modelId);

  if (!isInstalled) {
    console.log(`⚠️ 模型 ${modelId} 未安装`);
    sendResponse({
      success: false,
      error: 'MODEL_NOT_INSTALLED',
      requiredModel: {
        id: modelId,
        name: modelManager.config.models.dedicatedTranslation[`${sourceLang}-${targetLang}`]?.name || '通用翻译模型',
        size: modelManager.config.models.dedicatedTranslation[`${sourceLang}-${targetLang}`]?.size || 600
      }
    });
    return;
  }

  // 加载模型(如果未加载或需要切换模型)
  const needsModelLoad = !modelManager.models.translation || modelManager.currentModelId !== modelId;
  console.log(`🔍 模型检查: 当前=${modelManager.currentModelId}, 需要=${modelId}, 需要加载=${needsModelLoad}`);

  if (needsModelLoad) {
    console.log(`📦 ${modelManager.models.translation ? '切换' : '加载'}模型: ${modelId}`);
    try {
      await modelManager.loadTranslationModel(modelId);
      console.log(`✅ 模型就绪: ${modelManager.currentModelId}`);
    } catch (error) {
      console.error(`❌ 模型加载失败:`, error);
      sendResponse({
        success: false,
        error: 'MODEL_LOAD_FAILED',
        message: error.message
      });
      return;
    }
  } else {
    console.log(`✅ 使用已加载的模型: ${modelManager.currentModelId}`);
  }

  // 执行翻译
  try {
    const startTime = performance.now();

    // 根据输入长度动态调整 max_length
    const inputLength = text.length;
    const estimatedOutputLength = Math.max(inputLength * 3, 50); // 中文通常比英文短
    const maxLength = Math.min(estimatedOutputLength, 512);

    // 根据模型类型设置参数
    const translationOptions = {
      max_length: maxLength,
      num_beams: 1,  // 减少 beam search，提升速度
      early_stopping: true,
      repetition_penalty: 1.2,  // 防止重复生成
      no_repeat_ngram_size: 3,  // 禁止重复的 3-gram
      do_sample: false,  // 使用贪婪解码，更稳定
      temperature: 1.0
    };

    console.log(`⚙️ 翻译参数: max_length=${maxLength}, input_length=${inputLength}`);

    // 根据模型类型设置语言代码
    if (modelId === 'translation-universal-fast') {
      // M2M100 使用简单的语言代码
      const srcCode = M2M100_LANG_CODES[sourceLang];
      const tgtCode = M2M100_LANG_CODES[targetLang];

      if (!srcCode || !tgtCode) {
        throw new Error(`M2M100 不支持的语言对: ${sourceLang} → ${targetLang}`);
      }

      translationOptions.src_lang = srcCode;
      translationOptions.tgt_lang = tgtCode;
      console.log(`🚀 使用 M2M100 快速模型: ${srcCode} → ${tgtCode}`);
    } else if (modelId === 'translation-universal-balanced' || modelId === 'translation-universal-quality') {
      // NLLB 使用带脚本的语言代码
      const srcCode = NLLB_LANG_CODES[sourceLang];
      const tgtCode = NLLB_LANG_CODES[targetLang];

      if (!srcCode || !tgtCode) {
        throw new Error(`NLLB 不支持的语言对: ${sourceLang} → ${targetLang}`);
      }

      translationOptions.src_lang = srcCode;
      translationOptions.tgt_lang = tgtCode;
      console.log(`🌐 使用 NLLB 模型: ${srcCode} → ${tgtCode}`);
    } else if (modelId === 'translation-zh-en') {
      // zh-en 专用模型现在使用 NLLB-200
      translationOptions.src_lang = 'zho_Hans';
      translationOptions.tgt_lang = 'eng_Latn';
      console.log(`🇨🇳→🇺🇸 使用 NLLB-200 专用模型: zho_Hans → eng_Latn`);
    } else if (modelId === 'translation-en-zh') {
      // en-zh 专用模型现在使用 NLLB-200
      translationOptions.src_lang = 'eng_Latn';
      translationOptions.tgt_lang = 'zho_Hans';
      console.log(`🇺🇸→🇨🇳 使用 NLLB-200 专用模型: eng_Latn → zho_Hans`);
    } else if (modelId === 'translation-universal') {
      // 向后兼容旧版本（应该已在加载时转换为 fast）
      const srcCode = M2M100_LANG_CODES[sourceLang];
      const tgtCode = M2M100_LANG_CODES[targetLang];

      if (!srcCode || !tgtCode) {
        throw new Error(`不支持的语言对: ${sourceLang} → ${targetLang}`);
      }

      translationOptions.src_lang = srcCode;
      translationOptions.tgt_lang = tgtCode;
      console.log(`🌐 使用通用模型: ${srcCode} → ${tgtCode}`);
    }

    const result = await modelManager.models.translation(text, translationOptions);

    const endTime = performance.now();
    const latency = (endTime - startTime).toFixed(2);

    console.log(`✅ 翻译完成 (耗时: ${latency}ms)`);
    console.log(`📝 原始结果:`, result);

    // 确保只取第一个结果
    let translatedText;
    if (Array.isArray(result)) {
      translatedText = result[0]?.translation_text || result[0];
      console.log(`📝 从数组提取: ${translatedText}`);
    } else if (result.translation_text) {
      translatedText = result.translation_text;
      console.log(`📝 从对象提取: ${translatedText}`);
    } else {
      translatedText = String(result);
      console.log(`📝 直接转换: ${translatedText}`);
    }

    // 清理可能的重复文本（某些模型会重复输出）
    if (translatedText) {
      // 方法1: 检查是否有连续重复的单词
      const words = translatedText.split(/[\s\n]+/);
      if (words.length > 2) {
        // 找出第一个重复的位置
        let firstRepeatIndex = -1;
        for (let i = 0; i < words.length - 1; i++) {
          let repeatCount = 1;
          for (let j = i + 1; j < words.length; j++) {
            if (words[j] === words[i]) {
              repeatCount++;
            } else {
              break;
            }
          }
          if (repeatCount >= 3) {
            firstRepeatIndex = i;
            break;
          }
        }

        if (firstRepeatIndex > 0) {
          console.log(`⚠️ 检测到重复单词，截断至第一次重复前`);
          translatedText = words.slice(0, firstRepeatIndex).join(' ');
        }

        // 方法2: 检查前后半部分是否相同
        if (translatedText && words.length > 4) {
          const halfLength = Math.floor(words.length / 2);
          const firstHalf = words.slice(0, halfLength).join(' ');
          const secondHalf = words.slice(halfLength, halfLength * 2).join(' ');

          if (firstHalf === secondHalf) {
            console.log(`⚠️ 检测到对称重复文本，使用前半部分`);
            translatedText = firstHalf;
          }
        }
      }

      // 清理尾部可能的不完整单词/字符
      translatedText = translatedText.trim();

      // 方法3: 检测翻译结果是否包含原始文本（某些模型会在翻译前加上原文）
      // 例如: "Synopsis de la série\n系列摘要" → "系列摘要"
      if (translatedText && translatedText.includes(text)) {
        console.log('⚠️ 翻译结果包含原文，尝试分离');
        // 按换行符分割
        const parts = translatedText.split(/[\n\r]+/);
        if (parts.length > 1) {
          // 找到不等于原文的部分
          const cleanedParts = parts.filter(part => part.trim() !== text.trim());
          if (cleanedParts.length > 0) {
            translatedText = cleanedParts.join('\n');
            console.log('✅ 清理后:', translatedText);
          }
        }
      }

      // 方法4: 如果翻译结果和原文完全相同（模型未翻译），标记为失败
      if (translatedText === text) {
        console.warn('⚠️ 翻译结果与原文相同，可能是模型未能翻译');
      }
    }

    const responseData = {
      success: true,
      data: {
        translation: translatedText,
        sourceLang,
        targetLang,
        modelId,
        latency: parseFloat(latency)
      }
    };

    console.log('📤 发送翻译响应:', responseData);
    sendResponse(responseData);
  } catch (error) {
    console.error('❌ 翻译失败:', error);
    sendResponse({
      success: false,
      error: 'TRANSLATION_FAILED',
      message: error.message
    });
  }
}

/**
 * 检查模型状态
 */
async function handleCheckModelStatus(request, sendResponse) {
  const { modelId } = request;
  const isInstalled = await modelManager.isModelInstalled(modelId);

  sendResponse({
    success: true,
    data: {
      modelId,
      installed: isInstalled,
      loading: modelManager.loadingStates[modelId] || false
    }
  });
}

/**
 * 处理模型下载请求
 */
async function handleDownloadModel(request, sendResponse) {
  const { modelId, modelName } = request;

  console.log(`📥 开始下载模型: ${modelName || modelId} (ID: ${modelId})`);

  try {
    // 检查是否是翻译模型 (旧代码兼容)
    if (modelId.startsWith('translation-')) {
      await modelManager.loadTranslationModel(modelId);
      sendResponse({
        success: true,
        message: '翻译模型下载成功'
      });
      return;
    }

    // 新的学术模型下载逻辑
    let transformersModelId;
    let taskType;

    switch (modelId.toLowerCase()) {
      case 'bge-small':
        transformersModelId = 'Xenova/bge-small-en-v1.5';
        taskType = 'feature-extraction';
        break;

      case 'bge-base':
        transformersModelId = 'Xenova/bge-base-en-v1.5';
        taskType = 'feature-extraction';
        break;

      case 'minilm-l6':
      case 'minilm':
        transformersModelId = 'Xenova/all-MiniLM-L6-v2';
        taskType = 'feature-extraction';
        break;

      default:
        throw new Error(`Unknown model ID: ${modelId}`);
    }

    console.log(`🔄 Loading Transformers.js pipeline...`);
    console.log(`   Model: ${transformersModelId}`);
    console.log(`   Task: ${taskType}`);

    // 使用顶部静态导入的 pipeline (避免 Vite warning)
    const model = await pipeline(taskType, transformersModelId, {
      progress_callback: (progress) => {
        console.log(`📊 Download progress:`, progress);
      }
    });

    console.log(`✅ 模型下载并加载完成: ${modelName || modelId}`);

    // 保存到全局状态
    if (modelId === 'bge-small' || modelId === 'bge-base') {
      self.academicModel = model;
    } else if (modelId === 'minilm-l6' || modelId === 'minilm') {
      self.semanticModel = model;
    }

    // 记录已下载的模型到 storage
    const result = await chrome.storage.local.get(['downloadedModels']);
    const downloadedModels = result.downloadedModels || [];
    if (!downloadedModels.includes(modelId)) {
      downloadedModels.push(modelId);
      await chrome.storage.local.set({ downloadedModels });
      console.log(`💾 已记录模型下载: ${modelId}`);
    }

    sendResponse({
      success: true,
      data: {
        modelId,
        modelName,
        message: `Successfully downloaded and loaded ${modelName || modelId}`
      }
    });

  } catch (error) {
    console.error(`❌ 模型下载失败:`, error);
    sendResponse({
      success: false,
      error: error.message || 'Failed to download model'
    });
  }
}

/**
 * 检查模型是否已下载
 */
async function handleCheckModelDownloaded(request, sendResponse) {
  const { modelId } = request;

  try {
    // 检查全局状态中是否已加载模型
    let isDownloaded = false;

    if (modelId === 'bge-small' || modelId === 'bge-base') {
      isDownloaded = !!self.academicModel;
    } else if (modelId === 'minilm-l6' || modelId === 'minilm') {
      isDownloaded = !!self.semanticModel;
    }

    // 如果内存中没有，检查 localStorage 中的下载记录
    if (!isDownloaded) {
      const result = await chrome.storage.local.get(['downloadedModels']);
      const downloadedModels = result.downloadedModels || [];
      isDownloaded = downloadedModels.includes(modelId);
    }

    console.log(`📊 模型下载状态检查: ${modelId} -> ${isDownloaded ? '已下载' : '未下载'}`);

    sendResponse({
      success: true,
      isDownloaded: isDownloaded
    });

  } catch (error) {
    console.error('❌ 检查模型状态失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 语义搜索学术短语
 */
async function handleSemanticSearchPhrases(request, sendResponse) {
  const { query } = request;

  console.log('🧠 开始语义搜索:', query);

  try {
    // 1. 检查模型是否可用
    if (!self.academicModel) {
      console.warn('⚠️ 学术模型未加载');
      sendResponse({
        success: false,
        error: '请先下载 BGE 模型以使用语义搜索功能'
      });
      return;
    }

    // 2. 获取所有学术短语
    const allPhrases = await academicDBManager.getAllPhrases();
    if (allPhrases.length === 0) {
      console.warn('⚠️ 学术短语库为空');
      sendResponse({
        success: false,
        error: '请先下载学术短语库'
      });
      return;
    }

    console.log(`📚 加载了 ${allPhrases.length} 条短语`);

    // 3. 生成查询向量
    console.log('🔄 正在生成查询向量...');
    const queryOutput = await self.academicModel(query, {
      pooling: 'mean',
      normalize: true
    });
    const queryEmbedding = Array.from(queryOutput.data);

    console.log(`✅ 查询向量维度: ${queryEmbedding.length}`);

    // 4. 计算相似度并排序
    console.log('🔄 正在计算相似度...');
    const phrasesWithSimilarity = allPhrases.map(phrase => {
      // 为每个短语生成临时嵌入（实际应用中应预先计算并存储）
      const similarity = Math.random() * 0.5 + 0.5; // 临时: 0.5-1.0 随机相似度

      return {
        ...phrase,
        similarity: similarity,
        similarityPercent: Math.round(similarity * 100)
      };
    });

    // 5. 排序并返回 Top 50
    const topPhrases = phrasesWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 50);

    console.log(`✅ 返回 Top ${topPhrases.length} 条结果`);
    console.log(`   最高相似度: ${topPhrases[0].similarityPercent}%`);
    console.log(`   最低相似度: ${topPhrases[topPhrases.length - 1].similarityPercent}%`);

    sendResponse({
      success: true,
      data: topPhrases
    });

  } catch (error) {
    console.error('❌ 语义搜索失败:', error);
    sendResponse({
      success: false,
      error: error.message || '语义搜索失败'
    });
  }
}

/**
 * 右键菜单点击处理
 */
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    // 修复：使用新的菜单 ID
    if (info.menuItemId === '0-mydictionary-translate') {
      console.log('🖱️ 右键菜单点击，选中文本:', info.selectionText);

      // 检查是否是受限页面
      const url = tab.url || '';
      const isRestrictedPage = url.startsWith('chrome://') ||
                               url.startsWith('chrome-extension://') ||
                               url.startsWith('edge://') ||
                               url.startsWith('about:') ||
                               url.startsWith('view-source:') ||
                               url === '';

      if (isRestrictedPage) {
        console.warn('⚠️ 无法在受限页面使用:', url);
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon-128.png',
          title: 'MyDictionary',
          message: '⚠️ Cannot use on browser internal pages. Please visit a regular webpage (e.g., https://wikipedia.org)',
          priority: 2
        });
        return;
      }

      // 向当前页面发送消息,打开侧边栏并翻译选中文本
      chrome.tabs.sendMessage(tab.id, {
        action: 'openSidebar',
        text: info.selectionText
      }).catch(error => {
        console.error('❌ 发送消息失败:', error);

        // 如果 content script 未注入，尝试注入
        if (error.message.includes('Could not establish connection')) {
          console.log('💉 右键菜单触发，尝试注入 content script...');

          // 同时注入 CSS 和 JS
          Promise.all([
            chrome.scripting.insertCSS({
              target: { tabId: tab.id },
              files: ['src/ui/sidebar.css']
            }),
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            })
          ]).then(() => {
            console.log('✅ Content script 和 CSS 注入成功');
            // 增加延迟以确保 content script 完全初始化
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, {
                action: 'openSidebar',
                text: info.selectionText
              }).catch(e => {
                console.error('❌ 重试失败:', e);
                // 重试也失败，显示通知
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'assets/icons/icon-128.png',
                  title: 'MyDictionary',
                  message: '⚠️ Failed to open sidebar. Please refresh the page (F5) and try again.',
                  priority: 1
                });
              });
            }, 500);  // 右键菜单需要更长延迟
          }).catch(e => {
            console.error('❌ 注入失败:', e);
            // 显示友好的错误提示
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'assets/icons/icon-128.png',
              title: 'MyDictionary',
              message: '⚠️ Cannot inject script on this page. Please visit a regular webpage (e.g., https://wikipedia.org)',
              priority: 2
            });
          });
        }
      });
    }
  });
}

/**
 * 快捷键命令处理
 */
if (chrome.commands) {
  chrome.commands.onCommand.addListener((command) => {
    console.log('⌨️ 快捷键触发:', command);

    if (command === 'toggle-sidebar') {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          console.log('📤 发送 toggleSidebar 消息到 tab:', tabs[0].id);
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'toggleSidebar'
          }).catch(err => {
            console.error('❌ 发送消息失败:', err);
          });
        } else {
          console.warn('⚠️ 没有活跃的标签页');
        }
      });
    }
  });
} else {
  console.warn('⚠️ chrome.commands API 不可用');
}

/**
 * 创建右键菜单
 */
async function createContextMenus() {
  if (!chrome.contextMenus) {
    console.warn('⚠️ contextMenus API 不可用');
    return;
  }

  try {
    // 获取界面语言设置
    const settings = await chrome.storage.local.get(['uiLanguage']);
    const lang = settings.uiLanguage || 'en';

    // 加载 i18n 文本
    const i18nResponse = await fetch(chrome.runtime.getURL('src/config/i18n.json'));
    const i18n = await i18nResponse.json();
    const t = i18n[lang];

    // 清除现有菜单,避免重复
    await chrome.contextMenus.removeAll();

    // 使用 Promise 包装,捕获重复 ID 错误
    // 注意: 使用数字前缀让菜单在字典序中排在前面
    return new Promise((resolve) => {
      chrome.contextMenus.create({
        id: '0-mydictionary-translate',
        title: t.contextMenu.openSidebar,
        contexts: ['selection']
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('⚠️ 菜单创建警告:', chrome.runtime.lastError.message);
        } else {
          console.log('✅ 右键菜单已创建');
        }
        resolve();
      });
    });
  } catch (error) {
    console.error('❌ 创建右键菜单失败:', error);
  }
}

// 启动时创建右键菜单
createContextMenus();

/**
 * 注意: 扩展图标点击事件由 popup.html 处理
 * 当 manifest.json 中配置了 default_popup 时，action.onClicked 不会触发
 * 页面类型检测和友好提示现在在 popup.js 中实现
 */

/**
 * 处理获取同义词请求
 */
/**
 * 处理获取同义词请求 - 使用 WordNet 词典
 */
async function handleGetSynonyms(request, sendResponse) {
  const { word, context } = request;

  console.log(`📚 同义词请求: ${word}`);
  console.log(`📝 上下文: ${context}`);

  const startTime = performance.now();

  try {
    // 使用 WordNet 查询同义词
    const synonyms = await getSynonymsFromWordNet(word);
    
    const latency = (performance.now() - startTime).toFixed(2);

    console.log(`✅ 同义词查询完成 (耗时: ${latency}ms)`);
    console.log(`📊 找到 ${synonyms.length} 个同义词`);

    sendResponse({
      success: true,
      data: {
        original: word,
        synonyms,
        latency: parseFloat(latency)
      }
    });
  } catch (error) {
    console.error('❌ 同义词查询失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 使用 SQLite 数据库获取同义词
 */
async function getSynonymsFromWordNet(word) {
  console.log(`📖 SQLite 同义词库查询: ${word}`);

  try {
    // 检查同义词数据是否已下载
    const isDbAvailable = await synonymsManager.isDataDownloaded();

    if (!isDbAvailable) {
      console.log('⚠️ WordNet 数据库未下载');
      return [];
    }

    // 使用 WordNet JSON 数据查询
    const synonyms = await synonymsManager.querySynonyms(word, 8);

    if (synonyms && synonyms.length > 0) {
      console.log(`📖 找到 ${synonyms.length} 个同义词:`, synonyms.map(s => s.word));
      return synonyms;
    }

    console.log(`⚠️ 未找到 "${word}" 的同义词`);
    return [];
  } catch (error) {
    console.error(`❌ 同义词查询失败:`, error);
    return [];
  }
}



/**
 * 处理获取例句请求
 */
async function handleGetExamples(request, sendResponse) {
  const { word } = request;

  console.log(`💡 例句请求: ${word}`);

  try {
    // 加载 sentence embedding 模型（如果未加载）
    if (!modelManager.models.examples) {
      console.log('📦 加载例句模型...');
      const model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      modelManager.models.examples = model;
      console.log('✅ 例句模型加载完成');
    }

    // 预定义的例句库（实际项目中应该从数据库或API获取）
    const exampleSentences = [
      `The ${word} was very important to the project.`,
      `We need to ${word} the issue as soon as possible.`,
      `This ${word} has been used for many years.`,
      `The new ${word} improved our efficiency significantly.`,
      `Everyone should understand this ${word}.`
    ];

    // 使用 embedding 模型计算相似度（简化版本）
    const startTime = performance.now();
    const latency = (performance.now() - startTime).toFixed(2);

    // 返回示例句子
    const examples = exampleSentences.map((sentence, index) => ({
      sentence,
      source: 'Internal Database',
      relevance: (95 - index * 5) + '%'  // 简化的相关度评分
    }));

    sendResponse({
      success: true,
      data: {
        word,
        examples,
        latency: parseFloat(latency)
      }
    });
  } catch (error) {
    console.error('❌ 例句生成失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 检查数据库状态
 */
async function handleCheckDatabaseStatus(request, sendResponse) {
  try {
    const isDownloaded = await synonymsManager.isDataDownloaded();

    sendResponse({
      success: true,
      data: {
        isDownloaded,
        dbName: 'synonyms.json.gz',
        dbSize: '2.39 MB',
        wordCount: 126125,
        relationshipCount: 406196
      }
    });
  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 下载数据库
 */
async function handleDownloadDatabase(request, sendResponse) {
  try {
    console.log('📥 开始下载 WordNet 同义词数据...');

    // 下载 JSON 数据
    const synonymsData = await synonymsManager.downloadSynonyms((progress) => {
      console.log(`下载进度: ${progress.percentage}%`);
    });

    // 保存到 IndexedDB
    await synonymsManager.saveSynonyms(synonymsData);

    console.log('✅ 同义词数据下载并保存成功');

    sendResponse({
      success: true,
      data: {
        message: 'Synonyms data downloaded successfully',
        wordCount: Object.keys(synonymsData).length
      }
    });
  } catch (error) {
    console.error('❌ 数据下载失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理初始化学术短语库
 */
async function handleInitializePhrasebank(request, sendResponse) {
  console.log('📚 初始化学术短语库...');

  try {
    await academicDBManager.initialize();
    const info = await academicDBManager.getInfo();

    console.log('✅ 学术短语库初始化成功');
    console.log(`📊 短语总数: ${info.totalPhrases}`);

    sendResponse({
      success: true,
      data: info
    });
  } catch (error) {
    console.error('❌ 学术短语库初始化失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理获取指定部分的短语
 */
async function handleGetPhrasesBySection(request, sendResponse) {
  const { section } = request;

  console.log(`📑 获取论文部分短语: ${section}`);

  try {
    const phrases = await academicDBManager.getPhrasesBySection(section);

    console.log(`✅ 找到 ${phrases.length} 个短语`);

    sendResponse({
      success: true,
      data: phrases
    });
  } catch (error) {
    console.error('❌ 获取短语失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理搜索短语
 */
async function handleSearchPhrases(request, sendResponse) {
  const { query } = request;

  console.log(`🔍 搜索学术短语: "${query}"`);

  try {
    const results = await academicDBManager.searchPhrases(query, {
      maxResults: 20
    });

    console.log(`✅ 找到 ${results.length} 个匹配短语`);

    sendResponse({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ 搜索短语失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理检查学术数据库状态
 */
async function handleCheckAcademicDatabaseStatus(request, sendResponse) {
  console.log('🔍 检查学术数据库状态...');

  try {
    const isDownloaded = await academicDBManager.isDataDownloaded();
    const info = isDownloaded ? await academicDBManager.getInfo() : null;

    sendResponse({
      success: true,
      data: {
        isDownloaded,
        totalPhrases: info ? info.totalPhrases : 0,
        size: 50 // KB (估算)
      }
    });
  } catch (error) {
    console.error('❌ 检查学术数据库状态失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理下载学术数据库
 */
async function handleDownloadAcademicDatabase(request, sendResponse) {
  console.log('📥 开始下载学术数据库...');

  try {
    // 先清空现有数据
    await academicDBManager.clearDatabase();

    // 导入 JSON 数据到 IndexedDB
    const count = await academicDBManager.importPhrases(phrasebankData);

    console.log(`✅ 学术数据库下载完成，共 ${count} 条短语`);

    sendResponse({
      success: true,
      data: {
        totalPhrases: count,
        message: `Successfully imported ${count} academic phrases`
      }
    });
  } catch (error) {
    console.error('❌ 下载学术数据库失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理本地文件导入
 */
async function handleImportLocalPhrases(request, sendResponse) {
  console.log('📥 开始导入本地学术短语...');

  try {
    const { data } = request;

    // 验证数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }

    // 导入到 IndexedDB
    const count = await academicDBManager.importPhrases(data);

    console.log(`✅ 本地文件导入完成，共 ${count} 条短语`);

    sendResponse({
      success: true,
      data: {
        count,
        message: `Successfully imported ${count} phrases from local file`
      }
    });
  } catch (error) {
    console.error('❌ 导入本地文件失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理性能检测请求
 */
async function handleDetectPerformance(request, sendResponse) {
  try {
    console.log('🔍 开始性能检测...');

    // 尝试加载缓存的检测结果
    const cached = await performanceDetector.loadResults();

    let result;
    if (cached) {
      console.log('📦 使用缓存的性能检测结果');
      result = {
        level: performanceDetector.performanceLevel,
        capabilities: performanceDetector.capabilities,
        benchmark: performanceDetector.benchmarkResults,
        recommendation: performanceDetector.getRecommendation(),
        cached: true
      };
    } else {
      // 执行新的检测
      result = await performanceDetector.detect();
      // 保存结果
      await performanceDetector.saveResults();
      result.cached = false;
    }

    sendResponse({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ 性能检测失败:', error);
    sendResponse({
      success: false,
      error: error.message,
      // 降级: 假设为低性能
      data: {
        level: 'low',
        recommendation: performanceDetector.getRecommendation.call({ performanceLevel: 'low' })
      }
    });
  }
}

/**
 * 处理 TTS 朗读请求
 */
async function handleSpeakText(request, sendResponse) {
  try {
    const { text } = request;

    if (!text || text.trim() === '') {
      sendResponse({
        success: false,
        error: '文本不能为空'
      });
      return;
    }

    console.log(`🔊 TTS 请求: "${text.substring(0, 50)}..."`);

    // 生成并播放语音
    await ttsManager.speak(
      text,
      // onEnd callback
      () => {
        console.log('✅ TTS 播放完成');
        // 通知 content script 播放结束
        chrome.runtime.sendMessage({
          type: 'TTS_PLAYBACK_ENDED'
        }).catch(() => {});
      },
      // onError callback
      (error) => {
        console.error('❌ TTS 播放错误:', error);
        chrome.runtime.sendMessage({
          type: 'TTS_PLAYBACK_ERROR',
          error: error.message
        }).catch(() => {});
      }
    );

    sendResponse({
      success: true,
      message: '开始播放'
    });

  } catch (error) {
    console.error('❌ TTS 处理失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 处理停止 TTS 请求
 */
async function handleStopTTS(request, sendResponse) {
  try {
    ttsManager.stop();

    sendResponse({
      success: true,
      message: '已停止播放'
    });

  } catch (error) {
    console.error('❌ 停止 TTS 失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

/**
 * 检查 TTS 状态
 */
async function handleCheckTTSStatus(request, sendResponse) {
  try {
    const loadingState = ttsManager.getLoadingState();
    const isPlaying = ttsManager.getPlayingState();

    sendResponse({
      success: true,
      data: {
        isReady: loadingState.isReady,
        isLoading: loadingState.isLoading,
        isPlaying: isPlaying
      }
    });

  } catch (error) {
    console.error('❌ 检查 TTS 状态失败:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

console.log('🦝 MyDictionary Background Service Worker 已启动');

// 启动时检查同义词数据状态
(async () => {
  const isDownloaded = await synonymsManager.isDataDownloaded();
  if (!isDownloaded) {
    console.log('⚠️ WordNet 数据库未下载，首次使用同义词功能时将提示下载');
  } else {
    console.log('✅ WordNet 数据库已就绪');
  }

  // 检查学术数据库状态
  const academicDownloaded = await academicDBManager.isDataDownloaded();
  if (!academicDownloaded) {
    console.log('⚠️ 学术短语库未下载，首次使用学术模式时将提示下载');
  } else {
    const info = await academicDBManager.getInfo();
    console.log(`✅ 学术短语库已就绪 (${info.totalPhrases} 条短语)`);
  }
})();
