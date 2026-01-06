// 主页专用 JavaScript 文件
document.addEventListener('DOMContentLoaded', function () {
  // 初始化主页功能
  initStats();
  initHeroAnimations();
});

// 初始化统计数据
function initStats() {
  // 获取真实统计数据
  fetchRealStats().then((stats) => {
    // 延迟启动动画，等待页面加载完成
    setTimeout(() => {
      // 更新统计数字
      const totalDomainsElement = document.getElementById('totalDomains');
      const totalUsersElement = document.getElementById('totalUsers');
      const footerTotalDomainsElement = document.getElementById('footerTotalDomains');

      if (totalDomainsElement) {
        LibreDomains.animateNumber(totalDomainsElement, stats.totalDomains, 2000);
      }

      if (totalUsersElement) {
        LibreDomains.animateNumber(totalUsersElement, stats.totalUsers, 2500);
      }

      if (footerTotalDomainsElement) {
        LibreDomains.animateNumber(footerTotalDomainsElement, stats.totalDomains, 2000);
      }
    }, 1000);
  }).catch((error) => {
    console.error('获取统计数据失败:', error);
    // 使用默认数据
    const defaultStats = { totalDomains: 0, totalUsers: 0 };
    updateStatsDisplay(defaultStats);
  });
}

// 获取真实统计数据
async function fetchRealStats() {
  try {
    // 计算domains目录下的实际域名数量
    const stats = await calculateDomainStats();
    return stats;
  } catch (error) {
    console.error('计算统计数据失败:', error);
    // 返回默认值
    return {
      totalDomains: 0,
      totalUsers: 0,
    };
  }
}

// 计算域名统计
async function calculateDomainStats() {
  try {
    // 这里应该调用GitHub API或者读取本地数据
    // 由于是静态页面，我们使用一个更智能的方法

    // 尝试从GitHub API获取数据
    const response = await fetch('https://api.github.com/repos/bestzwei/LibreDomains/contents/domains');

    if (response.ok) {
      const domains = await response.json();
      let totalDomains = 0;
      let totalUsers = 0;

      // 遍历每个域名目录
      for (const domain of domains) {
        if (domain.type === 'dir') {
          try {
            const domainResponse = await fetch(domain.url);
            if (domainResponse.ok) {
              const domainFiles = await domainResponse.json();
              const jsonFiles = domainFiles.filter(file =>
                file.name.endsWith('.json') && file.name !== 'README.md',
              );
              totalDomains += jsonFiles.length;

              // 计算唯一用户数（这里简化处理）
              totalUsers += Math.ceil(jsonFiles.length * 0.8); // 假设80%的域名对应不同用户
            }
          } catch (error) {
            console.warn(`获取域名 ${domain.name} 数据失败:`, error);
          }
        }
      }

      return {
        totalDomains: totalDomains,
        totalUsers: Math.min(totalUsers, totalDomains), // 用户数不能超过域名数
      };
    } else {
      throw new Error('GitHub API请求失败');
    }
  } catch (error) {
    console.warn('从GitHub API获取数据失败，使用本地计算:', error);

    // 降级方案：基于已知的域名列表计算
    return calculateLocalStats();
  }
}

// 本地统计计算（降级方案）
function calculateLocalStats() {
  // 基于已知的域名配置
  const knownDomains = [
    'ciao.su', 'ciallo.de',
  ];

  // 估算每个域名的平均子域名数量
  const avgSubdomainsPerDomain = 25;
  const estimatedTotal = knownDomains.length * avgSubdomainsPerDomain;

  return {
    totalDomains: estimatedTotal,
    totalUsers: Math.ceil(estimatedTotal * 0.7), // 估算70%的域名对应不同用户
  };
}

// 更新统计显示
function updateStatsDisplay(stats) {
  const totalDomainsElement = document.getElementById('totalDomains');
  const totalUsersElement = document.getElementById('totalUsers');
  const footerTotalDomainsElement = document.getElementById('footerTotalDomains');

  if (totalDomainsElement) {
    LibreDomains.animateNumber(totalDomainsElement, stats.totalDomains, 2000);
  }

  if (totalUsersElement) {
    LibreDomains.animateNumber(totalUsersElement, stats.totalUsers, 2500);
  }

  if (footerTotalDomainsElement) {
    LibreDomains.animateNumber(footerTotalDomainsElement, stats.totalDomains, 2000);
  }
}

// 初始化英雄区域动画
function initHeroAnimations() {
  // 添加视差滚动效果
  window.addEventListener('scroll', LibreDomains.throttle(() => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    const heroBackground = document.querySelector('.hero-background');

    if (hero && heroBackground) {
      // 视差效果
      heroBackground.style.transform = `translateY(${scrolled * 0.5}px)`;
    }

    // 浮动元素的额外动画
    const floatingElements = document.querySelectorAll('.floating-element');
    floatingElements.forEach((element, index) => {
      const speed = 0.1 + (index * 0.05);
      element.style.transform += ` translateY(${scrolled * speed}px)`;
    });
  }, 16));

  // 统计卡片悬停效果
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach((card) => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-10px) scale(1.02)';
    });

    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });

  // 功能卡片交互效果
  const featureCards = document.querySelectorAll('.feature-card');
  featureCards.forEach((card) => {
    card.addEventListener('mouseenter', function () {
      // 添加发光效果
      this.style.boxShadow = '0 20px 40px rgba(99, 102, 241, 0.2)';
    });

    card.addEventListener('mouseleave', function () {
      this.style.boxShadow = '';
    });
  });

  // 流程步骤动画
  const processSteps = document.querySelectorAll('.process-step');
  processSteps.forEach((step, index) => {
    // 延迟显示动画
    setTimeout(() => {
      step.classList.add('fade-in');
    }, index * 200);

    // 悬停效果
    step.addEventListener('mouseenter', function () {
      const stepNumber = this.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.style.transform = 'scale(1.1) rotate(5deg)';
      }
    });

    step.addEventListener('mouseleave', function () {
      const stepNumber = this.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.style.transform = 'scale(1) rotate(0deg)';
      }
    });
  });
}

// 添加页面特定的样式
const style = document.createElement('style');
style.textContent = `
    .stat-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .feature-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .process-step .step-number {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .hero-background {
        transition: transform 0.1s ease-out;
    }

    .floating-element {
        transition: transform 0.1s ease-out;
    }
`;
document.head.appendChild(style);
