# TTS 功能测试清单

## 📋 快速测试步骤

### 1️⃣ 加载扩展
```bash
# 构建项目
pnpm run build

# Chrome 浏览器
chrome://extensions/
→ 开启"开发者模式"
→ 点击"加载已解压的扩展程序"
→ 选择 dist 目录
```

### 2️⃣ 测试 TTS 按钮 (3个位置)

#### 位置 1: 翻译输入框
1. 打开任意网页
2. 按 `Ctrl+Shift+D` (Mac: `Cmd+Shift+D`) 打开侧边栏
3. 在输入框输入文本 (如 "Hello World")
4. 点击输入框右上角的 🔊 按钮
5. ✅ **预期**: 应该听到语音播放

#### 位置 2: 翻译结果框
1. 在输入框输入文本并点击"翻译"
2. 翻译结果旁边有 🔊 按钮
3. 点击按钮
4. ✅ **预期**: 应该听到翻译结果的语音

#### 位置 3: 学术写作短语
1. 切换到 "Academic Writing" 标签
2. 浏览短语列表 (每个短语右侧有 🔊)
3. 点击任意短语的 🔊 按钮
4. ✅ **预期**: 应该听到短语的语音

### 3️⃣ 首次使用测试

**首次点击 🔊 时应该看到**:
1. Service Worker Console:
   ```
   ✅ Offscreen document 创建成功
   🔊 开始加载 TTS 模型 (SpeechT5)...
   📥 TTS 模型下载进度: 10.2%
   📥 TTS 模型下载进度: 35.8%
   ...
   ✅ TTS 模型加载完成!
   🎵 生成 TTS: "Hello World"
   🎵 音频已发送到 Offscreen Document
   ```

2. Offscreen Console (在 chrome://extensions/ 点击 Offscreen Document 链接):
   ```
   [Offscreen] Audio Player 已初始化
   [Offscreen] 收到消息: playAudio
   [Offscreen] 开始播放
   [Offscreen] 播放结束
   ```

### 4️⃣ 错误检查

**❌ 如果看到这些错误,说明修复失败**:
- `AudioContext is not defined`
- `ReferenceError: AudioContext is not defined`
- 按钮显示 ❌ 并报错

**✅ 修复成功的标志**:
- 首次使用有下载进度提示
- 听到清晰的语音播放
- 按钮状态: 🔊 → ⏳ → 🔊 (正常循环)
- 无任何控制台错误

---

## 🔍 调试工具

### Service Worker Console
```
chrome://extensions/
→ 找到 MyDictionary
→ 点击 "Service Worker" 链接
```

### Offscreen Document Console
```
chrome://extensions/
→ 找到 MyDictionary
→ 在 Offscreen Document 行点击 "inspect"
```

### Content Script Console
```
在任意网页按 F12
→ Console 标签
→ 筛选 "mydictionary" 或 "TTS"
```

---

## 📊 性能指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 首次模型下载 | < 30s | SpeechT5 模型 ~120MB |
| 后续加载 | < 1s | 模型已缓存 |
| TTS 生成耗时 | < 2s | 生成 10 词以内的音频 |
| 播放延迟 | < 100ms | Offscreen Document 响应 |
| 内存占用 | < 200MB | 模型加载后 |

---

## 🐛 常见问题

### Q: 点击 🔊 没反应?
**A**:
1. 打开 Service Worker Console 查看日志
2. 检查是否有 "Offscreen document 创建成功" 消息
3. 确认 dist 目录包含 `src/offscreen/` 文件

### Q: 长时间 Loading (⏳)?
**A**:
1. 首次使用需要下载模型 (~30s)
2. 检查网络连接 (下载自 Hugging Face CDN)
3. 查看 Service Worker Console 的下载进度

### Q: 如何重新测试?
**A**:
```javascript
// 在 Service Worker Console 运行
chrome.storage.local.clear()  // 清除缓存
location.reload()             // 重载 Service Worker
```

---

**测试时间**: 2025-11-30
**修复版本**: v0.1.5
**相关提交**: 0bb0451, 8995efd
