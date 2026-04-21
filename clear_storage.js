// 清除所有存储的标记
chrome.storage.local.clear(() => {
  console.log('已清除所有存储');
});
