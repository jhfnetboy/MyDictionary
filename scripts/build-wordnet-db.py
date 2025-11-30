#!/usr/bin/env python3
"""
Build WordNet Synonyms SQLite Database
从 NLTK WordNet 提取同义词关系并构建 SQLite 数据库
"""

import sqlite3
import sys

def install_nltk_wordnet():
    """安装 NLTK 和 WordNet 数据"""
    try:
        import nltk
    except ImportError:
        print("Installing NLTK...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "nltk"])
        import nltk

    try:
        from nltk.corpus import wordnet
        # 测试是否已下载
        wordnet.synsets('test')
    except LookupError:
        print("Downloading WordNet data...")
        import nltk
        nltk.download('wordnet')
        nltk.download('omw-1.4')

def build_synonyms_database(db_path='data/wordnet-synonyms.db'):
    """构建同义词数据库"""
    from nltk.corpus import wordnet as wn

    print(f"Building WordNet synonyms database: {db_path}")

    # 创建数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 创建表结构
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS synonyms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            synonym TEXT NOT NULL,
            pos TEXT,
            score REAL DEFAULT 1.0
        )
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_word ON synonyms(word)
    ''')

    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_synonym ON synonyms(synonym)
    ''')

    print("Extracting synonyms from WordNet...")

    # 统计信息
    total_words = 0
    total_synonyms = 0

    # 遍历所有词汇
    all_lemma_names = set()
    for synset in wn.all_synsets():
        for lemma in synset.lemmas():
            all_lemma_names.add(lemma.name().lower())

    print(f"Found {len(all_lemma_names)} unique words")

    # 为每个词提取同义词
    for word in sorted(all_lemma_names):
        synsets = wn.synsets(word)
        if not synsets:
            continue

        total_words += 1
        synonyms_for_word = set()

        # 遍历该词的所有同义词集
        for synset in synsets:
            pos = synset.pos()  # 词性: n, v, a, r, s

            # 获取该同义词集中的所有词
            for lemma in synset.lemmas():
                synonym = lemma.name().lower().replace('_', ' ')
                if synonym != word and synonym not in synonyms_for_word:
                    synonyms_for_word.add(synonym)
                    cursor.execute(
                        'INSERT INTO synonyms (word, synonym, pos, score) VALUES (?, ?, ?, ?)',
                        (word, synonym, pos, 1.0)
                    )
                    total_synonyms += 1

        if total_words % 1000 == 0:
            print(f"Processed {total_words} words, {total_synonyms} synonym relationships...")
            conn.commit()

    conn.commit()

    # 统计信息
    cursor.execute('SELECT COUNT(DISTINCT word) FROM synonyms')
    word_count = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM synonyms')
    synonym_count = cursor.fetchone()[0]

    print(f"\n✅ Database built successfully!")
    print(f"  - Unique words: {word_count:,}")
    print(f"  - Synonym relationships: {synonym_count:,}")
    print(f"  - Database file: {db_path}")

    # 获取文件大小
    import os
    file_size = os.path.getsize(db_path) / (1024 * 1024)
    print(f"  - File size: {file_size:.2f} MB")

    conn.close()

def test_database(db_path='data/wordnet-synonyms.db'):
    """测试数据库查询"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    test_words = ['professional', 'fuel', 'analyze', 'implement']

    print("\n🧪 Testing database queries:")
    for word in test_words:
        cursor.execute(
            'SELECT synonym FROM synonyms WHERE word = ? LIMIT 8',
            (word,)
        )
        results = cursor.fetchall()
        synonyms = [r[0] for r in results]
        print(f"  {word}: {', '.join(synonyms)}")

    conn.close()

if __name__ == '__main__':
    # 安装依赖
    install_nltk_wordnet()

    # 构建数据库
    import os
    os.makedirs('data', exist_ok=True)
    build_synonyms_database('data/wordnet-synonyms.db')

    # 测试数据库
    test_database('data/wordnet-synonyms.db')
