#!/usr/bin/env python3
"""
Manchester Academic Phrasebank Scraper
从 University of Manchester 官方网站爬取学术短语库

官方网站: https://www.phrasebank.manchester.ac.uk/
数据许可: Educational Use (教育用途免费)
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import List, Dict
import time

BASE_URL = "https://www.phrasebank.manchester.ac.uk"

# 论文各部分的 URL
SECTIONS = {
    "introduction": f"{BASE_URL}/introducing-work/",
    "methods": f"{BASE_URL}/describing-methods/",
    "results": f"{BASE_URL}/reporting-results/",
    "discussion": f"{BASE_URL}/discussing-findings/",
    "conclusion": f"{BASE_URL}/writing-conclusions/",
}

def scrape_section(url: str, section_name: str) -> List[Dict]:
    """
    爬取某个部分的学术短语

    Args:
        url: 部分的 URL
        section_name: 部分名称 (introduction, methods, etc.)

    Returns:
        短语列表
    """
    print(f"📖 Scraping {section_name} from {url}...")

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        phrases = []
        phrase_id = 0

        # 查找所有短语 (通常在 <li> 或 <p> 标签中)
        # Manchester Phrasebank 的结构可能需要根据实际网页调整
        content_area = soup.find('div', class_='entry-content') or soup.find('main')

        if not content_area:
            print(f"⚠️ Could not find content area in {section_name}")
            return []

        # 提取标题下的短语
        current_subsection = "general"

        for elem in content_area.find_all(['h2', 'h3', 'h4', 'ul', 'li', 'p']):
            if elem.name in ['h2', 'h3', 'h4']:
                # 这是子标题
                current_subsection = elem.get_text().strip().lower()
                current_subsection = re.sub(r'[^a-z0-9]+', '_', current_subsection)
                print(f"  📂 Subsection: {current_subsection}")

            elif elem.name == 'li':
                # 这是一个短语
                phrase_text = elem.get_text().strip()

                # 跳过空文本
                if not phrase_text or len(phrase_text) < 10:
                    continue

                # 评估学术度 (基于特征)
                academic_score = evaluate_academic_score(phrase_text)

                # 评估使用频率 (基于短语特征)
                frequency = evaluate_frequency(phrase_text)

                phrase_id += 1
                phrases.append({
                    "id": f"{section_name}_{current_subsection}_{phrase_id}",
                    "phrase": phrase_text,
                    "usage": "",  # 可以手动补充或使用 AI 生成
                    "academicScore": academic_score,
                    "frequency": frequency,
                    "examples": [phrase_text],  # 短语本身作为示例
                    "section": section_name,
                    "subsection": current_subsection
                })

        print(f"✅ Found {len(phrases)} phrases in {section_name}")
        return phrases

    except Exception as e:
        print(f"❌ Error scraping {section_name}: {e}")
        return []

def evaluate_academic_score(phrase: str) -> float:
    """
    基于语言特征评估学术度评分

    特征:
    - 使用被动语态 (was/were/been + past participle)
    - 使用正式词汇 (demonstrate, investigate, etc.)
    - 使用复杂句式 (subordinate clauses)
    - 避免口语化表达
    """
    score = 5.0  # 基础分

    # 被动语态
    if re.search(r'\b(is|are|was|were|been|being)\s+\w+ed\b', phrase):
        score += 1.5

    # 正式学术词汇
    academic_words = [
        'demonstrate', 'investigate', 'examine', 'analyze', 'evaluate',
        'illustrate', 'elucidate', 'substantiate', 'corroborate', 'methodology',
        'furthermore', 'moreover', 'consequently', 'notwithstanding'
    ]
    for word in academic_words:
        if word in phrase.lower():
            score += 0.5

    # 复杂句式 (从句)
    if re.search(r'\b(which|that|who|whom|where|when|although|whereas)\b', phrase):
        score += 1.0

    # 限制在 0-10 范围
    return min(10.0, max(0.0, round(score, 1)))

def evaluate_frequency(phrase: str) -> str:
    """
    基于短语特征评估使用频率

    简单规则:
    - 短且常见 → very_high
    - 中等复杂度 → high
    - 复杂或专业 → medium
    """
    if len(phrase) < 30 and re.search(r'\b(this|the|a|an|in|on|at)\b', phrase):
        return "very_high"
    elif len(phrase) < 60:
        return "high"
    else:
        return "medium"

def scrape_all_sections() -> Dict:
    """
    爬取所有部分并生成完整的 JSON 数据
    """
    phrasebank_data = {
        "name": "Manchester Academic Phrasebank",
        "version": "2.0.0",
        "source": "University of Manchester",
        "url": "https://www.phrasebank.manchester.ac.uk/",
        "license": "Educational Use",
        "totalPhrases": 0,
        "lastUpdated": time.strftime("%Y-%m-%d"),
        "sections": {},
        "citations": {
            "reporting_verbs_strong": [],
            "reporting_verbs_moderate": [],
            "reporting_verbs_neutral": []
        },
        "transitions": {
            "contrast": [],
            "addition": [],
            "result": [],
            "emphasis": []
        }
    }

    # 爬取各个部分
    for section_name, url in SECTIONS.items():
        phrases = scrape_section(url, section_name)

        # 按 subsection 组织
        subsections = {}
        for phrase in phrases:
            subsection = phrase['subsection']
            if subsection not in subsections:
                subsections[subsection] = []
            subsections[subsection].append(phrase)

        phrasebank_data['sections'][section_name] = subsections
        phrasebank_data['totalPhrases'] += len(phrases)

        # 延迟避免被封
        time.sleep(2)

    return phrasebank_data

def save_to_json(data: Dict, output_file: str):
    """保存到 JSON 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Saved to {output_file}")
    print(f"📊 Total phrases: {data['totalPhrases']}")

def main():
    print("🚀 Manchester Academic Phrasebank Scraper")
    print("=" * 60)

    # 爬取所有数据
    data = scrape_all_sections()

    # 保存到文件
    output_file = "../data/manchester-phrasebank-full.json"
    save_to_json(data, output_file.replace('../', ''))

    print("\n" + "=" * 60)
    print("✅ Scraping completed!")
    print(f"\n📁 Output file: {output_file}")
    print(f"📊 Total phrases: {data['totalPhrases']}")
    print("\n💡 Next steps:")
    print("   1. Review the JSON file for quality")
    print("   2. Manually add 'usage' descriptions if needed")
    print("   3. Import to MyDictionary extension")

if __name__ == "__main__":
    main()
