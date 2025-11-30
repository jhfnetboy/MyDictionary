/**
 * Performance Detector - 硬件性能检测
 * 检测用户设备是否支持运行 SciBERT/语义搜索模型
 *
 * 检测指标:
 * - CPU 核心数
 * - 可用内存
 * - WebGPU 支持
 * - 浏览器性能基准测试
 */

export class PerformanceDetector {
  constructor() {
    this.performanceLevel = null;  // 'high' | 'medium' | 'low'
    this.capabilities = {};
    this.benchmarkResults = null;
  }

  /**
   * 执行完整的性能检测
   */
  async detect() {
    console.log('🔍 Detecting system performance...');
    console.time('Performance Detection');

    // 1. 检测硬件信息
    await this.detectHardware();

    // 2. 运行性能基准测试
    await this.runBenchmark();

    // 3. 综合评估性能等级
    this.evaluatePerformanceLevel();

    console.timeEnd('Performance Detection');
    console.log('📊 Performance Level:', this.performanceLevel);
    console.log('📋 Capabilities:', this.capabilities);

    return {
      level: this.performanceLevel,
      capabilities: this.capabilities,
      benchmark: this.benchmarkResults,
      recommendation: this.getRecommendation()
    };
  }

  /**
   * 检测硬件信息
   */
  async detectHardware() {
    // CPU 核心数
    this.capabilities.cpuCores = navigator.hardwareConcurrency || 2;

    // 内存检测 - 使用多种方法推断
    this.capabilities.memory = await this.detectMemory();

    // WebGPU 支持
    this.capabilities.webgpu = await this.detectWebGPU();

    // WebGL 支持
    this.capabilities.webgl = this.detectWebGL();

    // 用户代理信息
    this.capabilities.platform = navigator.platform;
    this.capabilities.userAgent = navigator.userAgent;

    console.log('💻 Hardware detected:', {
      cpuCores: this.capabilities.cpuCores,
      memory: this.capabilities.memory + ' GB',
      webgpu: this.capabilities.webgpu,
      webgl: this.capabilities.webgl
    });
  }

  /**
   * 精确内存检测
   * 使用 chrome.system.memory API 获取准确的系统内存
   */
  async detectMemory() {
    let totalMemoryGB = 4; // 默认值

    try {
      // 1. 优先使用 chrome.system.memory API (最准确)
      if (chrome && chrome.system && chrome.system.memory) {
        const memInfo = await chrome.system.memory.getInfo();
        // capacity 是总内存，单位是字节
        totalMemoryGB = Math.round(memInfo.capacity / (1024 * 1024 * 1024));
        const availableGB = Math.round(memInfo.availableCapacity / (1024 * 1024 * 1024));

        console.log(`🎯 chrome.system.memory API:`);
        console.log(`   Total: ${totalMemoryGB} GB`);
        console.log(`   Available: ${availableGB} GB`);
        console.log(`   Used: ${totalMemoryGB - availableGB} GB`);

        return totalMemoryGB;
      }
    } catch (error) {
      console.warn('⚠️ chrome.system.memory API 不可用:', error);
    }

    // 2. 回退到 navigator.deviceMemory (不准确，但总比没有强)
    try {
      if (navigator.deviceMemory) {
        totalMemoryGB = navigator.deviceMemory;
        console.log(`📊 navigator.deviceMemory (fallback): ${totalMemoryGB} GB`);
        console.log(`⚠️ 注意: 这个值可能不准确，建议检查扩展权限是否包含 "system.memory"`);
        return totalMemoryGB;
      }
    } catch (error) {
      console.warn('⚠️ navigator.deviceMemory 不可用:', error);
    }

    // 3. 最后的回退 - 使用默认值
    console.warn(`⚠️ 无法检测内存，使用默认值: ${totalMemoryGB} GB`);
    return totalMemoryGB;
  }

  /**
   * 检测 WebGPU 支持
   */
  async detectWebGPU() {
    if (!navigator.gpu) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 检测 WebGL 支持
   * 注意: Service Worker 中无法检测 WebGL (没有 document)
   */
  detectWebGL() {
    try {
      // 检查是否在 Service Worker 环境
      if (typeof document === 'undefined') {
        console.log('⚠️ Service Worker 环境, 无法检测 WebGL');
        // 假设支持 (大多数现代浏览器都支持)
        return true;
      }

      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const supported = gl !== null && gl !== undefined;

      if (supported) {
        // 清理资源
        const loseContext = gl.getExtension('WEBGL_lose_context');
        if (loseContext) {
          loseContext.loseContext();
        }
      }

      return supported;
    } catch (error) {
      console.warn('WebGL 检测失败:', error);
      return false;
    }
  }

  /**
   * 运行性能基准测试
   * 测试 JavaScript 计算速度和内存操作速度
   */
  async runBenchmark() {
    console.log('⏱️ Running performance benchmark...');

    this.benchmarkResults = {
      cpuScore: 0,
      memoryScore: 0,
      totalScore: 0
    };

    // CPU 密集计算测试
    this.benchmarkResults.cpuScore = await this.benchmarkCPU();

    // 内存操作测试
    this.benchmarkResults.memoryScore = await this.benchmarkMemory();

    // 综合得分
    this.benchmarkResults.totalScore =
      (this.benchmarkResults.cpuScore * 0.6 +
       this.benchmarkResults.memoryScore * 0.4);

    console.log('📊 Benchmark results:', this.benchmarkResults);
  }

  /**
   * CPU 计算基准测试
   * 模拟矩阵乘法运算 (类似 ML 推理)
   */
  async benchmarkCPU() {
    const startTime = performance.now();

    // 矩阵乘法: 256x256 矩阵
    const size = 256;
    const matrixA = this.createRandomMatrix(size, size);
    const matrixB = this.createRandomMatrix(size, size);

    const result = this.multiplyMatrices(matrixA, matrixB, size);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 评分: 越快越高分
    // 参考值: 高性能设备 <100ms, 中等设备 100-500ms, 低端设备 >500ms
    let score = 0;
    if (duration < 100) {
      score = 100;
    } else if (duration < 300) {
      score = 80 - (duration - 100) / 10;
    } else if (duration < 500) {
      score = 60 - (duration - 300) / 20;
    } else if (duration < 1000) {
      score = 40 - (duration - 500) / 50;
    } else {
      score = Math.max(0, 30 - (duration - 1000) / 100);
    }

    console.log(`⚡ CPU Benchmark: ${duration.toFixed(0)}ms → Score: ${score.toFixed(1)}`);
    return score;
  }

  /**
   * 内存操作基准测试
   * 测试大数组的创建和遍历速度
   */
  async benchmarkMemory() {
    const startTime = performance.now();

    // 创建大数组 (100万个浮点数)
    const size = 1000000;
    const arr = new Float32Array(size);

    // 填充随机数
    for (let i = 0; i < size; i++) {
      arr[i] = Math.random();
    }

    // 遍历和累加
    let sum = 0;
    for (let i = 0; i < size; i++) {
      sum += arr[i];
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 评分: 越快越高分
    // 参考值: 高性能 <50ms, 中等 50-150ms, 低端 >150ms
    let score = 0;
    if (duration < 50) {
      score = 100;
    } else if (duration < 150) {
      score = 80 - (duration - 50) / 5;
    } else if (duration < 300) {
      score = 60 - (duration - 150) / 15;
    } else {
      score = Math.max(0, 40 - (duration - 300) / 30);
    }

    console.log(`💾 Memory Benchmark: ${duration.toFixed(0)}ms → Score: ${score.toFixed(1)}`);
    return score;
  }

  /**
   * 创建随机矩阵
   */
  createRandomMatrix(rows, cols) {
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = Math.random();
      }
    }
    return matrix;
  }

  /**
   * 矩阵乘法
   */
  multiplyMatrices(a, b, size) {
    const result = [];
    for (let i = 0; i < size; i++) {
      result[i] = [];
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < size; k++) {
          sum += a[i][k] * b[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  /**
   * 综合评估性能等级
   */
  evaluatePerformanceLevel() {
    const { cpuCores, memory, webgpu } = this.capabilities;
    const { totalScore } = this.benchmarkResults;

    let score = 0;

    // CPU 核心数评分 (权重 20%)
    if (cpuCores >= 8) score += 20;
    else if (cpuCores >= 4) score += 15;
    else if (cpuCores >= 2) score += 10;
    else score += 5;

    // 内存评分 (权重 20%)
    if (memory >= 8) score += 20;
    else if (memory >= 4) score += 15;
    else if (memory >= 2) score += 10;
    else score += 5;

    // WebGPU 支持 (权重 10%)
    if (webgpu) score += 10;

    // 基准测试评分 (权重 50%)
    score += totalScore * 0.5;

    // 判定性能等级
    if (score >= 75) {
      this.performanceLevel = 'high';
    } else if (score >= 50) {
      this.performanceLevel = 'medium';
    } else {
      this.performanceLevel = 'low';
    }

    console.log(`📊 Final Score: ${score.toFixed(1)}/100 → Level: ${this.performanceLevel}`);
  }

  /**
   * 获取推荐配置
   */
  getRecommendation() {
    const recommendations = {
      high: {
        canUseSemanticSearch: true,
        suggestedModel: 'SciBERT (Semantic Search)',
        message: '🎉 你的设备性能优秀!可以启用智能语义搜索功能,获得更精准的学术短语推荐。',
        features: [
          '✅ 支持 SciBERT 模型',
          '✅ 语义相似度搜索',
          '✅ 上下文感知推荐',
          '✅ 快速响应 (<500ms)'
        ],
        downloadModelPrompt: true
      },

      medium: {
        canUseSemanticSearch: true,
        suggestedModel: 'MiniLM-L6 (Lightweight Semantic)',
        message: '👍 你的设备性能良好!建议使用轻量级语义搜索 (MiniLM-L6),在性能和智能之间取得平衡。',
        features: [
          '⚠️ SciBERT 可能较慢',
          '✅ 推荐使用 MiniLM-L6',
          '✅ 基础语义搜索',
          '⏱️ 响应时间 ~200ms'
        ],
        downloadModelPrompt: true
      },

      low: {
        canUseSemanticSearch: false,
        suggestedModel: 'IndexedDB (Keyword Search)',
        message: '💡 你的设备性能有限,建议使用快速关键词搜索 (IndexedDB),获得即时响应。',
        features: [
          '❌ 不建议使用语义搜索',
          '✅ IndexedDB 关键词匹配',
          '✅ 极速响应 (<10ms)',
          '💾 低内存占用'
        ],
        downloadModelPrompt: false
      }
    };

    return recommendations[this.performanceLevel];
  }

  /**
   * 保存检测结果到 storage
   */
  async saveResults() {
    const data = {
      performanceLevel: this.performanceLevel,
      capabilities: this.capabilities,
      benchmark: this.benchmarkResults,
      detectedAt: Date.now(),
      version: '1.0.0'
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ performanceDetection: data });
      console.log('💾 Performance results saved to storage');
    }
  }

  /**
   * 从 storage 加载之前的检测结果
   */
  async loadResults() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['performanceDetection']);
      const data = result.performanceDetection;

      if (data && data.version === '1.0.0') {
        // 检查是否超过 7 天
        const age = Date.now() - data.detectedAt;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        if (age < sevenDays) {
          this.performanceLevel = data.performanceLevel;
          this.capabilities = data.capabilities;
          this.benchmarkResults = data.benchmark;

          console.log('📦 Loaded cached performance results');
          return true;
        }
      }
    }

    return false;
  }
}

// 创建单例
export const performanceDetector = new PerformanceDetector();
