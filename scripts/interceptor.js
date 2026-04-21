// 职位详情接口拦截器 - 必须在页面加载前注入
// 这个文件会在 document_start 时执行，确保在 BOSS 的 JS 加载前就劫持了 fetch 和 XHR

(function() {
  'use strict';

  // 用于存储拦截到的数据
  window.__BOSS_JOB_DETAIL_CACHE__ = null;

  // 用于存储拦截器日志
  window.__BOSS_INTERCEPTOR_LOGS__ = [];

  function log(message) {
    window.__BOSS_INTERCEPTOR_LOGS__.push({
      time: new Date().toLocaleTimeString(),
      message: message
    });
    // 只保留最近20条
    if (window.__BOSS_INTERCEPTOR_LOGS__.length > 20) {
      window.__BOSS_INTERCEPTOR_LOGS__.shift();
    }
  }

  log('🚀 拦截器初始化中...');

  // 拦截 fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];

    if (typeof url === 'string' && url.includes('/wapi/zpgeek/job/detail.json')) {
      log('🎯 拦截到职位详情请求 (fetch): ' + url.substring(0, 80));

      return originalFetch.apply(this, args).then(response => {
        const clonedResponse = response.clone();

        clonedResponse.json().then(data => {
          if (data.code === 0 && data.zpData && data.zpData.jobInfo) {
            window.__BOSS_JOB_DETAIL_CACHE__ = {
              data: data,
              timestamp: Date.now(),
              url: url
            };
            log('✅ 成功缓存职位详情 (fetch): ' + data.zpData.jobInfo.salaryDesc);
          } else {
            log('⚠️ 接口返回异常: code=' + data.code);
          }
        }).catch(err => {
          log('❌ 解析响应失败: ' + err.message);
        });

        return response;
      });
    }

    return originalFetch.apply(this, args);
  };

  // 拦截 XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._interceptor_url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._interceptor_url && this._interceptor_url.includes('/wapi/zpgeek/job/detail.json')) {
      log('🎯 拦截到职位详情请求 (XHR): ' + this._interceptor_url.substring(0, 80));

      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);
          if (data.code === 0 && data.zpData && data.zpData.jobInfo) {
            window.__BOSS_JOB_DETAIL_CACHE__ = {
              data: data,
              timestamp: Date.now(),
              url: this._interceptor_url
            };
            log('✅ 成功缓存职位详情 (XHR): ' + data.zpData.jobInfo.salaryDesc);
          } else {
            log('⚠️ 接口返回异常: code=' + data.code);
          }
        } catch (e) {
          log('❌ 解析响应失败: ' + e.message);
        }
      });
    }

    return originalSend.apply(this, args);
  };

  log('✅ 拦截器设置完成');
})();
