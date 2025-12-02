# MyDictionary 去中心化付费方案 - 技术设计文档

## 📋 方案概述

**核心理念**: 不保护代码（前端无法保护），保护**数据访问权**和**时效性**

**关键策略**:
1. 代码 100% 开源，任何人可以查看和使用
2. 付费解锁的是**数据**（学术短语库、TTS 语音包、AI 模型）
3. 通过**时间锁**和**周期更新**让破解成本 >> 订阅价格

---

## 🎯 破解成本分析

### 问题陈述
- **现实**: 前端代码解密后必然暴露（DevTools 可见）
- **现实**: ZK 凭证可复制分享（就是一串字符串）
- **现实**: IPFS 代码可下载（`ipfs get <CID>`）
- **目标**: 让破解成本 > $30，而订阅只需 $9.9/年

### 破解路径与成本

| 破解目标 | 技术难度 | 时间成本 | 工具成本 | 总成本 | 是否值得 |
|---------|---------|---------|---------|--------|---------|
| 代码本身 | ⭐ | 15 分钟 | $0 | $0 | ✅（允许） |
| 当前周数据 | ⭐⭐ | 等待 7 天 | $0 | $0 | ❌（时间成本） |
| 持续获取最新数据 | ⭐⭐⭐⭐ | 26 小时/年 | $0 | **$390/年** | ❌（不经济） |
| TTS 全部声音 | ⭐⭐⭐ | 2 小时 | $5 | **$35** | ❌（接近订阅价） |
| 绕过设备限制 | ⭐⭐⭐⭐ | 每次 30 分钟 | $0 | 累积成本高 | ❌（持续成本） |

**结论**:
- 一次性破解：成本低，但只能用**过期数据**（延迟 4 周）
- 持续破解：成本 **$390/年** >> 订阅 **$9.9/年** ✅
- 大规模分享：被社区举报 → 封禁 ❌

---

## 🏗️ 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────┐
│  MyDictionary 核心引擎 (100% 开源)               │
│  ✅ UI 框架                                      │
│  ✅ 翻译逻辑                                     │
│  ✅ 侧边栏系统                                   │
│  ✅ 本地存储                                     │
│  📦 GitHub: github.com/jhfnetboy/MyDictionary   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  数据服务层 (付费解锁，去中心化存储)             │
│  📦 学术短语库 (每周更新 - IPFS + 时间锁加密)   │
│  📦 专业术语库 (医学/法律/金融 - 独立加密包)    │
│  📦 TTS 语音包 (54种声音 - 分片加密存储)        │
│  📦 AI 模型权重 (BGE-Large - 周期性密钥)        │
│  🔗 IPFS: 去中心化存储                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  订阅验证层 (区块链 + 时间锁)                   │
│  🪙 NFT/SBT 授权凭证 (ERC-721)                  │
│  ⏰ 每周更新解密密钥 (drand 时间锁)              │
│  🔒 设备绑定 (最多 3 台)                        │
│  📊 使用量统计 (防滥用)                          │
│  ⛓️ Polygon: 低 Gas 费区块链                    │
└─────────────────────────────────────────────────┘
```

---

## 💾 数据分片设计

### 1. 学术短语库（Academic Phrasebank）

#### 数据结构
```json
{
  "metadata": {
    "totalPhrases": 2500,
    "weeksPerMonth": 4,
    "phrasesPerWeek": 625
  },
  "weeks": {
    "2024-W49": {
      "ipfsCID": "QmXxYyZz...encrypted",
      "unlockTime": "2024-12-01T00:00:00Z",
      "drandRound": 4234567,
      "phrasesCount": 625,
      "categories": ["introduction", "methodology", "results"]
    },
    "2024-W50": {
      "ipfsCID": "QmAaBbCc...encrypted",
      "unlockTime": "2024-12-08T00:00:00Z",
      "drandRound": 4235789,
      "phrasesCount": 625,
      "categories": ["discussion", "conclusion"]
    }
  },
  "free": {
    "ipfsCID": "QmFreeDt...public",
    "description": "4 周前的数据（公开）",
    "phrasesCount": 2500,
    "lastUpdated": "2024-11-01"
  }
}
```

#### 分片策略
1. **按周分割**: 每周 625 条短语（总计 2500 条 / 4 周）
2. **时间锁加密**: 使用 drand 时间戳派生的密钥加密
3. **自动解锁**: 每周日 00:00 UTC 自动解锁新一周数据
4. **免费延迟**: 免费用户获取 4 周前的公开数据

#### 加密流程
```javascript
// 每周日自动执行
async function publishWeeklyData() {
  const weekNumber = getCurrentWeekNumber();
  const phrases = await generateWeeklyPhrases(weekNumber);

  // 1. 计算下周日的 drand round
  const nextSunday = getNextSunday();
  const drandRound = await getDrandRoundAt(nextSunday);

  // 2. 从 drand round 派生加密密钥
  const encryptionKey = kdf(drandRound, 'academic-phrases');

  // 3. AES-256-GCM 加密
  const encrypted = await AES_GCM.encrypt(
    JSON.stringify(phrases),
    encryptionKey
  );

  // 4. 上传到 IPFS
  const cid = await ipfs.add(encrypted);

  // 5. 更新智能合约
  await contract.publishWeeklyData(weekNumber, cid, drandRound);

  console.log(`✅ Week ${weekNumber} published: ${cid}`);
}
```

---

### 2. TTS 语音包（Text-to-Speech Voices）

#### 数据结构
```json
{
  "voices": {
    "bm_george": {
      "name": "George (British Male)",
      "quality": "premium",
      "sampleRate": 22050,
      "embedding": {
        "ipfsCID": "QmVoice1...encrypted",
        "size": "256 MB",
        "encryption": "AES-256-GCM",
        "subscriber_only": true
      },
      "preview": {
        "ipfsCID": "QmPreview1...public",
        "size": "5 MB",
        "duration": "30 seconds",
        "public": true
      }
    },
    "bm_daniel": { /* 同上 */ },
    // ... 52 more voices
  },
  "free_voices": ["af_alloy", "af_nova", "am_echo", "am_onyx", "bm_lewis"]
}
```

#### 分发策略
1. **免费版**: 5 种基础声音 + 每种 30 秒试听
2. **付费版**: 解锁全部 54 种声音（13.8 GB）
3. **按需下载**: 用户选择声音后才下载对应语音包
4. **缓存机制**: 本地 IndexedDB 缓存已下载的声音

#### 破解难度分析
- 单个语音包 256 MB
- 破解者需要：
  1. 找到所有 54 个 IPFS CID（分散存储）
  2. 逐个解密（需要订阅者密钥）
  3. 下载总计 **13.8 GB** 数据
  4. 存储和管理这些文件

**成本**: 时间 (2 小时) + 带宽 ($5) + 存储 ($5) ≈ **$20-30**

---

### 3. AI 模型权重（BGE Embeddings）

#### 版本管理
```json
{
  "models": {
    "2024-12": {
      "name": "BGE-Base v1.2",
      "ipfsCID": "QmModel12...encrypted",
      "size": "400 MB",
      "improvements": "准确度 +10% vs v1.0",
      "subscriber_only": true
    },
    "2025-01": {
      "name": "BGE-Base v1.3",
      "ipfsCID": "QmModel13...encrypted",
      "size": "400 MB",
      "improvements": "准确度 +15%, 速度 +20%",
      "subscriber_only": true
    }
  },
  "free_model": {
    "name": "BGE-Base v1.0",
    "ipfsCID": "QmModelFree...public",
    "size": "400 MB",
    "note": "基础版本，不再更新"
  }
}
```

#### 差异化策略
- **免费版**: 基础模型（v1.0），不再更新
- **付费版**:
  - 持续优化（每月发布新版本）
  - 准确度提升（+15%）
  - 性能优化（+20% 速度）
  - 新增功能（多语言、专业领域）

---

## 🔐 加密技术选型

### 1. 时间锁加密（Time-lock Encryption）

#### 技术方案: drand + tlock
```
drand 网络: 去中心化随机数信标
  ↓
每 30 秒生成一个随机数（round）
  ↓
预测未来时间的 round 号
  ↓
使用该 round 派生加密密钥
  ↓
时间到达后，任何人可计算解密密钥
```

#### 实现代码
```javascript
import { timelockEncrypt, timelockDecrypt } from 'tlock-js';

// 加密（发布时）
async function encryptForFutureUnlock(data, unlockDate) {
  const drandRound = await getDrandRoundAt(unlockDate);
  const encrypted = await timelockEncrypt(
    drandRound,
    Buffer.from(data)
  );
  return encrypted.toString('base64');
}

// 解密（到期后）
async function decryptAfterUnlock(encryptedData) {
  const currentRound = await getCurrentDrandRound();
  const decrypted = await timelockDecrypt(
    currentRound,
    Buffer.from(encryptedData, 'base64')
  );
  return decrypted.toString('utf8');
}
```

#### 优势
- ✅ 完全去中心化（drand League of Entropy）
- ✅ 无需中心化服务器
- ✅ 时间到达自动解锁
- ✅ 密钥不可提前计算

#### 限制
- ⚠️ 解锁后数据仍可被复制（这是预期的，免费版就是这样）
- ⚠️ 需要网络连接获取 drand 随机数

---

### 2. 对称加密（AES-256-GCM）

#### 用于即时解密的数据

```javascript
import crypto from 'crypto';

// 加密
function encryptData(plaintext, password) {
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted.toString('base64'),
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

// 解密
function decryptData(encryptedData, password) {
  const salt = Buffer.from(encryptedData.salt, 'base64');
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}
```

#### 密钥派生策略
```javascript
// 从 NFT Token ID 派生密钥
function deriveKeyFromNFT(tokenId, salt) {
  return crypto.pbkdf2Sync(
    tokenId.toString(),
    salt,
    100000,  // 迭代次数
    32,      // 密钥长度
    'sha256'
  );
}

// 从钱包地址派生密钥
function deriveKeyFromWallet(walletAddress, nonce) {
  const data = walletAddress.toLowerCase() + nonce.toString();
  return crypto.createHash('sha256').update(data).digest();
}
```

---

## 🆔 Premium 指纹登录系统（去中心化社区验证）

### 核心 Idea ⭐⭐⭐⭐⭐
**概念**: 用户使用设备指纹 + 钱包签名作为"去中心化登录凭证"，社区节点验证付费状态

**工作流程**:
```
用户打开插件
    ↓
生成设备指纹 (Canvas + WebGL + Audio)
    ↓
钱包签名指纹 (证明设备所有权)
    ↓
发送到去中心化验证网络
    ↓
社区节点验证:
  1. 检查链上订阅状态
  2. 验证签名有效性
  3. 检查设备是否在白名单
    ↓
返回验证结果 + 解密密钥
    ↓
本地缓存凭证 (24 小时有效)
```

### 为什么这个方案更好？

#### 对比传统方案
| 方面 | 传统钱包登录 | 指纹登录（去中心化社区） |
|------|-------------|------------------------|
| 用户体验 | 每次都要签名 ❌ | 一次验证，24 小时免登 ✅ |
| 隐私保护 | 钱包地址公开 ⚠️ | 匿名指纹，隐私友好 ✅ |
| 防设备共享 | 无法防止 ❌ | 指纹绑定设备 ✅ |
| 去中心化程度 | 依赖区块链 RPC | 社区节点验证 ✅ |
| 破解难度 | 复制签名即可 ❌ | 需伪造指纹 + 签名 ✅ |

#### 去中心化社区验证的优势
1. **无需中心化服务器**: 验证节点由社区运行
2. **抗审查**: 多节点分布式验证
3. **隐私保护**: 指纹哈希，不泄露真实信息
4. **激励机制**: 运行验证节点获得收益分成

---

## 📱 设备指纹技术（增强版）

### 目的
- 唯一标识设备（作为"登录凭证"）
- 防止一个订阅在多台设备共享
- 限制：每个订阅最多绑定 **3 台设备**
- 替代传统"用户名+密码"登录

### 实现方案（指纹登录）

```javascript
// src/security/device-fingerprint.js

export async function generateDeviceFingerprint() {
  const components = {
    // Canvas 指纹
    canvas: await getCanvasFingerprint(),

    // WebGL 指纹
    webgl: await getWebGLFingerprint(),

    // Audio 指纹
    audio: await getAudioFingerprint(),

    // 硬件信息
    hardware: {
      cores: navigator.hardwareConcurrency,
      memory: navigator.deviceMemory,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`
    },

    // 软件信息
    software: {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },

    // 浏览器特性
    features: {
      cookies: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      plugins: getPluginsList()
    }
  };

  // 组合所有特征并哈希
  const fingerprintString = JSON.stringify(components);
  const hash = await sha256(fingerprintString);

  return hash;
}

// Canvas 指纹
async function getCanvasFingerprint() {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 50;
  const ctx = canvas.getContext('2d');

  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillStyle = '#f60';
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = '#069';
  ctx.fillText('MyDictionary', 2, 15);

  return canvas.toDataURL();
}

// WebGL 指纹
async function getWebGLFingerprint() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

  if (!gl) return 'webgl-not-supported';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
  };
}

// Audio 指纹
async function getAudioFingerprint() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const analyser = audioContext.createAnalyser();
  const gainNode = audioContext.createGain();
  const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

  gainNode.gain.value = 0; // 静音
  oscillator.connect(analyser);
  analyser.connect(scriptProcessor);
  scriptProcessor.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start(0);

  return new Promise(resolve => {
    scriptProcessor.onaudioprocess = function(event) {
      const output = event.outputBuffer.getChannelData(0);
      const hash = simpleHash(output);
      oscillator.stop();
      scriptProcessor.disconnect();
      resolve(hash);
    };
  });
}

// SHA-256 哈希
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
```

### 智能合约集成

```solidity
// SubscriptionNFT.sol

contract SubscriptionNFT is ERC721 {
    // 每个订阅绑定的设备列表
    mapping(uint256 => string[]) private boundDevices;

    // 最大设备数量
    uint256 public constant MAX_DEVICES = 3;

    // 注册设备
    function registerDevice(uint256 tokenId, string memory deviceFingerprint) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(boundDevices[tokenId].length < MAX_DEVICES, "Device limit reached");

        // 检查是否已注册
        for (uint i = 0; i < boundDevices[tokenId].length; i++) {
            if (keccak256(bytes(boundDevices[tokenId][i])) == keccak256(bytes(deviceFingerprint))) {
                return; // 已注册，直接返回
            }
        }

        // 添加新设备
        boundDevices[tokenId].push(deviceFingerprint);
        emit DeviceRegistered(tokenId, deviceFingerprint);
    }

    // 解绑设备
    function unbindDevice(uint256 tokenId, string memory deviceFingerprint) public {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");

        // 查找并移除
        for (uint i = 0; i < boundDevices[tokenId].length; i++) {
            if (keccak256(bytes(boundDevices[tokenId][i])) == keccak256(bytes(deviceFingerprint))) {
                boundDevices[tokenId][i] = boundDevices[tokenId][boundDevices[tokenId].length - 1];
                boundDevices[tokenId].pop();
                emit DeviceUnbound(tokenId, deviceFingerprint);
                return;
            }
        }
    }

    // 验证设备
    function isDeviceBound(uint256 tokenId, string memory deviceFingerprint) public view returns (bool) {
        for (uint i = 0; i < boundDevices[tokenId].length; i++) {
            if (keccak256(bytes(boundDevices[tokenId][i])) == keccak256(bytes(deviceFingerprint))) {
                return true;
            }
        }
        return false;
    }
}
```

---

## 🛡️ 防滥用机制

### 1. 使用频率限制（Rate Limiting）

```javascript
// src/security/rate-limiter.js

class RateLimiter {
  constructor() {
    this.limits = {
      // 免费用户限制
      free: {
        translate: { max: 100, window: 3600000 },      // 100 次/小时
        tts: { max: 50, window: 3600000 },             // 50 次/小时
        search: { max: 20, window: 3600000 }           // 20 次/小时
      },
      // 付费用户限制（更宽松）
      premium: {
        translate: { max: 10000, window: 3600000 },    // 10000 次/小时
        tts: { max: 1000, window: 3600000 },           // 1000 次/小时
        search: { max: 500, window: 3600000 }          // 500 次/小时
      }
    };
  }

  async checkLimit(userFingerprint, action, isPremium = false) {
    const tier = isPremium ? 'premium' : 'free';
    const limit = this.limits[tier][action];

    const key = `ratelimit:${userFingerprint}:${action}`;
    const count = await storage.get(key) || 0;

    if (count >= limit.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + limit.window,
        message: isPremium ?
          '使用频率过高，请稍后再试' :
          '已达到免费额度上限，升级到 Pro 版解除限制'
      };
    }

    await storage.set(key, count + 1, { ttl: limit.window });

    return {
      allowed: true,
      remaining: limit.max - count - 1,
      resetTime: Date.now() + limit.window
    };
  }
}
```

### 2. 异常行为检测

```javascript
// src/security/anomaly-detector.js

class AnomalyDetector {
  async detectAbuse(userFingerprint, action) {
    // 获取最近 1 小时的访问模式
    const pattern = await this.analyzeAccessPattern(userFingerprint);

    const flags = [];

    // 检测 1: 请求频率过高
    if (pattern.requestsPerMinute > 10) {
      flags.push({
        type: 'high_frequency',
        severity: 'medium',
        message: '疑似脚本自动化访问'
      });
    }

    // 检测 2: 短时间多设备访问
    if (pattern.uniqueDevices > 5 && pattern.timeSpan < 3600000) {
      flags.push({
        type: 'multi_device',
        severity: 'high',
        message: '疑似账号共享'
      });
    }

    // 检测 3: 异常时间段访问
    const hour = new Date().getHours();
    if ((hour >= 2 && hour <= 5) && pattern.requestsInPeriod > 100) {
      flags.push({
        type: 'unusual_hours',
        severity: 'low',
        message: '凌晨异常活跃'
      });
    }

    // 检测 4: 数据下载量异常
    if (pattern.dataDownloaded > 1000000000) { // 1 GB
      flags.push({
        type: 'excessive_download',
        severity: 'high',
        message: '下载量异常（>1GB）'
      });
    }

    // 高严重度自动处理
    if (flags.some(f => f.severity === 'high')) {
      await this.flagForReview(userFingerprint, flags);
    }

    return flags;
  }

  async flagForReview(userFingerprint, flags) {
    // 记录到智能合约
    await contract.reportSuspiciousActivity(userFingerprint, JSON.stringify(flags));

    // 临时限制（24 小时）
    await storage.set(`abuse:${userFingerprint}`, true, { ttl: 86400000 });
  }
}
```

### 3. 社区举报机制

```solidity
// SubscriptionNFT.sol

contract SubscriptionNFT is ERC721 {
    // 举报记录
    struct AbuseReport {
        address reporter;
        address reported;
        string evidence;
        uint256 timestamp;
        bool reviewed;
    }

    mapping(uint256 => AbuseReport) public reports;
    mapping(address => uint256) public reportCount;
    uint256 public nextReportId;

    event AbuseReported(uint256 reportId, address reporter, address reported);
    event SubscriptionRevoked(address user, string reason);

    // 举报滥用
    function reportAbuse(address abuser, string memory evidence) public {
        // 举报者必须是订阅用户
        require(balanceOf(msg.sender) > 0, "Must be subscriber to report");

        // 创建举报记录
        uint256 reportId = nextReportId++;
        reports[reportId] = AbuseReport({
            reporter: msg.sender,
            reported: abuser,
            evidence: evidence,
            timestamp: block.timestamp,
            reviewed: false
        });

        reportCount[abuser]++;

        emit AbuseReported(reportId, msg.sender, abuser);

        // 3 次举报自动封禁
        if (reportCount[abuser] >= 3) {
            _revokeSubscription(abuser, "Multiple abuse reports");
        }
    }

    // 撤销订阅
    function _revokeSubscription(address user, string memory reason) internal {
        uint256 tokenId = tokenOfOwnerByIndex(user, 0);
        _burn(tokenId);

        emit SubscriptionRevoked(user, reason);
    }
}
```

---

## 💰 定价策略

### 版本对比

| 功能 | 免费版 | 个人版 ($9.9/年) | 团队版 ($49/年) | 专业版 ($99/年) |
|------|--------|------------------|-----------------|-----------------|
| 基础翻译 | ✅ | ✅ | ✅ | ✅ |
| TTS 声音数量 | 5 种 | 54 种 | 54 种 | 54 种 |
| 学术短语库 | 延迟 4 周 | ✅ 实时更新 | ✅ 实时更新 | ✅ 实时更新 |
| 语义搜索 | ❌ | ✅ BGE-Base | ✅ BGE-Base | ✅ BGE-Large |
| AI 模型版本 | v1.0 (旧) | v1.3 (最新) | v1.3 (最新) | v1.4 (定制) |
| 设备数量 | 1 台 | 3 台 | 10 台 | 无限 |
| 使用限制 | 100 次/小时 | 10000 次/小时 | 无限 | 无限 |
| 数据延迟 | 4 周 | 实时 | 实时 | 实时 |
| API 访问 | ❌ | ❌ | ❌ | ✅ |
| 技术支持 | 社区 | 邮件 | 优先邮件 | 1v1 视频 |
| 定制术语库 | ❌ | ❌ | ✅ | ✅ |

### 破解成本 vs 订阅价格

```
破解成本（持续获取最新数据）:
  - 每周破解一次 × 52 周 = 52 次/年
  - 每次 30 分钟 = 26 小时/年
  - 时薪 $15 = $390/年

订阅价格:
  - 个人版: $9.9/年 (破解成本的 2.5%)
  - 团队版: $49/年 (5 人共享 = $9.8/人/年)
  - 专业版: $99/年 (API 访问 + 定制)

结论: 破解完全不经济 ✅
```

---

## 📊 收益预测

### 用户分布假设
- 总用户: 10,000
- 免费用户: 9,500 (95%)
- 个人订阅: 400 (4%)
- 团队订阅: 15 团队 × 5 人 = 75 (0.75%)
- 专业订阅: 5 (0.05%)

### 年收入计算
```
个人版: 400 用户 × $9.9 = $3,960
团队版: 15 团队 × $49 = $735
专业版: 5 用户 × $99 = $495

总收入: $5,190/年
```

### 成本估算
```
开发成本:
  - 初期开发: 6-8 周 × $50/小时 = $12,000 - $16,000 (一次性)
  - 智能合约审计: $2,000 (一次性)

运营成本（每年）:
  - 维护开发: 4 小时/周 × 52 周 × $50 = $10,400
  - IPFS 存储: $0 (使用 Pinata 免费额度 1GB)
  - 区块链 Gas 费: $100 (Polygon 很便宜)
  - 域名服务器: $50

总成本: $10,550/年
```

### ROI 分析
```
年收入: $5,190
年成本: $10,550
年利润: -$5,360 (首年)

盈亏平衡点: 需要约 1,070 个付费用户
实际转化率: 4% (可行)

第二年（无初期开发成本）:
年收入: $5,190
年成本: $10,550
年利润: -$5,360

备注: 这是 Part-time 项目，主要价值在于技术探索和社区建设
```

---

## 🗺️ 实施路线图

### Phase 1: 基础设施（4 周）

**Week 1-2: 智能合约开发**
- [ ] SubscriptionNFT.sol (ERC-721 订阅 NFT)
- [ ] DataAccessControl.sol (数据访问控制)
- [ ] 单元测试（Hardhat + Chai）
- [ ] 部署到 Polygon Mumbai 测试网

**Week 3: 数据准备**
- [ ] 学术短语库分片脚本
- [ ] TTS 语音包加密上传
- [ ] IPFS 节点配置（Pinata）
- [ ] 时间锁加密工具开发

**Week 4: 前端集成**
- [ ] 钱包连接（MetaMask）
- [ ] 订阅状态验证
- [ ] 数据解密和加载
- [ ] 设备指纹生成

### Phase 2: 用户体验（2 周）

**Week 5: 购买流程**
- [ ] 订阅页面 UI
- [ ] 支付流程（ETH / USDC）
- [ ] NFT 铸造和展示
- [ ] 交易状态追踪

**Week 6: 功能集成**
- [ ] 学术短语库动态加载
- [ ] TTS 语音包按需下载
- [ ] 语义搜索模型切换
- [ ] 免费版限制提示

### Phase 3: 防护和监控（2 周）

**Week 7: 防滥用**
- [ ] 使用频率限制
- [ ] 异常行为检测
- [ ] 设备绑定验证
- [ ] 社区举报功能

**Week 8: 自动化**
- [ ] 每周数据发布脚本
- [ ] 免费版数据更新
- [ ] 监控告警系统
- [ ] 使用统计报表

### Phase 4: 测试和发布（2 周）

**Week 9: 内测**
- [ ] 邀请 50 位种子用户
- [ ] 收集反馈和 Bug 报告
- [ ] 性能优化
- [ ] 文档完善

**Week 10: 公开发布**
- [ ] 智能合约审计
- [ ] 部署到 Polygon 主网
- [ ] 官网和文档上线
- [ ] 营销推广（Twitter / Reddit）

---

## 🔬 技术风险评估

### 高风险

1. **智能合约漏洞**
   - 风险: 资金被盗、权限绕过
   - 缓解: 专业审计 + 开源代码 + Bug Bounty

2. **IPFS 内容丢失**
   - 风险: 数据 CID 无法访问
   - 缓解: 多节点 Pin + 定期检查 + 备份到 Arweave

3. **时间锁失效**
   - 风险: drand 网络宕机
   - 缓解: 降级到 AES 加密 + 手动密钥分发

### 中风险

4. **设备指纹伪造**
   - 风险: 绕过设备限制
   - 缓解: 多维度指纹 + 行为检测 + 社区举报

5. **Gas 费暴涨**
   - 风险: Polygon Gas 费突然升高
   - 缓解: 迁移到 Arbitrum / Base + Layer 3

6. **用户体验复杂**
   - 风险: 钱包连接吓跑用户
   - 缓解: 详细教程 + 一键购买 + 客服支持

### 低风险

7. **数据过期策略**
   - 风险: 用户不愿意用 4 周前数据
   - 缓解: 价值提升（付费版准确度 +15%）

8. **竞争对手**
   - 风险: 被复制商业模式
   - 缓解: 技术领先 + 社区黏性 + 持续创新

---

## 📚 技术栈清单

### 区块链
- **Solidity** (0.8.20): 智能合约开发
- **Hardhat**: 开发框架和测试
- **Ethers.js** (v6): 前端区块链交互
- **OpenZeppelin**: 标准合约库（ERC-721）
- **Polygon**: L2 网络（低 Gas 费）

### 去中心化存储
- **IPFS**: 数据存储
- **Pinata**: IPFS Pin 服务
- **drand**: 时间锁随机数源
- **tlock-js**: 时间锁加密库

### 加密
- **crypto (Node.js)**: AES-256-GCM 加密
- **@noble/hashes**: SHA-256 哈希
- **pbkdf2**: 密钥派生函数

### 前端
- **React** (可选，或继续用 Vanilla JS)
- **ethers.js**: 钱包连接
- **fingerprintjs**: 设备指纹库

### 后端（自动化脚本）
- **Node.js**: 数据发布脚本
- **node-cron**: 定时任务
- **axios**: HTTP 请求

---

## 🎯 成功指标（KPI）

### 产品指标
- 付费转化率: **4%** (目标)
- 月活跃用户: **5,000** (6 个月后)
- 用户留存率: **80%** (订阅续费率)
- NPS 评分: **> 50**

### 技术指标
- 数据可用性: **99.9%**
- 平均响应时间: **< 500ms**
- 破解成本: **> $300/年**
- Gas 费用: **< $0.5/交易**

### 社区指标
- GitHub Stars: **> 1,000**
- Discord 成员: **> 500**
- 举报处理时间: **< 24 小时**
- Bug 修复时间: **< 48 小时**

---

## 📝 总结

### 核心优势
1. ✅ **技术创新**: 时间锁 + 数据分片，前端付费新范式
2. ✅ **经济有效**: 破解成本 $390 >> 订阅 $9.9
3. ✅ **完全去中心化**: 无需中心化服务器
4. ✅ **用户友好**: 免费版功能完整，只是数据延迟
5. ✅ **可持续**: 持续更新产生网络效应

### 核心挑战
1. ⚠️ **技术复杂度**: 区块链 + 加密 + IPFS
2. ⚠️ **用户教育**: 钱包连接门槛
3. ⚠️ **首年亏损**: ROI 需 2-3 年
4. ⚠️ **维护成本**: 每周数据发布

### 最终建议
**采用此方案的前提**:
- 这是一个技术探索项目（而非纯商业项目）
- 愿意投入时间建设社区
- 相信 Web3 + 开源的长期价值

**替代方案**:
- 如果纯粹为了收入，考虑 Freemium + GitHub Sponsors
- 如果不想处理区块链复杂度，采用传统 SaaS 订阅

---

## 🔄 与指纹登录的集成

详见: [去中心化指纹登录网络](./decentralized-login-network.md)

### 用户旅程整合

```
用户购买订阅 (支付 $9.9/年)
    ↓
铸造订阅 NFT (链上凭证)
    ↓
首次设备绑定 (指纹 + 钱包签名)
    ↓
去中心化网络验证 → 返回解密密钥
    ↓
本地解密数据:
  - 学术短语库 (最新周数据)
  - TTS 语音包 (54 种声音)
  - AI 模型 (BGE-Large v1.3)
    ↓
24 小时凭证缓存 (无感使用)
```

### 解密密钥分发

**问题**: 如何确保只有付费用户能解密 IPFS 数据?

**方案**: 分层密钥系统

```javascript
// 1. 每周数据用 drand 时间锁加密 (任何人到期后可解密)
const weeklyKey = await timelockDecrypt(currentDrandRound);

// 2. 订阅用户可提前解密 (通过验证网络获取提前解密密钥)
const premiumKey = await getKeyFromValidatorNetwork(fingerprintHash);

// 3. 分层解密
const latestData = await decryptWithPremiumKey(ipfsCID, premiumKey);
const oldData = await decryptWithTimelockKey(ipfsCID_4WeeksAgo, weeklyKey);
```

**验证节点如何管理密钥?**

```javascript
// background.js - Validator Node

// 每周从智能合约同步最新解密密钥
async function syncWeeklyKeys() {
  const currentWeek = getCurrentWeekNumber();
  const keyEvent = await contract.queryFilter(
    contract.filters.WeeklyKeyPublished(currentWeek)
  );

  const weeklyKey = keyEvent[0].args.decryptionKey;

  // 存储到本地数据库
  await db.storeKey(currentWeek, weeklyKey, {
    publishTime: Date.now(),
    accessLevel: 'premium'
  });
}

// 验证用户时返回对应密钥
async function handleVerificationRequest(req, res) {
  // ... 验证订阅状态 ...

  const currentWeek = getCurrentWeekNumber();
  const weeklyKey = await db.getKey(currentWeek, 'premium');

  return res.json({
    valid: true,
    decryptionKeys: {
      academicPhrases: weeklyKey,
      ttsVoices: subscription.keys.ttsVoices,
      aiModel: subscription.keys.aiModel
    }
  });
}
```

### 时间锁 + 订阅混合加密

**免费版流程** (4 周后自动解锁):
```
Week 1 发布: drand Round 4234567 加密
    ↓
Week 5 到来: drand Round 4235789 可解密
    ↓
免费用户下载 IPFS CID → 使用 drand 解密 → 获得 Week 1 数据
```

**付费版流程** (实时解锁):
```
Week 1 发布: drand Round 4234567 加密
    ↓
验证网络存储 "提前解密密钥"
    ↓
付费用户验证身份 → 获取提前密钥 → 即时解密 Week 1 数据
```

**智能合约实现**:
```solidity
contract DataAccessControl {
    // 每周发布提前解密密钥 (仅订阅用户可用)
    mapping(uint256 => bytes32) public weeklyPremiumKeys;

    // 每周发布 drand round (所有人可见,4 周后解密)
    mapping(uint256 => uint256) public weeklyTimelockRounds;

    // 发布新一周数据
    function publishWeeklyData(
        uint256 weekNumber,
        string memory ipfsCID,
        bytes32 premiumKey,
        uint256 timelockRound
    ) public onlyOwner {
        weeklyPremiumKeys[weekNumber] = premiumKey;
        weeklyTimelockRounds[weekNumber] = timelockRound;

        emit WeeklyDataPublished(weekNumber, ipfsCID);
        emit WeeklyKeyPublished(weekNumber, premiumKey);
    }

    // 验证节点查询密钥
    function getPremiumKey(uint256 weekNumber) public view returns (bytes32) {
        return weeklyPremiumKeys[weekNumber];
    }
}
```

---

**文档版本**: v1.1
**最后更新**: 2025-12-01
**作者**: Claude + Jason
**许可**: MIT License
