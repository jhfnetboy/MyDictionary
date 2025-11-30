# MyDictionary - 权限说明文档
# Permissions Justification for Chrome Web Store Review

## 插件用途 (Extension Purpose)
MyDictionary 是一个完全本地运行的 AI 词典插件，提供翻译、同义词、例句功能，所有 AI 处理在本地完成，不向服务器发送任何数据。

## 权限清单 (Permissions Justification)

### 1. storage
**用途**: 存储用户设置（语言偏好、快捷键配置）和翻译缓存
**Why needed**: Store user preferences (language settings, shortcuts) and translation cache
**数据存储**: 仅本地存储，不上传服务器
**Privacy**: Data stays local, never sent to servers

### 2. activeTab
**用途**: 读取用户在当前页面选中的文本进行翻译
**Why needed**: Read user-selected text on the current page for translation
**触发时机**: 仅当用户主动选中文本并点击图标或快捷键时触发
**User action**: Only activated when user selects text and triggers the extension

### 3. contextMenus
**用途**: 在右键菜单中添加"翻译"选项
**Why needed**: Add "Translate" option to the context menu
**用户控制**: 用户可通过右键菜单主动调用翻译功能
**User control**: User initiates translation via right-click menu

### 4. scripting
**用途**: 在某些受限页面动态注入 content script（仅作为 fallback）
**Why needed**: Dynamically inject content script on certain pages (fallback only)
**使用场景**: 仅当静态注入失败时使用（如页面动态加载内容）
**Use case**: Only used when static injection fails (e.g., dynamic page content)

### 5. notifications
**用途**: 显示友好的错误提示和操作反馈
**Why needed**: Show user-friendly error messages and operation feedback
**示例场景**:
- 在浏览器受限页面（chrome://、edge://）提示用户无法使用
- 下载同义词数据库完成时的通知
**Examples**:
- Notify users when extension cannot work on restricted pages (chrome://, edge://)
- Notify when synonym database download completes

## 网络请求 (Network Requests)
**❌ 无外部网络请求** - 所有数据和 AI 模型在本地运行
**No external network requests** - All data and AI models run locally

## 数据隐私 (Data Privacy)
- ✅ 不收集用户数据
- ✅ 不向服务器发送任何信息
- ✅ 所有 AI 推理在本地浏览器完成
- ✅ 翻译历史仅存储在本地

**Privacy Guarantees**:
- No user data collection
- No data sent to servers
- All AI inference runs locally in browser
- Translation history stored locally only

## Chrome Web Store 合规性
- ✅ 最小权限原则 (Minimum permissions principle)
- ✅ 所有权限都有明确用途 (All permissions justified)
- ✅ 用户主动触发 (User-initiated actions)
- ✅ 无隐藏功能 (No hidden functionality)
- ✅ 完全本地化 (Fully local operation)
