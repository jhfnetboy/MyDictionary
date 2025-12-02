#!/usr/bin/env node

/**
 * 构建完整词典文件
 * 合并 tier1 + tier2 + tier3 为单一完整词库
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('📚 构建完整词典...\n');

// 1. 读取所有 tier
const tier1Path = path.join(rootDir, 'data/dictionary/tier1-common.json');
const tier2Path = path.join(rootDir, 'data/dictionary/tier2-extended.json.gz');
const tier3Path = path.join(rootDir, 'data/dictionary/tier3-full.json.gz');

console.log('📖 读取 Tier 1...');
const tier1Data = JSON.parse(fs.readFileSync(tier1Path, 'utf-8'));
console.log(`   Tier 1: ${tier1Data.length} 词`);

console.log('📖 读取 Tier 2...');
const tier2Compressed = fs.readFileSync(tier2Path);
const tier2Json = zlib.gunzipSync(tier2Compressed).toString('utf-8');
const tier2Data = JSON.parse(tier2Json);
console.log(`   Tier 2: ${tier2Data.length} 词`);

console.log('📖 读取 Tier 3...');
const tier3Compressed = fs.readFileSync(tier3Path);
const tier3Json = zlib.gunzipSync(tier3Compressed).toString('utf-8');
const tier3Data = JSON.parse(tier3Json);
console.log(`   Tier 3: ${tier3Data.length} 词\n`);

// 2. 去重合并 (使用 Map 自动去重)
console.log('🔄 合并并去重...');
const fullDict = new Map();

// Tier1 优先 (最高质量)
for (const entry of tier1Data) {
  fullDict.set(entry.word.toLowerCase(), { ...entry, _tier: 1 });
}

// Tier2 补充
for (const entry of tier2Data) {
  const key = entry.word.toLowerCase();
  if (!fullDict.has(key)) {
    fullDict.set(key, { ...entry, _tier: 2 });
  }
}

// Tier3 补充
for (const entry of tier3Data) {
  const key = entry.word.toLowerCase();
  if (!fullDict.has(key)) {
    fullDict.set(key, { ...entry, _tier: 3 });
  }
}

const fullData = Array.from(fullDict.values());
console.log(`✅ 合并完成: ${fullData.length} 词 (去重后)\n`);

// 3. 排序 (按柯林斯星级 + BNC 频率)
console.log('🔄 排序...');
fullData.sort((a, b) => {
  if (a.collins !== b.collins) return b.collins - a.collins;

  const aBnc = a.bnc || 99999;
  const bBnc = b.bnc || 99999;
  if (aBnc !== bBnc) return aBnc - bBnc;

  return 0;
});
console.log('✅ 排序完成\n');

// 4. 生成压缩文件
const outputDir = path.join(rootDir, 'release/dictionaries');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('💾 生成文件...');

// 4.1 JSON 原始文件 (用于本地开发)
const jsonPath = path.join(outputDir, 'full-dictionary.json');
fs.writeFileSync(jsonPath, JSON.stringify(fullData, null, 2));
const jsonSize = (fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2);
console.log(`   ✅ full-dictionary.json (${jsonSize} MB)`);

// 4.2 压缩文件 (用于下载)
const gzPath = path.join(outputDir, 'full-dictionary.json.gz');
const compressed = zlib.gzipSync(JSON.stringify(fullData));
fs.writeFileSync(gzPath, compressed);
const gzSize = (fs.statSync(gzPath).size / 1024 / 1024).toFixed(2);
console.log(`   ✅ full-dictionary.json.gz (${gzSize} MB)`);

// 5. 生成元数据
const metadata = {
  version: '0.2.0',
  generatedAt: new Date().toISOString(),
  source: 'ECDICT (skywind3000)',
  license: 'MIT',
  dictionary: {
    total: fullData.length,
    tier1: tier1Data.length,
    tier2: tier2Data.length,
    tier3: tier3Data.length,
    compressed: `${gzSize} MB`,
    uncompressed: `${jsonSize} MB`
  },
  statistics: {
    withTranslation: fullData.filter(e => e.translation).length,
    withPhonetic: fullData.filter(e => e.phonetic).length,
    withCollins: fullData.filter(e => e.collins > 0).length,
    collins5: fullData.filter(e => e.collins === 5).length,
    collins4: fullData.filter(e => e.collins === 4).length,
    collins3: fullData.filter(e => e.collins === 3).length
  }
};

const metaPath = path.join(outputDir, 'full-dictionary-metadata.json');
fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
console.log(`   ✅ full-dictionary-metadata.json\n`);

// 6. 输出统计
console.log('📊 统计信息:');
console.log(`   总词条: ${metadata.dictionary.total.toLocaleString()}`);
console.log(`   有翻译: ${metadata.statistics.withTranslation.toLocaleString()}`);
console.log(`   有音标: ${metadata.statistics.withPhonetic.toLocaleString()}`);
console.log(`   柯林斯 5 星: ${metadata.statistics.collins5.toLocaleString()}`);
console.log(`   柯林斯 4 星: ${metadata.statistics.collins4.toLocaleString()}`);
console.log(`   柯林斯 3 星: ${metadata.statistics.collins3.toLocaleString()}`);
console.log(`\n   压缩大小: ${gzSize} MB`);
console.log(`   原始大小: ${jsonSize} MB`);
console.log(`   压缩率: ${((1 - parseFloat(gzSize) / parseFloat(jsonSize)) * 100).toFixed(1)}%`);

console.log('\n✅ 完整词典构建完成!');
console.log(`📦 输出目录: ${outputDir}`);
