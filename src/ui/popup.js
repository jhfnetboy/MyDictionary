/**
 * MyDictionary - Popup Script
 */

// 打开翻译面板按钮
document.getElementById('open-sidebar-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleSidebar'
  });

  // 关闭 popup
  window.close();
});

// 设置按钮
document.getElementById('settings-btn').addEventListener('click', () => {
  // 未来实现设置页面
  alert('设置功能即将推出!');
});

console.log('🦊 MyDictionary Popup 已加载');
