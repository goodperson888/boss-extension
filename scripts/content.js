// BOSS直聘自动投递 - 优化版（参考开源项目）
// 注意：不使用 console.log 避免触发BOSS反调试检测

// 默认配置
const DEFAULT_CONFIG = {
  keywords: ['前端', 'JavaScript', 'React', 'Vue','前端开发工程师'],
  minKeywordMatch: 1,  // 至少匹配1个关键词
  excludeKeywords: ['外包', '派遣', '实习'],
  minExcludeMatch: 1,  // 至少包含1个排除关键词才跳过
  experience: [],
  city: '101010100',
  autoGreeting: true,
  greetingTemplate: '您好，我对这个职位很感兴趣，期待与您进一步沟通。',
  maxJobs: 50,
  minDelay: 3000,  // 最小延迟3秒
  maxDelay: 8000,  // 最大延迟8秒
  batchSize: 5,    // 每批投递5个
  batchDelay: 15000 // 批次间隔15秒
};

// 全局状态
let isPaused = false;
let isRunning = false;
let debugPanelClosed = false; // 标记用户是否手动关闭了调试面板

// 添加调试面板
function addDebugPanel() {
  // 如果已存在，先移除
  const existing = document.getElementById('boss-debug-panel');
  if (existing) {
    existing.remove();
  }

  const panel = document.createElement('div');
  panel.id = 'boss-debug-panel';
  panel.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    width: 350px;
    height: 400px;
    background: white;
    border: 2px solid #00b38a;
    border-radius: 8px;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
    resize: both;
    overflow: hidden;
    min-width: 300px;
    min-height: 200px;
  `;

  panel.innerHTML = `
    <div id="debug-panel-header" style="
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: linear-gradient(135deg, #00b38a 0%, #00d9a5 100%);
      color: white;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    ">
      <strong style="font-size: 14px;">🔍 运行日志</strong>
      <div>
        <button id="clear-debug-log" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px; font-size: 12px;">清空</button>
        <button id="close-debug-panel" style="background: rgba(255,68,68,0.9); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">关闭</button>
      </div>
    </div>
    <div id="debug-content" style="
      font-family: monospace;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 11px;
      line-height: 1.4;
      padding: 15px;
      overflow-y: auto;
      flex: 1;
    "></div>
  `;

  document.body.appendChild(panel);

  // 关闭按钮
  document.getElementById('close-debug-panel').addEventListener('click', () => {
    debugPanelClosed = true; // 标记用户手动关闭
    panel.remove();
  });

  // 清空按钮
  document.getElementById('clear-debug-log').addEventListener('click', () => {
    const content = document.getElementById('debug-content');
    if (content) {
      content.innerHTML = '';
    }
  });

  // 拖动功能
  const header = document.getElementById('debug-panel-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    // 不拖动按钮
    if (e.target.tagName === 'BUTTON') return;

    isDragging = true;
    initialX = e.clientX - panel.offsetLeft;
    initialY = e.clientY - panel.offsetTop;
    header.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // 限制在视口内
    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    panel.style.left = currentX + 'px';
    panel.style.top = currentY + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      header.style.cursor = 'move';
    }
  });

  // 显示拦截器日志
  if (window.__BOSS_INTERCEPTOR_LOGS__ && window.__BOSS_INTERCEPTOR_LOGS__.length > 0) {
    const content = document.getElementById('debug-content');
    window.__BOSS_INTERCEPTOR_LOGS__.forEach(log => {
      const logLine = document.createElement('div');
      logLine.style.color = '#666';
      logLine.textContent = `[${log.time}] [拦截器] ${log.message}`;
      content.appendChild(logLine);
    });
  }

  return panel;
}

// 添加日志到调试面板（不使用console.log，避免触发反调试）
function logToPanel(message, type = 'info') {

  // 如果用户手动关闭了面板，不再自动创建
  if (debugPanelClosed) {
    return;
  }

  // 确保调试面板存在
  let panel = document.getElementById('boss-debug-panel');
  if (!panel) {
    panel = addDebugPanel();
  }

  const content = document.getElementById('debug-content');
  if (!content) return;

  const time = new Date().toLocaleTimeString();
  const colors = {
    info: '#333',
    success: '#00b38a',
    warning: '#ff9800',
    error: '#ff4444'
  };

  const logEntry = document.createElement('div');
  logEntry.style.cssText = `
    margin-bottom: 5px;
    padding: 5px;
    border-left: 3px solid ${colors[type] || colors.info};
    background: ${type === 'error' ? '#fff5f5' : type === 'success' ? '#f0fff4' : '#f9f9f9'};
  `;
  logEntry.innerHTML = `<span style="color: #999;">[${time}]</span> <span style="color: ${colors[type] || colors.info};">${message}</span>`;

  content.appendChild(logEntry);

  // 自动滚动到底部
  content.scrollTop = content.scrollHeight;
}

// 随机���迟函数（模拟人工行为）
function randomDelay(min, max) {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// 模拟人工滚动
async function humanScroll(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await randomDelay(500, 1500);
}

// 模拟鼠标悬停
function simulateMouseHover(element) {
  const rect = element.getBoundingClientRect();
  const mouseoverEvent = new MouseEvent('mouseover', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  });
  element.dispatchEvent(mouseoverEvent);
}

// 获取配置
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('config', (result) => {
      resolve({ ...DEFAULT_CONFIG, ...result.config });
    });
  });
}

// 保存投递记录
async function saveRecord(job) {
  return new Promise((resolve) => {
    chrome.storage.local.get('records', (result) => {
      const records = result.records || [];
      records.push({
        ...job,
        appliedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ records }, resolve);
    });
  });
}

// 检查是否已投递
async function isApplied(jobId) {
  return new Promise((resolve) => {
    chrome.storage.local.get('records', (result) => {
      const records = result.records || [];
      resolve(records.some(r => r.id === jobId));
    });
  });
}

// 计算匹配度
function calculateMatch(job, config) {
  let score = 0;
  const reasons = [];

  const titleAndDesc = (job.title + ' ' + job.description).toLowerCase();

  // 排除关键词检查（优先）
  const matchedExcludeKeywords = [...new Set(config.excludeKeywords.filter(k =>
    titleAndDesc.includes(k.toLowerCase())
  ))];

  const minExcludeMatch = config.minExcludeMatch || 1;
  if (matchedExcludeKeywords.length >= minExcludeMatch) {
    return {
      score: 0,
      reasons: [`包含${matchedExcludeKeywords.length}个排除关键词(需${minExcludeMatch}个): ${matchedExcludeKeywords.join(', ')}`]
    };
  }

  // 关键词匹配（70分）
  const matchedKeywords = [...new Set(config.keywords.filter(k =>
    titleAndDesc.includes(k.toLowerCase())
  ))];

  const minKeywordMatch = config.minKeywordMatch || 1;
  if (matchedKeywords.length >= minKeywordMatch) {
    score += 70;
    reasons.push(`匹配${matchedKeywords.length}个关键词(需${minKeywordMatch}个): ${matchedKeywords.join(', ')}`);
  } else {
    reasons.push(`仅匹配${matchedKeywords.length}个关键词，需要${minKeywordMatch}个`);
  }

  // 经验匹配（30分）
  if (config.experience && Array.isArray(config.experience) && config.experience.length > 0) {
    // 只有设置了经验要求且匹配时才加分
    if (config.experience.some(exp => job.experience.includes(exp))) {
      score += 30;
      reasons.push('经验要求匹配');
    }
    // 不匹配则不加分（0分）
  } else {
    // 没有设置经验要求，默认给30分（不限制经验）
    score += 30;
    reasons.push('未设置经验要求');
  }

  return { score, reasons };
}

// 提取职位信息（多种选择器兼容）
function extractJobInfo(element) {
  try {
    // 尝试多种选择器组合
    const selectors = {
      title: ['.job-title', '.job-name', '[class*="job-name"]', 'a.job-card-left'],
      salary: [
        '.salary',
        '[class*="salary"]',
        '.job-limit .red',
        '.job-info .red',
        'span.red',
        '[class*="red"]'
      ],
      company: ['.company-name', '[class*="company-name"]', '.company-text'],
      experience: ['.tag-list li:first-child', '[class*="experience"]', '.job-limit li:first-child'],
      desc: ['.job-desc', '[class*="desc"]', '.info-desc'],
      link: ['a[href*="/job_detail/"]', 'a.job-card-left']
    };

    const getElement = (selectorList) => {
      for (const selector of selectorList) {
        const el = element.querySelector(selector);
        if (el) return el;
      }
      return null;
    };

    const titleEl = getElement(selectors.title);
    const salaryEl = getElement(selectors.salary);
    const companyEl = getElement(selectors.company);
    const experienceEl = getElement(selectors.experience);
    const descEl = getElement(selectors.desc);
    const linkEl = getElement(selectors.link);

    if (!titleEl || !linkEl) return null;

    const jobId = linkEl.href.match(/job_detail\/([^?]+)/)?.[1] || '';

    // 提取薪资文本，尝试多种方法
    let salaryText = '';
    if (salaryEl) {
      salaryText = salaryEl.textContent.trim();
    }

    // 如果薪资为空，尝试从整个卡片文本中提取
    if (!salaryText || salaryText === '') {
      const cardText = element.textContent;
      // 匹配常见薪资格式：15-25K、15K-25K、15-25k、15k-25k、15-25元/天等
      const salaryMatch = cardText.match(/(\d+)-(\d+)[Kk]|(\d+)[Kk]-(\d+)[Kk]|(\d+)-(\d+)元/);
      if (salaryMatch) {
        salaryText = salaryMatch[0];
      }
    }

    return {
      id: jobId,
      title: titleEl.textContent.trim(),
      salary: salaryText || '薪资面议',
      company: companyEl?.textContent.trim() || '',
      experience: experienceEl?.textContent.trim() || '',
      description: descEl?.textContent.trim() || '',
      url: linkEl.href
    };
  } catch (e) {
    logToPanel('提取职位信息失败: ' + e.message, 'error');
    return null;
  }
}

// 获取职位详情（从 DOM 提取）
async function getJobDetailInfo(jobUrl) {
  try {
    // 等待详情面板加载
    await randomDelay(500, 800);
    return await extractJobDetailInfo();
  } catch (e) {
    logToPanel('❌ 获取详情失败: ' + e.message, 'error');
    return null;
  }
}

// 从右侧详情面板提取完整职位信息
async function extractJobDetailInfo() {
  try {
    // 等待详情面板加载
    await randomDelay(800, 1200);

    const detailSelectors = {
      experience: [
        '.job-detail-section .tag-list li',
        '.job-primary .tag-list li',
        '.job-banner-main .tag-list li'
      ],
      description: [
        '.job-detail-section .job-sec-text',
        '.job-detail-text',
        '.text',
        '[class*="job-sec-text"]'
      ]
    };

    const getElement = (selectorList) => {
      for (const selector of selectorList) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      return null;
    };

    const experienceEls = document.querySelectorAll(detailSelectors.experience[0]) || [];
    const descEl = getElement(detailSelectors.description);

    let experience = '';
    if (experienceEls.length > 0) {
      // 通常第一个 li 是经验要求
      experience = experienceEls[0]?.textContent.trim() || '';
    }

    let description = '';
    if (descEl) {
      description = descEl.textContent.trim();
    }

    return {
      experience: experience || '',
      description: description || ''
    };
  } catch (e) {
    logToPanel('提取详情信息失败: ' + e.message, 'error');
    return null;
  }
}
async function clickChatButton(job) {
  logToPanel('🔍 开始为职位 "' + job.title + '" 查找沟通按钮...', 'info');

  // 等待右侧���情面板加载
  await randomDelay(1000, 2000);

  // 在整个页面（特别是右侧详情面板）查找按钮
  const commonSelectors = [
    'a.op-btn-chat',            // BOSS直聘实际使用的选择器！
    '.op-btn-chat',
    'a.op-btn.op-btn-chat',
    '.btn-startchat',           // 备用选择器
    'a[ka="job-detail-chat"]',
    '.start-chat-btn',
    '.btn-chat'
  ];

  // 方法1: 使用CSS选择器在整个页面查找
  for (const selector of commonSelectors) {
    try {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) { // 检查是否可见
        const text = btn.textContent.trim();
        logToPanel('✅ 选择器 "' + selector + '" 找到按钮: "' + text + '"', 'success');

        // 检查是否已沟通
        if (!text.includes('已沟通') && !text.includes('继续沟通') && !btn.disabled) {
          simulateMouseHover(btn);
          await randomDelay(200, 500);
          btn.click();
          logToPanel('✅ 已点击按钮', 'success');

          // 等待可能出现的弹窗
          await randomDelay(1000, 1500);

          // 处理弹窗
          const dialogHandled = await handleGreetingDialog();

          return dialogHandled;
        } else {
          logToPanel('⏭️ 跳过：已沟通或按钮禁用', 'warning');
          return false;
        }
      }
    } catch (e) {
      // 继续尝试下一个选择器
    }
  }

  // 方法2: 通过文本内容查找
  const allButtons = document.querySelectorAll('button, a, div[role="button"]');

  for (const btn of allButtons) {
    const text = btn.textContent.trim();

    // 精确匹配"立即沟通"
    if (text === '立即沟通' && btn.offsetParent !== null && !btn.disabled) {
      logToPanel('✅ 通过文本精确匹配找到: ' + btn.tagName + ' ' + btn.className, 'success');
      simulateMouseHover(btn);
      await randomDelay(200, 500);
      btn.click();
      logToPanel('✅ 已点击按钮', 'success');

      // 等待可能出现的弹窗
      await randomDelay(1000, 1500);

      // 处理弹窗
      const dialogHandled = await handleGreetingDialog();

      return dialogHandled;
    }
  }

  logToPanel('❌ 未找到可点击的沟通按钮: ' + job.title, 'error');
  return false;
}

// 处理招呼语弹窗
// 核心策略：点击"继续沟通"跳转聊天页发招呼语，通过 storage 保存进度
// 聊天页发完后 history.back() 返回，init() ���测到进度自动恢复投递
async function handleGreetingDialog() {
  logToPanel('🔍 检查是否有招呼语弹窗...', 'info');

  // 等待弹窗出现
  await randomDelay(800, 1200);

  const config = await getConfig();

  // 查找弹窗中的"继续沟通"按钮
  const continueSelectors = [
    'a.sure-btn',
    '.sure-btn',
    'a[class*="sure"]',
    'button[class*="sure"]'
  ];

  for (const selector of continueSelectors) {
    try {
      const btn = document.querySelector(selector);
      if (btn && btn.offsetParent !== null) {
        const text = btn.textContent.trim();
        logToPanel('🔍 检查按钮: "' + text + '" (选择器: ' + selector + ')', 'info');

        if (text.includes('继续沟通')) {
          logToPanel('✅ 找到"继续沟通"按钮', 'success');

          if (config.autoGreeting && config.greetingTemplate) {
            // 有自定义招呼语：保存待发送标记，点击"继续沟通"跳转聊天页
            logToPanel('📝 保存待发送招呼语: ' + config.greetingTemplate, 'info');

            await chrome.storage.local.set({
              pendingGreeting: {
                message: config.greetingTemplate,
                timestamp: Date.now()
              }
            });

            logToPanel('🖱️ 点击"继续沟通"，即将跳转聊天页...', 'info');
            // 注意：点击后页面会跳转，当前脚本上下文会销毁
            // processJobs 调用方在点击前已保存了 applyProgress
            await randomDelay(300, 600);
            btn.click();

            // 返回 'navigating' 特殊标记，告诉 processJobs 页面即将跳转
            return 'navigating';
          } else {
            // 没有自定义招呼语，点击"留在此页"，BOSS已用默认招呼语沟通
            logToPanel('✅ 无自定义招呼语，点击"留在此页"', 'info');

            const cancelSelectors = ['a.cancel-btn', '.cancel-btn', 'a[class*="cancel"]'];
            for (const cancelSel of cancelSelectors) {
              const cancelBtn = document.querySelector(cancelSel);
              if (cancelBtn && cancelBtn.offsetParent !== null) {
                await randomDelay(300, 600);
                cancelBtn.click();
                logToPanel('✅ 已点击"留在此页"', 'success');
                break;
              }
            }

            await randomDelay(800, 1200);
            return true;
          }
        }
      }
    } catch (e) {
      logToPanel('❌ 处理弹窗出错: ' + e.message, 'error');
    }
  }

  // 如果没有弹窗，可能直接发送了默认招呼语
  logToPanel('⚠️ 未找到弹窗（可能已自动发送默认招呼语）', 'warning');
  return true;
}

// 发送自定义招呼语（在聊天页面执行）
async function sendCustomGreeting() {
  logToPanel('📝 [聊天页面] 准备发送自定义招呼语...', 'info');

  // 检查是否有待发送的招呼语
  const { pendingGreeting } = await chrome.storage.local.get('pendingGreeting');

  if (!pendingGreeting) {
    logToPanel('⏭️ [聊天页面] 没有待发送的招呼语', 'warning');
    return;
  }

  const message = pendingGreeting.message;
  logToPanel('📝 [聊天页面] 待发送消息: "' + message + '"', 'success');

  // 等待聊天页面加载，光标应该已经在输入框中
  logToPanel('⏳ [聊天页面] 等待页面加载...', 'info');
  await randomDelay(2000, 3000);

  // 直接在当前光标位置插入文字（光标默认已在输入框中）
  logToPanel('⌨️ [聊天页面] 直接在光标位置插入文字...', 'info');
  document.execCommand('insertText', false, message);
  logToPanel('✅ [聊天页面] 已插入招呼语', 'success');

  await randomDelay(800, 1200);

  // 使用��车发送
  logToPanel('⌨️ [聊天页面] 按回车发送消息...', 'info');
  const activeEl = document.activeElement;

  if (activeEl) {
    logToPanel('🎯 [聊天页面] 当前聚焦元素: ' + activeEl.tagName + ' ' + (activeEl.className || ''), 'info');

    activeEl.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true, cancelable: true
    }));

    activeEl.dispatchEvent(new KeyboardEvent('keypress', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true
    }));

    activeEl.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
      bubbles: true
    }));

    logToPanel('✅ [聊天页面] 已发送回车键', 'success');
  } else {
    logToPanel('⚠️ [聊天页面] 没有聚焦元素', 'warning');
  }

  await randomDelay(1500, 2000);

  // 清除待发送标记
  await chrome.storage.local.remove('pendingGreeting');
  logToPanel('✅ [聊天页面] 已清除待发送标记', 'success');

  // 返回职位列表页面（返回后 content script 重新加载，init 会检测 applyProgress 并自动恢复）
  await randomDelay(800, 1200);
  logToPanel('🔙 [聊天页面] 返回职位列表页面...', 'info');
  window.history.back();
}

// 点击职位卡片，加载详情
async function clickJobCard(jobElement, job) {
  logToPanel('📌 点击职位卡片: ' + job.title, 'info');

  // 滚动到视图
  await humanScroll(jobElement);
  await randomDelay(300, 800);

  // 查找职位标题链接
  const linkSelectors = [
    'a[href*="/job_detail/"]',
    'a.job-card-left',
    '.job-title a',
    'a.job-name'
  ];

  for (const selector of linkSelectors) {
    const link = jobElement.querySelector(selector);
    if (link) {
      logToPanel('✅ 找到职位链接，准备点击', 'success');
      simulateMouseHover(link);
      await randomDelay(200, 500);
      link.click();
      logToPanel('✅ 已点击职位卡片', 'success');
      return true;
    }
  }

  // 如果没找到链接，直接点击卡片
  logToPanel('⚠️ 未找到链接，尝试点击卡片本身', 'warning');
  jobElement.click();
  return true;
}

// 查找当前已加载的职位卡片使用的选择器
function getJobCardSelector() {
  const selectors = [
    '.job-card-wrapper',
    'li.job-card-box',
    'li[class*="job-card"]',
    'li.job-list-box',
    '.job-list-item'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return selector;
    }
  }
  return null;
}

// 查找所有职位卡片（当前已加载的）
function findJobCards() {
  const selector = getJobCardSelector();
  if (selector) {
    const elements = Array.from(document.querySelectorAll(selector));
    logToPanel('✅ 使用选择器 "' + selector + '" 找到 ' + elements.length + ' 个职位', 'success');
    return elements;
  }

  logToPanel('❌ 未找到职位卡片', 'error');
  return [];
}

// 自动滚动页面以触发懒加载，加载更多职位
async function scrollToLoadMore() {
  const selector = getJobCardSelector();
  if (!selector) return false;

  const beforeCount = document.querySelectorAll(selector).length;
  logToPanel('📜 当前已加载 ' + beforeCount + ' 个职位，尝试滚动加载更多...', 'info');

  // 获取页面滚动信息
  const getScrollHeight = () => {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );
  };

  const getScrollTop = () => {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  };

  const getClientHeight = () => {
    return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  };

  // 检查是否已经到底部
  const isAtBottom = () => {
    const scrollTop = getScrollTop();
    const scrollHeight = getScrollHeight();
    const clientHeight = getClientHeight();
    return (scrollTop + clientHeight) >= (scrollHeight - 100); // 距离底部100px内算到底
  };

  let scrollAttempts = 0;
  const maxScrollAttempts = 10;
  let noNewDataCount = 0;
  let lastCount = beforeCount;

  while (scrollAttempts < maxScrollAttempts && noNewDataCount < 3) {
    if (!isRunning) {
      logToPanel('滚动已停止', 'warning');
      break;
    }

    window.scrollTo({
      top: getScrollHeight(),
      behavior: 'smooth'
    });

    await randomDelay(1500, 2500);
    scrollAttempts++;

    const currentCount = document.querySelectorAll(selector).length;

    if (currentCount > lastCount) {
      logToPanel('加载了更多职位: ' + lastCount + ' -> ' + currentCount, 'success');
      lastCount = currentCount;
      noNewDataCount = 0;
    } else {
      if (isAtBottom()) {
        noNewDataCount++;
        logToPanel('已到底部但无新数据 (' + noNewDataCount + '/3)', 'warning');
      } else {
        logToPanel('继续滚动...', 'info');
      }
    }
  }

  const finalCount = document.querySelectorAll(selector).length;
  if (finalCount > beforeCount) {
    logToPanel('滚动完成，共加载: ' + beforeCount + ' -> ' + finalCount + ' (+' + (finalCount - beforeCount) + ')', 'success');
    return true;
  } else {
    logToPanel('已到底部，没有更多职位了', 'warning');
    return false;
  }
}

// 主处理函数
async function processJobs() {
  if (isRunning) {
    logToPanel('⚠️ 已有任务在运行中', 'warning');
    return;
  }

  isRunning = true;
  isPaused = false;
  debugPanelClosed = false; // 开始任务时重置标志，允许显示日志

  // 显示日志面板
  addDebugPanel();
  logToPanel('🚀 开始自动投递任务', 'success');

  const config = await getConfig();

  // 检查页面
  if (!window.location.href.includes('/web/geek/job')) {
    logToPanel('❌ 不在职位搜索页面', 'error');
    alert('请先在BOSS直聘搜索职位，然后再点击"开始自动投递"按钮');
    isRunning = false;
    return;
  }

  // 检查是否有之前中断的进度
  const { applyProgress } = await chrome.storage.local.get('applyProgress');
  let startIndex = 0;
  let applied = 0;

  if (applyProgress && applyProgress.timestamp > Date.now() - 300000) { // 5分钟内的进度
    startIndex = applyProgress.nextIndex || 0;
    applied = applyProgress.applied || 0;
    logToPanel('🔄 恢复之前的投递进度: 从第 ' + startIndex + ' 个开始, 已投递 ' + applied + ' 个', 'success');
    // 清除进度标记（本轮投递会在需要时重新保存）
    await chrome.storage.local.remove('applyProgress');
  }

  // 查找职位卡片
  let jobElements = findJobCards();

  if (jobElements.length === 0) {
    logToPanel('❌ 未找到职位列表', 'error');
    alert('未找到职位列表，请确保页面已加载完成');
    isRunning = false;
    return;
  }

  logToPanel('📊 初始找到 ' + jobElements.length + ' 个职位', 'success');

  const results = [];
  const processedIds = new Set(); // 记录已处理的职位ID，避免滚动加载后重复处理
  let noNewJobsRounds = 0; // 连续没有新职位的轮次
  const maxNoNewJobsRounds = 3; // 连续3轮没新职位就停止

  // 外层循环：处理当前批次 → 滚动加载更多 → 继续处理
  while (applied < config.maxJobs && noNewJobsRounds < maxNoNewJobsRounds && !isPaused && isRunning) {
    let processedInThisRound = 0;

    for (let i = startIndex; i < jobElements.length; i++) {
      // 检查是否暂停或停止
      if (isPaused && isRunning) {
        logToPanel('⏸️ 已暂停，等待继续...', 'warning');
        while (isPaused && isRunning) {
          await randomDelay(1000, 1000);
        }
        if (isRunning) {
          logToPanel('▶️ 继续投递...', 'info');
        }
      }

      // 如果已停止，立即退出
      if (!isRunning) {
        logToPanel('⏹️ 任务已停止', 'warning');
        break;
      }

      if (applied >= config.maxJobs) {
        logToPanel('✅ 已达到最大投递数量', 'success');
        break;
      }

      const element = jobElements[i];
      const job = extractJobInfo(element);

      if (!job || !job.id) {
        logToPanel('⏭️ 跳过无效职位', 'warning');
        continue;
      }

      // 跳过已处理过的职位（滚动加载后可能重复出现）
      if (processedIds.has(job.id)) {
        continue;
      }
      processedIds.add(job.id);
      processedInThisRound++;

      // 检查是否已投递
      if (await isApplied(job.id)) {
        logToPanel('⏭️ 跳过已投递: ' + job.title, 'warning');
        continue;
      }

      // 初步计算匹配度（基于卡片信息）
      const preliminaryMatch = calculateMatch(job, config);
      logToPanel('📊 [初步] ' + job.title + ' (' + job.salary + ') - 匹配度: ' + preliminaryMatch.score + '分', 'info');

      // 如果初步匹配度太低（<40分），直接跳过，不点击卡片
      if (preliminaryMatch.score < 40) {
        logToPanel('❌ 初步匹配度过低，跳过: ' + job.title + ' (' + job.salary + ') - ' + preliminaryMatch.score + '分', 'info');
        results.push({ job, success: false, match: preliminaryMatch, reason: '匹配度不足' });
        continue;
      }

      // 步骤1: 点击职位卡片，加载右侧详情
      logToPanel('🔍 点击卡片查看详情: ' + job.title, 'info');
      const cardClicked = await clickJobCard(element, job);

      if (!cardClicked) {
        logToPanel('❌ 无法点击职位卡片', 'error');
        results.push({ job, success: false, match: preliminaryMatch, reason: '无法点击职位卡片' });
        continue;
      }

      // 步骤2: 获取详情信息（优先使用拦截的接口响应）
      const detailInfo = await getJobDetailInfo(job.url);

      if (detailInfo) {
        // 用详情信息更新 job 对象
        if (detailInfo.salary && detailInfo.salary !== '薪资面议') {
          job.salary = detailInfo.salary;
        }
        if (detailInfo.experience) {
          job.experience = detailInfo.experience;
        }
        if (detailInfo.description) {
          job.description = detailInfo.description;
        }
        logToPanel('✅ 已提取详情: 薪资=' + job.salary + ', 经验=' + job.experience, 'success');
      } else {
        logToPanel('⚠️ 无法获取详情信息，使用卡片数据', 'warning');
      }

      // 步骤3: 基于完整信息重新计算匹配度
      const finalMatch = calculateMatch(job, config);
      logToPanel('📊 [最终] ' + job.title + ' (' + job.salary + ') - 匹配度: ' + finalMatch.score + '分 (' + finalMatch.reasons.join(', ') + ')', 'info');

      if (finalMatch.score >= 60) {
        logToPanel('✅ 准备投递: ' + job.title + ' (' + job.salary + ')', 'success');

        // ★★★ 关键：在点击沟通按钮前，先保存进度到 storage ★★★
        await chrome.storage.local.set({
          applyProgress: {
            nextIndex: i + 1,
            applied: applied + 1,
            timestamp: Date.now()
          }
        });

        // 步骤4: 点击沟通按钮并发送招呼语
        const clicked = await clickChatButton(job);

        if (clicked === 'navigating') {
          logToPanel('🔄 页面即将跳转到聊天页，进度已保存', 'info');
          await saveRecord({ ...job, matchScore: finalMatch.score, matchReasons: finalMatch.reasons });
          return;
        } else if (clicked === true) {
          await saveRecord({ ...job, matchScore: finalMatch.score, matchReasons: finalMatch.reasons });
          applied++;
          results.push({ job, success: true, match: finalMatch });

          logToPanel('✅ 已投递 ' + applied + '/' + config.maxJobs + ': ' + job.title, 'success');

          // 清除预存的进度
          await chrome.storage.local.remove('applyProgress');

          // 随机延迟
          await randomDelay(config.minDelay, config.maxDelay);

          // 批次休息
          if (applied % config.batchSize === 0) {
            logToPanel('⏸️ 已投递 ' + applied + ' 个，休息 ' + (config.batchDelay/1000) + ' 秒...', 'warning');
            await randomDelay(config.batchDelay, config.batchDelay + 5000);
          }
        } else {
          results.push({ job, success: false, match: finalMatch, reason: '未找到沟通按钮或已沟通' });
          await chrome.storage.local.remove('applyProgress');
        }
      } else {
        logToPanel('❌ 最终匹配度不足: ' + job.title + ' (' + job.salary + ') - ' + finalMatch.score + '分', 'info');
        results.push({ job, success: false, match: finalMatch, reason: '匹配度不足' });
      }
    }

    // 本轮处理完毕，检查是否需要加载更多
    if (applied >= config.maxJobs || !isRunning) {
      break;
    }

    if (processedInThisRound === 0) {
      noNewJobsRounds++;
      logToPanel('⚠️ 本轮没有新职位可处理 (' + noNewJobsRounds + '/' + maxNoNewJobsRounds + ')', 'warning');
    } else {
      noNewJobsRounds = 0;
    }

    // 尝试滚动加载更多职位（检查是否已停止）
    if (!isRunning) {
      break;
    }

    logToPanel('📜 尝试滚动页面加载更多职位...', 'info');
    const loaded = await scrollToLoadMore();

    if (!loaded && isRunning) {
      logToPanel('📜 没有更多职位可加载，尝试翻页...', 'info');
      // 尝试点击下一页按钮
      const nextPageBtn = document.querySelector('.ui-icon-arrow-right')
        || document.querySelector('a.next')
        || document.querySelector('[class*="next"]');
      if (nextPageBtn && nextPageBtn.offsetParent !== null) {
        logToPanel('📄 找到下一页按钮，点击翻页', 'info');
        nextPageBtn.click();
        await randomDelay(2000, 3000);
        processedIds.clear(); // 新页面，清除已处理记录
      } else {
        logToPanel('📄 没有下一页了', 'warning');
        noNewJobsRounds = maxNoNewJobsRounds; // 强制退出外层循环
        break;
      }
    }

    // 重新获取职位卡片（包含新加载的）
    if (isRunning) {
      jobElements = findJobCards();
      startIndex = 0; // 从头遍历，processedIds 会跳过已处理的
      logToPanel('📊 重新扫描，当前共 ' + jobElements.length + ' 个职位', 'info');
    }
  }

  isRunning = false;

  // 清除所有进度标记
  await chrome.storage.local.remove('applyProgress');

  // 显示结果
  showResults(results, applied);
}

// 显示结果面板
function showResults(results, applied) {
  // 移除旧面板
  const oldPanel = document.getElementById('boss-auto-apply-results');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'boss-auto-apply-results';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    padding: 24px;
    z-index: 10000;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  const successJobs = results.filter(r => r.success);
  const failedJobs = results.filter(r => !r.success);

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 20px; color: #333;">投递完成</h3>
      <button id="close-results" style="border: none; background: none; font-size: 28px; cursor: pointer; color: #999;">&times;</button>
    </div>

    <div style="margin-bottom: 20px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
      <div style="font-size: 32px; font-weight: bold; margin-bottom: 8px;">${applied}</div>
      <div style="font-size: 14px; opacity: 0.9;">成功投递职位</div>
    </div>

    ${successJobs.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h4 style="font-size: 14px; color: #666; margin-bottom: 12px;">✅ 成功投递 (${successJobs.length})</h4>
        ${successJobs.slice(0, 5).map(r => `
          <div style="padding: 12px; background: #f0f9ff; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 500; color: #333; margin-bottom: 4px;">${r.job.title}</div>
            <div style="font-size: 12px; color: #666;">${r.job.company} · ${r.job.salary}</div>
            <div style="font-size: 12px; color: #10b981; margin-top: 4px;">匹配度: ${r.match.score}分</div>
          </div>
        `).join('')}
        ${successJobs.length > 5 ? `<div style="text-align: center; color: #999; font-size: 12px;">还有 ${successJobs.length - 5} 个...</div>` : ''}
      </div>
    ` : ''}

    ${failedJobs.length > 0 ? `
      <div>
        <h4 style="font-size: 14px; color: #666; margin-bottom: 12px;">⏭️ 跳过 (${failedJobs.length})</h4>
        <div style="font-size: 12px; color: #999;">
          ${failedJobs.slice(0, 3).map(r => `${r.job.title} (${r.reason || '匹配度不足'})`).join('<br>')}
        </div>
      </div>
    ` : ''}
  `;

  document.body.appendChild(panel);

  // 关闭按钮
  document.getElementById('close-results').addEventListener('click', () => {
    panel.remove();
  });

  // 10秒后自动淡出
  setTimeout(() => {
    panel.style.transition = 'opacity 0.5s';
    panel.style.opacity = '0';
    setTimeout(() => panel.remove(), 500);
  }, 10000);
}

// 添加浮动按钮
function addFloatingButton() {
  // 防止重复添加
  if (document.getElementById('boss-auto-apply-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'boss-auto-apply-btn';
  button.textContent = '🚀 开始自动投递';
  button.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 30px;
    padding: 14px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    transition: all 0.3s ease;
  `;

  // 添加暂停/继续按钮
  const pauseBtn = document.createElement('button');
  pauseBtn.id = 'boss-pause-btn';
  pauseBtn.textContent = '⏸️ 暂停';
  pauseBtn.style.cssText = `
    position: fixed;
    bottom: 140px;
    right: 30px;
    padding: 10px 20px;
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    z-index: 9999;
    transition: all 0.3s ease;
    display: none;
  `;

  // 添加停止按钮
  const stopBtn = document.createElement('button');
  stopBtn.id = 'boss-stop-btn';
  stopBtn.textContent = '⏹️ 停止';
  stopBtn.style.cssText = `
    position: fixed;
    bottom: 200px;
    right: 30px;
    padding: 10px 20px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    z-index: 9999;
    transition: all 0.3s ease;
    display: none;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
  });

  button.addEventListener('click', () => {
    if (isRunning) {
      logToPanel('⚠️ 已有任务在运行中', 'warning');
      return;
    }

    button.disabled = true;
    button.textContent = '⏳ 投递中...';
    button.style.background = '#999';

    // 显示暂停和停止按钮
    pauseBtn.style.display = 'block';
    stopBtn.style.display = 'block';

    processJobs().finally(() => {
      button.disabled = false;
      button.textContent = '🚀 开始自动投递';
      button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

      // 隐藏暂停和停止按钮
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'none';
      pauseBtn.textContent = '⏸️ 暂停';
      isPaused = false;
    });
  });

  // 暂停/继续按钮点击事件
  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;

    if (isPaused) {
      pauseBtn.textContent = '▶️ 继续';
      pauseBtn.style.background = '#10b981';
      logToPanel('⏸️ 已暂停投递', 'warning');
    } else {
      pauseBtn.textContent = '⏸️ 暂停';
      pauseBtn.style.background = '#f59e0b';
      logToPanel('▶️ 继续投递', 'success');
    }

    // 确保按钮保持显示
    pauseBtn.style.display = 'block';
  });

  // 停止按钮：清除 applyProgress，阻止自动恢复
  stopBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('applyProgress');
    await chrome.storage.local.remove('pendingGreeting');
    isRunning = false;
    isPaused = false;
    logToPanel('⏹️ 已停止投递，进度已清除', 'error');

    button.disabled = false;
    button.textContent = '🚀 开始自动投递';
    button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    pauseBtn.style.display = 'none';
    stopBtn.style.display = 'none';
  });

  document.body.appendChild(button);
  document.body.appendChild(pauseBtn);
  document.body.appendChild(stopBtn);
}

// 初始化
async function init() {
  // 如果在职位搜索页面
  if (window.location.href.includes('/web/geek/job')) {
    // 防止重复初始化
    if (window.bossAutoApplyJobPageInitialized) {
      return;
    }
    window.bossAutoApplyJobPageInitialized = true;

    logToPanel('📍 职位搜索页面，添加浮动按钮', 'success');
    // 等待页面完全加载
    await randomDelay(1000, 2000);
    addFloatingButton();

    // ★★★ 关键：检查是否有未完成的投递进度（从聊天页返回后触发）★★★
    const { applyProgress } = await chrome.storage.local.get('applyProgress');
    if (applyProgress && applyProgress.timestamp > Date.now() - 300000) {
      logToPanel('🔄 检测到未完成的投递进度，自动恢复投递...', 'success');
      logToPanel('📊 将从第 ' + applyProgress.nextIndex + ' 个职位继续，已投递 ' + applyProgress.applied + ' 个', 'info');

      // 等待页面完全稳定
      await randomDelay(2000, 3000);

      // 自动恢复投递（模拟点击"开始"按钮的效果）
      const applyBtn = document.getElementById('boss-auto-apply-btn');
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.textContent = '⏳ 投递中...';
        applyBtn.style.background = '#999';

        const pauseBtn = document.getElementById('boss-pause-btn');
        const stopBtn = document.getElementById('boss-stop-btn');
        if (pauseBtn) pauseBtn.style.display = 'block';
        if (stopBtn) stopBtn.style.display = 'block';
      }

      processJobs().finally(() => {
        const applyBtn = document.getElementById('boss-auto-apply-btn');
        if (applyBtn) {
          applyBtn.disabled = false;
          applyBtn.textContent = '🚀 开始自动投递';
          applyBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
        const pauseBtn = document.getElementById('boss-pause-btn');
        const stopBtn = document.getElementById('boss-stop-btn');
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        isPaused = false;
      });
    }
  }

  // 如果在聊天页面，检查是否有待发送的招呼语
  if (window.location.href.includes('/web/geek/chat')) {
    logToPanel('📍 [初始化] 检测到聊天页面', 'success');

    // 等待页面加载
    await randomDelay(1500, 2000);

    const { pendingGreeting } = await chrome.storage.local.get('pendingGreeting');

    if (pendingGreeting && pendingGreeting.timestamp > Date.now() - 300000) {
      logToPanel('✅ [初始化] 检测到待发送招呼语，准备自动发送', 'success');
      logToPanel('📝 [初始化] 招呼语内容: ' + pendingGreeting.message, 'info');
      await sendCustomGreeting();
      // sendCustomGreeting 最后会调用 history.back() 返回职位列表页
      // 返回后 content script 重新加载，init() 检测到 applyProgress 自动恢复
    }
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startAutoApply') {
    if (isRunning) {
      sendResponse({ error: '已有任务在运行中' });
      return;
    }

    // 触发浮动按钮点击（复用已有逻辑）
    const applyBtn = document.getElementById('boss-auto-apply-btn');
    if (applyBtn && !applyBtn.disabled) {
      applyBtn.click();
      sendResponse({ success: true });
    } else {
      // 如果按钮还没创建，直接启动
      processJobs().finally(() => {
        const btn = document.getElementById('boss-auto-apply-btn');
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🚀 开始自动投递';
          btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
      });
      sendResponse({ success: true });
    }
  }
});

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
