# 🚨 学术模式加载失败 - 紧急修复指南

## 错误信息

```
❌ Error: Failed to load academic phrasebank
❌ 学术短语库初始化失败: Error: Failed to fetch
❌ Failed to fetch
```

## 根本原因

这是因为我们正在从 JSON 加载迁移到 IndexedDB,但有几个可能的问题:

1. **Service Worker 缓存**: 旧代码还在运行
2. **JSON 文件路径**: academic-phrasebank.json 位置问题
3. **manifest.json**: web_accessible_resources 配置问题

## 🔥 立即修复 (5分钟)

### 步骤 1: 完全重启 Service Worker

1. **打开 Chrome**: `chrome://extensions/`

2. **找到 MyDictionary**

3. **点击 "Service Worker"** 链接
   - 这会打开 Service Worker 的 DevTools

4. **在 Console 中执行**:
   ```javascript
   self.skipWaiting();
   location.reload();
   ```

5. **关闭 DevTools**

6. **刷新扩展**:
   - 在 chrome://extensions/ 页面
   - 点击 MyDictionary 的刷新图标 🔄

### 步骤 2: 验证文件存在

```bash
# 检查 JSON 文件是否存在
ls -lah /Users/jason/Dev/crypto-projects/MyDictionary/academic-phrasebank.json

# 应该看到:
# -rw-r--r--  1 jason  staff    30K Nov 30 XX:XX academic-phrasebank.json
```

如果文件不存在,这是问题所在!

### 步骤 3: 检查 manifest.json 配置

```bash
# 检查 web_accessible_resources 是否包含 JSON 文件
grep -A 15 "web_accessible_resources" manifest.json | grep "academic-phrasebank"
```

应该看到:
```json
"academic-phrasebank.json"
```

### 步骤 4: 完全移除并重装扩展

这是最彻底的方法:

1. **chrome://extensions/**
2. **移除 MyDictionary**
3. **关闭所有 Chrome 窗口**
4. **重新打开 Chrome**
5. **chrome://extensions/**
6. **加载已解压的扩展程序**
7. **选择项目文件夹**

### 步骤 5: 测试

1. **打开任意网页**
2. **选中文本,按 Cmd+Shift+D**
3. **点击 "Academic Writing" 标签**
4. **应该看到下载提示**
5. **点击 "Download Now"**

## 诊断检查清单

### 检查 1: JSON 文件位置

```bash
find /Users/jason/Dev/crypto-projects/MyDictionary -name "academic-phrasebank.json" -type f
```

**预期结果**:
```
/Users/jason/Dev/crypto-projects/MyDictionary/academic-phrasebank.json
```

**如果没找到**: 文件丢失,需要重新创建

### 检查 2: background.js 导入

```bash
head -15 /Users/jason/Dev/crypto-projects/MyDictionary/background.js | grep academic
```

**预期结果**:
```javascript
import { academicDBManager } from './src/lib/academic-db-manager.js';
import phrasebankData from './academic-phrasebank.json' assert { type: 'json' };
```

### 检查 3: Service Worker 日志

1. **chrome://extensions/**
2. **点击 MyDictionary 的 "Service Worker" 链接**
3. **查看 Console**

**预期日志**:
```
🦝 MyDictionary Background Service Worker 已启动
⚠️ 学术短语库未下载，首次使用学术模式时将提示下载
```

**错误日志**:
```
❌ Failed to load phrasebank from file: TypeError: Failed to fetch
```

如果看到错误,继续下一步。

### 检查 4: IndexedDB 状态

1. **打开任意网页**
2. **F12 打开 DevTools**
3. **Application 标签**
4. **左侧 Storage → IndexedDB**
5. **查找 MyDictionary_Academic**

**如果存在**: 数据库已创建,但可能为空
**如果不存在**: 正常,首次使用会提示下载

## 常见问题和解决方案

### 问题 1: "Failed to fetch" JSON 文件

**原因**: Service Worker 无法访问 JSON 文件

**解决方案 A**: 检查文件路径
```bash
# 确保文件在项目根目录
ls -lah academic-phrasebank.json

# 如果不存在,从 git 恢复
git checkout academic-phrasebank.json
```

**解决方案 B**: 检查 manifest.json
```json
{
  "web_accessible_resources": [
    {
      "resources": [
        "academic-phrasebank.json"  // 必须包含这一行
      ],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 问题 2: Service Worker 卡在旧代码

**症状**: 即使刷新扩展,仍显示旧错误

**解决方案**:
```bash
# 1. 打开 chrome://serviceworker-internals/
# 2. 找到 MyDictionary
# 3. 点击 "Unregister"
# 4. 回到 chrome://extensions/
# 5. 刷新 MyDictionary
```

### 问题 3: IndexedDB 未初始化

**症状**: 点击 Academic Writing 标签没反应

**解决方案**:
1. 打开 Service Worker console
2. 手动初始化:
   ```javascript
   import { academicDBManager } from './src/lib/academic-db-manager.js';
   await academicDBManager.initialize();
   console.log('✅ Initialized');
   ```

### 问题 4: "Cannot set properties of null"

**原因**: UI 元素未找到

**解决方案**: 检查 content.js 是否正确注入
```bash
# 在网页的 DevTools Console 中
console.log(document.querySelector('.mydictionary-sidebar'));
# 应该返回一个元素,不是 null
```

## 完整重置流程

如果所有方法都失败,执行完全重置:

```bash
# 1. 切换到正确的分支
cd /Users/jason/Dev/crypto-projects/MyDictionary
git checkout academic-writing

# 2. 拉取最新代码
git pull

# 3. 检查文件完整性
ls -lah academic-phrasebank.json
ls -lah src/lib/academic-db-manager.js

# 4. 清除 Chrome 扩展缓存
# chrome://extensions/
# 移除 MyDictionary

# 5. 清除 IndexedDB
# F12 → Application → IndexedDB
# 右键 MyDictionary_Academic → Delete database

# 6. 重启 Chrome 浏览器

# 7. 重新加载扩展
# chrome://extensions/
# 加载已解压的扩展程序

# 8. 测试
# 打开网页 → Cmd+Shift+D → Academic Writing 标签
```

## 预期的正常流程

### 首次使用 Academic Writing 标签

1. **点击标签**
2. **看到下载提示**:
   ```
   📚 Academic Phrasebank

   Download 120+ curated academic phrases
   for research writing

   📦 Size: ~50 KB
   📊 Phrases: 120+

   [📥 Download Now]
   ```

3. **点击 Download Now**
4. **按钮变为 "Downloading..."**
5. **3-5 秒后显示**:
   ```
   ✅ Successfully downloaded 120+ academic phrases!
   ```

6. **自动加载短语列表**

### Service Worker 日志 (正常)

```
🦝 MyDictionary Background Service Worker 已启动
⚠️ 学术短语库未下载，首次使用学术模式时将提示下载
📚 Initializing Academic IndexedDB...
✅ Academic IndexedDB opened
📥 Importing academic phrases to IndexedDB...
✅ Imported 120 phrases to Academic DB
```

### Content Script 日志 (正常)

```
📚 Initializing academic phrasebank...
✅ Successfully downloaded academic database: 120 phrases
```

## 调试命令

在 Service Worker Console 中运行:

```javascript
// 检查数据库状态
import { academicDBManager } from './src/lib/academic-db-manager.js';

const downloaded = await academicDBManager.isDataDownloaded();
console.log('Database downloaded:', downloaded);

if (downloaded) {
  const info = await academicDBManager.getInfo();
  console.log('Database info:', info);
} else {
  console.log('Database is empty, need to download');
}

// 手动导入数据
import phrasebankData from './academic-phrasebank.json' assert { type: 'json' };
const count = await academicDBManager.importPhrases(phrasebankData);
console.log('Imported phrases:', count);
```

## 需要帮助?

如果按照以上步骤仍无法解决,请提供:

1. **Service Worker Console 的完整日志**
2. **Content Script Console 的错误**
3. **执行以下命令的输出**:
   ```bash
   ls -lah academic-phrasebank.json
   git branch
   grep -A 2 "web_accessible_resources" manifest.json
   ```

4. **Screenshots**:
   - Service Worker console
   - Network 标签 (查看 academic-phrasebank.json 请求)
   - Application → IndexedDB

我会根据这些信息进一步诊断!

---

## 快速修复命令汇总

```bash
# 1. 确认分支和文件
git checkout academic-writing
ls -lah academic-phrasebank.json

# 2. Chrome 操作
# - chrome://extensions/
# - 移除 MyDictionary
# - 重启 Chrome
# - 重新加载扩展

# 3. 测试
# - 打开网页
# - Cmd+Shift+D
# - Academic Writing 标签
# - 点击 Download Now
```

立即执行步骤 4 (完全移除并重装),这应该能解决问题! 🚀
