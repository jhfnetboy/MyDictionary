# Performance Detection UI Code

## 在 content.js 中添加的代码

### 1. 在学术模式初始化时运行性能检测

在 `initializeAcademicPhrasebank()` 方法中,下载数据库后自动检测性能:

```javascript
UIManager.prototype.initializeAcademicPhrasebank = async function() {
  console.log('📚 Initializing academic phrasebank...');

  // 检查数据库状态
  const statusResponse = await chrome.runtime.sendMessage({
    action: 'checkAcademicDatabaseStatus'
  });

  // 如果未下载,显示下载提示
  if (!statusResponse.data.isDownloaded) {
    this.showAcademicDownloadPrompt();
    return;
  }

  // 数据库已下载,初始化短语库
  const response = await chrome.runtime.sendMessage({
    action: 'initializePhrasebank'
  });

  if (response.success) {
    this.phrasebankInitialized = true;

    // ✨ 新增: 检测性能并显示推荐
    await this.detectPerformanceAndShowRecommendation();

    // 加载默认部分的短语
    this.handleSectionChange();
  } else {
    this.showError('Failed to initialize phrasebank');
  }
};
```

### 2. 性能检测和推荐显示方法

```javascript
/**
 * 检测性能并显示推荐
 */
UIManager.prototype.detectPerformanceAndShowRecommendation = async function() {
  try {
    console.log('🔍 Detecting performance...');

    // 调用 background.js 进行性能检测
    const response = await chrome.runtime.sendMessage({
      action: 'detectPerformance'
    });

    if (response.success) {
      const { level, recommendation, cached } = response.data;

      console.log(`📊 Performance Level: ${level}`);
      console.log(`📋 Recommendation:`, recommendation);

      // 显示推荐卡片
      this.showPerformanceRecommendation(recommendation, cached);

      // 保存到本地 (用于后续判断)
      this.performanceLevel = level;
      this.performanceRecommendation = recommendation;
    }

  } catch (error) {
    console.error('❌ Performance detection failed:', error);
    // 降级: 假设低性能
    this.performanceLevel = 'low';
  }
};

/**
 * 显示性能推荐卡片
 */
UIManager.prototype.showPerformanceRecommendation = function(recommendation, cached = false) {
  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');

  // 创建推荐卡片 (插入到短语列表之前)
  const recommendationCard = document.createElement('div');
  recommendationCard.className = 'mydictionary-performance-card';
  recommendationCard.innerHTML = `
    <div class="mydictionary-performance-header">
      <span class="mydictionary-performance-icon">
        ${recommendation.canUseSemanticSearch ? '🚀' : '💡'}
      </span>
      <h4>性能检测结果 ${cached ? '(缓存)' : ''}</h4>
      <button class="mydictionary-close-card" title="关闭">×</button>
    </div>

    <p class="mydictionary-performance-message">
      ${recommendation.message}
    </p>

    <div class="mydictionary-performance-features">
      ${recommendation.features.map(feature => `
        <div class="mydictionary-feature-item">${feature}</div>
      `).join('')}
    </div>

    ${recommendation.downloadModelPrompt ? `
      <div class="mydictionary-performance-actions">
        <button class="mydictionary-btn-primary" id="enable-semantic-search-btn">
          🧠 启用语义搜索
        </button>
        <button class="mydictionary-btn-secondary" id="keep-fast-mode-btn">
          ⚡ 继续使用快速模式
        </button>
      </div>
    ` : `
      <div class="mydictionary-performance-note">
        ℹ️ 当前设备最适合使用快速关键词搜索模式
      </div>
    `}
  `;

  // 插入到容器顶部
  if (phrasesContainer.firstChild) {
    phrasesContainer.insertBefore(recommendationCard, phrasesContainer.firstChild);
  } else {
    phrasesContainer.appendChild(recommendationCard);
  }

  // 绑定关闭按钮
  const closeBtn = recommendationCard.querySelector('.mydictionary-close-card');
  closeBtn.addEventListener('click', () => {
    recommendationCard.remove();
  });

  // 绑定启用语义搜索按钮
  if (recommendation.downloadModelPrompt) {
    const enableBtn = recommendationCard.querySelector('#enable-semantic-search-btn');
    const keepFastBtn = recommendationCard.querySelector('#keep-fast-mode-btn');

    enableBtn?.addEventListener('click', async () => {
      await this.enableSemanticSearch();
      recommendationCard.remove();
    });

    keepFastBtn?.addEventListener('click', () => {
      // 保存用户选择: 不启用语义搜索
      chrome.storage.local.set({ preferFastMode: true });
      recommendationCard.remove();
    });
  }
};

/**
 * 启用语义搜索
 */
UIManager.prototype.enableSemanticSearch = async function() {
  console.log('🧠 Enabling semantic search...');

  // 显示加载提示
  const statusDiv = document.createElement('div');
  statusDiv.className = 'mydictionary-semantic-loading';
  statusDiv.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>正在准备语义搜索模型...</p>
      <p class="mydictionary-loading-note">
        首次加载可能需要 1-2 分钟,请耐心等待
      </p>
    </div>
  `;

  const phrasesContainer = this.sidebar.querySelector('#mydictionary-academic-phrases');
  phrasesContainer.prepend(statusDiv);

  try {
    // 这里可以触发模型下载 (如果需要)
    // 目前我们复用现有的 MiniLM-L6 模型

    // 保存用户选择
    await chrome.storage.local.set({
      useSemanticSearch: true,
      semanticSearchEnabled: true
    });

    // 移除加载提示
    statusDiv.remove();

    // 显示成功消息
    const successMsg = document.createElement('div');
    successMsg.className = 'mydictionary-success';
    successMsg.textContent = '✅ 语义搜索已启用!现在搜索将更加智能。';
    phrasesContainer.prepend(successMsg);

    setTimeout(() => successMsg.remove(), 5000);

    // 刷新搜索 UI (添加语义搜索切换开关)
    this.addSemanticSearchToggle();

  } catch (error) {
    statusDiv.remove();

    const errorMsg = document.createElement('div');
    errorMsg.className = 'mydictionary-error';
    errorMsg.textContent = '❌ 启用语义搜索失败: ' + error.message;
    phrasesContainer.prepend(errorMsg);

    setTimeout(() => errorMsg.remove(), 5000);
  }
};

/**
 * 添加语义搜索切换开关
 */
UIManager.prototype.addSemanticSearchToggle = function() {
  const searchSection = this.sidebar.querySelector('.mydictionary-academic-search');

  if (!searchSection || searchSection.querySelector('.mydictionary-semantic-toggle')) {
    return; // 已存在
  }

  const toggleDiv = document.createElement('div');
  toggleDiv.className = 'mydictionary-semantic-toggle';
  toggleDiv.innerHTML = `
    <label class="mydictionary-toggle">
      <input type="checkbox" id="use-semantic-search" checked>
      <span class="toggle-slider"></span>
      <span class="toggle-label">🧠 智能语义搜索</span>
    </label>
    <div class="mydictionary-toggle-hint">
      启用后将使用 AI 理解语义,搜索更准确但稍慢
    </div>
  `;

  searchSection.appendChild(toggleDiv);
};
```

### 3. CSS 样式 (添加到 src/ui/sidebar.css)

```css
/* Performance Recommendation Card */
.mydictionary-performance-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.mydictionary-performance-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.mydictionary-performance-icon {
  font-size: 32px;
}

.mydictionary-performance-header h4 {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.mydictionary-close-card {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: background 0.2s;
}

.mydictionary-close-card:hover {
  background: rgba(255, 255, 255, 0.3);
}

.mydictionary-performance-message {
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 16px 0;
  opacity: 0.95;
}

.mydictionary-performance-features {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.mydictionary-feature-item {
  font-size: 13px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  border-left: 3px solid rgba(255, 255, 255, 0.5);
}

.mydictionary-performance-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.mydictionary-performance-actions .mydictionary-btn-primary,
.mydictionary-performance-actions .mydictionary-btn-secondary {
  flex: 1;
  background: white;
  color: #667eea;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mydictionary-performance-actions .mydictionary-btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.mydictionary-performance-actions .mydictionary-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.mydictionary-performance-actions .mydictionary-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
}

.mydictionary-performance-note {
  font-size: 13px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  margin-top: 12px;
  text-align: center;
}

/* Semantic Search Toggle */
.mydictionary-semantic-toggle {
  margin-top: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.mydictionary-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.mydictionary-toggle input[type="checkbox"] {
  width: 44px;
  height: 24px;
  appearance: none;
  background: #ddd;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
}

.mydictionary-toggle input[type="checkbox"]:checked {
  background: #667eea;
}

.mydictionary-toggle input[type="checkbox"]::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: left 0.3s;
}

.mydictionary-toggle input[type="checkbox"]:checked::before {
  left: 22px;
}

.toggle-label {
  font-size: 13px;
  color: #495057;
  font-weight: 500;
}

.mydictionary-toggle-hint {
  font-size: 11px;
  color: #6c757d;
  margin-top: 6px;
  padding-left: 54px;
}

/* Semantic Loading */
.mydictionary-semantic-loading {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.mydictionary-loading-note {
  font-size: 12px;
  color: #6c757d;
  margin-top: 8px;
}
```

## 使用流程

1. 用户首次切换到 Academic Writing 标签
2. 如果数据库未下载,显示下载提示
3. 用户点击下载,数据导入完成
4. **自动运行性能检测** (3-5秒)
5. 显示性能推荐卡片:
   - **高性能**: "🚀 你的设备性能优秀!可以启用智能语义搜索..."
   - **中等性能**: "👍 你的设备性能良好!建议使用轻量级语义搜索..."
   - **低性能**: "💡 你的设备性能有限,建议使用快速关键词搜索..."
6. 用户选择:
   - 点击 "启用语义搜索" → 添加切换开关,搜索时可选语义模式
   - 点击 "继续使用快速模式" → 关闭卡片,仅使用 IndexedDB
   - 点击 "×" → 稍后决定
7. 检测结果缓存 7 天,避免重复检测

## 性能检测逻辑

- **高性能 (score ≥ 75)**:
  - CPU 核心 ≥ 8
  - 内存 ≥ 8 GB
  - WebGPU 支持
  - 基准测试快速 (<100ms)
  - **推荐**: SciBERT 或 MiniLM-L6

- **中等性能 (50 ≤ score < 75)**:
  - CPU 核心 ≥ 4
  - 内存 ≥ 4 GB
  - 基准测试中等 (100-500ms)
  - **推荐**: MiniLM-L6 (轻量级)

- **低性能 (score < 50)**:
  - CPU 核心 < 4
  - 内存 < 4 GB
  - 基准测试慢 (>500ms)
  - **推荐**: IndexedDB 关键词搜索

## 基准测试内容

1. **CPU 测试**: 256x256 矩阵乘法 (模拟 ML 计算)
2. **内存测试**: 100万浮点数数组操作

## 缓存机制

- 结果存储在 `chrome.storage.local`
- 缓存有效期: 7 天
- 7 天后自动重新检测
- 用户可手动触发重新检测

## 优势

1. ✅ **自动化**: 无需用户手动选择
2. ✅ **智能推荐**: 基于真实硬件性能
3. ✅ **用户友好**: 清晰的提示和选项
4. ✅ **性能优先**: 避免低端设备加载大模型卡顿
5. ✅ **灵活性**: 用户可以自己选择覆盖推荐
