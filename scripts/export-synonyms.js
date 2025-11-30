#!/usr/bin/env node
/**
 * 从 SQLite 数据库导出同义词到 JSON 格式
 *
 * 使用方法：
 * 1. 下载 wordnet-synonyms.db 到 scripts/ 目录
 * 2. npm install better-sqlite3
 * 3. node scripts/export-synonyms.js
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'wordnet-synonyms.db');
const OUTPUT_JSON = path.join(__dirname, '../data/synonyms.json');

console.log('📦 WordNet SQLite → JSON Exporter\n');

// 检查数据库文件
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found:', DB_PATH);
  console.log('\n📥 Please download wordnet-synonyms.db from:');
  console.log('   https://github.com/jhfnetboy/MyDictionary/releases/download/v0.2.0-beta/wordnet-synonyms.db');
  console.log('   and place it in the scripts/ directory\n');
  process.exit(1);
}

console.log('✅ Database found:', DB_PATH);
console.log('📊 Opening database...\n');

const db = new Database(DB_PATH, { readonly: true });

try {
  // 获取数据库统计
  const stats = db.prepare('SELECT COUNT(*) as total FROM synonyms').get();
  console.log(`📈 Total synonym entries: ${stats.total.toLocaleString()}\n`);

  // 查询所有同义词
  console.log('🔍 Querying all synonyms...');
  const allSynonyms = db.prepare(`
    SELECT word, synonym, pos, score
    FROM synonyms
    ORDER BY word, score DESC
  `).all();

  console.log('✅ Query completed\n');

  // 按单词分组
  console.log('📚 Grouping by word...');
  const synonymMap = {};
  let wordCount = 0;

  allSynonyms.forEach(row => {
    const word = row.word.toLowerCase();

    if (!synonymMap[word]) {
      synonymMap[word] = [];
      wordCount++;
    }

    synonymMap[word].push({
      word: row.synonym,
      pos: row.pos || 'unknown',
      score: parseFloat(row.score || 1.0).toFixed(2)
    });
  });

  console.log(`✅ Grouped into ${wordCount.toLocaleString()} unique words\n`);

  // 限制每个单词的同义词数量（最多 20 个）
  console.log('✂️ Trimming to top 20 synonyms per word...');
  let trimmedCount = 0;
  Object.keys(synonymMap).forEach(word => {
    if (synonymMap[word].length > 20) {
      trimmedCount += synonymMap[word].length - 20;
      synonymMap[word] = synonymMap[word].slice(0, 20);
    }
  });

  if (trimmedCount > 0) {
    console.log(`   Removed ${trimmedCount.toLocaleString()} low-score entries\n`);
  }

  // 写入 JSON 文件
  console.log('💾 Writing JSON file...');

  // 确保目录存在
  const outputDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonContent = JSON.stringify(synonymMap);
  fs.writeFileSync(OUTPUT_JSON, jsonContent);

  const fileSizeMB = (fs.statSync(OUTPUT_JSON).size / 1024 / 1024).toFixed(2);
  console.log(`✅ JSON file created: ${OUTPUT_JSON}`);
  console.log(`📦 File size: ${fileSizeMB} MB\n`);

  // 生成压缩版本
  console.log('🗜️ Creating gzipped version...');
  const gzipped = zlib.gzipSync(jsonContent);
  const gzipPath = OUTPUT_JSON + '.gz';
  fs.writeFileSync(gzipPath, gzipped);

  const gzipSizeMB = (gzipped.length / 1024 / 1024).toFixed(2);
  console.log(`✅ Gzipped file: ${gzipPath}`);
  console.log(`📦 Compressed size: ${gzipSizeMB} MB\n`);

  // 输出示例数据
  console.log('📄 Sample data:\n');
  const sampleWords = Object.keys(synonymMap).slice(0, 3);
  sampleWords.forEach(word => {
    console.log(`   "${word}": [`);
    synonymMap[word].slice(0, 3).forEach(syn => {
      console.log(`      { word: "${syn.word}", pos: "${syn.pos}", score: ${syn.score} }`);
    });
    if (synonymMap[word].length > 3) {
      console.log(`      ... +${synonymMap[word].length - 3} more`);
    }
    console.log(`   ]\n`);
  });

  console.log('✅ Export completed successfully!\n');
  console.log('📋 Next steps:');
  console.log('   1. Upload synonyms.json.gz to GitHub Release');
  console.log('   2. Update WORDNET_DB_URL in database-manager.js');
  console.log('   3. Modify download/query logic to use JSON\n');

} catch (error) {
  console.error('❌ Export failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
