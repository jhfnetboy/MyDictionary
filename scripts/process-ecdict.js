#!/usr/bin/env node

/**
 * ECDICT 数据处理脚本
 *
 * 功能:
 * 1. 解析 ECDICT CSV
 * 2. 过滤和分层:
 *    - Tier 1: 高频词汇 (5000 词) - CET4 + 柯林斯5星 + 牛津核心
 *    - Tier 2: 扩展词汇 (50000 词) - CET6 + IELTS + TOEFL
 *    - Tier 3: 完整词库 (770000 词) - 所有词条
 * 3. 生成 JSON 文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('📚 ECDICT 数据处理开始...\n');

// 读取 CSV
const csvPath = path.join(rootDir, 'data/dictionary/ecdict.csv');
console.log(`📖 读取 CSV: ${csvPath}`);

const csvData = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvData, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true
});

console.log(`✅ 解析完成: ${records.length} 条记录\n`);

// 数据清洗和转换
function cleanEntry(record) {
  // 解析 exchange 字段 (词形变化)
  const exchange = {};
  if (record.exchange) {
    const parts = record.exchange.split('/');
    for (const part of parts) {
      const [type, value] = part.split(':');
      if (type && value) {
        const typeMap = {
          'p': 'plural',      // 复数
          'd': 'past',        // 过去式
          '3': 'thirdPerson', // 第三人称单数
          'i': 'presentParticiple', // 现在分词
          '0': 'original',    // 原型
          '1': 'comparative', // 比较级
          's': 'superlative'  // 最高级
        };
        exchange[typeMap[type] || type] = value;
      }
    }
  }

  // 解析 tag 字段
  const tags = record.tag ? record.tag.split(' ').filter(t => t) : [];

  return {
    word: record.word.trim(),
    phonetic: record.phonetic || '',
    definition: record.definition || '',
    translation: record.translation || '',
    pos: record.pos || '',
    collins: parseInt(record.collins) || 0,
    oxford: record.oxford === 'TRUE',
    tags: tags,
    bnc: parseInt(record.bnc) || 0,
    frq: parseInt(record.frq) || 0,
    exchange: exchange
  };
}

console.log('🔄 数据清洗和分层...');

const allEntries = records.map(cleanEntry);

// Tier 1: 高频词汇 (8000 词)
// 优先级: 柯林斯星级 > BNC频率 > CET4 > 高考
const tier1Candidates = allEntries.filter(entry => {
  // 必须有中文翻译
  if (!entry.translation) return false;

  // 必入选: 柯林斯 4-5 星 (含所有基础高频词)
  if (entry.collins >= 4) return true;

  // 必入选: CET4 词汇
  if (entry.tags.includes('cet4')) return true;

  // 必入选: 牛津核心词汇
  if (entry.oxford) return true;

  // 备选: 柯林斯 3 星词汇
  if (entry.collins === 3) return true;

  // 备选: 高考词汇
  if (entry.tags.includes('gk')) return true;

  // 备选: BNC < 2000 的高频词
  if (entry.bnc > 0 && entry.bnc < 2000) return true;

  // 备选: CET6 词汇
  if (entry.tags.includes('cet6')) return true;

  return false;
});

console.log(`   候选词汇: ${tier1Candidates.length} 词`);

const tier1 = tier1Candidates
  .sort((a, b) => {
    // 1. 柯林斯星级优先 (保证基础词在前)
    if (a.collins !== b.collins) return b.collins - a.collins;

    // 2. BNC 频率 (值越小越常用)
    const aBnc = a.bnc || 99999;
    const bBnc = b.bnc || 99999;
    if (aBnc !== bBnc) return aBnc - bBnc;

    // 3. CET4 优先
    const aCet4 = a.tags.includes('cet4') ? 1 : 0;
    const bCet4 = b.tags.includes('cet4') ? 1 : 0;
    if (aCet4 !== bCet4) return bCet4 - aCet4;

    // 4. 牛津核心
    if (a.oxford !== b.oxford) return b.oxford ? 1 : -1;

    return 0;
  })
  .slice(0, 8000); // 扩大到 8000 词

console.log(`✅ Tier 1 (高频词汇): ${tier1.length} 词`);

// Tier 2: 扩展词汇 (50000 词)
const tier1Words = new Set(tier1.map(e => e.word));
const tier2 = allEntries
  .filter(entry => {
    if (tier1Words.has(entry.word)) return false;
    if (!entry.translation) return false;

    // CET6, IELTS, TOEFL, GRE
    const hasTag = entry.tags.some(tag =>
      ['cet6', 'ielts', 'toefl', 'gre', 'sat'].includes(tag)
    );

    if (hasTag) return true;
    if (entry.collins >= 3) return true;
    if (entry.bnc > 0 && entry.bnc < 10000) return true; // BNC 前10000

    return false;
  })
  .sort((a, b) => {
    if (a.collins !== b.collins) return b.collins - a.collins;
    if (a.bnc !== b.bnc) return a.bnc - b.bnc;
    return 0;
  })
  .slice(0, 50000);

console.log(`✅ Tier 2 (扩展词汇): ${tier2.length} 词`);

// Tier 3: 完整词库
const tier2Words = new Set(tier2.map(e => e.word));
const tier3 = allEntries.filter(entry =>
  !tier1Words.has(entry.word) &&
  !tier2Words.has(entry.word) &&
  entry.translation // 必须有翻译
);

console.log(`✅ Tier 3 (完整词库): ${tier3.length} 词\n`);

// 生成 JSON 文件
const outputDir = path.join(rootDir, 'data/dictionary');

console.log('💾 生成 JSON 文件...');

// Tier 1: 直接 JSON (用于内存加载)
const tier1Path = path.join(outputDir, 'tier1-common.json');
fs.writeFileSync(tier1Path, JSON.stringify(tier1, null, 2));
const tier1Size = (fs.statSync(tier1Path).size / 1024 / 1024).toFixed(2);
console.log(`✅ ${tier1Path} (${tier1Size} MB)`);

// Tier 2: Gzip 压缩
const tier2Path = path.join(outputDir, 'tier2-extended.json.gz');
const tier2Json = JSON.stringify(tier2);
const tier2Compressed = zlib.gzipSync(tier2Json);
fs.writeFileSync(tier2Path, tier2Compressed);
const tier2Size = (fs.statSync(tier2Path).size / 1024 / 1024).toFixed(2);
console.log(`✅ ${tier2Path} (${tier2Size} MB)`);

// Tier 3: Gzip 压缩
const tier3Path = path.join(outputDir, 'tier3-full.json.gz');
const tier3Json = JSON.stringify(tier3);
const tier3Compressed = zlib.gzipSync(tier3Json);
fs.writeFileSync(tier3Path, tier3Compressed);
const tier3Size = (fs.statSync(tier3Path).size / 1024 / 1024).toFixed(2);
console.log(`✅ ${tier3Path} (${tier3Size} MB)`);

// 生成元数据
const metadata = {
  version: '1.0.0',
  source: 'ECDICT (skywind3000)',
  license: 'MIT',
  generatedAt: new Date().toISOString(),
  tiers: {
    tier1: {
      count: tier1.length,
      size: `${tier1Size} MB`,
      description: '高频词汇 (柯林斯4-5星 + BNC高频, CET4, 牛津核心, 高考)',
      file: 'tier1-common.json'
    },
    tier2: {
      count: tier2.length,
      size: `${tier2Size} MB`,
      description: '扩展词汇 (CET6, IELTS, TOEFL, GRE, 柯林斯3星)',
      file: 'tier2-extended.json.gz'
    },
    tier3: {
      count: tier3.length,
      size: `${tier3Size} MB`,
      description: '完整词库 (所有词条)',
      file: 'tier3-full.json.gz'
    }
  },
  statistics: {
    total: allEntries.length,
    withTranslation: allEntries.filter(e => e.translation).length,
    withPhonetic: allEntries.filter(e => e.phonetic).length,
    withCollins: allEntries.filter(e => e.collins > 0).length,
    oxford: allEntries.filter(e => e.oxford).length
  }
};

const metadataPath = path.join(outputDir, 'metadata.json');
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
console.log(`✅ ${metadataPath}\n`);

// 输出统计
console.log('📊 统计信息:');
console.log(`   总词条: ${metadata.statistics.total}`);
console.log(`   有翻译: ${metadata.statistics.withTranslation}`);
console.log(`   有音标: ${metadata.statistics.withPhonetic}`);
console.log(`   柯林斯: ${metadata.statistics.withCollins}`);
console.log(`   牛津核心: ${metadata.statistics.oxford}`);
console.log('\n✅ 处理完成!');

// 输出示例词条
console.log('\n📝 Tier 1 示例词条:');
console.log(JSON.stringify(tier1.slice(0, 3), null, 2));
