# Hybrid Search Design: IndexedDB + SciBERT

## 架构设计

### 分层搜索策略

```
用户查询 "research methods"
    ↓
┌──────────────────────────────────────┐
│ Layer 1: Fast Keyword Search        │
│ (IndexedDB - <10ms)                  │
├──────────────────────────────────────┤
│ Results:                             │
│ 1. "The research methods employed"   │
│ 2. "This study uses mixed methods"   │
│ 3. "Qualitative research methods"    │
│ 4. "Quantitative methods were used"  │
│ 5. "The methodology adopted was..."  │
└──────────────────────────────────────┘
    ↓
用户点击 "🔍 More Suggestions"
    ↓
┌──────────────────────────────────────┐
│ Layer 2: Semantic Search             │
│ (SciBERT - ~500ms)                   │
├──────────────────────────────────────┤
│ Additional Results:                  │
│ 6. "Data collection procedures"      │
│ 7. "Analytical framework adopted"    │
│ 8. "Experimental design utilized"    │
│ 9. "Statistical analysis performed"  │
│10. "Research paradigm followed"      │
└──────────────────────────────────────┘
    ↓
合并 + 去重 + 语义排序
```

## 技术实现

### 1. background.js - 混合搜索引擎

```javascript
import { pipeline } from '@huggingface/transformers';

// SciBERT 模型 (按需加载)
let scibert = null;
let scibertLoaded = false;

/**
 * 加载 SciBERT 模型 (后台延迟加载)
 */
async function loadSciBERT() {
  if (scibertLoaded) return;

  console.log('📚 Loading SciBERT model...');
  console.time('SciBERT Load Time');

  try {
    // 使用 allenai/scibert_scivocab_uncased
    scibert = await pipeline(
      'feature-extraction',
      'Xenova/scibert_scivocab_uncased',
      { quantized: true }  // 量化模型,减小体积
    );

    scibertLoaded = true;
    console.timeEnd('SciBERT Load Time');
    console.log('✅ SciBERT model loaded');
  } catch (error) {
    console.error('❌ Failed to load SciBERT:', error);
  }
}

/**
 * 混合搜索: IndexedDB + SciBERT
 */
async function hybridSearchPhrases(query, options = {}) {
  const {
    section = null,
    useSemanticSearch = false,  // 是否启用语义搜索
    maxResults = 20
  } = options;

  // Layer 1: 快速关键词搜索 (IndexedDB)
  console.time('Keyword Search');
  const keywordResults = await academicDBManager.searchPhrases(query, {
    section,
    maxResults: useSemanticSearch ? 10 : maxResults
  });
  console.timeEnd('Keyword Search');

  // 如果不使用语义搜索,直接返回
  if (!useSemanticSearch || !scibertLoaded) {
    return keywordResults;
  }

  // Layer 2: 语义搜索 (SciBERT)
  console.time('Semantic Search');

  try {
    // 计算查询向量
    const queryEmbedding = await getEmbedding(query);

    // 获取所有候选短语 (比关键词搜索范围更大)
    const allPhrases = section
      ? await academicDBManager.getPhrasesBySection(section)
      : await academicDBManager.getAllPhrases();

    // 计算每个短语的语义相似度
    const semanticResults = [];
    for (const phrase of allPhrases) {
      const phraseEmbedding = await getEmbedding(phrase.phrase);
      const similarity = cosineSimilarity(queryEmbedding, phraseEmbedding);

      // 过滤低相似度结果
      if (similarity > 0.6) {
        semanticResults.push({
          ...phrase,
          semanticScore: similarity,
          matchType: 'semantic'
        });
      }
    }

    // 按相似度降序排序
    semanticResults.sort((a, b) => b.semanticScore - a.semanticScore);

    console.timeEnd('Semantic Search');

    // 合并关键词结果和语义结果
    return mergeResults(keywordResults, semanticResults, maxResults);

  } catch (error) {
    console.error('❌ Semantic search failed:', error);
    return keywordResults;  // 降级到关键词搜索
  }
}

/**
 * 获取文本的 SciBERT 向量表示
 */
async function getEmbedding(text) {
  const output = await scibert(text, {
    pooling: 'mean',  // 平均池化
    normalize: true   // 归一化
  });

  return Array.from(output.data);
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * 合并关键词结果和语义结果
 */
function mergeResults(keywordResults, semanticResults, maxResults) {
  const merged = new Map();

  // 添加关键词结果 (优先级高)
  keywordResults.forEach(phrase => {
    merged.set(phrase.id, {
      ...phrase,
      matchType: 'keyword',
      finalScore: phrase.academicScore * 0.6 + 4  // 关键词匹配加权
    });
  });

  // 添加语义结果 (去重)
  semanticResults.forEach(phrase => {
    if (!merged.has(phrase.id)) {
      merged.set(phrase.id, {
        ...phrase,
        finalScore: phrase.academicScore * 0.4 + phrase.semanticScore * 6
      });
    }
  });

  // 转为数组,按 finalScore 排序
  const results = Array.from(merged.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, maxResults);

  console.log(`📊 Merged results: ${results.length} phrases`);
  return results;
}

// 后台延迟加载 SciBERT (5秒后)
setTimeout(() => {
  loadSciBERT();
}, 5000);

// 注册消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'searchPhrases') {
    hybridSearchPhrases(request.query, {
      section: request.section,
      useSemanticSearch: request.useSemanticSearch || false,
      maxResults: request.maxResults || 20
    }).then(results => {
      sendResponse({ success: true, data: results });
    });
    return true;
  }
});
```

### 2. content.js - UI 交互

```javascript
// 搜索短语
UIManager.prototype.searchPhrases = async function(query) {
  const searchResultsDiv = this.sidebar.querySelector('#mydictionary-academic-phrases');
  const useSemanticToggle = this.sidebar.querySelector('#use-semantic-search');

  // 显示加载状态
  searchResultsDiv.innerHTML = `
    <div class="mydictionary-loading-container">
      <div class="mydictionary-spinner"></div>
      <p>Searching phrases...</p>
    </div>
  `;

  // 执行搜索
  const response = await chrome.runtime.sendMessage({
    action: 'searchPhrases',
    query: query,
    section: this.currentSection,
    useSemanticSearch: useSemanticToggle.checked  // 用户可选
  });

  if (response.success) {
    this.displayPhrases(response.data);
  }
};

// 显示短语结果
UIManager.prototype.displayPhrases = function(phrases) {
  const container = this.sidebar.querySelector('#mydictionary-academic-phrases');

  if (phrases.length === 0) {
    container.innerHTML = `
      <div class="mydictionary-placeholder">
        No phrases found. Try different keywords.
      </div>
    `;
    return;
  }

  container.innerHTML = phrases.map(phrase => `
    <div class="mydictionary-phrase-card" data-match-type="${phrase.matchType || 'keyword'}">
      <div class="mydictionary-phrase-header">
        <span class="mydictionary-phrase-score">
          ${phrase.matchType === 'semantic' ? '🧠' : '🔍'}
          Score: ${phrase.academicScore.toFixed(1)}
        </span>
        ${phrase.semanticScore ? `
          <span class="mydictionary-semantic-score">
            Similarity: ${(phrase.semanticScore * 100).toFixed(0)}%
          </span>
        ` : ''}
        <span class="mydictionary-phrase-frequency">${phrase.frequency}</span>
      </div>

      <div class="mydictionary-phrase-content">${phrase.phrase}</div>

      <div class="mydictionary-phrase-usage">${phrase.usage || ''}</div>

      <div class="mydictionary-phrase-actions">
        <button class="mydictionary-phrase-copy-btn" data-phrase="${phrase.phrase}">
          📋 Copy
        </button>
      </div>
    </div>
  `).join('');

  // 绑定复制事件
  this.bindPhraseCopyButtons();
};
```

### 3. UI 切换开关

在 Academic Writing 面板添加语义搜索开关:

```html
<div class="mydictionary-search-options">
  <label class="mydictionary-toggle">
    <input type="checkbox" id="use-semantic-search">
    <span class="toggle-slider"></span>
    <span class="toggle-label">🧠 Semantic Search (slower, smarter)</span>
  </label>
</div>
```

CSS:
```css
.mydictionary-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
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
}
```

## 性能对比

| 指标 | IndexedDB | SciBERT | 混合方案 |
|------|-----------|---------|----------|
| 查询速度 | <10ms | ~500ms | 10ms (快速模式) / 500ms (智能模式) |
| 结果质量 | 中 (关键词匹配) | 高 (语义理解) | 高 (两者结合) |
| 模型大小 | 0 | ~420 MB | ~420 MB (可选加载) |
| 内存占用 | ~5 MB | ~500 MB | ~5 MB (快速) / ~500 MB (智能) |
| 离线可用 | ✅ | ✅ | ✅ |
| 用户体验 | 即时响应 | 有延迟 | 默认快速,可选智能 |

## 模型选择

### SciBERT 替代方案

如果 SciBERT 太大,可以使用更轻量的模型:

1. **MiniLM-L6** (已在用)
   - 大小: ~23 MB
   - 速度: ~100ms
   - 适用: 通用语义搜索

2. **all-distilroberta-v1**
   - 大小: ~82 MB
   - 速度: ~200ms
   - 效果: 比 MiniLM 稍好

3. **sentence-transformers/all-mpnet-base-v2**
   - 大小: ~420 MB
   - 速度: ~500ms
   - 效果: 最佳语义理解

**推荐**: 使用 **MiniLM-L6** (已集成),无需额外加载 SciBERT

## 实施计划

### Phase 1: 优化现有 IndexedDB 搜索 (当前)
- ✅ 关键词匹配
- ✅ 索引优化
- ✅ 快速响应 (<10ms)

### Phase 2: 集成语义搜索 (1周)
- ⏳ 复用现有 MiniLM-L6 模型 (例句功能已使用)
- ⏳ 实现语义相似度计算
- ⏳ 添加 UI 切换开关
- ⏳ 性能优化 (缓存 embeddings)

### Phase 3: 智能推荐 (未来)
- 根据用户当前写作内容推荐短语
- 上下文感知的短语建议
- 学习用户偏好

## 最终建议

**当前阶段 (v0.1.x)**:
- ✅ 保持 IndexedDB 方案
- ✅ 专注本地文件导入功能
- ✅ 提供高质量预构建数据集 (Manchester Phrasebank)

**未来增强 (v0.2.x)**:
- 🔄 复用现有 MiniLM-L6 模型添加语义搜索
- 🔄 用户可选启用智能模式
- 🔄 默认关闭,按需加载

**理由**:
1. IndexedDB 已经能很好地满足需求
2. 无需加载额外大型模型
3. 可以复用现有的例句检索模型 (MiniLM-L6)
4. 用户体验优先,速度第一
