/**
 * MyDictionary - Popup Script
 */

let currentLang = 'en';
let i18n = null;

// 加载 i18n 和界面语言
async function loadLanguage() {
  try {
    // 从 storage 获取用户设置的语言
    const settings = await chrome.storage.local.get(['uiLanguage']);
    currentLang = settings.uiLanguage || 'en';

    // 加载 i18n 配置文件
    const response = await fetch(chrome.runtime.getURL('src/config/i18n.json'));
    i18n = await response.json();

    updateUI();
  } catch (error) {
    console.error('❌ 语言配置加载失败:', error);
  }
}

// 获取翻译文本
function t(key) {
  if (!i18n) return key;

  const keys = key.split('.');
  let value = i18n[currentLang];

  for (const k of keys) {
    value = value?.[k];
    if (!value) return key;
  }

  return value;
}

// 更新 UI 文本
function updateUI() {
  document.getElementById('app-title').textContent = t('appName');
  document.getElementById('btn-open-sidebar').textContent = t('popup.openSidebar') || 'Open Sidebar';
  document.getElementById('btn-settings').textContent = t('popup.settings');
  document.getElementById('label-shortcut').textContent = t('popup.shortcut') || 'Shortcut:';
  document.getElementById('label-usage').textContent = t('popup.usage') || 'Usage:';
  document.getElementById('usage-1').textContent = t('popup.usage1') || '• Select text + shortcut';
  document.getElementById('usage-2').textContent = t('popup.usage2') || '• Right-click menu → Translate';
  document.getElementById('usage-3').textContent = t('popup.usage3') || '• Click toolbar icon';

  // 更新语言切换按钮
  document.getElementById('lang-switch-btn').textContent = currentLang === 'en' ? '中文' : 'English';
}

// 切换语言
async function switchLanguage() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';

  // 保存到 storage
  await chrome.storage.local.set({ uiLanguage: currentLang });

  // 更新 UI
  updateUI();

  // 通知 background 更新右键菜单
  chrome.runtime.sendMessage({ action: 'updateContextMenus' });

  console.log('🌐 Popup 语言已切换为:', currentLang);
}

// 语言切换按钮
document.getElementById('lang-switch-btn').addEventListener('click', switchLanguage);

/**
 * 检查当前页面类型
 */
async function checkCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      return { canUse: false, reason: 'no_tab', tab: null };
    }

    // 检查是否是受限页面
    const isRestrictedPage = tab.url && (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('chrome-extension://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:') ||
      tab.url.startsWith('view-source:') ||
      tab.url === ''
    );

    return {
      canUse: !isRestrictedPage,
      tab: tab,
      reason: isRestrictedPage ? 'restricted_page' : null
    };
  } catch (error) {
    console.error('❌ 检查页面失败:', error);
    return { canUse: false, reason: 'error', tab: null };
  }
}

/**
 * 页面加载时自动处理
 */
async function handlePageLoad() {
  const result = await checkCurrentPage();

  if (!result.canUse) {
    // 在受限页面，显示友好提示
    if (result.reason === 'restricted_page') {
      document.querySelector('.actions').style.display = 'none';

      const infoDiv = document.querySelector('.info');
      infoDiv.innerHTML = currentLang === 'zh'
        ? `
          <p style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 0; font-size: 13px; line-height: 1.5;">
            ⚠️ <strong>浏览器内部页面无法使用</strong><br>
            请访问普通网页 (如 wikipedia.org)
          </p>
        `
        : `
          <p style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 0; font-size: 13px; line-height: 1.5;">
            ⚠️ <strong>Cannot Use on Browser Pages</strong><br>
            Visit a regular webpage (e.g., wikipedia.org)
          </p>
        `;
    }
    return;
  }

  // 在普通页面，自动打开侧边栏并关闭 popup
  try {
    console.log('📤 Auto-opening sidebar for regular page:', result.tab.url);

    await chrome.tabs.sendMessage(result.tab.id, {
      action: 'toggleSidebar'
    });

    // 立即关闭 popup
    window.close();
  } catch (error) {
    console.error('❌ 自动打开侧边栏失败:', error);
    // 如果失败，保持 popup 打开，让用户看到按钮
  }
}

// 打开翻译面板按钮
document.getElementById('open-sidebar-btn').addEventListener('click', async () => {
  try {
    const result = await checkCurrentPage();

    if (!result.canUse) {
      const msg = currentLang === 'zh'
        ? '⚠️ 无法在浏览器内部页面使用 MyDictionary。\n请打开一个普通网页（如 https://wikipedia.org）。'
        : '⚠️ Cannot use MyDictionary on browser internal pages.\nPlease open a regular webpage (e.g., https://wikipedia.org).';
      alert(msg);
      return;
    }

    console.log('📤 Popup 发送 toggleSidebar 消息到 tab:', result.tab.id, result.tab.url);

    await chrome.tabs.sendMessage(result.tab.id, {
      action: 'toggleSidebar'
    });

    window.close();
  } catch (error) {
    console.error('❌ Popup 发送消息失败:', error);

    if (error.message.includes('Could not establish connection')) {
      const msg = currentLang === 'zh'
        ? '⚠️ 请先刷新页面！\n\nContent script 未加载。请尝试：\n1. 刷新网页 (F5)\n2. 或访问一个普通网页'
        : '⚠️ Please refresh the page first!\n\nContent script not loaded. Try:\n1. Refresh the webpage (F5)\n2. Or navigate to a regular webpage';
      alert(msg);
    }
  }
});

// TTS 设置管理
class TTSSettings {
  constructor() {
    this.serverUrl = 'http://localhost:5050';
    this.mode = 'auto'; // 'auto' | 'local-only' | 'browser-only'
    this.currentModel = null;
    this.init();
  }

  async init() {
    // 加载保存的设置
    const settings = await chrome.storage.local.get(['ttsServerUrl', 'ttsMode']);
    this.serverUrl = settings.ttsServerUrl || 'http://localhost:5050';
    this.mode = settings.ttsMode || 'auto';

    // 更新 UI
    document.getElementById('tts-server-url').value = this.serverUrl;
    document.getElementById('tts-mode-select').value = this.mode;

    // 绑定事件
    this.bindEvents();

    // 检查服务器状态
    this.checkServer();
  }

  bindEvents() {
    // 模式切换
    document.getElementById('tts-mode-select').addEventListener('change', async (e) => {
      this.mode = e.target.value;
      await chrome.storage.local.set({ ttsMode: this.mode });
      console.log('🔊 TTS 模式已切换:', this.mode);
    });

    // 服务器 URL 变化
    document.getElementById('tts-server-url').addEventListener('blur', async (e) => {
      this.serverUrl = e.target.value.trim() || 'http://localhost:5050';
      await chrome.storage.local.set({ ttsServerUrl: this.serverUrl });
      console.log('🔊 TTS 服务器 URL 已更新:', this.serverUrl);
      this.checkServer();
    });

    // 测试服务器
    document.getElementById('test-server-btn').addEventListener('click', () => {
      this.checkServer();
    });

    // 加载模型
    document.getElementById('load-model-btn').addEventListener('click', async () => {
      const modelKey = document.getElementById('tts-model-select').value;
      await this.loadModel(modelKey);
    });
  }

  async checkServer() {
    const statusDiv = document.getElementById('server-status');
    const statusText = document.getElementById('status-text');
    const modelGroup = document.getElementById('model-select-group');

    // 显示检查中状态
    statusDiv.className = 'server-status checking';
    statusText.textContent = 'Checking server...';

    try {
      const response = await fetch(`${this.serverUrl}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3秒超时
      });

      if (!response.ok) {
        throw new Error('Server returned ' + response.status);
      }

      const data = await response.json();

      // 服务器在线
      statusDiv.className = 'server-status online';
      statusText.textContent = `✅ Connected | Model: ${data.current_model || 'None'}`;

      this.currentModel = data.current_model;

      // 显示模型选择
      modelGroup.style.display = 'block';

      // 获取可用模型列表
      await this.fetchModels();

    } catch (error) {
      // 服务器离线
      statusDiv.className = 'server-status offline';
      statusText.textContent = '❌ Server offline';
      modelGroup.style.display = 'none';

      console.log('🔊 TTS 服务器离线:', error.message);
    }
  }

  async fetchModels() {
    try {
      const response = await fetch(`${this.serverUrl}/models`);
      const data = await response.json();

      if (data.success && data.models) {
        // 更新模型下拉列表
        const modelSelect = document.getElementById('tts-model-select');
        modelSelect.innerHTML = '';

        data.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id;
          option.textContent = `${model.name} (${model.language})`;
          if (model.current) {
            option.selected = true;
          }
          modelSelect.appendChild(option);
        });
      }
    } catch (error) {
      console.error('❌ 获取模型列表失败:', error);
    }
  }

  async loadModel(modelKey) {
    const loadBtn = document.getElementById('load-model-btn');
    const statusText = document.getElementById('status-text');

    try {
      loadBtn.textContent = 'Loading...';
      loadBtn.disabled = true;

      const response = await fetch(`${this.serverUrl}/models/${modelKey}/load`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        statusText.textContent = `✅ Model loaded: ${modelKey}`;
        this.currentModel = modelKey;
      } else {
        statusText.textContent = `❌ Load failed: ${data.error}`;
      }

    } catch (error) {
      statusText.textContent = `❌ Error: ${error.message}`;
    } finally {
      loadBtn.textContent = 'Load';
      loadBtn.disabled = false;
    }
  }
}

// 初始化 TTS 设置
let ttsSettings = null;

// 设置按钮
document.getElementById('settings-btn').addEventListener('click', () => {
  const msg = currentLang === 'zh' ? '设置功能即将推出!' : 'Settings feature coming soon!';
  alert(msg);
});

// 初始化
async function init() {
  await loadLanguage();
  ttsSettings = new TTSSettings(); // 初始化 TTS 设置
  await handlePageLoad();  // 加载完语言后检查页面
}

init();

console.log('🦝 MyDictionary Popup 已加载');
