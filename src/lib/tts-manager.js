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
   * 播放文本
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
        console.log('🎵 音频已发送到 Offscreen Document');

        // 注意: onEnd 会在 Offscreen Document 的 onended 回调中触发
        // 通过 TTS_PLAYBACK_ENDED 消息通知
      } else {
        throw new Error(response?.error || 'Failed to play audio');
      }

    } catch (error) {
      console.error('❌ 播放失败:', error);
      this.isPlaying = false;
      if (onError) onError(error);
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
