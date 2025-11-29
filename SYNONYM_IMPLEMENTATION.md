# 双引擎同义词实现方案

## 架构设计

### 引擎1: WordNet 词典 (fast, accurate)
- 库: `natural` (已安装)
- 速度: <50ms
- 覆盖: 155,000 词
- 返回: 前4个同义词

### 引擎2: BERT 语义相似度 (powerful, flexible)
- 模型: `Xenova/paraphrase-MiniLM-L6-v2` (90MB)
- 速度: ~300-500ms
- 覆盖: 任意词汇
- 返回: 前4个语义相似词

## Backend 实现 (background.js)

```javascript
// 1. WordNet 查询函数
async function getSynonymsFromWordNet(word) {
  return new Promise((resolve) => {
    const synonyms = new Set();

    Promise.all([
      wordpos.lookupNoun(word),
      wordpos.lookupVerb(word),
      wordpos.lookupAdjective(word),
      wordpos.lookupAdverb(word)
    ]).then(results => {
      results.flat().forEach(result => {
        if (result.synonyms) {
          result.synonyms.forEach(syn => synonyms.add(syn));
        }
      });

      const syns = [...synonyms]
        .filter(syn => syn.toLowerCase() !== word.toLowerCase())
        .slice(0, 4)
        .map(syn => ({ word: syn, source: 'WordNet' }));

      resolve(syns);
    }).catch(() => resolve([]));
  });
}

// 2. BERT 相似度计算
async function getSynonymsFromBERT(word) {
  // 加载模型
  if (!modelManager.models.synonymsBERT) {
    const model = await pipeline('feature-extraction', 'Xenova/paraphrase-MiniLM-L6-v2');
    modelManager.models.synonymsBERT = model;
  }

  // 候选词池 (通用高频词)
  const candidates = generateCandidates(word); // 智能生成候选词

  // 计算相似度
  const targetEmb = await modelManager.models.synonymsBERT(word);
  const similarities = [];

  for (const cand of candidates) {
    const candEmb = await modelManager.models.synonymsBERT(cand);
    const sim = cosineSimilarity(targetEmb.data, candEmb.data);
    if (sim > 0.4) similarities.push({ word: cand, score: sim });
  }

  return similarities
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => ({ word: s.word, confidence: `${(s.score * 100).toFixed(1)}%`, source: 'BERT' }));
}

// 3. 主处理函数
async function handleGetSynonyms(request, sendResponse) {
  const { word } = request;
  const startTime = performance.now();

  // 并行运行两个引擎
  const [wordnetResults, bertResults] = await Promise.all([
    getSynonymsFromWordNet(word),
    getSynonymsFromBERT(word)
  ]);

  sendResponse({
    success: true,
    data: {
      original: word,
      wordnet: wordnetResults,
      bert: bertResults,
      latency: (performance.now() - startTime).toFixed(2)
    }
  });
}
```

## Frontend 显示 (content.js)

```javascript
// 显示两组结果
if (response.success) {
  const { wordnet, bert, latency } = response.data;

  output.innerHTML = `
    <div class="mydictionary-synonyms-result">
      <h3>📚 Synonyms for "${targetWord}"</h3>

      <!-- WordNet 结果 -->
      <div class="synonym-engine-section">
        <h4>📖 WordNet Dictionary (${wordnet.length})</h4>
        <ul>${wordnet.map(s => `<li>${s.word}</li>`).join('')}</ul>
      </div>

      <!-- BERT 结果 -->
      <div class="synonym-engine-section">
        <h4>🤖 BERT Semantic (${bert.length})</h4>
        <ul>${bert.map(s => `<li>${s.word} <span class="confidence">${s.confidence}</span></li>`).join('')}</ul>
      </div>

      <div class="mydictionary-meta">⏱️ ${latency}ms</div>
    </div>
  `;
}
```

## 优势

1. **互补性**: WordNet 精准但有限, BERT 灵活但需计算
2. **速度**: WordNet 极快, BERT 稍慢但可接受
3. **覆盖**: 组合后几乎覆盖所有词汇
4. **质量**: 双重验证, 结果更可靠

## 测试用例

```
输入: fuel
WordNet: power, drive, energy, propel
BERT: boost, energize, power, strengthen

输入: professional
WordNet: expert, specialist, practitioner
BERT: expert, consultant, specialist, professional

输入: analyze
WordNet: examine, study, investigate
BERT: evaluate, assess, review, examine
```
