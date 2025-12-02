/**
 * Model Manager - AI 模型管理页面
 */

// 语言状态
let currentLang = 'zh';

// i18n 翻译
const i18n = {
  en: {
    backText: 'Back to Settings',
    pageTitle: 'AI Model Manager',
    pageDesc: 'Manage AI models for translation and semantic search',
    translationModelName: 'English-Chinese Translation Model',
    translationModelDesc: 'Offline neural machine translation based on M2M100 (418M), supports high-quality EN-ZH translation',
    semanticModelName: 'Semantic Search Model',
    semanticModelDesc: 'Vector embedding model based on all-MiniLM-L6-v2, supports intelligent semantic search for academic phrases',
    bgeModelName: 'BGE Academic Semantic Search Model',
    bgeModelDesc: 'High-performance semantic embedding model based on BGE-Base, optimized for academic phrase intelligent search and matching',
    labelSize: 'Model Size',
    labelSize2: 'Model Size',
    labelQuality: 'Translation Quality',
    labelSpeed: 'Speed',
    labelSeconds: 'sec',
    labelAccuracy: 'Accuracy',
    labelUseCase: 'Use Case',
    labelAcademic: 'Academic Writing',
    btnDownloadTranslation: 'Download Model',
    btnDeleteTranslation: 'Delete Model',
    btnDownloadSemantic: 'Download Model',
    btnDeleteSemantic: 'Delete Model',
    statusInstalled: 'Installed',
    statusNotInstalled: 'Not Installed',
    statusChecking: 'Checking...',
    statusDownloading: 'Downloading...',
    infoTitle: '💡 About Model Downloads',
    info1: 'Models are downloaded to browser local cache and work completely offline',
    info2: 'First download may take a while, please keep network connected',
    info3: 'Once downloaded, enjoy fast and private AI translation and search',
    info4: 'Models can be deleted anytime to free up disk space',
    confirmDelete: 'Are you sure you want to delete this model?\\n\\nYou will need to download it again to use the feature.',
    downloadSuccess: '✅ Model downloaded successfully!',
    deleteSuccess: '✅ Model deleted successfully!',
    downloadFailed: '❌ Download failed:',
    deleteFailed: '❌ Delete failed:'
  },
  zh: {
    backText: '返回设置',
    pageTitle: 'AI 模型管理',
    pageDesc: '管理翻译和语义搜索所需的 AI 模型',
    translationModelName: '英译中翻译模型',
    translationModelDesc: '基于 M2M100 (418M) 的离线神经机器翻译模型,支持高质量英中互译',
    semanticModelName: '语义搜索模型',
    semanticModelDesc: '基于 all-MiniLM-L6-v2 的向量嵌入模型,支持学术短语的智能语义搜索',
    bgeModelName: 'BGE 学术语义搜索模型',
    bgeModelDesc: '基于 BGE-Base 的高性能语义嵌入模型,专门优化用于学术短语的智能搜索和匹配',
    labelSize: '模型大小',
    labelSize2: '模型大小',
    labelQuality: '翻译质量',
    labelSpeed: '处理速度',
    labelSeconds: '秒',
    labelAccuracy: '准确度',
    labelUseCase: '使用场景',
    labelAcademic: '学术写作',
    btnDownloadTranslation: '下载模型',
    btnDeleteTranslation: '删除模型',
    btnDownloadSemantic: '下载模型',
    btnDeleteSemantic: '删除模型',
    statusInstalled: '已安装',
    statusNotInstalled: '未安装',
    statusChecking: '检测中...',
    statusDownloading: '下载中...',
    infoTitle: '💡 关于模型下载',
    info1: '模型文件会下载到浏览器本地缓存,完全离线使用',
    info2: '首次下载需要较长时间,请保持网络连接',
    info3: '下载完成后即可享受快速、私密的 AI 翻译和搜索服务',
    info4: '模型可随时删除以释放磁盘空间',
    confirmDelete: '确定要删除此模型吗?\\n\\n删除后需要重新下载才能使用该功能。',
    downloadSuccess: '✅ 模型下载成功!',
    deleteSuccess: '✅ 模型删除成功!',
    downloadFailed: '❌ 下载失败:',
    deleteFailed: '❌ 删除失败:'
  }
};

// 获取翻译文本
function t(key) {
  return i18n[currentLang][key] || key;
}

// 更新 UI 文本
function updateUIText() {
  document.getElementById('back-text').textContent = t('backText');
  document.getElementById('page-title').textContent = t('pageTitle');
  document.getElementById('page-desc').textContent = t('pageDesc');
  document.getElementById('translation-model-name').textContent = t('translationModelName');
  document.getElementById('translation-model-desc').textContent = t('translationModelDesc');
  document.getElementById('semantic-model-name').textContent = t('semanticModelName');
  document.getElementById('semantic-model-desc').textContent = t('semanticModelDesc');
  document.getElementById('label-size').textContent = t('labelSize');
  document.getElementById('label-size2').textContent = t('labelSize2');
  document.getElementById('label-quality').textContent = t('labelQuality');
  document.getElementById('label-speed').textContent = t('labelSpeed');
  document.getElementById('label-seconds').textContent = t('labelSeconds');
  document.getElementById('label-accuracy').textContent = t('labelAccuracy');
  document.getElementById('label-use-case').textContent = t('labelUseCase');
  document.getElementById('label-academic').textContent = t('labelAcademic');
  document.getElementById('btn-download-translation').textContent = t('btnDownloadTranslation');
  document.getElementById('btn-delete-translation').textContent = t('btnDeleteTranslation');
  document.getElementById('btn-download-semantic').textContent = t('btnDownloadSemantic');
  document.getElementById('btn-delete-semantic').textContent = t('btnDeleteSemantic');
  document.getElementById('info-title').textContent = t('infoTitle');
  document.getElementById('info-1').textContent = t('info1');
  document.getElementById('info-2').textContent = t('info2');
  document.getElementById('info-3').textContent = t('info3');
  document.getElementById('info-4').textContent = t('info4');
}

// 检查模型状态
async function checkModelStatus() {
  try {
    // 检查翻译模型
    const translationStatus = await chrome.runtime.sendMessage({
      action: 'checkModelDownloaded',
      modelType: 'translation'
    });

    updateModelUI('translation', translationStatus.downloaded);

    // 检查语义搜索模型
    const semanticStatus = await chrome.runtime.sendMessage({
      action: 'checkModelDownloaded',
      modelType: 'semantic'
    });

    updateModelUI('semantic', semanticStatus.downloaded);

    // 检查 BGE 模型
    const bgeStatus = await chrome.runtime.sendMessage({
      action: 'checkModelDownloaded',
      modelId: 'bge-base'
    });

    updateModelUI('bge', bgeStatus.downloaded);

    // 检查 WordNet 同义词库
    const wordnetStatus = await chrome.runtime.sendMessage({
      action: 'checkSynonymsDownloaded'
    });

    updateModelUI('wordnet', wordnetStatus.downloaded || false);

  } catch (error) {
    console.error('检查模型状态失败:', error);
  }
}

// 更新模型 UI
function updateModelUI(modelType, isInstalled) {
  const statusElement = document.getElementById(`${modelType}-status`);
  const statusText = document.getElementById(`${modelType}-status-text`);
  const downloadBtn = document.getElementById(`download-${modelType}-btn`);
  const deleteBtn = document.getElementById(`delete-${modelType}-btn`);

  if (isInstalled) {
    // 已安装
    statusElement.className = 'model-status status-installed';
    statusText.textContent = t('statusInstalled');
    statusElement.querySelector('span:first-child').textContent = '✅';

    downloadBtn.style.display = 'none';
    deleteBtn.style.display = 'flex';
  } else {
    // 未安装
    statusElement.className = 'model-status status-not-installed';
    statusText.textContent = t('statusNotInstalled');
    statusElement.querySelector('span:first-child').textContent = '📦';

    downloadBtn.style.display = 'flex';
    downloadBtn.disabled = false;
    deleteBtn.style.display = 'none';
  }
}

// 下载模型
async function downloadModel(modelType) {
  const downloadBtn = document.getElementById(`download-${modelType}-btn`);
  const progressContainer = document.getElementById(`${modelType}-progress`);
  const progressBar = document.getElementById(`${modelType}-bar`);
  const progressText = document.getElementById(`${modelType}-text`);
  const statusElement = document.getElementById(`${modelType}-status`);
  const statusText = document.getElementById(`${modelType}-status-text`);

  // 禁用按钮
  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<div class="spinner"></div><span>' + t('statusDownloading') + '</span>';

  // 更新状态
  statusElement.className = 'model-status status-loading';
  statusText.textContent = t('statusDownloading');
  statusElement.querySelector('span:first-child').textContent = '⏳';

  // 显示进度条
  progressContainer.classList.add('active');
  progressBar.style.width = '0%';
  progressText.textContent = currentLang === 'zh' ? '准备下载...' : 'Preparing download...';

  try {
    // 发送下载请求
    const response = await chrome.runtime.sendMessage({
      action: 'downloadModel',
      modelType: modelType
    });

    if (response.success) {
      // 下载成功
      progressBar.style.width = '100%';
      progressText.textContent = t('downloadSuccess');

      // 2秒后刷新状态
      setTimeout(() => {
        progressContainer.classList.remove('active');
        checkModelStatus();
      }, 2000);
    } else {
      throw new Error(response.error || 'Download failed');
    }

  } catch (error) {
    console.error('下载模型失败:', error);
    progressText.textContent = t('downloadFailed') + ' ' + error.message;

    // 恢复按钮
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span>📥</span><span>' + t('btnDownload' + modelType.charAt(0).toUpperCase() + modelType.slice(1)) + '</span>';

    // 恢复状态
    updateModelUI(modelType, false);

    // 5秒后隐藏进度条
    setTimeout(() => {
      progressContainer.classList.remove('active');
    }, 5000);
  }
}

// 删除模型
async function deleteModel(modelType) {
  if (!confirm(t('confirmDelete'))) {
    return;
  }

  const deleteBtn = document.getElementById(`delete-${modelType}-btn`);
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<div class="spinner"></div><span>' + (currentLang === 'zh' ? '删除中...' : 'Deleting...') + '</span>';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteModel',
      modelType: modelType
    });

    if (response.success) {
      // 删除成功
      alert(t('deleteSuccess'));
      checkModelStatus();
    } else {
      throw new Error(response.error || 'Delete failed');
    }

  } catch (error) {
    console.error('删除模型失败:', error);
    alert(t('deleteFailed') + ' ' + error.message);

    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<span>🗑️</span><span>' + t('btnDelete' + modelType.charAt(0).toUpperCase() + modelType.slice(1)) + '</span>';
  }
}

// 监听下载进度
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'modelDownloadProgress') {
    const { modelType, status, progress, file } = request.data;

    const progressBar = document.getElementById(`${modelType}-bar`);
    const progressText = document.getElementById(`${modelType}-text`);

    if (progressBar && progressText) {
      if (status === 'downloading') {
        const percent = Math.round(progress * 100);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = currentLang === 'zh'
          ? `下载中... ${percent}% (${file || 'model'})`
          : `Downloading... ${percent}% (${file || 'model'})`;
      } else if (status === 'loading') {
        progressBar.style.width = '95%';
        progressText.textContent = currentLang === 'zh'
          ? '正在加载模型...'
          : 'Loading model...';
      }
    }

    sendResponse({ received: true });
  }
});

// 初始化
async function init() {
  // 加载语言偏好
  const langResult = await chrome.storage.local.get(['uiLanguage']);
  if (langResult.uiLanguage) {
    currentLang = langResult.uiLanguage;
  }

  updateUIText();
  await checkModelStatus();

  // 绑定下载按钮
  document.getElementById('download-translation-btn').addEventListener('click', () => {
    downloadModel('translation');
  });

  document.getElementById('download-semantic-btn').addEventListener('click', () => {
    downloadModel('semantic');
  });

  // 绑定删除按钮
  document.getElementById('delete-translation-btn').addEventListener('click', () => {
    deleteModel('translation');
  });

  document.getElementById('delete-semantic-btn').addEventListener('click', () => {
    deleteModel('semantic');
  });

  // 绑定 BGE 按钮
  document.getElementById('download-bge-btn').addEventListener('click', () => {
    // BGE 使用 modelId 而不是 modelType
    downloadModelById('bge-base', 'bge');
  });

  document.getElementById('delete-bge-btn').addEventListener('click', () => {
    deleteModelById('bge-base', 'bge');
  });

  // 绑定 WordNet 按钮
  document.getElementById('download-wordnet-btn').addEventListener('click', () => {
    downloadWordNet();
  });

  document.getElementById('delete-wordnet-btn').addEventListener('click', () => {
    deleteWordNet();
  });

  console.log('✅ Model Manager 初始化完成');
}

// 下载 WordNet 同义词库
async function downloadWordNet() {
  const downloadBtn = document.getElementById('download-wordnet-btn');
  const progressContainer = document.getElementById('wordnet-progress');
  const progressBar = document.getElementById('wordnet-bar');
  const progressText = document.getElementById('wordnet-text');
  const statusElement = document.getElementById('wordnet-status');
  const statusText = document.getElementById('wordnet-status-text');

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<div class="spinner"></div><span>' + t('statusDownloading') + '</span>';

  statusElement.className = 'model-status status-loading';
  statusText.textContent = t('statusDownloading');
  statusElement.querySelector('span:first-child').textContent = '⏳';

  progressContainer.classList.add('active');
  progressBar.style.width = '0%';
  progressText.textContent = currentLang === 'zh' ? '准备下载...' : 'Preparing download...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'downloadSynonyms'
    });

    if (response.success) {
      progressBar.style.width = '100%';
      progressText.textContent = t('downloadSuccess');

      setTimeout(() => {
        progressContainer.classList.remove('active');
        checkModelStatus();
      }, 2000);
    } else {
      throw new Error(response.error || 'Download failed');
    }

  } catch (error) {
    console.error('下载 WordNet 失败:', error);
    progressText.textContent = t('downloadFailed') + ' ' + error.message;

    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span>📥</span><span>' + t('btnDownloadWordnet') + '</span>';

    updateModelUI('wordnet', false);

    setTimeout(() => {
      progressContainer.classList.remove('active');
    }, 5000);
  }
}

// 删除 WordNet 同义词库
async function deleteWordNet() {
  if (!confirm(t('confirmDelete'))) {
    return;
  }

  const deleteBtn = document.getElementById('delete-wordnet-btn');
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<div class="spinner"></div><span>' + (currentLang === 'zh' ? '删除中...' : 'Deleting...') + '</span>';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteSynonyms'
    });

    if (response.success) {
      alert(t('deleteSuccess'));
      checkModelStatus();
    } else {
      throw new Error(response.error || 'Delete failed');
    }

  } catch (error) {
    console.error('删除 WordNet 失败:', error);
    alert(t('deleteFailed') + ' ' + error.message);

    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<span>🗑️</span><span>' + t('btnDeleteWordnet') + '</span>';
  }
}

// 通过 modelId 下载模型 (用于 BGE)
async function downloadModelById(modelId, uiPrefix) {
  const downloadBtn = document.getElementById(`download-${uiPrefix}-btn`);
  const progressContainer = document.getElementById(`${uiPrefix}-progress`);
  const progressBar = document.getElementById(`${uiPrefix}-bar`);
  const progressText = document.getElementById(`${uiPrefix}-text`);
  const statusElement = document.getElementById(`${uiPrefix}-status`);
  const statusText = document.getElementById(`${uiPrefix}-status-text`);

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<div class="spinner"></div><span>' + t('statusDownloading') + '</span>';

  statusElement.className = 'model-status status-loading';
  statusText.textContent = t('statusDownloading');
  statusElement.querySelector('span:first-child').textContent = '⏳';

  progressContainer.classList.add('active');
  progressBar.style.width = '0%';
  progressText.textContent = currentLang === 'zh' ? '准备下载...' : 'Preparing download...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'downloadModel',
      modelId: modelId
    });

    if (response.success) {
      progressBar.style.width = '100%';
      progressText.textContent = t('downloadSuccess');

      setTimeout(() => {
        progressContainer.classList.remove('active');
        checkModelStatus();
      }, 2000);
    } else {
      throw new Error(response.error || 'Download failed');
    }

  } catch (error) {
    console.error('下载模型失败:', error);
    progressText.textContent = t('downloadFailed') + ' ' + error.message;

    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span>📥</span><span>' + t('btnDownloadBge') + '</span>';

    updateModelUI(uiPrefix, false);

    setTimeout(() => {
      progressContainer.classList.remove('active');
    }, 5000);
  }
}

// 通过 modelId 删除模型 (用于 BGE)
async function deleteModelById(modelId, uiPrefix) {
  if (!confirm(t('confirmDelete'))) {
    return;
  }

  const deleteBtn = document.getElementById(`delete-${uiPrefix}-btn`);
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<div class="spinner"></div><span>' + (currentLang === 'zh' ? '删除中...' : 'Deleting...') + '</span>';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteModel',
      modelId: modelId
    });

    if (response.success) {
      alert(t('deleteSuccess'));
      checkModelStatus();
    } else {
      throw new Error(response.error || 'Delete failed');
    }

  } catch (error) {
    console.error('删除模型失败:', error);
    alert(t('deleteFailed') + ' ' + error.message);

    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<span>🗑️</span><span>' + t('btnDeleteBge') + '</span>';
  }
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
