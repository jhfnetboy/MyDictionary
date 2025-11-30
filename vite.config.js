import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.js'),
        content: resolve(__dirname, 'content.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      // 抑制第三方库的 eval 警告
      onwarn(warning, warn) {
        // 忽略 onnxruntime-web 的 eval 警告（官方库的正常行为）
        if (warning.code === 'EVAL' && warning.id?.includes('onnxruntime-web')) {
          return;
        }
        warn(warning);
      },
    },
    // 针对 Chrome 扩展优化
    minify: false, // 不压缩,保持代码可读性便于调试
    target: 'esnext',
    modulePreload: false,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        // 复制 manifest.json
        {
          src: 'manifest.json',
          dest: '.',
        },
        // 复制 UI 相关文件
        {
          src: 'src/ui/*',
          dest: 'src/ui',
        },
        // 复制配置文件
        {
          src: 'src/config/*',
          dest: 'src/config',
        },
        // 复制图标
        {
          src: 'assets/icons/*',
          dest: 'assets/icons',
        },
        // 复制 logo
        {
          src: 'assets/logo-64.png',
          dest: 'assets',
        },
        // 复制同义词数据文件
        {
          src: 'public/synonyms.json.gz',
          dest: '.',
        },
        // 关键:复制 Transformers.js 的 ONNX/WASM 运行时文件
        {
          src: 'node_modules/@xenova/transformers/dist/*.wasm',
          dest: 'transformers',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
