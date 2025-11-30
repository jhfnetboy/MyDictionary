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

    // 双模式支持
    this.mode = 'auto'; // 'auto' | 'local-only' | 'browser-only'
    this.serverUrl = 'http://localhost:5050';
    this.serverAvailable = false;

    // 从 storage 加载设置
    this.loadSettings();
  }

  /**
   * 加载用户设置
   */
  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get(['ttsMode', 'ttsServerUrl']);
      this.mode = settings.ttsMode || 'auto';
      this.serverUrl = settings.ttsServerUrl || 'http://localhost:5050';
      console.log(`🔊 TTS 模式: ${this.mode}, 服务器: ${this.serverUrl}`);

      // 如果是 auto 或 local-only 模式，检查服务器
      if (this.mode !== 'browser-only') {
        await this.checkServerAvailability();
      }
    } catch (error) {
      console.error('❌ 加载 TTS 设置失败:', error);
    }
  }

  /**
   * 检查本地服务器是否可用
   */
  async checkServerAvailability() {
    try {
      const response = await fetch(`${this.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2秒超时
      });

      if (response.ok) {
        this.serverAvailable = true;
        console.log('✅ TTS 本地服务器可用');
      } else {
        this.serverAvailable = false;
        console.log('⚠️ TTS 本地服务器不可用 (返回错误)');
      }
    } catch (error) {
      this.serverAvailable = false;
      console.log('⚠️ TTS 本地服务器不可用:', error.message);
    }
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
   * 播放文本 (双模式支持)
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

      // 决定使用哪种模式
      const useLocal = this.shouldUseLocalServer();

      if (useLocal) {
        console.log('🎵 使用本地 TTS 服务器');
        await this.speakViaServer(text, onEnd, onError);
      } else {
        console.log('🎵 使用浏览器 TTS (SpeechT5)');
        await this.speakViaBrowser(text, onEnd, onError);
      }

    } catch (error) {
      console.error('❌ 播放失败:', error);
      this.isPlaying = false;
      if (onError) onError(error);

      // Auto 模式: 如果本地服务器失败，回退到浏览器
      if (this.mode === 'auto' && this.serverAvailable) {
        console.log('⚠️ 本地服务器失败，回退到浏览器 TTS');
        try {
          await this.speakViaBrowser(text, onEnd, onError);
        } catch (fallbackError) {
          console.error('❌ 浏览器 TTS 也失败:', fallbackError);
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 判断是否应该使用本地服务器
   */
  shouldUseLocalServer() {
    if (this.mode === 'local-only') {
      return true; // 强制使用本地
    }
    if (this.mode === 'browser-only') {
      return false; // 强制使用浏览器
    }
    // auto 模式: 优先本地，如果可用
    return this.serverAvailable;
  }

  /**
   * 通过本地服务器播放
   */
  async speakViaServer(text, onEnd = null, onError = null) {
    try {
      // 调用本地服务器 API
      const response = await fetch(`${this.serverUrl}/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          format: 'wav'
        })
      });

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
        console.log('🎵 音频已发送到 Offscreen Document (来自本地服务器)');
      } else {
        throw new Error(playResponse?.error || 'Failed to play audio from server');
      }

    } catch (error) {
      console.error('❌ 本地服务器播放失败:', error);
      throw error;
    }
  }

  /**
   * 通过浏览器 TTS 播放 (原有逻辑)
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

        // 注意: onEnd 会在 Offscreen Document 的 onended 回调中触发
        // 通过 TTS_PLAYBACK_ENDED 消息通知
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
