// 后台服务脚本
console.log('BOSS直聘自动投递助手 - 后台服务已启动');

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
  console.log('扩展已安装');

  // 设置默认配置
  chrome.storage.sync.get('config', (result) => {
    if (!result.config) {
      chrome.storage.sync.set({
        config: {
          keywords: ['前端', 'JavaScript', 'React', 'Vue'],
          excludeKeywords: ['外包', '派遣', '实习'],
          minSalary: 15,
          maxSalary: 40,
          experience: ['1-3年', '3-5年'],
          autoGreeting: true,
          greetingTemplate: '您好，我对这个职位很感兴趣，我有{experience}的相关经验，期待与您进一步沟通。',
          maxJobs: 50,
          delay: 2000
        }
      });
    }
  });
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get('records', (result) => {
      const records = result.records || [];
      const today = new Date().toDateString();
      const todayRecords = records.filter(r =>
        new Date(r.appliedAt).toDateString() === today
      );

      sendResponse({
        total: records.length,
        today: todayRecords.length
      });
    });
    return true;
  }
});
