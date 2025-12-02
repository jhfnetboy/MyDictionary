# 词典功能改进方案

## 📋 当前问题分析

### 1. Tier1 缺少基础词汇

**问题**: `run`, `big`, `study` 等基础高频词不在 Tier1 中

**原因分析**:
```bash
run: collins=5, bnc=208, tags=[zk,gk] → 符合筛选条件
但是 CET4 词汇优先，排序后 BNC=208 靠后，被 slice(0, 5000) 截断
```

**解决方案**:
- 方案 A: 调整筛选优先级，BNC < 500 的柯林斯 4-5 星词必入选
- 方案 B: 扩大 Tier1 到 8000 词 (内存影响: 2.84MB → 4.5MB)
- **推荐**: 方案 A + BNC 权重调整

### 2. JSON vs IndexedDB 性能对比

#### 当前方案 (JSON + IndexedDB)

**Tier1 加载流程**:
```
1. fetch('tier1-common.json')  // 2.84 MB
2. JSON.parse()                // ~100-150ms
3. 存入 IndexedDB              // ~50-100ms
4. 缓存到 Map                  // ~20ms
总计: ~200-300ms (首次)
```

**查询性能**:
- 内存 Map 查询: 5-20ms ⚡
- IndexedDB 查询: 20-50ms

#### 替代方案 (纯 IndexedDB)

**从 GitHub Release 下载 + 导入**:
```
1. 下载 tier1.json.gz         // 1.2 MB (压缩)
2. 解压                       // ~50ms
3. 批量导入 IndexedDB         // ~200-400ms
总计: ~250-450ms (首次)
```

**查询性能**:
- IndexedDB 查询: 20-50ms (无内存缓存)

#### 性能对比总结

| 方案 | 首次加载 | 查询速度 | 内存占用 | 离线可用 |
|-----|---------|---------|---------|---------|
| **JSON 嵌入** | 200-300ms | 5-20ms | ~10MB | ✅ 立即可用 |
| **远程下载** | 2-5s (网络) | 20-50ms | ~3MB | ❌ 需下载 |
| **混合方案** | 200-300ms | 5-20ms | ~10MB | ✅ 立即可用 |

**结论**:
- Tier1 (5000-8000词) → **嵌入 JSON** (立即可用，性能最佳)
- Tier2/3 → **远程下载** (按需加载，减小安装包)

### 3. 完整词库大小

```
当前构建:
- tier1-common.json:      2.84 MB  (5,000 词)
- tier2-extended.json.gz: 1.27 MB  (12,384 词)
- tier3-full.json.gz:     23 MB    (751,355 词)
- ecdict.csv:            63 MB     (原始数据，可删除)
- 总计 (不含CSV):        27.11 MB

优化后:
- tier1-enhanced.json:    4.5 MB   (8,000 词) ← 嵌入插件
- tier2-extended.json.gz: 1.3 MB   (12k 词)   ← GitHub Release
- tier3-full.json.gz:     23 MB    (751k 词)  ← GitHub Release
- 插件体积:              ~75 MB   (含 transformers)
```

## 🚀 改进方案

### Phase 1: 修复基础词汇缺失 (立即执行)

#### 1.1 优化 Tier1 筛选逻辑

```javascript
// scripts/process-ecdict.js

const tier1Candidates = allEntries.filter(entry => {
  if (!entry.translation) return false;

  // 必入选: 柯林斯 4-5 星 + BNC < 500 (超高频)
  if (entry.collins >= 4 && entry.bnc > 0 && entry.bnc < 500) return true;

  // 必入选: CET4 + 柯林斯 3 星以上
  if (entry.tags.includes('cet4') && entry.collins >= 3) return true;

  // 必入选: 牛津核心
  if (entry.oxford) return true;

  // 备选: CET4 或 高考词汇
  if (entry.tags.includes('cet4')) return true;
  if (entry.tags.includes('gk') && entry.collins >= 2) return true;

  return false;
});

// 排序: 柯林斯 > BNC > CET4
const tier1 = tier1Candidates
  .sort((a, b) => {
    // 柯林斯星级优先
    if (a.collins !== b.collins) return b.collins - a.collins;

    // BNC 频率 (值越小越常用)
    const aBnc = a.bnc || 99999;
    const bBnc = b.bnc || 99999;
    if (aBnc !== bBnc) return aBnc - bBnc;

    // CET4 优先
    const aCet4 = a.tags.includes('cet4') ? 1 : 0;
    const bCet4 = b.tags.includes('cet4') ? 1 : 0;
    if (aCet4 !== bCet4) return bCet4 - aCet4;

    return 0;
  })
  .slice(0, 8000); // 扩大到 8000 词
```

**预期结果**:
- `run`, `big`, `study` 等基础词必定入选
- 覆盖 95% 日常使用场景
- 内存增加: 2.84MB → 4.5MB (可接受)

#### 1.2 添加词汇覆盖测试

```javascript
// scripts/test-local-dict.js

const mustHaveWords = [
  // 超高频动词
  'be', 'have', 'do', 'say', 'get', 'make', 'go', 'know', 'take', 'see',
  'come', 'think', 'look', 'want', 'give', 'use', 'find', 'tell', 'ask', 'work',
  'seem', 'feel', 'try', 'leave', 'call', 'run', 'move', 'live', 'believe', 'bring',

  // 超高频名词
  'time', 'person', 'year', 'way', 'day', 'thing', 'man', 'world', 'life', 'hand',
  'part', 'child', 'eye', 'woman', 'place', 'work', 'week', 'case', 'point', 'government',

  // 超高频形容词
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old',
  'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young', 'important',

  // 学习常用词
  'study', 'learn', 'read', 'write', 'understand', 'remember', 'teach', 'practice'
];

// 验证覆盖率必须 100%
```

### Phase 2: 远程词典下载方案

#### 2.1 GitHub Release 资源结构

```
MyDictionary v0.2.0
├── MyDictionary-0.2.0.zip          (插件主体, 含 tier1)
└── dictionaries/
    ├── tier2-extended.json.gz      (1.3 MB)
    ├── tier3-full.json.gz          (23 MB)
    ├── en-en-dictionary.json.gz    (英英词典, 10 MB)
    ├── zh-en-dictionary.json.gz    (中英词典, 5 MB)
    └── checksums.json              (SHA256 校验)
```

#### 2.2 下载管理器

```javascript
// src/lib/dictionary-downloader.js

class DictionaryDownloader {
  constructor() {
    this.baseURL = 'https://github.com/jhfnetboy/MyDictionary/releases/download';
    this.version = '0.2.0';
  }

  async downloadTier(tierName, progressCallback) {
    const url = `${this.baseURL}/v${this.version}/dictionaries/${tierName}.json.gz`;

    // 1. 下载到内存
    const response = await fetch(url);
    const total = parseInt(response.headers.get('content-length'));

    // 2. 进度追踪
    const reader = response.body.getReader();
    let received = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      received += value.length;
      progressCallback({ received, total, percent: (received/total*100).toFixed(1) });
    }

    // 3. 解压缩
    const compressed = new Uint8Array(chunks.flat());
    const decompressed = pako.inflate(compressed, { to: 'string' });
    const data = JSON.parse(decompressed);

    // 4. 导入 IndexedDB
    await this.importToIndexedDB(tierName, data);

    // 5. 保存元数据
    await this.saveMetadata(tierName, {
      downloadedAt: new Date().toISOString(),
      version: this.version,
      count: data.length
    });
  }

  async checkUpdate() {
    // 检查远程版本
    const metaURL = `${this.baseURL}/v${this.version}/dictionaries/checksums.json`;
    const remoteMeta = await fetch(metaURL).then(r => r.json());

    // 对比本地版本
    const localMeta = await this.getLocalMetadata();

    return {
      hasUpdate: remoteMeta.version > localMeta.version,
      tiers: Object.keys(remoteMeta.tiers)
    };
  }
}
```

#### 2.3 用户交互流程

```
安装插件
  ↓
首次打开侧边栏
  ↓
显示欢迎页面:
┌─────────────────────────────────┐
│ 🎉 欢迎使用 MyDictionary!        │
│                                 │
│ 📖 已启用: Tier 1 (8000 词)      │
│    覆盖 95% 日常词汇             │
│                                 │
│ 💡 想要更多?                     │
│                                 │
│ [下载扩展词库] Tier 2 (12k 词)   │
│ 适合: 考研、雅思、托福            │
│ 大小: 1.3 MB                    │
│                                 │
│ [下载完整词库] Tier 3 (751k 词)  │
│ 适合: 专业翻译、学术写作          │
│ 大小: 23 MB                     │
│                                 │
│ [以后再说]                      │
└─────────────────────────────────┘

用户点击"下载扩展词库"
  ↓
显示下载进度:
┌─────────────────────────────────┐
│ 📥 正在下载 Tier 2...            │
│                                 │
│ ████████████░░░░  75% (1.0/1.3MB)│
│                                 │
│ 预计剩余时间: 2 秒               │
└─────────────────────────────────┘
  ↓
下载完成，自动导入
  ↓
┌─────────────────────────────────┐
│ ✅ Tier 2 已安装!                │
│                                 │
│ 📊 当前词库:                    │
│ • Tier 1: 8,000 词 (内置)       │
│ • Tier 2: 12,384 词 (已下载)    │
│                                 │
│ 💡 现在可以查询更多专业词汇了!    │
│                                 │
│ [开始使用]                      │
└─────────────────────────────────┘
```

### Phase 3: 多语言词典支持

#### 3.1 词典类型

```javascript
const DICTIONARY_TYPES = {
  'en-zh': {
    name: '英中词典',
    source: 'ECDICT',
    tiers: ['tier1', 'tier2', 'tier3']
  },
  'en-en': {
    name: '英英词典',
    source: 'WordNet 3.0',
    description: '英文释义、同义词、反义词',
    size: '10 MB',
    url: 'dictionaries/en-en-dictionary.json.gz'
  },
  'zh-en': {
    name: '中英词典',
    source: 'CC-CEDICT',
    description: '中文查询英文翻译',
    size: '5 MB',
    url: 'dictionaries/zh-en-dictionary.json.gz'
  }
};
```

#### 3.2 查询路由逻辑

```javascript
async function handleTranslation(request, sendResponse) {
  const { text, sourceLang, targetLang } = request;

  // 检测查询类型
  const queryType = LocalDictionaryManager.getQueryType(text);

  // 英译中: 单词/短语
  if (sourceLang === 'en' && targetLang === 'zh' &&
      (queryType === 'SINGLE_WORD' || queryType === 'PHRASE')) {

    // 1. 尝试英中词典
    let result = await localDictManager.lookup(text, 'en-zh');

    // 2. 尝试英英词典 (如果已下载)
    if (!result && await dictDownloader.isInstalled('en-en')) {
      result = await localDictManager.lookup(text, 'en-en');
      if (result) {
        result.note = '💡 提示: 下载英中词典可获得中文翻译';
      }
    }

    // 3. 回退 AI 模型
    if (result) return formatDictionaryResult(result);
  }

  // 中译英: 单词/短语
  if (sourceLang === 'zh' && targetLang === 'en' &&
      (queryType === 'SINGLE_WORD' || queryType === 'PHRASE')) {

    const result = await localDictManager.lookup(text, 'zh-en');
    if (result) return formatDictionaryResult(result);
  }

  // 其他情况: AI 模型
  // ...
}
```

### Phase 4: 版权声明和致谢

#### 4.1 README 添加

```markdown
## 📚 词典数据来源

MyDictionary 使用以下开源词典数据:

### ECDICT (英中词典)
- **项目**: [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT)
- **许可**: MIT License
- **作者**: skywind3000
- **词条数**: 770,000+
- **内容**: 英文单词、音标、中文翻译、词形变化、柯林斯星级
- **使用范围**:
  - ✅ 个人学习和使用
  - ✅ 开源项目集成
  - ✅ 商业应用 (需保留版权声明)
  - ❌ 禁止直接转售词典数据

### WordNet 3.0 (英英词典)
- **项目**: [Princeton WordNet](https://wordnet.princeton.edu/)
- **许可**: WordNet License (类 BSD)
- **词条数**: 117,000+ synsets
- **内容**: 英文定义、同义词集、词义关系
- **使用范围**:
  - ✅ 教育和研究
  - ✅ 商业应用 (需引用)
  - ❌ 需保留版权声明

### CC-CEDICT (中英词典)
- **项目**: [MDBG CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict)
- **许可**: Creative Commons BY-SA 4.0
- **词条数**: 120,000+
- **内容**: 简体中文、拼音、英文翻译
- **使用范围**:
  - ✅ 个人和商业使用
  - ✅ 修改和再分发 (需署名 + 相同方式共享)

## 📄 许可证

本插件代码采用 **MIT License**

词典数据保留原始许可证，使用时需遵守相应条款。

## 🙏 致谢

特别感谢以下开源项目:

- [ECDICT](https://github.com/skywind3000/ECDICT) by skywind3000 - 提供高质量英中词典
- [WordNet](https://wordnet.princeton.edu/) by Princeton University - 提供英英词典
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) - 提供中英词典
- [Transformers.js](https://github.com/xenova/transformers.js) - 浏览器端 AI 模型
- [ONNX Runtime](https://onnxruntime.ai/) - 高性能推理引擎
```

#### 4.2 插件内显示

```javascript
// src/ui/about.html

<div class="credits">
  <h3>词典数据来源</h3>
  <ul>
    <li>
      <strong>ECDICT</strong> -
      <a href="https://github.com/skywind3000/ECDICT">skywind3000/ECDICT</a>
      (MIT License)
    </li>
    <li>
      <strong>WordNet 3.0</strong> -
      <a href="https://wordnet.princeton.edu/">Princeton University</a>
      (WordNet License)
    </li>
    <li>
      <strong>CC-CEDICT</strong> -
      <a href="https://www.mdbg.net/chinese/dictionary?page=cedict">MDBG</a>
      (CC BY-SA 4.0)
    </li>
  </ul>
</div>
```

## 🔧 修复 Status Code 15

**可能原因**:
1. `dist/` 目录文件权限问题
2. manifest.json 路径配置错误
3. background.js 文件损坏

**排查步骤**:
```bash
# 1. 检查文件完整性
ls -la dist/background.js
ls -la dist/manifest.json
ls -la dist/src/lib/

# 2. 重新构建
rm -rf dist/
node scripts/build.js

# 3. 验证 manifest
cat dist/manifest.json | python3 -m json.tool

# 4. 检查 Service Worker
# Chrome: chrome://extensions/ → MyDictionary → Service Worker → Inspect
```

## 📊 实施优先级

### P0 (立即)
- [x] 修复 Status Code 15 错误
- [ ] 优化 Tier1 筛选逻辑 (包含基础词汇)
- [ ] 添加版权声明到 README

### P1 (本周)
- [ ] 实现远程词典下载功能
- [ ] 添加用户引导流程
- [ ] Tier2/3 从插件中移除，改为远程下载

### P2 (下周)
- [ ] 添加英英词典支持
- [ ] 添加中英词典支持
- [ ] 词典更新检查功能

## 🎯 最终方案总结

### 插件内置
- **Tier 1** (8000 词, 4.5 MB): 立即可用，覆盖 95% 日常
- **格式**: JSON (最佳查询性能)

### GitHub Release 下载
- **Tier 2** (12k 词, 1.3 MB): 按需下载
- **Tier 3** (751k 词, 23 MB): 按需下载
- **英英词典** (10 MB): 可选
- **中英词典** (5 MB): 可选
- **格式**: JSON.gz (压缩传输，解压后导入 IndexedDB)

### 性能保证
- Tier1 内存缓存: 5-20ms 查询
- Tier2/3 IndexedDB: 20-50ms 查询
- 未找到自动回退 AI: 2-5s 查询

### 用户体验
- 安装即用 (Tier1)
- 引导下载扩展词库
- 进度显示 + 断点续传
- 自动更新检查
