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

// 打开翻译面板按钮
document.getElementById('open-sidebar-btn').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 检查是否是特殊页面（chrome:// 等）
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://')) {
      const msg = currentLang === 'zh'
        ? '⚠️ 无法在浏览器内部页面使用 MyDictionary。\n请打开一个普通网页（如 https://google.com）。'
        : '⚠️ Cannot use MyDictionary on browser internal pages.\nPlease open a regular webpage (e.g., https://google.com).';
      alert(msg);
      return;
    }

    console.log('📤 Popup 发送 toggleSidebar 消息到 tab:', tab.id, tab.url);

    // 发送消息并等待响应
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSidebar'
    });

    console.log('✅ 收到响应:', response);

    // 等待消息发送完成后再关闭 popup
    setTimeout(() => {
      window.close();
    }, 100);
  } catch (error) {
    console.error('❌ Popup 发送消息失败:', error);

    // 如果是 content script 未注入的错误
    if (error.message.includes('Could not establish connection')) {
      const msg = currentLang === 'zh'
        ? '⚠️ 请先刷新页面！\n\nContent script 未加载。请尝试：\n1. 刷新网页 (F5)\n2. 或访问一个普通网页'
        : '⚠️ Please refresh the page first!\n\nContent script not loaded. Try:\n1. Refresh the webpage (F5)\n2. Or navigate to a regular webpage';
      alert(msg);
    }

    // 延迟关闭，让用户看到错误提示
    setTimeout(() => {
      window.close();
    }, 100);
  }
});

// 设置按钮
document.getElementById('settings-btn').addEventListener('click', () => {
  const msg = currentLang === 'zh' ? '设置功能即将推出!' : 'Settings feature coming soon!';
  alert(msg);
});

// 初始化
loadLanguage();

console.log('🦝 MyDictionary Popup 已加载');
