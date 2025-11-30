use axum::{
    routing::{get, post},
    Router,
    Json,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing::{info, Level};

mod downloader;

use downloader::ModelDownloader;

#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct ServerInfo {
    name: String,
    version: String,
    status: String,
    mode: String,
}

/// GET / - 服务器信息
async fn get_server_info() -> Json<ApiResponse<ServerInfo>> {
    Json(ApiResponse {
        success: true,
        data: Some(ServerInfo {
            name: "Model Runner".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            status: "running".to_string(),
            mode: "rust-native".to_string(),
        }),
        error: None,
    })
}

#[derive(Debug, Deserialize)]
struct DownloadRequest {
    model_id: String,
}

/// POST /models/download - 下载模型
async fn download_model(
    Json(payload): Json<DownloadRequest>
) -> Json<ApiResponse<String>> {
    info!("📥 开始下载模型: {}", payload.model_id);

    let downloader = ModelDownloader::new();

    match downloader.download(&payload.model_id).await {
        Ok(path) => {
            info!("✅ 模型下载成功: {:?}", path);
            Json(ApiResponse {
                success: true,
                data: Some(format!("模型已下载到: {:?}", path)),
                error: None,
            })
        },
        Err(e) => {
            info!("❌ 模型下载失败: {}", e);
            Json(ApiResponse {
                success: false,
                data: None,
                error: Some(format!("下载失败: {}", e)),
            })
        }
    }
}

/// GET /health - 健康检查
async fn health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("healthy".to_string()),
        error: None,
    })
}

#[derive(Debug, Deserialize)]
struct SynthesizeRequest {
    text: String,
    #[serde(default = "default_format")]
    format: String,
}

fn default_format() -> String {
    "wav".to_string()
}

/// POST /synthesize - TTS 合成 (模拟)
async fn synthesize(
    Json(payload): Json<SynthesizeRequest>
) -> Json<ApiResponse<String>> {
    info!("🎵 TTS 合成请求: \"{}\"", payload.text);

    // 模拟模式 - 返回成功消息
    // TODO: 实际的 TTS 推理将在集成 Candle 后实现
    Json(ApiResponse {
        success: true,
        data: Some(format!(
            "模拟 TTS 合成成功: {} (format: {})\n实际音频生成将在 Candle 集成后实现",
            payload.text,
            payload.format
        )),
        error: None,
    })
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 初始化日志
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    info!("🚀 启动 Model Runner 服务器...");

    // 创建路由
    let app = Router::new()
        .route("/", get(get_server_info))
        .route("/models/download", post(download_model))
        .route("/synthesize", post(synthesize))
        .route("/health", get(health_check))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        );

    // 绑定地址
    let addr = SocketAddr::from(([0, 0, 0, 0], 3030));
    info!("🎯 服务器监听地址: {}", addr);

    // 启动服务器
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
