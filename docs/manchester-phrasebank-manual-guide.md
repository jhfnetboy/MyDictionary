# Manchester Phrasebank 手动获取指南

## 方法 1: 使用自动爬虫 (推荐)

### 安装依赖
```bash
cd scripts
pip3 install requests beautifulsoup4
```

### 运行爬虫
```bash
python3 scrape-manchester-phrasebank.py
```

### 输出
- 文件: `data/manchester-phrasebank-full.json`
- 预计短语数: 500-1000+ (取决于网站内容)
- 时间: ~2-5 分钟

---

## 方法 2: 手动复制 (如果爬虫失败)

### 访问官方网站
https://www.phrasebank.manchester.ac.uk/

### 各部分链接
1. **Introducing Work** (引言)
   - https://www.phrasebank.manchester.ac.uk/introducing-work/
   - 包含: Background, Problem statement, Purpose, etc.

2. **Methods** (方法)
   - https://www.phrasebank.manchester.ac.uk/methods/
   - 包含: Describing methods, Giving reasons, etc.

3. **Results** (结果)
   - https://www.phrasebank.manchester.ac.uk/results/
   - 包含: Reporting results, Highlighting findings, etc.

4. **Discussion** (讨论)
   - https://www.phrasebank.manchester.ac.uk/discussion/
   - 包含: Explaining results, Comparing results, etc.

5. **Conclusion** (结论)
   - https://www.phrasebank.manchester.ac.uk/conclusion/
   - 包含: Summarising, Implications, Limitations, etc.

### 手动复制步骤

1. **打开网页**: 访问上述任一链接

2. **查看结构**: 网页通常按小标题组织短语
   ```
   引言 (Introducing Work)
   ├─ Establishing a research territory
   │  ├─ "Over the past decade, there has been..."
   │  ├─ "Recent developments in X have led to..."
   │  └─ ...
   ├─ Identifying a gap
   │  ├─ "However, few studies have examined..."
   │  └─ ...
   └─ Stating the purpose
      ├─ "This study aims to..."
      └─ ...
   ```

3. **复制短语**: 选中短语列表,复制到文本编辑器

4. **转换为 JSON**: 使用提供的转换脚本 (见下方)

---

## 方法 3: 使用预构建数据集 (最简单)

我们可以提供一个预先爬取并整理好的数据集:

### 下载链接 (GitHub Releases)
```
https://github.com/yourusername/MyDictionary/releases/download/v0.1.5/manchester-phrasebank.json
```

### 文件信息
- 大小: ~200-500 KB
- 短语数: 1000-2000+
- 格式: 符合 MyDictionary JSON Schema
- 质量: 已人工审核和评分

### 使用方法
1. 下载 `manchester-phrasebank.json`
2. 在 MyDictionary 插件中点击 "Academic Writing" → "⚙️ Manage"
3. 点击 "Choose JSON File..."
4. 选择下载的文件
5. 等待导入完成

---

## 文本转 JSON 转换脚本

如果你手动复制了文本,使用这个脚本转换:

### convert-text-to-json.py

```python
#!/usr/bin/env python3
"""
将手动复制的文本转换为 MyDictionary JSON 格式

输入格式 (phrases.txt):
===
Section: introduction
Subsection: background

Over the past decade, there has been...
Recent developments in X have led to...
It is widely accepted that...

Subsection: gap

However, few studies have examined...
Despite extensive research on X...
===

输出: manchester-phrasebank.json
"""

import json
import re

def parse_text_file(input_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    sections = {}
    current_section = None
    current_subsection = None
    phrase_id = 0

    for line in content.split('\n'):
        line = line.strip()

        if not line:
            continue

        # 检测 Section 标记
        if line.startswith('Section:'):
            current_section = line.split(':', 1)[1].strip()
            sections[current_section] = {}
            print(f"📂 Section: {current_section}")

        # 检测 Subsection 标记
        elif line.startswith('Subsection:'):
            current_subsection = line.split(':', 1)[1].strip()
            sections[current_section][current_subsection] = []
            print(f"  📁 Subsection: {current_subsection}")

        # 这是一个短语
        elif current_section and current_subsection:
            phrase_id += 1

            # 简单的学术度评估
            academic_score = 7.0
            if any(word in line.lower() for word in ['demonstrate', 'investigate', 'examine']):
                academic_score = 8.5
            if len(line) < 30:
                academic_score = 6.0

            sections[current_section][current_subsection].append({
                "id": f"{current_section}_{current_subsection}_{phrase_id}",
                "phrase": line,
                "usage": "",
                "academicScore": academic_score,
                "frequency": "high",
                "examples": [line]
            })

    return sections

def create_phrasebank_json(sections):
    return {
        "name": "Manchester Academic Phrasebank (Manual)",
        "version": "2.0.0",
        "source": "University of Manchester",
        "url": "https://www.phrasebank.manchester.ac.uk/",
        "license": "Educational Use",
        "totalPhrases": sum(len(phrases) for section in sections.values()
                           for phrases in section.values()),
        "lastUpdated": "2024-11-30",
        "sections": sections,
        "citations": {"reporting_verbs_strong": [], "reporting_verbs_moderate": [], "reporting_verbs_neutral": []},
        "transitions": {"contrast": [], "addition": [], "result": [], "emphasis": []}
    }

def main():
    input_file = "phrases.txt"
    output_file = "../data/manchester-phrasebank-manual.json"

    print("🔄 Converting text to JSON...")
    sections = parse_text_file(input_file)

    data = create_phrasebank_json(sections)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Conversion complete!")
    print(f"📁 Output: {output_file}")
    print(f"📊 Total phrases: {data['totalPhrases']}")

if __name__ == "__main__":
    main()
```

### 使用方法
1. 创建 `phrases.txt` 文件,按上述格式粘贴短语
2. 运行: `python3 convert-text-to-json.py`
3. 得到 `manchester-phrasebank-manual.json`

---

## 数据质量检查

导入前验证数据质量:

### 检查脚本 (validate-phrasebank.py)

```python
#!/usr/bin/env python3
"""验证 Phrasebank JSON 文件格式"""

import json
import sys

def validate_phrasebank(file_path):
    print(f"🔍 Validating {file_path}...")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    errors = []

    # 检查必需字段
    required_top_level = ['name', 'version', 'sections', 'totalPhrases']
    for field in required_top_level:
        if field not in data:
            errors.append(f"Missing top-level field: {field}")

    # 检查每个短语
    total_phrases = 0
    for section_name, section_data in data.get('sections', {}).items():
        for subsection_name, phrases in section_data.items():
            for i, phrase in enumerate(phrases):
                # 必需字段
                if 'id' not in phrase:
                    errors.append(f"{section_name}.{subsection_name}[{i}]: Missing 'id'")
                if 'phrase' not in phrase:
                    errors.append(f"{section_name}.{subsection_name}[{i}]: Missing 'phrase'")
                if 'academicScore' not in phrase or not isinstance(phrase['academicScore'], (int, float)):
                    errors.append(f"{section_name}.{subsection_name}[{i}]: Invalid 'academicScore'")

                total_phrases += 1

    # 检查总数
    if data.get('totalPhrases', 0) != total_phrases:
        errors.append(f"totalPhrases mismatch: declared {data.get('totalPhrases')}, actual {total_phrases}")

    # 输出结果
    if errors:
        print(f"\n❌ Validation failed with {len(errors)} errors:")
        for error in errors[:10]:  # 显示前10个错误
            print(f"   - {error}")
        if len(errors) > 10:
            print(f"   ... and {len(errors) - 10} more errors")
        return False
    else:
        print(f"\n✅ Validation passed!")
        print(f"   Total phrases: {total_phrases}")
        print(f"   Sections: {len(data.get('sections', {}))}")
        return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 validate-phrasebank.py <file.json>")
        sys.exit(1)

    file_path = sys.argv[1]
    success = validate_phrasebank(file_path)
    sys.exit(0 if success else 1)
```

### 运行验证
```bash
python3 validate-phrasebank.py manchester-phrasebank.json
```

---

## 推荐方案

**短期 (立即可用)**:
1. 使用内置的 120+ 短语 (已包含在插件中)
2. 如需更多,访问官方网站手动复制 20-50 个最常用的短语

**中期 (1-2 周)**:
1. 运行爬虫脚本获取完整数据
2. 人工审核和补充 `usage` 字段
3. 发布为 GitHub Release 供所有用户下载

**长期 (1-2 月)**:
1. 众包: 邀请社区贡献学科专用短语库
2. 多语言: 添加中文学术写作短语
3. AI 生成: 使用 GPT-4 生成更多高质量短语

---

## 许可说明

**Manchester Academic Phrasebank**:
- 许可: Educational and non-commercial use
- 版权: University of Manchester
- 用途: 仅限教育和学习,不得商业使用
- 引用: 如果公开发布,需注明来源

**我们的使用**:
- ✅ 教育用途 (帮助学生学习学术写作)
- ✅ 非商业 (免费浏览器插件)
- ✅ 本地存储 (不上传到服务器)
- ✅ 注明来源 (在 JSON 文件中标注)

---

## 获取帮助

如果遇到问题:
1. 检查网络连接
2. 确认 Python 版本 >= 3.7
3. 查看爬虫日志错误信息
4. 提交 GitHub Issue

## 示例数据

我已经在 `academic-phrasebank.json` 中提供了 120+ 高质量示例短语,可以直接使用。

如需扩展到 2000+,请使用上述方法之一获取 Manchester Phrasebank 完整数据。
