/**
 * MyDictionary - Background Service Worker
 * 负责模型加载、翻译推理和跨脚本通信
 */

import { pipeline } from '@xenova/transformers';

// 模型管理器
class ModelManager {
  constructor() {
    this.models = {
      translation: null,  // 翻译模型缓存
      synonyms: null,     // 近义词模型
      examples: null      // 例句模型
    };

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
    console.log('🦊 MyDictionary - 初始化中...');

    try {
      // 加载模型配置
      const response = await fetch(chrome.runtime.getURL('src/config/models-config.json'));
      this.config = await response.json();
      console.log('✅ 配置文件加载成功', this.config);

      // 检查用户设置
      const settings = await chrome.storage.local.get('userSettings');
      if (!settings.userSettings) {
        // 首次安装,设置默认值
        await chrome.storage.local.set({
          userSettings: this.config.settings
        });
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
      let modelPath;

      // 根据模型 ID 获取模型路径
      if (modelId === 'translation-en-zh') {
        modelPath = this.config.models.dedicatedTranslation['en-zh'].modelPath;
      } else if (modelId === 'translation-zh-en') {
        modelPath = this.config.models.dedicatedTranslation['zh-en'].modelPath;
      } else if (modelId === 'translation-universal') {
        modelPath = this.config.models.universalTranslation.modelPath;
      } else {
        throw new Error(`未知的模型 ID: ${modelId}`);
      }

      console.log(`📦 开始加载模型: ${modelPath}`);

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

    // 初始化配置
    await modelManager.initialize();

    // 创建右键菜单
    chrome.contextMenus.create({
      id: 'mydictionary-translate',
      title: '🦊 翻译 "%s"',
      contexts: ['selection']
    });

    console.log('✅ 插件初始化完成');
  } else if (details.reason === 'update') {
    console.log('🔄 MyDictionary 已更新到新版本');
    await modelManager.initialize();
  }
});

// Service Worker 启动时初始化
modelManager.initialize();

/**
 * 监听来自 Content Script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 必须返回 true 以支持异步 sendResponse
  handleMessage(request, sender, sendResponse);
  return true;
});

async function handleMessage(request, sender, sendResponse) {
  console.log('📨 收到消息:', request.action);

  try {
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

      default:
        sendResponse({
          success: false,
          error: `未知的操作: ${request.action}`
        });
    }
  } catch (error) {
    console.error('❌ 消息处理失败:', error);
    sendResponse({
      success: false,
      error: error.message
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
    // 其他语言对使用通用模型
    modelId = 'translation-universal';
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

  // 加载模型(如果未加载)
  if (!modelManager.models.translation) {
    console.log('📦 首次使用,加载模型...');
    try {
      await modelManager.loadTranslationModel(modelId);
    } catch (error) {
      sendResponse({
        success: false,
        error: 'MODEL_LOAD_FAILED',
        message: error.message
      });
      return;
    }
  }

  // 执行翻译
  try {
    const startTime = performance.now();

    const result = await modelManager.models.translation(text, {
      // 注意: Helsinki-NLP/opus-mt 模型不需要指定 src_lang/tgt_lang
      // 模型本身就是特定语言对的
      max_length: 512
    });

    const endTime = performance.now();
    const latency = (endTime - startTime).toFixed(2);

    console.log(`✅ 翻译完成 (耗时: ${latency}ms)`);
    console.log(`📝 译文: ${result[0].translation_text}`);

    sendResponse({
      success: true,
      data: {
        translation: result[0].translation_text,
        sourceLang,
        targetLang,
        modelId,
        latency: parseFloat(latency)
      }
    });
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
  const { modelId } = request;

  try {
    console.log(`📥 开始下载模型: ${modelId}`);
    await modelManager.loadTranslationModel(modelId);

    sendResponse({
      success: true,
      message: '模型下载成功'
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: 'DOWNLOAD_FAILED',
      message: error.message
    });
  }
}

/**
 * 右键菜单点击处理
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'mydictionary-translate') {
    // 向当前页面发送消息,打开侧边栏并翻译选中文本
    chrome.tabs.sendMessage(tab.id, {
      action: 'openSidebar',
      text: info.selectionText
    });
  }
});

/**
 * 快捷键命令处理
 */
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleSidebar'
        });
      }
    });
  }
});

console.log('🦊 MyDictionary Background Service Worker 已启动');
