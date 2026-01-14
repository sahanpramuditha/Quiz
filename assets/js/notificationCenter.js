/**
 * NotificationCenterManager
 * Handles notification center with history, categories, and persistent storage
 */

class NotificationCenterManager {
    constructor() {
        this.storage = new StorageManager();
        this.maxNotifications = 100;
        this.init();
    }

    init() {
        // Initialize notifications array if it doesn't exist
        const data = this.storage.getData();
        if (!data.notifications) {
            data.notifications = [];
            this.storage.saveData(data);
        }

        // Add click outside listener for dropdown
        this.initDropdownListeners();

        // Add a test notification for demo purposes (remove in production)
        if (data.notifications.length === 0) {
            this.addNotification('info', 'Welcome to QuizMaster!', 'Your notification system is now active. Click the bell icon to see your notifications.', 'system');
        }
    }

    initDropdownListeners() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notification-dropdown');
            const bellBtn = document.getElementById('notification-bell-btn');
            
            if (dropdown && bellBtn) {
                if (!bellBtn.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            }
        });
    }

    addNotificationToUser(userId, type, title, message, category = 'system', action = null, metadata = {}) {
        // Add notification to specific user's notification list
        const notification = this.addNotification(type, title, message, category, action, metadata);
        notification.userId = userId; // Mark as user-specific
        return notification;
    }

    addNotification(type, title, message, category = 'system', action = null, metadata = {}, userId = null) {
        const notification = {
            id: 'n_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: type, // info, success, warning, error
            title: title,
            message: message,
            category: category, // system, quiz, grading, user, achievement
            read: false,
            timestamp: new Date().toISOString(),
            action: action,
            metadata: metadata,
            userId: userId, // null for all users, specific userId for targeted notifications
            sentBy: auth.getCurrentUser() ? auth.getCurrentUser().id : null
        };

        const data = this.storage.getData();
        if (!data.notifications) {
            data.notifications = [];
        }

        // Add to beginning of array
        data.notifications.unshift(notification);

        // Keep only last maxNotifications
        if (data.notifications.length > this.maxNotifications) {
            data.notifications = data.notifications.slice(0, this.maxNotifications);
        }

        this.storage.saveData(data);

        // Update UI if notification center is open
        if (document.getElementById('notification-center-view')) {
            this.renderNotificationCenter();
        }
        if (document.getElementById('notification-sidebar-list')) {
            this.renderNotificationSidebar();
        }

        // Update bell badge
        this.updateBellBadge();

        // Play sound if enabled
        if (this.shouldPlaySound()) {
            this.playNotificationSound(type);
        }

        return notification;
    }

    getNotifications(filters = {}) {
        const data = this.storage.getData();
        let notifications = data.notifications || [];
        const currentUser = auth.getCurrentUser();

        // Filter by user - show notifications for current user or global notifications
        if (currentUser) {
            notifications = notifications.filter(n => 
                !n.userId || n.userId === currentUser.id || n.userId === 'all'
            );
        }

        // Filter by category
        if (filters.category) {
            notifications = notifications.filter(n => n.category === filters.category);
        }

        // Filter by read status
        if (filters.read !== undefined) {
            notifications = notifications.filter(n => n.read === filters.read);
        }

        // Filter by type
        if (filters.type) {
            notifications = notifications.filter(n => n.type === filters.type);
        }

        // Search
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            notifications = notifications.filter(n => 
                n.title.toLowerCase().includes(searchTerm) ||
                n.message.toLowerCase().includes(searchTerm)
            );
        }

        return notifications;
    }

    markAsRead(id) {
        const data = this.storage.getData();
        const notification = data.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.storage.saveData(data);
            this.updateBellBadge();
            return true;
        }
        return false;
    }

    markAllAsRead() {
        const data = this.storage.getData();
        data.notifications.forEach(n => n.read = true);
        this.storage.saveData(data);
        this.updateBellBadge();
    }

    deleteNotification(id) {
        const data = this.storage.getData();
        const index = data.notifications.findIndex(n => n.id === id);
        if (index >= 0) {
            data.notifications.splice(index, 1);
            this.storage.saveData(data);
            this.updateBellBadge();
            return true;
        }
        return false;
    }

    clearAll(category = null) {
        const data = this.storage.getData();
        if (category) {
            data.notifications = data.notifications.filter(n => n.category !== category);
        } else {
            data.notifications = [];
        }
        this.storage.saveData(data);
        this.updateBellBadge();
    }

    getUnreadCount() {
        const data = this.storage.getData();
        return (data.notifications || []).filter(n => !n.read).length;
    }

    updateBellBadge() {
        const badge = document.getElementById('notification-badge');
        const count = this.getUnreadCount();
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
                badge.classList.add('pulse');
            } else {
                badge.classList.add('hidden');
                badge.classList.remove('pulse');
            }
        }
    }

    renderNotificationCenter() {
        const container = document.getElementById('notification-center-list');
        if (!container) return;

        const currentFilter = document.getElementById('notification-filter')?.value || 'all';
        const currentCategory = document.getElementById('notification-category-filter')?.value || 'all';
        const searchTerm = document.getElementById('notification-search')?.value || '';

        let filters = {};
        if (currentFilter === 'unread') {
            filters.read = false;
        }
        if (currentCategory !== 'all') {
            filters.category = currentCategory;
        }
        if (searchTerm) {
            filters.search = searchTerm;
        }

        const notifications = this.getNotifications(filters);

        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 15px;">🔔</div>
                    <div class="empty-state-title">No Notifications</div>
                    <div class="empty-state-message">You're all caught up!</div>
                </div>
            `;
            return;
        }

        notifications.forEach(notification => {
            const card = document.createElement('div');
            card.className = `notification-card ${notification.read ? 'read' : 'unread'}`;
            card.dataset.notificationId = notification.id;

            const icons = {
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };

            const categoryIcons = {
                system: '⚙️',
                quiz: '📝',
                grading: '✏️',
                user: '👤',
                achievement: '🏆'
            };

            const timeAgo = this.getTimeAgo(notification.timestamp);

            card.innerHTML = `
                <div class="notification-card-header">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <span class="notification-type-icon" style="font-size: 1.5rem;">${icons[notification.type] || icons.info}</span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong>${notification.title}</strong>
                                ${!notification.read ? '<span class="unread-dot"></span>' : ''}
                            </div>
                            <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                                <span>${categoryIcons[notification.category] || '📌'} ${notification.category}</span>
                                <span style="margin-left: 10px;">${timeAgo}</span>
                            </div>
                        </div>
                    </div>
                    <div class="notification-card-actions">
                        ${!notification.read ? `
                            <button class="notification-action-btn" onclick="notificationCenter.markAsRead('${notification.id}')" title="Mark as read">✓</button>
                        ` : ''}
                        <button class="notification-action-btn" onclick="notificationCenter.deleteNotification('${notification.id}')" title="Delete">×</button>
                    </div>
                </div>
                <div class="notification-card-body">
                    <p>${notification.message}</p>
                    ${notification.action ? `
                        <div style="margin-top: 10px;">
                            <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 15px;" onclick="notificationCenter.handleAction('${notification.id}')">${notification.action.label || 'View'}</button>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(card);
        });
    }

    handleAction(notificationId) {
        const data = this.storage.getData();
        const notification = data.notifications.find(n => n.id === notificationId);
        if (!notification || !notification.action) return;

        // Mark as read
        this.markAsRead(notificationId);

        // Handle action
        const action = notification.action;
        if (typeof app !== 'undefined') {
            switch (action.type) {
                case 'view_quiz':
                    app.previewQuizById(action.target);
                    break;
                case 'grade':
                    app.showGradingQueue();
                    if (action.target) {
                        const filter = document.getElementById('grading-filter-quiz');
                        if (filter) filter.value = action.target;
                        app.renderGradingQueue();
                    }
                    break;
                case 'view_results':
                    app.showStudentPerformance();
                    break;
                case 'view_student':
                    app.showStudentDetail(action.target);
                    break;
                default:
                    if (action.handler && typeof window[action.handler] === 'function') {
                        window[action.handler](action.target);
                    }
            }
        }

        // Close notification center if on mobile
        if (window.innerWidth <= 768) {
            this.closeNotificationCenter();
        }
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    openNotificationCenter() {
        // Create sidebar if it doesn't exist
        let sidebar = document.getElementById('notification-sidebar');
        if (!sidebar) {
            sidebar = document.createElement('div');
            sidebar.id = 'notification-sidebar';
            sidebar.className = 'notification-sidebar';
            sidebar.innerHTML = `
                <div class="notification-sidebar-header">
                    <h2>Notifications</h2>
                    <button class="notification-sidebar-close" onclick="notificationCenter.closeNotificationCenter()">×</button>
                </div>
                <div class="notification-sidebar-content">
                    <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                        ${auth.getCurrentUser() && (auth.getCurrentUser().role === 'teacher' || auth.getCurrentUser().role === 'admin') ? `
                            <button class="btn" style="width: auto; background: #2ecc71; font-size: 0.9rem; padding: 5px 15px;" onclick="app.showSendNotification()">📤 Send</button>
                        ` : ''}
                        <button class="btn" style="width: auto; background: #3498db; font-size: 0.9rem; padding: 5px 15px;" onclick="notificationCenter.markAllAsRead(); notificationCenter.renderNotificationSidebar();">Mark All Read</button>
                        <button class="btn" style="width: auto; background: #e74c3c; font-size: 0.9rem; padding: 5px 15px;" onclick="app.clearAllNotifications()">Clear All</button>
                        <button class="btn" style="width: auto; background: #9b59b6; font-size: 0.9rem; padding: 5px 15px;" onclick="app.showNotificationSettings()">⚙️ Settings</button>
                    </div>
                    <div class="card" style="margin-bottom: 15px;">
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                            <input type="text" id="notification-sidebar-search" placeholder="🔍 Search..." class="form-control" style="flex: 1; min-width: 150px; font-size: 0.9rem;" oninput="notificationCenter.renderNotificationSidebar()">
                            <select id="notification-sidebar-filter" class="form-control" style="width: 120px; font-size: 0.9rem;" onchange="notificationCenter.renderNotificationSidebar()">
                                <option value="all">All</option>
                                <option value="unread">Unread</option>
                            </select>
                            <select id="notification-sidebar-category" class="form-control" style="width: 130px; font-size: 0.9rem;" onchange="notificationCenter.renderNotificationSidebar()">
                                <option value="all">All Categories</option>
                                <option value="system">System</option>
                                <option value="quiz">Quiz</option>
                                <option value="grading">Grading</option>
                                <option value="user">User</option>
                                <option value="achievement">Achievement</option>
                            </select>
                        </div>
                    </div>
                    <div id="notification-sidebar-list" class="notification-list">
                        <!-- Notifications will be rendered here -->
                    </div>
                </div>
            `;
            document.body.appendChild(sidebar);

            // Create backdrop
            let backdrop = document.getElementById('notification-sidebar-backdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'notification-sidebar-backdrop';
                backdrop.className = 'notification-sidebar-backdrop';
                backdrop.onclick = () => this.closeNotificationCenter();
                document.body.appendChild(backdrop);
            }
        }

        // Show sidebar
        sidebar.classList.add('active');
        const backdrop = document.getElementById('notification-sidebar-backdrop');
        if (backdrop) backdrop.classList.add('active');

        // Render notifications
        this.renderNotificationSidebar();
        this.updateBellBadge();
    }

    closeNotificationCenter() {
        const sidebar = document.getElementById('notification-sidebar');
        const backdrop = document.getElementById('notification-sidebar-backdrop');
        
        if (sidebar) sidebar.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
    }

    renderNotificationSidebar() {
        const container = document.getElementById('notification-sidebar-list');
        if (!container) return;

        const currentFilter = document.getElementById('notification-sidebar-filter')?.value || 'all';
        const currentCategory = document.getElementById('notification-sidebar-category')?.value || 'all';
        const searchTerm = document.getElementById('notification-sidebar-search')?.value || '';

        let filters = {};
        if (currentFilter === 'unread') {
            filters.read = false;
        }
        if (currentCategory !== 'all') {
            filters.category = currentCategory;
        }
        if (searchTerm) {
            filters.search = searchTerm;
        }

        const notifications = this.getNotifications(filters);

        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 15px;">🔔</div>
                    <div class="empty-state-title">No Notifications</div>
                    <div class="empty-state-message">You're all caught up!</div>
                </div>
            `;
            return;
        }

        notifications.forEach(notification => {
            const card = document.createElement('div');
            card.className = `notification-card ${notification.read ? 'read' : 'unread'}`;
            card.dataset.notificationId = notification.id;

            const icons = {
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };

            const categoryIcons = {
                system: '⚙️',
                quiz: '📝',
                grading: '✏️',
                user: '👤',
                achievement: '🏆'
            };

            const timeAgo = this.getTimeAgo(notification.timestamp);

            card.innerHTML = `
                <div class="notification-card-header">
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <span class="notification-type-icon" style="font-size: 1.5rem;">${icons[notification.type] || icons.info}</span>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong style="font-size: 0.95rem;">${notification.title}</strong>
                                ${!notification.read ? '<span class="unread-dot"></span>' : ''}
                            </div>
                            <div style="font-size: 0.75rem; color: #666; margin-top: 4px;">
                                <span>${categoryIcons[notification.category] || '📌'} ${notification.category}</span>
                                <span style="margin-left: 10px;">${timeAgo}</span>
                            </div>
                        </div>
                    </div>
                    <div class="notification-card-actions">
                        ${!notification.read ? `
                            <button class="notification-action-btn" onclick="notificationCenter.markAsRead('${notification.id}'); notificationCenter.renderNotificationSidebar();" title="Mark as read">✓</button>
                        ` : ''}
                        <button class="notification-action-btn" onclick="notificationCenter.deleteNotification('${notification.id}'); notificationCenter.renderNotificationSidebar();" title="Delete">×</button>
                    </div>
                </div>
                <div class="notification-card-body">
                    <p style="font-size: 0.9rem;">${notification.message}</p>
                    ${notification.action ? `
                        <div style="margin-top: 10px;">
                            <button class="btn" style="width: auto; font-size: 0.85rem; padding: 4px 12px;" onclick="notificationCenter.handleAction('${notification.id}')">${notification.action.label || 'View'}</button>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(card);
        });
    }

    shouldPlaySound() {
        const prefs = this.getPreferences();
        return prefs.soundEnabled !== false;
    }

    playNotificationSound(type) {
        // Create audio context for notification sound
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different types
            const frequencies = {
                success: 523.25, // C5
                error: 392.00,   // G4
                warning: 440.00, // A4
                info: 493.88     // B4
            };

            oscillator.frequency.value = frequencies[type] || frequencies.info;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            // Audio not supported or blocked
            console.log('Audio notification not available');
        }
    }

    getPreferences() {
        const prefs = localStorage.getItem('notificationPreferences');
        if (prefs) {
            return JSON.parse(prefs);
        }
        return {
            soundEnabled: true,
            position: 'top-right',
            duration: 3000,
            categories: {
                system: true,
                quiz: true,
                grading: true,
                user: true,
                achievement: true
            }
        };
    }

    savePreferences(prefs) {
        localStorage.setItem('notificationPreferences', JSON.stringify(prefs));
    }

    saveNotificationSettings() {
        const soundCheckbox = document.getElementById('notification-sound-enabled');
        const positionSelect = document.getElementById('notification-position');
        const durationInput = document.getElementById('notification-duration');
        const systemCheckbox = document.getElementById('category-system');
        const quizCheckbox = document.getElementById('category-quiz');
        const gradingCheckbox = document.getElementById('category-grading');
        const userCheckbox = document.getElementById('category-user');
        const achievementCheckbox = document.getElementById('category-achievement');

        if (!soundCheckbox || !positionSelect || !durationInput) return;

        const prefs = {
            soundEnabled: soundCheckbox.checked,
            position: positionSelect.value,
            duration: parseInt(durationInput.value),
            categories: {
                system: systemCheckbox ? systemCheckbox.checked : true,
                quiz: quizCheckbox ? quizCheckbox.checked : true,
                grading: gradingCheckbox ? gradingCheckbox.checked : true,
                user: userCheckbox ? userCheckbox.checked : true,
                achievement: achievementCheckbox ? achievementCheckbox.checked : true
            }
        };
        this.savePreferences(prefs);
        
        // Update toast position
        if (typeof notifications !== 'undefined') {
            notifications.setPosition(prefs.position);
            notifications.enableSound(prefs.soundEnabled);
        }

        if (typeof notifications !== 'undefined') {
            notifications.success('Settings saved!');
        }
    }

    loadNotificationSettings() {
        const prefs = this.getPreferences();
        
        const soundCheckbox = document.getElementById('notification-sound-enabled');
        const positionSelect = document.getElementById('notification-position');
        const durationInput = document.getElementById('notification-duration');
        const systemCheckbox = document.getElementById('category-system');
        const quizCheckbox = document.getElementById('category-quiz');
        const gradingCheckbox = document.getElementById('category-grading');
        const userCheckbox = document.getElementById('category-user');
        const achievementCheckbox = document.getElementById('category-achievement');

        if (soundCheckbox) soundCheckbox.checked = prefs.soundEnabled !== false;
        if (positionSelect) positionSelect.value = prefs.position || 'top-right';
        if (durationInput) durationInput.value = prefs.duration || 3000;
        if (systemCheckbox) systemCheckbox.checked = prefs.categories?.system !== false;
        if (quizCheckbox) quizCheckbox.checked = prefs.categories?.quiz !== false;
        if (gradingCheckbox) gradingCheckbox.checked = prefs.categories?.grading !== false;
        if (userCheckbox) userCheckbox.checked = prefs.categories?.user !== false;
        if (achievementCheckbox) achievementCheckbox.checked = prefs.categories?.achievement !== false;
    }

    toggleNotificationDropdown() {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;

        const isVisible = dropdown.classList.contains('active');
        
        // Close any other open dropdowns
        document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
            if (menu !== dropdown) menu.classList.remove('active');
        });

        if (isVisible) {
            dropdown.classList.remove('active');
        } else {
            this.renderNotificationDropdown();
            dropdown.classList.add('active');
        }
    }

    renderNotificationDropdown() {
        const container = document.getElementById('notification-dropdown-list');
        if (!container) return;

        // Get recent unread notifications (max 5)
        const notifications = this.getNotifications({ read: false }).slice(0, 5);
        const totalUnread = this.getUnreadCount();

        container.innerHTML = '';

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 15px;">🔔</div>
                    <div class="empty-state-title">No new notifications</div>
                    <div class="empty-state-message">You're all caught up!</div>
                </div>
            `;
            return;
        }

        if (notifications.length === 0) {
            container.innerHTML = `
                <div class="notification-dropdown-empty">
                    <div class="notification-dropdown-icon">🔔</div>
                    <div class="notification-dropdown-text">No new notifications</div>
                </div>
            `;
            return;
        }

        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = `notification-item ${!notification.read ? 'unread' : ''}`;
            item.onclick = () => {
                this.handleAction(notification.id);
                this.toggleNotificationDropdown(); // Close dropdown after action
            };

            const icons = {
                info: 'ℹ️',
                success: '✅',
                warning: '⚠️',
                error: '❌'
            };

            const timeAgo = this.getTimeAgo(notification.timestamp);

            item.innerHTML = `
                <div class="notification-item-title">${notification.title}</div>
                <div class="notification-item-message">${notification.message.length > 60 ? notification.message.substring(0, 60) + '...' : notification.message}</div>
                <div class="notification-item-meta">
                    <span class="notification-item-time">${timeAgo}</span>
                    <span class="notification-item-icon">${icons[notification.type] || icons.info}</span>
                </div>
            `;

            container.appendChild(item);
        });

        // Update footer text if there are more than 5 notifications
        const footer = document.querySelector('.notification-footer button');
        if (footer && totalUnread > 5) {
            footer.textContent = `View All (${totalUnread})`;
        } else if (footer) {
            footer.textContent = 'View All';
        }
    }
}

const notificationCenter = new NotificationCenterManager();

