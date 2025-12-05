/**
 * MyDictionary - TTS Manager
 * 管理文本转语音功能 (SpeechT5)
 */

import { pipeline } from '@xenova/transformers';

export class TTSManager {
  constructor() {
    this.tts = null;
    this.isLoading = false;
    this.isReady = false;
    this.isPlaying = false;    // 是否正在播放
    this.offscreenReady = false; // Offscreen Document 是否就绪

    // 默认 speaker embeddings (可以从预设中选择)
    this.DEFAULT_SPEAKER = null;

    // 本地服务器配置
    this.localServerUrl = 'http://localhost:9527'; // Rust TTS 服务器端口
    this.localServerAvailable = false;
    this.lastServerCheck = 0;
    this.serverCheckInterval = 30000; // 30秒检查一次

    // TTS 设置 (从 chrome.storage 加载)
    this.settings = {
      voice: 'bm_george', // 默认英式男声
    };

    console.log('🔊 TTS 初始化 (仅使用本地 TTS 服务器)');

    // 加载设置
    this.loadSettings();

    // 初次检查本地服务器
    this.checkLocalServer();
  }

  /**
   * 从 storage 加载设置
   */
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['ttsSettings']);
      if (result.ttsSettings) {
        this.settings = { ...this.settings, ...result.ttsSettings };
        console.log('✅ TTS 设置已加载:', this.settings);
      }
    } catch (error) {
      console.warn('⚠️ 加载 TTS 设置失败:', error);
    }
  }

  /**
   * 保存设置到 storage
   */
  async saveSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      await chrome.storage.sync.set({ ttsSettings: this.settings });
      console.log('✅ TTS 设置已保存:', this.settings);
    } catch (error) {
      console.error('❌ 保存 TTS 设置失败:', error);
    }
  }

  /**
   * 获取当前设置
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * 检查本地服务器是否可用
   */
  async checkLocalServer() {
    const now = Date.now();

    // 避免频繁检查
    if (now - this.lastServerCheck < this.serverCheckInterval) {
      return this.localServerAvailable;
    }

    this.lastServerCheck = now;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1秒超时

      const response = await fetch(`${this.localServerUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        this.localServerAvailable = true;
        console.log('✅ 本地 TTS 服务器可用:', data);
        return true;
      }
    } catch (error) {
      // 服务器不可用（正常情况）
      if (this.localServerAvailable) {
        // 之前可用，现在不可用了
        console.log('⚠️ 本地 TTS 服务器已断开');
      }
      this.localServerAvailable = false;
    }

    return false;
  }

  /**
   * 创建 Offscreen Document (用于播放音频)
   */
  async ensureOffscreenDocument() {
    if (this.offscreenReady) return;

    try {
      // 检查是否已存在 offscreen document
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL('src/offscreen/audio-player.html')]
      });

      if (existingContexts.length > 0) {
        console.log('✅ Offscreen document 已存在');
        this.offscreenReady = true;
        return;
      }

      // 创建 offscreen document
      await chrome.offscreen.createDocument({
        url: 'src/offscreen/audio-player.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play TTS audio in Service Worker environment'
      });

      this.offscreenReady = true;
      console.log('✅ Offscreen document 创建成功');

    } catch (error) {
      console.error('❌ 创建 Offscreen document 失败:', error);
      throw error;
    }
  }

  /**
   * 初始化 TTS 模型
   */
  async initialize() {
    if (this.isReady) {
      console.log('✅ TTS 模型已加载');
      return;
    }

    if (this.isLoading) {
      console.log('⏳ TTS 模型加载中，等待...');
      // 等待加载完成
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (this.isReady || !this.isLoading) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
      return;
    }

    this.isLoading = true;
    console.log('🔊 开始加载 TTS 模型 (SpeechT5)...');

    try {
      // 加载 SpeechT5 TTS 模型
      this.tts = await pipeline(
        'text-to-speech',
        'Xenova/speecht5_tts',
        {
          device: 'webgpu',  // 优先使用 WebGPU，自动 fallback 到 WASM
          progress_callback: (progress) => {
            if (progress.status === 'downloading') {
              const percent = progress.progress || 0;
              console.log(`📥 TTS 模型下载进度: ${percent.toFixed(1)}%`);

              // 发送进度到 UI
              chrome.runtime.sendMessage({
                type: 'TTS_LOADING_PROGRESS',
                progress: percent,
                status: 'downloading'
              }).catch(() => {});
            } else if (progress.status === 'loading') {
              console.log('⏳ TTS 模型加载中...');
              chrome.runtime.sendMessage({
                type: 'TTS_LOADING_PROGRESS',
                status: 'loading'
              }).catch(() => {});
            }
          }
        }
      );

      // 加载默认 speaker embeddings
      // 注意: SpeechT5 需要 speaker embeddings 来生成音频
      // 这里使用官方提供的默认 embeddings
      const response = await fetch(
        'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin'
      );
      const arrayBuffer = await response.arrayBuffer();
      this.DEFAULT_SPEAKER = new Float32Array(arrayBuffer);

      this.isReady = true;
      console.log('✅ TTS 模型加载完成!');

      // 通知 UI
      chrome.runtime.sendMessage({
        type: 'TTS_READY',
        status: 'ready'
      }).catch(() => {});

    } catch (error) {
      console.error('❌ TTS 模型加载失败:', error);
      this.isReady = false;
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 生成语音
   * @param {string} text - 要朗读的文本
   * @param {Object} options - 可选参数
   * @returns {Promise<AudioBuffer>} 音频数据
   */
  async synthesize(text, options = {}) {
    // 确保模型已加载
    await this.initialize();

    if (!this.tts) {
      throw new Error('TTS 模型未加载');
    }

    console.log(`🎵 生成 TTS: "${text.substring(0, 50)}..."`);
    const startTime = performance.now();

    try {
      // 生成音频
      const output = await this.tts(text, {
        speaker_embeddings: options.speaker || this.DEFAULT_SPEAKER
      });

      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(0);
      console.log(`✅ TTS 生成完成，耗时: ${duration}ms`);

      return output;

    } catch (error) {
      console.error('❌ TTS 生成失败:', error);
      throw error;
    }
  }

  /**
   * 播放文本 (仅使用本地 TTS 服务器)
   * @param {string} text - 要朗读的文本
   * @param {Function} onEnd - 播放结束回调
   * @param {Function} onError - 错误回调
   */
  async speak(text, onEnd = null, onError = null) {
    try {
      // 如果正在播放，先停止
      if (this.isPlaying) {
        this.stop();
      }

      // 检查本地服务器（带缓存）
      const hasLocalServer = await this.checkLocalServer();

      if (!hasLocalServer) {
        throw new Error('TTS 服务器未运行。请先启动本地 TTS 服务器。');
      }

      // 使用本地服务器
      console.log('🎵 使用本地 Rust TTS 服务器');
      await this.speakViaLocalServer(text, onEnd, onError);

    } catch (error) {
      this.isPlaying = false;
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * 估算文本的 token 数量（粗略估算）
   * 英文: 1 word ≈ 1.3 tokens
   * 中文: 1 char ≈ 1 token
   */
  estimateTokens(text) {
    // 分离中英文
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.replace(/[\u4e00-\u9fa5]/g, '').trim().split(/\s+/).filter(w => w.length > 0);

    return chineseChars.length + Math.ceil(englishWords.length * 1.3);
  }

  /**
   * 将长文本分割成较小的段落
   * @param {string} text - 原始文本
   * @param {number} maxTokens - 每段最大 token 数
   * @returns {string[]} 文本段落数组
   */
  splitTextIntoChunks(text, maxTokens = 400) {
    const estimatedTokens = this.estimateTokens(text);

    // 如果文本不长，直接返回
    if (estimatedTokens <= maxTokens) {
      return [text];
    }

    console.log(`📏 文本过长 (约 ${estimatedTokens} tokens)，分割成多段处理`);

    // 按句子分割（支持中英文）
    const sentences = text.match(/[^.!?。!?]+[.!?。!?]+|[^.!?。!?]+$/g) || [text];

    const chunks = [];
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      // 如果单句就超过限制,需要进一步分割
      if (sentenceTokens > maxTokens) {
        // 保存当前 chunk
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          currentTokens = 0;
        }

        // 按逗号或分号分割长句
        const subSentences = sentence.match(/[^,;，；]+[,;，；]+|[^,;，；]+$/g) || [sentence];
        for (const sub of subSentences) {
          const subTokens = this.estimateTokens(sub);
          if (currentTokens + subTokens > maxTokens && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sub;
            currentTokens = subTokens;
          } else {
            currentChunk += sub;
            currentTokens += subTokens;
          }
        }
      } else {
        // 正常句子，累加到 chunk
        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          currentChunk += ' ' + sentence;
          currentTokens += sentenceTokens;
        }
      }
    }

    // 添加最后的 chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log(`✂️ 文本已分割成 ${chunks.length} 段`);
    return chunks;
  }

  /**
   * 通过本地 Rust 服务器播放
   */
  async speakViaLocalServer(text, onEnd = null, onError = null) {
    try {
      // 将长文本分割成多段（使用更保守的限制，留出安全余量）
      const chunks = this.splitTextIntoChunks(text, 300);

      // 通知前端总段数
      chrome.runtime.sendMessage({
        type: 'TTS_SYNTHESIS_STARTED',
        totalChunks: chunks.length
      }).catch(() => {});

      // 如果有多段，依次播放
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎵 播放第 ${i + 1}/${chunks.length} 段: "${chunk.substring(0, 50)}..."`);

        // 通知前端当前段进度
        chrome.runtime.sendMessage({
          type: 'TTS_CHUNK_PROGRESS',
          currentChunk: i + 1,
          totalChunks: chunks.length
        }).catch(() => {});

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时（长文本需要更多时间）

        try {
          // 调用本地服务器 /synthesize API
          const response = await fetch(`${this.localServerUrl}/synthesize`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: chunk,
              format: 'wav',
              voice: this.settings.voice  // 使用设置的声音
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
          }

          // 解析 JSON 响应 (新 API 返回 URL)
          const result = await response.json();

          if (!result.url) {
            throw new Error('服务器未返回音频 URL');
          }

          console.log(`🎵 音频 URL: ${result.url} (缓存${result.cached ? '命中' : '未命中'})`);

          // 确保 Offscreen Document 已创建
          await this.ensureOffscreenDocument();

          // 等待一小段时间确保 offscreen document 完全加载
          await new Promise(resolve => setTimeout(resolve, 100));

          // 发送 URL 到 Offscreen Document 播放 (带重试)
          let playResponse = null;
          let retries = 3;

          while (retries > 0) {
            try {
              playResponse = await chrome.runtime.sendMessage({
                action: 'playAudioFromUrl',
                url: result.url
              });
              break; // 成功则跳出
            } catch (err) {
              retries--;
              if (retries === 0) throw err;

              console.warn(`⚠️ Offscreen 消息失败,重试... (剩余 ${retries} 次)`);
              // 重新创建 offscreen document
              this.offscreenReady = false;
              await this.ensureOffscreenDocument();
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

          if (playResponse && playResponse.success) {
            this.isPlaying = true;
            console.log(`✅ 第 ${i + 1} 段音频已发送到 Offscreen Document`);

            // 等待当前段播放完成再播放下一段
            if (i < chunks.length - 1) {
              // 不是最后一段，等待播放完成
              await new Promise((resolve) => {
                const listener = (message) => {
                  if (message.action === 'audioEnded') {
                    chrome.runtime.onMessage.removeListener(listener);
                    resolve();
                  }
                };
                chrome.runtime.onMessage.addListener(listener);
              });

              // 段落之间短暂停顿
              await new Promise(resolve => setTimeout(resolve, 300));
            } else {
              // 最后一段，调用 onEnd 回调
              if (onEnd) {
                chrome.runtime.onMessage.addListener(function listener(message) {
                  if (message.action === 'audioEnded') {
                    chrome.runtime.onMessage.removeListener(listener);
                    onEnd();
                  }
                });
              }
            }
          } else {
            throw new Error(playResponse?.error || 'Failed to play audio');
          }

        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      }

    } catch (error) {
      console.error('❌ 本地服务器播放失败:', error);
      throw error;
    }
  }


  /**
   * 停止播放
   */
  stop() {
    if (this.isPlaying) {
      // 发送停止消息到 Offscreen Document
      chrome.runtime.sendMessage({
        action: 'stopAudio'
      }).catch(() => {});

      this.isPlaying = false;
      console.log('🛑 播放已停止');
    }
  }

  /**
   * 暂停播放 (Web Audio API 不支持暂停，这里实现为停止)
   */
  pause() {
    this.stop();
  }

  /**
   * 检查是否正在播放
   */
  getPlayingState() {
    return this.isPlaying;
  }

  /**
   * 获取模型加载状态
   */
  getLoadingState() {
    return {
      isReady: this.isReady,
      isLoading: this.isLoading
    };
  }

  /**
   * 检查 TTS 是否可用
   * @returns {Promise<boolean>} TTS 是否可用
   */
  async isAvailable() {
    return await this.checkLocalServer();
  }
}

// 导出单例
export const ttsManager = new TTSManager();
