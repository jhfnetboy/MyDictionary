#!/bin/bash
# 从 SQLite 导出同义词到 JSON 格式
# 使用系统自带的 sqlite3 和 jq

set -e

DB_PATH="./wordnet-synonyms.db"
OUTPUT_DIR="../data"
OUTPUT_JSON="$OUTPUT_DIR/synonyms.json"
OUTPUT_GZ="$OUTPUT_JSON.gz"

echo "📦 WordNet SQLite → JSON Exporter"
echo ""

# 检查数据库
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found: $DB_PATH"
    echo ""
    echo "📥 Please download it first:"
    echo "   cd scripts"
    echo "   curl -L -o wordnet-synonyms.db \\"
    echo "     https://github.com/jhfnetboy/MyDictionary/releases/download/v0.2.0-beta/wordnet-synonyms.db"
    exit 1
fi

echo "✅ Database found: $DB_PATH"
echo "📊 Querying database..."
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

# 导出为 CSV 格式
CSV_FILE="$OUTPUT_DIR/synonyms.csv"
sqlite3 "$DB_PATH" <<EOF
.mode csv
.output $CSV_FILE
SELECT word, synonym, pos, score FROM synonyms ORDER BY word, score DESC;
.quit
EOF

echo "✅ Exported to CSV: $CSV_FILE"

# 将 CSV 转换为 JSON（使用 Python）
python3 - <<'PYTHON'
import csv
import json
import gzip

csv_file = "../data/synonyms.csv"
json_file = "../data/synonyms.json"
gz_file = "../data/synonyms.json.gz"

print("📚 Converting CSV to JSON...")

synonyms_map = {}
word_count = 0

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        if len(row) != 4:
            continue

        word = row[0].lower()
        synonym = row[1]
        pos = row[2] or 'unknown'
        score = float(row[3] or 1.0)

        if word not in synonyms_map:
            synonyms_map[word] = []
            word_count += 1

        # 限制每个单词最多 20 个同义词
        if len(synonyms_map[word]) < 20:
            synonyms_map[word].append({
                'word': synonym,
                'pos': pos,
                'score': f"{score:.2f}"
            })

print(f"✅ Grouped into {word_count:,} unique words\n")

# 写入 JSON
print("💾 Writing JSON...")
with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(synonyms_map, f, ensure_ascii=False)

import os
file_size_mb = os.path.getsize(json_file) / 1024 / 1024
print(f"✅ JSON file: {json_file}")
print(f"📦 Size: {file_size_mb:.2f} MB\n")

# Gzip 压缩
print("🗜️  Creating gzipped version...")
with open(json_file, 'rb') as f_in:
    with gzip.open(gz_file, 'wb') as f_out:
        f_out.writelines(f_in)

gz_size_mb = os.path.getsize(gz_file) / 1024 / 1024
print(f"✅ Gzipped file: {gz_file}")
print(f"📦 Compressed size: {gz_size_mb:.2f} MB\n")

# 删除临时 CSV
os.remove(csv_file)
print("🗑️  Cleaned up temporary files\n")

# 显示示例
print("📄 Sample data:\n")
for i, (word, syns) in enumerate(list(synonyms_map.items())[:3]):
    print(f'   "{word}": [')
    for syn in syns[:3]:
        print(f"      {syn}")
    if len(syns) > 3:
        print(f"      ... +{len(syns) - 3} more")
    print("   ]\n")

print("✅ Export completed!\n")
print("📋 Next steps:")
print("   1. Upload synonyms.json.gz to GitHub Release")
print("   2. Update URL in synonyms-manager.js")
print("   3. Test the new implementation")
PYTHON

echo ""
echo "✅ All done!"
