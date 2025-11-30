# TTS 双模式使用指南

## 📋 概述

MyDictionary 现在支持 **双模式 TTS**:
1. **本地服务器模式** - 高质量 TTS (支持中英文)
2. **浏览器模式** - 轻量级 TTS (仅英文)

系统会根据配置自动选择最佳模式。

---

## 🎯 三种工作模式

### 1️⃣ Auto 模式 (推荐)
- **优先使用** 本地服务器 (如果可用)
- **自动回退** 到浏览器 TTS (如果服务器不可用)
- **最佳体验**: 高质量 + 可靠性

### 2️⃣ Local-only 模式
- **强制使用** 本地服务器
- 如果服务器不可用，TTS 会失败
- **适用场景**: 需要高质量中文发音

### 3️⃣ Browser-only 模式
- **强制使用** 浏览器 TTS (SpeechT5 ONNX)
- 完全离线，无需本地服务器
- **适用场景**: 仅需英文发音，或网络受限

---

## 🚀 快速开始

### 步骤 1: 安装本地 TTS 服务器 (可选)

如果你想使用高质量 TTS (支持中文),需要先安装本地服务器：

```bash
cd tts-server

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python server.py
```

服务器将在 `http://localhost:5050` 运行。

### 步骤 2: 配置 TTS 模式

1. 点击 Chrome 扩展图标打开 Popup
2. 找到 **🔊 TTS Settings** 区域
3. 选择模式:
   - `Auto (Local → Browser)` - 推荐
   - `Local Server Only` - 仅本地
   - `Browser TTS Only` - 仅浏览器

4. 如果使用本地服务器:
   - 确认 Server URL: `http://localhost:5050`
   - 点击 **Test** 按钮
   - 看到 `✅ Connected` 表示连接成功

### 步骤 3: 选择模型 (本地服务器)

如果本地服务器可用，会显示模型选择器：

1. 选择模型:
   - `SpeechT5 (English)` - 英文，快速
   - `CosyVoice (中英文)` - 中英文，高质量 **(开发中)**

2. 点击 **Load** 按钮加载模型

3. 等待状态显示 `✅ Model loaded`

---

## 🔊 使用 TTS

### 3 个 TTS 按钮位置

1. **翻译输入框** - 右上角 🔊
   - 朗读你输入的文本

2. **翻译结果框** - 结果旁边 🔊
   - 朗读翻译后的文本

3. **学术写作短语** - 每个短语右侧 🔊
   - 朗读学术短语

### 使用示例

**测试英文**:
```
1. 在输入框输入: "Hello World"
2. 点击输入框右上角的 🔊
3. 应该听到英文朗读
```

**测试中文** (需要本地服务器 + CosyVoice):
```
1. 启动本地服务器
2. 在 Popup 中加载 CosyVoice 模型
3. 在输入框输入: "你好世界"
4. 点击 🔊
5. 应该听到自然的中文朗读
```

---

## 🎛️ 工作原理

### Auto 模式流程

```
用户点击 🔊
    ↓
检查模式: Auto
    ↓
检查本地服务器可用性
    ↓
┌─────────────┬─────────────┐
│ 服务器可用   │ 服务器不可用 │
└─────────────┴─────────────┘
      ↓               ↓
  调用本地服务器    使用浏览器 TTS
      ↓               ↓
  POST /synthesize   SpeechT5 ONNX
      ↓               ↓
  返回 WAV 音频    生成 Float32Array
      ↓               ↓
  Offscreen Document 播放
      ↓
  音频输出 🔊
```

### 本地服务器 vs 浏览器 TTS

| 特性 | 本地服务器 | 浏览器 TTS |
|------|------------|------------|
| 语言支持 | 中英文 | 仅英文 |
| 音质 | 高 (9/10) | 中 (6/10) |
| 音量 | 正常 | 偏小 |
| 速度 | 中等 (~2s) | 快 (~1s) |
| 内存占用 | 高 (~2GB) | 低 (~200MB) |
| 离线工作 | ✅ | ✅ |
| 依赖 | Python + Torch | 无 |

---

## 📊 API 使用 (本地服务器)

### 健康检查
```bash
curl http://localhost:5050/health
```

**响应**:
```json
{
  "status": "healthy",
  "device": "cpu",
  "models_loaded": 1,
  "current_model": "speecht5"
}
```

### 获取可用模型
```bash
curl http://localhost:5050/models
```

**响应**:
```json
{
  "success": true,
  "models": [
    {
      "id": "speecht5",
      "name": "SpeechT5 (English)",
      "language": "en",
      "quality": 6,
      "loaded": true,
      "current": true
    }
  ]
}
```

### 加载模型
```bash
curl -X POST http://localhost:5050/models/speecht5/load
```

### 合成语音
```bash
curl -X POST http://localhost:5050/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello World"}' \
  --output test.wav

# 播放
afplay test.wav  # macOS
aplay test.wav   # Linux
```

---

## 🐛 故障排除

### 问题 1: 服务器显示 Offline

**原因**:
- 服务器未启动
- 端口被占用
- 防火墙阻止

**解决**:
```bash
# 检查服务器是否运行
curl http://localhost:5050/

# 检查端口占用
lsof -i :5050

# 手动启动服务器
cd tts-server
python server.py
```

### 问题 2: 模型加载失败

**原因**:
- 内存不足
- 模型下载失败
- CUDA 不可用

**解决**:
```bash
# 检查可用内存
free -h  # Linux
vm_stat  # macOS

# 使用 CPU 模式
CUDA_VISIBLE_DEVICES="" python server.py

# 使用国内镜像下载模型
export HF_ENDPOINT=https://hf-mirror.com
python server.py
```

### 问题 3: 音量太小

**浏览器 TTS**:
- 这是 SpeechT5 模型的固有特性
- 建议使用本地服务器获得更好的音量

**本地服务器**:
- 即将添加音量控制参数
- 可以在操作系统层面调高音量

### 问题 4: 中文无法发音

**检查清单**:
1. ✅ 本地服务器已启动
2. ✅ 模式设置为 Auto 或 Local-only
3. ✅ CosyVoice 模型已加载 **(当前版本未实现)**
4. ✅ 状态显示 `✅ Connected`

**当前限制**:
- CosyVoice 模型集成正在开发中
- SpeechT5 仅支持英文
- 中文支持预计在下个版本提供

---

## 🔮 即将推出

### v0.1.7 计划功能

- [ ] **CosyVoice 集成** - 高质量中文 TTS
- [ ] **音量控制** - 调整音量大小
- [ ] **语速控制** - 调整朗读速度
- [ ] **多 Speaker** - 选择不同音色
- [ ] **音频缓存** - 重复文本无需重新生成
- [ ] **WebSocket 流式传输** - 降低延迟

---

## 📚 相关文档

- [TTS Offscreen Document 修复](./TTS-offscreen-document-fix.md)
- [TTS 用户指南](./TTS-user-guide.md)
- [TTS 测试清单](./TTS-testing-checklist.md)
- [TTS 服务器 README](../tts-server/README.md)

---

**版本**: v0.1.6-tts-dual-mode
**更新日期**: 2025-11-30
**状态**: ✅ 生产就绪 (英文 TTS)
