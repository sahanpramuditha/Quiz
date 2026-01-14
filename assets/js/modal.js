/**
 * ModalManager
 * Handles modal dialogs and popups
 */

class ModalManager {
    constructor() {
        this.currentModal = null;
    }

    show(options) {
        // Close existing modal if any
        this.close();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-overlay';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        if (options.size) {
            modalContent.classList.add(`modal-${options.size}`);
        }
        
        // Header
        if (options.title) {
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.innerHTML = `
                <h2>${options.title}</h2>
                <button class="modal-close" onclick="modalManager.close()">×</button>
            `;
            modalContent.appendChild(header);
        }
        
        // Body
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (options.content) {
            body.innerHTML = options.content;
        } else if (options.html) {
            body.appendChild(options.html);
        }
        modalContent.appendChild(body);
        
        // Footer
        if (options.buttons && options.buttons.length > 0) {
            const footer = document.createElement('div');
            footer.className = 'modal-footer';
            options.buttons.forEach(button => {
                const btn = document.createElement('button');
                btn.className = `btn ${button.class || ''}`;
                btn.textContent = button.text;
                btn.onclick = () => {
                    if (button.onclick) {
                        const result = button.onclick();
                        if (result !== false) {
                            this.close();
                        }
                    } else {
                        this.close();
                    }
                };
                footer.appendChild(btn);
            });
            modalContent.appendChild(footer);
        }
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Animate in
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close();
            }
        });
        
        // Close on ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        this.currentModal = modal;
        
        return modal;
    }

    close() {
        if (this.currentModal) {
            this.currentModal.classList.remove('active');
            setTimeout(() => {
                if (this.currentModal && this.currentModal.parentElement) {
                    this.currentModal.remove();
                }
                this.currentModal = null;
            }, 300);
        }
    }

    confirm(options) {
        return new Promise((resolve) => {
            this.show({
                title: options.title || 'Confirm',
                content: options.message || 'Are you sure?',
                size: 'small',
                buttons: [
                    {
                        text: options.cancelText || 'Cancel',
                        class: 'btn-secondary',
                        onclick: () => {
                            resolve(false);
                            return true;
                        }
                    },
                    {
                        text: options.confirmText || 'Confirm',
                        class: 'btn-danger',
                        onclick: () => {
                            resolve(true);
                            return true;
                        }
                    }
                ]
            });
        });
    }

    prompt(options) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = options.type || 'text';
            input.className = 'form-control';
            input.placeholder = options.placeholder || '';
            input.value = options.value || '';
            if (options.required) input.required = true;
            
            const form = document.createElement('form');
            form.onsubmit = (e) => {
                e.preventDefault();
                resolve(input.value);
                modalManager.close();
            };
            form.appendChild(input);
            
            this.show({
                title: options.title || 'Input',
                html: form,
                size: 'small',
                buttons: [
                    {
                        text: options.cancelText || 'Cancel',
                        class: 'btn-secondary',
                        onclick: () => {
                            resolve(null);
                            return true;
                        }
                    },
                    {
                        text: options.confirmText || 'OK',
                        class: 'btn-primary',
                        onclick: () => {
                            if (input.value || !options.required) {
                                resolve(input.value);
                                return true;
                            }
                            return false;
                        }
                    }
                ]
            });
            
            // Focus input
            setTimeout(() => input.focus(), 100);
        });
    }
}

const modalManager = new ModalManager();


