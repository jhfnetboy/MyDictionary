/**
 * MyDictionary - Content Script
 * 负责网页交互和 UI 管理
 */

console.log('🦝 MyDictionary Content Script 已加载');

// UI 管理器
class UIManager {
  constructor() {
    this.sidebar = null;
    this.sidebarVisible = false;
    this.i18n = null;
    this.currentLang = 'en'; // 默认英文
    this.loadLanguage();
  }

  /**
   * 加载语言配置
   */
  async loadLanguage() {
    try {
      // 从 storage 获取用户设置的语言
      const settings = await chrome.storage.local.get(['uiLanguage']);
      console.log('📦 Storage 中的语言设置:', settings);

      this.currentLang = settings.uiLanguage || 'en';
      console.log('🌐 当前界面语言:', this.currentLang);

      // 加载 i18n 配置文件
      const response = await fetch(chrome.runtime.getURL('src/config/i18n.json'));
      this.i18n = await response.json();

      console.log('✅ 语言配置加载完成:', this.currentLang);
    } catch (error) {
      console.error('❌ 语言配置加载失败:', error);
      // 使用默认配置
      this.currentLang = 'en';
    }
  }

  /**
   * 获取翻译文本
   */
  t(key) {
    if (!this.i18n) {
      console.warn('⚠️ i18n 未加载, 返回 key:', key);
      return key;
    }

    const keys = key.split('.');
    let value = this.i18n[this.currentLang];

    for (const k of keys) {
      value = value?.[k];
      if (!value) {
        console.warn('⚠️ 找不到翻译 key:', key, 'lang:', this.currentLang);
        return key;
      }
    }

    return value;
  }

  /**
   * 切换语言
   */
  async switchLanguage() {
    this.currentLang = this.currentLang === 'en' ? 'zh' : 'en';

    // 保存到 storage
    await chrome.storage.local.set({ uiLanguage: this.currentLang });

    // 重新创建侧边栏
    if (this.sidebar) {
      const wasVisible = this.sidebarVisible;
      const inputText = this.sidebar.querySelector('#mydictionary-input')?.value || '';

      this.sidebar.remove();
      this.sidebar = null;
      this.sidebarVisible = false;

      if (wasVisible) {
        this.createSidebar();
        if (inputText) {
          this.sidebar.querySelector('#mydictionary-input').value = inputText;
        }
        this.showSidebar();
      }
    }

    // 通知 background 更新右键菜单
    chrome.runtime.sendMessage({ action: 'updateContextMenus' });

    console.log('🌐 语言已切换为:', this.currentLang);
  }

  /**
   * 创建侧边栏
   */
  createSidebar() {
    if (this.sidebar) return;

    console.log('🎨 开始创建侧边栏 HTML...');
    console.log('🌐 当前语言:', this.currentLang, 'i18n 已加载:', !!this.i18n);

    // 创建侧边栏容器
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'mydictionary-sidebar';
    this.sidebar.className = 'mydictionary-sidebar';

    // 添加 inline styles 确保显示正确
    this.sidebar.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      right: -420px !important;
      width: 400px !important;
      height: 100vh !important;
      background: #ffffff !important;
      box-shadow: -2px 0 16px rgba(0, 0, 0, 0.1) !important;
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif !important;
      display: flex !important;
      flex-direction: column !important;
    `;

    const buildTime = new Date().toISOString();
    const version = '0.1.0';

    // 使用默认文本（如果 i18n 未加载）
    const getText = (key, fallback) => {
      const text = this.t(key);
      return text === key ? fallback : text;
    };

    this.sidebar.innerHTML = `
      <div class="mydictionary-header">
        <div class="mydictionary-header-left">
          <img src="${chrome.runtime.getURL('assets/logo-64.png')}" alt="MyDictionary" class="mydictionary-logo" />
          <span class="mydictionary-title">${getText('sidebar.title', 'MyDictionary')}</span>
        </div>
        <div class="mydictionary-header-right">
          <button class="mydictionary-lang-switch" id="mydictionary-lang-switch-btn" title="Switch Language">
            ${getText('sidebar.languageSwitch', this.currentLang === 'en' ? '中文' : 'English')}
          </button>
          <button class="mydictionary-close" id="mydictionary-close-btn">✕</button>
        </div>
      </div>

      <div class="mydictionary-content">
        <div class="mydictionary-input-section">
          <label>${getText('sidebar.sourceLanguage', 'Source Language')}</label>
          <select id="mydictionary-source-lang">
            <option value="auto">🌐 ${getText('sidebar.autoDetect', 'Auto Detect')}</option>
            <option value="en">🇺🇸 ${getText('sidebar.english', 'English')}</option>
            <option value="zh">🇨🇳 ${getText('sidebar.chinese', 'Chinese')}</option>
          </select>

          <textarea
            id="mydictionary-input"
            placeholder="${getText('sidebar.inputPlaceholder', 'Enter text to translate...')}"
            rows="4"
          ></textarea>

          <button id="mydictionary-translate-btn" class="mydictionary-btn-primary">
            ${getText('sidebar.translateButton', 'Translate')}
          </button>
        </div>

        <div class="mydictionary-output-section">
          <label>${getText('sidebar.targetLanguage', 'Target Language')}</label>
          <select id="mydictionary-target-lang">
            <option value="zh">🇨🇳 ${getText('sidebar.chinese', 'Chinese')}</option>
            <option value="en">🇺🇸 ${getText('sidebar.english', 'English')}</option>
          </select>

          <div id="mydictionary-output" class="mydictionary-output">
            <div class="mydictionary-placeholder">${getText('sidebar.result', 'Translation Result')}...</div>
          </div>
        </div>

        <div id="mydictionary-status" class="mydictionary-status"></div>
      </div>

      <div class="mydictionary-footer">
        <div class="mydictionary-footer-info">
          <span class="mydictionary-version">v${version}</span>
          <span class="mydictionary-timestamp" title="${buildTime}">
            ${new Date().toLocaleString(this.currentLang === 'zh' ? 'zh-CN' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
        <button class="mydictionary-settings-btn" id="mydictionary-settings-btn" title="${getText('sidebar.settings', 'Settings')}">
          ⚙️ ${getText('sidebar.settings', 'Settings')}
        </button>
      </div>
    `;

    document.body.appendChild(this.sidebar);
    console.log('✅ 侧边栏已添加到 body, element:', this.sidebar);

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 关闭按钮
    const closeBtn = this.sidebar.querySelector('#mydictionary-close-btn');
    closeBtn.addEventListener('click', () => this.hideSidebar());

    // 语言切换按钮
    const langSwitchBtn = this.sidebar.querySelector('#mydictionary-lang-switch-btn');
    langSwitchBtn.addEventListener('click', () => this.switchLanguage());

    // 设置按钮
    const settingsBtn = this.sidebar.querySelector('#mydictionary-settings-btn');
    settingsBtn.addEventListener('click', () => this.showSettings());

    // 翻译按钮
    const translateBtn = this.sidebar.querySelector('#mydictionary-translate-btn');
    translateBtn.addEventListener('click', () => this.handleTranslate());

    // 回车快捷键
    const input = this.sidebar.querySelector('#mydictionary-input');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        this.handleTranslate();
      }
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (this.sidebarVisible && !this.sidebar.contains(e.target)) {
        // 暂时注释掉,避免误关闭
        // this.hideSidebar();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.sidebarVisible) {
        this.hideSidebar();
      }
    });
  }

  /**
   * 显示侧边栏
   */
  async showSidebar(text = '') {
    console.log('🎯 showSidebar 被调用, text:', text?.substring(0, 30));

    // 等待语言配置加载完成
    if (!this.i18n) {
      console.log('⏳ i18n 未加载,开始加载...');
      await this.loadLanguage();
    }

    console.log('✅ i18n 已就绪, currentLang:', this.currentLang);

    if (!this.sidebar) {
      console.log('📝 创建侧边栏...');
      this.createSidebar();
      console.log('✅ 侧边栏已创建, element:', this.sidebar);
    }

    // 确保侧边栏在 DOM 中
    if (!document.body.contains(this.sidebar)) {
      console.warn('⚠️ 侧边栏不在 DOM 中,重新添加');
      document.body.appendChild(this.sidebar);
    }

    // 填充文本(如果有)
    if (text) {
      const input = this.sidebar.querySelector('#mydictionary-input');
      if (input) {
        input.value = text;
        // 自动翻译
        setTimeout(() => this.handleTranslate(), 100);
      }
    }

    // 强制重排,然后通过修改 inline style 显示侧边栏
    console.log('🎬 准备显示侧边栏...');
    this.sidebar.offsetHeight; // 强制重排

    // 使用 inline style 直接修改 right 属性
    requestAnimationFrame(() => {
      this.sidebar.style.right = '0px';
      this.sidebar.classList.add('show');
      this.sidebarVisible = true;

      console.log('✨ 侧边栏应该可见了!');
      console.log('📍 当前状态:', {
        classList: Array.from(this.sidebar.classList),
        computedRight: window.getComputedStyle(this.sidebar).right,
        inlineRight: this.sidebar.style.right,
        position: window.getComputedStyle(this.sidebar).position,
        zIndex: window.getComputedStyle(this.sidebar).zIndex,
        display: window.getComputedStyle(this.sidebar).display,
        visibility: window.getComputedStyle(this.sidebar).visibility
      });
    });
  }

  /**
   * 隐藏侧边栏
   */
  hideSidebar() {
    if (!this.sidebar) return;

    this.sidebar.style.right = '-420px';
    this.sidebar.classList.remove('show');
    this.sidebarVisible = false;
    console.log('👋 侧边栏已隐藏');
  }

  /**
   * 切换侧边栏显示/隐藏
   */
  async toggleSidebar() {
    if (this.sidebarVisible) {
      this.hideSidebar();
    } else {
      await this.showSidebar();
    }
  }

  /**
   * 处理翻译请求
   */
  async handleTranslate() {
    const input = this.sidebar.querySelector('#mydictionary-input');
    const output = this.sidebar.querySelector('#mydictionary-output');
    const status = this.sidebar.querySelector('#mydictionary-status');
    const sourceLangSelect = this.sidebar.querySelector('#mydictionary-source-lang');
    const targetLangSelect = this.sidebar.querySelector('#mydictionary-target-lang');

    const text = input.value.trim();
    if (!text) {
      this.showStatus(this.t('messages.noTextSelected'), 'warning');
      return;
    }

    let sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // 自动检测语言
    if (sourceLang === 'auto') {
      sourceLang = this.detectLanguage(text);
      console.log('🔍 检测到语言:', sourceLang);
    }

    // 显示加载状态
    output.innerHTML = `<div class="mydictionary-loading">${this.t('sidebar.translating')}</div>`;
    this.showStatus(this.t('sidebar.translating'), 'info');

    try {
      // 发送翻译请求到 Background Script
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text,
        sourceLang,
        targetLang
      });

      if (response.success) {
        // 显示翻译结果
        output.innerHTML = `
          <div class="mydictionary-translation">${response.data.translation}</div>
          <div class="mydictionary-meta">
            <span>⏱️ ${response.data.latency}ms</span>
            <span>📦 ${response.data.modelId}</span>
          </div>
        `;
        this.showStatus(`✅ ${this.t('messages.downloadComplete')}`, 'success');
      } else if (response.error === 'MODEL_NOT_INSTALLED') {
        // 模型未安装,提示用户下载
        this.showModelNotInstalledDialog(response.requiredModel);
      } else {
        throw new Error(response.message || response.error);
      }
    } catch (error) {
      console.error('❌ 翻译失败:', error);
      output.innerHTML = `<div class="mydictionary-error">${this.t('messages.translationError')}</div>`;
      this.showStatus(`❌ ${error.message}`, 'error');
    }
  }

  /**
   * 检测文本语言
   */
  detectLanguage(text) {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
    const totalChars = text.length;

    if (chineseChars && chineseChars.length / totalChars > 0.3) {
      return 'zh';
    }
    return 'en';
  }

  /**
   * 显示状态消息
   */
  showStatus(message, type = 'info') {
    const status = this.sidebar.querySelector('#mydictionary-status');
    status.textContent = message;
    status.className = `mydictionary-status mydictionary-status-${type}`;

    // 3秒后自动清除
    setTimeout(() => {
      status.textContent = '';
      status.className = 'mydictionary-status';
    }, 3000);
  }

  /**
   * 显示设置面板
   */
  showSettings() {
    const output = this.sidebar.querySelector('#mydictionary-output');
    const shortcutKey = navigator.platform.includes('Mac') ? 'Cmd+Shift+D' : 'Ctrl+Shift+D';

    output.innerHTML = `
      <div class="mydictionary-settings-panel">
        <h3>⚙️ ${this.t('sidebar.settings')}</h3>

        <div class="mydictionary-settings-section">
          <h4>🌐 ${this.t('sidebar.interfaceLanguage') || 'Interface Language'}</h4>
          <p>${this.t('sidebar.currentLanguage') || 'Current'}: <strong>${this.currentLang === 'en' ? 'English' : '中文'}</strong></p>
          <p>${this.t('sidebar.clickHeaderToSwitch') || 'Click the language button in header to switch'}</p>
        </div>

        <div class="mydictionary-settings-section">
          <h4>⌨️ ${this.t('sidebar.shortcuts') || 'Keyboard Shortcuts'}</h4>
          <p><strong>${shortcutKey}</strong> - ${this.t('sidebar.toggleSidebar') || 'Toggle sidebar'}</p>
          <p><strong>Ctrl/Cmd+Enter</strong> - ${this.t('sidebar.translateShortcut') || 'Translate (in textarea)'}</p>
        </div>

        <div class="mydictionary-settings-section">
          <h4>📦 ${this.t('sidebar.modelManagement') || 'Model Management'}</h4>
          <p>${this.t('sidebar.modelInfo') || 'Models are downloaded automatically when needed'}</p>
          <button class="mydictionary-btn-secondary" id="mydictionary-clear-models-btn">
            🗑️ ${this.t('sidebar.clearModels') || 'Clear all models'}
          </button>
        </div>

        <div class="mydictionary-settings-section">
          <h4>ℹ️ ${this.t('sidebar.about') || 'About'}</h4>
          <p>MyDictionary v0.1.0</p>
          <p>${this.t('sidebar.madeWith') || 'Made with'} ❤️ ${this.t('sidebar.by') || 'by'} Jason</p>
          <p>
            <a href="https://github.com/jhfnetboy/MyDictionary" target="_blank" style="color: #667eea;">
              GitHub
            </a>
          </p>
        </div>

        <button class="mydictionary-btn-primary" id="mydictionary-close-settings-btn">
          ${this.t('sidebar.close') || 'Close'}
        </button>
      </div>
    `;

    // 绑定关闭按钮
    const closeBtn = output.querySelector('#mydictionary-close-settings-btn');
    closeBtn.addEventListener('click', () => {
      output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
    });

    // 绑定清除模型按钮
    const clearModelsBtn = output.querySelector('#mydictionary-clear-models-btn');
    clearModelsBtn.addEventListener('click', async () => {
      const confirmed = confirm(this.t('sidebar.confirmClearModels') || 'Clear all downloaded models? This will free up disk space but models will need to be re-downloaded when used.');
      if (confirmed) {
        await chrome.storage.local.remove('installedModels');
        this.showStatus('✅ ' + (this.t('sidebar.modelsCleared') || 'Models cleared'), 'success');
      }
    });
  }

  /**
   * 显示模型未安装对话框
   */
  showModelNotInstalledDialog(modelInfo) {
    const output = this.sidebar.querySelector('#mydictionary-output');
    output.innerHTML = `
      <div class="mydictionary-model-dialog">
        <h3>⚠️ ${this.t('messages.modelNotInstalled')}</h3>
        <p><strong>${modelInfo.name}</strong></p>
        <p>Size: ${modelInfo.size}MB</p>
        <button id="mydictionary-download-model-btn" class="mydictionary-btn-primary">
          ${this.t('popup.download')}
        </button>
        <button id="mydictionary-cancel-btn" class="mydictionary-btn-secondary">
          ${this.t('sidebar.close')}
        </button>
      </div>
    `;

    // 绑定下载按钮事件
    const downloadBtn = output.querySelector('#mydictionary-download-model-btn');
    downloadBtn.addEventListener('click', async () => {
      this.showStatus(this.t('messages.downloading'), 'info');
      output.innerHTML = `<div class="mydictionary-loading">${this.t('messages.downloading')}</div>`;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'downloadModel',
          modelId: modelInfo.id
        });

        if (response.success) {
          this.showStatus(`✅ ${this.t('messages.downloadComplete')}`, 'success');
          output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        this.showStatus(`❌ ${this.t('messages.translationError')}: ${error.message}`, 'error');
        output.innerHTML = `<div class="mydictionary-error">${this.t('messages.translationError')}</div>`;
      }
    });

    const cancelBtn = output.querySelector('#mydictionary-cancel-btn');
    cancelBtn.addEventListener('click', () => {
      output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
    });
  }
}

// 创建全局 UI 管理器实例
const uiManager = new UIManager();

/**
 * 监听来自 Background Script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content 收到消息:', request.action);

  // 使用异步处理
  (async () => {
    try {
      switch (request.action) {
        case 'openSidebar':
          await uiManager.showSidebar(request.text);
          break;

        case 'toggleSidebar':
          await uiManager.toggleSidebar();
          break;

        default:
          console.log('未知的操作:', request.action);
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ 消息处理失败:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // 保持消息通道开启
});

/**
 * 监听文本选中事件 (可选功能)
 */
let selectionTimeout;
document.addEventListener('mouseup', () => {
  clearTimeout(selectionTimeout);
  selectionTimeout = setTimeout(() => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 0 && selectedText.length < 500) {
      console.log('📝 选中文本:', selectedText.substring(0, 30) + '...');
      // 这里可以显示一个小图标按钮,暂时注释掉
      // showTranslationIcon(selectedText);
    }
  }, 300);
});

console.log('✅ MyDictionary Content Script 初始化完成');
