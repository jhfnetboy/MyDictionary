/**
 * 词典管理 UI 控制器
 */

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📚 词典管理器初始化...');

  // 加载词典状态
  await loadDictionaryStatus();

  // 绑定事件
  bindEvents();
});

/**
 * 加载词典状态
 */
async function loadDictionaryStatus() {
  try {
    // 向 background 请求状态
    const response = await chrome.runtime.sendMessage({
      action: 'getDictionaryStatus'
    });

    if (response.success) {
      updateUI(response.status);
    } else {
      showError('加载词典状态失败');
    }
  } catch (error) {
    console.error('加载状态失败:', error);
    showError(error.message);
  } finally {
    // 隐藏加载提示
    document.getElementById('loading').style.display = 'none';
    document.getElementById('tiers-container').style.display = 'block';
  }
}

/**
 * 更新 UI 显示
 */
function updateUI(status) {
  console.log('📊 词典状态:', status);

  // 更新完整词库
  updateTierUI('full', status.full);

  // 如果完整词库已安装,隐藏欢迎横幅
  if (status.full.installed) {
    document.getElementById('welcome-banner').style.display = 'none';
  }
}

/**
 * 更新单个 Tier 的 UI
 */
function updateTierUI(tier, info) {
  const card = document.getElementById(`${tier}-card`);
  const badge = document.getElementById(`${tier}-badge`);
  const downloadBtn = document.getElementById(`${tier}-download`);
  const deleteBtn = document.getElementById(`${tier}-delete`);

  if (info.installed) {
    // 已安装
    card.classList.add('installed');
    badge.textContent = '✅ 已安装';
    badge.className = 'tier-badge installed';

    downloadBtn.style.display = 'none';
    deleteBtn.style.display = 'block';
    deleteBtn.disabled = false;  // 确保删除按钮可用
    deleteBtn.textContent = '删除';  // 重置按钮文本

    // 显示安装信息
    if (info.downloadedAt) {
      const date = new Date(info.downloadedAt).toLocaleDateString('zh-CN');
      badge.textContent += ` (${date})`;
    }
  } else {
    // 未安装
    card.classList.remove('installed');
    badge.textContent = '可下载';
    badge.className = 'tier-badge available';

    downloadBtn.style.display = 'block';
    downloadBtn.disabled = false;  // 确保下载按钮可用
    downloadBtn.innerHTML = '<span class="icon">📥</span> 下载';  // 重置按钮内容
    deleteBtn.style.display = 'none';
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  // 完整词库下载
  document.getElementById('full-download').addEventListener('click', () => {
    downloadDictionary('full');
  });

  // 完整词库删除
  document.getElementById('full-delete').addEventListener('click', () => {
    deleteDictionary('full');
  });
}

/**
 * 下载词典
 */
async function downloadDictionary(tier) {
  const downloadBtn = document.getElementById(`${tier}-download`);
  const progressContainer = document.getElementById(`${tier}-progress`);
  const progressBar = document.getElementById(`${tier}-bar`);
  const progressText = document.getElementById(`${tier}-text`);

  // 禁用按钮
  downloadBtn.disabled = true;
  downloadBtn.textContent = '下载中...';

  // 显示进度条
  progressContainer.classList.add('active');

  try {
    // 发送下载请求到 background
    const response = await chrome.runtime.sendMessage({
      action: 'downloadDictionary',
      tier: tier
    });

    if (response.success) {
      // 下载成功
      progressBar.style.width = '100%';
      progressText.textContent = `✅ 下载完成! 已安装 ${response.count.toLocaleString()} 词条`;

      // 等待 2 秒后刷新 UI (确保 IndexedDB 事务完成)
      setTimeout(async () => {
        progressContainer.classList.remove('active');
        await loadDictionaryStatus();

        // 显示成功提示
        const badge = document.getElementById(`${tier}-badge`);
        if (badge) {
          badge.style.animation = 'pulse 0.5s';
        }
      }, 2000);

    } else {
      throw new Error(response.error || '下载失败');
    }

  } catch (error) {
    console.error('下载失败:', error);
    progressText.textContent = `❌ 下载失败: ${error.message}`;

    // 恢复按钮
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = '<span class="icon">📥</span> 重新下载';

  }
}

/**
 * 删除词典
 */
async function deleteDictionary(tier) {
  const tierName = tier === 'full' ? '完整词库' : '词库';

  if (!confirm(`确定要删除 ${tierName} 吗?\n\n删除后需要重新下载才能使用。`)) {
    return;
  }

  const deleteBtn = document.getElementById(`${tier}-delete`);
  deleteBtn.disabled = true;
  deleteBtn.textContent = '删除中...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteDictionary',
      tier: tier
    });

    if (response.success) {
      // 删除成功,刷新 UI
      await loadDictionaryStatus();
    } else {
      throw new Error(response.error || '删除失败');
    }

  } catch (error) {
    console.error('删除失败:', error);
    alert(`删除失败: ${error.message}`);
    deleteBtn.disabled = false;
    deleteBtn.textContent = '删除';
  }
}

/**
 * 显示错误
 */
function showError(message) {
  const loading = document.getElementById('loading');
  loading.textContent = `❌ ${message}`;
  loading.style.color = '#dc3545';
}

/**
 * 监听来自 background 的进度更新
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadProgress') {
    const data = request.data;
    const { tier, percent } = data;

    const progressBar = document.getElementById(`${tier}-bar`);
    const progressText = document.getElementById(`${tier}-text`);

    if (progressBar && progressText) {
      progressBar.style.width = `${percent}%`;

      // 判断是下载阶段还是导入阶段
      if (data.phase === 'importing') {
        // 导入阶段
        const { imported, total } = data;
        progressText.textContent = `正在导入... ${percent}% (${imported.toLocaleString()} / ${total.toLocaleString()} 词条)`;
      } else {
        // 下载阶段
        const { receivedMB, totalMB } = data;
        progressText.textContent = `正在下载... ${percent}% (${receivedMB} / ${totalMB} MB)`;
      }
    }

    sendResponse({ received: true });
  }
});
