# TTS 功能测试指南

**版本**: v0.1.6-dev (feat/tts-voice)
**测试日期**: 2025-11-30

---

## 📋 测试准备

### 1. 加载插件
```bash
# 1. 构建项目
pnpm run build

# 2. 在 Chrome 打开扩展管理页面
# chrome://extensions/

# 3. 开启"开发者模式"
# 4. 点击"加载已解压的扩展程序"
# 5. 选择项目的 dist/ 文件夹
```

### 2. 检查 Service Worker
```
1. 在 chrome://extensions/ 中找到 MyDictionary
2. 点击 "Service Worker" 查看控制台
3. 确认没有错误，看到: "✅ MyDictionary Background Service Worker 已启动"
```

---

## 🧪 测试场景

### 场景 1: 学术短语 TTS (核心功能)

**步骤**:
1. 打开任意网页 (如 https://www.google.com)
2. 按 `Cmd+Shift+D` (Mac) 或 `Ctrl+Shift+D` (Windows) 打开侧边栏
3. 切换到 **Academic Writing** 标签
4. 如果未下载短语库，点击 "📥 Download Now"
5. 选择任意 Section (如 Introduction)
6. 找到任意学术短语，点击旁边的 🔊 按钮

**预期结果**:
- ✅ 按钮状态变化: 🔊 → ⏳ → ⏸️
- ✅ 首次使用时，后台开始下载 SpeechT5 模型 (~120 MB)
- ✅ Service Worker 控制台显示:
  ```
  📥 TTS 模型下载进度: X%
  ⏳ TTS 模型加载中...
  ✅ TTS 模型加载完成!
  🔊 TTS 请求: "This study aims to..."
  🎵 生成 TTS: "This study aims to..."
  ✅ TTS 生成完成，耗时: XXXms
  🎵 开始播放
  ```
- ✅ 听到短语的英文朗读
- ✅ 播放完成后按钮恢复: ⏸️ → 🔊

**测试点**:
- [ ] 首次下载模型 (约 1-3 分钟)
- [ ] 下载进度显示正常
- [ ] 模型下载后永久缓存 (关闭浏览器重新打开无需重新下载)
- [ ] 音频播放流畅
- [ ] 按钮状态切换正确

---

### 场景 2: 停止播放

**步骤**:
1. 点击任意学术短语的 🔊 按钮开始播放
2. 播放过程中，再次点击同一个 ⏸️ 按钮

**预期结果**:
- ✅ 音频立即停止
- ✅ 按钮恢复到 🔊 状态
- ✅ Service Worker 控制台显示: "🛑 播放已停止"

---

### 场景 3: 切换播放 (自动停止前一个)

**步骤**:
1. 点击第一个短语的 🔊 按钮开始播放
2. 播放过程中，点击第二个短语的 🔊 按钮

**预期结果**:
- ✅ 第一个按钮自动恢复到 🔊 状态
- ✅ 第一个音频停止
- ✅ 第二个按钮变为 ⏸️ 并开始播放新的音频

---

### 场景 4: 语义搜索模式 TTS

**步骤**:
1. 在 Academic Writing 模式下，切换到 "🧠 Semantic" 搜索标签
2. 输入搜索词 (如 "research")
3. 点击搜索结果中任意短语的 🔊 按钮

**预期结果**:
- ✅ TTS 功能正常工作
- ✅ 相似度百分比 badge 正常显示
- ✅ 🔊 按钮位于 badge 旁边

---

### 场景 5: 错误处理

**步骤**:
1. 关闭网络连接 (测试首次下载失败)
2. 点击 🔊 按钮

**预期结果**:
- ✅ 按钮显示 ❌ 错误状态 (红色)
- ✅ 2 秒后自动恢复到 🔊
- ✅ Service Worker 控制台显示错误信息

---

### 场景 6: 长文本 TTS

**步骤**:
1. 找一个较长的学术短语 (如 "This study aims to investigate the relationship between...")
2. 点击 🔊 按钮

**预期结果**:
- ✅ TTS 生成时间稍长 (~1-2秒)
- ✅ 音频播放完整，不截断
- ✅ 发音清晰，无卡顿

---

### 场景 7: 浏览器缓存验证

**步骤**:
1. 首次完整下载并使用 TTS 功能
2. 完全关闭 Chrome 浏览器
3. 重新打开浏览器和插件
4. 再次点击 🔊 按钮

**预期结果**:
- ✅ 无需重新下载模型
- ✅ 首次点击延迟 ~2-3 秒 (加载模型到内存)
- ✅ 后续点击延迟 ~800ms (仅 TTS 生成时间)

---

## 🐛 已知问题

### Issue 1: ONNX Runtime Warning
**现象**: Service Worker 控制台出现 warning:
```
[W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs]
Removing initializer '/model/decoder/Shape_4_output_0'
```

**状态**: ✅ **正常行为**
**解释**: ONNX Runtime 自动优化模型，清理未使用的权重
**影响**: 无影响，可忽略

---

### Issue 2: 首次下载时间较长
**现象**: 首次点击 🔊 需要等待 1-3 分钟

**状态**: ✅ **预期行为**
**原因**: SpeechT5 模型大小 ~120 MB，需从 Hugging Face CDN 下载
**解决方案**:
- 显示下载进度条 (已实现)
- 提供用户提示 (待实现)

---

## 📊 性能指标

### 目标值
| 指标 | 目标 | 实测 |
|------|------|------|
| 首次模型下载 | < 3 分钟 | _待测试_ |
| 模型加载 (首次) | < 5 秒 | _待测试_ |
| TTS 生成 (短句) | < 1 秒 | _待测试_ |
| TTS 生成 (长句) | < 2 秒 | _待测试_ |
| 内存占用 | < 200 MB | _待测试_ |

---

## ✅ 测试清单

### 功能测试
- [ ] 学术短语 TTS 播放
- [ ] 停止播放功能
- [ ] 切换播放 (自动停止前一个)
- [ ] 语义搜索模式 TTS
- [ ] 错误处理
- [ ] 长文本 TTS
- [ ] 浏览器缓存验证

### 兼容性测试
- [ ] Chrome 113+ (WebGPU)
- [ ] Chrome 90-112 (WASM Fallback)
- [ ] Mac OS
- [ ] Windows
- [ ] Linux

### 性能测试
- [ ] 首次下载时间
- [ ] 模型加载时间
- [ ] TTS 生成延迟
- [ ] 内存占用
- [ ] CPU 占用

---

## 🔧 调试技巧

### 查看 Service Worker 日志
```javascript
// 在 Service Worker 控制台中手动测试
chrome.runtime.sendMessage({
  action: 'checkTTSStatus'
}, (response) => {
  console.log('TTS Status:', response);
});

// 手动播放
chrome.runtime.sendMessage({
  action: 'speakText',
  text: 'Hello world'
}, (response) => {
  console.log('TTS Response:', response);
});

// 停止播放
chrome.runtime.sendMessage({
  action: 'stopTTS'
}, (response) => {
  console.log('Stop Response:', response);
});
```

### 查看模型缓存
```javascript
// 打开 Chrome DevTools -> Application -> IndexedDB
// 查找 transformers-cache 数据库
// 应该包含 Xenova/speecht5_tts 相关文件
```

### 清除缓存 (重新测试首次下载)
```javascript
// 在 Service Worker 控制台执行
indexedDB.deleteDatabase('transformers-cache');
location.reload();
```

---

## 📝 测试报告模板

```markdown
### TTS 功能测试报告

**测试人**: [姓名]
**测试时间**: 2025-11-30
**浏览器**: Chrome [版本]
**操作系统**: [Mac/Windows/Linux]

#### 功能测试
- [x] 学术短语 TTS 播放 - ✅ 通过
- [x] 停止播放功能 - ✅ 通过
- [x] 切换播放 - ✅ 通过
- [ ] 语义搜索模式 TTS - ❌ 失败 (原因: XXX)

#### 性能数据
- 首次下载时间: 2分15秒
- TTS 生成延迟: 850ms
- 内存占用: 180MB

#### 发现的问题
1. [描述问题]
2. [描述问题]

#### 建议
1. [改进建议]
2. [改进建议]
```

---

**下一步**: 完成测试后，根据反馈决定是否合并到 main 分支
