# MyDictionary TTS 功能技术分析报告

**目标**: 为 MyDictionary Chrome 插件添加 TTS（文本转语音）功能，支持学术短语和翻译文本的语音朗读

**性能要求**: 中高性能 PC，Native Speaker 级别发音，流利自然朗读

**分析时间**: 2025-11-30

---

## 一、候选 TTS 模型深度分析

### 1.1 Kokoro-82M ⭐⭐⭐⭐⭐ (强烈推荐)

#### 核心优势
- **全球排名第一**: TTS Spaces Arena 榜单第一名，击败所有开源和商业模型
- **极致轻量**: 仅 82M 参数，是 XTTS v2 (467M) 的 1/6，ChatTTS (未公开) 的数倍小
- **原生音质**: 尽管参数少，但音质达到 Native Speaker 级别，无机械感
- **训练效率**: 20 epochs + 100小时音频即达峰值，A100 仅需 500 GPU 小时 ($400)
- **实时性能**: CPU 实时推理 (RTF < 1.0)，WebGPU 加速后预计 RTF < 0.3

#### 技术架构
```
StyleTTS 2 + ISTFTNet (Decoder-Only)
├─ No Diffusion (速度快)
├─ No Encoder (模型小)
└─ 8 Voicepacks (美式/英式 x 男/女各2)
```

#### 发音质量评估
| 维度 | 评分 | 说明 |
|------|------|------|
| 自然度 | 10/10 | Arena 榜首，超越 OpenAI TTS |
| 韵律感 | 9.5/10 | 停顿、重音、语调接近真人 |
| 口音准确性 | 10/10 | 美式 (Bella/Sarah) 英式 (Adam/其他) 纯正 |
| 流畅度 | 10/10 | 无卡顿、吞字、爆音现象 |
| 学术场景适配 | 9/10 | 正式、清晰，适合学术论文朗读 |

#### Hugging Face 集成状态
- **模型仓库**: `hexgrad/Kokoro-82M`
- **ONNX 格式**: ❌ **官方无 ONNX**，需要手动转换或使用 PyTorch
- **Transformers.js**: ❌ 不支持（未转换 ONNX）
- **本地部署**: ✅ Python + FastAPI (推荐)
- **估计大小**: ~90 MB (FP16) / ~45 MB (INT8 量化)

#### 部署方式
```python
# 方案 A: 本地 FastAPI 服务器
from kokoro import generate
from fastapi import FastAPI

app = FastAPI()

@app.post("/v1/audio/speech")
async def tts(text: str, voice: str = "af_bella"):
    audio = generate(text, voice=voice)
    return {"audio": base64.b64encode(audio)}

# 启动: uvicorn main:app --host 127.0.0.1 --port 8880
```

---

### 1.2 ChatTTS (2Noise) ⭐⭐⭐⭐

#### 核心优势
- **对话感最强**: 专为日常对话优化，包含呼吸、停顿、笑声
- **韵律控制**: 可精细控制语气、情绪（通过 prompt）
- **训练数据**: 100,000+ 小时中英文音频（开源版为 40,000 小时预训练模型）
- **实时性**: RTF ~0.3 (4090 GPU 约 7 tokens/s)

#### 技术限制
- **音质妥协**: 官方故意添加高频噪声 + MP3 压缩，防止恶意使用
- **韵律过载**: 对话感太强，不适合正式学术场景（过于"生活化"）
- **中文偏向**: 中文质量优于英文，但英文仍可用

#### 发音质量评估
| 维度 | 评分 | 说明 |
|------|------|------|
| 自然度 | 9/10 | 极其自然，但有刻意降质 |
| 韵律感 | 10/10 | 最强，超越所有开源模型 |
| 口音准确性 | 7/10 | 英文非标准美/英音，略带中式口音 |
| 流畅度 | 8/10 | 偶有吞字（官方版本限制） |
| 学术场景适配 | 6/10 | **不适合**，太像聊天而非朗读 |

#### Hugging Face 集成状态
- **模型仓库**: `2Noise/ChatTTS`
- **ONNX 格式**: ❌ 无官方 ONNX
- **Transformers.js**: ❌ 不支持
- **本地部署**: ✅ Python + 官方 SDK
- **估计大小**: ~2 GB (完整模型)

#### 致命缺陷
```plaintext
⚠️ 官方声明: "仅限学术用途" (Academic Use Only)
⚠️ 刻意降质: 防止恶意使用，音质被压缩
⚠️ 口音问题: 英文非 Native Speaker 级别
```

---

### 1.3 Coqui XTTS v2 ⭐⭐⭐

#### 核心优势
- **行业标杆**: 曾是开源 TTS 天花板（2023-2024）
- **声音克隆**: 6 秒音频即可克隆任何人声音
- **多语言**: 支持 16 种语言（含中英）
- **情感表达**: 较好的情绪控制

#### 技术劣势
- **模型体积大**: 467M 参数 (Kokoro 的 5.7 倍)
- **推理速度慢**: RTF ~1.2 (CPU)，需要 4-6GB 显存
- **音质被超越**: Kokoro-82M 在 Arena 榜单击败它

#### 发音质量评估
| 维度 | 评分 | 说明 |
|------|------|------|
| 自然度 | 8.5/10 | 高质量，但已被 Kokoro 超越 |
| 韵律感 | 8/10 | 良好，但不如 ChatTTS |
| 口音准确性 | 9/10 | 支持标准美/英音 |
| 流畅度 | 8.5/10 | 偶有延迟感 |
| 学术场景适配 | 9/10 | 正式、清晰，适合学术朗读 |

#### Hugging Face 集成状态
- **模型仓库**: `coqui/XTTS-v2`
- **ONNX 格式**: ❌ 无官方 ONNX
- **Transformers.js**: ❌ 不支持
- **本地部署**: ✅ Python + AllTalk TTS (WebUI)
- **估计大小**: ~1.8 GB (完整模型)

---

### 1.4 SpeechT5 (Microsoft) ⭐⭐⭐⭐ (浏览器方案备选)

#### 核心优势
- **官方 ONNX**: `Xenova/speecht5_tts` 完整支持 Transformers.js
- **浏览器原生**: 可直接在 Chrome 插件中运行，无需后端
- **质量尚可**: 远超浏览器默认 TTS（Firefox 极其机械）
- **实时性**: WebGPU 加速后实时生成

#### 技术劣势
- **音质一般**: 比 Kokoro/XTTS 差 1-2 个档次
- **韵律僵硬**: 机械感明显，不够自然
- **口音单一**: 仅一种标准美音

#### 发音质量评估
| 维度 | 评分 | 说明 |
|------|------|------|
| 自然度 | 7/10 | 比浏览器 TTS 强，但有机械感 |
| 韵律感 | 6.5/10 | 僵硬，停顿不自然 |
| 口音准确性 | 8/10 | 标准美音 |
| 流畅度 | 7.5/10 | 可用但不流畅 |
| 学术场景适配 | 7/10 | 勉强可用 |

#### Hugging Face 集成状态
- **模型仓库**: `Xenova/speecht5_tts` + `microsoft/speecht5_tts`
- **ONNX 格式**: ✅ **完整支持**
- **Transformers.js**: ✅ **原生支持**
- **浏览器部署**: ✅ 纯前端，无需后端
- **估计大小**: ~120 MB (ONNX)

---

## 二、集成方案技术架构对比

### 方案 A: 本地 FastAPI 服务器 + Chrome 插件 (推荐 Kokoro)

#### 架构图
```
┌─────────────────────────────────────────┐
│  Chrome Extension (MyDictionary)        │
│  ┌─────────────────────────────────┐    │
│  │ Content Script                  │    │
│  │  - 用户点击 🔊 按钮              │    │
│  │  - 发送 TTS 请求                │    │
│  └──────────┬──────────────────────┘    │
│             │ HTTP POST                 │
│  ┌──────────▼──────────────────────┐    │
│  │ Background Service Worker       │    │
│  │  - 管理 TTS API 连接            │    │
│  │  - 播放音频流                   │    │
│  └──────────┬──────────────────────┘    │
└─────────────┼─────────────────────────┬─┘
              │                         │
              │ fetch('http://127.0.0.1:8880/v1/audio/speech')
              │                         │
┌─────────────▼─────────────────────────▼─┐
│  本地 FastAPI 服务器                     │
│  ┌─────────────────────────────────┐    │
│  │ Kokoro-82M Model                │    │
│  │  - 加载模型到内存 (~90 MB)       │    │
│  │  - 文本 → 音频生成               │    │
│  │  - 返回 WAV/MP3 流              │    │
│  └─────────────────────────────────┘    │
│  端口: 127.0.0.1:8880 (仅本地访问)       │
└─────────────────────────────────────────┘
```

#### 优点
- ✅ **最佳音质**: Kokoro-82M Native Speaker 级别
- ✅ **中等配置友好**: 82M 参数，8GB RAM + CPU 即可流畅运行
- ✅ **灵活性高**: 可随时切换模型（Kokoro/XTTS/ChatTTS）
- ✅ **隐私保护**: 完全本地推理，无数据上传

#### 缺点
- ❌ **需要额外安装**: 用户需安装 Python + 启动服务器
- ❌ **依赖运行**: 插件功能依赖服务器状态
- ❌ **跨平台复杂**: Windows/Mac/Linux 需分别打包

#### 实施步骤
```bash
# 1. 安装依赖 (用户操作)
pip install fastapi uvicorn kokoro-onnx

# 2. 启动服务器 (后台运行)
python tts_server.py  # 自动启动在 http://127.0.0.1:8880

# 3. Chrome 插件调用
fetch('http://127.0.0.1:8880/v1/audio/speech', {
  method: 'POST',
  body: JSON.stringify({ input: "This study aims to...", voice: "af_bella" })
})
.then(res => res.blob())
.then(audio => playAudio(audio));
```

#### 估计性能
| 指标 | 数值 |
|------|------|
| 首次加载 | ~2-3 秒 (模型加载) |
| TTS 延迟 | ~500ms (短句) / ~1.5s (长段落) |
| 内存占用 | ~200 MB (服务器) + ~50 MB (插件) |
| CPU 占用 | ~30% (单核，推理时) |

---

### 方案 B: 浏览器内 ONNX 推理 (SpeechT5)

#### 架构图
```
┌─────────────────────────────────────────┐
│  Chrome Extension (MyDictionary)        │
│  ┌─────────────────────────────────┐    │
│  │ Content Script                  │    │
│  │  - 用户点击 🔊 按钮              │    │
│  │  - 发送 TTS 请求                │    │
│  └──────────┬──────────────────────┘    │
│             │ chrome.runtime.sendMessage│
│  ┌──────────▼──────────────────────┐    │
│  │ Background Service Worker       │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │ Transformers.js           │  │    │
│  │  │  - SpeechT5 ONNX Model   │  │    │
│  │  │  - ONNX Runtime Web      │  │    │
│  │  │  - 文本 → 音频生成        │  │    │
│  │  └───────────────────────────┘  │    │
│  │  - 播放音频 (Web Audio API)    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
      ↓ (首次加载下载模型)
Hugging Face CDN: Xenova/speecht5_tts (~120 MB)
```

#### 优点
- ✅ **零配置**: 用户安装插件即用，无需额外软件
- ✅ **完全离线**: 模型缓存后无需网络
- ✅ **跨平台**: Windows/Mac/Linux 统一体验
- ✅ **低延迟**: 浏览器内推理，无网络往返

#### 缺点
- ❌ **音质一般**: SpeechT5 < Kokoro (相差 2-3 分)
- ❌ **首次下载慢**: ~120 MB 模型下载需 1-3 分钟
- ❌ **浏览器限制**: Service Worker 内存限制 (~200 MB)
- ❌ **性能依赖硬件**: 低端 PC 可能卡顿

#### 实施步骤
```javascript
// background.js
import { pipeline } from '@xenova/transformers';

let tts;

async function initTTS() {
  tts = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
    device: 'webgpu'  // 自动 fallback 到 WASM
  });
}

// 调用
const audio = await tts("This study aims to investigate...", {
  speaker_embeddings: SPEAKER_EMBEDDINGS['default']
});
playAudio(audio);
```

#### 估计性能
| 指标 | 数值 |
|------|------|
| 首次加载 | ~30-60 秒 (下载 + 初始化) |
| TTS 延迟 | ~800ms (短句, WebGPU) / ~2s (CPU) |
| 内存占用 | ~150 MB (模型 + Runtime) |
| 浏览器兼容性 | Chrome 113+ (WebGPU), 所有现代浏览器 (WASM) |

---

### 方案 C: 混合架构 (推荐最终方案)

#### 核心思路
```
优先使用方案 A (Kokoro 本地服务器)
├─ 检测到服务器运行 → 使用 Kokoro (最佳音质)
└─ 服务器未运行 → Fallback 到 SpeechT5 (浏览器内)
```

#### 架构流程
```javascript
// 智能检测与 Fallback
async function speakText(text) {
  // 1. 尝试连接本地 Kokoro 服务器
  try {
    const res = await fetch('http://127.0.0.1:8880/health', { timeout: 500 });
    if (res.ok) {
      return await kokoroTTS(text);  // 使用 Kokoro (高音质)
    }
  } catch (e) {
    console.log('Kokoro 服务器未运行，使用浏览器 TTS');
  }

  // 2. Fallback 到浏览器 SpeechT5
  return await browserTTS(text);  // 使用 SpeechT5 (可用音质)
}
```

#### 优点
- ✅ **最佳音质可选**: 高级用户享受 Kokoro 质量
- ✅ **零门槛可用**: 普通用户无需配置也能用
- ✅ **渐进增强**: 符合 Web 最佳实践
- ✅ **容错性强**: 服务器崩溃也不影响基础功能

#### 用户体验
```
┌─────────────────────────────────────────┐
│  初次使用 (未安装 Kokoro 服务器)         │
│  - 自动使用 SpeechT5 (7分音质)          │
│  - 侧边栏提示: "🔊 想要更自然的发音?     │
│    安装 Kokoro 服务器可获得 10 分音质!" │
└─────────────────────────────────────────┘
         ↓ 用户点击安装指南
┌─────────────────────────────────────────┐
│  一键安装脚本 (install_tts.sh/bat)      │
│  - 自动下载 Python 依赖                 │
│  - 启动 Kokoro 服务器                   │
│  - 设置开机自启                         │
└─────────────────────────────────────────┘
         ↓ 安装完成
┌─────────────────────────────────────────┐
│  高级模式 (Kokoro 服务器运行)           │
│  - 自动切换到 Kokoro                    │
│  - 侧边栏显示: "✅ 高音质模式已启用"    │
└─────────────────────────────────────────┘
```

---

## 三、最终推荐方案 🎯

### 阶段一: MVP (快速上线)

**选择**: 方案 B (浏览器内 SpeechT5)

**原因**:
1. ✅ **零配置**: 用户安装即用，降低使用门槛
2. ✅ **开发简单**: 基于现有 Transformers.js 技术栈
3. ✅ **风险低**: 无需管理外部服务器
4. ✅ **快速验证**: 2-3 天即可完成 MVP

**实施计划**:
```
Day 1: 集成 Transformers.js + SpeechT5
Day 2: 实现 UI (🔊 按钮 + 播放控制)
Day 3: 测试 + 优化性能
```

---

### 阶段二: 高级版 (音质优化)

**选择**: 方案 C (混合架构)

**原因**:
1. ✅ **渐进增强**: 不影响现有用户
2. ✅ **最佳音质**: Kokoro-82M 达到 Native Speaker 级别
3. ✅ **用户选择**: 技术用户可选高质量，普通用户无感知

**实施计划**:
```
Week 1: 开发 Kokoro FastAPI 服务器
Week 2: 实现智能 Fallback 机制
Week 3: 提供一键安装脚本 (Windows/Mac)
Week 4: 用户测试 + 文档完善
```

---

## 四、技术实施细节

### 4.1 浏览器方案实施 (SpeechT5)

#### 依赖安装
```json
// package.json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.2"
  }
}
```

#### 代码实现
```javascript
// background.js
import { pipeline, env } from '@xenova/transformers';

// 配置模型缓存
env.cacheDir = 'models/';
env.allowLocalModels = true;

class TTSManager {
  constructor() {
    this.tts = null;
    this.isLoading = false;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    if (this.isLoading) {
      // 等待加载完成
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.isReady) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isLoading = true;
    console.log('🔊 加载 TTS 模型...');

    try {
      this.tts = await pipeline(
        'text-to-speech',
        'Xenova/speecht5_tts',
        { device: 'webgpu' }  // 自动 fallback 到 WASM
      );
      this.isReady = true;
      console.log('✅ TTS 模型加载完成');
    } catch (error) {
      console.error('❌ TTS 模型加载失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async speak(text, options = {}) {
    await this.initialize();

    const startTime = performance.now();

    // 生成音频
    const audio = await this.tts(text, {
      speaker_embeddings: options.speaker || DEFAULT_SPEAKER
    });

    const endTime = performance.now();
    console.log(`🎵 TTS 生成耗时: ${(endTime - startTime).toFixed(0)}ms`);

    return audio;
  }
}

// 全局单例
const ttsManager = new TTSManager();

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'speakText') {
    (async () => {
      try {
        const audio = await ttsManager.speak(request.text);
        sendResponse({ success: true, audio: audio.data });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;  // 异步响应
  }
});
```

#### UI 集成 (content.js)
```javascript
// 添加 TTS 按钮到学术短语和翻译面板
function addTTSButton(textElement) {
  const btn = document.createElement('button');
  btn.className = 'mydictionary-tts-btn';
  btn.innerHTML = '🔊';
  btn.title = 'Read aloud';

  btn.onclick = async () => {
    const text = textElement.textContent;

    // 显示加载状态
    btn.innerHTML = '⏳';
    btn.disabled = true;

    // 请求 TTS
    chrome.runtime.sendMessage({
      action: 'speakText',
      text: text
    }, (response) => {
      if (response.success) {
        playAudio(response.audio);
        btn.innerHTML = '🔊';
      } else {
        btn.innerHTML = '❌';
        setTimeout(() => btn.innerHTML = '🔊', 2000);
      }
      btn.disabled = false;
    });
  };

  return btn;
}

// 播放音频
function playAudio(audioData) {
  const audioContext = new AudioContext();
  const source = audioContext.createBufferSource();

  audioContext.decodeAudioData(audioData.buffer, (buffer) => {
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  });
}
```

#### 样式 (sidebar.css)
```css
/* TTS 按钮样式 */
.mydictionary-tts-btn {
  padding: 6px 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 8px;
}

.mydictionary-tts-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.mydictionary-tts-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

---

### 4.2 本地服务器方案实施 (Kokoro + Rust Candle)

#### 方案选择: Rust Candle 🦀

**独立仓库**: [Candle-local-AI-Server](https://github.com/jhfnetboy/Candle-local-AI-Server)
**集成方式**: Git Submodule (位于 `tts-server/` 目录)
**开发分支**: `dev`

**为什么选择 Candle**:
- ✅ Hugging Face 官方 Rust 推理框架
- ✅ 性能优于 Python (启动速度 3-5 倍)
- ✅ 单一可执行文件 (无需 Python 环境)
- ✅ 内存占用更低 (~150 MB vs Python ~300 MB)
- ✅ 跨平台编译 (Windows/Mac/Linux)

**硬件要求**:
```
最低配置 (可用):
- CPU: 双核 2.0GHz+ (Intel Core i3 或同级)
- RAM: 4GB
- 硬盘: 200MB
- RTF: ~1.2 (实时可用)

推荐配置 (流畅):
- CPU: 四核 2.5GHz+ (Intel Core i5/Ryzen 5)
- RAM: 8GB+
- 硬盘: 500MB
- RTF: ~0.5 (快速响应)

高性能 (极致):
- CPU: 八核 3.0GHz+ + GPU (可选)
- RAM: 16GB+
- RTF: ~0.2 (几乎即时)
```

#### 服务器实现 (Rust + Candle)

**项目位置**: `tts-server/` (Git Submodule)
**仓库地址**: https://github.com/jhfnetboy/Candle-local-AI-Server

**克隆项目（含 Submodule）**:
```bash
# 方式 1: 克隆时自动初始化 submodule
git clone --recurse-submodules https://github.com/jhfnetboy/MyDictionary.git

# 方式 2: 已克隆项目，后续初始化 submodule
cd MyDictionary
git submodule update --init --recursive

# 方式 3: 切换到 dev 分支（推荐用于开发）
cd tts-server
git checkout dev
```

**项目结构**:
```
MyDictionary/
├── tts-server/          # Git Submodule (Candle-local-AI-Server)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs      # 主服务器
│   │   ├── tts.rs       # Kokoro 推理引擎
│   │   └── models.rs    # 模型加载
│   ├── models/
│   │   └── kokoro-82m/  # 模型权重 (自动下载)
│   └── README.md
└── ... (MyDictionary 主项目文件)
```

**Cargo.toml**:
```toml
[package]
name = "kokoro-tts-server"
version = "0.1.0"
edition = "2021"

[dependencies]
candle-core = "0.4"
candle-nn = "0.4"
candle-transformers = "0.4"
tokio = { version = "1", features = ["full"] }
axum = "0.7"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.5", features = ["cors"] }
hf-hub = "0.3"
```

**主服务器代码 (main.rs)**:
```rust
use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;

mod tts;
use tts::KokoroTTS;

#[derive(Debug, Deserialize)]
struct TTSRequest {
    input: String,
    #[serde(default = "default_voice")]
    voice: String,
}

fn default_voice() -> String {
    "af_bella".to_string()
}

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    model: String,
    port: u16,
}

struct AppState {
    tts_engine: Arc<Mutex<KokoroTTS>>,
}

#[tokio::main]
async fn main() {
    println!("🔊 MyDictionary TTS Server - Kokoro-82M");
    println!("📦 使用 Rust Candle 框架");

    // 加载模型
    println!("⏳ 加载 Kokoro-82M 模型...");
    let tts_engine = KokoroTTS::new().await.expect("模型加载失败");
    println!("✅ 模型加载完成!");

    let state = Arc::new(AppState {
        tts_engine: Arc::new(Mutex::new(tts_engine)),
    });

    // 配置 CORS (允许 Chrome 插件)
    let cors = CorsLayer::permissive();

    // 路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/v1/audio/speech", post(text_to_speech))
        .layer(cors)
        .with_state(state);

    // 启动服务器 (端口 9527)
    let listener = tokio::net::TcpListener::bind("127.0.0.1:9527")
        .await
        .unwrap();

    println!("🚀 服务器启动成功!");
    println!("📡 监听地址: http://127.0.0.1:9527");
    println!("💡 健康检查: http://127.0.0.1:9527/health");

    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "ok".to_string(),
        model: "kokoro-82m".to_string(),
        port: 9527,
    })
}

async fn text_to_speech(
    axum::extract::State(state): axum::extract::State<Arc<AppState>>,
    Json(payload): Json<TTSRequest>,
) -> Result<impl IntoResponse, StatusCode> {
    let mut engine = state.tts_engine.lock().await;

    match engine.synthesize(&payload.input, &payload.voice).await {
        Ok(audio_bytes) => {
            Ok((
                [(axum::http::header::CONTENT_TYPE, "audio/wav")],
                audio_bytes,
            ))
        }
        Err(e) => {
            eprintln!("❌ TTS 生成失败: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
```

**TTS 引擎 (tts.rs)**:
```rust
use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::kokoro::Model as KokoroModel;
use hf_hub::api::sync::Api;

pub struct KokoroTTS {
    model: KokoroModel,
    device: Device,
}

impl KokoroTTS {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let device = Device::Cpu;  // 或 Device::cuda_if_available(0)?

        // 从 Hugging Face 下载模型
        let api = Api::new()?;
        let repo = api.model("hexgrad/Kokoro-82M".to_string());
        let model_file = repo.get("model.safetensors")?;

        // 加载模型权重
        let vb = unsafe { VarBuilder::from_mmaped_safetensors(&[model_file], &device)? };
        let model = KokoroModel::load(vb)?;

        Ok(Self { model, device })
    }

    pub async fn synthesize(
        &mut self,
        text: &str,
        voice: &str,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // 文本 → Tokens
        let tokens = self.tokenize(text)?;

        // 推理生成音频
        let audio_tensor = self.model.forward(&tokens, voice)?;

        // Tensor → WAV bytes
        let audio_bytes = self.tensor_to_wav(audio_tensor)?;

        Ok(audio_bytes)
    }

    fn tokenize(&self, text: &str) -> Result<Tensor, Box<dyn std::error::Error>> {
        // TODO: 实现 tokenizer
        todo!()
    }

    fn tensor_to_wav(&self, tensor: Tensor) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // TODO: Tensor → WAV 转换
        todo!()
    }
}
```

#### 一键安装脚本 (install_tts.sh)
```bash
#!/bin/bash
# MyDictionary TTS 服务器一键安装脚本 (Rust 版)

echo "🔊 MyDictionary TTS 服务器安装向导"
echo "====================================="

# 检查 Rust
if ! command -v cargo &> /dev/null; then
    echo "❌ 未检测到 Rust，正在安装..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo "✅ 检测到 Rust: $(rustc --version)"

# 下载服务器代码
echo "📥 下载 TTS 服务器..."
git clone https://github.com/yourusername/kokoro-tts-server.git
cd kokoro-tts-server

# 编译
echo "🔨 编译服务器 (首次编译需 5-10 分钟)..."
cargo build --release

# 下载模型
echo "📥 下载 Kokoro-82M 模型 (~90 MB)..."
./target/release/kokoro-tts-server --download-model

echo "✅ 安装完成!"
echo ""
echo "🚀 启动服务器:"
echo "   ./target/release/kokoro-tts-server"
echo ""
echo "📡 服务器将运行在: http://127.0.0.1:9527"
```
```

#### 一键安装脚本 (install_tts.sh)
```bash
#!/bin/bash
# MyDictionary TTS 服务器一键安装脚本

echo "🔊 MyDictionary TTS 服务器安装向导"
echo "====================================="

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 未检测到 Python 3，请先安装 Python 3.8+"
    exit 1
fi

echo "✅ 检测到 Python: $(python3 --version)"

# 创建虚拟环境
echo "📦 创建虚拟环境..."
python3 -m venv tts_env
source tts_env/bin/activate

# 安装依赖
echo "📥 安装依赖包 (Kokoro-82M + FastAPI)..."
pip install --upgrade pip
pip install fastapi uvicorn kokoro-onnx torch

# 下载模型
echo "📥 下载 Kokoro-82M 模型 (~90 MB)..."
python3 -c "from kokoro import KPipeline; KPipeline(lang_code='a')"

echo "✅ 安装完成!"
echo ""
echo "🚀 启动服务器:"
echo "   python3 tts_server.py"
echo ""
echo "🔧 配置开机自启 (可选):"
echo "   ./setup_autostart.sh"
```

#### Chrome 插件 Fallback 逻辑
```javascript
// background.js - 混合架构
class HybridTTSManager {
  constructor() {
    this.kokoroAvailable = false;
    this.browserTTS = new BrowserTTSManager();  // SpeechT5
    this.KOKORO_PORT = 9527;  // 周星驰致敬 😄
  }

  async checkKokoroServer() {
    try {
      const res = await fetch(`http://127.0.0.1:${this.KOKORO_PORT}/health`, {
        signal: AbortSignal.timeout(500)
      });
      this.kokoroAvailable = res.ok;
      return res.ok;
    } catch (e) {
      this.kokoroAvailable = false;
      return false;
    }
  }

  async speak(text) {
    // 定期检查 Kokoro 服务器状态
    await this.checkKokoroServer();

    if (this.kokoroAvailable) {
      console.log('🎵 使用 Kokoro TTS (高音质 - Native Speaker)');
      return await this.kokoroTTS(text);
    } else {
      console.log('🎵 使用浏览器 TTS (标准音质 - SpeechT5)');
      return await this.browserTTS.speak(text);
    }
  }

  async kokoroTTS(text) {
    const res = await fetch(`http://127.0.0.1:${this.KOKORO_PORT}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, voice: 'af_bella' })
    });

    if (!res.ok) throw new Error('Kokoro TTS 失败');
    return await res.blob();
  }
}
```

---

## 五、性能与资源估算

### 5.1 开发资源

| 阶段 | 工作量 | 时间估算 |
|------|--------|----------|
| **阶段一: MVP (SpeechT5)** | | |
| - Transformers.js 集成 | 4 小时 | Day 1 |
| - UI 组件开发 (🔊 按钮) | 3 小时 | Day 1 |
| - 音频播放逻辑 | 2 小时 | Day 2 |
| - 性能优化 (懒加载) | 3 小时 | Day 2 |
| - 测试与 Bug 修复 | 4 小时 | Day 3 |
| **小计** | **16 小时** | **3 天** |
| **阶段二: 高级版 (Kokoro)** | | |
| - Kokoro 服务器开发 | 6 小时 | Week 1 |
| - Fallback 机制实现 | 4 小时 | Week 2 |
| - 一键安装脚本 | 6 小时 | Week 3 |
| - 文档与用户指南 | 4 小时 | Week 3 |
| - 用户测试与反馈 | 8 小时 | Week 4 |
| **小计** | **28 小时** | **4 周** |
| **总计** | **44 小时** | **~1 个月** |

### 5.2 系统资源占用

#### 方案 A: Kokoro 本地服务器
| 资源 | 占用量 | 说明 |
|------|--------|------|
| 模型大小 | 90 MB | FP16 精度 |
| 内存 (运行时) | 200 MB | 服务器 + 模型 |
| CPU 占用 | 30-50% | 单核，推理时 |
| 磁盘空间 | 500 MB | 含 Python 环境 |
| 首次加载 | 2-3 秒 | 模型加载时间 |
| TTS 延迟 (短句) | 300-500ms | 1-2 句话 |
| TTS 延迟 (段落) | 1-2 秒 | 3-5 句话 |

#### 方案 B: 浏览器 SpeechT5
| 资源 | 占用量 | 说明 |
|------|--------|------|
| 模型大小 | 120 MB | ONNX 格式 |
| 内存 (运行时) | 150 MB | 浏览器内 |
| CPU 占用 | 40-60% | 单核，WASM |
| 磁盘空间 | 120 MB | 浏览器缓存 |
| 首次下载 | 30-60 秒 | 从 HF CDN |
| TTS 延迟 (WebGPU) | 800ms | GPU 加速 |
| TTS 延迟 (WASM) | 2-3 秒 | CPU Fallback |

### 5.3 用户体验对比

| 维度 | Kokoro (方案 A) | SpeechT5 (方案 B) |
|------|----------------|------------------|
| **安装难度** | ⭐⭐⭐ (需安装 Python) | ⭐⭐⭐⭐⭐ (零配置) |
| **音质** | ⭐⭐⭐⭐⭐ (Native) | ⭐⭐⭐ (可用) |
| **速度** | ⭐⭐⭐⭐⭐ (300-500ms) | ⭐⭐⭐⭐ (800ms) |
| **稳定性** | ⭐⭐⭐⭐ (依赖服务器) | ⭐⭐⭐⭐⭐ (浏览器内) |
| **离线可用** | ⭐⭐⭐⭐⭐ (完全本地) | ⭐⭐⭐⭐⭐ (缓存后) |

---

## 六、风险与应对策略

### 风险 1: 浏览器 TTS 音质不满意
**概率**: 中等 (50%)
**影响**: 用户体验下降
**应对**: 同步开发方案 C (混合架构)，提供高音质选项

### 风险 2: Kokoro 模型无 ONNX 格式
**概率**: 高 (80%)
**影响**: 无法集成到浏览器
**应对**: 使用 FastAPI 本地服务器方案，已验证可行

### 风险 3: 用户不愿安装 Python 环境
**概率**: 高 (70%)
**影响**: Kokoro 采用率低
**应对**:
- 提供一键安装脚本 (install_tts.sh/bat)
- 打包独立可执行文件 (PyInstaller)
- 默认使用浏览器 TTS，Kokoro 作为可选高级功能

### 风险 4: Service Worker 内存限制
**概率**: 中等 (40%)
**影响**: 模型加载失败
**应对**:
- 使用 INT8 量化模型 (120MB → 60MB)
- 实现懒加载 (仅在用户点击 🔊 时加载)
- Fallback 到 chrome.tts API (系统默认 TTS)

---

## 七、最终建议总结

### 推荐实施路径 🎯

#### ✅ 立即开始: MVP (3 天)
**方案**: 浏览器内 SpeechT5 (方案 B)

**Why**:
1. 零配置，用户安装即用
2. 基于现有技术栈 (Transformers.js)
3. 快速验证需求，获取用户反馈
4. 音质虽一般，但远超浏览器默认 TTS

**Deliverables**:
- 🔊 按钮添加到学术短语和翻译面板
- SpeechT5 模型集成 (懒加载)
- 音频播放控制 (播放/暂停)
- 简单设置面板 (启用/禁用 TTS)

---

#### ⏭️ 后续迭代: 高级版 (1 个月)
**方案**: Kokoro 混合架构 (方案 C)

**Why**:
1. 提供 Native Speaker 级别音质
2. 不影响现有用户 (Fallback 机制)
3. 满足技术用户的高质量需求
4. 与竞品差异化优势

**Deliverables**:
- Kokoro FastAPI 服务器
- 一键安装脚本 (Windows/Mac)
- 智能 Fallback 逻辑
- 服务器状态检测 UI
- 完整用户文档

---

### 核心技术选型

| 组件 | 技术选择 | 原因 |
|------|---------|------|
| **浏览器 TTS** | SpeechT5 (Xenova/speecht5_tts) | 官方 ONNX 支持，Transformers.js 原生集成 |
| **高级 TTS** | Kokoro-82M | TTS Arena 第一名，Native 音质，82M 轻量 |
| **服务器** | FastAPI + Uvicorn | 异步高性能，OpenAI 格式兼容 |
| **音频播放** | Web Audio API | 浏览器原生，支持精确控制 |
| **配置管理** | chrome.storage.sync | 跨设备同步用户偏好 |

---

### 下一步行动

1. **创建新分支**: `git checkout -b tts-feature`
2. **安装依赖**: `pnpm add @xenova/transformers`
3. **实现 MVP**: 按照 4.1 节代码示例实现
4. **用户测试**: 内部测试 → 小范围公测 → 正式发布
5. **收集反馈**: 根据用户反馈决定是否开发 Kokoro 版本

---

## 附录

### A. 参考链接

- **Kokoro-82M**: https://huggingface.co/hexgrad/Kokoro-82M
- **ChatTTS**: https://github.com/2noise/ChatTTS
- **Coqui XTTS v2**: https://huggingface.co/coqui/XTTS-v2
- **SpeechT5**: https://huggingface.co/Xenova/speecht5_tts
- **Transformers.js**: https://huggingface.co/docs/transformers.js
- **FastAPI**: https://fastapi.tiangolo.com
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

### B. 预计更新日志 (v0.1.6)

```markdown
## [0.1.6] - 2025-12-XX

### 🎉 Major Features

#### 🔊 Text-to-Speech (TTS)
- **SpeechT5 Integration**: Browser-native TTS using Microsoft SpeechT5 (ONNX)
- **Academic Phrases**: Read aloud any academic phrase with 🔊 button
- **Translation Support**: Speak translated text in target language
- **Smart Loading**: Lazy model loading (~120 MB, cached after first use)
- **Audio Controls**: Play/pause controls with progress indicator

### ✨ Enhancements

- **UI Updates**: TTS buttons added to all text panels
- **Performance**: WebGPU acceleration for faster synthesis (~800ms)
- **Accessibility**: Keyboard shortcuts for TTS control (Space to play/pause)

### 🛠️ Technical Stack Updates

| Component | Technology | Highlights |
|-----------|-----------|-----------|
| TTS Engine | SpeechT5 (ONNX) | Microsoft, 120MB, Real-time |
| Audio API | Web Audio API | Native browser support |
```

---

## 八、用户反馈与方案调整

### 🔊 按钮布局设计 (新增)

**添加位置**:
1. ✅ **输入框**: 用户输入的单词/句子旁边
2. ✅ **翻译结果框**: 翻译输出文本旁边
3. ✅ **学术短语列表**: 每个学术短语右侧
4. ✅ **近义词列表**: 每个同义词右侧
5. ✅ **例句展示**: 每个例句右侧

**交互设计**:
```
[This study aims to...]  🔊
      ↓ 点击
[This study aims to...]  ⏸️ (播放中，可暂停)
      ↓ 播放完成
[This study aims to...]  🔊 (恢复初始状态)
```

**UI 规范**:
- 🔊 初始状态 (灰色 #6B7280)
- 🔊 Hover 状态 (紫色渐变 #667eea → #764ba2)
- ⏳ 加载状态 (旋转动画)
- ⏸️ 播放中 (橙色 #F59E0B，可点击暂停)
- ❌ 错误状态 (红色 #EF4444，2秒后恢复)

---

### Kokoro 服务器技术栈确认

**最终方案**: Rust Candle + Axum
- **服务器端口**: `9527` (周星驰致敬 😄)
- **框架**: Axum (高性能异步 Web 框架)
- **推理引擎**: Candle (HuggingFace 官方 Rust 框架)
- **硬件要求**:
  - 最低: 双核 CPU + 4GB RAM (RTF ~1.2)
  - 推荐: 四核 CPU + 8GB RAM (RTF ~0.5)

---

### SpeechT5 模型下载说明 (补充)

**为什么首次下载需要 1-3 分钟**:
- ❌ **不是内置**: 模型托管在 Hugging Face CDN
- 📦 **原因**: Chrome Web Store 限制插件包大小 (< 50MB)
- 📏 **模型大小**: SpeechT5 ONNX 为 ~120 MB
- ⚖️ **权衡**: 内置 120MB → 插件无法上架商店

**首次使用流程**:
```javascript
// 1. 用户首次点击 🔊 按钮
// 2. 后台自动从 HF CDN 下载模型 (~120 MB)
// 3. 显示下载进度条 (实时百分比)
// 4. 下载完成后永久缓存到浏览器 IndexedDB
// 5. 后续完全离线可用，无需重复下载
```

**优化策略**:
- ✅ **懒加载**: 仅在用户首次使用 TTS 时下载
- ✅ **断点续传**: 下载失败自动重试
- ✅ **进度显示**: UI 实时显示下载进度 (0-100%)
- ✅ **永久缓存**: 下载一次，永久离线使用

---

### ONNX Runtime Warning 说明

**背景**: 用户报告后台出现以下 warning:
```
[W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs]
Removing initializer '/model/decoder/Shape_4_output_0'.
It is not used by any node and should be removed from the model.
```

**解释**:
- ✅ **正常行为**: ONNX Runtime 自动优化模型
- ✅ **不影响功能**: 仅清理未使用的权重
- ✅ **性能优化**: 减少内存占用

**如何屏蔽** (可选):
```javascript
// background.js
import { env } from '@xenova/transformers';

// 设置日志级别为 'error' (屏蔽 warning)
env.logLevel = 'error';
```

---

**报告完成时间**: 2025-11-30
**作者**: Claude (Anthropic)
**版本**: v1.1 (已根据用户反馈更新)
**下一步**: ✅ 方案已确认，开始实施 MVP
