/**
 * MyDictionary - Content Script
 * 负责网页交互和 UI 管理
 */

// 防止重复注入
if (window.myDictionaryLoaded) {
  console.warn('⚠️ MyDictionary Content Script 已存在，跳过重复加载');
  throw new Error('MyDictionary already loaded');
}
window.myDictionaryLoaded = true;

console.log('🦝 MyDictionary Content Script 已加载');

// UI 管理器
class UIManager {
  constructor() {
    this.sidebar = null;
    this.sidebarVisible = false;
    this.i18n = null;
    this.currentLang = 'en'; // 默认英文
    this.isTranslating = false; // 防止重复翻译
    this.lastTranslation = null; // 保存最后一次翻译的详细信息
    this.currentMode = 'translation'; // 当前模式: translation | academic
    this.phrasebankInitialized = false; // 学术短语库是否已初始化
    this.currentText = null; // 当前正在查询的文本
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
    // 从 manifest.json 动态读取版本号,确保始终同步
    const version = chrome.runtime.getManifest().version;

    // 使用默认文本（如果 i18n 未加载）
    const getText = (key, fallback) => {
      const text = this.t(key);
      return text === key ? fallback : text;
    };

    // Logo URL (Chrome extensions use content hash for cache busting automatically)
    const logoUrl = chrome.runtime.getURL('assets/logo.png');

    this.sidebar.innerHTML = `
      <div class="mydictionary-header">
        <div class="mydictionary-header-left">
          <img src="${logoUrl}" alt="MyDictionary" class="mydictionary-logo" />
          <span class="mydictionary-title">${getText('sidebar.title', 'MyDictionary')}</span>
        </div>
        <div class="mydictionary-header-right">
          <button class="mydictionary-lang-switch" id="mydictionary-lang-switch-btn" title="Switch Language">
            ${getText('sidebar.languageSwitch', this.currentLang === 'en' ? '中文' : 'English')}
          </button>
          <button class="mydictionary-close" id="mydictionary-close-btn">✕</button>
        </div>
      </div>

      <div class="mydictionary-mode-tabs">
        <button class="mydictionary-mode-tab active" id="mydictionary-mode-translation" data-mode="translation">
          🌐 ${getText('sidebar.modeTranslation', 'Translation')}
        </button>
        <button class="mydictionary-mode-tab" id="mydictionary-mode-academic" data-mode="academic">
          🎓 ${getText('sidebar.modeAcademic', 'Academic Writing')}
        </button>
      </div>

      <div class="mydictionary-content">
        <div class="mydictionary-input-section">
          <label>${getText('sidebar.sourceLanguage', 'Source Language')}</label>
          <select id="mydictionary-source-lang">
            <option value="auto">🌐 ${getText('sidebar.autoDetect', 'Auto Detect')}</option>
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 中文</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="ko">🇰🇷 한국어</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ru">🇷🇺 Русский</option>
          </select>

          <div class="mydictionary-input-wrapper">
            <textarea
              id="mydictionary-input"
              placeholder="${getText('sidebar.inputPlaceholder', 'Enter text to translate...')}"
              rows="4"
            ></textarea>
            <button class="mydictionary-tts-btn mydictionary-input-tts" id="mydictionary-input-tts-btn" title="Read aloud">
              🔊
            </button>
          </div>

          <button id="mydictionary-translate-btn" class="mydictionary-btn-primary">
            ${getText('sidebar.translateButton', 'Translate')}
          </button>
        </div>

        <div class="mydictionary-output-section">
          <label>${getText('sidebar.targetLanguage', 'Target Language')}</label>
          <select id="mydictionary-target-lang">
            <option value="zh">🇨🇳 中文</option>
            <option value="en">🇺🇸 English</option>
            <option value="ja">🇯🇵 日本語</option>
            <option value="ko">🇰🇷 한국어</option>
            <option value="fr">🇫🇷 Français</option>
            <option value="de">🇩🇪 Deutsch</option>
            <option value="es">🇪🇸 Español</option>
            <option value="ru">🇷🇺 Русский</option>
          </select>

          <div id="mydictionary-output" class="mydictionary-output">
            <div class="mydictionary-placeholder">${getText('sidebar.result', 'Translation Result')}...</div>
          </div>

          <div class="mydictionary-feature-buttons" id="mydictionary-feature-buttons" style="display: none;">
            <button class="mydictionary-feature-btn" id="mydictionary-synonyms-btn" title="Get synonyms for selected word">
              📚 ${getText('sidebar.synonyms', 'Synonyms')}
            </button>
            <button class="mydictionary-feature-btn" id="mydictionary-examples-btn" title="Get example sentences">
              💡 ${getText('sidebar.examples', 'Examples')}
            </button>
          </div>
        </div>

        <div id="mydictionary-status" class="mydictionary-status"></div>

        <div id="mydictionary-academic-panel" class="mydictionary-academic-panel" style="display: none;">
          <!-- 硬件检测区域 (固定显示) -->
          <div class="mydictionary-performance-section mydictionary-performance-compact" id="mydictionary-performance-section-main">
            <div class="mydictionary-performance-header">
              <h4>⚡ ${getText('sidebar.performanceCheck', 'Performance Check')}</h4>
              <button class="mydictionary-btn-secondary mydictionary-btn-small" id="mydictionary-run-performance-check-main">
                🔍 ${getText('sidebar.checkHardware', 'Check Hardware')}
              </button>
            </div>
            <div id="mydictionary-performance-results-main" class="mydictionary-performance-results" style="display: none;">
              <!-- 性能检测结果将在这里显示 -->
            </div>
          </div>

          <!-- 搜索模式切换器 -->
          <div class="mydictionary-search-mode-switcher">
            <div class="mydictionary-search-mode-tabs">
              <button class="mydictionary-search-mode-tab active" data-mode="keyword">
                🔍 ${getText('sidebar.keywordSearch', 'Keyword Search')}
              </button>
              <button class="mydictionary-search-mode-tab" data-mode="semantic" id="mydictionary-semantic-search-tab">
                🧠 ${getText('sidebar.semanticSearch', 'Semantic Search')}
                <span class="mydictionary-beta-badge">AI</span>
              </button>
            </div>
          </div>

          <div class="mydictionary-academic-search">
            <input
              type="text"
              id="mydictionary-academic-search-input"
              placeholder="${getText('sidebar.searchPhrases', 'Search phrases...')}"
            />
            <div class="mydictionary-search-hint" id="mydictionary-search-hint" style="display: none;">
              💡 ${getText('sidebar.semanticSearchHint', 'AI will find phrases with similar meanings')}
            </div>
          </div>

          <div class="mydictionary-section-selector">
            <label>${getText('sidebar.selectPaperSection', 'Select Paper Section')}:</label>
            <select id="mydictionary-section-select">
              <option value="introduction">${getText('sidebar.introduction', 'Introduction')}</option>
              <option value="methods">${getText('sidebar.methods', 'Methods')}</option>
              <option value="results">${getText('sidebar.results', 'Results')}</option>
              <option value="discussion">${getText('sidebar.discussion', 'Discussion')}</option>
              <option value="conclusion">${getText('sidebar.conclusion', 'Conclusion')}</option>
            </select>
          </div>

          <div id="mydictionary-academic-phrases" class="mydictionary-academic-phrases">
            <div class="mydictionary-placeholder">
              ${getText('sidebar.selectPaperSection', 'Select a paper section to view phrases')}...
            </div>
          </div>
        </div>
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
    // 防止重复绑定事件（标记已绑定）
    if (this.sidebar.dataset.eventsBound === 'true') {
      console.log('⚠️ 事件已绑定，跳过重复绑定');
      return;
    }

    console.log('🔗 绑定侧边栏事件');

    // 关闭按钮
    const closeBtn = this.sidebar.querySelector('#mydictionary-close-btn');
    closeBtn.addEventListener('click', () => this.hideSidebar());

    // 语言切换按钮
    const langSwitchBtn = this.sidebar.querySelector('#mydictionary-lang-switch-btn');
    langSwitchBtn.addEventListener('click', () => this.switchLanguage());

    // 设置按钮 - 直接打开设置页面
    const settingsBtn = this.sidebar.querySelector('#mydictionary-settings-btn');
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'openTab',
        url: chrome.runtime.getURL('src/settings/settings.html')
      });
    });

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

    // 同义词按钮
    const synonymsBtn = this.sidebar.querySelector('#mydictionary-synonyms-btn');
    if (synonymsBtn) {
      synonymsBtn.addEventListener('click', () => this.handleGetSynonyms());
    }

    // 例句按钮
    const examplesBtn = this.sidebar.querySelector('#mydictionary-examples-btn');
    if (examplesBtn) {
      examplesBtn.addEventListener('click', () => this.handleGetExamples());
    }

    // 模式切换标签页
    const modeTabs = this.sidebar.querySelectorAll('.mydictionary-mode-tab');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchMode(tab.dataset.mode));
    });

    // 学术模式 - 论文部分选择
    const sectionSelect = this.sidebar.querySelector('#mydictionary-section-select');
    if (sectionSelect) {
      sectionSelect.addEventListener('change', () => this.handleSectionChange());
    }

    // 学术模式 - 短语搜索
    const academicSearchInput = this.sidebar.querySelector('#mydictionary-academic-search-input');
    if (academicSearchInput) {
      academicSearchInput.addEventListener('input', () => this.handleAcademicSearch());
    }

    // 学术模式 - 搜索模式切换（关键词 / 语义）
    const searchModeTabs = this.sidebar.querySelectorAll('.mydictionary-search-mode-tab');
    searchModeTabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchSearchMode(tab.dataset.mode));
    });

    // 输入框 TTS 按钮
    const inputTtsBtn = this.sidebar.querySelector('#mydictionary-input-tts-btn');
    if (inputTtsBtn) {
      inputTtsBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const inputText = input.value.trim();
        if (inputText) {
          await ttsButtonHelper.handleClick(inputTtsBtn, inputText);
        }
      });
    }

    // 标记已绑定
    this.sidebar.dataset.eventsBound = 'true';

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
    // 防止重复翻译
    if (this.isTranslating) {
      console.warn('⏳ 翻译进行中，忽略重复请求');
      return;
    }

    console.log('🚀 handleTranslate 被调用');

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

    // 保存当前查询文本
    this.currentText = text;

    console.log('🔒 设置 isTranslating = true');
    this.isTranslating = true;

    // 禁用翻译按钮
    const translateBtn = this.sidebar.querySelector('#mydictionary-translate-btn');
    translateBtn.disabled = true;
    translateBtn.textContent = this.t('sidebar.translating') || 'Translating...';

    let sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // 自动检测语言
    if (sourceLang === 'auto') {
      sourceLang = this.detectLanguage(text);
      console.log('🔍 检测到语言:', sourceLang);
    }

    // 显示明显的加载动画
    output.innerHTML = `
      <div class="mydictionary-loading-container">
        <div class="mydictionary-spinner"></div>
        <p>${this.t('sidebar.translating') || 'Translating...'}</p>
      </div>
    `;
    this.showStatus(this.t('sidebar.translating'), 'info');

    try {
      // 设置超时（30秒）
      console.log('📤 发送翻译请求:', { text: text.substring(0, 30), sourceLang, targetLang });

      const translationPromise = chrome.runtime.sendMessage({
        action: 'translate',
        text,
        sourceLang,
        targetLang
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Translation timeout. Please try again.')), 30000)
      );

      const response = await Promise.race([translationPromise, timeoutPromise]);

      console.log('📨 收到翻译响应:', JSON.stringify(response).substring(0, 200));

      if (!response) {
        throw new Error('No response received from background script');
      }

      if (response.success) {
        console.log('✅ 翻译成功，准备显示结果');

        // 兼容本地词典和 AI 翻译的不同数据结构
        const isLocalDict = response.source === 'local-dictionary';
        const translationText = isLocalDict
          ? response.translation
          : (response.data?.translation || 'No translation');
        const latency = isLocalDict
          ? (response.lookupTime || 0)
          : (response.data?.latency || 0);
        const modelId = isLocalDict
          ? 'local-dictionary'
          : (response.data?.modelId || 'unknown');

        console.log('📝 翻译结果:', translationText);

        // 保存翻译详情，供同义词和例句功能使用
        this.lastTranslation = {
          sourceText: text,
          sourceLang,
          targetLang,
          translation: translationText,
          timestamp: Date.now()
        };
        console.log('💾 已保存翻译详情:', this.lastTranslation);

        output.innerHTML = `
          <div class="mydictionary-translation-container">
            <div class="mydictionary-translation">${translationText}</div>
            <button class="mydictionary-tts-btn mydictionary-translation-tts" data-text="${translationText}" title="Read aloud">
              🔊
            </button>
          </div>
          <div class="mydictionary-meta">
            <span>⏱️ ${latency.toFixed(2)}ms</span>
            <span>📦 ${modelId}</span>
          </div>
        `;

        // 绑定翻译结果的 TTS 按钮
        const translationTtsBtn = output.querySelector('.mydictionary-translation-tts');
        if (translationTtsBtn) {
          translationTtsBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await ttsButtonHelper.handleClick(translationTtsBtn, translationText);
          });
        }

        this.showStatus(`✅ Translation complete`, 'success');

        // 显示功能按钮（仅英文支持同义词和例句）
        const featureButtons = this.sidebar.querySelector('#mydictionary-feature-buttons');
        if (featureButtons) {
          // 本地词典总是英译中,支持同义词和例句
          if (isLocalDict || response.data?.targetLang === 'en' || response.data?.sourceLang === 'en') {
            featureButtons.style.display = 'flex';
          } else {
            featureButtons.style.display = 'none';
          }
        }
      } else if (response.error === 'DICTIONARY_NOT_FOUND') {
        console.log('📖 词典未找到,建议下载完整词库');
        // 引导用户下载完整词库
        this.showDictionaryNotFoundDialog(response);
      } else if (response.error === 'MODEL_NOT_INSTALLED') {
        console.log('⚠️ 模型未安装');
        // 模型未安装,提示用户下载
        this.showModelNotInstalledDialog(response.requiredModel);
      } else {
        // 改进错误对象的序列化
        const errorDetail = typeof response.error === 'object'
          ? JSON.stringify(response.error)
          : String(response.error);
        console.error('❌ 翻译失败:', errorDetail);
        throw new Error(response.message || errorDetail || 'Translation failed');
      }
    } catch (error) {
      // 改进错误消息的提取
      console.error('❌ 翻译失败:', error);
      let errorMsg = 'Unknown error';

      if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'object') {
        errorMsg = JSON.stringify(error);
      } else {
        errorMsg = String(error);
      }
      output.innerHTML = `
        <div class="mydictionary-error-container">
          <div class="mydictionary-error-icon">⚠️</div>
          <h4>${this.t('messages.translationError') || 'Translation Error'}</h4>
          <p class="mydictionary-error-message">${errorMsg}</p>
          <button class="mydictionary-btn-secondary" id="mydictionary-retry-btn">
            🔄 Retry
          </button>
        </div>
      `;
      this.showStatus(`❌ ${errorMsg}`, 'error');

      // 绑定重试按钮
      const retryBtn = output.querySelector('#mydictionary-retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.handleTranslate());
      }
    } finally {
      // 无论成功或失败，都重置翻译标志和按钮状态
      console.log('🔓 重置 isTranslating = false');
      this.isTranslating = false;
      const translateBtn = this.sidebar.querySelector('#mydictionary-translate-btn');
      if (translateBtn) {
        translateBtn.disabled = false;
        translateBtn.textContent = this.t('sidebar.translateButton') || 'Translate';
      }
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
  async showSettings() {
    const output = this.sidebar.querySelector('#mydictionary-output');
    const shortcutKey = navigator.platform.includes('Mac') ? 'Cmd+Shift+D' : 'Ctrl+Shift+D';

    // 获取已安装的模型列表
    const storage = await chrome.storage.local.get(['installedModels']);
    const installedModels = storage.installedModels || {};
    const modelCount = Object.keys(installedModels).length;

    // 生成模型列表 HTML
    let modelListHTML = '';
    if (modelCount > 0) {
      modelListHTML = `
        <div class="mydictionary-model-list" style="margin: 16px 0; padding: 12px; background: white; border-radius: 6px; border: 1px solid #e0e0e0;">
          <h5 style="font-size: 13px; color: #667eea; margin-bottom: 10px;">Downloaded Models (${modelCount}):</h5>
          <div style="font-size: 12px; color: #666; line-height: 1.8;">
            ${Object.entries(installedModels).map(([id, info]) => {
              const modelName = id.replace('translation-', '').replace('-', ' → ').toUpperCase();
              const downloadDate = new Date(info.timestamp).toLocaleDateString();
              return `<div>• <strong>${modelName}</strong> <span style="color: #999;">(${downloadDate})</span></div>`;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      modelListHTML = `
        <div style="margin: 16px 0; padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 3px solid #ffa500;">
          <p style="font-size: 12px; color: #666; margin: 0;">No models downloaded yet. Models will be downloaded automatically when you use translation.</p>
        </div>
      `;
    }

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
          <h4>🎵 ${this.t('sidebar.ttsSettings') || 'TTS Voice Settings'}</h4>
          <p>${this.t('sidebar.ttsSettingsDesc') || 'Configure text-to-speech voice and preferences'}</p>
          <button class="mydictionary-btn-primary" id="mydictionary-open-tts-settings-btn" style="margin-top: 8px;">
            ⚙️ ${this.t('sidebar.openTTSSettings') || 'Open Voice Settings'}
          </button>
        </div>

        <div class="mydictionary-settings-section">
          <h4>📦 ${this.t('sidebar.modelManagement') || 'Model Management'}</h4>
          <p>${this.t('sidebar.modelInfo') || 'Models are downloaded automatically when needed'}</p>

          ${modelListHTML}

          ${modelCount > 0 ? `
          <button class="mydictionary-btn-secondary" id="mydictionary-clear-models-btn">
            🗑️ ${this.t('sidebar.clearModels') || 'Clear all models'}
          </button>
          ` : ''}
        </div>

        <div class="mydictionary-settings-section">
          <h4>ℹ️ ${this.t('sidebar.about') || 'About'}</h4>
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

    // 绑定打开TTS设置按钮
    const openTTSSettingsBtn = output.querySelector('#mydictionary-open-tts-settings-btn');
    if (openTTSSettingsBtn) {
      openTTSSettingsBtn.addEventListener('click', () => {
        // Content script不能直接调用openOptionsPage,需要通过background
        chrome.runtime.sendMessage({ action: 'openOptions' });
      });
    }

    // 绑定关闭按钮
    const closeBtn = output.querySelector('#mydictionary-close-settings-btn');
    closeBtn.addEventListener('click', () => {
      output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
    });

    // 绑定清除模型按钮（仅当有模型时才存在）
    const clearModelsBtn = output.querySelector('#mydictionary-clear-models-btn');
    if (clearModelsBtn) {
      clearModelsBtn.addEventListener('click', async () => {
        const confirmed = confirm(this.t('sidebar.confirmClearModels') || 'Clear all downloaded models? This will free up disk space but models will need to be re-downloaded when used.');
        if (confirmed) {
          await chrome.storage.local.remove('installedModels');
          this.showStatus('✅ ' + (this.t('sidebar.modelsCleared') || 'Models cleared'), 'success');
          // 重新显示设置面板以更新模型列表
          await this.showSettings();
        }
      });
    }
  }

  /**
   * 显示模型未安装对话框
   */
  showModelNotInstalledDialog(modelInfo) {
    const output = this.sidebar.querySelector('#mydictionary-output');

    // 使用带 fallback 的文本获取
    const getText = (key, fallback) => {
      const text = this.t(key);
      return text === key ? fallback : text;
    };

    output.innerHTML = `
      <div class="mydictionary-model-dialog">
        <h3>⚠️ ${getText('messages.modelNotInstalled', 'Model not installed')}</h3>
        <p><strong>${modelInfo.name}</strong></p>
        <p>${getText('messages.modelSize', 'Size')}: ${modelInfo.size}MB</p>
        <button id="mydictionary-download-model-btn" class="mydictionary-btn-primary">
          📥 ${getText('popup.download', 'Download')}
        </button>
        <button id="mydictionary-cancel-btn" class="mydictionary-btn-secondary">
          ${getText('sidebar.close', 'Close')}
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

  /**
   * 显示词典未找到对话框,引导用户下载完整词库
   */
  showDictionaryNotFoundDialog(responseData) {
    const output = this.sidebar.querySelector('#mydictionary-output');

    const { message, dictionary } = responseData;

    output.innerHTML = `
      <div class="mydictionary-model-dialog">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 12px;">📚</div>
          <h3>${this.currentLang === 'zh' ? '词典未找到' : 'Dictionary Not Found'}</h3>
        </div>

        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <p style="margin: 0; line-height: 1.6;">${message}</p>
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 16px; font-size: 13px;">
          <div style="flex: 1; text-align: center; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 24px; margin-bottom: 4px;">📖</div>
            <div style="font-weight: 600;">${this.currentLang === 'zh' ? '当前' : 'Current'}</div>
            <div>${dictionary.currentSize.toLocaleString()} ${this.currentLang === 'zh' ? '词' : 'words'}</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; background: #e8f5e9; border-radius: 6px;">
            <div style="font-size: 24px; margin-bottom: 4px;">🌐</div>
            <div style="font-weight: 600;">${this.currentLang === 'zh' ? '完整版' : 'Full'}</div>
            <div>${dictionary.recommendedSize.toLocaleString()} ${this.currentLang === 'zh' ? '词' : 'words'}</div>
          </div>
        </div>

        <div style="text-align: center; margin-bottom: 16px; color: #666; font-size: 13px;">
          ${this.currentLang === 'zh' ? '下载大小' : 'Download size'}: ${dictionary.downloadSize}
        </div>

        <button id="mydictionary-download-dictionary-btn" class="mydictionary-btn-primary" style="width: 100%; margin-bottom: 8px;">
          📥 ${this.currentLang === 'zh' ? '下载完整词库' : 'Download Full Dictionary'}
        </button>
        <button id="mydictionary-close-dialog-btn" class="mydictionary-btn-secondary" style="width: 100%;">
          ${this.currentLang === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
    `;

    // 绑定下载按钮 - 跳转到词典管理页面
    const downloadBtn = output.querySelector('#mydictionary-download-dictionary-btn');
    downloadBtn.addEventListener('click', () => {
      // 打开词典管理页面
      chrome.runtime.sendMessage({
        action: 'openTab',
        url: chrome.runtime.getURL('src/ui/dictionary-manager.html')
      });
    });

    // 绑定关闭按钮
    const closeBtn = output.querySelector('#mydictionary-close-dialog-btn');
    closeBtn.addEventListener('click', () => {
      output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
    });
  }

  /**
   * 显示 TTS 配置引导对话框
   */
  showTTSConfigDialog(errorMessage) {
    const output = this.sidebar.querySelector('#mydictionary-output');

    output.innerHTML = `
      <div class="mydictionary-model-dialog">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 48px; margin-bottom: 12px;">🔊</div>
          <h3>${this.currentLang === 'zh' ? 'TTS 语音播放' : 'Text-to-Speech'}</h3>
        </div>

        <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #ff9800;">
          <p style="margin: 0; line-height: 1.6; color: #e65100;">
            ${this.currentLang === 'zh'
              ? '⚠️ TTS 服务器未运行'
              : '⚠️ TTS Server Not Running'}
          </p>
          <p style="margin: 8px 0 0; font-size: 13px; color: #666;">
            ${errorMessage}
          </p>
        </div>

        <div style="padding: 16px; background: #f0f4ff; border-radius: 8px; border-left: 4px solid #667eea; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 24px;">🖥️</span>
            <strong>${this.currentLang === 'zh' ? '本地 TTS 服务器' : 'Local TTS Server'}</strong>
          </div>
          <div style="font-size: 13px; color: #555; line-height: 1.5; margin-bottom: 12px;">
            ${this.currentLang === 'zh'
              ? '• 54 种高质量语音<br>• 完全离线，无隐私泄露<br>• 快速响应（< 1秒）<br>• 支持流式播放'
              : '• 54 premium voices<br>• Fully offline, privacy-first<br>• Fast response (< 1s)<br>• Streaming playback'}
          </div>
          <div style="padding: 12px; background: white; border-radius: 6px; font-size: 13px;">
            <strong style="color: #667eea;">${this.currentLang === 'zh' ? '🚀 启动步骤:' : '🚀 Quick Start:'}</strong>
            <ol style="margin: 8px 0 0; padding-left: 20px; line-height: 1.6;">
              <li>${this.currentLang === 'zh' ? '前往 TTS 设置页面' : 'Go to TTS Settings'}</li>
              <li>${this.currentLang === 'zh' ? '下载并安装 TTS 服务器' : 'Download and install TTS server'}</li>
              <li>${this.currentLang === 'zh' ? '启动服务器（自动运行端口 9527）' : 'Start server (auto-runs on port 9527)'}</li>
              <li>${this.currentLang === 'zh' ? '刷新此页面，小喇叭即可使用' : 'Refresh page, speaker button enabled'}</li>
            </ol>
          </div>
        </div>

        <button id="mydictionary-open-tts-settings-btn" class="mydictionary-btn-primary" style="width: 100%; margin-bottom: 8px;">
          ⚙️ ${this.currentLang === 'zh' ? '打开 TTS 设置' : 'Open TTS Settings'}
        </button>
        <button id="mydictionary-close-tts-dialog-btn" class="mydictionary-btn-secondary" style="width: 100%;">
          ${this.currentLang === 'zh' ? '关闭' : 'Close'}
        </button>
      </div>
    `;

    // 绑定设置按钮
    const settingsBtn = output.querySelector('#mydictionary-open-tts-settings-btn');
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'openTab',
        url: chrome.runtime.getURL('src/settings/settings.html')
      });
    });

    // 绑定关闭按钮
    const closeBtn = output.querySelector('#mydictionary-close-tts-dialog-btn');
    closeBtn.addEventListener('click', () => {
      output.innerHTML = `<div class="mydictionary-placeholder">${this.t('sidebar.result')}...</div>`;
    });
  }
}

// 创建全局 UI 管理器实例
const uiManager = new UIManager();
window.uiManager = uiManager;  // 确保全局可访问

/**
 * 监听来自 Background Script 的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Content 收到消息:', request.action || request.type);

  // 使用异步处理
  (async () => {
    try {
      // 处理 action 类型消息
      if (request.action) {
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
      }

      // 处理 type 类型消息
      if (request.type) {
        switch (request.type) {
          case 'DICTIONARY_UPDATED':
            // 词典已更新，如果有当前查询文本则重新查询
            console.log('✅ 词典已更新:', request.tier, '词条数:', request.count);
            if (uiManager.currentText && uiManager.sidebarVisible) {
              console.log('🔄 自动重新查询:', uiManager.currentText);
              // 延迟一下确保数据库已完全初始化
              setTimeout(() => {
                uiManager.handleTranslate();
              }, 500);
            }
            break;

          default:
            console.log('未知的消息类型:', request.type);
        }
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

/**
 * 处理获取同义词
 */
UIManager.prototype.handleGetSynonyms = async function() {
  console.log('📚 同义词按钮被点击');

  const output = this.sidebar.querySelector('#mydictionary-output');
  const input = this.sidebar.querySelector('#mydictionary-input');

  let sourceText, targetWord, context;

  // 优先使用保存的翻译详情中的原文（英文）
  if (this.lastTranslation && this.lastTranslation.sourceText) {
    sourceText = this.lastTranslation.sourceText;
    console.log('✅ 使用保存的原文:', sourceText);
  } else if (input && input.value.trim()) {
    // 如果没有保存的翻译，使用输入框的文本
    sourceText = input.value.trim();
    console.log('⚠️ 使用输入框文本:', sourceText);
  } else {
    // 既没有保存的翻译也没有输入
    output.innerHTML = `
      <div class="mydictionary-error-container">
        <div class="mydictionary-error-icon">⚠️</div>
        <h4>No Text Available</h4>
        <p class="mydictionary-error-message">Please translate some text or enter text first.</p>
      </div>
    `;
    return;
  }

  // 直接使用输入的文本作为查询词汇
  // 支持单个词或短语，自动清理空格
  targetWord = sourceText.trim();

  // 如果是多个词，只取第一个词
  const words = targetWord.split(/\s+/);
  if (words.length > 1) {
    targetWord = words[0];
    console.log(`⚠️ 检测到多个词，只查询第一个词: ${targetWord}`);
  }

  context = targetWord; // 同义词查询不需要上下文
  console.log(`📚 查询同义词: ${targetWord}`);

  console.log(`📚 获取单词 "${targetWord}" 的同义词`);
  console.log(`📝 上下文: ${context}`);

  // 显示加载状态
  output.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>Finding synonyms...</p>
    </div>
  `;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSynonyms',
      word: targetWord,
      context: context
    });

    if (response.success) {
      const { synonyms, latency } = response.data;

      console.log('📊 同义词数据:', synonyms);
      console.log('📊 同义词数量:', synonyms.length);

      // 检查是否有同义词
      if (!synonyms || synonyms.length === 0) {
        // 检查数据库状态
        const checkDbStatus = async () => {
          try {
            const dbStatusResponse = await chrome.runtime.sendMessage({
              action: 'checkDatabaseStatus'
            });

            if (dbStatusResponse.success && !dbStatusResponse.data.isDownloaded) {
              // 数据库未下载，显示下载提示
              output.innerHTML = `
                <div class="mydictionary-synonyms-result">
                  <h3>📚 Synonym Dictionary Required</h3>

                  <div class="mydictionary-db-prompt">
                    <p style="margin: 12px 0;">Enable smart synonym suggestions with <strong>126K+ words</strong> from WordNet.</p>
                    <div style="display: flex; gap: 16px; justify-content: center; margin: 16px 0; font-size: 13px;">
                      <div><strong>📦</strong> 2.4 MB</div>
                      <div><strong>⚡</strong> Instant</div>
                      <div><strong>💾</strong> Offline</div>
                    </div>
                    <button id="download-wordnet-btn" class="mydictionary-btn-primary" style="margin-top: 12px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                      📥 Download Now (2.4 MB)
                    </button>
                  </div>

                  <div class="mydictionary-meta">
                    <span>⏱️ ${latency}ms</span>
                    <span>📖 Database: Not Downloaded</span>
                  </div>
                </div>
              `;

              // 绑定下载按钮事件
              document.getElementById('download-wordnet-btn')?.addEventListener('click', async () => {
                output.innerHTML = `
                  <div class="mydictionary-db-downloading">
                    <h4>📥 Downloading Synonym Data...</h4>
                    <p>Just a moment (2.4 MB)...</p>
                    <div class="mydictionary-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                  </div>
                `;

                try {
                  const downloadResponse = await chrome.runtime.sendMessage({
                    action: 'downloadDatabase'
                  });

                  if (downloadResponse.success) {
                    output.innerHTML = `
                      <div class="mydictionary-db-success">
                        <h4>✅ Ready!</h4>
                        <p>Synonym dictionary installed (${downloadResponse.data.wordCount.toLocaleString()} words). Try searching again!</p>
                      </div>
                    `;
                  } else {
                    throw new Error(downloadResponse.error);
                  }
                } catch (error) {
                  output.innerHTML = `
                    <div class="mydictionary-error-container">
                      <h4>❌ Download Failed</h4>
                      <p>${error.message}</p>
                      <button onclick="location.reload()" class="mydictionary-btn-secondary" style="margin-top: 8px;">🔄 Retry</button>
                    </div>
                  `;
                }
              });
            } else {
              // 数据库已下载但找不到词
              output.innerHTML = `
                <div class="mydictionary-synonyms-result">
                  <h3>📚 Synonyms for "<span class="highlight">${targetWord}</span>"</h3>
                  <p class="mydictionary-no-results">❌ No synonyms found.</p>
                  <p class="mydictionary-tip">💡 The word "${targetWord}" may be:
                    <ul style="margin: 8px 0; padding-left: 20px;">
                      <li>A proper noun</li>
                      <li>Very specialized terminology</li>
                      <li>Misspelled</li>
                    </ul>
                  </p>
                  <div class="mydictionary-meta">
                    <span>⏱️ ${latency}ms</span>
                    <span>📖 WordNet Database (126K words)</span>
                  </div>
                </div>
              `;
            }
          } catch (error) {
            console.error('Error checking database status:', error);
          }
        };

        checkDbStatus();
        return;
      }

      // 显示同义词列表
      const synonymsList = synonyms.map(s =>
        `<li class="mydictionary-synonym-item">
          <span class="mydictionary-synonym-word">${s.word}</span>
          <span class="mydictionary-synonym-score">${s.confidence}</span>
        </li>`
      ).join('');

      output.innerHTML = `
        <div class="mydictionary-synonyms-result">
          <h3>📚 Synonyms for "<span class="highlight">${targetWord}</span>"</h3>
          <ul class="mydictionary-synonyms-list">
            ${synonymsList}
          </ul>
          <div class="mydictionary-meta">
            <span>⏱️ ${latency}ms</span>
            <span>📖 WordNet Dictionary</span>
            <span>📊 ${synonyms.length} results</span>
          </div>
        </div>
      `;
    } else {
      throw new Error(response.error || 'Failed to get synonyms');
    }
  } catch (error) {
    console.error('❌ 同义词获取失败:', error);
    output.innerHTML = `
      <div class="mydictionary-error-container">
        <div class="mydictionary-error-icon">⚠️</div>
        <h4>Synonyms Error</h4>
        <p class="mydictionary-error-message">${error.message}</p>
      </div>
    `;
  }
};

/**
 * 切换模式 (翻译 ↔ 学术写作)
 */
UIManager.prototype.switchMode = function(mode) {
  console.log('🔄 切换模式:', mode);
  this.currentMode = mode;

  // 更新标签页激活状态
  const tabs = this.sidebar.querySelectorAll('.mydictionary-mode-tab');
  tabs.forEach(tab => {
    if (tab.dataset.mode === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 显示/隐藏对应的内容区域
  const translationSection = this.sidebar.querySelector('.mydictionary-input-section');
  const outputSection = this.sidebar.querySelector('.mydictionary-output-section');
  const academicPanel = this.sidebar.querySelector('#mydictionary-academic-panel');

  if (mode === 'translation') {
    // 显示翻译模式
    translationSection.style.display = 'block';
    outputSection.style.display = 'block';
    academicPanel.style.display = 'none';
  } else if (mode === 'academic') {
    // 显示学术模式
    translationSection.style.display = 'none';
    outputSection.style.display = 'none';
    academicPanel.style.display = 'block';

    // 绑定主面板的硬件检测按钮
    this.bindMainPerformanceCheckButton();

    // 初始化学术短语库（如果还没有初始化）
    if (!this.phrasebankInitialized) {
      this.initializeAcademicPhrasebank();
    } else {
      // 加载默认部分的短语
      this.handleSectionChange();
    }
  }
};

/**
 * 初始化学术短语库
 */
UIManager.prototype.initializeAcademicPhrasebank = async function() {
  console.log('📚 初始化学术短语库...');

  try {
    // 先检查数据库状态
    const statusResponse = await chrome.runtime.sendMessage({
      action: 'checkAcademicDatabaseStatus'
    });

    if (!statusResponse.success) {
      throw new Error(statusResponse.error);
    }

    // 如果数据库未下载，显示下载提示
    if (!statusResponse.data.isDownloaded) {
      this.showAcademicDownloadPrompt();
      return;
    }

    // 数据库已存在，直接初始化
    const response = await chrome.runtime.sendMessage({
      action: 'initializePhrasebank'
    });

    if (response.success) {
      this.phrasebankInitialized = true;
      console.log('✅ 学术短语库初始化成功');

      // 加载默认部分的短语
      this.handleSectionChange();
    } else {
      throw new Error(response.error || 'Failed to initialize phrasebank');
    }
  } catch (error) {
    console.error('❌ 学术短语库初始化失败:', error);
    this.showAcademicError('Failed to load academic phrasebank');
  }
};

/**
 * 处理论文部分切换
 */
UIManager.prototype.handleSectionChange = async function() {
  const sectionSelect = this.sidebar.querySelector('#mydictionary-section-select');
  const section = sectionSelect.value;

  console.log('📑 切换论文部分:', section);

  await this.loadPhrasesBySection(section);
};

/**
 * 加载指定部分的短语
 */
UIManager.prototype.loadPhrasesBySection = async function(section) {
  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');

  // 显示加载状态
  phrasesContainer.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>Loading phrases...</p>
    </div>
  `;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getPhrasesBySection',
      section: section
    });

    if (response.success) {
      const phrases = response.data;
      this.displayAcademicPhrases(phrases);
    } else {
      throw new Error(response.error || 'Failed to load phrases');
    }
  } catch (error) {
    console.error('❌ 加载短语失败:', error);
    this.showAcademicError(error.message);
  }
};

/**
 * 显示学术短语列表
 */
UIManager.prototype.displayAcademicPhrases = function(phrases, isSemanticSearch = false) {
  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');

  if (!phrases || phrases.length === 0) {
    phrasesContainer.innerHTML = `
      <div class="mydictionary-placeholder">
        ${this.t('sidebar.noPhrasesFound', 'No phrases found')}
      </div>
    `;
    return;
  }

  // 按相似度或学术度评分排序
  const sortedPhrases = isSemanticSearch
    ? phrases.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    : phrases.sort((a, b) => b.academicScore - a.academicScore);

  // 生成短语卡片
  const phrasesHTML = sortedPhrases.map(phrase => {
    const stars = '⭐'.repeat(Math.round(phrase.academicScore / 20));
    const similarityBadge = isSemanticSearch && phrase.similarityPercent
      ? `<span class="mydictionary-similarity-badge">${phrase.similarityPercent}% ${this.t('sidebar.similarity', 'Similarity')}</span>`
      : '';

    return `
      <div class="mydictionary-phrase-card" data-phrase-id="${phrase.id}">
        <div class="mydictionary-phrase-header">
          ${similarityBadge}
          <span class="mydictionary-phrase-score">${stars} ${phrase.academicScore}</span>
          <span class="mydictionary-phrase-frequency">${phrase.frequency}</span>
        </div>
        <div class="mydictionary-phrase-content">
          "${phrase.phrase}"
        </div>
        <div class="mydictionary-phrase-usage">
          ${phrase.usage}
        </div>
        <div class="mydictionary-phrase-actions">
          <button class="mydictionary-phrase-copy-btn" data-phrase="${phrase.phrase}">
            📋 ${this.t('sidebar.copyPhrase', 'Copy')}
          </button>
          <button class="mydictionary-tts-btn" data-phrase="${phrase.phrase}" title="Read aloud">
            🔊
          </button>
          ${phrase.examples && phrase.examples.length > 0 ? `
            <button class="mydictionary-phrase-example-btn" data-phrase-id="${phrase.id}">
              💡 ${this.t('sidebar.viewExamples', 'Examples')}
            </button>
          ` : ''}
        </div>
        ${phrase.examples && phrase.examples.length > 0 ? `
          <div class="mydictionary-phrase-examples" id="examples-${phrase.id}" style="display: none;">
            ${phrase.examples.map(ex => `
              <div class="mydictionary-phrase-example">${ex}</div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  phrasesContainer.innerHTML = phrasesHTML;

  // 绑定复制按钮事件
  const copyBtns = phrasesContainer.querySelectorAll('.mydictionary-phrase-copy-btn');
  copyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phrase = e.target.dataset.phrase;
      this.copyToClipboard(phrase);
      btn.textContent = '✅ Copied!';
      setTimeout(() => {
        btn.textContent = `📋 ${this.t('sidebar.copyPhrase', 'Copy')}`;
      }, 2000);
    });
  });

  // 绑定例句展开按钮事件
  const exampleBtns = phrasesContainer.querySelectorAll('.mydictionary-phrase-example-btn');
  exampleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const phraseId = e.target.dataset.phraseId;
      const examplesDiv = phrasesContainer.querySelector(`#examples-${phraseId}`);
      if (examplesDiv) {
        const isHidden = examplesDiv.style.display === 'none';
        examplesDiv.style.display = isHidden ? 'block' : 'none';
        btn.textContent = isHidden ? '▲ Hide' : `💡 ${this.t('sidebar.viewExamples', 'Examples')}`;
      }
    });
  });

  // 绑定 TTS 按钮事件
  const ttsBtns = phrasesContainer.querySelectorAll('.mydictionary-tts-btn');
  ttsBtns.forEach((btn, index) => {
    const phrase = btn.dataset.phrase;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await ttsButtonHelper.handleClick(btn, phrase);
    });
  });
};

/**
 * 处理学术短语搜索
 */
/**
 * 切换搜索模式（关键词 / 语义）
 */
UIManager.prototype.switchSearchMode = async function(mode) {
  console.log('🔄 切换搜索模式:', mode);

  // 更新按钮状态
  const tabs = this.sidebar.querySelectorAll('.mydictionary-search-mode-tab');
  tabs.forEach(tab => {
    if (tab.dataset.mode === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // 保存当前搜索模式
  this.currentSearchMode = mode;

  // 更新搜索提示
  const searchHint = this.sidebar.querySelector('#mydictionary-search-hint');
  if (mode === 'semantic') {
    searchHint.style.display = 'block';

    // 检查模型是否已下载
    const isModelDownloaded = await this.checkModelDownloaded('bge-base') ||
                               await this.checkModelDownloaded('bge-small');
    if (!isModelDownloaded) {
      searchHint.innerHTML = `
        ⚠️ ${this.t('sidebar.semanticSearchRequiresModel', 'Semantic search requires downloading the BGE model first')}
        <br>
        <button class="mydictionary-btn-primary mydictionary-btn-small" id="mydictionary-download-bge-btn" style="margin-top: 8px;">
          📥 ${this.t('sidebar.downloadModel', 'Download')} BGE-Base ${this.t('sidebar.model', 'Model')}
        </button>
      `;
      searchHint.style.background = '#fef3c7';
      searchHint.style.borderColor = '#f59e0b';

      // 添加下载按钮事件监听
      setTimeout(() => {
        const downloadBtn = this.sidebar.querySelector('#mydictionary-download-bge-btn');
        if (downloadBtn) {
          downloadBtn.addEventListener('click', async () => {
            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ 正在下载...';

            try {
              const response = await chrome.runtime.sendMessage({
                action: 'downloadModel',
                modelId: 'bge-base',
                modelName: 'BGE-Base'
              });

              if (response.success) {
                searchHint.innerHTML = `💡 ${this.t('sidebar.semanticSearchHint', 'AI will find phrases with similar meanings')}`;
                searchHint.style.background = '#f0f9ff';
                searchHint.style.borderColor = '#667eea';
                this.showStatus('✅ 模型下载完成', 'success');
              } else {
                throw new Error(response.message || '下载失败');
              }
            } catch (error) {
              console.error('❌ 模型下载失败:', error);
              downloadBtn.disabled = false;
              downloadBtn.textContent = `📥 ${this.t('sidebar.downloadModel', 'Download')} BGE-Base ${this.t('sidebar.model', 'Model')}`;
              this.showStatus(`❌ 下载失败: ${error.message}`, 'error');
            }
          });
        }
      }, 0);
    } else {
      searchHint.innerHTML = `💡 ${this.t('sidebar.semanticSearchHint', 'AI will find phrases with similar meanings')}`;
      searchHint.style.background = '#f0f9ff';
      searchHint.style.borderColor = '#667eea';
    }
  } else {
    searchHint.style.display = 'none';
  }

  // 重新执行搜索（如果有搜索内容）
  const searchInput = this.sidebar.querySelector('#mydictionary-academic-search-input');
  if (searchInput.value.trim()) {
    this.handleAcademicSearch();
  }
};

/**
 * 处理学术短语搜索
 */
UIManager.prototype.handleAcademicSearch = async function() {
  const searchInput = this.sidebar.querySelector('#mydictionary-academic-search-input');
  const query = searchInput.value.trim();

  if (!query) {
    // 如果搜索为空，恢复显示当前部分的短语
    this.handleSectionChange();
    return;
  }

  const mode = this.currentSearchMode || 'keyword';
  console.log(`🔍 搜索学术短语 (${mode} 模式):`, query);

  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');
  phrasesContainer.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>${mode === 'semantic' ? 'AI Searching...' : 'Searching...'}</p>
    </div>
  `;

  try {
    const response = await chrome.runtime.sendMessage({
      action: mode === 'semantic' ? 'semanticSearchPhrases' : 'searchPhrases',
      query: query
    });

    if (response.success) {
      const phrases = response.data;
      this.displayAcademicPhrases(phrases, mode === 'semantic');
    } else {
      throw new Error(response.error || 'Search failed');
    }
  } catch (error) {
    console.error('❌ 搜索失败:', error);
    this.showAcademicError(error.message);
  }
};

/**
 * 复制到剪贴板
 */
UIManager.prototype.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('✅ 已复制到剪贴板:', text);
  }).catch(err => {
    console.error('❌ 复制失败:', err);
  });
};

/**
 * 显示学术数据库下载提示
 */
UIManager.prototype.showAcademicDownloadPrompt = function() {
  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');
  phrasesContainer.innerHTML = `
    <div class="mydictionary-download-prompt">
      <!-- 硬件检测部分 -->
      <div class="mydictionary-performance-section" id="mydictionary-performance-section">
        <div class="mydictionary-performance-header">
          <h3>⚡ ${this.t('sidebar.performanceCheck', 'Performance Check')}</h3>
          <button class="mydictionary-btn-secondary mydictionary-btn-small" id="mydictionary-run-performance-check">
            🔍 ${this.t('sidebar.checkHardware', 'Check Hardware')}
          </button>
        </div>
        <div id="mydictionary-performance-results" class="mydictionary-performance-results" style="display: none;">
          <!-- 性能检测结果将在这里显示 -->
        </div>
      </div>

      <div class="mydictionary-divider">
        <span></span>
      </div>

      <!-- 学术短语库下载 -->
      <div class="mydictionary-download-icon">📚</div>
      <h3>${this.t('sidebar.academicDatabase', 'Academic Phrasebank')}</h3>
      <p class="mydictionary-download-description">
        ${this.t('sidebar.academicDatabaseDesc', 'Download 2,500+ academic phrases from University of Manchester')}
      </p>
      <div class="mydictionary-download-info">
        <span>📦 ${this.t('sidebar.size', 'Size')}: ~1.1 MB</span>
        <span>📊 ${this.t('sidebar.phrases', 'Phrases')}: 2,500+</span>
      </div>
      <button class="mydictionary-btn-primary" id="mydictionary-download-academic-btn">
        📥 ${this.t('sidebar.downloadNow', 'Download Now')}
      </button>
      <div id="mydictionary-download-status" class="mydictionary-download-status"></div>

      <div class="mydictionary-divider">
        <span>${this.t('sidebar.or', 'or')}</span>
      </div>

      <div class="mydictionary-import-section">
        <h4>📂 ${this.t('sidebar.importLocal', 'Import Local File')}</h4>
        <p class="mydictionary-import-description">
          ${this.t('sidebar.importLocalDesc', 'Import your own academic phrases from JSON file')}
        </p>
        <input type="file" id="mydictionary-import-file-input" accept=".json" style="display: none;" />
        <button class="mydictionary-btn-secondary" id="mydictionary-import-btn">
          📁 ${this.t('sidebar.selectFile', 'Select JSON File')}
        </button>
        <div id="mydictionary-import-status" class="mydictionary-import-status"></div>
      </div>
    </div>
  `;

  // 绑定性能检测按钮
  this.bindPerformanceCheckButton();

  // 绑定下载按钮
  const downloadBtn = phrasesContainer.querySelector('#mydictionary-download-academic-btn');
  const statusDiv = phrasesContainer.querySelector('#mydictionary-download-status');

  downloadBtn.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    downloadBtn.textContent = `⏳ ${this.t('sidebar.downloading', 'Downloading...')}`;
    statusDiv.innerHTML = '<div class="mydictionary-spinner"></div>';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'downloadAcademicDatabase'
      });

      if (response.success) {
        const successMsg = this.t('sidebar.downloadSuccess', 'Successfully downloaded academic database!');
        statusDiv.innerHTML = `<div class="mydictionary-success">✅ ${successMsg}</div>`;
        this.phrasebankInitialized = true;

        // 延迟后加载短语
        setTimeout(() => {
          this.handleSectionChange();
        }, 1000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ 下载失败:', error);
      statusDiv.innerHTML = `<div class="mydictionary-error">❌ Download failed: ${error.message}</div>`;
      downloadBtn.disabled = false;
      downloadBtn.textContent = `📥 ${this.t('sidebar.downloadNow', 'Download Now')}`;
    }
  });

  // 绑定导入按钮
  const importBtn = phrasesContainer.querySelector('#mydictionary-import-btn');
  const fileInput = phrasesContainer.querySelector('#mydictionary-import-file-input');
  const importStatusDiv = phrasesContainer.querySelector('#mydictionary-import-status');

  importBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    importBtn.disabled = true;
    importBtn.textContent = `⏳ ${this.t('sidebar.importing', 'Importing...')}`;
    importStatusDiv.innerHTML = '<div class="mydictionary-spinner"></div>';

    try {
      // 读取文件
      const fileContent = await file.text();

      // 验证 JSON
      let phrasesData;
      try {
        phrasesData = JSON.parse(fileContent);
      } catch (e) {
        throw new Error(this.t('sidebar.invalidJson', 'Invalid JSON format'));
      }

      // 发送到 background.js 导入
      const response = await chrome.runtime.sendMessage({
        action: 'importLocalPhrases',
        data: phrasesData
      });

      if (response.success) {
        const successMsg = this.t('sidebar.importSuccess', 'Successfully imported phrases!');
        importStatusDiv.innerHTML = `<div class="mydictionary-success">✅ ${successMsg} (${response.data.count} phrases)</div>`;
        this.phrasebankInitialized = true;

        // 延迟后加载短语
        setTimeout(() => {
          this.handleSectionChange();
        }, 1000);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('❌ 导入失败:', error);
      const errorMsg = this.t('sidebar.importError', 'Import failed');
      importStatusDiv.innerHTML = `<div class="mydictionary-error">❌ ${errorMsg}: ${error.message}</div>`;
    } finally {
      importBtn.disabled = false;
      importBtn.textContent = `📁 ${this.t('sidebar.selectFile', 'Select JSON File')}`;
      fileInput.value = ''; // 清空文件选择
    }
  });
};

/**
 * 显示学术模式错误
 */
UIManager.prototype.showAcademicError = function(message) {
  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');

  // 检查是否是模型相关错误，如果是则添加下载按钮
  const isModelError = message.includes('BGE') || message.includes('模型');

  phrasesContainer.innerHTML = `
    <div class="mydictionary-error-container">
      <div class="mydictionary-error-icon">⚠️</div>
      <h4>Error</h4>
      <p class="mydictionary-error-message">${message}</p>
      ${isModelError ? `
        <button class="mydictionary-btn-primary mydictionary-btn-small" id="mydictionary-error-download-btn" style="margin-top: 12px;">
          📥 ${this.t('sidebar.downloadModel', 'Download')} BGE-Base ${this.t('sidebar.model', 'Model')}
        </button>
      ` : ''}
    </div>
  `;

  // 如果是模型错误，添加下载按钮事件
  if (isModelError) {
    setTimeout(() => {
      const downloadBtn = phrasesContainer.querySelector('#mydictionary-error-download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
          downloadBtn.disabled = true;
          downloadBtn.textContent = '⏳ 正在下载...';

          try {
            const response = await chrome.runtime.sendMessage({
              action: 'downloadModel',
              modelId: 'bge-base',
              modelName: 'BGE-Base'
            });

            if (response.success) {
              phrasesContainer.innerHTML = `
                <div class="mydictionary-success-container">
                  <div class="mydictionary-success-icon">✅</div>
                  <h4>${this.t('messages.downloadComplete', 'Download Complete')}</h4>
                  <p>现在可以使用语义搜索了！请重新输入查询。</p>
                </div>
              `;
              this.showStatus('✅ 模型下载完成', 'success');
            } else {
              throw new Error(response.message || '下载失败');
            }
          } catch (error) {
            console.error('❌ 模型下载失败:', error);
            downloadBtn.disabled = false;
            downloadBtn.textContent = `📥 ${this.t('sidebar.downloadModel', 'Download')} BGE-Base ${this.t('sidebar.model', 'Model')}`;
            this.showStatus(`❌ 下载失败: ${error.message}`, 'error');
          }
        });
      }
    }, 0);
  }
};

/**
 * 处理获取例句
 */
UIManager.prototype.handleGetExamples = async function() {
  console.log('💡 例句按钮被点击');

  const output = this.sidebar.querySelector('#mydictionary-output');
  const input = this.sidebar.querySelector('#mydictionary-input');

  let sourceText, targetWord;

  // 优先使用保存的翻译详情中的原文（英文）
  if (this.lastTranslation && this.lastTranslation.sourceText) {
    sourceText = this.lastTranslation.sourceText;
    console.log('✅ 使用保存的原文:', sourceText);
  } else if (input && input.value.trim()) {
    // 如果没有保存的翻译，使用输入框的文本
    sourceText = input.value.trim();
    console.log('⚠️ 使用输入框文本:', sourceText);
  } else {
    // 既没有保存的翻译也没有输入
    output.innerHTML = `
      <div class="mydictionary-error-container">
        <div class="mydictionary-error-icon">⚠️</div>
        <h4>No Text Available</h4>
        <p class="mydictionary-error-message">Please translate some text or enter text first.</p>
      </div>
    `;
    return;
  }

  // 智能提取目标词汇 (与 handleGetSynonyms 相同的逻辑)
  let markedWordMatch;

  markedWordMatch = sourceText.match(/"([^"]+)"/);
  if (markedWordMatch) {
    targetWord = markedWordMatch[1].trim();
    console.log('✅ 检测到双引号标记:', targetWord);
  } else {
    markedWordMatch = sourceText.match(/\[([^\]]+)\]/);
    if (markedWordMatch) {
      targetWord = markedWordMatch[1].trim();
      console.log('✅ 检测到方括号标记:', targetWord);
    }
  }

  if (!targetWord) {
    const words = sourceText.split(/\s+/);
    targetWord = words.length === 1 ? words[0] : words[0];
    if (words.length > 1) {
      console.log('⚠️ 未标记目标词，使用第一个词:', targetWord);
      console.log('💡 提示: 使用 "word" 或 [word] 标记目标词汇');
    }
  }

  console.log(`💡 获取单词 "${targetWord}" 的例句`);

  // 显示加载状态
  output.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>Finding examples...</p>
    </div>
  `;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getExamples',
      word: targetWord
    });

    if (response.success) {
      const { examples, latency } = response.data;

      // 显示例句列表
      const examplesList = examples.map(ex =>
        `<li class="mydictionary-example-item">
          <p class="mydictionary-example-sentence">${ex.sentence}</p>
          <div class="mydictionary-example-meta">
            <span class="mydictionary-example-source">${ex.source}</span>
            <span class="mydictionary-example-relevance">${ex.relevance}</span>
          </div>
        </li>`
      ).join('');

      output.innerHTML = `
        <div class="mydictionary-examples-result">
          <h3>💡 Examples for "<span class="highlight">${targetWord}</span>"</h3>
          <ul class="mydictionary-examples-list">
            ${examplesList}
          </ul>
          <div class="mydictionary-meta">
            <span>⏱️ ${latency}ms</span>
            <span>📦 all-MiniLM-L6-v2</span>
          </div>
        </div>
      `;
    } else {
      throw new Error(response.error || 'Failed to get examples');
    }
  } catch (error) {
    console.error('❌ 例句获取失败:', error);
    output.innerHTML = `
      <div class="mydictionary-error-container">
        <div class="mydictionary-error-icon">⚠️</div>
        <h4>Examples Error</h4>
        <p class="mydictionary-error-message">${error.message}</p>
      </div>
    `;
  }
};

/**
 * 绑定主面板的性能检测按钮 (已下载状态)
 */
UIManager.prototype.bindMainPerformanceCheckButton = function() {
  const checkBtn = this.sidebar.querySelector('#mydictionary-run-performance-check-main');
  const resultsDiv = this.sidebar.querySelector('#mydictionary-performance-results-main');

  if (!checkBtn) return;

  // 移除旧的事件监听器
  const newBtn = checkBtn.cloneNode(true);
  checkBtn.parentNode.replaceChild(newBtn, checkBtn);

  newBtn.addEventListener('click', async () => {
    // 显示加载状态
    newBtn.disabled = true;
    newBtn.innerHTML = '⏳ ' + (this.t('sidebar.checking', 'Checking...') || 'Checking...');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div class="mydictionary-loading-container">
        <div class="mydictionary-spinner"></div>
        <p>${this.t('sidebar.analyzingHardware', 'Analyzing your hardware...')}</p>
      </div>
    `;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'detectPerformance'
      });

      if (response.success) {
        this.displayPerformanceResults(response.data, 'main');
        // 恢复按钮状态
        newBtn.disabled = false;
        newBtn.innerHTML = '✅ ' + (this.t('sidebar.checkComplete', 'Check Complete') || 'Check Complete');
      } else {
        throw new Error(response.error || 'Performance check failed');
      }
    } catch (error) {
      console.error('❌ 性能检测失败:', error);
      resultsDiv.innerHTML = `
        <div class="mydictionary-error-container">
          <div class="mydictionary-error-icon">⚠️</div>
          <p class="mydictionary-error-message">${error.message}</p>
        </div>
      `;
      newBtn.disabled = false;
      newBtn.innerHTML = '🔍 ' + (this.t('sidebar.checkHardware', 'Check Hardware') || 'Check Hardware');
    }
  });
};

/**
 * 绑定性能检测按钮事件 (下载提示页面)
 */
UIManager.prototype.bindPerformanceCheckButton = function() {
  const checkBtn = this.sidebar.querySelector('#mydictionary-run-performance-check');
  const resultsDiv = this.sidebar.querySelector('#mydictionary-performance-results');

  if (!checkBtn) return;

  checkBtn.addEventListener('click', async () => {
    // 显示加载状态
    checkBtn.disabled = true;
    checkBtn.innerHTML = '⏳ ' + (this.t('sidebar.checking', 'Checking...') || 'Checking...');
    resultsDiv.style.display = 'block';
    resultsDiv.innerHTML = `
      <div class="mydictionary-loading-container">
        <div class="mydictionary-spinner"></div>
        <p>${this.t('sidebar.analyzingHardware', 'Analyzing your hardware...')}</p>
      </div>
    `;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'detectPerformance'
      });

      if (response.success) {
        this.displayPerformanceResults(response.data);
        // 恢复按钮状态
        checkBtn.disabled = false;
        checkBtn.innerHTML = '✅ ' + (this.t('sidebar.checkComplete', 'Check Complete') || 'Check Complete');
      } else {
        throw new Error(response.error || 'Performance check failed');
      }
    } catch (error) {
      console.error('❌ 性能检测失败:', error);
      resultsDiv.innerHTML = `
        <div class="mydictionary-error-container">
          <div class="mydictionary-error-icon">⚠️</div>
          <p class="mydictionary-error-message">${error.message}</p>
        </div>
      `;
      checkBtn.disabled = false;
      checkBtn.innerHTML = '🔍 ' + (this.t('sidebar.checkHardware', 'Check Hardware') || 'Check Hardware');
    }
  });
};

/**
 * 显示性能检测结果
 * @param {Object} data - 性能检测数据
 * @param {String} target - 'main' 或 undefined (下载提示页)
 */
UIManager.prototype.displayPerformanceResults = function(data, target = '') {
  const { level, capabilities, benchmark, recommendation } = data;
  const containerId = target === 'main'
    ? '#mydictionary-performance-results-main'
    : '#mydictionary-performance-results';
  const resultsDiv = this.sidebar.querySelector(containerId);

  if (!resultsDiv) return;

  // 性能等级图标和颜色
  const levelConfig = {
    high: { icon: '🚀', color: '#10b981', label: 'High Performance' },
    medium: { icon: '👍', color: '#f59e0b', label: 'Medium Performance' },
    low: { icon: '💡', color: '#6b7280', label: 'Low Performance' }
  };

  const config = levelConfig[level] || levelConfig.medium;

  // 硬件信息卡片
  const hardwareHTML = `
    <div class="mydictionary-performance-card">
      <div class="mydictionary-performance-level" style="color: ${config.color};">
        <span class="mydictionary-performance-icon">${config.icon}</span>
        <span class="mydictionary-performance-label">${config.label}</span>
      </div>
      <div class="mydictionary-hardware-specs">
        <div class="mydictionary-spec-item">
          <span class="mydictionary-spec-label">💻 CPU Cores:</span>
          <span class="mydictionary-spec-value">${capabilities.cpuCores}</span>
        </div>
        <div class="mydictionary-spec-item">
          <span class="mydictionary-spec-label">💾 Memory:</span>
          <span class="mydictionary-spec-value">${capabilities.memory} GB</span>
        </div>
        <div class="mydictionary-spec-item">
          <span class="mydictionary-spec-label">🎮 WebGPU:</span>
          <span class="mydictionary-spec-value">${capabilities.webgpu ? '✅ Supported' : '❌ Not Available'}</span>
        </div>
        <div class="mydictionary-spec-item">
          <span class="mydictionary-spec-label">🎨 WebGL:</span>
          <span class="mydictionary-spec-value">${capabilities.webgl ? '✅ Supported' : '❌ Not Available'}</span>
        </div>
      </div>
    </div>
  `;

  // 基准测试结果
  const benchmarkHTML = `
    <div class="mydictionary-benchmark-card">
      <h4>📊 Benchmark Results</h4>
      <div class="mydictionary-benchmark-scores">
        <div class="mydictionary-score-item">
          <span class="mydictionary-score-label">CPU Score:</span>
          <span class="mydictionary-score-value">${benchmark.cpuScore.toFixed(1)}/100</span>
        </div>
        <div class="mydictionary-score-item">
          <span class="mydictionary-score-label">Memory Score:</span>
          <span class="mydictionary-score-value">${benchmark.memoryScore.toFixed(1)}/100</span>
        </div>
        <div class="mydictionary-score-item">
          <span class="mydictionary-score-label">Total Score:</span>
          <span class="mydictionary-score-value">${benchmark.totalScore.toFixed(1)}/100</span>
        </div>
      </div>
    </div>
  `;

  // 推荐配置 (使用双语翻译)
  const getText = (key, fallback) => {
    const keys = key.split('.');
    let value = this.i18n[this.currentLang];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || fallback || key;
  };

  const featuresHTML = recommendation.featureKeys
    .map(key => `<li class="mydictionary-feature-item">${getText(key)}</li>`)
    .join('');

  const recommendationHTML = `
    <div class="mydictionary-recommendation-card">
      <h4>💡 ${getText('sidebar.recommendation', 'Recommendation')}</h4>
      <div class="mydictionary-recommendation-message">
        ${getText(recommendation.messageKey)}
      </div>
      <div class="mydictionary-suggested-model">
        <strong>🎯 ${getText('sidebar.suggestedModel', 'Suggested Model')}:</strong> ${recommendation.suggestedModelFullName}
      </div>
      <ul class="mydictionary-features-list">
        ${featuresHTML}
      </ul>
      ${recommendation.downloadModelPrompt ? `
        <button class="mydictionary-btn-primary mydictionary-btn-small" id="mydictionary-download-model-btn">
          📥 ${getText('sidebar.downloadModel', 'Download')} ${recommendation.suggestedModel} ${getText('sidebar.model', 'Model')}
        </button>
      ` : ''}
    </div>
  `;

  // 组合所有内容
  resultsDiv.innerHTML = hardwareHTML + benchmarkHTML + recommendationHTML;

  // 检查模型是否已下载并更新UI
  if (recommendation.downloadModelPrompt) {
    const modelId = recommendation.suggestedModel.toLowerCase();
    this.checkModelDownloaded(modelId).then(isDownloaded => {
      const downloadModelBtn = resultsDiv.querySelector('#mydictionary-download-model-btn');
      if (downloadModelBtn) {
        if (isDownloaded) {
          // 模型已下载，显示已下载状态
          downloadModelBtn.textContent = `✅ ${getText('sidebar.modelDownloaded', 'Model Downloaded')}`;
          downloadModelBtn.disabled = true;
          downloadModelBtn.classList.add('mydictionary-btn-disabled');
        } else {
          // 模型未下载，绑定下载事件
          downloadModelBtn.addEventListener('click', () => {
            this.handleModelDownload(recommendation.suggestedModelFullName);
          });
        }
      }
    });
  }
};

/**
 * 检查模型是否已下载
 */
UIManager.prototype.checkModelDownloaded = async function(modelId) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'checkModelDownloaded',
      modelId: modelId
    });
    // 支持两种响应格式: isDownloaded 或 downloaded
    return response.success && (response.isDownloaded || response.downloaded);
  } catch (error) {
    console.error('❌ 检查模型下载状态失败:', error);
    return false;
  }
};

/**
 * 处理模型下载
 */
UIManager.prototype.handleModelDownload = async function(modelName) {
  console.log('📥 准备下载模型:', modelName);

  // 提取模型标识符 (例如: "BGE-Base (Academic Semantic Search)" → "bge-base")
  const modelId = modelName.split(' ')[0].toLowerCase();

  // 根据模型类型确定下载大小
  let downloadSize = '~150MB';
  if (modelId.includes('base')) {
    downloadSize = '~270MB';
  } else if (modelId.includes('small')) {
    downloadSize = '~130MB';
  } else if (modelId.includes('minilm')) {
    downloadSize = '~90MB';
  }

  // 显示下载确认对话框
  const confirmed = confirm(
    `Download ${modelName}?\n\n` +
    `This will download approximately ${downloadSize} of data.\n` +
    `The model will be cached in your browser for offline use.\n\n` +
    `Continue?`
  );

  if (!confirmed) {
    console.log('❌ 用户取消下载');
    return;
  }

  // 创建下载状态显示
  const resultsDiv = this.sidebar.querySelector('#mydictionary-performance-results-main') ||
                     this.sidebar.querySelector('#mydictionary-performance-results');

  if (resultsDiv) {
    resultsDiv.innerHTML = `
      <div class="mydictionary-model-download-progress">
        <h4>📥 Downloading ${modelName}...</h4>
        <div class="mydictionary-progress-bar">
          <div class="mydictionary-progress-fill" id="mydictionary-download-progress"></div>
        </div>
        <p class="mydictionary-download-status" id="mydictionary-download-status">
          Initializing download...
        </p>
      </div>
    `;
  }

  try {
    // 发送下载请求到 background
    const response = await chrome.runtime.sendMessage({
      action: 'downloadModel',
      modelId: modelId,
      modelName: modelName
    });

    if (response.success) {
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="mydictionary-success-container">
            <div class="mydictionary-success-icon">✅</div>
            <h4>Model Downloaded Successfully!</h4>
            <p>${modelName} is now ready to use.</p>
            <button class="mydictionary-btn-primary mydictionary-btn-small"
                    onclick="location.reload()">
              Refresh to Enable
            </button>
          </div>
        `;
      }
    } else {
      throw new Error(response.error || 'Download failed');
    }
  } catch (error) {
    console.error('❌ 模型下载失败:', error);
    if (resultsDiv) {
      resultsDiv.innerHTML = `
        <div class="mydictionary-error-container">
          <div class="mydictionary-error-icon">⚠️</div>
          <h4>Download Failed</h4>
          <p class="mydictionary-error-message">${error.message}</p>
          <button class="mydictionary-btn-secondary mydictionary-btn-small"
                  onclick="this.closest('.mydictionary-error-container').remove()">
            Close
          </button>
        </div>
      `;
    }
  }
};

/**
 * TTS 按钮辅助类
 */
class TTSButtonHelper {
  constructor() {
    this.activeButtons = new Map(); // 跟踪活跃的 TTS 按钮
  }

  /**
   * 创建 TTS 按钮
   * @param {string} text - 要朗读的文本
   * @param {string} buttonId - 按钮唯一 ID (可选)
   * @returns {HTMLElement} TTS 按钮元素
   */
  createButton(text, buttonId = null) {
    const btn = document.createElement('button');
    btn.className = 'mydictionary-tts-btn';
    btn.innerHTML = '🔊';
    btn.title = 'Read aloud';
    btn.setAttribute('data-text', text);

    if (buttonId) {
      btn.setAttribute('data-btn-id', buttonId);
    }

    // 检查 TTS 是否可用
    this.checkAndUpdateButtonState(btn);

    // 添加点击事件
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleClick(btn, text);
    });

    return btn;
  }

  /**
   * 检查并更新按钮状态
   */
  async checkAndUpdateButtonState(btn) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkTTSAvailable'
      });

      if (!response.success || !response.available) {
        // TTS 不可用，禁用按钮并显示红叉
        btn.innerHTML = '🔇';  // 静音图标表示TTS不可用
        btn.disabled = true;
        btn.classList.add('disabled');
        btn.title = 'TTS 服务器未运行 - 点击查看设置';
      }
    } catch (error) {
      // TTS 不可用，禁用按钮并显示红叉（不在console输出错误）
      btn.innerHTML = '🔇';  // 静音图标表示TTS不可用
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.title = 'TTS 服务器未运行 - 点击查看设置';
    }
  }

  /**
   * 处理按钮点击
   */
  async handleClick(btn, text) {
    try {
      // 如果按钮禁用（TTS 不可用），显示配置对话框
      if (btn.disabled && btn.classList.contains('disabled')) {
        if (window.uiManager && typeof window.uiManager.showTTSConfigDialog === 'function') {
          window.uiManager.showTTSConfigDialog('TTS 服务器未运行');
        } else {
          // 如果 uiManager 不可用，直接跳转到设置页面
          chrome.runtime.sendMessage({
            action: 'openTab',
            url: chrome.runtime.getURL('src/settings/settings.html')
          });
        }
        return;
      }

      // 如果正在播放，停止
      if (btn.classList.contains('playing')) {
        this.stopTTS(btn);
        return;
      }

      // 停止其他正在播放的按钮
      this.stopAllOtherButtons(btn);

      // 设置加载状态
      btn.innerHTML = '⏳';
      btn.disabled = true;
      btn.classList.add('loading');

      // 发送 TTS 请求到 background
      const response = await chrome.runtime.sendMessage({
        action: 'speakText',
        text: text
      });

      if (response.success) {
        // 设置播放状态
        btn.innerHTML = '⏸️';
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.classList.add('playing');
        btn.title = 'Stop';

        // 添加到活跃按钮列表
        const btnId = btn.getAttribute('data-btn-id') || `btn-${Date.now()}`;
        this.activeButtons.set(btnId, btn);

      } else {
        throw new Error(response.error || 'TTS 请求失败');
      }

    } catch (error) {
      // 恢复按钮状态为禁用
      btn.innerHTML = '🔇';  // 静音图标
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.classList.remove('loading', 'playing', 'error');
      btn.title = 'TTS 服务器未运行 - 点击查看设置';

      // 显示 TTS 配置引导对话框（不在console输出错误）
      if (window.uiManager && typeof window.uiManager.showTTSConfigDialog === 'function') {
        window.uiManager.showTTSConfigDialog(error.message);
      } else {
        // 如果 uiManager 不可用，直接跳转到设置页面
        chrome.runtime.sendMessage({
          action: 'openTab',
          url: chrome.runtime.getURL('src/settings/settings.html')
        });
      }
    }
  }

  /**
   * 停止 TTS
   */
  stopTTS(btn) {
    chrome.runtime.sendMessage({
      action: 'stopTTS'
    }).then(() => {
      this.resetButton(btn);
    }).catch(error => {
      console.error('❌ 停止 TTS 失败:', error);
      this.resetButton(btn);
    });
  }

  /**
   * 停止所有其他按钮
   */
  stopAllOtherButtons(currentBtn) {
    for (const [btnId, btn] of this.activeButtons.entries()) {
      if (btn !== currentBtn) {
        this.resetButton(btn);
      }
    }
    this.activeButtons.clear();
  }

  /**
   * 重置按钮状态
   */
  resetButton(btn) {
    btn.innerHTML = '🔊';
    btn.disabled = false;
    btn.classList.remove('loading', 'playing', 'error');
    btn.title = 'Read aloud';
  }

  /**
   * 监听来自 background 的播放结束事件
   */
  listenToBackgroundEvents() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'TTS_PLAYBACK_ENDED') {
        // 重置所有播放中的按钮
        for (const [btnId, btn] of this.activeButtons.entries()) {
          this.resetButton(btn);
        }
        this.activeButtons.clear();
      } else if (message.type === 'TTS_PLAYBACK_ERROR') {
        // 显示错误
        console.error('❌ TTS 播放错误:', message.error);
        for (const [btnId, btn] of this.activeButtons.entries()) {
          btn.innerHTML = '❌';
          btn.classList.remove('loading', 'playing');
          btn.classList.add('error');

          setTimeout(() => {
            this.resetButton(btn);
          }, 2000);
        }
        this.activeButtons.clear();
      }
    });
  }
}

// 创建全局 TTS 按钮辅助实例
const ttsButtonHelper = new TTSButtonHelper();
ttsButtonHelper.listenToBackgroundEvents();

console.log('✅ MyDictionary Content Script 初始化完成');
