// 调试工具 - 在页面上显示按钮信息
(function() {
  console.log('🔍 开始分析页面按钮...');

  // 创建调试面板
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    width: 500px;
    max-height: 80vh;
    background: white;
    border: 2px solid #667eea;
    border-radius: 8px;
    padding: 20px;
    z-index: 999999;
    overflow-y: auto;
    font-family: monospace;
    font-size: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;

  let html = '<h3 style="margin: 0 0 15px 0; color: #667eea;">🔍 按钮调试信息</h3>';

  // 查找所有职位卡片
  const jobCards = document.querySelectorAll('.job-card-wrapper, li.job-card-box, li[class*="job-card"]');
  html += `<p>找到 <strong>${jobCards.length}</strong> 个职位卡片</p><hr>`;

  // 分析前3个职位卡片
  Array.from(jobCards).slice(0, 3).forEach((card, index) => {
    html += `<div style="margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 4px;">`;
    html += `<h4 style="margin: 0 0 10px 0;">职位 ${index + 1}</h4>`;

    // 职位标题
    const title = card.querySelector('.job-title, .job-name, [class*="job-name"]');
    html += `<p><strong>标题:</strong> ${title?.textContent.trim() || '未找到'}</p>`;

    // 查找所有按钮
    const buttons = card.querySelectorAll('button, a.btn, a[class*="btn"], a[class*="chat"]');
    html += `<p><strong>找到 ${buttons.length} 个按钮:</strong></p>`;

    buttons.forEach((btn, btnIndex) => {
      html += `<div style="margin-left: 15px; margin-bottom: 8px; padding: 8px; background: white; border-radius: 3px;">`;
      html += `<p style="margin: 2px 0;"><strong>按钮 ${btnIndex + 1}:</strong></p>`;
      html += `<p style="margin: 2px 0;">标签: ${btn.tagName}</p>`;
      html += `<p style="margin: 2px 0;">Class: <code style="background: #ffe; padding: 2px 4px;">${btn.className}</code></p>`;
      html += `<p style="margin: 2px 0;">文本: <span style="color: #e74c3c;">"${btn.textContent.trim()}"</span></p>`;
      html += `<p style="margin: 2px 0;">Disabled: ${btn.disabled || false}</p>`;
      html += `<p style="margin: 2px 0;">Href: ${btn.href || 'N/A'}</p>`;

      // 检查ka属性
      const ka = btn.getAttribute('ka');
      if (ka) {
        html += `<p style="margin: 2px 0;">ka属性: ${ka}</p>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
  });

  // 添加关闭按钮
  html += `<button id="close-debug" style="
    width: 100%;
    padding: 10px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    margin-top: 10px;
  ">关闭</button>`;

  debugPanel.innerHTML = html;
  document.body.appendChild(debugPanel);

  // 关闭按钮
  document.getElementById('close-debug').addEventListener('click', () => {
    debugPanel.remove();
  });

  console.log('✅ 调试面板已显示');
})();
