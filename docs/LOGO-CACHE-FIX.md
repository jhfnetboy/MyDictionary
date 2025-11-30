# Logo 缓存问题解决方案

## 问题描述

**症状**:
- Logo 文件已更新 (11月30日 14:00)
- 清除浏览器缓存后 logo 仍然显示旧版本
- 版本号显示 v0.1.0 而不是 v0.1.4

## 根本原因

Chrome 扩展使用了**多层缓存机制**:

1. **浏览器缓存**: `chrome://settings/clearBrowserData` 可清除
2. **扩展资源缓存**: Chrome 内部缓存,普通清除无效
3. **Service Worker 缓存**: background.js 可能缓存了资源
4. **磁盘缓存**: Chrome 扩展的磁盘缓存

## 完整解决方案

### 方法 1: 强制刷新扩展 (推荐) ⭐

这是最彻底的方法:

1. **打开扩展管理页面**:
   ```
   chrome://extensions/
   ```

2. **找到 MyDictionary 扩展**

3. **点击 "移除" 按钮**:
   - 这会完全卸载扩展
   - 清除所有缓存

4. **重新加载扩展**:
   - 点击 "加载已解压的扩展程序"
   - 选择项目目录
   - 这会重新加载所有资源

5. **验证**:
   - 打开任意网页
   - 选中文本按 `Cmd+Shift+D`
   - 检查侧边栏顶部 logo
   - 检查底部版本号

### 方法 2: 更新版本号触发刷新

Chrome 会在版本号变化时强制刷新资源:

```json
// manifest.json
{
  "version": "0.1.5"  // 从 0.1.4 改为 0.1.5
}
```

**步骤**:
1. 修改 `manifest.json` 版本号
2. 在 `chrome://extensions/` 点击刷新图标 🔄
3. Chrome 会重新加载所有资源

### 方法 3: 添加时间戳参数 (开发调试用)

在开发过程中,可以给资源 URL 添加时间戳:

```javascript
// content.js (临时调试用)
const logoUrl = chrome.runtime.getURL(`assets/logo-64.png?v=${Date.now()}`);
```

**注意**: 这只是临时方案,不要提交到代码库

### 方法 4: 清除 Chrome 所有数据 (终极方案)

如果以上方法都无效:

1. **关闭 Chrome 浏览器**

2. **删除扩展缓存文件夹**:
   ```bash
   # macOS
   rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extensions/<extension-id>
   rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/*

   # Windows
   # C:\Users\<用户名>\AppData\Local\Google\Chrome\User Data\Default\Extensions
   # 删除对应的扩展文件夹
   ```

3. **重新打开 Chrome**

4. **重新加载扩展**

## 验证步骤

执行以下检查确认 logo 已更新:

### 1. 检查文件时间戳
```bash
ls -lah assets/logo-64.png
# 应该显示: Nov 30 14:00
```

### 2. 检查文件内容
```bash
md5 assets/logo-64.png
# 记录 MD5 值,与旧 logo 对比
```

### 3. 检查运行时资源
1. 打开侧边栏 (`Cmd+Shift+D`)
2. 右键点击 logo → "在新标签页打开图片"
3. 查看 URL 是否包含最新的扩展 ID
4. 刷新该标签页,查看是否是新 logo

### 4. 检查版本号
1. 打开侧边栏
2. 滚动到底部
3. 查看版本号:
   - **应该显示**: v0.1.4 或 v0.1.5
   - **如果显示**: v0.1.0,说明代码未更新

## 版本号不匹配问题

### 问题: 显示 v0.1.0 而不是 v0.1.4

**原因**: `content.js` 中硬编码了版本号

**检查**:
```bash
grep "version.*0\.1\." content.js
```

**应该看到**:
```javascript
const version = '0.1.4';  // ✅ 正确
```

**如果看到**:
```javascript
const version = '0.1.0';  // ❌ 错误,需要更新
```

**修复**:
```javascript
// content.js - 找到这一行并更新
const version = '0.1.4';  // 或 '0.1.5'
```

## 自动化解决方案

创建一个脚本自动同步版本号:

```bash
#!/bin/bash
# scripts/sync-version.sh

# 从 manifest.json 读取版本号
VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)

echo "Manifest version: $VERSION"

# 更新 content.js 中的版本号
sed -i.bak "s/const version = '.*'/const version = '$VERSION'/" content.js

echo "✅ Version synced to $VERSION"

# 清理备份文件
rm content.js.bak
```

使用:
```bash
chmod +x scripts/sync-version.sh
./scripts/sync-version.sh
```

## 预防措施

### 1. 使用动态版本号

不要在代码中硬编码版本号,而是从 manifest 读取:

```javascript
// content.js
const manifest = chrome.runtime.getManifest();
const version = manifest.version;  // 自动同步
```

**优势**:
- 永远保持同步
- 只需更新 manifest.json 一处

### 2. 开发时使用不同的扩展 ID

开发版和生产版使用不同的扩展 ID,避免缓存混淆:

```json
// manifest.json (开发版)
{
  "name": "MyDictionary (Dev)",
  "version": "0.1.4-dev"
}
```

### 3. 添加资源版本控制

在构建时给资源文件添加哈希:

```
assets/logo-64.abc123.png
```

## 当前问题的快速修复

**立即执行以下步骤**:

```bash
# 1. 确认当前在 academic-writing 分支
git branch

# 2. 检查 content.js 版本号
grep "const version" content.js

# 3. 如果显示 0.1.0,修复它
# (在下一步中我会帮你修复)

# 4. 移除并重新加载扩展
# - 打开 chrome://extensions/
# - 点击 MyDictionary 的"移除"
# - 点击"加载已解压的扩展程序"
# - 选择项目目录

# 5. 验证
# - 打开侧边栏
# - 检查 logo (应该是新的)
# - 检查版本号 (应该是 v0.1.4)
```

## 总结

**Logo 不更新的原因**:
1. ✅ Chrome 扩展强缓存 (最可能)
2. ⏳ 文件未实际更新 (已排除,时间戳正确)
3. ⏳ 路径错误 (已排除,路径正确)

**版本号错误的原因**:
1. ⏳ content.js 硬编码版本号未更新

**解决方案**:
1. **立即**: 移除并重新加载扩展 (100% 有效)
2. **长期**: 使用 `chrome.runtime.getManifest().version`
3. **开发**: 每次更新版本号后都移除重装

## 下一步

我现在会:
1. 检查 content.js 的版本号
2. 如果是 0.1.0,更新为 0.1.4
3. 提交修复
4. 指导你重新加载扩展
