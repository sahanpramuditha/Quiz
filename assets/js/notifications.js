/**
 * NotificationManager
 * Handles toast notifications and user feedback
 */

class NotificationManager {
    constructor() {
        this.container = null;
        this.position = 'top-right';
        this.soundEnabled = true;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.updatePosition();
        document.body.appendChild(this.container);

        // Load preferences
        this.loadPreferences();
    }

    updatePosition() {
        if (!this.container) return;
        
        const positions = {
            'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
            'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
            'bottom-right': { bottom: '20px', right: '20px', left: 'auto', top: 'auto' },
            'bottom-left': { bottom: '20px', left: '20px', right: 'auto', top: 'auto' }
        };

        const pos = positions[this.position] || positions['top-right'];
        this.container.style.cssText = `
            position: fixed;
            ${pos.top ? `top: ${pos.top};` : ''}
            ${pos.right ? `right: ${pos.right};` : ''}
            ${pos.bottom ? `bottom: ${pos.bottom};` : ''}
            ${pos.left ? `left: ${pos.left};` : ''}
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
    }

    setPosition(position) {
        this.position = position;
        this.updatePosition();
        this.savePreferences();
    }

    loadPreferences() {
        const prefs = localStorage.getItem('notificationPreferences');
        if (prefs) {
            const parsed = JSON.parse(prefs);
            if (parsed.position) this.position = parsed.position;
            if (parsed.soundEnabled !== undefined) this.soundEnabled = parsed.soundEnabled;
            this.updatePosition();
        }
    }

    savePreferences() {
        const prefs = localStorage.getItem('notificationPreferences');
        let parsed = {};
        if (prefs) {
            parsed = JSON.parse(prefs);
        }
        parsed.position = this.position;
        parsed.soundEnabled = this.soundEnabled;
        localStorage.setItem('notificationPreferences', JSON.stringify(parsed));
    }

    enableSound(enabled) {
        this.soundEnabled = enabled;
        this.savePreferences();
    }

    show(message, type = 'info', duration = 3000, options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Pause on hover
        let pauseTimer = false;
        let remainingTime = duration;
        let startTime = Date.now();
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        let content = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || icons.info}</span>
                <span class="notification-message">${message}</span>
        `;

        // Add action buttons if provided
        if (options.actions && options.actions.length > 0) {
            content += '<div class="notification-actions">';
            options.actions.forEach((action, index) => {
                content += `<button class="notification-action-btn" onclick="notifications.handleAction('${notification.id || Date.now()}', ${index})">${action.label}</button>`;
            });
            content += '</div>';
        }

        // Add progress bar if provided
        if (options.progress !== undefined) {
            content += `<div class="notification-progress"><div class="notification-progress-bar" style="width: ${options.progress}%"></div></div>`;
        }

        content += `
                <button class="notification-close" onclick="notifications.remove(this.closest('.notification'))">×</button>
            </div>
        `;
        
        notification.innerHTML = content;
        notification.id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Store actions
        if (options.actions) {
            notification.dataset.actions = JSON.stringify(options.actions);
        }

        // Click to open notification center
        if (options.clickToOpen !== false && typeof notificationCenter !== 'undefined') {
            notification.style.cursor = 'pointer';
            notification.addEventListener('click', (e) => {
                if (!e.target.closest('.notification-close') && !e.target.closest('.notification-action-btn')) {
                    notificationCenter.openNotificationCenter();
                }
            });
        }
        
        this.container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Pause on hover
        notification.addEventListener('mouseenter', () => {
            pauseTimer = true;
            remainingTime = duration - (Date.now() - startTime);
        });

        notification.addEventListener('mouseleave', () => {
            if (pauseTimer) {
                pauseTimer = false;
                startTime = Date.now();
                if (remainingTime > 0) {
                    setTimeout(() => {
                        if (!pauseTimer) {
                            this.remove(notification);
                        }
                    }, remainingTime);
                }
            }
        });
        
        // Auto remove
        if (duration > 0 && !pauseTimer) {
            setTimeout(() => {
                if (!pauseTimer) {
                    this.remove(notification);
                }
            }, duration);
        }

        // Play sound
        if (this.soundEnabled && typeof notificationCenter !== 'undefined') {
            notificationCenter.playNotificationSound(type);
        }
        
        return notification;
    }

    handleAction(notificationId, actionIndex) {
        const notification = document.getElementById(notificationId);
        if (!notification) return;

        const actionsStr = notification.dataset.actions;
        if (!actionsStr) return;

        const actions = JSON.parse(actionsStr);
        const action = actions[actionIndex];
        if (action && action.onclick) {
            action.onclick();
        }
        this.remove(notification);
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    showWithAction(message, type, actions, duration = 5000) {
        return this.show(message, type, duration, { actions: actions });
    }

    showProgress(message, progress, type = 'info') {
        const notification = this.show(message, type, 0, { progress: progress });
        return notification;
    }

    updateProgress(notification, progress) {
        if (!notification) return;
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }

    remove(notification) {
        if (typeof notification === 'string') {
            notification = document.getElementById(notification);
        }
        if (!notification) return;
        
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }

    clear() {
        this.container.innerHTML = '';
    }
}

const notifications = new NotificationManager();

