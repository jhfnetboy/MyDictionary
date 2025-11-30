# MyDictionary - 学术写作专用模型设计

## 一、发现的专用模型

基于调研,以下是适合学术写作的专用模型:

### 1.1 SciBERT (AllenAI)
**最适合学术论文的 BERT 模型**

| 属性 | 值 |
|------|-----|
| **模型名称** | `allenai/scibert_scivocab_uncased` |
| **训练数据** | 1.14M 篇学术论文 (Semantic Scholar) |
| **数据量** | 3.1B tokens |
| **特点** | 专用学术词汇表 (scivocab) |
| **大小** | ~440MB |
| **支持任务** | 文本分类、命名实体识别、句子嵌入 |
| **Transformers.js 支持** | ❌ 需要转换为 ONNX |

**优势**:
- ✅ 专为学术论文训练,理解科学术语和表达
- ✅ 在科学领域 NLP 任务上达到 SOTA
- ✅ 可用于学术词汇的上下文理解

**用途**:
- 学术近义词推荐(基于上下文的科学术语替换)
- 学术例句检索(从论文语料库中提取相关句子)

---

### 1.2 SPECTER2 (AllenAI)
**科学文献嵌入模型**

| 属性 | 值 |
|------|-----|
| **模型名称** | `allenai/specter2` |
| **特点** | 多任务科学文献嵌入 |
| **大小** | ~440MB |
| **支持任务** | 文献相似度、引用推荐、文档分类 |
| **Transformers.js 支持** | ❌ 需要转换 |

**用途**:
- 查找与当前论文相关的学术例句
- 推荐相似的学术表达方式

---

### 1.3 Academic Phrasebank 数据集
**学术写作短语库**

| 属性 | 值 |
|------|-----|
| **来源** | University of Manchester |
| **数据量** | 20,000+ 学术短语/句子 |
| **分类** | Introduction, Methods, Results, Discussion, Conclusion |
| **特点** | 真实学术论文中提取的常用表达 |
| **大小** | ~5-10MB (JSON 格式) |
| **支持语言** | 英文 |

**示例分类**:
```
Introduction:
- "This paper examines..."
- "The purpose of this study is to..."
- "In recent years, there has been..."

Methods:
- "Data were collected using..."
- "The sample consisted of..."
- "Participants were randomly assigned to..."

Results:
- "The findings suggest that..."
- "A significant difference was found..."
- "The results indicate..."

Discussion:
- "These results are consistent with..."
- "One possible explanation is..."
- "This study has several limitations..."
```

---

## 二、推荐的学术写作模型组合

### 方案 A: 完整学术写作套件 (推荐)

```javascript
const ACADEMIC_WRITING_MODELS = {
  // 核心模型 1: 学术文本理解
  academicBERT: {
    modelPath: 'allenai/scibert_scivocab_uncased',
    size: 440, // MB
    task: 'fill-mask',
    capabilities: [
      'academic_synonym_suggestion',
      'context_aware_replacement',
      'scientific_term_understanding'
    ]
  },

  // 核心模型 2: 学术短语库 (本地 JSON 数据集)
  academicPhrasebank: {
    dataPath: './assets/academic-phrasebank.json',
    size: 8, // MB
    categories: [
      'introduction',
      'methods',
      'results',
      'discussion',
      'conclusion',
      'literature_review'
    ],
    totalPhrases: 20000
  },

  // 扩展模型: 学术例句嵌入 (用于检索相似例句)
  sentenceEmbedding: {
    modelPath: 'Xenova/all-MiniLM-L6-v2',
    size: 23, // MB
    task: 'feature-extraction',
    capabilities: [
      'sentence_similarity',
      'example_retrieval'
    ]
  }
};
```

**总大小**: ~471MB

---

### 方案 B: 精简方案 (仅短语库)

如果担心模型体积过大,可以只使用 Academic Phrasebank:

```javascript
const LIGHTWEIGHT_ACADEMIC = {
  academicPhrasebank: {
    dataPath: './assets/academic-phrasebank.json',
    size: 8, // MB
    totalPhrases: 20000
  }
};
```

**总大小**: ~8MB

**优势**:
- ✅ 体积极小
- ✅ 无需模型推理,查询速度快
- ✅ 涵盖最常用的学术表达

**劣势**:
- ❌ 无法基于上下文智能推荐
- ❌ 短语固定,无法动态生成

---

## 三、功能设计

### 3.1 学术写作模式

**用户在侧边栏切换到"学术模式"**:

```
┌─────────────────────────────────────┐
│  ✕  MyDictionary                🌙 │
├─────────────────────────────────────┤
│  模式: [ 通用翻译 | 🎓 学术写作 ]    │
├─────────────────────────────────────┤
│                                     │
│  输入词汇或短语:                     │
│  ┌───────────────────────────────┐ │
│  │ examine                       │ │
│  └───────────────────────────────┘ │
│                                     │
│  翻译:                               │
│  检查、审查、研究                    │
│                                     │
│  ─────────────────────────────────  │
│  [📚 学术近义词]  [💬 学术例句]      │
│  [📖 学术短语]                       │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 学术近义词功能

**点击 [📚 学术近义词] 按钮**:

```
┌─────────────────────────────────────┐
│  📚 学术近义词                       │
│                                     │
│  基于学术语料库的同义词推荐:          │
│                                     │
│  • investigate (研究、调查)          │
│    ⭐⭐⭐⭐⭐ 学术常用                │
│                                     │
│  • analyze (分析)                   │
│    ⭐⭐⭐⭐                           │
│                                     │
│  • explore (探索)                   │
│    ⭐⭐⭐⭐                           │
│                                     │
│  • assess (评估)                    │
│    ⭐⭐⭐                             │
│                                     │
│  • scrutinize (仔细检查)            │
│    ⭐⭐                               │
│                                     │
│  ℹ️ 评分基于学术论文中的使用频率      │
│                                     │
└─────────────────────────────────────┘
```

### 3.3 学术例句功能

**点击 [💬 学术例句] 按钮**:

```
┌─────────────────────────────────────┐
│  💬 学术例句                         │
│                                     │
│  来自真实学术论文的例句:              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 1. This paper examines the    │ │
│  │    relationship between...    │ │
│  │    ─────────────────────      │ │
│  │    📄 Introduction 段落        │ │
│  │    🔬 领域: Social Science    │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 2. We examined the effects of │ │
│  │    climate change on...       │ │
│  │    ─────────────────────      │ │
│  │    📄 Methods 段落             │ │
│  │    🔬 领域: Environmental Sci │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 3. The results examined here  │ │
│  │    suggest that...            │ │
│  │    ─────────────────────      │ │
│  │    📄 Results 段落             │ │
│  │    🔬 领域: Medical Research  │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### 3.4 学术短语库功能

**点击 [📖 学术短语] 按钮**:

```
┌─────────────────────────────────────┐
│  📖 学术短语库                       │
│                                     │
│  选择论文部分:                       │
│  [Introduction] [Methods] [Results] │
│  [Discussion] [Conclusion]          │
│                                     │
│  ─────────────────────────────────  │
│  Introduction 常用短语:              │
│                                     │
│  📝 描述研究背景:                    │
│  • In recent years, there has been  │
│    increasing interest in...        │
│  • A considerable amount of         │
│    literature has been published... │
│  • Over the past decade...          │
│                                     │
│  📝 说明研究目的:                    │
│  • The purpose of this study is to..│
│  • This paper examines...           │
│  • The aim of this research is to...│
│                                     │
│  📝 陈述研究重要性:                  │
│  • Understanding X is important     │
│    because...                       │
│  • This study makes several         │
│    contributions...                 │
│                                     │
│  [复制短语]  [查看更多]              │
│                                     │
└─────────────────────────────────────┘
```

---

## 四、技术实现方案

### 4.1 Academic Phrasebank 数据结构

```json
// assets/academic-phrasebank.json
{
  "version": "1.0.0",
  "source": "University of Manchester Academic Phrasebank",
  "totalPhrases": 20000,
  "categories": {
    "introduction": {
      "describing_background": [
        {
          "phrase": "In recent years, there has been increasing interest in...",
          "usage": "描述研究背景",
          "frequency": "high",
          "examples": [
            "In recent years, there has been increasing interest in the use of AI in education."
          ]
        },
        {
          "phrase": "A considerable amount of literature has been published on...",
          "usage": "引用相关文献",
          "frequency": "high"
        }
      ],
      "stating_purpose": [
        {
          "phrase": "The purpose of this study is to...",
          "usage": "说明研究目的",
          "frequency": "very_high"
        },
        {
          "phrase": "This paper examines...",
          "usage": "说明研究内容",
          "frequency": "very_high"
        }
      ]
    },
    "methods": {
      "describing_participants": [
        {
          "phrase": "The sample consisted of...",
          "usage": "描述研究样本",
          "frequency": "high"
        },
        {
          "phrase": "Participants were randomly assigned to...",
          "usage": "说明实验分组",
          "frequency": "medium"
        }
      ],
      "describing_procedure": [
        {
          "phrase": "Data were collected using...",
          "usage": "说明数据收集方法",
          "frequency": "very_high"
        }
      ]
    },
    "results": {
      "presenting_findings": [
        {
          "phrase": "The findings suggest that...",
          "usage": "陈述研究发现",
          "frequency": "very_high"
        },
        {
          "phrase": "A significant difference was found between...",
          "usage": "报告显著性差异",
          "frequency": "high"
        }
      ]
    },
    "discussion": {
      "interpreting_results": [
        {
          "phrase": "These results are consistent with...",
          "usage": "将结果与先前研究对比",
          "frequency": "high"
        },
        {
          "phrase": "One possible explanation is...",
          "usage": "解释研究结果",
          "frequency": "medium"
        }
      ],
      "acknowledging_limitations": [
        {
          "phrase": "This study has several limitations...",
          "usage": "说明研究局限性",
          "frequency": "high"
        }
      ]
    },
    "conclusion": {
      "summarizing_findings": [
        {
          "phrase": "In conclusion, this study has shown that...",
          "usage": "总结研究发现",
          "frequency": "very_high"
        },
        {
          "phrase": "The results of this research support the idea that...",
          "usage": "强调研究贡献",
          "frequency": "high"
        }
      ]
    }
  }
}
```

### 4.2 查询逻辑

```javascript
// utils/academicPhrasebank.js

class AcademicPhrasebank {
  constructor() {
    this.data = null;
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;

    // 加载本地 JSON 数据
    const response = await fetch(
      chrome.runtime.getURL('assets/academic-phrasebank.json')
    );
    this.data = await response.json();
    this.loaded = true;
  }

  /**
   * 根据论文部分和使用场景搜索短语
   */
  searchPhrases(section, context = null) {
    if (!this.loaded) {
      throw new Error('Phrasebank not loaded');
    }

    const sectionData = this.data.categories[section];
    if (!sectionData) return [];

    // 如果指定了具体场景,返回该场景下的短语
    if (context && sectionData[context]) {
      return sectionData[context];
    }

    // 否则返回该部分的所有短语
    const allPhrases = [];
    for (const contextKey in sectionData) {
      allPhrases.push(...sectionData[contextKey]);
    }

    return allPhrases;
  }

  /**
   * 关键词搜索短语
   */
  searchByKeyword(keyword) {
    if (!this.loaded) {
      throw new Error('Phrasebank not loaded');
    }

    const results = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const section in this.data.categories) {
      for (const context in this.data.categories[section]) {
        const phrases = this.data.categories[section][context];
        for (const phraseObj of phrases) {
          if (phraseObj.phrase.toLowerCase().includes(lowerKeyword)) {
            results.push({
              ...phraseObj,
              section,
              context
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 获取高频短语(推荐)
   */
  getHighFrequencyPhrases(section) {
    const phrases = this.searchPhrases(section);
    return phrases.filter(p =>
      p.frequency === 'very_high' || p.frequency === 'high'
    );
  }
}
```

### 4.3 SciBERT 集成 (可选高级功能)

```javascript
// background.js

let sciBERTPipeline = null;

async function loadSciBERT() {
  // 注意: SciBERT 需要先转换为 ONNX 格式
  // 可以使用 Hugging Face Optimum 工具转换
  sciBERTPipeline = await pipeline(
    'fill-mask',
    'Xenova/scibert-uncased-onnx' // 假设已转换
  );
}

/**
 * 基于学术上下文的近义词推荐
 */
async function getAcademicSynonyms(word, context) {
  if (!sciBERTPipeline) {
    await loadSciBERT();
  }

  // 将目标词替换为 [MASK]
  const maskedContext = context.replace(word, '[MASK]');

  // 使用 SciBERT 预测最可能的替换词
  const results = await sciBERTPipeline(maskedContext, { topk: 10 });

  // 过滤掉非学术词汇,返回学术同义词
  return results
    .map(r => r.token_str.trim())
    .filter(token => isAcademicWord(token)); // 自定义过滤函数
}

function isAcademicWord(word) {
  // 简单的学术词汇判断:长度 > 5,非口语化
  const informalWords = ['got', 'gonna', 'wanna', 'lot', 'stuff'];
  return word.length > 5 && !informalWords.includes(word.toLowerCase());
}
```

---

## 五、默认安装策略

### 5.1 推荐配置

**学术写作用户 (如研究生、学者)**:

```
默认安装模型:
✅ 专用翻译模型 (英中双向) - 600MB
✅ 通用多语言模型 - 600MB
✅ 近义词模型 (DistilBERT) - 65MB
✅ 例句模型 (MiniLM) - 23MB
✅ 学术短语库 (JSON) - 8MB

可选下载:
[ ] SciBERT 学术模型 - 440MB (高级用户)

总计: 1.3GB (不含 SciBERT)
```

### 5.2 首次安装引导

```
┌─────────────────────────────────────┐
│  🎓 检测到您可能需要学术写作功能     │
├─────────────────────────────────────┤
│                                     │
│  推荐安装以下模型:                   │
│                                     │
│  ✅ 基础翻译 + 近义词 + 例句         │
│     大小: 1.3GB                      │
│                                     │
│  📚 学术短语库 (免费)                │
│     • 20,000+ 学术常用表达          │
│     • 涵盖论文所有部分               │
│     • 来自顶尖期刊论文               │
│     大小: 8MB                        │
│                                     │
│  可选高级功能:                       │
│  [ ] SciBERT 学术专用模型 (+440MB)  │
│      • 基于 114万篇论文训练          │
│      • 更精准的学术近义词推荐        │
│      • 理解专业科学术语              │
│                                     │
│  [安装基础版]  [安装完整版]          │
│                                     │
└─────────────────────────────────────┘
```

---

## 六、总结

### 推荐的学术写作模型组合

| 模型 | 大小 | 必需性 | 功能 |
|------|------|--------|------|
| **Academic Phrasebank** | 8MB | ✅ 必需 | 20,000+ 学术常用短语 |
| **DistilBERT** | 65MB | ✅ 必需 | 近义词推荐 |
| **MiniLM** | 23MB | ✅ 必需 | 例句检索 |
| **SciBERT** | 440MB | 🔄 可选 | 学术近义词(更精准) |

**总大小**: 96MB (基础) / 536MB (含 SciBERT)

### 核心优势

1. **Academic Phrasebank** 提供即用的高质量学术表达
2. **轻量级设计**: 基础功能仅需 96MB
3. **渐进式增强**: 可选下载 SciBERT 获得更高质量推荐
4. **覆盖论文所有部分**: Introduction → Conclusion 完整支持
