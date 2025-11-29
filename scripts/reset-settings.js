#!/usr/bin/env node

/**
 * Reset MyDictionary Settings to Default
 * 重置 MyDictionary 设置为默认值
 *
 * 使用方法:
 * 1. 在浏览器打开: chrome://extensions/
 * 2. 找到 MyDictionary 扩展
 * 3. 点击 "Service Worker" 链接打开控制台
 * 4. 在控制台中运行以下代码:
 *
 * chrome.storage.local.clear().then(() => console.log('✅ 设置已重置为默认值,请重新加载扩展'));
 *
 * 或者只重置界面语言:
 *
 * chrome.storage.local.set({ uiLanguage: 'en' }).then(() => console.log('✅ 界面语言已重置为英文'));
 */

console.log('📝 重置设置说明:');
console.log('');
console.log('请在 Chrome 扩展的 Service Worker Console 中执行:');
console.log('');
console.log('// 重置所有设置');
console.log("chrome.storage.local.clear().then(() => console.log('✅ 设置已重置'));");
console.log('');
console.log('// 或只重置界面语言为英文');
console.log("chrome.storage.local.set({ uiLanguage: 'en' }).then(() => console.log('✅ 语言已重置为英文'));");
console.log('');
