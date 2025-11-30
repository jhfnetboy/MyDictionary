# 🧪 学术模式测试清单

## 前提条件

**必须先完成**: 移除并重新加载扩展,清除 Service Worker 缓存
- 参考: `立即修复学术模式.md`

---

## 测试步骤

### 1. 打开侧边栏

- 打开任意网页
- 选中一段文本
- 按 `Cmd+Shift+D` (Mac) 或 `Ctrl+Shift+D` (Windows)
- ✅ 侧边栏应该弹出

### 2. 切换到学术模式

- 点击 **"Academic Writing"** 标签
- ✅ 应该看到下载提示 (不是占位符!)

### 3. 验证下载提示文本

**英文界面** (点击顶部 "中文" 切换):
```
📚 Academic Phrasebank

Download 48 curated academic phrases 
for research writing

📦 Size: ~21 KB
📊 Phrases: 48

[📥 Download Now]
```

**中文界面** (点击顶部 "English" 切换):
```
📚 学术短语库

下载 48 个精选学术写作短语

📦 大小: ~21 KB
📊 短语: 48

[📥 立即下载]
```

❌ **不应该看到**:
```
sidebar.academicDatabase
sidebar.academicDatabaseDesc
📦 sidebar.size: ~50 KB
📊 sidebar.phrases: 120+
```

### 4. 点击下载按钮

- 点击 **"📥 Download Now"** 或 **"📥 立即下载"**
- ✅ 按钮文本变为:
  - 英文: "⏳ Downloading..."
  - 中文: "⏳ 下载中..."
- ✅ 显示加载动画 (spinner)

### 5. 验证下载成功

等待 3-5 秒,应该看到:

**英文**:
```
✅ Successfully downloaded academic database!
```

**中文**:
```
✅ 学术短语库下载成功!
```

❌ **不应该看到**:
```
sidebar.downloadSuccess
```

### 6. 验证短语列表自动加载

下载成功后,1 秒延迟后应该:
- ✅ 成功消息消失
- ✅ 显示 Section 选择器 (Introduction, Methods, Results, etc.)
- ✅ 显示搜索框
- ✅ 显示短语列表 (默认显示 Introduction 部分)

### 7. 测试 Section 切换

- 点击 Section 选择器
- 切换到 **"Methods"**
- ✅ 短语列表应该更新为 Methods 部分的短语

### 8. 测试搜索功能

- 在搜索框输入: **"study"**
- ✅ 短语列表应该过滤,只显示包含 "study" 的短语

### 9. 测试复制短语

- 点击任意短语的 **"Copy"** 或 **"复制"** 按钮
- ✅ 短语应该复制到剪贴板
- ✅ 按钮文本应该短暂变为 "Copied!" 或 "已复制!"

### 10. 验证 About 区域

- 点击 **"⚙️ Settings"** 标签
- 滚动到底部 **"About"** 区域
- ✅ 应该只显示:
  ```
  Made with ❤️ by Jason
  GitHub
  ```
- ❌ **不应该看到**: `MyDictionary v0.1.0`
- ✅ 版本号应该在顶部状态栏显示 (v0.1.4)

---

## Service Worker Console 检查

打开 Service Worker Console:
1. `chrome://extensions/`
2. 找到 MyDictionary
3. 点击 **"Service Worker"** 链接

**预期日志**:

启动时:
```
🦝 MyDictionary Background Service Worker 已启动
⚠️ 学术短语库未下载,首次使用学术模式时将提示下载
```

点击下载后:
```
📥 开始下载学术数据库...
📚 Initializing Academic IndexedDB...
✅ Academic IndexedDB opened
✅ 学术数据库下载完成,共 48 条短语
```

下次启动:
```
🦝 MyDictionary Background Service Worker 已启动
✅ 学术短语库已就绪 (48 条短语)
```

---

## 常见问题排查

### 问题 1: 仍然显示占位符 (sidebar.academicDatabase)

**原因**: 扩展未重新加载或缓存未清除

**解决**:
1. 完全移除扩展
2. 关闭 Chrome
3. 重新打开 Chrome
4. 重新加载扩展

### 问题 2: 仍然显示 "120+" 而不是 "48"

**原因**: content.js 未更新

**解决**:
```bash
git pull
# 确保在 academic-writing 分支
git checkout academic-writing
# 移除并重新加载扩展
```

### 问题 3: 下载失败 "Failed to fetch"

**原因**: Service Worker 缓存问题

**解决**: 参考 `ACADEMIC-MODE-FIX.md`

---

## 成功标准

所有以下项目必须通过:

- ✅ 下载提示显示正确的翻译文本 (不是占位符)
- ✅ 短语数量显示为 48 (不是 120+)
- ✅ 文件大小显示为 ~21 KB (不是 ~50 KB)
- ✅ 下载按钮文本正确 (不是 sidebar.downloadNow)
- ✅ 下载成功消息正确 (不是 sidebar.downloadSuccess)
- ✅ About 区域不显示硬编码版本号
- ✅ 下载完成后短语列表正确加载
- ✅ 中英文切换正常工作

---

## 下一步

测试通过后,可以继续:
1. **添加性能检测 UI** - 推荐 SciBERT 或 IndexedDB
2. **实现本地文件导入** - 允许导入自定义学术短语
3. **扩展短语库** - 从 48 → 500+ → 2000+

---

## 需要帮助?

如果任何测试失败:
1. 查看 Service Worker Console 的错误日志
2. 运行 `./scripts/diagnose-academic-mode.sh`
3. 查看 `ACADEMIC-MODE-FIX.md`
4. 提供详细的错误截图和日志
