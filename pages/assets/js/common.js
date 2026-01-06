// LibreDomains 通用 JavaScript 文件
document.addEventListener('DOMContentLoaded', function () {
  // 初始化通用功能
  initNavigation();
  initAnimations();
  setCurrentYear();

  // 初始化滚动监听
  window.addEventListener('scroll', handleScroll);
});

// 导航功能
function initNavigation() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  // 移动端菜单切换
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');

      // 切换汉堡菜单动画
      const spans = navToggle.querySelectorAll('span');
      spans.forEach((span, index) => {
        if (navMenu.classList.contains('active')) {
          if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
          if (index === 1) span.style.opacity = '0';
          if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
          span.style.transform = '';
          span.style.opacity = '';
        }
      });
    });

    // 点击菜单项时关闭移动端菜单
    const navLinks = navMenu.querySelectorAll('.nav-link:not(.external)');
    navLinks.forEach((link) => {
      link.addEventListener('click', function () {
        navMenu.classList.remove('active');
        // 重置汉堡菜单
        const spans = navToggle.querySelectorAll('span');
        spans.forEach((span) => {
          span.style.transform = '';
          span.style.opacity = '';
        });
      });
    });

    // 点击外部区域关闭菜单
    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target) && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        const spans = navToggle.querySelectorAll('span');
        spans.forEach((span) => {
          span.style.transform = '';
          span.style.opacity = '';
        });
      }
    });
  }
}

// 滚动处理
function handleScroll() {
  const navbar = document.getElementById('navbar');

  // 导航栏滚动效果
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
}

// 动画功能
function initAnimations() {
  // 滚动动画观察器
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
      }
    });
  }, observerOptions);

  // 观察需要动画的元素
  const animatedElements = document.querySelectorAll(
    '.feature-card, .stat-card, .process-step, .dns-record-item, .form-step',
  );

  animatedElements.forEach((el) => {
    observer.observe(el);
  });

  // 鼠标跟随效果（仅在桌面端）
  if (window.innerWidth > 768) {
    document.addEventListener('mousemove', throttle((e) => {
      const floatingElements = document.querySelectorAll('.floating-element');

      floatingElements.forEach((element, index) => {
        const speed = (index + 1) * 0.02;
        const x = (e.clientX * speed) / 100;
        const y = (e.clientY * speed) / 100;

        element.style.transform = `translate(${x}px, ${y}px)`;
      });
    }, 16)); // 约60fps
  }
}

// 设置当前年份
function setCurrentYear() {
  const yearElements = document.querySelectorAll('#currentYear');
  const currentYear = new Date().getFullYear();

  yearElements.forEach((element) => {
    element.textContent = currentYear;
  });
}

// 统计数据动画
function animateNumber(element, targetNumber, duration = 2000) {
  if (!element) return;

  const startNumber = parseInt(element.textContent) || 0;
  const startTime = performance.now();

  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // 使用缓动函数
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentNumber = Math.floor(startNumber + (targetNumber - startNumber) * easeOutQuart);

    element.textContent = currentNumber.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.textContent = targetNumber.toLocaleString();
    }
  }

  requestAnimationFrame(animate);
}

// 复制到剪贴板
function copyToClipboard(text) {
  return navigator.clipboard.writeText(text).then(() => {
    return true;
  }).catch(() => {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  });
}

// 显示通知
function showNotification(message, type = 'info', duration = 3000) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;

  // 添加样式
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        min-width: 300px;
        max-width: 500px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        border-left: 4px solid ${getNotificationColor(type)};
    `;

  // 添加到页面
  document.body.appendChild(notification);

  // 动画显示
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);

  // 关闭按钮事件
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn.addEventListener('click', () => {
    closeNotification(notification);
  });

  // 自动关闭
  if (duration > 0) {
    setTimeout(() => {
      closeNotification(notification);
    }, duration);
  }

  return notification;
}

function getNotificationIcon(type) {
  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle',
  };
  return icons[type] || icons.info;
}

function getNotificationColor(type) {
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  return colors[type] || colors.info;
}

function closeNotification(notification) {
  notification.style.transform = 'translateX(100%)';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// 工具函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 表单验证工具
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateSubdomain(subdomain) {
  if (!subdomain) return false;

  // 长度检查
  if (subdomain.length < 3 || subdomain.length > 63) return false;

  // 格式检查
  const pattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  if (!pattern.test(subdomain)) return false;

  // 保留域名检查
  const reservedSubdomains = [
    'www', 'mail', 'email', 'webmail', 'ns', 'dns',
    'api', 'cdn', 'ftp', 'sftp',
    'admin', 'panel', 'dashboard', 'control',
    'dev', 'test', 'staging', 'demo',
    'blog', 'forum', 'wiki', 'docs', 'tv',
    'app', 'mobile', 'static', 'assets',
  ];

  if (reservedSubdomains.includes(subdomain)) return false;

  return true;
}

// 错误处理
window.addEventListener('error', function (e) {
  console.error('JavaScript错误:', e.error);

  // 在开发环境下显示错误通知
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    showNotification('发生了一个错误，请查看控制台', 'error');
  }
});

// 性能监控
window.addEventListener('load', function () {
  const loadTime = performance.now();
  console.log(`页面加载时间: ${loadTime.toFixed(2)}ms`);

  // 检查性能
  if (loadTime > 3000) {
    console.warn('页面加载时间较长，建议优化');
  }
});

// 导出常用函数供其他脚本使用
window.LibreDomains = {
  copyToClipboard,
  showNotification,
  animateNumber,
  validateEmail,
  validateSubdomain,
  debounce,
  throttle,
};
