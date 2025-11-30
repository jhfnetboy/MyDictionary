# 🚀 Logo 缓存问题 - 立即修复指南

## 当前情况

- ✅ Logo 文件已更新 (11月30日 14:00)
- ✅ 代码已修复 (刚刚提交)
- ❌ 浏览器仍显示旧 logo (缓存问题)

## 立即执行 (5分钟解决)

### 步骤 1: 切换到修复分支

```bash
# 确认当前在 academic-writing 分支
git branch

# 如果不在,切换到该分支
git checkout academic-writing

# 拉取最新修复
git pull
```

### 步骤 2: 完全移除扩展

1. 打开 Chrome 浏览器
2. 地址栏输入: `chrome://extensions/`
3. 找到 **MyDictionary** 扩展
4. 点击 **"移除"** 按钮
5. 确认移除

**为什么要移除?**
- 清除所有扩展缓存
- 清除 Service Worker 缓存
- 清除磁盘缓存
- 这是最彻底的方法

### 步骤 3: 重新加载扩展

1. 仍在 `chrome://extensions/` 页面
2. 确保 **"开发者模式"** 已开启 (右上角开关)
3. 点击 **"加载已解压的扩展程序"**
4. 导航到项目文件夹:
   ```
   /Users/jason/Dev/crypto-projects/MyDictionary
   ```
5. 点击 **"选择"**

### 步骤 4: 验证修复

1. **打开任意网页** (如 https://www.google.com)

2. **选中一段文本**

3. **按快捷键**: `Cmd+Shift+D` (Mac) 或 `Ctrl+Shift+D` (Windows)

4. **检查侧边栏**:
   - ✅ 顶部 logo 应该是新版本
   - ✅ 底部版本号应该显示 **v0.1.4**

5. **检查 logo URL**:
   - 右键点击 logo → "在新标签页中打开图片"
   - URL 应该包含: `assets/logo-64.png?v=0.1.4`
   - `?v=0.1.4` 是缓存破坏参数

### 步骤 5: 最终确认

如果仍显示旧 logo,执行以下操作:

```bash
# 1. 查看 logo 文件时间戳
ls -lah assets/logo-64.png

# 应该显示:
# -rw-r--r--@ 1 jason  staff   8.7K Nov 30 14:00 assets/logo-64.png

# 2. 查看文件内容哈希
md5 assets/logo-64.png

# 记录这个值,后面会用到
```

## 如果还是不行 (高级方法)

### 方法 A: 更新版本号

```bash
# 1. 编辑 manifest.json
# 将 "version": "0.1.4" 改为 "version": "0.1.5"

# 2. 在 chrome://extensions/ 点击刷新图标 🔄

# 3. 重新打开侧边栏验证
```

**原理**: Chrome 会识别版本号变化,强制刷新所有资源

### 方法 B: 清除 Chrome 所有扩展缓存

```bash
# 1. 完全关闭 Chrome

# 2. 删除扩展缓存 (macOS)
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Extensions/*
rm -rf ~/Library/Caches/Google/Chrome/Default/Cache/*

# Windows 用户:
# 删除 C:\Users\<用户名>\AppData\Local\Google\Chrome\User Data\Default\Extensions
# 删除 C:\Users\<用户名>\AppData\Local\Google\Chrome\User Data\Default\Cache

# 3. 重新打开 Chrome

# 4. 重新加载扩展
```

## 代码修复说明

我刚刚做了以下修复:

### 1. 动态版本号
```javascript
// Before (硬编码,容易不同步)
const version = '0.1.4';

// After (动态读取,永远同步)
const version = chrome.runtime.getManifest().version;
```

### 2. Logo 缓存破坏
```javascript
// Before (会被缓存)
chrome.runtime.getURL('assets/logo-64.png')

// After (版本变化时自动更新)
chrome.runtime.getURL(`assets/logo-64.png?v=${version}`)
```

**工作原理**:
- 当版本从 0.1.4 → 0.1.5
- Logo URL 从 `logo-64.png?v=0.1.4` → `logo-64.png?v=0.1.5`
- Chrome 认为这是新文件,重新加载

## 未来预防

以后更新 logo 时:

1. **更新版本号**:
   ```json
   // manifest.json
   {
     "version": "0.1.5"  // 递增版本号
   }
   ```

2. **替换 logo 文件**:
   ```bash
   cp new-logo.png assets/logo-64.png
   ```

3. **移除并重装扩展**:
   - chrome://extensions/ → 移除 → 重新加载

这样可以 100% 确保 logo 更新!

## 问题排查清单

如果按照上述步骤操作后仍有问题,检查:

- [ ] 是否在正确的分支? (`git branch` 确认)
- [ ] logo-64.png 时间戳是否为 Nov 30 14:00?
- [ ] manifest.json 版本号是否为 0.1.4?
- [ ] 扩展是否完全移除后重新加载?
- [ ] Chrome 是否重启过?
- [ ] 浏览器缓存是否清除? (Cmd+Shift+Delete)

## 预期结果

执行完步骤 1-4 后:

✅ **Logo**: 显示新版本 (Fox 图标)
✅ **版本号**: v0.1.4
✅ **Logo URL**: 包含 `?v=0.1.4` 参数
✅ **缓存**: 不再有旧 logo 缓存

## 需要帮助?

如果仍然无法解决:

1. 发送以下信息:
   ```bash
   ls -lah assets/logo-64.png
   md5 assets/logo-64.png
   git branch
   cat manifest.json | grep version
   ```

2. 截图侧边栏显示的 logo
3. 右键 logo → "在新标签页打开图片" 的 URL

我会进一步分析!

---

## 快速命令汇总

```bash
# 1. 切换分支
git checkout academic-writing

# 2. 验证文件
ls -lah assets/logo-64.png

# 3. 验证版本
grep version manifest.json

# 4. Chrome 操作
# - chrome://extensions/
# - 移除 MyDictionary
# - 加载已解压的扩展程序
# - 选择项目文件夹

# 5. 测试
# - 打开网页
# - Cmd+Shift+D
# - 检查 logo 和版本号
```

现在开始执行步骤 2-4,应该就能解决问题了! 🚀
