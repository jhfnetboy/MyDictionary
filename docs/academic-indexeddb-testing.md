# Academic IndexedDB Implementation - Testing Guide

## 功能概述

学术短语库已从 JSON 文件加载方式迁移到 IndexedDB 数据库,采用按需下载模式。

## 测试步骤

### 1. 加载插件
```bash
1. Chrome 浏览器打开 chrome://extensions/
2. 确保"开发者模式"已开启
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录
```

### 2. 首次使用 - 下载提示

#### 预期行为:
1. 在任意网页选中文本
2. 按 `Cmd+Shift+D` (Mac) 或 `Ctrl+Shift+D` (Windows) 打开侧边栏
3. 点击 "Academic Writing" 标签
4. 应该看到下载提示界面:
   - 📚 图标(带浮动动画)
   - 标题: "Academic Phrasebank"
   - 描述: "Download 120+ curated academic phrases for research writing"
   - 信息卡片:
     - 📦 Size: ~50 KB
     - 📊 Phrases: 120+
   - "📥 Download Now" 按钮

#### 测试用例 2.1: 点击下载
1. 点击 "📥 Download Now" 按钮
2. 按钮应该禁用,显示 "Downloading..."
3. 下载状态区域显示加载动画
4. 几秒钟后显示成功消息: "✅ Successfully downloaded 120+ academic phrases!"

#### 测试用例 2.2: 验证数据库
1. 打开 Chrome DevTools (F12)
2. 切换到 "Application" 标签
3. 左侧菜单 → Storage → IndexedDB
4. 展开 "MyDictionary_Academic"
5. 点击 "phrases" object store
6. 应该看到 120+ 条记录

### 3. 已下载状态 - 正常使用

#### 预期行为:
下载完成后刷新页面,再次打开 Academic Writing 标签:

1. 不再显示下载提示
2. 显示 Section 选择器
3. 默认加载 "Introduction" 部分的短语

#### 测试用例 3.1: 浏览不同部分
1. Section 下拉菜单选择 "Methods"
2. 应该显示 Methods 相关的学术短语
3. 每个短语卡片包含:
   - Academic Score (学术度评分)
   - Frequency 标签
   - 短语内容(斜体,带紫色边框)
   - 使用说明
   - 复制按钮

#### 测试用例 3.2: 搜索短语
1. 在搜索框输入 "study"
2. 应该实时过滤显示包含 "study" 的短语
3. 搜索结果按学术度评分降序排列

#### 测试用例 3.3: 复制短语
1. 点击任意短语卡片的 "📋 Copy" 按钮
2. 短语应该被复制到剪贴板
3. 在文本编辑器粘贴验证

### 4. 后台日志检查

#### Service Worker 日志:
1. chrome://extensions/ → 点击 "Service Worker"
2. 查看 console 输出

**预期日志 (首次下载)**:
```
📚 Initializing Academic IndexedDB...
✅ Academic IndexedDB opened
📥 Importing academic phrases to IndexedDB...
✅ Imported 120 phrases to Academic DB
```

**预期日志 (已下载)**:
```
📚 Academic DB already initialized
📊 Academic DB contains 120 phrases
```

#### Content Script 日志:
1. 在网页打开 DevTools Console
2. 切换到 Academic Writing 标签

**预期日志 (首次)**:
```
✅ Successfully downloaded academic database: 120 phrases
```

**预期日志 (已下载)**:
```
✅ Found 15 phrases for section: introduction
```

### 5. 数据完整性测试

#### 测试用例 5.1: 验证数据结构
在 Console 中运行:
```javascript
// 打开数据库
const request = indexedDB.open('MyDictionary_Academic', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('phrases', 'readonly');
  const store = tx.objectStore('phrases');
  const getAllRequest = store.getAll();

  getAllRequest.onsuccess = () => {
    const phrases = getAllRequest.result;
    console.log('Total phrases:', phrases.length);
    console.log('Sample phrase:', phrases[0]);

    // 验证字段
    const sample = phrases[0];
    console.log('Has id:', !!sample.id);
    console.log('Has phrase:', !!sample.phrase);
    console.log('Has section:', !!sample.section);
    console.log('Has academicScore:', typeof sample.academicScore === 'number');
  };
};
```

#### 测试用例 5.2: 索引查询测试
```javascript
const request = indexedDB.open('MyDictionary_Academic', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('phrases', 'readonly');
  const store = tx.objectStore('phrases');

  // 测试 section 索引
  const index = store.index('section');
  const sectionRequest = index.getAll('introduction');

  sectionRequest.onsuccess = () => {
    console.log('Introduction phrases:', sectionRequest.result.length);
  };
};
```

### 6. 错误场景测试

#### 测试用例 6.1: 网络断开
1. 删除 IndexedDB: Application → IndexedDB → 右键 "MyDictionary_Academic" → Delete
2. 关闭网络连接 (飞行模式或禁用网络)
3. 刷新页面,打开 Academic Writing 标签
4. 点击 Download 按钮
5. **预期**: 应该显示错误信息 (因为无法加载 JSON 数据)

#### 测试用例 6.2: 重复下载
1. 在已下载状态下,手动触发下载
2. 在 Console 运行:
```javascript
chrome.runtime.sendMessage({
  action: 'downloadAcademicDatabase'
}, (response) => {
  console.log('Download response:', response);
});
```
3. **预期**: 数据库被清空后重新导入,总数不变

### 7. 性能测试

#### 测试用例 7.1: 查询速度
在 Console 测量查询耗时:
```javascript
console.time('Search Query');
chrome.runtime.sendMessage({
  action: 'searchPhrases',
  query: 'research'
}, (response) => {
  console.timeEnd('Search Query');
  console.log('Results:', response.data.length);
});
```
**预期**: < 100ms

#### 测试用例 7.2: 数据库大小
1. Application → Storage → IndexedDB
2. 查看 "MyDictionary_Academic" 大小
3. **预期**: ~50-100 KB

## 常见问题排查

### 问题 1: 下载后仍显示下载提示
**原因**: 数据库检查失败
**排查**:
1. 检查 Service Worker console 是否有错误
2. 验证 IndexedDB 中是否有数据
3. 刷新页面重试

### 问题 2: 搜索无结果
**原因**: 查询逻辑或索引问题
**排查**:
1. 检查搜索关键词是否存在于短语中
2. 尝试搜索简单词汇如 "the", "study"
3. 查看 Service Worker console 的查询日志

### 问题 3: 短语卡片样式错误
**原因**: CSS 未正确加载
**排查**:
1. 确认 sidebar.css 已更新
2. 强制刷新插件 (chrome://extensions/ → 刷新图标)
3. 清除浏览器缓存

## 成功标准

✅ 所有测试用例通过
✅ 无 console 错误
✅ IndexedDB 包含 120+ 条记录
✅ 查询速度 < 100ms
✅ UI 显示正确,无样式问题
✅ 下载→使用流程顺畅

## 下一步

测试通过后:
1. 合并 `academic-writing` 分支到 `main`
2. 更新 CHANGELOG.md
3. 发布 v0.1.5
4. 未来扩展: 增加短语数量至 2000+
