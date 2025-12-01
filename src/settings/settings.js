/**
 * MyDictionary - 设置页面
 * TTS 声音选择
 */

// 可用的声音列表
const VOICES = {
  british: {
    male: [
      { id: 'bm_george', name: 'George', desc: '清晰标准,推荐' },
      { id: 'bm_daniel', name: 'Daniel', desc: '发音准确' },
      { id: 'bm_fable', name: 'Fable', desc: '故事感' },
      { id: 'bm_lewis', name: 'Lewis', desc: '年轻声线' },
    ],
    female: [
      { id: 'bf_alice', name: 'Alice', desc: '甜美声音' },
      { id: 'bf_emma', name: 'Emma', desc: '专业' },
      { id: 'bf_isabella', name: 'Isabella', desc: '优雅' },
      { id: 'bf_lily', name: 'Lily', desc: '清新' },
    ]
  },
  american: {
    male: [
      { id: 'am_michael', name: 'Michael', desc: '标准美音' },
      { id: 'am_adam', name: 'Adam', desc: '沉稳' },
      { id: 'am_echo', name: 'Echo', desc: '回声' },
      { id: 'am_eric', name: 'Eric', desc: '友好' },
      { id: 'am_liam', name: 'Liam', desc: '年轻' },
      { id: 'am_onyx', name: 'Onyx', desc: '深沉' },
    ],
    female: [
      { id: 'af_alloy', name: 'Alloy', desc: '默认' },
      { id: 'af_nova', name: 'Nova', desc: '推荐' },
      { id: 'af_sarah', name: 'Sarah', desc: '清晰' },
      { id: 'af_bella', name: 'Bella', desc: '甜美' },
      { id: 'af_sky', name: 'Sky', desc: '天空' },
    ]
  }
};

let currentSettings = {
  voice: 'bm_george'  // 默认声音
};

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['ttsSettings']);
    if (result.ttsSettings) {
      currentSettings = result.ttsSettings;
      console.log('✅ 加载设置:', currentSettings);
    }
  } catch (error) {
    console.error('❌ 加载设置失败:', error);
  }
}

// 保存设置
async function saveSettings() {
  try {
    await chrome.storage.sync.set({ ttsSettings: currentSettings });
    console.log('✅ 保存设置:', currentSettings);

    // 显示成功提示
    const status = document.getElementById('status');
    status.textContent = '✅ 设置已保存!';
    status.className = 'status success';

    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  } catch (error) {
    console.error('❌ 保存设置失败:', error);
    alert('保存失败: ' + error.message);
  }
}

// 渲染声音卡片
function renderVoices() {
  // 英式声音
  const britishContainer = document.getElementById('british-voices');
  const britishVoices = [...VOICES.british.male, ...VOICES.british.female];

  britishContainer.innerHTML = britishVoices.map(voice => `
    <div class="voice-card ${currentSettings.voice === voice.id ? 'selected' : ''}"
         data-voice="${voice.id}">
      <div class="voice-category">${voice.id.startsWith('bm_') ? '男声' : '女声'}</div>
      <div class="voice-name">${voice.name}</div>
      <div class="voice-desc">${voice.desc}</div>
    </div>
  `).join('');

  // 美式声音
  const americanContainer = document.getElementById('american-voices');
  const americanVoices = [...VOICES.american.male, ...VOICES.american.female];

  americanContainer.innerHTML = americanVoices.map(voice => `
    <div class="voice-card ${currentSettings.voice === voice.id ? 'selected' : ''}"
         data-voice="${voice.id}">
      <div class="voice-category">${voice.id.startsWith('am_') ? '男声' : '女声'}</div>
      <div class="voice-name">${voice.name}</div>
      <div class="voice-desc">${voice.desc}</div>
    </div>
  `).join('');

  // 绑定点击事件
  document.querySelectorAll('.voice-card').forEach(card => {
    card.addEventListener('click', () => {
      // 移除所有选中状态
      document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));

      // 添加当前选中
      card.classList.add('selected');

      // 更新设置
      currentSettings.voice = card.dataset.voice;
      console.log('🎵 选择声音:', currentSettings.voice);
    });
  });
}

// 初始化
async function init() {
  await loadSettings();
  renderVoices();

  // 保存按钮
  document.getElementById('save-button').addEventListener('click', saveSettings);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
