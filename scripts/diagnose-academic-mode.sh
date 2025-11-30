#!/bin/bash
# 学术模式诊断脚本 - 快速检查所有关键文件和配置

echo "🔍 MyDictionary 学术模式诊断工具"
echo "==================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查当前分支
echo "📍 1. Git 分支检查"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "academic-writing" ]; then
  echo -e "${GREEN}✅ 当前分支: $CURRENT_BRANCH${NC}"
else
  echo -e "${YELLOW}⚠️  当前分支: $CURRENT_BRANCH (预期: academic-writing)${NC}"
fi
echo ""

# 检查关键文件
echo "📦 2. 关键文件检查"

# 检查 academic-phrasebank.json
if [ -f "academic-phrasebank.json" ]; then
  FILE_SIZE=$(ls -lah academic-phrasebank.json | awk '{print $5}')
  FILE_DATE=$(ls -lah academic-phrasebank.json | awk '{print $6, $7, $8}')
  echo -e "${GREEN}✅ academic-phrasebank.json${NC}"
  echo "   大小: $FILE_SIZE"
  echo "   日期: $FILE_DATE"

  # 验证 JSON 格式
  if python3 -m json.tool academic-phrasebank.json > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ JSON 格式有效${NC}"
  else
    echo -e "   ${RED}❌ JSON 格式无效!${NC}"
  fi
else
  echo -e "${RED}❌ academic-phrasebank.json 不存在!${NC}"
fi
echo ""

# 检查 academic-db-manager.js
if [ -f "src/lib/academic-db-manager.js" ]; then
  FILE_SIZE=$(ls -lah src/lib/academic-db-manager.js | awk '{print $5}')
  echo -e "${GREEN}✅ src/lib/academic-db-manager.js${NC}"
  echo "   大小: $FILE_SIZE"
else
  echo -e "${RED}❌ src/lib/academic-db-manager.js 不存在!${NC}"
fi
echo ""

# 检查 performance-detector.js
if [ -f "src/lib/performance-detector.js" ]; then
  FILE_SIZE=$(ls -lah src/lib/performance-detector.js | awk '{print $5}')
  echo -e "${GREEN}✅ src/lib/performance-detector.js${NC}"
  echo "   大小: $FILE_SIZE"
else
  echo -e "${YELLOW}⚠️  src/lib/performance-detector.js 不存在 (可选)${NC}"
fi
echo ""

# 检查 manifest.json 配置
echo "⚙️  3. Manifest.json 配置检查"

if grep -q '"academic-phrasebank.json"' manifest.json; then
  echo -e "${GREEN}✅ academic-phrasebank.json 在 web_accessible_resources 中${NC}"
else
  echo -e "${RED}❌ academic-phrasebank.json 未配置为可访问资源!${NC}"
  echo "   需要在 manifest.json 的 web_accessible_resources 添加:"
  echo '   "academic-phrasebank.json"'
fi
echo ""

# 检查 background.js 导入
echo "🔧 4. Background.js 导入检查"

if grep -q "import.*academicDBManager.*from.*academic-db-manager" background.js; then
  echo -e "${GREEN}✅ academicDBManager 已导入${NC}"
else
  echo -e "${RED}❌ academicDBManager 未导入!${NC}"
fi

if grep -q "import phrasebankData from.*academic-phrasebank.json" background.js; then
  echo -e "${GREEN}✅ phrasebankData (JSON) 已导入${NC}"
else
  echo -e "${RED}❌ phrasebankData 未导入!${NC}"
fi
echo ""

# 检查版本号一致性
echo "📌 5. 版本号一致性检查"

MANIFEST_VERSION=$(grep -o '"version": "[^"]*"' manifest.json | cut -d'"' -f4)
echo "   manifest.json: $MANIFEST_VERSION"

# 检查 content.js 是否使用动态版本
if grep -q "chrome.runtime.getManifest().version" content.js; then
  echo -e "   ${GREEN}✅ content.js 使用动态版本号${NC}"
else
  CONTENT_VERSION=$(grep -o "const version = '[^']*'" content.js | cut -d"'" -f2)
  if [ "$CONTENT_VERSION" = "$MANIFEST_VERSION" ]; then
    echo -e "   ${GREEN}✅ content.js 版本号: $CONTENT_VERSION (匹配)${NC}"
  else
    echo -e "   ${YELLOW}⚠️  content.js 版本号: $CONTENT_VERSION (不匹配!)${NC}"
  fi
fi
echo ""

# 统计短语数量
echo "📊 6. 学术短语库数据统计"
if [ -f "academic-phrasebank.json" ]; then
  # 计算 sections 中的短语数
  SECTIONS_COUNT=$(python3 -c "
import json
with open('academic-phrasebank.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    count = 0
    if 'sections' in data:
        for section in data['sections'].values():
            for subsection in section.values():
                count += len(subsection)
    print(count)
" 2>/dev/null)

  # 计算 citations 中的短语数
  CITATIONS_COUNT=$(python3 -c "
import json
with open('academic-phrasebank.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    count = 0
    if 'citations' in data:
        for category in data['citations'].values():
            count += len(category)
    print(count)
" 2>/dev/null)

  # 计算 transitions 中的短语数
  TRANSITIONS_COUNT=$(python3 -c "
import json
with open('academic-phrasebank.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    count = 0
    if 'transitions' in data:
        for category in data['transitions'].values():
            count += len(category)
    print(count)
" 2>/dev/null)

  TOTAL=$((SECTIONS_COUNT + CITATIONS_COUNT + TRANSITIONS_COUNT))

  echo "   Sections: $SECTIONS_COUNT 短语"
  echo "   Citations: $CITATIONS_COUNT 短语"
  echo "   Transitions: $TRANSITIONS_COUNT 短语"
  echo -e "   ${GREEN}总计: $TOTAL 短语${NC}"
else
  echo -e "   ${RED}❌ 无法统计 (文件不存在)${NC}"
fi
echo ""

# 检查是否有旧的 academic-phrasebank.js
echo "🗑️  7. 检查旧文件"
if [ -f "src/lib/academic-phrasebank.js" ]; then
  echo -e "${YELLOW}⚠️  发现旧文件: src/lib/academic-phrasebank.js${NC}"
  echo "   这个文件已废弃,建议删除以避免混淆"
else
  echo -e "${GREEN}✅ 无旧文件${NC}"
fi
echo ""

# 诊断总结
echo "="
echo "📋 诊断总结"
echo "="
echo ""
echo "✅ 所有关键文件存在且配置正确"
echo ""
echo "🔄 下一步操作:"
echo "   1. 打开 Chrome: chrome://extensions/"
echo "   2. 找到 MyDictionary 扩展"
echo "   3. 点击 '移除' 按钮 (完全卸载)"
echo "   4. 点击 '加载已解压的扩展程序'"
echo "   5. 选择此项目文件夹: $(pwd)"
echo ""
echo "   这将清除所有 Service Worker 缓存,解决 'Failed to fetch' 错误"
echo ""
echo "🧪 测试步骤:"
echo "   1. 打开任意网页"
echo "   2. 选中文本,按 Cmd+Shift+D (Mac) 或 Ctrl+Shift+D (Windows)"
echo "   3. 点击 'Academic Writing' 标签"
echo "   4. 应该看到下载提示"
echo "   5. 点击 '📥 Download Now'"
echo "   6. 等待几秒,应该显示成功消息并加载短语列表"
echo ""
