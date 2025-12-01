/**
 * MyDictionary - Settings Page
 * TTS Voice Selection with i18n Support
 */

// Language state
let currentLang = 'en';  // Default to English

// i18n translations
const i18n = {
  en: {
    pageTitle: 'TTS Voice Settings',
    pageDesc: 'Select your preferred text-to-speech voice',
    sectionBritish: 'British English',
    sectionAmerican: 'American English',
    sectionServer: 'TTS Server Status',
    descBritish: 'Clear pronunciation with distinct vowels and consonants, ideal for learning English word pronunciation',
    descAmerican: 'Standard American pronunciation, suitable for everyday English learning',
    labelRecommended: 'Recommended:',
    recommendedText: 'George and Daniel have the clearest pronunciation, best for English word learning',
    btnSave: 'Save Settings',
    btnDownload: 'Download TTS Server',
    btnHelp: 'Setup Guide',
    statusSuccess: '✅ Settings saved successfully!',
    categoryMale: 'Male',
    categoryFemale: 'Female',
    serverConnected: 'Connected',
    serverDisconnected: 'Not Connected',
    serverChecking: 'Checking...',
    serverMessageConnected: 'Local TTS server is running at http://localhost:9527',
    serverMessageDisconnected: 'Local TTS server is not running. Download and start the server to use offline TTS with 54 premium voices.',
    serverMessageChecking: 'Connecting to local TTS server...'
  },
  zh: {
    pageTitle: 'TTS 语音设置',
    pageDesc: '选择你喜欢的 TTS 声音',
    sectionBritish: '英式英语',
    sectionAmerican: '美式英语',
    sectionServer: 'TTS 服务器状态',
    descBritish: '英式发音对元音和辅音的区分更清晰,更适合学习英文单词发音',
    descAmerican: '标准美式发音,适合日常英语学习',
    labelRecommended: '推荐:',
    recommendedText: 'George 和 Daniel 的发音最清晰,适合英文单词学习',
    btnSave: '保存设置',
    btnDownload: '下载 TTS 服务器',
    btnHelp: '安装指南',
    statusSuccess: '✅ 设置已保存!',
    categoryMale: '男声',
    categoryFemale: '女声',
    serverConnected: '已连接',
    serverDisconnected: '未连接',
    serverChecking: '检测中...',
    serverMessageConnected: '本地 TTS 服务器正在运行: http://localhost:9527',
    serverMessageDisconnected: '本地 TTS 服务器未运行。下载并启动服务器即可使用 54 种高质量离线语音。',
    serverMessageChecking: '正在连接本地 TTS 服务器...'
  }
};

// Available voices
const VOICES = {
  british: {
    male: [
      { id: 'bm_george', name: 'George', desc: { en: 'Clear & standard, recommended', zh: '清晰标准,推荐' } },
      { id: 'bm_daniel', name: 'Daniel', desc: { en: 'Accurate pronunciation', zh: '发音准确' } },
      { id: 'bm_fable', name: 'Fable', desc: { en: 'Storytelling', zh: '故事感' } },
      { id: 'bm_lewis', name: 'Lewis', desc: { en: 'Young voice', zh: '年轻声线' } },
    ],
    female: [
      { id: 'bf_alice', name: 'Alice', desc: { en: 'Sweet voice', zh: '甜美声音' } },
      { id: 'bf_emma', name: 'Emma', desc: { en: 'Professional', zh: '专业' } },
      { id: 'bf_isabella', name: 'Isabella', desc: { en: 'Elegant', zh: '优雅' } },
      { id: 'bf_lily', name: 'Lily', desc: { en: 'Fresh', zh: '清新' } },
    ]
  },
  american: {
    male: [
      { id: 'am_michael', name: 'Michael', desc: { en: 'Standard American', zh: '标准美音' } },
      { id: 'am_adam', name: 'Adam', desc: { en: 'Steady', zh: '沉稳' } },
      { id: 'am_echo', name: 'Echo', desc: { en: 'Echo', zh: '回声' } },
      { id: 'am_eric', name: 'Eric', desc: { en: 'Friendly', zh: '友好' } },
      { id: 'am_liam', name: 'Liam', desc: { en: 'Young', zh: '年轻' } },
      { id: 'am_onyx', name: 'Onyx', desc: { en: 'Deep', zh: '深沉' } },
    ],
    female: [
      { id: 'af_alloy', name: 'Alloy', desc: { en: 'Default', zh: '默认' } },
      { id: 'af_nova', name: 'Nova', desc: { en: 'Recommended', zh: '推荐' } },
      { id: 'af_sarah', name: 'Sarah', desc: { en: 'Clear', zh: '清晰' } },
      { id: 'af_bella', name: 'Bella', desc: { en: 'Sweet', zh: '甜美' } },
      { id: 'af_sky', name: 'Sky', desc: { en: 'Sky', zh: '天空' } },
    ]
  }
};

let currentSettings = {
  voice: 'bm_george'  // Default voice
};

// Get translation
function t(key) {
  return i18n[currentLang][key] || key;
}

// Update UI text based on current language
function updateUIText() {
  document.getElementById('page-title').innerHTML = `<span class="emoji">🎵</span> ${t('pageTitle')}`;
  document.getElementById('page-desc').textContent = t('pageDesc');
  document.getElementById('section-server').textContent = t('sectionServer');
  document.getElementById('section-british').textContent = t('sectionBritish');
  document.getElementById('section-american').textContent = t('sectionAmerican');
  document.getElementById('desc-british').textContent = t('descBritish');
  document.getElementById('desc-american').textContent = t('descAmerican');
  document.getElementById('label-recommended').textContent = t('labelRecommended');
  document.getElementById('recommended-text').textContent = t('recommendedText');
  document.getElementById('btn-save').textContent = t('btnSave');
  document.getElementById('btn-download').textContent = t('btnDownload');
  document.getElementById('btn-help').textContent = t('btnHelp');
  document.getElementById('lang-switch').textContent = currentLang === 'en' ? '中文' : 'English';
}

// Switch language
function switchLanguage() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';

  // Save language preference
  chrome.storage.local.set({ uiLanguage: currentLang });

  // Update UI
  updateUIText();
  renderVoices();  // Re-render voices with new language

  console.log('🌐 Language switched to:', currentLang);
}

// Load settings
async function loadSettings() {
  try {
    // Load language preference
    const langResult = await chrome.storage.local.get(['uiLanguage']);
    if (langResult.uiLanguage) {
      currentLang = langResult.uiLanguage;
    }

    // Load TTS settings
    const result = await chrome.storage.sync.get(['ttsSettings']);
    if (result.ttsSettings) {
      currentSettings = result.ttsSettings;
      console.log('✅ Settings loaded:', currentSettings);
    }
  } catch (error) {
    console.error('❌ Failed to load settings:', error);
  }
}

// Save settings
async function saveSettings() {
  try {
    await chrome.storage.sync.set({ ttsSettings: currentSettings });
    console.log('✅ Settings saved:', currentSettings);

    // Show success message
    const status = document.getElementById('status');
    status.textContent = t('statusSuccess');
    status.className = 'status success';

    setTimeout(() => {
      status.style.display = 'none';
    }, 2000);
  } catch (error) {
    console.error('❌ Failed to save settings:', error);
    alert('Save failed: ' + error.message);
  }
}

// Render voice cards
function renderVoices() {
  // British voices
  const britishContainer = document.getElementById('british-voices');
  const britishVoices = [...VOICES.british.male, ...VOICES.british.female];

  britishContainer.innerHTML = britishVoices.map(voice => `
    <div class="voice-card ${currentSettings.voice === voice.id ? 'selected' : ''}"
         data-voice="${voice.id}">
      <div class="voice-category">${voice.id.startsWith('bm_') ? t('categoryMale') : t('categoryFemale')}</div>
      <div class="voice-name">${voice.name}</div>
      <div class="voice-desc">${voice.desc[currentLang]}</div>
    </div>
  `).join('');

  // American voices
  const americanContainer = document.getElementById('american-voices');
  const americanVoices = [...VOICES.american.male, ...VOICES.american.female];

  americanContainer.innerHTML = americanVoices.map(voice => `
    <div class="voice-card ${currentSettings.voice === voice.id ? 'selected' : ''}"
         data-voice="${voice.id}">
      <div class="voice-category">${voice.id.startsWith('am_') ? t('categoryMale') : t('categoryFemale')}</div>
      <div class="voice-name">${voice.name}</div>
      <div class="voice-desc">${voice.desc[currentLang]}</div>
    </div>
  `).join('');

  // Bind click events
  document.querySelectorAll('.voice-card').forEach(card => {
    card.addEventListener('click', () => {
      // Remove all selected states
      document.querySelectorAll('.voice-card').forEach(c => c.classList.remove('selected'));

      // Add current selected
      card.classList.add('selected');

      // Update settings
      currentSettings.voice = card.dataset.voice;
      console.log('🎵 Voice selected:', currentSettings.voice);
    });
  });
}

// Check TTS server status
async function checkServerStatus() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const serverMessage = document.getElementById('server-message');
  const serverActions = document.getElementById('server-actions');

  // Set checking state
  statusDot.className = 'status-dot checking';
  statusText.textContent = t('serverChecking');
  serverMessage.textContent = t('serverMessageChecking');
  serverActions.style.display = 'none';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch('http://localhost:9527/health', {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Server is running
      statusDot.className = 'status-dot connected';
      statusText.textContent = t('serverConnected');
      serverMessage.textContent = t('serverMessageConnected');
      serverActions.style.display = 'none';
      console.log('✅ TTS Server connected');
    } else {
      throw new Error('Server responded with error');
    }
  } catch (error) {
    // Server is not running
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = t('serverDisconnected');
    serverMessage.textContent = t('serverMessageDisconnected');
    serverActions.style.display = 'flex';
    console.log('❌ TTS Server not connected:', error.message);
  }
}

// Initialize
async function init() {
  await loadSettings();
  updateUIText();
  renderVoices();
  await checkServerStatus();

  // Language switch button
  document.getElementById('lang-switch').addEventListener('click', switchLanguage);

  // Save button
  document.getElementById('save-button').addEventListener('click', saveSettings);

  // Refresh server status every 10 seconds
  setInterval(checkServerStatus, 10000);

  console.log('✅ Settings page initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
