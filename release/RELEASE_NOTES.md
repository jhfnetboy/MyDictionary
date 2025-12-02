# MyDictionary v0.2.0 Release Notes

## 🎉 重大更新: 本地词典功能

### ⚡ 核心改进

**查询速度提升 60 倍**:
- 单词查询: 3000ms → **< 50ms**
- 智能路由: 自动选择本地词典或 AI 模型
- 离线可用: 无需网络连接

### 📚 词典数据

#### Tier 1 (内置)
- **词条数**: 7,406 个高频词汇
- **大小**: 4.6 MB
- **覆盖率**: 95% 日常使用场景
- **内容**: 柯林斯 4-5 星 + CET4 + 牛津核心 + 高考词汇

#### Tier 2 (可下载)
- **词条数**: 11,928 词
- **大小**: 1.0 MB (压缩)
- **内容**: CET6, IELTS, TOEFL, GRE 考试词汇
- **适用**: 英语学习进阶

#### Tier 3 (可下载)
- **词条数**: 751,192 词
- **大小**: 23 MB (压缩)
- **内容**: 完整 ECDICT 词库
- **适用**: 专业翻译、学术写作

### 🚀 新功能

1. **词典管理中心**
   - 可视化界面管理词典下载
   - 实时下载进度显示
   - 一键安装/删除扩展词库

2. **智能查询路由**
   - 单词/短语 → 本地词典 (< 50ms)
   - 句子 → AI 模型 (3-5s)
   - 未找到词汇 → 自动回退 AI

3. **丰富词条信息**
   - 国际音标 (99.5% 覆盖率)
   - 柯林斯星级 (1-5 星)
   - 考试标签 (CET4/6, IELTS, TOEFL, GRE)
   - 中英文释义
   - 词形变化 (复数、过去式等)

### 📊 性能优化

| 指标 | v0.1.x | v0.2.0 | 提升 |
|------|--------|--------|------|
| 单词查询 | 3000ms | 15ms | **60-250x** |
| 内存占用 | ~800MB | ~10MB | **减少 98%** |
| 插件体积 | 141MB | 55MB | **减少 61%** |

### 🔧 技术改进

- 移除 63MB 原始 CSV 文件
- 三层数据架构 (Tier 1/2/3)
- IndexedDB 持久化存储
- Map 内存缓存优化
- 词形变化自动匹配

### 📄 版权声明

本版本集成 [ECDICT](https://github.com/skywind3000/ECDICT) 开源词典数据:
- 作者: skywind3000
- 许可证: MIT License
- 词条数: 770,000+

## 📦 下载

### 主插件
- **MyDictionary-0.2.0.zip** (55 MB)
  - 包含 Tier 1 (7,406 词)
  - 立即可用

### 扩展词库 (可选)
- **tier2-extended.json.gz** (1.0 MB)
  - 通过插件内词典管理中心下载
  - 或手动下载到 `~/.cache/MyDictionary/`

- **tier3-full.json.gz** (23 MB)
  - 通过插件内词典管理中心下载
  - 或手动下载到 `~/.cache/MyDictionary/`

## 🔨 安装方法

### 标准安装
1. 下载 `MyDictionary-0.2.0.zip`
2. 解压到任意目录
3. Chrome → `chrome://extensions/`
4. 开启"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的目录

### 扩展词库安装
1. 点击插件图标
2. 选择"词典管理"
3. 点击"下载扩展词库"或"下载完整词库"
4. 等待下载和导入完成

## ⚠️ 已知问题

1. **Status Code 15 错误**
   - 解决方案: 清空 Chrome 缓存后重新加载插件

2. **首次下载较慢**
   - 原因: GitHub Release CDN 延迟
   - 建议: 使用稳定网络环境

## 🗺️ 未来计划

- Phase 3: 英英词典 (WordNet 3.0)
- Phase 4: 中英词典 (CC-CEDICT)
- Phase 5: 词典自动更新
- Phase 6: 离线语音合成

## 🙏 致谢

特别感谢:
- [ECDICT](https://github.com/skywind3000/ECDICT) - skywind3000
- [Transformers.js](https://github.com/xenova/transformers.js) - Xenova
- 所有使用和反馈的用户

---

**完整更新日志**: [CHANGELOG.md](../CHANGELOG.md)

**问题反馈**: [GitHub Issues](https://github.com/jhfnetboy/MyDictionary/issues)
