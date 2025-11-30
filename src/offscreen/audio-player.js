/**
 * Offscreen Document Audio Player
 * 用于在 Service Worker 环境中播放音频
 */

let audioContext = null;
let currentSource = null;

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Offscreen] 收到消息:', message.action);

  if (message.action === 'playAudio') {
    playAudio(message.audioArray, message.sampleRate)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] 播放失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }

  if (message.action === 'playAudioFromBlob') {
    playAudioFromBlob(message.audioData, message.mimeType)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('[Offscreen] 播放 Blob 失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 异步响应
  }

  if (message.action === 'stopAudio') {
    stopAudio();
    sendResponse({ success: true });
    return false;
  }
});

/**
 * 播放音频
 */
async function playAudio(audioArray, sampleRate) {
  try {
    // 停止当前播放
    stopAudio();

    // 创建 AudioContext
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // 创建 AudioBuffer
    const audioBuffer = audioContext.createBuffer(
      1,  // 单声道
      audioArray.length,
      sampleRate
    );

    // 填充数据
    const channelData = audioBuffer.getChannelData(0);
    const float32Array = new Float32Array(audioArray);
    channelData.set(float32Array);

    // 创建音频源
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    // 播放结束回调
    source.onended = () => {
      currentSource = null;
      console.log('[Offscreen] 播放结束');

      // 通知 background
      chrome.runtime.sendMessage({
        type: 'TTS_PLAYBACK_ENDED'
      }).catch(() => {});
    };

    // 开始播放
    source.start(0);
    currentSource = source;

    console.log('[Offscreen] 开始播放');

  } catch (error) {
    console.error('[Offscreen] 播放错误:', error);

    // 通知 background 错误
    chrome.runtime.sendMessage({
      type: 'TTS_PLAYBACK_ERROR',
      error: error.message
    }).catch(() => {});

    throw error;
  }
}

/**
 * 播放来自 Blob 的音频 (本地服务器)
 */
async function playAudioFromBlob(audioData, mimeType) {
  try {
    // 停止当前播放
    stopAudio();

    // 创建 AudioContext
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // 将 Array 转回 Uint8Array
    const uint8Array = new Uint8Array(audioData);

    // 解码音频数据
    const audioBuffer = await audioContext.decodeAudioData(uint8Array.buffer);

    // 创建音频源
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);

    // 播放结束回调
    source.onended = () => {
      currentSource = null;
      console.log('[Offscreen] 播放结束 (来自本地服务器)');

      // 通知 background
      chrome.runtime.sendMessage({
        type: 'TTS_PLAYBACK_ENDED'
      }).catch(() => {});
    };

    // 开始播放
    source.start(0);
    currentSource = source;

    console.log('[Offscreen] 开始播放 (来自本地服务器)');

  } catch (error) {
    console.error('[Offscreen] 播放 Blob 错误:', error);

    // 通知 background 错误
    chrome.runtime.sendMessage({
      type: 'TTS_PLAYBACK_ERROR',
      error: error.message
    }).catch(() => {});

    throw error;
  }
}

/**
 * 停止播放
 */
function stopAudio() {
  if (currentSource) {
    try {
      currentSource.stop();
      currentSource = null;
      console.log('[Offscreen] 已停止播放');
    } catch (error) {
      console.error('[Offscreen] 停止失败:', error);
    }
  }
}

console.log('[Offscreen] Audio Player 已初始化');
