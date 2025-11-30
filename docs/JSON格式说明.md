# 📂 学术短语 JSON 格式说明

## 概述

本文档说明如何创建自己的学术短语 JSON 文件,用于导入到 MyDictionary 扩展。

---

## 文件结构

### 顶层结构

```json
{
  "sections": { ... },      // 必需: 按论文部分组织的短语
  "citations": { ... },     // 可选: 引用动词
  "transitions": { ... },   // 可选: 转折词
  "metadata": { ... }       // 可选: 元数据
}
```

### Sections 结构

按论文部分组织短语:

```json
{
  "sections": {
    "introduction": {       // 部分名称
      "background": [ ... ] // 子分类名称
    },
    "methods": { ... },
    "results": { ... },
    "discussion": { ... },
    "conclusion": { ... }
  }
}
```

**支持的部分名称**:
- `introduction` - 引言
- `methods` - 方法
- `results` - 结果
- `discussion` - 讨论
- `conclusion` - 结论
- 或任何自定义名称

---

## 短语对象格式

每个短语必须包含以下字段:

```json
{
  "id": "unique_identifier",           // 必需: 唯一标识符
  "phrase": "The actual phrase text",  // 必需: 短语内容
  "usage": "使用说明",                  // 推荐: 使用场景说明
  "academicScore": 8.5,                // 推荐: 学术度评分 (0-10)
  "frequency": "high",                 // 推荐: 使用频率
  "examples": [ "Example sentence" ],  // 推荐: 示例句子
  "section": "introduction",           // 必需: 所属部分
  "subsection": "background"           // 必需: 所属子分类
}
```

### 字段说明

| 字段 | 类型 | 必需 | 说明 | 示例 |
|------|------|------|------|------|
| `id` | String | ✅ | 唯一标识符 | `"custom_intro_1"` |
| `phrase` | String | ✅ | 学术短语文本 | `"This study aims to..."` |
| `usage` | String | 推荐 | 使用说明 (中文) | `"用于说明研究目的"` |
| `academicScore` | Number | 推荐 | 学术度评分 (0-10) | `8.5` |
| `frequency` | String | 推荐 | 使用频率 | `"very_high"`, `"high"`, `"medium"` |
| `examples` | Array | 推荐 | 示例句子列表 | `["Example 1", "Example 2"]` |
| `section` | String | ✅ | 所属论文部分 | `"introduction"` |
| `subsection` | String | ✅ | 所属子分类 | `"background"` |

---

## 完整示例

参考项目根目录的 `academic-phrases-example.json` 文件。

### 最小示例

```json
{
  "sections": {
    "introduction": {
      "general": [
        {
          "id": "my_phrase_1",
          "phrase": "This research examines...",
          "usage": "引入研究主题",
          "academicScore": 8.0,
          "frequency": "high",
          "examples": ["This research examines the impact of X on Y"],
          "section": "introduction",
          "subsection": "general"
        }
      ]
    }
  }
}
```

### 多部分示例

```json
{
  "sections": {
    "introduction": {
      "background": [
        {
          "id": "intro_1",
          "phrase": "Recent studies have shown that...",
          "usage": "引用近期研究",
          "academicScore": 8.5,
          "frequency": "very_high",
          "examples": ["Recent studies have shown that climate change affects biodiversity"],
          "section": "introduction",
          "subsection": "background"
        }
      ],
      "research_gap": [
        {
          "id": "intro_2",
          "phrase": "However, little is known about...",
          "usage": "指出研究空白",
          "academicScore": 9.0,
          "frequency": "high",
          "examples": ["However, little is known about the long-term effects"],
          "section": "introduction",
          "subsection": "research_gap"
        }
      ]
    },
    "methods": {
      "participants": [
        {
          "id": "method_1",
          "phrase": "Participants were recruited through...",
          "usage": "描述参与者招募",
          "academicScore": 7.5,
          "frequency": "high",
          "examples": ["Participants were recruited through online advertisements"],
          "section": "methods",
          "subsection": "participants"
        }
      ]
    }
  },
  "citations": {
    "reporting_verbs": [
      {
        "id": "cite_1",
        "phrase": "X argues that...",
        "usage": "引用学者论点",
        "academicScore": 9.0,
        "frequency": "very_high",
        "examples": ["Smith (2020) argues that early intervention is crucial"],
        "section": "citations",
        "subsection": "reporting_verbs"
      }
    ]
  }
}
```

---

## 学术度评分指南

### 0-3 分: 非正式/口语化
```
"I think...", "kind of", "a lot of"
```

### 4-6 分: 一般学术
```
"The study shows...", "It is important to..."
```

### 7-8 分: 正式学术
```
"The findings suggest...", "This study demonstrates..."
```

### 9-10 分: 高度学术/专业
```
"The analysis reveals...", "It is hypothesized that..."
```

---

## 使用频率分类

| 频率 | 说明 | 适用场景 |
|------|------|----------|
| `very_high` | 极常用 | 每篇论文都会用到 |
| `high` | 常用 | 大多数论文会用到 |
| `medium` | 中等 | 特定场景使用 |
| `low` | 较少 | 特殊情况使用 |

---

## 导入模式

### ✅ 追加模式 (默认)

导入时,新短语会**追加**到现有数据库,不会覆盖:

```
现有短语: 2,523 个 (Manchester Phrasebank)
导入短语: 10 个 (自定义)
结果: 2,533 个 (合并)
```

### 特点

- ✅ 不会删除现有短语
- ✅ 可以多次导入
- ✅ 支持累积添加
- ⚠️ 可能产生重复 (相同 ID 会被覆盖)

### 去重建议

为避免重复,建议:
1. 使用唯一的 ID 前缀 (如 `custom_`, `myname_`)
2. 定期清理数据库 (Settings → Data Management)

---

## 常见错误

### 错误 1: 缺少必需字段

```json
// ❌ 错误: 缺少 section 和 subsection
{
  "id": "phrase_1",
  "phrase": "This is a phrase"
}
```

```json
// ✅ 正确
{
  "id": "phrase_1",
  "phrase": "This is a phrase",
  "section": "introduction",
  "subsection": "general",
  "usage": "",
  "academicScore": 5.0,
  "frequency": "medium",
  "examples": []
}
```

### 错误 2: JSON 格式无效

```json
// ❌ 错误: 最后一个元素后有逗号
{
  "sections": {
    "introduction": {},
  }
}
```

```json
// ✅ 正确
{
  "sections": {
    "introduction": {}
  }
}
```

### 错误 3: 字段类型错误

```json
// ❌ 错误: academicScore 应该是数字
{
  "academicScore": "8.5"
}
```

```json
// ✅ 正确
{
  "academicScore": 8.5
}
```

---

## 验证工具

### 在线验证

使用 [JSONLint](https://jsonlint.com/) 验证 JSON 格式

### 命令行验证

```bash
# 使用 Python 验证
python3 -m json.tool your-file.json

# 使用 Node.js 验证
node -e "JSON.parse(require('fs').readFileSync('your-file.json', 'utf8'))"
```

---

## 导入步骤

1. **创建 JSON 文件**
   - 参考 `academic-phrases-example.json`
   - 确保格式正确

2. **验证格式**
   - 使用在线工具或命令行验证

3. **导入到扩展**
   - 打开 Academic Writing 标签
   - 点击 "📁 Select JSON File"
   - 选择你的 JSON 文件
   - 等待导入成功消息

4. **验证导入**
   - 搜索你的自定义短语
   - 检查是否正确显示

---

## 最佳实践

### 1. 使用有意义的 ID

```json
// ✅ 好
"id": "custom_intro_background_1"

// ❌ 差
"id": "phrase1"
```

### 2. 提供完整的 usage 说明

```json
// ✅ 好
"usage": "用于引入研究背景,说明研究领域的重要性"

// ❌ 差
"usage": "引言"
```

### 3. 包含真实的 examples

```json
// ✅ 好
"examples": [
  "This research investigates the relationship between social media usage and academic performance among university students"
]

// ❌ 差
"examples": ["Example"]
```

### 4. 组织子分类

```json
// ✅ 好: 细分子分类
{
  "introduction": {
    "background": [...],
    "research_gap": [...],
    "objectives": [...]
  }
}

// ❌ 差: 全部放在 general
{
  "introduction": {
    "general": [所有短语混在一起]
  }
}
```

---

## 模板下载

- **示例文件**: `academic-phrases-example.json` (项目根目录)
- **完整数据**: `academic-phrasebank.json` (2,523 短语)

---

## 需要帮助?

如果导入遇到问题:

1. 检查 JSON 格式是否有效
2. 查看 Service Worker Console 错误日志
3. 确保所有必需字段都存在
4. 参考示例文件格式

---

## 数据贡献

如果你创建了高质量的学术短语库,欢迎:
1. 提交到 GitHub
2. 分享给其他用户
3. 帮助完善官方数据库
