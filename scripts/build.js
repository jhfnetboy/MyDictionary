#!/usr/bin/env node

/**
 * MyDictionary Build Script
 * 将源文件打包到 dist/ 目录用于发布
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// 清空 dist 目录
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true });
}
fs.mkdirSync(distDir);

console.log('🦝 MyDictionary - 开始构建...\n');

// 需要复制的文件和目录
const filesToCopy = [
  { src: 'manifest.json', dest: 'manifest.json' },
  { src: 'background.js', dest: 'background.js' },
  { src: 'content.js', dest: 'content.js' },
  { src: 'src', dest: 'src' },
  { src: 'assets', dest: 'assets' },
  { src: 'node_modules/@xenova/transformers', dest: 'node_modules/@xenova/transformers' },
];

// 递归复制目录
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制文件
function copyFile(src, dest) {
  const srcPath = path.join(rootDir, src);
  const destPath = path.join(distDir, dest);
  const destDir = path.dirname(destPath);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(srcPath, destPath);
}

// 执行复制
for (const item of filesToCopy) {
  const srcPath = path.join(rootDir, item.src);
  const destPath = path.join(distDir, item.dest);

  if (!fs.existsSync(srcPath)) {
    console.warn(`⚠️  跳过不存在的文件: ${item.src}`);
    continue;
  }

  const stat = fs.statSync(srcPath);

  if (stat.isDirectory()) {
    console.log(`📁 复制目录: ${item.src} → dist/${item.dest}`);
    copyDir(srcPath, destPath);
  } else {
    console.log(`📄 复制文件: ${item.src} → dist/${item.dest}`);
    copyFile(item.src, item.dest);
  }
}

// 创建 README
const distReadme = `# MyDictionary - 发布版本

这是 MyDictionary 的构建版本,可以直接加载到 Chrome 浏览器。

## 安装方法

1. 打开 Chrome 浏览器
2. 访问 \`chrome://extensions/\`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择此 \`dist\` 目录

## 版本信息

- 版本: 0.1.0
- 构建时间: ${new Date().toISOString()}
- 默认模型: Helsinki-NLP/opus-mt-en-zh (300MB, 首次使用时自动下载)

## 注意事项

- 首次翻译时会自动下载模型 (~300MB)
- 需要稳定的网络连接访问 Hugging Face
- 模型会缓存在浏览器中,只需下载一次

## 更多信息

查看项目主页: https://github.com/yourusername/MyDictionary
`;

fs.writeFileSync(path.join(distDir, 'README.md'), distReadme);
console.log('📄 创建文件: README.md → dist/README.md');

// 创建 package.json (简化版)
const packageJson = {
  name: "mydictionary-dist",
  version: "0.1.0",
  description: "MyDictionary - Chrome Extension Distribution",
  private: true
};

fs.writeFileSync(
  path.join(distDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);
console.log('📄 创建文件: package.json → dist/package.json');

console.log('\n✅ 构建完成!');
console.log(`📦 输出目录: ${distDir}`);

// 统计文件大小
function getDirSize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  }

  return size;
}

const totalSize = getDirSize(distDir);
const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

console.log(`📊 总大小: ${sizeMB} MB`);
console.log('\n🚀 可以加载到 Chrome 了!');
