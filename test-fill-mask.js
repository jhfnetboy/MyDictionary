/**
 * 测试 fill-mask 模型的输出格式
 * 运行: node test-fill-mask.js
 */

import { pipeline } from '@xenova/transformers';

async function testFillMask() {
  console.log('📦 加载 fill-mask 模型...');

  const fillMask = await pipeline('fill-mask', 'Xenova/distilbert-base-uncased');

  console.log('✅ 模型加载完成\n');

  // 测试用例
  const testCases = [
    'The professionals is important.',
    'Time [MASK] everything.',
    'We need to [MASK] this issue.',
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 测试句子: "${testCase}"`);
    console.log(`${'='.repeat(60)}`);

    const results = await fillMask(testCase, { top_k: 10 });

    console.log(`\n📊 返回结果数量: ${results.length}`);
    console.log(`📊 结果类型: ${typeof results}`);
    console.log(`📊 是否为数组: ${Array.isArray(results)}`);

    if (results.length > 0) {
      console.log(`\n📊 第一个结果的结构:`);
      console.log(JSON.stringify(results[0], null, 2));

      console.log(`\n📊 所有结果:`);
      results.forEach((r, i) => {
        console.log(`  [${i}] token_str: "${r.token_str}" | score: ${r.score.toFixed(4)} | token: ${r.token}`);
        console.log(`      - 类型: ${typeof r.token_str}`);
        console.log(`      - 长度: ${r.token_str.length}`);
        console.log(`      - trim后: "${r.token_str.trim()}"`);
        console.log(`      - trim后长度: ${r.token_str.trim().length}`);
        console.log(`      - 字符码: [${[...r.token_str].map(c => c.charCodeAt(0)).join(', ')}]`);
      });
    }
  }
}

testFillMask().catch(console.error);
