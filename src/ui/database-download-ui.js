/**
 * Database Download UI Component
 * 数据库下载界面组件
 */

export class DatabaseDownloadUI {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.onDownloadComplete = null;
  }

  /**
   * 显示下载提示
   */
  showDownloadPrompt() {
    this.container.innerHTML = `
      <div class="mydictionary-db-prompt">
        <div class="mydictionary-db-icon">📚</div>
        <h3>Academic WordNet Database Required</h3>
        <p class="mydictionary-db-description">
          To access the complete synonym dictionary with <strong>126,000+ words</strong> and <strong>400,000+ relationships</strong>,
          you need to download the WordNet database.
        </p>
        <div class="mydictionary-db-stats">
          <div class="mydictionary-db-stat">
            <span class="label">Size:</span>
            <span class="value">31 MB</span>
          </div>
          <div class="mydictionary-db-stat">
            <span class="label">Type:</span>
            <span class="value">One-time download</span>
          </div>
          <div class="mydictionary-db-stat">
            <span class="label">Storage:</span>
            <span class="value">IndexedDB (offline)</span>
          </div>
        </div>
        <div class="mydictionary-db-actions">
          <button id="download-db-btn" class="mydictionary-btn-primary">
            📥 Download Database Now
          </button>
          <button id="cancel-db-btn" class="mydictionary-btn-secondary">
            Later
          </button>
        </div>
        <p class="mydictionary-db-note">
          💡 After downloading, the database will be stored locally for offline use.
        </p>
      </div>
    `;

    // 绑定事件
    document.getElementById('download-db-btn').addEventListener('click', () => {
      this.startDownload();
    });

    document.getElementById('cancel-db-btn').addEventListener('click', () => {
      this.container.innerHTML = `
        <div class="mydictionary-db-cancelled">
          <p>Database download cancelled. You can download it later from Settings.</p>
        </div>
      `;
    });
  }

  /**
   * 开始下载
   */
  async startDownload() {
    this.container.innerHTML = `
      <div class="mydictionary-db-downloading">
        <div class="mydictionary-db-icon">⏳</div>
        <h3>Downloading WordNet Database</h3>
        <div class="mydictionary-progress-container">
          <div class="mydictionary-progress-bar">
            <div id="progress-fill" class="mydictionary-progress-fill" style="width: 0%"></div>
          </div>
          <div class="mydictionary-progress-text">
            <span id="progress-percentage">0%</span>
            <span id="progress-size">0 MB / 31 MB</span>
          </div>
        </div>
        <p class="mydictionary-db-status" id="download-status">Initializing download...</p>
      </div>
    `;

    try {
      // 导入数据库管理器
      const { databaseManager } = await import('../lib/database-manager.js');

      // 下载数据库
      const dbData = await databaseManager.downloadDatabase((progress) => {
        this.updateProgress(progress);
      });

      // 更新状态
      document.getElementById('download-status').textContent = 'Saving to local storage...';

      // 保存到 IndexedDB
      await databaseManager.saveDatabaseToStorage(dbData);

      // 显示成功
      this.showSuccess();

      // 触发回调
      if (this.onDownloadComplete) {
        this.onDownloadComplete();
      }
    } catch (error) {
      console.error('Download failed:', error);
      this.showError(error.message);
    }
  }

  /**
   * 更新下载进度
   */
  updateProgress(progress) {
    const fillElement = document.getElementById('progress-fill');
    const percentageElement = document.getElementById('progress-percentage');
    const sizeElement = document.getElementById('progress-size');
    const statusElement = document.getElementById('download-status');

    if (fillElement) {
      fillElement.style.width = `${progress.percentage}%`;
    }

    if (percentageElement) {
      percentageElement.textContent = `${progress.percentage}%`;
    }

    if (sizeElement) {
      sizeElement.textContent = `${progress.loadedMB} MB / ${progress.totalMB} MB`;
    }

    if (statusElement) {
      statusElement.textContent = `Downloading... ${progress.percentage}%`;
    }
  }

  /**
   * 显示成功
   */
  showSuccess() {
    this.container.innerHTML = `
      <div class="mydictionary-db-success">
        <div class="mydictionary-db-icon">✅</div>
        <h3>Database Ready!</h3>
        <p class="mydictionary-db-description">
          The WordNet database has been successfully downloaded and stored locally.
          You can now access <strong>126,000+ words</strong> offline.
        </p>
        <div class="mydictionary-db-stats">
          <div class="mydictionary-db-stat">
            <span class="label">Words:</span>
            <span class="value">126,125</span>
          </div>
          <div class="mydictionary-db-stat">
            <span class="label">Relationships:</span>
            <span class="value">406,196</span>
          </div>
          <div class="mydictionary-db-stat">
            <span class="label">Status:</span>
            <span class="value">✅ Ready</span>
          </div>
        </div>
        <button id="close-success-btn" class="mydictionary-btn-primary">
          Got it!
        </button>
      </div>
    `;

    document.getElementById('close-success-btn').addEventListener('click', () => {
      this.container.innerHTML = '';
    });
  }

  /**
   * 显示错误
   */
  showError(errorMessage) {
    this.container.innerHTML = `
      <div class="mydictionary-db-error">
        <div class="mydictionary-db-icon">❌</div>
        <h3>Download Failed</h3>
        <p class="mydictionary-error-message">${errorMessage}</p>
        <div class="mydictionary-db-actions">
          <button id="retry-download-btn" class="mydictionary-btn-primary">
            🔄 Retry Download
          </button>
          <button id="cancel-error-btn" class="mydictionary-btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.getElementById('retry-download-btn').addEventListener('click', () => {
      this.startDownload();
    });

    document.getElementById('cancel-error-btn').addEventListener('click', () => {
      this.container.innerHTML = '';
    });
  }
}
