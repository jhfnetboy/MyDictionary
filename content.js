/**
 * MyDictionary - Content Script
 * 负责网页交互和 UI 管理
 */

console.log('🦊 MyDictionary Content Script 已加载');

// UI 管理器
class UIManager {
  constructor() {
    this.sidebar = null;
    this.sidebarVisible = false;
  }

  /**
   * 创建侧边栏
   */
  createSidebar() {
    if (this.sidebar) return;

    // 创建侧边栏容器
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'mydictionary-sidebar';
    this.sidebar.className = 'mydictionary-sidebar';

    this.sidebar.innerHTML = `
      <div class="mydictionary-header">
        <span class="mydictionary-title">🦊 MyDictionary</span>
        <button class="mydictionary-close" id="mydictionary-close-btn">✕</button>
      </div>

      <div class="mydictionary-content">
        <div class="mydictionary-input-section">
          <label>从</label>
          <select id="mydictionary-source-lang">
            <option value="auto">🌐 自动检测</option>
            <option value="en">🇺🇸 English</option>
            <option value="zh">🇨🇳 中文</option>
          </select>

          <textarea
            id="mydictionary-input"
            placeholder="在此输入文本..."
            rows="4"
          ></textarea>

          <button id="mydictionary-translate-btn" class="mydictionary-btn-primary">
            翻译
          </button>
        </div>

        <div class="mydictionary-output-section">
          <label>翻译为</label>
          <select id="mydictionary-target-lang">
            <option value="zh">🇨🇳 中文</option>
            <option value="en">🇺🇸 English</option>
          </select>

          <div id="mydictionary-output" class="mydictionary-output">
            <div class="mydictionary-placeholder">翻译结果将显示在这里...</div>
          </div>
        </div>

        <div id="mydictionary-status" class="mydictionary-status"></div>
      </div>
    `;

    document.body.appendChild(this.sidebar);

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
  showSidebar(text = '') {
    if (!this.sidebar) {
      this.createSidebar();
    }

    // 填充文本(如果有)
    if (text) {
      const input = this.sidebar.querySelector('#mydictionary-input');
      input.value = text;

      // 自动翻译
      setTimeout(() => this.handleTranslate(), 100);
    }

    // 添加显示类触发动画
    setTimeout(() => {
      this.sidebar.classList.add('show');
      this.sidebarVisible = true;
    }, 10);
  }

  /**
   * 隐藏侧边栏
   */
  hideSidebar() {
    if (!this.sidebar) return;

    this.sidebar.classList.remove('show');
    this.sidebarVisible = false;
  }

  /**
   * 切换侧边栏显示/隐藏
   */
  toggleSidebar() {
    if (this.sidebarVisible) {
      this.hideSidebar();
    } else {
      this.showSidebar();
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
      this.showStatus('请输入要翻译的文本', 'warning');
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
    output.innerHTML = '<div class="mydictionary-loading">翻译中...</div>';
    this.showStatus('正在翻译...', 'info');

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
        this.showStatus('✅ 翻译完成', 'success');
      } else if (response.error === 'MODEL_NOT_INSTALLED') {
        // 模型未安装,提示用户下载
        this.showModelNotInstalledDialog(response.requiredModel);
      } else {
        throw new Error(response.message || response.error);
      }
    } catch (error) {
      console.error('❌ 翻译失败:', error);
      output.innerHTML = '<div class="mydictionary-error">翻译失败,请重试</div>';
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
   * 显示模型未安装对话框
   */
  showModelNotInstalledDialog(modelInfo) {
    const output = this.sidebar.querySelector('#mydictionary-output');
    output.innerHTML = `
      <div class="mydictionary-model-dialog">
        <h3>⚠️ 模型未安装</h3>
        <p>需要下载 <strong>${modelInfo.name}</strong> 才能使用此功能</p>
        <p>大小: ${modelInfo.size}MB</p>
        <button id="mydictionary-download-model-btn" class="mydictionary-btn-primary">
          立即下载
        </button>
        <button id="mydictionary-cancel-btn" class="mydictionary-btn-secondary">
          稍后提醒
        </button>
      </div>
    `;

    // 绑定下载按钮事件
    const downloadBtn = output.querySelector('#mydictionary-download-model-btn');
    downloadBtn.addEventListener('click', async () => {
      this.showStatus('正在下载模型...', 'info');
      output.innerHTML = '<div class="mydictionary-loading">正在下载模型,请稍候...</div>';

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'downloadModel',
          modelId: modelInfo.id
        });

        if (response.success) {
          this.showStatus('✅ 模型下载完成,可以开始翻译了!', 'success');
          output.innerHTML = '<div class="mydictionary-placeholder">翻译结果将显示在这里...</div>';
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        this.showStatus(`❌ 下载失败: ${error.message}`, 'error');
        output.innerHTML = '<div class="mydictionary-error">下载失败,请重试</div>';
      }
    });

    const cancelBtn = output.querySelector('#mydictionary-cancel-btn');
    cancelBtn.addEventListener('click', () => {
      output.innerHTML = '<div class="mydictionary-placeholder">翻译结果将显示在这里...</div>';
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

  switch (request.action) {
    case 'openSidebar':
      uiManager.showSidebar(request.text);
      break;

    case 'toggleSidebar':
      uiManager.toggleSidebar();
      break;

    default:
      console.log('未知的操作:', request.action);
  }

  sendResponse({ success: true });
  return true;
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
