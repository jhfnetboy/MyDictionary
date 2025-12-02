# 去中心化指纹登录网络 - 详细设计

## 🎯 核心创新：Premium 指纹登录

### 问题背景
传统 Web3 登录的痛点：
1. **用户体验差**: 每次操作都要 MetaMask 签名
2. **隐私泄露**: 钱包地址完全公开
3. **无法防共享**: 签名可复制到其他设备
4. **中心化依赖**: 需要 RPC 节点验证

### 解决方案：指纹登录 + 去中心化社区验证

```
┌─────────────────────────────────────────┐
│  用户设备                                │
│  1. 生成指纹 (Canvas + WebGL + Audio)   │
│  2. 钱包签名指纹                         │
│  3. 本地缓存凭证 (24h)                  │
└─────────────────────────────────────────┘
          ↓ (首次 / 过期时)
┌─────────────────────────────────────────┐
│  去中心化验证网络 (社区节点)            │
│  - 10+ 节点分布式验证                   │
│  - 检查链上订阅状态                     │
│  - 验证签名有效性                       │
│  - 返回解密密钥                         │
└─────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│  智能合约 (链上状态)                    │
│  - 订阅 NFT 所有权                      │
│  - 设备白名单 (fingerprint hash)        │
│  - 节点信誉分数                         │
└─────────────────────────────────────────┘
```

---

## 🌐 去中心化验证网络架构

### 节点类型

#### 1. 验证节点 (Validator Node)
**职责**:
- 接收用户验证请求
- 查询链上订阅状态
- 验证签名有效性
- 返回解密密钥

**要求**:
- 质押 100 PNTS Token (防女巫攻击)
- 运行时间 > 95% (信誉评分)
- 响应时间 < 500ms

**收益**:
- 每次验证: 0.001 PNTS (从订阅费中分配)
- 月均收入: ~$50 (假设 5000 次验证/天)

#### 2. 索引节点 (Indexer Node)
**职责**:
- 同步链上订阅数据
- 缓存设备白名单
- 提供快速查询接口

**要求**:
- 质押 500 PNTS
- 存储空间 > 50 GB
- 带宽 > 100 Mbps

**收益**:
- 每次查询: 0.0001 PNTS
- 月均收入: ~$20

#### 3. 数据节点 (Data Node)
**职责**:
- Pin IPFS 数据
- 提供数据下载服务
- 保证数据可用性

**要求**:
- 质押 200 PNTS
- 存储空间 > 100 GB
- 上传带宽 > 50 Mbps

**收益**:
- 每 GB 存储/月: 0.5 PNTS
- 月均收入: ~$30

---

## 🔐 指纹登录协议（详细流程）

### Phase 1: 首次绑定

```javascript
// 1. 用户购买订阅后，首次打开插件

async function firstTimeSetup() {
  // 1.1 生成设备指纹
  const fingerprint = await generateDeviceFingerprint();
  const fingerprintHash = sha256(fingerprint);

  console.log('设备指纹:', fingerprintHash);

  // 1.2 连接钱包
  const wallet = await connectWallet();
  const walletAddress = await wallet.getAddress();

  // 1.3 检查链上订阅状态
  const hasSubscription = await contract.hasActiveSubscription(walletAddress);

  if (!hasSubscription) {
    throw new Error('请先购买订阅');
  }

  // 1.4 钱包签名设备指纹（证明设备所有权）
  const message = `MyDictionary Device Binding\n\nFingerprint: ${fingerprintHash}\nTimestamp: ${Date.now()}`;
  const signature = await wallet.signMessage(message);

  console.log('签名:', signature);

  // 1.5 提交到智能合约注册设备
  const tx = await contract.registerDevice(fingerprintHash, signature);
  await tx.wait();

  console.log('✅ 设备已绑定到订阅');

  // 1.6 请求验证凭证
  const credential = await requestVerificationCredential(
    fingerprintHash,
    signature,
    walletAddress
  );

  // 1.7 本地缓存凭证（24 小时）
  await storage.set('premiumCredential', credential, { ttl: 86400000 });

  return credential;
}
```

### Phase 2: 日常验证（无感登录）

```javascript
// 2. 用户后续打开插件（24 小时内）

async function verifyPremiumAccess() {
  // 2.1 检查本地缓存
  const cachedCredential = await storage.get('premiumCredential');

  if (cachedCredential && !isExpired(cachedCredential)) {
    console.log('✅ 使用缓存凭证（无感登录）');
    return {
      valid: true,
      credential: cachedCredential,
      method: 'cached'
    };
  }

  // 2.2 凭证过期，重新验证
  console.log('⏰ 凭证已过期，请求新凭证');

  const fingerprint = await generateDeviceFingerprint();
  const fingerprintHash = sha256(fingerprint);

  // 2.3 发送到去中心化验证网络
  const credential = await requestVerificationFromNetwork(fingerprintHash);

  // 2.4 更新本地缓存
  await storage.set('premiumCredential', credential, { ttl: 86400000 });

  return {
    valid: true,
    credential: credential,
    method: 'network'
  };
}
```

### Phase 3: 去中心化验证（网络层）

```javascript
// 3. 验证网络处理请求

// 3.1 客户端：发送验证请求到多个节点
async function requestVerificationFromNetwork(fingerprintHash) {
  // 获取活跃验证节点列表
  const nodes = await getActiveValidatorNodes();

  // 并行请求 3 个节点（防止单点故障）
  const requests = nodes.slice(0, 3).map(node =>
    axios.post(`${node.endpoint}/verify`, {
      fingerprintHash: fingerprintHash,
      timestamp: Date.now()
    })
  );

  // 等待至少 2/3 节点响应
  const responses = await Promise.allSettled(requests);
  const validResponses = responses
    .filter(r => r.status === 'fulfilled' && r.value.data.valid)
    .map(r => r.value.data);

  if (validResponses.length < 2) {
    throw new Error('验证失败：节点响应不足');
  }

  // 验证节点返回的凭证一致性
  const credential = validResponses[0].credential;
  const allMatch = validResponses.every(r =>
    r.credential === credential
  );

  if (!allMatch) {
    throw new Error('验证失败：节点结果不一致');
  }

  return credential;
}

// 3.2 验证节点：处理验证请求
async function handleVerificationRequest(req, res) {
  const { fingerprintHash, timestamp } = req.body;

  // 检查时间戳（防重放攻击）
  if (Math.abs(Date.now() - timestamp) > 60000) {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  // 查询链上数据（使用本地索引加速）
  const deviceInfo = await indexer.getDeviceInfo(fingerprintHash);

  if (!deviceInfo) {
    return res.status(404).json({ error: 'Device not registered' });
  }

  // 验证订阅状态
  const subscription = await indexer.getSubscription(deviceInfo.owner);

  if (!subscription.active || subscription.expiryTime < Date.now()) {
    return res.status(403).json({ error: 'Subscription expired' });
  }

  // 生成验证凭证（JWT）
  const credential = jwt.sign(
    {
      fingerprintHash: fingerprintHash,
      subscriptionTier: subscription.tier,
      expiresAt: Date.now() + 86400000 // 24 小时
    },
    NODE_PRIVATE_KEY,
    { algorithm: 'ES256' }
  );

  // 返回凭证 + 解密密钥
  return res.json({
    valid: true,
    credential: credential,
    decryptionKeys: {
      academicPhrases: subscription.keys.academicPhrases,
      ttsVoices: subscription.keys.ttsVoices,
      aiModel: subscription.keys.aiModel
    }
  });
}
```

---

## 🏆 节点激励机制

### 收益分配模型

```
订阅收入: $9.9/年/用户
    ↓
分配方案:
  - 70% → 开发团队 ($6.93)
  - 20% → 验证节点奖池 ($1.98)
  - 10% → 数据节点奖池 ($0.99)
```

### 节点收益计算

```javascript
// 智能合约：每月分配节点奖励

contract NodeRewards {
    mapping(address => NodeStats) public nodeStats;

    struct NodeStats {
        uint256 validations;      // 验证次数
        uint256 uptime;           // 在线时长
        uint256 dataServed;       // 数据服务量（字节）
        uint256 reputationScore;  // 信誉分数 (0-100)
    }

    function distributeMonthlyRewards() public {
        uint256 totalRewardPool = address(this).balance;

        // 验证节点奖池 (20%)
        uint256 validatorPool = totalRewardPool * 20 / 100;

        // 按贡献度分配
        address[] memory validators = getActiveValidators();
        for (uint i = 0; i < validators.length; i++) {
            address validator = validators[i];
            uint256 score = calculateContributionScore(validator);
            uint256 reward = validatorPool * score / getTotalScore();

            payable(validator).transfer(reward);
        }

        // 数据节点奖池 (10%)
        uint256 dataNodePool = totalRewardPool * 10 / 100;
        // ... 类似逻辑
    }

    function calculateContributionScore(address node) public view returns (uint256) {
        NodeStats memory stats = nodeStats[node];

        // 加权计算
        return (
            stats.validations * 50 +       // 验证次数权重 50%
            stats.uptime * 30 +            // 在线时长权重 30%
            stats.reputationScore * 20     // 信誉分数权重 20%
        );
    }
}
```

### 月收益示例

假设有 **500 个付费用户**，**10 个验证节点**：

```
月订阅收入: 500 × $9.9 / 12 = $412.5
验证节点奖池: $412.5 × 20% = $82.5

单节点月收益（平均）: $82.5 / 10 = $8.25
年收益: $8.25 × 12 = $99
```

**ROI 分析**:
- 质押成本: 100 PNTS ≈ $50
- 服务器成本: $5/月
- 年净收益: $99 - $60 = $39
- ROI: 78% (可行)

---

## 🔒 安全性设计

### 1. 防女巫攻击（Sybil Attack）

**问题**: 恶意节点大量注册，控制验证网络

**防御**:
```solidity
contract ValidatorRegistry {
    uint256 public constant MIN_STAKE = 100 * 10**18; // 100 PNTS

    mapping(address => bool) public isValidator;
    uint256 public totalValidators;

    function registerValidator() public payable {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(!isValidator[msg.sender], "Already registered");

        isValidator[msg.sender] = true;
        totalValidators++;
    }

    // 惩罚作恶节点
    function slashValidator(address validator, string memory reason) public onlyGovernance {
        require(isValidator[validator], "Not a validator");

        // 没收质押
        uint256 slashed = stakes[validator];
        stakes[validator] = 0;
        isValidator[validator] = false;

        // 分配给举报者
        payable(msg.sender).transfer(slashed / 2);
    }
}
```

### 2. 防重放攻击（Replay Attack）

**问题**: 攻击者截获验证请求，重复发送

**防御**:
```javascript
// 客户端：生成唯一 nonce
const nonce = crypto.randomBytes(32).toString('hex');
const timestamp = Date.now();

const request = {
  fingerprintHash,
  nonce,
  timestamp,
  signature: sign({ fingerprintHash, nonce, timestamp })
};

// 验证节点：检查 nonce
const usedNonces = new Set();

function validateRequest(request) {
  // 检查时间戳（60 秒内有效）
  if (Math.abs(Date.now() - request.timestamp) > 60000) {
    throw new Error('Request expired');
  }

  // 检查 nonce 是否已使用
  if (usedNonces.has(request.nonce)) {
    throw new Error('Duplicate request');
  }

  usedNonces.add(request.nonce);

  // 60 秒后清理 nonce
  setTimeout(() => usedNonces.delete(request.nonce), 60000);
}
```

### 3. 防中间人攻击（MITM）

**问题**: 攻击者拦截验证请求/响应

**防御**:
```javascript
// 使用 HTTPS + 证书验证
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({
  rejectUnauthorized: true,  // 必须验证证书
  ca: [NODE_CA_CERT]         // 验证节点证书链
});

const response = await axios.post(nodeEndpoint, request, {
  httpsAgent,
  timeout: 5000
});

// 验证响应签名
const isValid = verifySignature(
  response.data.credential,
  response.data.signature,
  NODE_PUBLIC_KEY
);

if (!isValid) {
  throw new Error('Invalid node signature');
}
```

---

## 🚀 节点部署指南

### 运行验证节点

#### 1. 环境要求
```yaml
硬件:
  CPU: 2 核
  RAM: 4 GB
  存储: 50 GB SSD
  网络: 100 Mbps

软件:
  OS: Ubuntu 22.04 LTS
  Node.js: v20.x
  PostgreSQL: 15.x
  Docker: 24.x
```

#### 2. 安装步骤

```bash
# 克隆验证节点代码
git clone https://github.com/jhfnetboy/MyDictionary-Validator.git
cd MyDictionary-Validator

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env
```

```env
# .env 配置文件

# 节点设置
NODE_TYPE=validator
NODE_ENDPOINT=https://validator.yourdomain.com

# 质押钱包
WALLET_PRIVATE_KEY=your_private_key
STAKE_AMOUNT=100

# 区块链 RPC
POLYGON_RPC=https://polygon-rpc.com

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/validator

# IPFS
IPFS_GATEWAY=https://ipfs.io/ipfs/
```

```bash
# 质押 Token 注册节点
npm run register-validator

# 启动验证节点
npm run start

# 使用 PM2 管理进程
pm2 start npm --name "validator" -- start
pm2 save
pm2 startup
```

#### 3. 监控和维护

```bash
# 查看日志
pm2 logs validator

# 查看状态
curl http://localhost:3000/health

# 查看收益
npm run check-rewards
```

---

## 📊 网络监控和治理

### 节点监控仪表板

**指标**:
- 活跃节点数量
- 平均响应时间
- 验证成功率
- 网络健康度

**示例 API**:
```javascript
GET /api/network/stats

{
  "totalNodes": 15,
  "activeNodes": 12,
  "avgResponseTime": 350,  // ms
  "successRate": 99.2,     // %
  "totalValidations": 125000,
  "networkHealth": "healthy"
}
```

### DAO 治理

**治理事项**:
- 节点最低质押金额
- 收益分配比例
- 节点惩罚规则
- 协议升级

**投票权重**:
- 订阅用户: 1 票
- 验证节点: 10 票
- 开发团队: Veto 权（仅用于安全问题）

---

## 🎯 用户体验对比

### 传统钱包登录 vs 指纹登录

#### 场景 1: 首次使用

**传统方式**:
```
1. 点击"Connect Wallet"
2. MetaMask 弹窗 → 选择账户 → 确认
3. 签名消息 → MetaMask 弹窗 → 确认
4. 等待区块链确认（10-30 秒）
5. 完成

总耗时: ~45 秒
用户操作: 4 次点击
```

**指纹登录**:
```
1. 点击"Enable Premium"
2. MetaMask 弹窗 → 签名一次
3. 后台生成指纹（用户无感）
4. 自动验证并缓存

总耗时: ~5 秒
用户操作: 1 次点击
```

#### 场景 2: 日常使用

**传统方式**:
```
每次打开插件:
1. 检查钱包连接
2. 签名验证（弹窗）
3. 查询链上状态

总耗时: ~10 秒/次
烦人程度: ⭐⭐⭐⭐⭐
```

**指纹登录**:
```
每次打开插件:
1. 读取缓存凭证
2. 后台验证（无感）

总耗时: ~0.5 秒
烦人程度: ⭐ (24 小时内无感)
```

---

## 💡 技术优势总结

### 对比其他方案

| 方案 | 去中心化 | 用户体验 | 隐私保护 | 防共享 | 维护成本 |
|------|---------|---------|---------|--------|---------|
| 传统钱包登录 | ✅ | ⭐⭐ | ⭐⭐⭐ | ❌ | 低 |
| 中心化 API Key | ❌ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ | 高 |
| JWT + OAuth | ❌ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 高 |
| **指纹登录 + 去中心化网络** | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | 低 |

### 创新点

1. **用户体验革命性提升**: 24 小时内完全无感登录
2. **真正的去中心化**: 社区节点验证，无中心化服务器
3. **隐私友好**: 匿名指纹，不泄露钱包地址
4. **经济激励**: 社区节点获得收益，形成正向循环
5. **防共享设计**: 设备指纹绑定，技术上难以共享

---

## 🗺️ 实施路线图

### Phase 1: MVP（4 周）
- [ ] 指纹生成和签名
- [ ] 智能合约（设备注册）
- [ ] 单节点验证服务器
- [ ] 本地凭证缓存

### Phase 2: 去中心化（4 周）
- [ ] 多节点部署（3-5 个）
- [ ] 节点注册和质押
- [ ] 负载均衡和故障转移
- [ ] 监控仪表板

### Phase 3: 激励和治理（4 周）
- [ ] 收益分配合约
- [ ] DAO 治理模块
- [ ] 节点惩罚机制
- [ ] 社区投票系统

### Phase 4: 优化和推广（持续）
- [ ] 性能优化（<300ms 响应）
- [ ] 节点文档和教程
- [ ] 节点运营者招募
- [ ] 审计和安全加固

---

## 📝 总结

### 核心价值
1. **用户**: 一次设置，24 小时无感使用
2. **开发者**: 无需维护中心化服务器
3. **社区**: 运行节点获得收益
4. **网络**: 去中心化，抗审查，可持续

### 技术突破
- 首个将设备指纹用于 Web3 登录的方案
- 社区验证网络替代中心化服务器
- 经济激励确保网络可持续运行

### 商业潜力
- 可扩展到其他 Web3 应用（通用登录协议）
- 节点运营成为新的收入来源
- 降低 Web3 应用的运营成本

---

## 🔐 与时间锁加密的配合

详见: [付费版本计划](./payment-version-plan.md#与指纹登录的集成)

### 密钥分发安全性

**挑战**: 验证节点如何安全地存储和分发解密密钥?

**方案**: 多签 + 门限密钥共享

```javascript
// 使用 Shamir's Secret Sharing (SSS)
import { split, combine } from 'shamirs-secret-sharing';

// 1. 每周密钥分片 (5 个分片,至少 3 个可恢复)
async function distributeWeeklyKey(weekNumber, masterKey) {
  const shares = split(Buffer.from(masterKey, 'hex'), {
    shares: 5,
    threshold: 3
  });

  // 分发到 5 个不同的验证节点
  const nodes = await getTopValidators(5);
  for (let i = 0; i < 5; i++) {
    await nodes[i].storeKeyShare(weekNumber, shares[i]);
  }

  console.log(`✅ Week ${weekNumber} key distributed to 5 nodes`);
}

// 2. 用户验证时,从至少 3 个节点获取分片
async function reconstructKeyFromNodes(weekNumber) {
  const nodes = await getActiveValidators();

  // 并行请求多个节点
  const shareRequests = nodes.slice(0, 4).map(node =>
    axios.post(`${node.endpoint}/get-key-share`, { weekNumber })
  );

  const responses = await Promise.allSettled(shareRequests);
  const validShares = responses
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value.data.share);

  if (validShares.length < 3) {
    throw new Error('无法获取足够的密钥分片');
  }

  // 恢复完整密钥
  const masterKey = combine(validShares.slice(0, 3));
  return masterKey.toString('hex');
}
```

**优势**:
- ✅ 单节点被攻破不泄露密钥
- ✅ 部分节点离线不影响服务
- ✅ 完全去中心化,无单点故障

### 防止密钥泄露的经济机制

**问题**: 恶意节点可能泄露密钥给非订阅用户

**方案**: 质押 + 挑战机制

```solidity
// ValidatorStaking.sol

contract ValidatorStaking {
    uint256 public constant STAKE_AMOUNT = 100 * 10**18; // 100 PNTS
    uint256 public constant SLASH_AMOUNT = 50 * 10**18;  // 50 PNTS

    mapping(address => uint256) public stakes;

    // 挑战机制: 任何人可举报密钥泄露
    function challengeKeyLeak(
        address validator,
        uint256 weekNumber,
        bytes32 leakedKey,
        address[] memory nonSubscriberAddresses
    ) public {
        // 1. 验证 leakedKey 确实是该周的密钥
        require(
            keccak256(abi.encodePacked(leakedKey)) ==
            weeklyKeyHashes[weekNumber],
            "Invalid key"
        );

        // 2. 验证 nonSubscriberAddresses 确实没有订阅
        for (uint i = 0; i < nonSubscriberAddresses.length; i++) {
            require(
                !hasActiveSubscription(nonSubscriberAddresses[i]),
                "Address has subscription"
            );
        }

        // 3. 惩罚验证节点
        uint256 slashed = SLASH_AMOUNT;
        stakes[validator] -= slashed;

        // 4. 奖励举报者
        payable(msg.sender).transfer(slashed / 2);

        emit ValidatorSlashed(validator, weekNumber, slashed);
    }

    // 存储每周密钥哈希 (用于验证)
    mapping(uint256 => bytes32) public weeklyKeyHashes;

    function publishWeeklyKeyHash(uint256 weekNumber, bytes32 keyHash) public onlyOwner {
        weeklyKeyHashes[weekNumber] = keyHash;
    }
}
```

**经济博弈**:
- 泄露密钥损失: $25 (50 PNTS / 2)
- 泄露密钥收益: < $5 (卖给少数人)
- **结论**: 不经济 ❌

---

## 🌍 跨链兼容性

### 问题

当前设计基于 Polygon,如何支持其他链?

### 方案: LayerZero 跨链消息

```solidity
// SubscriptionNFT.sol (Polygon)

import "@layerzerolabs/contracts/interfaces/ILayerZeroEndpoint.sol";

contract SubscriptionNFT is ERC721, ILayerZeroReceiver {
    ILayerZeroEndpoint public endpoint;

    // 跨链同步订阅状态
    function syncSubscriptionToChain(
        uint16 dstChainId,  // 目标链 ID (Arbitrum, Base, etc.)
        uint256 tokenId
    ) public payable {
        require(ownerOf(tokenId) == msg.sender, "Not owner");

        // 编码订阅信息
        bytes memory payload = abi.encode(
            msg.sender,
            tokenId,
            subscriptionExpiry[tokenId]
        );

        // 发送跨链消息
        endpoint.send{value: msg.value}(
            dstChainId,
            abi.encodePacked(address(this)),
            payload,
            payable(msg.sender),
            address(0),
            bytes("")
        );
    }

    // 接收跨链消息
    function lzReceive(
        uint16 srcChainId,
        bytes memory srcAddress,
        uint64 nonce,
        bytes memory payload
    ) external override {
        require(msg.sender == address(endpoint), "Invalid endpoint");

        (address user, uint256 tokenId, uint256 expiry) = abi.decode(
            payload,
            (address, uint256, uint256)
        );

        // 在本链记录订阅状态
        crossChainSubscriptions[user] = Subscription({
            sourceChain: srcChainId,
            tokenId: tokenId,
            expiryTime: expiry,
            isActive: true
        });

        emit CrossChainSubscriptionSynced(srcChainId, user, tokenId);
    }
}
```

**验证节点查询逻辑**:
```javascript
async function checkSubscription(userAddress) {
  // 并行查询多条链
  const chains = [
    { id: 137, name: 'Polygon', rpc: 'https://polygon-rpc.com' },
    { id: 42161, name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc' },
    { id: 8453, name: 'Base', rpc: 'https://mainnet.base.org' }
  ];

  const queries = chains.map(async (chain) => {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    return await contract.hasActiveSubscription(userAddress);
  });

  const results = await Promise.allSettled(queries);

  // 任一链有订阅即可
  return results.some(r => r.status === 'fulfilled' && r.value === true);
}
```

---

## 📱 移动端支持

### 挑战

移动浏览器指纹稳定性较低 (iOS Safari 限制 Canvas/WebGL)

### 方案: 混合身份验证

```javascript
// 桌面端: 指纹登录 (Canvas + WebGL + Audio)
if (isMobile()) {
  // 移动端: 简化指纹 + 短期钱包签名
  const mobileFingerprint = {
    userAgent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform
  };

  // 每周重新签名一次 (而非每次)
  const weekNumber = getCurrentWeekNumber();
  const cachedSig = await storage.get(`mobileSig_${weekNumber}`);

  if (cachedSig) {
    return cachedSig; // 使用缓存签名
  } else {
    const signature = await wallet.signMessage(`Week ${weekNumber}`);
    await storage.set(`mobileSig_${weekNumber}`, signature, { ttl: 604800000 }); // 7 天
    return signature;
  }
} else {
  // 桌面端: 完整指纹
  return await generateDeviceFingerprint();
}
```

---

## 🔄 节点软件更新机制

### 挑战

如何确保所有验证节点运行最新版本?

### 方案: 链上版本检查 + 自动更新

```solidity
// ValidatorRegistry.sol

contract ValidatorRegistry {
    struct NodeInfo {
        string endpoint;
        string version;      // "1.2.3"
        uint256 lastSeen;
        bool isActive;
    }

    mapping(address => NodeInfo) public nodes;

    string public requiredVersion = "1.2.0";
    uint256 public gracePeriod = 7 days;

    // 节点心跳
    function heartbeat(string memory currentVersion) public {
        require(nodes[msg.sender].isActive, "Not registered");

        nodes[msg.sender].lastSeen = block.timestamp;
        nodes[msg.sender].version = currentVersion;

        // 检查版本
        if (!isVersionCompatible(currentVersion, requiredVersion)) {
            emit NodeOutdated(msg.sender, currentVersion, requiredVersion);
        }
    }

    // 更新最低版本要求
    function updateRequiredVersion(string memory newVersion) public onlyOwner {
        requiredVersion = newVersion;
        emit VersionRequirementUpdated(newVersion, block.timestamp + gracePeriod);
    }

    // 停用过期节点
    function pruneOutdatedNodes() public {
        // 自动停用过期节点...
    }
}
```

**验证节点自动更新**:
```javascript
// validator-node/auto-updater.js

const { exec } = require('child_process');

async function checkForUpdates() {
  const latestVersion = await contract.requiredVersion();
  const currentVersion = require('./package.json').version;

  if (compareVersions(latestVersion, currentVersion) > 0) {
    console.log(`⬆️  新版本可用: ${latestVersion}`);

    // 下载新版本
    exec('git pull origin main', (error, stdout) => {
      if (error) {
        console.error('更新失败:', error);
        return;
      }

      // 重启服务
      exec('pm2 restart validator', () => {
        console.log('✅ 已更新到', latestVersion);
      });
    });
  }
}

// 每小时检查一次
setInterval(checkForUpdates, 3600000);
```

---

**文档版本**: v1.1
**最后更新**: 2025-12-01
**状态**: 方案设计阶段（未开发）
**下一步**: 等待确认后开始智能合约开发
