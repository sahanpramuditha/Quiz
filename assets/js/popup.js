/**
 * PopupManager
 * Handles different types of popups (info, warning, success, error)
 */

class PopupManager {
    constructor() {
        this.currentPopups = [];
    }

    show(options) {
        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        
        const popupContent = document.createElement('div');
        popupContent.className = `popup-content popup-${options.type || 'info'}`;
        
        if (options.size) {
            popupContent.classList.add(`popup-${options.size}`);
        }

        // Icon
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const icon = options.icon || icons[options.type || 'info'];

        // Header
        if (options.title || icon) {
            const header = document.createElement('div');
            header.className = 'popup-header';
            header.innerHTML = `
                ${icon ? `<span class="popup-icon" style="font-size: 2rem; margin-right: 15px;">${icon}</span>` : ''}
                ${options.title ? `<h2 style="margin: 0; flex: 1;">${options.title}</h2>` : ''}
                <button class="popup-close" onclick="popupManager.close('${popup.id || Date.now()}')">×</button>
            `;
            popupContent.appendChild(header);
        }

        // Body
        const body = document.createElement('div');
        body.className = 'popup-body';
        if (options.content) {
            body.innerHTML = options.content;
        } else if (options.html) {
            body.appendChild(options.html);
        } else if (options.message) {
            body.innerHTML = `<p>${options.message}</p>`;
        }
        popupContent.appendChild(body);

        // Footer
        if (options.buttons && options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'popup-footer';
            options.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `btn ${button.class || ''}`;
                btn.textContent = button.text;
                btn.onclick = () => {
                    if (button.onclick) {
                        const result = button.onclick();
                        if (result !== false) {
                            this.close(popup.id);
                        }
                    } else {
                        this.close(popup.id);
                    }
                };
                footer.appendChild(btn);
            });
            popupContent.appendChild(footer);
        }

        popup.appendChild(popupContent);
        popup.id = 'popup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        document.body.appendChild(popup);

        // Animate in
        setTimeout(() => {
            popup.classList.add('active');
        }, 10);

        // Auto close
        if (options.autoClose && options.autoClose > 0) {
            setTimeout(() => {
                this.close(popup.id);
            }, options.autoClose);
        }

        // Close on overlay click
        popup.addEventListener('click', (e) => {
            if (e.target === popup && options.closeOnOverlay !== false) {
                this.close(popup.id);
            }
        });

        // Close on ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close(popup.id);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        this.currentPopups.push(popup);
        return popup;
    }

    close(popupId) {
        let popup;
        if (typeof popupId === 'string') {
            popup = document.getElementById(popupId);
        } else {
            popup = popupId;
        }

        if (popup) {
            popup.classList.remove('active');
            setTimeout(() => {
                if (popup.parentElement) {
                    popup.remove();
                }
                this.currentPopups = this.currentPopups.filter(p => p.id !== popup.id);
            }, 300);
        }
    }

    closeAll() {
        this.currentPopups.forEach(popup => this.close(popup));
    }

    showInfo(options) {
        return this.show({
            type: 'info',
            ...options
        });
    }

    showSuccess(options) {
        return this.show({
            type: 'success',
            ...options
        });
    }

    showWarning(options) {
        return this.show({
            type: 'warning',
            ...options
        });
    }

    showError(options) {
        return this.show({
            type: 'error',
            ...options
        });
    }

    showCustom(options) {
        return this.show(options);
    }
}

const popupManager = new PopupManager();


