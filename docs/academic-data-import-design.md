# Academic Phrasebank - Local File Import Design

## 背景

当前学术短语库数据来源:
- ✅ 内置 120+ 示例短语 (academic-phrasebank.json)
- ❌ 数量有限,覆盖不全面
- ❌ 缺乏真实学术语料支持

## 目标

实现**本地文件导入功能**,允许用户:
1. 导入自定义的大型学术短语库 (JSON 格式)
2. 支持多个数据源合并
3. 数据持久化到 IndexedDB

## 推荐数据源

### 1. Manchester Academic Phrasebank (官方)
- **来源**: University of Manchester
- **网站**: https://www.phrasebank.manchester.ac.uk/
- **内容**:
  - Introduction (引言写作)
  - Methods (方法描述)
  - Results (结果陈述)
  - Discussion (讨论分析)
  - Conclusion (结论总结)
  - Citation (引用表述)
  - Transition (逻辑连接)
- **数量**: 2000+ 学术短语
- **质量**: 经过学术专家审核
- **许可**: 教育用途免费

**获取方式**:
- 网站上有完整分类列表
- 需要手动抓取或使用爬虫提取
- 我们可以编写脚本转换为 JSON 格式

### 2. Academic Writing Corpus
- **来源**: 公开学术论文库 (如 arXiv, PubMed)
- **方法**:
  - 使用 NLP 提取高频学术短语
  - 基于 TF-IDF 或 BERT 筛选学术性强的表达
- **优势**: 真实语料,覆盖多学科
- **工具**: Python + spaCy/NLTK

### 3. 学科专用短语库
允许用户根据自己的学科导入定制数据:
- 计算机科学 (CS)
- 生物医学 (Biomedical)
- 社会科学 (Social Science)
- 工程学 (Engineering)

## 文件格式规范

### JSON Schema

```json
{
  "name": "Manchester Academic Phrasebank",
  "version": "2.0.0",
  "source": "University of Manchester",
  "url": "https://www.phrasebank.manchester.ac.uk/",
  "license": "Educational Use",
  "totalPhrases": 2134,
  "lastUpdated": "2024-01-15",

  "sections": {
    "introduction": {
      "background": [
        {
          "id": "intro_bg_001",
          "phrase": "Over the past decade, there has been...",
          "usage": "描述研究背景的时间发展",
          "academicScore": 8.5,
          "frequency": "very_high",
          "examples": [
            "Over the past decade, there has been a growing interest in renewable energy."
          ],
          "discipline": ["general"],
          "keywords": ["time", "development", "background"]
        }
      ],
      "gap": [...],
      "purpose": [...]
    },

    "methods": {...},
    "results": {...},
    "discussion": {...},
    "conclusion": {...}
  },

  "citations": {
    "reporting_verbs_strong": [...],
    "reporting_verbs_moderate": [...],
    "reporting_verbs_neutral": [...]
  },

  "transitions": {
    "contrast": [...],
    "addition": [...],
    "result": [...],
    "emphasis": [...]
  }
}
```

### 必需字段

每个短语对象必须包含:
- `id` (string): 唯一标识符
- `phrase` (string): 短语内容
- `academicScore` (number): 学术度评分 0-10
- `frequency` (string): very_high | high | medium | low

### 可选字段

- `usage` (string): 使用说明
- `examples` (array): 示例句子
- `discipline` (array): 适用学科
- `keywords` (array): 关键词标签

## 功能设计

### 1. UI 界面 - 数据管理面板

在 Academic Writing 标签添加 **Settings/Manage Data** 按钮:

```
┌─────────────────────────────────────┐
│ Academic Writing                    │
├─────────────────────────────────────┤
│ [Translation] [Academic] [⚙️ Manage]│
├─────────────────────────────────────┤
│                                     │
│  📦 Current Database                │
│  ├─ Built-in: 120 phrases          │
│  ├─ Imported: 2,134 phrases        │
│  └─ Total: 2,254 phrases           │
│                                     │
│  📥 Import New Data                 │
│  ┌───────────────────────────────┐ │
│  │ [Choose JSON File...]         │ │
│  └───────────────────────────────┘ │
│                                     │
│  📊 Data Sources                    │
│  ├─ ✅ Manchester Phrasebank       │
│  ├─ ❌ CS-specific Phrases         │
│  └─ ❌ Biomedical Phrases          │
│                                     │
│  🗑️ [Clear All Imported Data]      │
│                                     │
└─────────────────────────────────────┘
```

### 2. 导入流程

```
用户点击 "Choose JSON File..."
    ↓
File Input 打开文件选择器
    ↓
读取 JSON 文件 (使用 FileReader API)
    ↓
验证 JSON 格式和必需字段
    ↓
发送到 background.js 进行处理
    ↓
background.js 调用 academicDBManager.importPhrases()
    ↓
批量写入 IndexedDB (使用事务)
    ↓
显示导入结果: "✅ Successfully imported 2,134 phrases"
    ↓
刷新短语列表
```

### 3. 数据合并策略

**去重规则**:
- 如果 `id` 相同,跳过 (保留已有数据)
- 如果 `phrase` 完全相同,比较 `academicScore`,保留评分更高的
- 如果 `phrase` 相似度 > 90%,提示用户确认是否合并

**冲突处理**:
```javascript
// 检测重复短语
const existingPhrase = await academicDBManager.getPhraseById(newPhrase.id);

if (existingPhrase) {
  // 策略 1: 跳过
  console.log(`⚠️ Skipping duplicate: ${newPhrase.id}`);
  continue;

  // 策略 2: 覆盖 (如果新数据评分更高)
  if (newPhrase.academicScore > existingPhrase.academicScore) {
    await academicDBManager.updatePhrase(newPhrase);
  }
}
```

### 4. 数据验证

导入前验证 JSON 格式:

```javascript
function validatePhrasebankJSON(data) {
  const errors = [];

  // 检查必需顶层字段
  if (!data.name) errors.push('Missing field: name');
  if (!data.sections) errors.push('Missing field: sections');

  // 检查每个短语
  for (const section in data.sections) {
    for (const subsection in data.sections[section]) {
      const phrases = data.sections[section][subsection];

      phrases.forEach((phrase, index) => {
        if (!phrase.id) {
          errors.push(`${section}.${subsection}[${index}]: Missing id`);
        }
        if (!phrase.phrase) {
          errors.push(`${section}.${subsection}[${index}]: Missing phrase`);
        }
        if (typeof phrase.academicScore !== 'number') {
          errors.push(`${section}.${subsection}[${index}]: Invalid academicScore`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 实现步骤

### Phase 1: 基础导入功能 (1周)

**Tasks**:
1. ✅ 在 content.js 添加文件选择 UI
2. ✅ 实现 FileReader 读取 JSON
3. ✅ 添加 JSON 验证逻辑
4. ✅ 在 background.js 添加 `importCustomPhrasebank` handler
5. ✅ 更新 academic-db-manager.js:
   - `importPhrases()` 支持合并模式
   - `getPhraseById()` 检测重复
   - `getImportedDataSources()` 追踪数据来源
6. ✅ UI 显示导入进度和结果

**测试**:
- 导入小文件 (100 phrases)
- 导入大文件 (2000+ phrases)
- 测试错误处理 (格式错误的 JSON)

### Phase 2: 数据管理界面 (3天)

**Tasks**:
1. ✅ 创建 "Manage Data" 面板
2. ✅ 显示当前数据库统计信息
3. ✅ 列出所有已导入的数据源
4. ✅ 支持选择性删除某个数据源
5. ✅ "Clear All" 清空所有导入数据

### Phase 3: Manchester Phrasebank 爬虫 (可选,1周)

**Tasks**:
1. ✅ 编写 Python 爬虫抓取官方网站
2. ✅ 解析 HTML 提取短语
3. ✅ 自动评估 academicScore (基于语言特征)
4. ✅ 生成符合规范的 JSON 文件
5. ✅ 提供预构建的 JSON 供用户下载

**工具**:
```bash
# 爬虫脚本
python scripts/scrape_phrasebank.py \
  --output data/manchester-phrasebank.json \
  --sections all \
  --format json
```

## 代码实现示例

### content.js - 文件导入 UI

```javascript
// 在 Academic Writing 标签添加导入按钮
UIManager.prototype.showAcademicManagePanel = function() {
  const managePanel = document.createElement('div');
  managePanel.className = 'mydictionary-manage-panel';
  managePanel.innerHTML = `
    <h3>📦 Manage Academic Database</h3>

    <div class="mydictionary-db-stats">
      <p><strong>Total Phrases:</strong> <span id="total-phrases">120</span></p>
      <p><strong>Built-in:</strong> 120 phrases</p>
      <p><strong>Imported:</strong> <span id="imported-phrases">0</span> phrases</p>
    </div>

    <div class="mydictionary-import-section">
      <h4>📥 Import Data</h4>
      <input type="file" id="import-file-input" accept=".json" style="display:none">
      <button class="mydictionary-btn-primary" id="choose-file-btn">
        Choose JSON File...
      </button>
      <div id="import-status"></div>
    </div>

    <div class="mydictionary-clear-section">
      <button class="mydictionary-btn-secondary" id="clear-imported-btn">
        🗑️ Clear All Imported Data
      </button>
    </div>
  `;

  // 绑定事件
  const fileInput = managePanel.querySelector('#import-file-input');
  const chooseBtn = managePanel.querySelector('#choose-file-btn');

  chooseBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await this.handleFileImport(file);
  });

  return managePanel;
};

UIManager.prototype.handleFileImport = async function(file) {
  const statusDiv = document.getElementById('import-status');
  statusDiv.innerHTML = '<div class="mydictionary-loading">📖 Reading file...</div>';

  try {
    // 读取文件
    const fileContent = await this.readFileAsText(file);
    const data = JSON.parse(fileContent);

    // 验证格式
    statusDiv.innerHTML = '<div class="mydictionary-loading">✓ Validating data...</div>';

    // 发送到 background 导入
    const response = await chrome.runtime.sendMessage({
      action: 'importCustomPhrasebank',
      data: data,
      source: file.name
    });

    if (response.success) {
      statusDiv.innerHTML = `
        <div class="mydictionary-success">
          ✅ Successfully imported ${response.data.importedCount} phrases!
        </div>
      `;

      // 刷新统计信息
      this.refreshDatabaseStats();
    } else {
      throw new Error(response.error);
    }

  } catch (error) {
    statusDiv.innerHTML = `
      <div class="mydictionary-error">
        ❌ Import failed: ${error.message}
      </div>
    `;
  }
};

UIManager.prototype.readFileAsText = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};
```

### background.js - 导入处理

```javascript
// 处理自定义短语库导入
async function handleImportCustomPhrasebank(request, sendResponse) {
  try {
    const { data, source } = request;

    console.log(`📥 Importing custom phrasebank: ${source}`);

    // 验证数据格式
    const validation = validatePhrasebankJSON(data);
    if (!validation.valid) {
      throw new Error(`Invalid JSON: ${validation.errors.join(', ')}`);
    }

    // 导入到 IndexedDB (合并模式)
    const importedCount = await academicDBManager.importPhrases(data, {
      merge: true,        // 合并到现有数据
      source: source,     // 记录数据来源
      overwrite: false    // 不覆盖已有数据
    });

    console.log(`✅ Imported ${importedCount} phrases from ${source}`);

    sendResponse({
      success: true,
      data: {
        importedCount,
        source,
        totalPhrases: await academicDBManager.getTotalCount()
      }
    });

  } catch (error) {
    console.error('❌ Import failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// 注册 handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importCustomPhrasebank') {
    handleImportCustomPhrasebank(request, sendResponse);
    return true; // 异步响应
  }
});
```

### academic-db-manager.js - 支持合并导入

```javascript
/**
 * 批量导入短语数据 (支持合并模式)
 */
async importPhrases(phrasesData, options = {}) {
  await this.initialize();

  const {
    merge = false,      // 是否合并到现有数据
    source = 'unknown', // 数据来源
    overwrite = false   // 是否覆盖已有数据
  } = options;

  console.log(`📥 Importing academic phrases (merge: ${merge}, source: ${source})...`);

  return new Promise(async (resolve, reject) => {
    const transaction = this.db.transaction([this.storeName], 'readwrite');
    const objectStore = transaction.objectStore(this.storeName);

    let importedCount = 0;
    let skippedCount = 0;
    const allPhrases = [];

    // 遍历所有部分和子部分
    for (const sectionName in phrasesData.sections) {
      const sectionData = phrasesData.sections[sectionName];

      for (const subsectionName in sectionData) {
        const phrases = sectionData[subsectionName];

        if (!Array.isArray(phrases)) continue;

        for (const phrase of phrases) {
          allPhrases.push({
            ...phrase,
            section: sectionName,
            subsection: subsectionName,
            _source: source,  // 记录数据来源
            _importedAt: Date.now()
          });
        }
      }
    }

    // [同样处理 citations 和 transitions...]

    // 批量添加到 IndexedDB
    for (const phrase of allPhrases) {
      // 检查是否已存在
      const existingRequest = objectStore.get(phrase.id);

      existingRequest.onsuccess = () => {
        const existing = existingRequest.result;

        if (existing && !overwrite) {
          // 已存在且不覆盖,跳过
          skippedCount++;
          return;
        }

        // 添加或更新
        const putRequest = objectStore.put(phrase);
        putRequest.onsuccess = () => {
          importedCount++;
        };
      };
    }

    transaction.oncomplete = () => {
      console.log(`✅ Imported ${importedCount} phrases, skipped ${skippedCount} duplicates`);
      resolve(importedCount);
    };

    transaction.onerror = () => {
      console.error('❌ Failed to import phrases:', transaction.error);
      reject(transaction.error);
    };
  });
}

/**
 * 获取数据来源统计
 */
async getDataSources() {
  await this.initialize();

  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction([this.storeName], 'readonly');
    const objectStore = transaction.objectStore(this.storeName);
    const request = objectStore.getAll();

    request.onsuccess = () => {
      const phrases = request.result;

      // 统计每个数据源的短语数量
      const sources = {};
      phrases.forEach(phrase => {
        const source = phrase._source || 'built-in';
        sources[source] = (sources[source] || 0) + 1;
      });

      resolve(sources);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}
```

## 预构建数据集

我们可以提供几个预构建的 JSON 文件供用户下载:

### 1. manchester-phrasebank.json (推荐)
- 来源: University of Manchester
- 短语数: 2000+
- 大小: ~500 KB
- 下载: [GitHub Release]

### 2. cs-academic-phrases.json
- 来源: Computer Science 论文语料
- 短语数: 800+
- 领域: 算法、系统、AI/ML
- 大小: ~200 KB

### 3. biomedical-phrases.json
- 来源: PubMed 论文摘要
- 短语数: 1200+
- 领域: 生物学、医学
- 大小: ~300 KB

## 数据获取指南

用户可以:
1. **使用预构建数据**: 从 GitHub Releases 下载 JSON 文件
2. **自己制作数据**: 按照 JSON Schema 编写自定义短语库
3. **社区贡献**: 提交 PR 添加新的学科短语库

## 隐私和安全

- ✅ 所有数据本地存储在 IndexedDB
- ✅ 不上传任何数据到服务器
- ✅ 用户完全控制导入的数据
- ✅ 可随时清除导入的数据

## 未来扩展

### 1. 在线数据源
允许从 URL 直接导入:
```
https://raw.githubusercontent.com/xxx/phrasebank/main/data.json
```

### 2. 数据导出
导出当前数据库为 JSON:
```javascript
await academicDBManager.exportToJSON('my-custom-phrasebank.json');
```

### 3. 数据订阅
订阅社区维护的短语库,自动更新:
```json
{
  "subscriptions": [
    {
      "name": "Manchester Phrasebank",
      "url": "https://...",
      "auto_update": true,
      "update_interval": "weekly"
    }
  ]
}
```

## 总结

通过实现本地文件导入功能,用户可以:
- ✅ 导入高质量的学术短语库 (如 Manchester Phrasebank 2000+ 短语)
- ✅ 自定义学科专用短语
- ✅ 完全离线工作,数据隐私有保障
- ✅ 灵活管理多个数据源

下一步行动:
1. 实现文件导入 UI 和逻辑
2. 编写 Manchester Phrasebank 爬虫
3. 创建预构建数据集
4. 发布到 GitHub Releases
