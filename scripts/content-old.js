// BOSS直聘自动投递 - 内容脚本
console.log('🚀 BOSS直聘自动投递助手已加载');

// 默认配置
const DEFAULT_CONFIG = {
  keywords: ['前端', 'JavaScript', 'React', 'Vue'],
  excludeKeywords: ['外包', '派遣', '实习'],
  minSalary: 15,
  maxSalary: 40,
  experience: [],
  city: '101010100', // 北京
  autoGreeting: true,
  greetingTemplate: '您好，我对这个职位很感兴趣，我有{experience}的相关经验，期待与您进一步沟通。',
  maxJobs: 50,
  delay: 2000,
  autoSearch: true // 是否自动搜索
};

// 获取配置
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('config', (result) => {
      resolve(result.config || DEFAULT_CONFIG);
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

// 解析薪资范围
function parseSalary(salaryText) {
  const match = salaryText.match(/(\d+)-(\d+)K/);
  if (match) {
    return {
      min: parseInt(match[1]),
      max: parseInt(match[2])
    };
  }
  return null;
}

// 计算职位匹配度
function calculateMatch(job, config) {
  let score = 0;
  const reasons = [];

  // 关键词匹配 (40分)
  const titleAndDesc = (job.title + ' ' + job.description).toLowerCase();
  const matchedKeywords = config.keywords.filter(k =>
    titleAndDesc.includes(k.toLowerCase())
  );
  if (matchedKeywords.length > 0) {
    score += Math.min(40, matchedKeywords.length * 15);
    reasons.push(`匹配关键词: ${matchedKeywords.join(', ')}`);
  }

  // 排除关键词检查
  const hasExcluded = config.excludeKeywords.some(k =>
    titleAndDesc.includes(k.toLowerCase())
  );
  if (hasExcluded) {
    return { score: 0, reasons: ['包含排除关键词'] };
  }

  // 薪资匹配 (30分)
  const salary = parseSalary(job.salary);
  if (salary) {
    if (salary.min >= config.minSalary && salary.max <= config.maxSalary) {
      score += 30;
      reasons.push('薪资符合预期');
    } else if (salary.max >= config.minSalary) {
      score += 15;
      reasons.push('薪资部分符合');
    }
  }

  // 经验匹配 (30分)
  if (config.experience && Array.isArray(config.experience) && config.experience.length > 0) {
    if (config.experience.some(exp => job.experience.includes(exp))) {
      score += 30;
      reasons.push('经验要求匹配');
    }
  }

  return { score, reasons };
}

// 提取职位信息
function extractJobInfo(element) {
  try {
    console.log('🔍 正在提取职位信息，元素HTML:', element.outerHTML.substring(0, 200));

    const titleEl = element.querySelector('.job-title, [class*="job-name"]');
    const salaryEl = element.querySelector('.salary, [class*="salary"]');
    const companyEl = element.querySelector('.company-name, [class*="company"]');
    const experienceEl = element.querySelector('[class*="experience"], [class*="tag-list"] li:first-child');
    const descEl = element.querySelector('.job-desc, [class*="desc"]');
    const linkEl = element.querySelector('a[href*="/job_detail/"]');

    console.log('找到的元素:', {
      title: titleEl?.textContent,
      salary: salaryEl?.textContent,
      company: companyEl?.textContent
    });

    if (!titleEl || !linkEl) return null;

    return {
      id: linkEl.href.match(/job_detail\/([^?]+)/)?.[1] || '',
      title: titleEl.textContent.trim(),
      salary: salaryEl?.textContent.trim() || '',
      company: companyEl?.textContent.trim() || '',
      experience: experienceEl?.textContent.trim() || '',
      description: descEl?.textContent.trim() || '',
      url: linkEl.href
    };
  } catch (e) {
    console.error('提取职位信息失败:', e);
    return null;
  }
}

// 生成个性化招呼语
function generateGreeting(job, config) {
  let greeting = config.greetingTemplate;
  greeting = greeting.replace('{experience}', job.experience || '多年');
  greeting = greeting.replace('{position}', job.title);
  greeting = greeting.replace('{company}', job.company);
  return greeting;
}

// 点击沟通按钮
async function clickChatButton(jobElement) {
  const chatBtn = jobElement.querySelector('.start-chat-btn, [class*="chat"], button[ka*="chat"]');
  if (chatBtn && !chatBtn.disabled) {
    chatBtn.click();
    return true;
  }
  return false;
}

// 发送招呼语
async function sendGreeting(greeting, retries = 3) {
  for (let i = 0; i < retries; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const textarea = document.querySelector('textarea[placeholder*="招呼"], .chat-input textarea');
    const sendBtn = document.querySelector('.send-message, [class*="send-btn"]');

    if (textarea && sendBtn) {
      textarea.value = greeting;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 500));
      sendBtn.click();
      return true;
    }
  }
  return false;
}

// 主处理函数
async function processJobs() {
  const config = await getConfig();
  console.log('📋 当前配置:', config);

  // 检查是否在搜索结果页
  if (!window.location.href.includes('/web/geek/job')) {
    alert('请先在BOSS直聘搜索职位，然后再点击"开始自动投递"按钮');
    return;
  }

  // 查找所有职位卡片 - 尝试多种选择器
  let jobElements = document.querySelectorAll('.job-card-wrapper');
  console.log(`尝试选择器 .job-card-wrapper: ${jobElements.length} 个`);

  if (jobElements.length === 0) {
    jobElements = document.querySelectorAll('[class*="job-card"]');
    console.log(`尝试选择器 [class*="job-card"]: ${jobElements.length} 个`);
  }

  if (jobElements.length === 0) {
    jobElements = document.querySelectorAll('li.job-list-box');
    console.log(`尝试选择器 li.job-list-box: ${jobElements.length} 个`);
  }

  if (jobElements.length === 0) {
    jobElements = document.querySelectorAll('li[class*="job"]');
    console.log(`尝试选择器 li[class*="job"]: ${jobElements.length} 个`);
  }

  console.log(`📊 最终找到 ${jobElements.length} 个职位`);

  let processed = 0;
  let applied = 0;
  const results = [];

  for (const element of jobElements) {
    if (applied >= config.maxJobs) {
      console.log('✅ 已达到最大投递数量');
      break;
    }

    const job = extractJobInfo(element);
    if (!job) continue;

    // 检查是否已投递
    if (await isApplied(job.id)) {
      console.log(`⏭️  跳过已投递: ${job.title}`);
      continue;
    }

    // 计算匹配度
    const match = calculateMatch(job, config);
    console.log(`📊 ${job.title} - 匹配度: ${match.score}分`);

    if (match.score >= 60) {
      console.log(`✅ 准备投递: ${job.title}`);

      // 点击沟通按钮
      const clicked = await clickChatButton(element);
      if (clicked) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 发送招呼语
        if (config.autoGreeting) {
          const greeting = generateGreeting(job, config);
          const sent = await sendGreeting(greeting);
          if (sent) {
            console.log(`💬 已发送招呼语: ${greeting}`);
          }
        }

        // 保存记录
        await saveRecord({ ...job, matchScore: match.score, matchReasons: match.reasons });
        applied++;
        results.push({ job, success: true, match });

        // 延迟
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
    } else {
      console.log(`❌ 匹配度不足: ${job.title} (${match.score}分)`);
      results.push({ job, success: false, match });
    }

    processed++;
  }

  // 显示结果
  showResults(results, applied);
}

// 显示结果面板
function showResults(results, applied) {
  const panel = document.createElement('div');
  panel.id = 'boss-auto-apply-results';
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 600px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    padding: 20px;
    z-index: 10000;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
      <h3 style="margin: 0; font-size: 18px;">投递结果</h3>
      <button id="close-results" style="border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
    </div>
    <div style="margin-bottom: 15px; padding: 10px; background: #f0f9ff; border-radius: 4px;">
      <p style="margin: 0; color: #0369a1;">✅ 成功投递: ${applied} 个职位</p>
    </div>
    <div style="max-height: 400px; overflow-y: auto;">
      ${results.filter(r => r.success).map(r => `
        <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 5px;">${r.job.title}</div>
          <div style="font-size: 12px; color: #6b7280;">${r.job.company} | ${r.job.salary}</div>
          <div style="font-size: 12px; color: #059669; margin-top: 5px;">匹配度: ${r.match.score}分</div>
        </div>
      `).join('')}
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('close-results').addEventListener('click', () => {
    panel.remove();
  });
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoApply') {
    processJobs().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // 保持消息通道开启
  }
});

// 添加浮动按钮
function addFloatingButton() {
  const button = document.createElement('button');
  button.id = 'boss-auto-apply-btn';
  button.textContent = '🚀 开始自动投递';
  button.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    transition: all 0.3s ease;
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
    button.disabled = true;
    button.textContent = '⏳ 处理中...';
    processJobs().finally(() => {
      button.disabled = false;
      button.textContent = '🚀 开始自动投递';
    });
  });

  document.body.appendChild(button);
}

// 页面加载完成后的初始化
async function init() {
  // 防止重复初始化
  if (window.bossAutoApplyInitialized) {
    console.log('⚠️ 已初始化，跳过');
    return;
  }

  // 只在职位搜索页面初始化
  if (!window.location.href.includes('/web/geek/job')) {
    console.log('⚠️ 不在职位搜索页面，跳过初始化');
    return;
  }

  window.bossAutoApplyInitialized = true;
  console.log('✅ 初始化成功，当前页面:', window.location.href);
  addFloatingButton();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
