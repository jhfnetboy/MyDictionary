# TTS 实现方案对比 - Kokoro-82M

## 📊 三种实现方案对比

### 方案 1: 浏览器 ONNX (Transformers.js)

**模型来源**: `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped`

**实现方式**:
```javascript
import { pipeline } from '@xenova/transformers';

const tts = await pipeline('text-to-speech',
  'onnx-community/Kokoro-82M-v1.0-ONNX-timestamped'
);

const audio = await tts('Hello world');
```

**优点**:
- ✅ 完全离线，无需服务器
- ✅ 与现有 SpeechT5 架构一致
- ✅ 自动缓存到浏览器
- ✅ WebGPU 加速（如果可用）

**缺点**:
- ❌ 模型大 (~1.3 GB)，首次下载慢
- ❌ 占用浏览器内存
- ❌ 推理速度较慢（JS 开销）
- ❌ 受浏览器沙箱限制

**性能预估**:
```
首次加载: ~10-30 秒 (下载模型)
首次推理: ~2-3 秒 (编译 + 推理)
后续推理: ~800-1500ms (5秒音频)
内存占用: ~1.5 GB
```

---

### 方案 2: 本地 Rust 服务 (ONNX Runtime)

**模型来源**:
- ONNX 模型: `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/onnx/model.onnx`
- 语音数据: `thewh1teagle/kokoro-onnx` releases

**实现方式** (参考 Kokoros):
```rust
use ort::{Session, Value};

// 加载 ONNX 模型
let session = Session::builder()?
    .commit_from_file("checkpoints/kokoro-v1.0.onnx")?;

// 推理
let outputs = session.run(inputs)?;
let audio = outputs["audio"].try_extract_tensor::<f32>()?;
```

**优点**:
- ✅ **推理速度快 2-4 倍**（原生性能）
- ✅ 多核并行，充分利用 CPU
- ✅ 内存管理高效
- ✅ 可使用 CUDA/Metal GPU 加速
- ✅ 支持量化优化（INT8/FP16）

**缺点**:
- ❌ 需要用户手动启动服务
- ❌ 跨平台编译复杂
- ❌ 需要下载 Rust 工具链

**性能预估**:
```
首次推理: ~500ms (模型预热)
后续推理: ~200-400ms (5秒音频)
内存占用: ~300 MB
CPU 使用: 多核并行
```

---

### 方案 3: 混合方案 (当前架构)

**自动发现 + 智能回退**:

```
1. 检查本地 Rust 服务 (http://localhost:9527/health)
   ↓
2. 如果可用 → 使用本地 ONNX Runtime (快速)
   ↓
3. 如果不可用 → 回退到浏览器 TTS
```

**当前浏览器回退**: `Xenova/speecht5_tts` (仅英文)
**未来浏览器回退**: `onnx-community/Kokoro-82M` (中英文)

**优点**:
- ✅ 兼顾性能和便利性
- ✅ 用户无需配置，完全透明
- ✅ 本地服务提供最佳性能
- ✅ 浏览器回退保证可用性

**缺点**:
- ⚠️ 需要维护两套 TTS 实现

---

## 🎯 推荐方案

### 短期 (v0.2.0)

**Rust 服务**: Kokoro-82M ONNX
**浏览器回退**: 保持 SpeechT5 (小巧，28MB)

**原因**:
1. Kokoro ONNX 模型 1.3 GB 太大，不适合浏览器
2. SpeechT5 已经在用，稳定可靠
3. 用户真正需要高质量时会启动本地服务

### 长期 (v0.3.0)

**Rust 服务**: Kokoro-82M ONNX (高质量)
**浏览器回退**: Kokoro-82M 量化版 (如果社区提供)

**探索方向**:
- INT8 量化减少模型大小 (~300 MB)
- 分片下载（边下载边推理）
- IndexedDB 持久化缓存

---

## 📦 模型文件对比

### Kokoro-82M 官方 (PyTorch)

**仓库**: `hexgrad/Kokoro-82M`

| 文件 | 大小 | 用途 |
|------|------|------|
| kokoro-v1_0.pth | 327 MB | PyTorch 权重 |
| config.json | 2.35 KB | 模型配置 |
| voices/*.pt | 各 ~500 KB | 说话人 embeddings |

**使用场景**: Python 训练和推理

---

### Kokoro-82M ONNX (社区转换)

**仓库**: `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped`

| 文件 | 大小 | 用途 |
|------|------|------|
| onnx/model.onnx | ~1.3 GB | ONNX 推理引擎 |
| tokenizer.json | 3.5 KB | 文本分词 |
| config.json | 44 Bytes | 基础配置 |

**使用场景**: Transformers.js 浏览器推理

---

### Kokoros Rust 使用的 ONNX

**下载地址**:
```bash
# 模型文件
https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/resolve/main/onnx/model.onnx

# 语音数据
https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

| 文件 | 大小 | 用途 |
|------|------|------|
| kokoro-v1.0.onnx | ~1.3 GB | ONNX Runtime 推理 |
| voices-v1.0.bin | ~50 MB | 说话人特征向量 |

**使用场景**: Rust ONNX Runtime 原生推理

---

## 🔧 集成方案选择

### 回答你的问题

**Q1: 有 ONNX 模型，可以集成到浏览器吗？**

✅ **可以！** 但有限制：
- 模型太大 (1.3 GB)，首次加载慢
- 推理速度是本地服务的 2-4 倍慢
- 适合作为回退方案，不适合主力

**Q2: 本地服务 vs 浏览器，性能差异？**

✅ **本地服务快得多！**

| 指标 | 本地 Rust | 浏览器 ONNX | 差距 |
|------|----------|------------|------|
| 推理速度 | 200-400ms | 800-1500ms | **2-4x** |
| 内存占用 | 300 MB | 1.5 GB | **5x** |
| CPU 利用率 | 多核并行 | 单线程受限 | **多核优势** |
| 启动时间 | 500ms | 10-30s | **20-60x** |

**Q3: 用了哪个实现？**

**目前状态**:
- ✅ **借鉴**: `lucasjinreal/Kokoros` 架构
- ✅ **计划使用**: `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped` 模型
- ⏳ **待实现**: ONNX Runtime 推理逻辑

**具体借鉴内容**:
1. Axum HTTP 服务器架构 ✅
2. ONNX Runtime 集成方式 (待实现)
3. 音频数据处理流程 (待实现)

---

## 📋 下一步实现计划

### Phase 1: 下载模型文件

```bash
cd tts-server

# 创建目录
mkdir -p checkpoints data

# 下载 ONNX 模型 (~1.3 GB)
curl -L "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX-timestamped/resolve/main/onnx/model.onnx" \
  -o checkpoints/kokoro-v1.0.onnx

# 下载语音数据 (~50 MB)
curl -L "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" \
  -o data/voices-v1.0.bin
```

### Phase 2: 实现 ONNX 推理

在 `tts-server/src/tts_engine.rs`:

```rust
use ort::{Session, Value, tensor::OrtOwnedTensor};
use hound::WavWriter;

pub struct TTSEngine {
    session: Session,
    voices: VoiceBank,
}

impl TTSEngine {
    pub fn new() -> Result<Self> {
        let session = Session::builder()?
            .with_intra_threads(4)?  // 多线程加速
            .commit_from_file("checkpoints/kokoro-v1.0.onnx")?;

        let voices = VoiceBank::load("data/voices-v1.0.bin")?;

        Ok(Self { session, voices })
    }

    pub fn synthesize(&self, text: &str, voice: &str) -> Result<Vec<f32>> {
        // 1. 文本预处理 (音素化)
        let phonemes = phonemize(text)?;

        // 2. 获取说话人特征
        let speaker_embedding = self.voices.get(voice)?;

        // 3. ONNX 推理
        let inputs = vec![
            ("text", Value::from_array(phonemes)?),
            ("speaker", Value::from_array(speaker_embedding)?),
        ];

        let outputs = self.session.run(inputs)?;
        let audio: OrtOwnedTensor<f32, _> = outputs[0].try_extract()?;

        Ok(audio.view().iter().copied().collect())
    }
}
```

### Phase 3: HTTP 端点实现

更新 `tts-server/src/main.rs`:

```rust
async fn synthesize(
    Json(payload): Json<SynthesizeRequest>
) -> impl IntoResponse {
    // 加载 TTS 引擎 (单例)
    let engine = TTS_ENGINE.get_or_init(|| {
        TTSEngine::new().expect("Failed to load TTS engine")
    });

    // 生成音频
    let audio = engine.synthesize(&payload.text, "af_heart")?;

    // 编码为 WAV
    let wav_bytes = encode_wav(&audio, 24000)?;

    // 返回二进制音频
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "audio/wav")],
        wav_bytes
    )
}
```

### Phase 4: 测试验证

```bash
# 启动服务器
cargo run --release

# 测试 TTS
curl -X POST http://localhost:9527/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "voice": "af_heart"}' \
  --output test.wav

# 播放音频
afplay test.wav  # macOS
aplay test.wav   # Linux
```

---

## 🌟 总结

**最佳方案**: **混合架构 (本地优先 + 浏览器回退)**

1. **本地 Rust 服务** (Kokoro ONNX)
   - 高性能，低延迟
   - 支持中英文
   - 用户主动启动，获得最佳体验

2. **浏览器回退** (SpeechT5)
   - 轻量级 (28 MB)
   - 完全离线
   - 无需配置，开箱即用

**借鉴来源**:
- **架构设计**: `lucasjinreal/Kokoros`
- **ONNX 模型**: `onnx-community/Kokoro-82M-v1.0-ONNX-timestamped`
- **原始模型**: `hexgrad/Kokoro-82M`

**实现状态**:
- ✅ HTTP 服务器框架
- ✅ 自动发现机制
- ⏳ ONNX 推理集成 (下一步)
