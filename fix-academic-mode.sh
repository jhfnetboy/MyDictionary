#!/bin/bash
# 一键修复学术模式加载问题

echo "🔧 MyDictionary 学术模式修复脚本"
echo "=================================="
echo ""

# 检查当前分支
echo "📍 检查 Git 分支..."
CURRENT_BRANCH=$(git branch --show-current)
echo "   当前分支: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "academic-writing" ]; then
  echo "⚠️  警告: 当前不在 academic-writing 分支"
  echo "   是否切换到 academic-writing 分支? (y/n)"
  read -r SWITCH
  if [ "$SWITCH" = "y" ]; then
    git checkout academic-writing
    echo "✅ 已切换到 academic-writing 分支"
  fi
fi

echo ""
echo "📦 检查关键文件..."

# 检查 JSON 文件
if [ -f "academic-phrasebank.json" ]; then
  FILE_SIZE=$(ls -lah academic-phrasebank.json | awk '{print $5}')
  echo "✅ academic-phrasebank.json 存在 ($FILE_SIZE)"
else
  echo "❌ academic-phrasebank.json 不存在!"
  echo "   尝试从 git 恢复..."
  git checkout academic-phrasebank.json
  if [ -f "academic-phrasebank.json" ]; then
    echo "✅ 文件已恢复"
  else
    echo "❌ 恢复失败,请手动检查"
    exit 1
  fi
fi

# 检查 IndexedDB 管理器
if [ -f "src/lib/academic-db-manager.js" ]; then
  echo "✅ src/lib/academic-db-manager.js 存在"
else
  echo "❌ src/lib/academic-db-manager.js 不存在!"
  exit 1
fi

# 检查 manifest.json
if grep -q "academic-phrasebank.json" manifest.json; then
  echo "✅ manifest.json 包含 academic-phrasebank.json"
else
  echo "❌ manifest.json 缺少 academic-phrasebank.json 配置"
  echo "   需要手动添加到 web_accessible_resources"
  exit 1
fi

echo ""
echo "🎯 文件检查完成!"
echo ""
echo "📝 下一步操作:"
echo "   1. 打开 Chrome: chrome://extensions/"
echo "   2. 找到 MyDictionary 扩展"
echo "   3. 点击 '移除' 按钮"
echo "   4. 点击 '加载已解压的扩展程序'"
echo "   5. 选择此项目文件夹: $(pwd)"
echo ""
echo "   或者在 chrome://extensions/ 点击刷新图标 🔄"
echo ""
echo "🧪 测试步骤:"
echo "   1. 打开任意网页"
echo "   2. 选中文本,按 Cmd+Shift+D (Mac) 或 Ctrl+Shift+D (Windows)"
echo "   3. 点击 'Academic Writing' 标签"
echo "   4. 应该看到下载提示"
echo "   5. 点击 '📥 Download Now'"
echo "   6. 等待几秒,应该显示成功消息"
echo ""
echo "✅ 修复脚本完成!"
