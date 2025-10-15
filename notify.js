// 美化弹框通知系统
(function () {
    let initialized = false;
    let initPending = false;
    let notifyQueue = [];
    let toastQueue = [];
    let alertQueue = [];
    let container;

    // 样式和内联SVG定义
    const styles = `
    .notify-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
    }
    .notify-box {
        max-width: calc(100vw - 40px);
        width: 350px;
        border-radius: 8px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.12);
        overflow: hidden;
        transform: translateX(120%);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        opacity: 0;
        background: white;
    }
    .notify-box.show {
        transform: translateX(0);
        opacity: 1;
    }
    .notify-header {
        display: flex;
        align-items: center;
        padding: 14px 16px;
        color: white;
    }
    .notify-icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .notify-title {
        font-weight: bold;
        font-size: 15px;
        flex-grow: 1;
    }
    .notify-close {
        cursor: pointer;
        font-size: 20px;
        opacity: 0.7;
        transition: opacity 0.2s;
    }
    .notify-close:hover {
        opacity: 1;
    }
    .notify-content {
        padding: 16px;
        color: #333;
        line-height: 1.5;
        max-height: 300px;
        overflow: scroll;
        scrollbar-width: none;
    }
    .notify-timer {
        height: 4px;
        width: 100%;
        background: rgba(0,0,0,0.08);
    }
    .notify-progress {
        height: 100%;
        width: 100%;
        transition: width linear;
    }
    
    /* Toast 样式 */
    .toast-container {
        position: fixed;
        bottom: 50px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
    }
    .toast-box {
        max-width: calc(100vw - 40px);
        padding: 12px 20px;
        border-radius: 12px;
        background: rgba(0,0,0,0.75);
        color: white;
        text-align: center;
        font-size: 14px;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    .toast-box.show {
        opacity: 1;
    }
    `;

    // 内联SVG图标
    const icons = {
        success: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
        error: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`,
        warning: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
        info: `<svg viewBox="0 0 24 24" width="24" height="24"><path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`
    };

    function init() {
        if (initialized || initPending) return;
        
        initPending = true;
        
        const onReady = () => {
            // 初始化样式
            const styleElement = document.createElement('style');
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);

            // 创建通知容器
            container = document.createElement('div');
            container.className = 'notify-container';
            document.body.appendChild(container);

            initialized = true;
            initPending = false;
            
            // 处理队列中的通知
            notifyQueue.forEach(args => notify(...args));
            toastQueue.forEach(args => toast(...args));
            alertQueue.forEach(args => alert(...args));
            
            notifyQueue = [];
            toastQueue = [];
            alertQueue = [];
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    // 美化弹框通知方法
    window.notify = function (options) {
        if (!initialized) {
            notifyQueue.push([options]);
            init();
            return {
                dismiss: function() {}
            };
        }
        
        const {
            type = 'info',
            title = '通知',
            content = '',
            html = '',
            timeout = 5000,
            logo = '',
            showProgress = true
        } = options;

        const box = document.createElement('div');
        box.className = `notify-box ${type}`;

        // 设置颜色
        let bgColor;
        switch (type) {
            case 'success': bgColor = '#4CAF50'; break;
            case 'error': bgColor = '#F44336'; break;
            case 'warning': bgColor = '#FF9800'; break;
            default: bgColor = '#2196F3';
        }

        // 构建通知
        const header = document.createElement('div');
        header.className = 'notify-header';
        header.style.backgroundColor = bgColor;

        const iconContainer = document.createElement('div');
        iconContainer.className = 'notify-icon';
        iconContainer.innerHTML = icons[type] || icons.info;

        const titleElement = document.createElement('div');
        titleElement.className = 'notify-title';
        titleElement.textContent = title;

        const closeBtn = document.createElement('div');
        closeBtn.className = 'notify-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => dismissNotification(box);

        header.appendChild(iconContainer);
        if (logo) {
            const logoImg = document.createElement('img');
            logoImg.src = logo;
            logoImg.style.height = '20px';
            logoImg.style.marginRight = '10px';
            header.insertBefore(logoImg, iconContainer);
        }
        header.appendChild(titleElement);
        header.appendChild(closeBtn);

        // 内容区域
        const contentElement = document.createElement('div');
        contentElement.className = 'notify-content';
        contentElement.innerHTML = html || content;

        // 进度条
        const timerBar = document.createElement('div');
        timerBar.className = 'notify-timer';
        const progress = document.createElement('div');
        progress.className = 'notify-progress';
        progress.style.backgroundColor = bgColor;
        if (showProgress) timerBar.appendChild(progress);

        // 组装通知
        box.appendChild(header);
        box.appendChild(contentElement);
        box.appendChild(timerBar);
        container.appendChild(box);

        // 显示动画
        setTimeout(() => box.classList.add('show'), 10);

        // 自动关闭处理
        let timer;
        const startTime = Date.now();

        if (timeout > 0) {
            if (showProgress) {
                progress.style.transitionDuration = `${timeout}ms`;
                setTimeout(() => progress.style.width = '0', 10);
            }

            timer = setTimeout(() => dismissNotification(box), timeout);

            box.onmouseenter = () => clearTimeout(timer);
            box.onmouseleave = () => {
                const remaining = timeout - (Date.now() - startTime);
                if (remaining > 0) {
                    timer = setTimeout(() => dismissNotification(box), remaining);
                }
            };
        }

        function dismissNotification(element) {
            element.classList.remove('show');
            setTimeout(() => element.remove(), 300);
        }

        return {
            dismiss: () => dismissNotification(box)
        };
    };

    // 系统通知封装
    window.systemNotify = function (options) {
        if (!("Notification" in window)) {
            console.warn("此浏览器不支持系统通知");
            return null;
        }

        const defaultOptions = {
            title: '通知',
            body: '',
            icon: '',
            timeout: 5000,
            onClick: null,
            tag: 'default-notification'
        };

        const { title, body, icon, timeout, onClick, tag } = { ...defaultOptions, ...options };

        // 权限处理
        if (Notification.permission === "granted") {
            showNotification();
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") showNotification();
            });
        }

        function showNotification() {
            const notification = new Notification(title, {
                body,
                icon: icon || getDefaultIcon(options.type),
                tag,
                silent: true
            });

            if (onClick) notification.onclick = onClick;
            if (timeout > 0) setTimeout(() => notification.close(), timeout);

            return notification;
        }

        function getDefaultIcon(type) {
            // 转换为data URL的内联SVG
            const svgs = {
                success: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%234CAF50' d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z'/></svg>`,
                error: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23F44336' d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z'/></svg>`,
                warning: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23FF9800' d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2V7h2v6z'/></svg>`,
                info: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%232196F3' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/></svg>`
            };
            return svgs[type] || svgs.info;
        }
    };

    // 添加 toast 方法
    window.toast = function(content) {
        if (!initialized) {
            toastQueue.push([content]);
            init();
            return {
                dismiss: function() {}
            };
        }
        
        // 固定显示时间为3000毫秒
        const duration = 3000;
        
        // 获取所有现有toast容器
        const existingToasts = document.querySelectorAll('.toast-container');
        
        // 将现有toast上移
        existingToasts.forEach(toast => {
            const currentBottom = parseInt(toast.style.bottom || '50px');
            toast.style.bottom = (currentBottom + 60) + 'px';
        });
        
        const toast = document.createElement('div');
        toast.className = 'toast-container';
        toast.style.bottom = '50px'; // 新toast初始位置
        
        const toastContent = document.createElement('div');
        toastContent.className = 'toast-box';
        toastContent.textContent = content;
        // 添加点击关闭功能
        toastContent.style.cursor = 'pointer';
        toastContent.onclick = function() {
            toastContent.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };
        
        toast.appendChild(toastContent);
        document.body.appendChild(toast);
        
        setTimeout(() => toastContent.classList.add('show'), 10);
        
        setTimeout(() => {
            toastContent.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
        
        return {
            dismiss: () => {
                toastContent.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        };
    };

    // 添加 alert 方法
    window.alert = function(message) {
        if (!initialized) {
            alertQueue.push([message]);
            init();
            return false;
        }
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        overlay.style.zIndex = '9998';
        
        const box = document.createElement('div');
        box.className = 'notify-box alert-style';
        box.style.position = 'fixed';
        box.style.top = '50%';
        box.style.left = '50%';
        box.style.transform = 'translate(-50%, -50%)';
        box.style.width = '280px';
        box.style.background = 'white';
        box.style.borderRadius = '5px';
        box.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        box.style.border = '1px solid #e0e0e0';
        box.style.zIndex = '9999';
        box.style.overflow = 'hidden';

        // 消息内容
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        messageElement.style.padding = '20px';
        messageElement.style.fontSize = '16px';
        messageElement.style.textAlign = 'center';

        // 增加分隔线
        const divider = document.createElement('div');
        divider.style.height = '1px';
        divider.style.backgroundColor = '#e0e0e0';
        divider.style.margin = '0';

        // 修改确定按钮样式
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '确定';
        confirmBtn.style.background = 'white';
        confirmBtn.style.color = '#007AFF';
        confirmBtn.style.border = 'none';
        confirmBtn.style.width = '100%';
        confirmBtn.style.padding = '12px 0';
        confirmBtn.style.fontSize = '16px';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.onclick = function() {
            box.classList.remove('show');
            overlay.classList.remove('show');
            setTimeout(() => {
                box.remove();
                overlay.remove();
            }, 300);
        };

        box.appendChild(messageElement);
        box.appendChild(divider);  // 添加分隔线
        box.appendChild(confirmBtn);
        
        document.body.appendChild(overlay);
        document.body.appendChild(box);

        // 显示动画
        setTimeout(() => {
            overlay.classList.add('show');
            box.classList.add('show');
        }, 10);

        // 阻止默认alert行为
        return false;
    };

     //Worker Timer 延迟执行函数
     const workerScript = `
     self.onmessage = function(e) {
         const { delay, taskName } = e.data;
         const start = performance.now();
     
         const timer = setInterval(() => {
             const elapsed = performance.now() - start;
             if (elapsed >= delay) {
                 clearInterval(timer);
                 self.postMessage({ 
                     status: 'completed',
                     task: taskName 
                 });
             }
         }, 100);
     };
     `;
     
    const blob = new Blob([workerScript], { type: 'application/javascript' });

    // 定义 setWorker
    window.setWorker = function (delayMs, taskFunc, callback) {
        const worker = new Worker(URL.createObjectURL(blob));

        worker.postMessage({
            delay: delayMs,
            taskName: taskFunc.name
        });

        worker.onmessage = (e) => {
            if (e.data.status === 'completed') {
                taskFunc();
                if (callback) callback(); // 如果有回调函数，执行回调
                worker.terminate();
            }
        };

        return {
            cancel: () => worker.terminate()
        };
    };

    // 快捷方法
    ['success', 'error', 'warning', 'info'].forEach(type => {
        notify[type] = opts => {
            if (typeof opts === 'string') {
                // 支持简洁调用方式
                notify({ type, content: opts, title: '通知', timeout: 5000 });
            } else {
                // 保留原有功能
                notify({ type, ...opts });
            }
        };
        systemNotify[type] = opts => {
            if (typeof opts === 'string') {
                // 支持简洁调用方式
                systemNotify({ type, body: opts, title: '通知', timeout: 5000 });
            } else {
                // 保留原有功能
                systemNotify({ type, ...opts });
            }
        };
    });

    // 自动初始化
    init();
})();