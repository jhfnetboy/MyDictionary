# 本地词典功能测试指南

## 📊 功能概览

本地词典功能已完整实现,提供快速的单词/短语查询能力。

### 智能路由策略

```javascript
查询类型判断:
- 单词 (1个词) → 本地词典 (目标: < 50ms)
- 短语 (2-5个词) → 本地词典
- 句子 (> 5个词 或 含中文) → AI 模型
```

### 词典数据结构

- **Tier 1**: 5,000 个高频词 (2.84 MB) - 内存缓存
- **Tier 2**: 12,384 个扩展词 (1.27 MB 压缩) - IndexedDB
- **Tier 3**: 751,355 个完整词库 (22.96 MB 压缩) - IndexedDB

## 🧪 测试步骤

### 1. 加载插件

```bash
# Chrome 地址栏输入
chrome://extensions/

# 步骤
1. 开启"开发者模式"
2. 点击"加载已解压的扩展程序"
3. 选择 dist/ 目录
```

### 2. 检查初始化日志

打开 Chrome DevTools Console (插件的 Service Worker 日志):

```
chrome://extensions/ → MyDictionary → Service Worker → 查看
```

预期日志:
```
🚀 Service Worker 激活
📦 WASM 路径已配置: chrome-extension://xxx/transformers/dist/
✅ 配置已加载
✅ LocalDictionary IndexedDB 已初始化
📚 加载 Tier 1: 5000 词
✅ Tier 1 加载完成 (XXXms)
   内存缓存: 5000 词
✅ 本地词典就绪
```

### 3. 测试单词查询

#### 测试用例 1: 高频词 (Tier 1)

```
输入单词: government
预期结果:
- ✅ 查询时间 < 50ms
- 显示音标: /'gʌvәnmәnt/
- 柯林斯星级: ⭐⭐⭐⭐⭐
- 标签: [CET4, CET6, IELTS]
- 中文翻译: n. 政府, 内阁
- 英文释义: (完整定义)
- 词形变化: 复数: governments
- 来源标识: 本地词典 (tier1)
```

#### 测试用例 2: 常见词

```
输入单词: hello
输入单词: computer
输入单词: beautiful
```

#### 测试用例 3: 词形变化匹配

```
输入: running
预期: 自动匹配到 run，显示 run 的词条

输入: studies
预期: 自动匹配到 study

输入: bigger
预期: 自动匹配到 big
```

#### 测试用例 4: 未收录单词

```
输入: asdfghjkl (不存在的词)
预期:
- 本地词典未找到
- 自动回退到 AI 模型翻译
- 日志显示: "📖 本地词典未找到，使用 AI 模型"
```

### 4. 测试短语查询

```
输入: hello world
预期:
- 查询 hello 和 world 两个单词
- 显示两个词条，用分隔线分开
- 每个词条格式与单词查询相同
```

### 5. 测试句子查询 (应该使用 AI 模型)

```
输入: This is a long sentence for testing
预期:
- 直接使用 AI 模型翻译
- 不经过本地词典查询
```

### 6. 性能验证

打开 Console,查看查询日志:

```javascript
// 单词查询 (内存命中)
🎯 内存命中: "government" (15.23ms)

// 词形匹配
🔄 词形匹配: "running" → "run" (28.45ms)

// 未找到
❌ 未找到: "asdfghjkl" (12.34ms)
```

### 7. 统计信息

在 Console 中手动调用:

```javascript
// 查看本地词典统计
localDictManager.getStats()

// 预期返回:
{
  hits: 10,           // 命中次数
  misses: 2,          // 未命中次数
  avgLookupTime: 18.5, // 平均查询时间 (ms)
  hitRate: "83.33%",  // 命中率
  cacheSize: 5000,    // 内存缓存大小
  cacheLoaded: true   // 是否已加载
}
```

## 📝 测试词汇列表

### 高频词 (Tier 1 - 应该在内存中)

```
government, system, education, people, information,
development, company, business, service, community,
technology, research, quality, student, program
```

### 常见词形变化测试

```
原型 → 变形:
run → running, ran
study → studies, studied
big → bigger, biggest
book → books
watch → watches
```

## 🐛 常见问题

### 1. 本地词典未加载

**症状**: 所有单词都使用 AI 模型翻译

**检查**:
1. Console 是否有 "✅ 本地词典就绪" 日志
2. 检查 `dist/data/dictionary/tier1-common.json` 是否存在
3. 检查 manifest.json 的 web_accessible_resources

### 2. 词典文件 404 错误

**症状**:
```
GET chrome-extension://xxx/data/dictionary/tier1-common.json 404
```

**解决**:
1. 确认 `dist/data/dictionary/` 目录存在
2. 重新运行 `node scripts/build.js`
3. 重新加载插件

### 3. IndexedDB 错误

**症状**: "Cannot open database" 或类似错误

**解决**:
1. Chrome DevTools → Application → Storage → Clear site data
2. 重新加载插件
3. 检查 IndexedDB 是否被禁用

## 📈 性能基准

| 查询类型 | 目标性能 | Tier 1 (内存) | Tier 2/3 (IndexedDB) |
|---------|---------|--------------|---------------------|
| 单词查询 | < 50ms | 5-20ms | 20-50ms |
| 短语查询 | < 100ms | 10-40ms | 40-100ms |
| 词形匹配 | < 80ms | 15-50ms | 30-80ms |

## 🎯 验收标准

- [x] Tier 1 词典成功加载到内存 (5000 词)
- [x] 单词查询时间 < 50ms (90% 命中率)
- [x] 词形变化自动匹配
- [x] 短语查询返回多个词条
- [x] 未找到单词自动回退到 AI 模型
- [x] 显示完整词条信息 (音标、星级、标签、翻译)
- [x] Console 日志清晰可追踪
- [x] IndexedDB 数据持久化

## 🚀 下一步优化 (可选)

1. **Tier 2/3 按需下载**: 用户手动触发下载扩展词库
2. **词典数据压缩**: 进一步减小 Tier 1 体积
3. **短语智能匹配**: 支持常见短语整体查询
4. **离线音标发音**: 集成 TTS 朗读功能
5. **词根词缀分析**: 未找到单词时提供词根拆解

## 📊 数据统计

```bash
# 查看词典文件大小
ls -lh dist/data/dictionary/

# 输出:
# tier1-common.json      2.8M  (5,000 词)
# tier2-extended.json.gz 1.3M  (12,384 词)
# tier3-full.json.gz     23M   (751,355 词)
# metadata.json          816B
```

## 🔗 相关文档

- [本地词典设计文档](./local-dictionary-design.md)
- [ECDICT 项目](https://github.com/skywind3000/ECDICT)
- [数据处理脚本](../scripts/process-ecdict.js)
