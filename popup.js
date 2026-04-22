// Popup 脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 加载配置
  await loadConfig();

  // 加载统计数据
  await loadStats();

  // 加载投递记录
  await loadRecords();

  // 标签切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // 切换标签激活状态
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 切换内容显示
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');

      // 如果切换到记录标签，刷新记录
      if (tabName === 'records') {
        loadRecords();
      }
    });
  });

  // 保存配置
  document.getElementById('saveConfig').addEventListener('click', async () => {
    await saveConfig();
    showNotification('配置已保存');
  });

  // 开始投递
  document.getElementById('startApply').addEventListener('click', async () => {
    const btn = document.getElementById('startApply');
    btn.disabled = true;
    btn.textContent = '投递中...';

    try {
      // 先保存配置
      await saveConfig();

      // 获取当前标签页
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('zhipin.com')) {
        showNotification('请在BOSS直聘页面使用此功能', 'error');
        return;
      }

      // 发送消息到content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'startAutoApply'
      }, (response) => {
        if (chrome.runtime.lastError) {
          showNotification('请刷新页面后重试', 'error');
        } else if (response && response.success) {
          showNotification('投递完成！');
          loadStats();
        } else if (response && response.error) {
          showNotification('投递失败: ' + response.error, 'error');
        }
      });
    } finally {
      btn.disabled = false;
      btn.textContent = '开始投递';
    }
  });

  // 清空记录
  document.getElementById('clearRecords').addEventListener('click', async () => {
    if (confirm('确定要清空所有投递记录吗？')) {
      await chrome.storage.local.set({ records: [] });
      await loadRecords();
      await loadStats();
      showNotification('记录已清空');
    }
  });

  // 导出记录
  document.getElementById('exportRecords').addEventListener('click', async () => {
    const result = await chrome.storage.local.get('records');
    const records = result.records || [];

    if (records.length === 0) {
      showNotification('暂无记录可导出', 'error');
      return;
    }

    const csv = convertToCSV(records);
    downloadCSV(csv, `boss-apply-records-${new Date().toISOString().split('T')[0]}.csv`);
    showNotification('记录已导出');
  });
});

// 加载配置
async function loadConfig() {
  const result = await chrome.storage.sync.get('config');
  const config = result.config || {};

  document.getElementById('keywords').value = (config.keywords || []).join(',');
  document.getElementById('minKeywordMatch').value = config.minKeywordMatch || 1;
  document.getElementById('excludeKeywords').value = (config.excludeKeywords || []).join(',');
  document.getElementById('minExcludeMatch').value = config.minExcludeMatch || 1;
  document.getElementById('maxJobs').value = config.maxJobs || 50;
  document.getElementById('delay').value = config.delay || 2000;
  document.getElementById('autoGreeting').checked = config.autoGreeting !== false;
  document.getElementById('greetingTemplate').value = config.greetingTemplate || '您好，我对这个职位很感兴趣，我有{experience}的相关经验，期待与您进一步沟通。';
}

// 保存配置
async function saveConfig() {
  const config = {
    keywords: document.getElementById('keywords').value.split(',').map(k => k.trim()).filter(k => k),
    minKeywordMatch: parseInt(document.getElementById('minKeywordMatch').value) || 1,
    excludeKeywords: document.getElementById('excludeKeywords').value.split(',').map(k => k.trim()).filter(k => k),
    minExcludeMatch: parseInt(document.getElementById('minExcludeMatch').value) || 1,
    maxJobs: parseInt(document.getElementById('maxJobs').value) || 50,
    delay: parseInt(document.getElementById('delay').value) || 2000,
    autoGreeting: document.getElementById('autoGreeting').checked,
    greetingTemplate: document.getElementById('greetingTemplate').value
  };

  await chrome.storage.sync.set({ config });
}

// 加载统计数据
async function loadStats() {
  const result = await chrome.storage.local.get('records');
  const records = result.records || [];

  const today = new Date().toDateString();
  const todayRecords = records.filter(r =>
    new Date(r.appliedAt).toDateString() === today
  );

  document.getElementById('totalApplied').textContent = records.length;
  document.getElementById('todayApplied').textContent = todayRecords.length;
}

// 加载投递记录
async function loadRecords() {
  const result = await chrome.storage.local.get('records');
  const records = result.records || [];

  const recordsList = document.getElementById('recordsList');

  if (records.length === 0) {
    // 使用 DOM 方法替代 innerHTML
    recordsList.textContent = '';
    const emptyMsg = document.createElement('p');
    emptyMsg.style.cssText = 'text-align: center; color: #94a3b8; padding: 20px;';
    emptyMsg.textContent = '暂无记录';
    recordsList.appendChild(emptyMsg);
    return;
  }

  // 按时间倒序排列
  records.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  // 使用 DOM 方法替代 innerHTML
  recordsList.textContent = '';
  records.slice(0, 50).forEach(record => {
    const recordItem = document.createElement('div');
    recordItem.className = 'record-item';

    const recordTitle = document.createElement('div');
    recordTitle.className = 'record-title';
    recordTitle.textContent = record.title;

    const recordMeta = document.createElement('div');
    recordMeta.className = 'record-meta';
    recordMeta.textContent = `${record.company} | ${record.salary}\n匹配度: ${record.matchScore}分 | ${new Date(record.appliedAt).toLocaleString('zh-CN')}`;

    recordItem.appendChild(recordTitle);
    recordItem.appendChild(recordMeta);
    recordsList.appendChild(recordItem);
  });
}

// 显示通知
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 6px;
    font-size: 13px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// 转换为CSV
function convertToCSV(records) {
  const headers = ['职位', '公司', '薪资', '经验', '匹配度', '投递时间', '链接'];
  const rows = records.map(r => [
    r.title,
    r.company,
    r.salary,
    r.experience,
    r.matchScore,
    new Date(r.appliedAt).toLocaleString('zh-CN'),
    r.url
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

// 下载CSV
function downloadCSV(csv, filename) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
