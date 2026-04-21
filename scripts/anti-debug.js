// 反反调试脚本 - 添加到扩展中
(function() {
  // 禁用 debugger 语句
  const noop = () => {};

  // 覆盖常见的反调试方法
  Object.defineProperty(window, 'console', {
    get: function() {
      return {
        log: noop,
        warn: noop,
        error: noop,
        info: noop,
        debug: noop,
        trace: noop,
        clear: noop
      };
    },
    set: noop
  });

  // 阻止页面检测 devtools
  setInterval(() => {
    debugger;
  }, 100);
})();
