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
    this.localServerUrl = 'http://localhost:3030'; // Rust 服务器端口
    this.localServerAvailable = false;
    this.lastServerCheck = 0;
    this.serverCheckInterval = 30000; // 30秒检查一次

    console.log('🔊 TTS 初始化 (自动模式: 本地优先 → 浏览器回退)');

    // 初次检查本地服务器
    this.checkLocalServer();
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
   * 播放文本 (自动模式: 本地优先 → 浏览器回退)
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

      if (hasLocalServer) {
        // 优先使用本地服务器
        console.log('🎵 使用本地 Rust TTS 服务器');
        try {
          await this.speakViaLocalServer(text, onEnd, onError);
          return; // 成功则直接返回
        } catch (localError) {
          console.warn('⚠️ 本地服务器失败，回退到浏览器 TTS:', localError.message);
          // 标记服务器不可用
          this.localServerAvailable = false;
          // 继续使用浏览器 TTS
        }
      }

      // 使用浏览器 TTS (回退或默认)
      console.log('🎵 使用浏览器 TTS (SpeechT5)');
      await this.speakViaBrowser(text, onEnd, onError);

    } catch (error) {
      console.error('❌ 播放失败:', error);
      this.isPlaying = false;
      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * 通过本地 Rust 服务器播放
   */
  async speakViaLocalServer(text, onEnd = null, onError = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    try {
      // 调用本地服务器 /synthesize API
      const response = await fetch(`${this.localServerUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          format: 'wav'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // 获取音频 Blob
      const audioBlob = await response.blob();

      // 确保 Offscreen Document 已创建
      await this.ensureOffscreenDocument();

      // 将 Blob 转换为 ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);

      // 发送到 Offscreen Document 播放
      const playResponse = await chrome.runtime.sendMessage({
        action: 'playAudioFromBlob',
        audioData: Array.from(audioData),
        mimeType: 'audio/wav'
      });

      if (playResponse && playResponse.success) {
        this.isPlaying = true;
        console.log('🎵 音频已发送到 Offscreen Document (本地服务器)');
      } else {
        throw new Error(playResponse?.error || 'Failed to play audio');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ 本地服务器播放失败:', error);
      throw error;
    }
  }

  /**
   * 通过浏览器 TTS 播放
   */
  async speakViaBrowser(text, onEnd = null, onError = null) {
    try {
      // 确保 Offscreen Document 已创建
      await this.ensureOffscreenDocument();

      // 生成音频
      const audioData = await this.synthesize(text);

      // 将 Float32Array 转换为可传输的格式
      const audioArray = Array.from(audioData.audio); // Float32Array -> Array
      const sampleRate = audioData.sampling_rate;

      // 发送到 Offscreen Document 播放
      const response = await chrome.runtime.sendMessage({
        action: 'playAudio',
        audioArray: audioArray,
        sampleRate: sampleRate
      });

      if (response && response.success) {
        this.isPlaying = true;
        console.log('🎵 音频已发送到 Offscreen Document (浏览器 TTS)');
      } else {
        throw new Error(response?.error || 'Failed to play audio');
      }

    } catch (error) {
      console.error('❌ 浏览器 TTS 播放失败:', error);
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
}

// 导出单例
export const ttsManager = new TTSManager();
