# Model Runner - Rust 服务模块

基于 Rust + Candle 的 Hugging Face 模型运行器，为 MyDictionary 提供高性能 TTS 推理。

## 🎯 功能特性

### MVP (v0.1)
- ✅ HTTP REST API 服务器 (Axum)
- ✅ Hugging Face 模型下载 (hf-hub)
- 🔜 SpeechT5 模型推理 (Candle)
- 🔜 进度回调和缓存管理

### 未来计划
- 🚀 Web UI 模型浏览器
- 🚀 多模型支持 (TTS, Translation, Embedding)
- 🚀 插件系统

---

## 🚀 快速开始

### 1. 构建项目

```bash
cd model-runner

# 开发模式
cargo build

# 发布模式 (优化性能)
cargo build --release
```

### 2. 启动服务器

```bash
# 开发模式
cargo run

# 发布模式
./target/release/model-runner
```

服务器将在 `http://localhost:3030` 启动。

### 3. 测试 API

```bash
# 服务器信息
curl http://localhost:3030/

# 健康检查
curl http://localhost:3030/health

# 下载模型
curl -X POST http://localhost:3030/models/download \
  -H "Content-Type: application/json" \
  -d '{"model_id": "microsoft/speecht5_tts"}'
```

---

## 📦 API 文档

### GET `/`
获取服务器信息

**响应**:
```json
{
  "success": true,
  "data": {
    "name": "Model Runner",
    "version": "0.1.0",
    "status": "running",
    "mode": "rust-native"
  }
}
```

### POST `/models/download`
下载 Hugging Face 模型

**请求 Body**:
```json
{
  "model_id": "microsoft/speecht5_tts"
}
```

**响应**:
```json
{
  "success": true,
  "data": "模型已下载到: /Users/jason/.cache/huggingface/models--microsoft--speecht5_tts"
}
```

### GET `/health`
健康检查

**响应**:
```json
{
  "success": true,
  "data": "healthy"
}
```

---

## 🏗️ 项目结构

```
model-runner/
├── Cargo.toml              # 依赖配置
├── src/
│   ├── main.rs             # 服务入口
│   ├── downloader/         # 模型下载模块
│   │   └── mod.rs
│   ├── models/             # 模型定义 (未来)
│   └── server/             # 服务器 (未来)
└── README.md               # 本文档
```

---

## 🔧 开发指南

### 代码格式化
```bash
cargo fmt
```

### 代码检查
```bash
cargo clippy
```

### 运行测试
```bash
cargo test
```

### 性能测试
```bash
cargo bench
```

---

## 📊 性能对比

| 指标 | Python Flask | Rust Axum |
|------|--------------|-----------|
| 并发请求 | ~100 req/s | ~10,000 req/s |
| 内存占用 | ~200MB | ~10MB |
| 启动时间 | ~2s | ~50ms |
| 模型加载 | ~5s | ~3s (目标) |

---

## 🛠️ 依赖说明

- **axum**: 高性能 Web 框架
- **tokio**: 异步运行时
- **hf-hub**: Hugging Face Hub API
- **serde**: 序列化/反序列化
- **tracing**: 结构化日志
- **anyhow/thiserror**: 错误处理

---

## 🗺️ 开发路线图

### Phase 1: 基础框架 (当前)
- [x] 项目初始化
- [x] HTTP 服务器
- [x] 模型下载器
- [ ] SpeechT5 推理
- [ ] 进度回调

### Phase 2: 模型扩展
- [ ] CosyVoice 集成
- [ ] NLLB-200 集成
- [ ] 插件系统

### Phase 3: Web UI
- [ ] 模型浏览器
- [ ] Playground
- [ ] 配置管理

---

## 📝 License

MIT License

---

**版本**: v0.1.0
**更新日期**: 2025-11-30
**状态**: 🚧 开发中
