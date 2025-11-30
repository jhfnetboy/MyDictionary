#!/usr/bin/env python3
"""
Manchester Academic Phrasebank Scraper V2
改进版 - 正确解析网页中的学术短语
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

def clean_phrase(phrase: str) -> str:
    """清理短语文本"""
    # 移除多余空格
    phrase = re.sub(r'\s+', ' ', phrase).strip()
    # 移除HTML实体
    phrase = phrase.replace('&nbsp;', ' ')
    return phrase

def evaluate_academic_score(phrase: str) -> float:
    """评估学术度评分 (0-10)"""
    score = 5.0

    # 被动语态 +1.5
    if re.search(r'\b(is|are|was|were|been|being)\s+\w+ed\b', phrase, re.IGNORECASE):
        score += 1.5

    # 学术词汇
    academic_words = [
        'demonstrate', 'investigate', 'examine', 'analyze', 'evaluate',
        'assess', 'determine', 'establish', 'identify', 'explore',
        'indicate', 'reveal', 'suggest', 'propose', 'argue',
        'hypothesis', 'objective', 'methodology', 'significant', 'substantial'
    ]
    for word in academic_words:
        if word in phrase.lower():
            score += 0.5

    # 正式连接词
    formal_connectors = [
        'furthermore', 'moreover', 'consequently', 'therefore',
        'nevertheless', 'notwithstanding', 'thus', 'hence'
    ]
    for connector in formal_connectors:
        if connector in phrase.lower():
            score += 0.5

    # 限制在 0-10 范围内
    return min(10.0, max(0.0, round(score, 1)))

def evaluate_frequency(phrase: str) -> str:
    """评估使用频率"""
    # 简单规则:短语越短,使用频率越高
    word_count = len(phrase.split())

    if word_count <= 5:
        return 'very_high'
    elif word_count <= 10:
        return 'high'
    else:
        return 'medium'

def scrape_section(url: str, section_name: str) -> Dict[str, List[Dict]]:
    """
    爬取某个部分的学术短语

    Returns:
        {subsection_name: [phrase_objects]}
    """
    print(f"📖 Scraping {section_name} from {url}...")

    try:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        subsections = {}
        phrase_id = 0

        # 查找所有包含短语的段落
        # Manchester Phrasebank 的短语通常在 <p> 标签中,用 <br> 分隔
        content_divs = soup.find_all(['div', 'section'], class_=re.compile('content|main|entry'))

        if not content_divs:
            # 备用方案:查找所有 p 标签
            content_divs = [soup.find('body')]

        current_subsection = 'general'

        for div in content_divs:
            if not div:
                continue

            # 查找标题 (h2, h3, h4) 作为子分类
            for heading in div.find_all(['h2', 'h3', 'h4']):
                heading_text = clean_phrase(heading.get_text())
                if heading_text and len(heading_text) > 3:
                    # 转换为合法的 subsection 名称
                    current_subsection = re.sub(r'[^a-z0-9]+', '_', heading_text.lower())

            # 查找段落
            for p in div.find_all('p'):
                if not p:
                    continue

                # 获取HTML内容以保留 <br> 标签
                p_html = str(p)

                # 按 <br> 分割短语
                phrases_raw = re.split(r'<br\s*/?>', p_html)

                for phrase_raw in phrases_raw:
                    # 移除HTML标签
                    phrase_text = BeautifulSoup(phrase_raw, 'html.parser').get_text()
                    phrase_text = clean_phrase(phrase_text)

                    # 过滤无效短语
                    if not phrase_text or len(phrase_text) < 10:
                        continue

                    # 过滤导航元素
                    if any(skip in phrase_text.lower() for skip in [
                        'contact us', 'find us', 'connect with',
                        'copyright', 'all rights', 'university of manchester',
                        'phrasebank', 'twitter', 'facebook'
                    ]):
                        continue

                    # 确保是完整句子 (包含动词或有意义的学术短语)
                    if not re.search(r'\b(is|are|was|were|be|been|have|has|had|will|would|can|could|may|might|should|this|the|these|those|to|of|in|on|at)\b', phrase_text.lower()):
                        continue

                    phrase_id += 1

                    if current_subsection not in subsections:
                        subsections[current_subsection] = []

                    phrase_obj = {
                        'id': f"{section_name}_{current_subsection}_{phrase_id}",
                        'phrase': phrase_text,
                        'usage': '',  # 手动补充
                        'academicScore': evaluate_academic_score(phrase_text),
                        'frequency': evaluate_frequency(phrase_text),
                        'examples': [phrase_text],
                        'section': section_name,
                        'subsection': current_subsection
                    }

                    subsections[current_subsection].append(phrase_obj)

        total_phrases = sum(len(phrases) for phrases in subsections.values())
        print(f"  ✅ Found {total_phrases} phrases in {len(subsections)} subsections")

        # 显示每个子分类的数量
        for subsection, phrases in subsections.items():
            if phrases:
                print(f"     📂 {subsection}: {len(phrases)} phrases")

        return subsections

    except Exception as e:
        print(f"  ❌ Error scraping {section_name}: {e}")
        return {}

def scrape_all_sections() -> Dict:
    """爬取所有部分"""
    data = {
        'sections': {},
        'citations': {},
        'transitions': {},
        'metadata': {
            'source': 'Manchester Academic Phrasebank',
            'url': BASE_URL,
            'scrapedAt': time.strftime('%Y-%m-%d %H:%M:%S'),
            'version': '2.0'
        }
    }

    for section_name, url in SECTIONS.items():
        subsections = scrape_section(url, section_name)
        if subsections:
            data['sections'][section_name] = subsections

        # 礼貌延迟
        time.sleep(1)

    return data

def save_to_json(data: Dict, output_file: str):
    """保存数据到 JSON 文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 统计
    total_phrases = sum(
        len(phrases)
        for section in data['sections'].values()
        for phrases in section.values()
    )

    print(f"\n✅ Saved to {output_file}")
    print(f"📊 Total phrases: {total_phrases}")

def main():
    print("🚀 Manchester Academic Phrasebank Scraper V2")
    print("=" * 60)

    # 爬取所有部分
    data = scrape_all_sections()

    # 保存到文件
    output_file = "data/manchester-phrasebank-full.json"
    save_to_json(data, output_file)

    print("\n" + "=" * 60)
    print("✅ Scraping completed!")
    print(f"\n📁 Output file: {output_file}")

    # 统计
    total_phrases = sum(
        len(phrases)
        for section in data['sections'].values()
        for phrases in section.values()
    )
    print(f"📊 Total phrases: {total_phrases}")

    print("\n💡 Next steps:")
    print("   1. Review the JSON file for quality")
    print("   2. Manually add 'usage' descriptions if needed")
    print("   3. Replace academic-phrasebank.json with this file")

if __name__ == '__main__':
    main()
