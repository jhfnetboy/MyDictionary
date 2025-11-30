use anyhow::Result;
use hf_hub::{api::sync::ApiBuilder, Repo, RepoType};
use std::path::PathBuf;
use tracing::info;

pub struct ModelDownloader {
    cache_dir: PathBuf,
}

impl ModelDownloader {
    pub fn new() -> Self {
        let cache_dir = dirs::cache_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("huggingface");

        Self { cache_dir }
    }

    pub async fn download(&self, model_id: &str) -> Result<PathBuf> {
        info!("📦 下载模型: {}", model_id);
        info!("📁 缓存目录: {:?}", self.cache_dir);

        // 使用 hf-hub 下载模型
        let api = ApiBuilder::new()
            .with_cache_dir(self.cache_dir.clone())
            .build()?;

        let repo = api.repo(Repo::new(
            model_id.to_string(),
            RepoType::Model
        ));

        // 获取模型文件列表
        info!("🔍 获取模型文件列表...");

        // 下载 config.json (所有模型都有)
        let config_path = repo.get("config.json")?;
        info!("✅ 下载 config.json: {:?}", config_path);

        // 返回模型目录
        let model_dir = config_path.parent()
            .ok_or_else(|| anyhow::anyhow!("无法获取模型目录"))?;

        Ok(model_dir.to_path_buf())
    }
}
