/**
 * App.js
 * Main application logic for QuizMaster.
 */

class App {
    constructor() {
        this.currentQuiz = null;
        this.currentAttempt = null;
        this.currentQuestionIndex = 0;
        this.currentSectionIndex = 0;
        this.timerInterval = null;
        this.currentStudentId = null;
        this.currentAttemptId = null;
        this.pendingQuizId = null;
        this.quizCorrectAnswers = null;
        
        // Initialize UI on load
        window.addEventListener('DOMContentLoaded', () => {
            this.init();
        });
    }

    init() {
        // Theme Init
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            const themeBtn = document.getElementById('theme-btn');
            if (themeBtn) themeBtn.textContent = '☀️';
        }

        // Add skip link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Add main content ID
        const main = document.querySelector('main');
        if (main && !main.id) {
            main.id = 'main-content';
        }

        if (auth.isAuthenticated()) {
            this.routeUser(auth.getCurrentUser());
        } else {
            this.showView('login-view');
        }

        // Initialize notification badge after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof notificationCenter !== 'undefined') {
                notificationCenter.updateBellBadge();
            }
        }, 100);

        // Initialize collapsible sections
        this.initCollapsibles();
        
        // Initialize keyboard shortcuts
        this.initKeyboardShortcuts();
    }

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                const activeView = document.querySelector('.view-section.active');
                if (activeView && activeView.id === 'create-quiz-view') {
                    this.saveQuiz();
                }
            }
            
            // Ctrl/Cmd + /: Show Help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showHelp();
            }
            
            // Ctrl/Cmd + K: Quick Search (placeholder)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                // Quick search functionality can be added here
                if (typeof notifications !== 'undefined') {
                    notifications.info('Quick search coming soon!');
                }
            }
            
            // Esc: Close modals/popups
            if (e.key === 'Escape') {
                const modal = document.querySelector('.modal-overlay.active');
                if (modal) {
                    const closeBtn = modal.querySelector('.modal-close');
                    if (closeBtn) closeBtn.click();
                }
                
                const popup = document.querySelector('.popup-overlay.active');
                if (popup && typeof popupManager !== 'undefined') {
                    popupManager.close();
                }
            }
        });
    }

    initCollapsibles() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('collapsible')) {
                e.target.classList.toggle('active');
                const content = e.target.nextElementSibling;
                if (content && content.classList.contains('collapsible-content')) {
                    content.classList.toggle('active');
                }
            }
        });
    }

    toggleTheme() {
        const body = document.body;
        const themeBtn = document.getElementById('theme-btn');
        const isDark = body.classList.contains('dark-mode');
        
        // Add transition class for smooth animation
        body.classList.add('theme-transitioning');
        
        // Add theme switching animation to button
        themeBtn.classList.add('theme-switching');
        
        // Toggle theme
        body.classList.toggle('dark-mode');
        const newIsDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
        
        // Update button icon
        themeBtn.textContent = newIsDark ? '☀️' : '🌙';
        
        // Remove transition classes after animation
        setTimeout(() => {
            body.classList.remove('theme-transitioning');
            themeBtn.classList.remove('theme-switching');
        }, 600);
    }

    // --- Navigation & Routing ---
    showView(viewId) {
        // Animate out current view
        const currentView = document.querySelector('.view-section.active');
        if (currentView) {
            currentView.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                document.querySelectorAll('.view-section').forEach(el => {
                    el.classList.remove('active');
                    el.style.animation = '';
                });
                
                // Animate in new view
                const newView = document.getElementById(viewId);
                if (newView) {
                    newView.classList.add('active');
                    newView.style.animation = 'fadeInUp 0.4s ease-out';
                    
                    // Populate assignment dropdowns if showing create quiz view
                    if (viewId === 'create-quiz-view') {
                        setTimeout(() => {
                            this.populateAssignmentDropdowns();
                        }, 450); // After animation completes
                    }
                }
            }, 200);
        } else {
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            const newView = document.getElementById(viewId);
            if (newView) {
                newView.classList.add('active');
                
                // Populate assignment dropdowns if showing create quiz view
                if (viewId === 'create-quiz-view') {
                    setTimeout(() => {
                        this.populateAssignmentDropdowns();
                    }, 100);
                }
            }
        }
        
        const user = auth.getCurrentUser();
        if (user) {
            document.getElementById('main-header').classList.remove('hidden');
            document.getElementById('user-display-name').textContent = `Welcome, ${user.name} (${user.role})`;
        } else {
            document.getElementById('main-header').classList.add('hidden');
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    routeUser(user) {
        // Update notification badge
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.updateBellBadge();
        }

        if (user.role === 'admin') {
            this.showAdminDashboard();
        } else if (user.role === 'teacher') {
            this.showTeacherDashboard();
        } else {
            this.showStudentDashboard();
        }
    }

    showDashboard() {
        const user = auth.getCurrentUser();
        if (user) {
            this.routeUser(user);
        }
    }

    showSettings() {
        this.showView('settings-view');
        this.addBreadcrumb([
            { text: 'Dashboard', onclick: () => this.showDashboard() },
            { text: 'Settings', active: true }
        ]);
        this.loadUserSettings();
    }

    loadUserSettings() {
        const user = auth.getCurrentUser();
        if (!user) return;

        // Load user preferences from localStorage
        const prefs = JSON.parse(localStorage.getItem(`user_prefs_${user.id}`) || '{}');
        
        if (document.getElementById('settings-display-name')) {
            document.getElementById('settings-display-name').value = prefs.displayName || user.name;
        }
        if (document.getElementById('settings-email')) {
            document.getElementById('settings-email').value = prefs.email || user.email || '';
        }
        if (document.getElementById('settings-theme')) {
            const theme = localStorage.getItem('theme') || 'light';
            document.getElementById('settings-theme').value = prefs.theme || theme;
        }
        if (document.getElementById('settings-notify-email')) {
            document.getElementById('settings-notify-email').checked = prefs.notifyEmail !== false;
        }
        if (document.getElementById('settings-notify-sound')) {
            document.getElementById('settings-notify-sound').checked = prefs.notifySound !== false;
        }
        if (document.getElementById('settings-auto-save')) {
            document.getElementById('settings-auto-save').checked = prefs.autoSave !== false;
        }
    }

    saveUserPreferences() {
        const user = auth.getCurrentUser();
        if (!user) return;

        const prefs = {
            displayName: document.getElementById('settings-display-name').value,
            email: document.getElementById('settings-email').value,
            theme: document.getElementById('settings-theme').value,
            notifyEmail: document.getElementById('settings-notify-email').checked,
            notifySound: document.getElementById('settings-notify-sound').checked,
            autoSave: document.getElementById('settings-auto-save').checked
        };

        localStorage.setItem(`user_prefs_${user.id}`, JSON.stringify(prefs));
        
        if (typeof notifications !== 'undefined') {
            notifications.success('Preferences saved successfully!');
        }
    }

    saveNotificationSettings() {
        const user = auth.getCurrentUser();
        if (!user) return;

        const prefs = JSON.parse(localStorage.getItem(`user_prefs_${user.id}`) || '{}');
        prefs.notifyEmail = document.getElementById('settings-notify-email').checked;
        prefs.notifySound = document.getElementById('settings-notify-sound').checked;
        prefs.notifyFrequency = document.getElementById('settings-notify-frequency').value;

        localStorage.setItem(`user_prefs_${user.id}`, JSON.stringify(prefs));
        
        if (typeof notifications !== 'undefined') {
            notifications.success('Notification settings saved!');
        }
    }

    saveQuizPreferences() {
        const user = auth.getCurrentUser();
        if (!user) return;

        const prefs = JSON.parse(localStorage.getItem(`user_prefs_${user.id}`) || '{}');
        prefs.autoSave = document.getElementById('settings-auto-save').checked;
        prefs.showHints = document.getElementById('settings-show-hints').checked;
        prefs.defaultTime = parseInt(document.getElementById('settings-default-time').value) || 10;

        localStorage.setItem(`user_prefs_${user.id}`, JSON.stringify(prefs));
        
        if (typeof notifications !== 'undefined') {
            notifications.success('Quiz preferences saved!');
        }
    }

    updateTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
            if (document.getElementById('theme-btn')) {
                document.getElementById('theme-btn').textContent = '☀️';
            }
        } else if (theme === 'light') {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
            if (document.getElementById('theme-btn')) {
                document.getElementById('theme-btn').textContent = '🌙';
            }
        } else {
            // Auto - use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            localStorage.setItem('theme', 'auto');
        }
    }

    clearUserData() {
        if (typeof modalManager !== 'undefined') {
            modalManager.confirm({
                title: 'Clear All Data',
                message: 'Are you sure you want to clear all your data? This action cannot be undone.',
                confirmText: 'Clear',
                cancelText: 'Cancel'
            }).then(confirmed => {
                if (confirmed) {
                    localStorage.clear();
                    location.reload();
                }
            });
        } else {
            if (confirm('Are you sure you want to clear all data?')) {
                localStorage.clear();
                location.reload();
            }
        }
    }

    showHelp() {
        this.showView('help-view');
        this.addBreadcrumb([
            { text: 'Dashboard', onclick: () => this.showDashboard() },
            { text: 'Help & Documentation', active: true }
        ]);
    }

    showAdvancedAnalytics() {
        this.showView('advanced-analytics-view');
        this.addBreadcrumb([
            { text: 'Dashboard', onclick: () => this.showDashboard() },
            { text: 'Advanced Analytics', active: true }
        ]);
        this.renderAdvancedAnalytics();
    }

    renderAdvancedAnalytics() {
        const quizzes = storage.getQuizzes();
        const results = storage.getAllResults();
        const users = storage.getUsers().filter(u => u.role === 'student');

        // Update stat cards
        if (document.getElementById('analytics-total-quizzes')) {
            document.getElementById('analytics-total-quizzes').textContent = quizzes.length;
        }
        if (document.getElementById('analytics-total-attempts')) {
            document.getElementById('analytics-total-attempts').textContent = results.length;
        }
        if (document.getElementById('analytics-avg-score')) {
            const avgScore = results.length > 0 
                ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
                : 0;
            document.getElementById('analytics-avg-score').textContent = avgScore + '%';
        }
        if (document.getElementById('analytics-active-students')) {
            const activeStudents = new Set(results.map(r => r.studentId)).size;
            document.getElementById('analytics-active-students').textContent = activeStudents;
        }

        // Render charts
        this.renderAnalyticsCharts(quizzes, results);
    }

    renderAnalyticsCharts(quizzes, results) {
        // Performance Trends Chart
        const trendsCtx = document.getElementById('analytics-trends-chart');
        if (trendsCtx && typeof Chart !== 'undefined') {
            const last7Days = [];
            const scores = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last7Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                
                const dayResults = results.filter(r => {
                    const rDate = new Date(r.date);
                    return rDate.toDateString() === date.toDateString();
                });
                const avgScore = dayResults.length > 0
                    ? Math.round(dayResults.reduce((sum, r) => sum + r.score, 0) / dayResults.length)
                    : 0;
                scores.push(avgScore);
            }

            new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Average Score',
                        data: scores,
                        borderColor: 'rgb(30, 58, 95)',
                        backgroundColor: 'rgba(30, 58, 95, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }

        // Score Distribution Chart
        const distCtx = document.getElementById('analytics-distribution-chart');
        if (distCtx && typeof Chart !== 'undefined') {
            const ranges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
            const counts = [0, 0, 0, 0, 0];
            results.forEach(r => {
                if (r.score <= 20) counts[0]++;
                else if (r.score <= 40) counts[1]++;
                else if (r.score <= 60) counts[2]++;
                else if (r.score <= 80) counts[3]++;
                else counts[4]++;
            });

            new Chart(distCtx, {
                type: 'bar',
                data: {
                    labels: ranges,
                    datasets: [{
                        label: 'Number of Attempts',
                        data: counts,
                        backgroundColor: [
                            'rgba(231, 76, 60, 0.8)',
                            'rgba(243, 156, 18, 0.8)',
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(46, 204, 113, 0.8)',
                            'rgba(39, 174, 96, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    }

    // --- Auth Handlers ---
    handleLogin() {
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        
        if (!usernameInput.value || !passwordInput.value) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please enter both username and password');
            } else {
                alert('Please enter both username and password');
            }
            return;
        }
        
        this.showLoading();
        
        // Simulate loading for better UX
        setTimeout(() => {
        const result = auth.login(usernameInput.value, passwordInput.value);
            
            this.hideLoading();
        
        if (result.success) {
                if (typeof notifications !== 'undefined') {
                    notifications.success(`Welcome back, ${result.user.name}!`);
                }
            usernameInput.value = '';
            passwordInput.value = '';
            this.routeUser(result.user);
            } else {
                if (typeof popupManager !== 'undefined') {
                    popupManager.showError({
                        title: 'Login Failed',
                        message: result.message,
                        autoClose: 4000
                    });
                } else if (typeof notifications !== 'undefined') {
                    notifications.error(result.message);
        } else {
            alert(result.message);
                }
                passwordInput.focus();
            }
        }, 300);
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const content = overlay.querySelector('.loading-overlay-content p');
            if (content) content.textContent = message;
            overlay.classList.add('active');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    logout() {
        auth.logout();
    }

    // --- Student Logic ---
    showStudentDashboard() {
        this.showView('student-dashboard');
        this.updateStudentStats();
        this.renderStudentQuizList();
        
        // Update notification badge
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.updateBellBadge();
        }
    }

    updateStudentStats() {
        const user = auth.getCurrentUser();
        const results = storage.getResultsByStudent(user.id);
        
        // Calculate stats
        const totalAttempts = results.length;
        const totalScore = results.reduce((sum, r) => sum + r.score, 0);
        const avgScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0;
        const highestScore = totalAttempts > 0 ? Math.max(...results.map(r => r.score)) : 0;
        const improvement = totalAttempts > 1 ? results[results.length - 1].score - results[0].score : 0;
        
        document.getElementById('student-attempts-count').textContent = totalAttempts;
        document.getElementById('student-avg-score').textContent = avgScore + '%';
        
        // Update additional stats if elements exist
        const highScoreEl = document.getElementById('student-stats-high');
        const improvementEl = document.getElementById('student-stats-improvement');
        if (highScoreEl) highScoreEl.textContent = highestScore + '%';
        if (improvementEl) {
            improvementEl.textContent = (improvement > 0 ? '+' : '') + improvement + '%';
            improvementEl.style.color = improvement >= 0 ? '#2ecc71' : '#e74c3c';
        }
        
        // Render performance chart
        this.renderStudentPerformanceChart(results);
    }

    renderStudentPerformanceChart(results) {
        const chartContainer = document.getElementById('student-performance-chart');
        if (!chartContainer) return;
        
        // Sort results by date (most recent first) and take last 5
        const recentResults = results
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .reverse(); // Reverse to show chronological order
        
        if (recentResults.length === 0) {
            chartContainer.innerHTML = '<p style="color:#777; width:100%; text-align:center; align-self:center;">No attempts yet.</p>';
            return;
        }
        
        // Find max score for scaling
        const maxScore = Math.max(...recentResults.map(r => r.score));
        const chartHeight = 150; // pixels
        
        chartContainer.innerHTML = '';
        
        recentResults.forEach((result, index) => {
            const barHeight = (result.score / 100) * chartHeight;
            const bar = document.createElement('div');
            bar.className = 'performance-bar';
            bar.style.setProperty('--bar-height', barHeight + 'px');
            bar.style.setProperty('--bar-index', index);
            bar.setAttribute('data-score', result.score);
            bar.title = `${result.score}% on ${new Date(result.date).toLocaleDateString()}`;
            chartContainer.appendChild(bar);
        });
    }

    renderStudentQuizList() {
        const container = document.getElementById('student-quiz-list');
        if (!container) return;
        
        container.innerHTML = '';
        const user = auth.getCurrentUser();
        const quizzes = storage.getQuizzes();
        const results = storage.getResultsByStudent(user.id);
        
        if (quizzes.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><div style="font-size: 3rem; margin-bottom: 15px;">📚</div><div>No quizzes available yet.</div><div style="font-size: 0.9rem; margin-top: 5px;">Check back later for new assignments!</div></div>';
            return;
        }
        
        quizzes.forEach((quiz, index) => {
            const userResults = results.filter(r => r.quizId === quiz.id);
            const hasAttempted = userResults.length > 0;
            const latestResult = userResults.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const canRetake = quiz.allowRetake || !hasAttempted;
            
            // Check if quiz is assigned to user
            const isAssigned = !quiz.assignedStudents || quiz.assignedStudents.length === 0 || quiz.assignedStudents.includes(user.id);
            
            // Check availability dates
            const now = new Date();
            const isAvailable = (!quiz.startDate || now >= new Date(quiz.startDate)) && 
                               (!quiz.endDate || now <= new Date(quiz.endDate));
            
            if (!isAssigned || !isAvailable) return; // Skip unassigned or unavailable quizzes
            
            const difficultyColors = {
                easy: '#2ecc71',
                medium: '#f39c12', 
                hard: '#e74c3c'
            };
            
            const difficultyLabels = {
                easy: 'Easy',
                medium: 'Medium',
                hard: 'Hard'
            };
            
            const difficulty = quiz.difficulty || 'medium';
            const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
            
            let dueBadge = '';
            if (quiz.endDate) {
                const dueDate = new Date(quiz.endDate);
                const timeDiff = dueDate - now;
                const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                
                if (daysDiff < 0) {
                    dueBadge = '<span class="badge badge-danger" style="font-size: 0.8rem;">Overdue</span>';
                } else if (daysDiff === 0) {
                    dueBadge = '<span class="badge badge-warning" style="font-size: 0.8rem;">Due Today</span>';
                } else if (daysDiff <= 3) {
                    dueBadge = `<span class="badge badge-warning" style="font-size: 0.8rem;">Due in ${daysDiff} day${daysDiff > 1 ? 's' : ''}</span>`;
                }
            }
            
            const div = document.createElement('div');
            div.className = 'card';
            div.style.setProperty('--card-index', index);
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <h3 style="margin: 0; flex: 1;">${quiz.title}</h3>
                    ${dueBadge}
                </div>
                <p style="color: #666; margin-bottom: 15px; line-height: 1.6;">${quiz.description || 'No description'}</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span class="badge badge-info">📝 ${quiz.questions.length} Questions</span>
                    <span class="badge badge-info">⏱️ ${quiz.timeLimit} min</span>
                    <span class="badge badge-info">⭐ ${totalPoints} points</span>
                    <span class="badge" style="background: ${difficultyColors[difficulty]}; color: white;">${difficultyLabels[difficulty]}</span>
                    ${quiz.categories && quiz.categories.length > 0 ? quiz.categories.slice(0, 2).map(cat => `<span class="badge badge-info" style="font-size: 0.8rem;">${cat}</span>`).join('') : ''}
                </div>
                ${quiz.endDate ? `<p style="color: #e74c3c; font-size: 0.9em; margin-bottom: 10px;">📅 Due: ${new Date(quiz.endDate).toLocaleString()}</p>` : ''}
                ${hasAttempted ? `<p style="color: #27ae60; font-size: 0.9em; margin-bottom: 10px;">✅ Attempted ${userResults.length} time${userResults.length > 1 ? 's' : ''}</p>` : ''}
                <button class="btn" style="margin-top: 10px; width: 100%; background: ${hasAttempted ? '#3498db' : '#2ecc71'};" onclick="app.startQuiz('${quiz.id}')">
                    ${hasAttempted ? '🔄 Retake Quiz' : '🚀 Start Quiz'}
                </button>
            `;
            container.appendChild(div);
        });
        
        if (container.children.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;"><div style="font-size: 3rem; margin-bottom: 15px;">📚</div><div>No quizzes available for you right now.</div><div style="font-size: 0.9rem; margin-top: 5px;">Check back later or contact your teacher!</div></div>';
        }
    }

    // --- Admin Logic ---
    showAdminDashboard() {
        this.showView('admin-dashboard');
        this.updateAdminStats();
        this.renderAdminUserList();
        
        // Update notification badge
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.updateBellBadge();
        }
    }

    updateAdminStats() {
        const users = storage.getUsers();
        const groups = storage.getGroups();
        
        document.getElementById('admin-total-users').textContent = users.length;
        document.getElementById('admin-total-students').textContent = users.filter(u => u.role === 'student').length;
        document.getElementById('admin-total-teachers').textContent = users.filter(u => u.role === 'teacher').length;
        document.getElementById('admin-total-groups').textContent = groups.length;
    }

    renderAdminUserList() {
        const container = document.getElementById('admin-users-list');
        if (!container) return;
        
        // Check if we should use card view or table view
        const useCardView = container.tagName !== 'TBODY';
        
        if (useCardView) {
            this.renderAdminUserListCards();
        } else {
            this.renderAdminUserListTable();
        }
    }

    renderAdminUserListCards() {
        let container = document.getElementById('admin-users-list');
        
        // If container is a tbody, we need to replace the table structure
        if (container && container.tagName === 'TBODY') {
            const table = container.closest('table');
            if (table) {
                const newContainer = document.createElement('div');
                newContainer.id = 'admin-users-list';
                newContainer.className = 'user-card-grid';
                table.parentElement.replaceChild(newContainer, table);
                container = newContainer;
            }
        }
        
        // Ensure container exists and has correct class
        if (!container) {
            container = document.createElement('div');
            container.id = 'admin-users-list';
            container.className = 'user-card-grid';
            const card = document.querySelector('.card');
            if (card) {
                const filterBar = card.querySelector('.filter-bar');
                if (filterBar && filterBar.nextSibling) {
                    card.insertBefore(container, filterBar.nextSibling);
                } else {
                    card.appendChild(container);
                }
            }
        } else {
            container.className = 'user-card-grid';
        }
        
        if (!container) return;
        
        container.innerHTML = '';
        const users = storage.getUsers();
        const currentUser = auth.getCurrentUser();
        const groups = storage.getGroups();
        const results = storage.getAllResults();
        
        // Apply filters
        const searchTerm = document.getElementById('admin-user-search')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('admin-user-role-filter')?.value || '';
        
        let filteredUsers = users;
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(u => 
                u.name.toLowerCase().includes(searchTerm) ||
                u.username.toLowerCase().includes(searchTerm) ||
                (u.email && u.email.toLowerCase().includes(searchTerm))
            );
        }
        if (roleFilter) {
            filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
        }

        if (filteredUsers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">👤</div>
                    <div class="empty-state-title">No Users Found</div>
                    <div class="empty-state-message">Try adjusting your search or filter criteria</div>
                </div>
            `;
            return;
        }

        filteredUsers.forEach((user, index) => {
            const isSelf = user.id === currentUser.id;
            
            // Get user's groups
            const userGroups = groups.filter(g => g.members && g.members.includes(user.id));
            const groupNames = userGroups.map(g => g.name).join(', ') || 'No Groups';
            
            // Get user stats
            const userResults = results.filter(r => r.studentId === user.id);
            const avgScore = userResults.length > 0 
                ? Math.round(userResults.reduce((sum, r) => sum + (r.manualScore || r.score), 0) / userResults.length)
                : 0;
            
            // Get initials for avatar
            const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            
            const roleBadgeClass = `role-badge-${user.role}`;
            const roleLabels = {
                student: 'Student',
                teacher: 'Teacher',
                admin: 'Admin'
            };
            
            const card = document.createElement('div');
            card.className = 'user-card fade-in-up';
            card.style.animationDelay = `${index * 0.05}s`;
            card.innerHTML = `
                <div class="user-card-header">
                    <div style="display: flex; align-items: start; flex: 1;">
                        <div class="user-avatar">${initials}</div>
                        <div class="user-card-info">
                            <div class="user-card-name">
                                ${user.name}
                                ${isSelf ? '<span style="font-size: 0.8rem; color: #999;">(You)</span>' : ''}
                            </div>
                            <div class="user-card-username">@${user.username}</div>
                            ${user.email ? `<div class="user-card-email">📧 ${user.email}</div>` : ''}
                            <div style="margin-top: 8px;">
                                <span class="role-badge ${roleBadgeClass}">${roleLabels[user.role] || user.role}</span>
                            </div>
                        </div>
                    </div>
                    ${!isSelf ? `
                        <div class="user-card-actions">
                            <button class="action-btn action-btn-edit" onclick="app.showEditUserModal('${user.id}')" title="Edit User">
                                ✏️ Edit
                            </button>
                            <button class="action-btn action-btn-delete" onclick="app.adminDeleteUser('${user.id}')" title="Delete User">
                                🗑️ Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                    <div style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">
                        <strong>Groups:</strong> ${groupNames}
                    </div>
                    ${user.role === 'student' ? `
                        <div class="user-stats">
                            <div class="user-stat">
                                <div class="user-stat-value">${userResults.length}</div>
                                <div class="user-stat-label">Attempts</div>
                            </div>
                            <div class="user-stat">
                                <div class="user-stat-value">${avgScore}%</div>
                                <div class="user-stat-label">Avg Score</div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderAdminUserListTable() {
        const tbody = document.getElementById('admin-users-list');
        if (!tbody || tbody.tagName !== 'TBODY') return;
        
        tbody.innerHTML = '';
        const users = storage.getUsers();
        const currentUser = auth.getCurrentUser();
        const groups = storage.getGroups();
        
        // Apply filters
        const searchTerm = document.getElementById('admin-user-search')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('admin-user-role-filter')?.value || '';
        
        let filteredUsers = users;
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(u => 
                u.name.toLowerCase().includes(searchTerm) ||
                u.username.toLowerCase().includes(searchTerm) ||
                (u.email && u.email.toLowerCase().includes(searchTerm))
            );
        }
        if (roleFilter) {
            filteredUsers = filteredUsers.filter(u => u.role === roleFilter);
        }

        filteredUsers.forEach(user => {
            const tr = document.createElement('tr');
            const isSelf = user.id === currentUser.id;
            
            // Get user's groups
            const userGroups = groups.filter(g => g.members && g.members.includes(user.id));
            const groupNames = userGroups.map(g => g.name).join(', ') || 'None';
            
            tr.innerHTML = `
                <td><input type="checkbox" class="user-checkbox" value="${user.id}" ${isSelf ? 'disabled' : ''}></td>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td><span class="role-badge role-badge-${user.role}">${user.role}</span></td>
                <td>${groupNames}</td>
                <td>
                    ${!isSelf ? `
                        <button class="action-btn action-btn-edit" onclick="app.showEditUserModal('${user.id}')" title="Edit">✏️</button>
                        <button class="action-btn action-btn-delete" onclick="app.adminDeleteUser('${user.id}')" title="Delete">🗑️</button>
                    ` : '<span style="color:#aaa;">(You)</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    filterUsers() {
        this.renderAdminUserList();
    }

    toggleUserView() {
        const btn = document.getElementById('toggle-view-btn');
        const container = document.getElementById('admin-users-list');
        
        if (container.classList.contains('user-card-grid')) {
            // Switch to table view
            container.classList.remove('user-card-grid');
            btn.textContent = '📋 Switch to Cards';
            this.renderAdminUserListTable();
        } else {
            // Switch to card view
            container.classList.add('user-card-grid');
            btn.textContent = '📋 Switch to Table';
            this.renderAdminUserListCards();
        }
    }

    toggleSelectAllUsers() {
        const selectAll = document.getElementById('select-all-users');
        const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
    }

    async bulkDeleteUsers() {
        const selected = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please select users to delete');
            } else {
                alert('Please select users to delete.');
            }
            return;
        }
        
        if (typeof modalManager !== 'undefined') {
            const confirmed = await modalManager.confirm({
                title: 'Delete Multiple Users',
                message: `Are you sure you want to delete ${selected.length} user(s)? This action cannot be undone.`,
                confirmText: 'Delete All',
                cancelText: 'Cancel'
            });
            
            if (confirmed) {
                selected.forEach(id => storage.deleteUser(id));
                if (typeof notifications !== 'undefined') {
                    notifications.success(`${selected.length} user(s) deleted successfully`);
                }

                // Add notification
                if (typeof notificationCenter !== 'undefined') {
                    notificationCenter.addNotification(
                        'info',
                        'Users Deleted',
                        `${selected.length} user(s) have been removed from the system.`,
                        'user'
                    );
                }

                this.renderAdminUserList();
                this.updateAdminStats();
            }
        } else {
            if (typeof modalManager !== 'undefined') {
                const confirmed = await modalManager.confirm({
                    title: 'Delete Multiple Users',
                    message: `Are you sure you want to delete ${selected.length} user(s)? This action cannot be undone.`,
                    confirmText: 'Delete All',
                    cancelText: 'Cancel'
                });
                if (confirmed) {
                    selected.forEach(id => storage.deleteUser(id));
                    this.renderAdminUserList();
                    this.updateAdminStats();
                }
            } else {
                if (confirm(`Are you sure you want to delete ${selected.length} user(s)?`)) {
                    selected.forEach(id => storage.deleteUser(id));
                    this.renderAdminUserList();
                    this.updateAdminStats();
                }
            }
        }
    }

    bulkAssignGroup() {
        const selected = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
        if (selected.length === 0) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'No Selection',
                    message: 'Please select users to assign to a group.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning('Please select users to assign to a group.');
            } else {
                alert('Please select users to assign to a group.');
            }
            return;
        }
        
        const groups = storage.getGroups();
        if (groups.length === 0) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showInfo({
                    title: 'No Groups',
                    message: 'No groups available. Please create a group first.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.info('No groups available. Please create a group first.');
            } else {
                alert('No groups available. Please create a group first.');
            }
            return;
        }
        
        if (typeof modalManager !== 'undefined') {
            const groupOptions = groups.map(g => `${g.id}:${g.name}`).join('\n');
            modalManager.prompt({
                title: 'Assign to Group',
                placeholder: 'Enter group ID...',
                message: `Available groups:\n${groupOptions}`
            }).then(groupId => {
                if (!groupId) return;
                
                const group = groups.find(g => g.id === groupId);
                if (!group) {
                    if (typeof popupManager !== 'undefined') {
                        popupManager.showError({
                            title: 'Group Not Found',
                            message: 'The specified group could not be found.',
                            autoClose: 3000
                        });
                    } else if (typeof notifications !== 'undefined') {
                        notifications.error('Group not found.');
                    } else {
                        alert('Group not found.');
                    }
                    return;
                }
                
                if (!group.members) group.members = [];
                selected.forEach(userId => {
                    if (!group.members.includes(userId)) {
                        group.members.push(userId);
                    }
                });
                
                storage.saveGroup(group);
                if (typeof notifications !== 'undefined') {
                    notifications.success(`Assigned ${selected.length} user(s) to ${group.name}`);
                } else {
                    alert(`Assigned ${selected.length} user(s) to ${group.name}`);
                }
                this.renderAdminUserList();
            });
        } else {
            const groupNames = groups.map(g => `${g.id}:${g.name}`).join('\n');
            const groupId = prompt(`Enter group ID to assign users to:\n\nAvailable groups:\n${groupNames}`);
            if (!groupId) return;
            
            const group = groups.find(g => g.id === groupId);
            if (!group) {
                alert('Group not found.');
                return;
            }
            
            if (!group.members) group.members = [];
            selected.forEach(userId => {
                if (!group.members.includes(userId)) {
                    group.members.push(userId);
                }
            });
            
            storage.saveGroup(group);
            if (typeof notifications !== 'undefined') {
                notifications.success(`Assigned ${selected.length} user(s) to ${group.name}`);
            } else {
                alert(`Assigned ${selected.length} user(s) to ${group.name}`);
            }
            this.renderAdminUserList();
        }
    }

    showEditUserModal(userId) {
        const user = storage.getUsers().find(u => u.id === userId);
        if (!user) {
            if (typeof notifications !== 'undefined') {
                notifications.error('User not found');
            }
            return;
        }
        
        const groups = storage.getGroups();
        const userGroups = groups.filter(g => g.members && g.members.includes(user.id));
        
        const form = document.createElement('form');
        form.id = 'edit-user-form';
        form.innerHTML = `
            <div class="form-group">
                <label>Full Name *</label>
                <input type="text" class="form-control" id="edit-user-name" value="${user.name}" required>
            </div>
            <div class="form-group">
                <label>Username *</label>
                <input type="text" class="form-control" id="edit-user-username" value="${user.username}" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" class="form-control" id="edit-user-email" value="${user.email || ''}" placeholder="email@example.com">
            </div>
            <div class="form-group">
                <label>Role *</label>
                <select class="form-control" id="edit-user-role" required>
                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>Student</option>
                    <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <div class="form-group">
                <label>Change Password</label>
                <input type="password" class="form-control" id="edit-user-password" placeholder="Leave empty to keep current password">
            </div>
            <div class="form-group">
                <label>Groups</label>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px;">
                    ${groups.length === 0 ? '<p style="color: #999; font-size: 0.9rem;">No groups available</p>' : ''}
                    ${groups.map(g => `
                        <label style="display: flex; align-items: center; gap: 8px; padding: 8px; cursor: pointer; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='transparent'">
                            <input type="checkbox" name="user-groups" value="${g.id}" ${userGroups.some(ug => ug.id === g.id) ? 'checked' : ''}>
                            <span>${g.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        
        modalManager.show({
            title: `Edit User: ${user.name}`,
            html: form,
            size: 'large',
            buttons: [
                {
                    text: 'Cancel',
                    class: 'btn-secondary',
                    onclick: () => true
                },
                {
                    text: 'Save Changes',
                    class: 'btn-primary',
                    onclick: () => {
                        return this.saveUserEdits(userId, form);
                    }
                }
            ]
        });
        
        // Focus first input
        setTimeout(() => {
            document.getElementById('edit-user-name').focus();
        }, 100);
    }

    saveUserEdits(userId, form) {
        const name = document.getElementById('edit-user-name').value.trim();
        const username = document.getElementById('edit-user-username').value.trim();
        const email = document.getElementById('edit-user-email').value.trim();
        const role = document.getElementById('edit-user-role').value;
        const password = document.getElementById('edit-user-password').value.trim();
        const selectedGroups = Array.from(form.querySelectorAll('input[name="user-groups"]:checked')).map(cb => cb.value);
        
        if (!name || !username) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Name and username are required');
            } else {
                alert('Name and username are required');
            }
            return false;
        }
        
        const users = storage.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex < 0) {
            if (typeof notifications !== 'undefined') {
                notifications.error('User not found');
            }
            return false;
        }
        
        // Check if username is taken by another user
        const existingUser = users.find(u => u.username === username && u.id !== userId);
        if (existingUser) {
            if (typeof notifications !== 'undefined') {
                notifications.error('Username already taken by another user');
            } else {
                alert('Username already taken by another user');
            }
            return false;
        }
        
        // Update user
        users[userIndex].name = name;
        users[userIndex].username = username;
        users[userIndex].email = email || undefined;
        users[userIndex].role = role;
        if (password) {
            users[userIndex].password = password;
        }
        
        // Update groups
        const groups = storage.getGroups();
        groups.forEach(group => {
            if (!group.members) group.members = [];
            const isSelected = selectedGroups.includes(group.id);
            const isMember = group.members.includes(userId);
            
            if (isSelected && !isMember) {
                group.members.push(userId);
            } else if (!isSelected && isMember) {
                group.members = group.members.filter(id => id !== userId);
            }
            
            storage.saveGroup(group);
        });
        
        const data = storage.getData();
        data.users = users;
        storage.saveData(data);
        
        if (typeof notifications !== 'undefined') {
            notifications.success('User updated successfully!');
        }
        
        this.renderAdminUserList();
        this.updateAdminStats();
        return true;
    }

    adminAddUser() {
        const uInput = document.getElementById('admin-new-username');
        const pInput = document.getElementById('admin-new-password');
        const nInput = document.getElementById('admin-new-name');
        const rInput = document.getElementById('admin-new-role');
        const eInput = document.getElementById('admin-new-email');

        const username = uInput.value.trim();
        const password = pInput.value.trim();
        const name = nInput.value.trim();
        const role = rInput.value;
        const email = eInput.value.trim();

        if (!username || !password || !name) {
            if (typeof notifications !== 'undefined') {
                notifications.warning('Please fill all required fields (Username, Password, Name)');
            } else {
                alert('Please fill all required fields (Username, Password, Name)');
            }
            // Highlight empty fields
            if (!name) nInput.focus();
            else if (!username) uInput.focus();
            else if (!password) pInput.focus();
            return;
        }

        if (storage.getUserByUsername(username)) {
            if (typeof notifications !== 'undefined') {
                notifications.error('Username already exists');
            } else {
            alert('Username already exists');
            }
            uInput.focus();
            uInput.style.borderColor = 'var(--danger-color)';
            setTimeout(() => {
                uInput.style.borderColor = '';
            }, 2000);
            return;
        }

        const newUser = {
            id: 'u_' + Date.now(),
            username,
            password,
            name,
            role,
            email: email || undefined
        };

        storage.addUser(newUser);
        
        // Reset inputs with animation
        [uInput, pInput, nInput, eInput].forEach(input => {
            input.style.transform = 'scale(0.98)';
            setTimeout(() => {
                input.value = '';
                input.style.transform = '';
            }, 150);
        });

        if (typeof notifications !== 'undefined') {
            notifications.success(`User "${name}" added successfully! 🎉`);
        }

        // Add notification
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.addNotification(
                'success',
                'User Added',
                `User "${name}" (${role}) has been added to the system.`,
                'user'
            );
        }

        this.renderAdminUserList();
        this.updateAdminStats();
        
        // Scroll to show new user
        setTimeout(() => {
            const newUserElement = document.querySelector(`[data-user-id="${newUser.id}"]`);
            if (newUserElement) {
                newUserElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newUserElement.style.animation = 'pulse 1s';
            }
        }, 100);
    }

    showBulkUserImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (file.name.endsWith('.json')) {
                        const users = JSON.parse(event.target.result);
                        if (Array.isArray(users)) {
                            let imported = 0;
                            users.forEach(user => {
                                if (!storage.getUserByUsername(user.username)) {
                                    if (!user.id) user.id = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                    storage.addUser(user);
                                    imported++;
                                }
                            });
                            if (typeof notifications !== 'undefined') {
                                notifications.success(`Successfully imported ${imported} users!`);
                            } else {
                                alert(`Successfully imported ${imported} users!`);
                            }
                            this.renderAdminUserList();
                            this.updateAdminStats();
                        } else {
                            alert('Invalid JSON format. Expected an array of users.');
                        }
                    } else if (file.name.endsWith('.csv')) {
                        // Parse CSV
                        const lines = event.target.result.split('\n');
                        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                        let imported = 0;
                        
                        for (let i = 1; i < lines.length; i++) {
                            if (!lines[i].trim()) continue;
                            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                            const user = {};
                            headers.forEach((header, idx) => {
                                user[header] = values[idx];
                            });
                            
                            if (user.username && user.password && user.name) {
                                if (!storage.getUserByUsername(user.username)) {
                                    user.id = 'u_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                                    user.role = user.role || 'student';
                                    storage.addUser(user);
                                    imported++;
                                }
                            }
                        }
                        if (typeof notifications !== 'undefined') {
                            notifications.success(`Successfully imported ${imported} users!`);
                        } else {
                            alert(`Successfully imported ${imported} users!`);
                        }
                        this.renderAdminUserList();
                        this.updateAdminStats();
                    }
                } catch (err) {
                    if (typeof popupManager !== 'undefined') {
                        popupManager.showError({
                            title: 'Import Error',
                            message: 'Error importing file: ' + err.message,
                            autoClose: 5000
                        });
                    } else if (typeof notifications !== 'undefined') {
                        notifications.error('Error importing file: ' + err.message);
                    } else {
                        alert('Error importing file: ' + err.message);
                    }
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    exportUsers() {
        const users = storage.getUsers();
        const json = JSON.stringify(users, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    adminDeleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            storage.deleteUser(userId);
            this.renderAdminUserList();
        }
    }

    adminBackupData() {
        const data = storage.getData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz_master_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    adminRestoreData(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // Basic validation
                if (data.users && data.quizzes && data.results) {
                    if (confirm('Warning: This will overwrite all current data. Continue?')) {
                        storage.saveData(data);
                        alert('Data restored successfully! The page will now reload.');
                        location.reload();
                    }
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
        // Reset input
        input.value = '';
    }

    // --- Teacher Logic ---
    showTeacherDashboard() {
        this.showView('teacher-dashboard');
        this.renderTeacherQuizList();
        this.updateTeacherStats();
    }

    showQuestionBank() {
        this.showView('question-bank-view');
        this.renderQuestionBank();
        this.populateQuestionBankFilters();
    }

    showQuizTemplates() {
        this.showView('quiz-templates-view');
        this.renderTemplates();
    }

    renderTemplates() {
        const container = document.getElementById('templates-list');
        container.innerHTML = '';
        const templates = storage.getTemplates();

        if (templates.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No templates saved yet. Create a quiz and save it as a template!</p>';
            return;
        }

        templates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3>${template.name}</h3>
                <p>${template.description || 'No description'}</p>
                <p><strong>${template.questions.length}</strong> Questions</p>
                <p><strong>${template.timeLimit}</strong> Minutes</p>
                ${template.category ? `<p><strong>Category:</strong> ${template.category}</p>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #3498db;" onclick="app.useTemplate('${template.id}')">Use Template</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e67e22;" onclick="app.cloneTemplate('${template.id}')">Clone</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e74c3c;" onclick="app.deleteTemplate('${template.id}')">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    saveCurrentQuizAsTemplate() {
        if (typeof modalManager !== 'undefined') {
            modalManager.prompt({
                title: 'Save Template',
                placeholder: 'Enter template name...'
            }).then(name => {
                if (!name) return;
                
                modalManager.prompt({
                    title: 'Template Description',
                    placeholder: 'Enter description (optional)...'
                }).then(description => {
                    modalManager.prompt({
                        title: 'Template Category',
                        placeholder: 'Enter category (optional)...'
                    }).then(category => {
                        this.saveTemplateWithDetails(name, description || '', category || '');
                    });
                });
            });
        } else {
            const name = prompt('Enter template name:');
            if (!name) return;
            
            const description = prompt('Enter template description (optional):') || '';
            const category = prompt('Enter category (optional):') || '';
            this.saveTemplateWithDetails(name, description, category);
        }
    }

    saveTemplateWithDetails(name, description, category) {
        // Get current quiz being created
        const title = document.getElementById('new-quiz-title')?.value;
        const desc = document.getElementById('new-quiz-desc')?.value || description;
        const timeLimit = parseInt(document.getElementById('new-quiz-time')?.value || '10');
        const questions = [];
        const blocks = document.querySelectorAll('.question-block');

        blocks.forEach((block, index) => {
            const textInput = block.querySelector('.q-text');
            const text = textInput ? textInput.value : '';
            const type = block.querySelector('.q-type').value;
            const options = [];
            let correctIndex = -1;
            let correctAnswerText = '';
            let mediaUrl = '';
            let mediaType = '';

            if (!text && type !== 'fill_in_blank') return;

            if (type === 'multiple_choice' || type === 'image_question' || type === 'video_question') {
                block.querySelectorAll('.q-option').forEach(opt => options.push(opt.value));
                const radio = block.querySelector('input[type="radio"]:checked');
                if (radio) correctIndex = parseInt(radio.value);
            } else if (type === 'true_false') {
                options.push('True', 'False');
                const radio = block.querySelector('input[type="radio"]:checked');
                if (radio) correctIndex = parseInt(radio.value);
            } else if (type === 'short_answer' || type === 'fill_in_blank') {
                correctAnswerText = block.querySelector('.q-correct-text')?.value || '';
            }

            if (type === 'image_question' || type === 'video_question') {
                const urlInput = block.querySelector('.q-media-url');
                mediaUrl = urlInput?.value || urlInput?.dataset.base64 || '';
                mediaType = type === 'image_question' ? 'image' : 'video';
            }

            questions.push({
                text: type === 'fill_in_blank' ? block.querySelector('.q-fill-blank-text')?.value || text : text,
                type,
                options,
                correctIndex,
                correctAnswerText: correctAnswerText || undefined,
                mediaUrl: mediaUrl || undefined,
                mediaType: mediaType || undefined
            });
        });

        const template = {
            id: 't_' + Date.now(),
            name: name,
            description: desc,
            category: category,
            timeLimit: timeLimit,
            questions: questions,
            randomizeQuestions: document.getElementById('new-quiz-randomize-questions')?.checked || false,
            randomizeOptions: document.getElementById('new-quiz-randomize-options')?.checked || false,
            allowRetake: document.getElementById('new-quiz-allow-retake')?.checked || false,
            createdAt: new Date().toISOString()
        };

        storage.saveTemplate(template);
        if (typeof notifications !== 'undefined') {
            notifications.success('Template saved successfully!');
        } else {
            alert('Template saved successfully!');
        }
        this.renderTemplates();
    }

    useTemplate(templateId) {
        const template = storage.getTemplateById(templateId);
        if (!template) return;

        // Load template into quiz creation form
        this.showCreateQuiz();
        
        // Populate form
        document.getElementById('new-quiz-title').value = template.name + ' (Copy)';
        document.getElementById('new-quiz-desc').value = template.description || '';
        document.getElementById('new-quiz-time').value = template.timeLimit;
        document.getElementById('new-quiz-randomize-questions').checked = template.randomizeQuestions || false;
        document.getElementById('new-quiz-randomize-options').checked = template.randomizeOptions || false;
        document.getElementById('new-quiz-allow-retake').checked = template.allowRetake || false;

        // Clear existing questions
        document.getElementById('questions-container').innerHTML = '';

        // Add questions from template
        template.questions.forEach((q, idx) => {
            const uniqueId = this.addQuestionBlock();
            setTimeout(() => {
                const block = document.querySelector(`.question-block[data-id="${uniqueId}"]`);
                if (block) {
                    if (q.type === 'fill_in_blank') {
                        block.querySelector('.q-fill-blank-text').value = q.text;
                    } else {
                        block.querySelector('.q-text').value = q.text;
                    }
                    block.querySelector('.q-type').value = q.type;
                    this.toggleQuestionType(block.querySelector('.q-type'));
                    
                    setTimeout(() => {
                        if (q.type === 'multiple_choice' || q.type === 'image_question' || q.type === 'video_question') {
                            const options = block.querySelectorAll('.q-option');
                            q.options.forEach((opt, optIdx) => {
                                if (options[optIdx]) options[optIdx].value = opt;
                            });
                            if (q.correctIndex >= 0) {
                                const radio = block.querySelector(`input[type="radio"][value="${q.correctIndex}"]`);
                                if (radio) radio.checked = true;
                            }
                        } else if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                            const correctInput = block.querySelector('.q-correct-text');
                            if (correctInput) correctInput.value = q.correctAnswerText || '';
                        }
                        
                        if (q.mediaUrl) {
                            const urlInput = block.querySelector('.q-media-url');
                            if (urlInput) urlInput.value = q.mediaUrl;
                        }
                    }, 200);
                }
            }, 100 * idx);
        });
    }

    cloneTemplate(templateId) {
        const template = storage.getTemplateById(templateId);
        if (!template) return;

        const newTemplate = {
            ...template,
            id: 't_' + Date.now(),
            name: template.name + ' (Copy)',
            createdAt: new Date().toISOString()
        };
        storage.saveTemplate(newTemplate);
        this.renderTemplates();
    }

    deleteTemplate(templateId) {
        if (confirm('Are you sure you want to delete this template?')) {
            storage.deleteTemplate(templateId);
            this.renderTemplates();
        }
    }

    showStudentGroups() {
        this.showView('student-groups-view');
        this.renderStudentGroups();
    }

    renderStudentGroups() {
        const container = document.getElementById('groups-list');
        container.innerHTML = '';
        const groups = storage.getGroups();
        const users = storage.getUsers();

        if (groups.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No groups created yet.</p>';
            return;
        }

        groups.forEach(group => {
            const members = (group.members || []).map(id => {
                const user = users.find(u => u.id === id);
                return user ? user.name : 'Unknown';
            });
            
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h3>${group.name}</h3>
                <p>${group.description || 'No description'}</p>
                <p><strong>${members.length}</strong> Members</p>
                <div style="margin-top: 10px;">
                    ${members.length > 0 ? `<p><strong>Members:</strong> ${members.join(', ')}</p>` : '<p>No members yet</p>'}
                </div>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #3498db;" onclick="app.editGroup('${group.id}')">Edit</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e74c3c;" onclick="app.deleteGroup('${group.id}')">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    showCreateGroup() {
        const name = prompt('Enter group name:');
        if (!name) return;
        
        const description = prompt('Enter group description (optional):') || '';
        const group = {
            id: 'g_' + Date.now(),
            name: name,
            description: description,
            members: [],
            createdAt: new Date().toISOString()
        };
        
        storage.saveGroup(group);
        this.renderStudentGroups();
    }

    editGroup(groupId) {
        const group = storage.getGroupById(groupId);
        if (!group) return;
        
        const users = storage.getUsers();
        const students = users.filter(u => u.role === 'student');
        
        let memberList = 'Current members: ' + (group.members.length > 0 ? group.members.map(id => {
            const user = users.find(u => u.id === id);
            return user ? user.name : 'Unknown';
        }).join(', ') : 'None');
        
        let available = students.filter(s => !group.members.includes(s.id)).map(s => `${s.id}:${s.name}`).join('\n');
        
        const action = prompt(`${memberList}\n\nEnter student IDs to add (comma-separated) or remove (prefix with -):\n\nAvailable: ${available}`);
        if (!action) return;
        
        const actions = action.split(',').map(a => a.trim());
        actions.forEach(action => {
            if (action.startsWith('-')) {
                const id = action.substring(1);
                group.members = group.members.filter(m => m !== id);
            } else {
                if (!group.members.includes(action)) {
                    group.members.push(action);
                }
            }
        });
        
        storage.saveGroup(group);
        this.renderStudentGroups();
    }

    deleteGroup(groupId) {
        if (confirm('Are you sure you want to delete this group?')) {
            storage.deleteGroup(groupId);
            this.renderStudentGroups();
        }
    }

    previewQuiz() {
        const quizSelect = prompt('Enter quiz ID to preview (or leave empty to preview first quiz):');
        let quiz;
        if (quizSelect) {
            quiz = storage.getQuizById(quizSelect);
        } else {
            const quizzes = storage.getQuizzes();
            quiz = quizzes[0];
        }
        
        if (quiz) {
            this.previewQuizById(quiz.id);
        } else {
            alert('Quiz not found.');
        }
    }

    previewQuizById(quizId) {
        const quiz = storage.getQuizById(quizId);
        if (!quiz) return;
        
        // Show quiz in a preview mode (similar to review but for teachers)
        this.showView('quiz-taker-view');
        document.getElementById('taking-quiz-title').textContent = "Preview: " + quiz.title;
        document.getElementById('quiz-timer').textContent = "Preview Mode";
        
        const container = document.getElementById('quiz-question-container');
        container.innerHTML = '';
        
        quiz.questions.forEach((q, idx) => {
            const points = q.points || 1;
            const div = document.createElement('div');
            div.className = 'question-block';
            div.style.marginBottom = '15px';
            div.innerHTML = `
                <p><strong>Q${idx+1} (${points} point${points > 1 ? 's' : ''}):</strong> ${q.text}</p>
                <p><strong>Type:</strong> ${q.type.replace('_', ' ')}</p>
                ${q.options && q.options.length > 0 ? `<p><strong>Options:</strong> ${q.options.join(', ')}</p>` : ''}
                ${q.correctIndex !== undefined ? `<p><strong>Correct Answer:</strong> ${q.type === 'true_false' ? (q.correctIndex === 0 ? 'True' : 'False') : q.options[q.correctIndex]}</p>` : ''}
                ${q.correctAnswerText ? `<p><strong>Correct Answer:</strong> ${q.correctAnswerText}</p>` : ''}
                ${q.explanation ? `<p><strong>Explanation:</strong> ${q.explanation}</p>` : ''}
            `;
            container.appendChild(div);
        });
        
        // Hide Nav buttons
        document.getElementById('btn-prev').classList.add('hidden');
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-submit').classList.add('hidden');
        
        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.textContent = 'Back to Dashboard';
        backBtn.onclick = () => app.showTeacherDashboard();
        container.appendChild(backBtn);
    }

    showStudentPerformance() {
        this.showView('student-performance-view');
        this.populatePerformanceFilters();
        this.renderStudentPerformance();
    }

    populatePerformanceFilters() {
        const groupSelect = document.getElementById('performance-filter-group');
        const quizSelect = document.getElementById('performance-filter-quiz');
        
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="">All Groups</option>';
            const groups = storage.getGroups();
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                groupSelect.appendChild(option);
            });
        }
        
        if (quizSelect) {
            quizSelect.innerHTML = '<option value="">All Quizzes</option>';
            const quizzes = storage.getQuizzes();
            quizzes.forEach(quiz => {
                const option = document.createElement('option');
                option.value = quiz.id;
                option.textContent = quiz.title;
                quizSelect.appendChild(option);
            });
        }
    }

    filterStudentPerformance() {
        this.renderStudentPerformance();
    }

    renderStudentPerformance() {
        const container = document.getElementById('student-performance-list');
        container.innerHTML = '';
        
        const groupFilter = document.getElementById('performance-filter-group').value;
        const quizFilter = document.getElementById('performance-filter-quiz').value;
        const gradeFilter = document.getElementById('performance-filter-grade').value;
        
        const users = storage.getUsers();
        const students = users.filter(u => u.role === 'student');
        const results = storage.getAllResults();
        const quizzes = storage.getQuizzes();
        const groups = storage.getGroups();
        
        // Filter students by group if selected
        let filteredStudents = students;
        if (groupFilter) {
            const group = groups.find(g => g.id === groupFilter);
            if (group && group.members) {
                filteredStudents = students.filter(s => group.members.includes(s.id));
            } else {
                filteredStudents = [];
            }
        }
        
        // Calculate performance for each student
        const studentPerformance = filteredStudents.map(student => {
            let studentResults = results.filter(r => r.studentId === student.id);
            
            // Filter by quiz if selected
            if (quizFilter) {
                studentResults = studentResults.filter(r => r.quizId === quizFilter);
            }
            
            if (studentResults.length === 0) {
                return {
                    student: student,
                    attempts: 0,
                    averageScore: 0,
                    highestScore: 0,
                    lowestScore: 0,
                    results: [],
                    grade: 'N/A'
                };
            }
            
            const scores = studentResults.map(r => r.manualScore !== null ? r.manualScore : r.score);
            const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            const highScore = Math.max(...scores);
            const lowScore = Math.min(...scores);
            
            // Determine grade
            let grade = 'F';
            if (avgScore >= 90) grade = 'A';
            else if (avgScore >= 80) grade = 'B';
            else if (avgScore >= 70) grade = 'C';
            else if (avgScore >= 60) grade = 'D';
            
            // Filter by grade if selected
            if (gradeFilter) {
                const [min, max] = gradeFilter.split('-').map(Number);
                if (avgScore < min || avgScore > max) {
                    return null; // Exclude this student
                }
            }
            
            return {
                student: student,
                attempts: studentResults.length,
                averageScore: avgScore,
                highestScore: highScore,
                lowestScore: lowScore,
                results: studentResults.sort((a, b) => new Date(b.date) - new Date(a.date)),
                grade: grade
            };
        }).filter(sp => sp !== null);
        
        if (studentPerformance.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px;">No students found matching the filters.</p>';
            return;
        }
        
        // Sort by average score (descending)
        studentPerformance.sort((a, b) => b.averageScore - a.averageScore);
        
        // Create table
        const table = document.createElement('table');
        table.style.width = '100%';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Student Name</th>
                    <th>Group/Class</th>
                    <th>Attempts</th>
                    <th>Average Score</th>
                    <th>Grade</th>
                    <th>Highest</th>
                    <th>Lowest</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="student-performance-table-body">
            </tbody>
        `;
        container.appendChild(table);
        
        const tbody = document.getElementById('student-performance-table-body');
        studentPerformance.forEach((sp, index) => {
            // Find student's groups
            const studentGroups = groups.filter(g => g.members && g.members.includes(sp.student.id));
            const groupNames = studentGroups.map(g => g.name).join(', ') || 'No Group';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${sp.student.name}</strong></td>
                <td>${groupNames}</td>
                <td>${sp.attempts}</td>
                <td><strong>${sp.averageScore}%</strong></td>
                <td><span style="font-weight: bold; color: ${this.getGradeColor(sp.grade)}">${sp.grade}</span></td>
                <td>${sp.highestScore}%</td>
                <td>${sp.lowestScore}%</td>
                <td>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 3px 8px; background: #3498db;" onclick="app.showStudentDetail('${sp.student.id}')">View Details</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    getGradeColor(grade) {
        const colors = {
            'A': '#2ecc71',
            'B': '#3498db',
            'C': '#f39c12',
            'D': '#e67e22',
            'F': '#e74c3c',
            'N/A': '#95a5a6'
        };
        return colors[grade] || '#95a5a6';
    }

    showStudentDetail(studentId) {
        this.currentStudentId = studentId;
        this.showView('student-detail-view');
        this.renderStudentDetail(studentId);
    }

    renderStudentDetail(studentId) {
        const student = storage.getUsers().find(u => u.id === studentId);
        if (!student) return;
        
        document.getElementById('student-detail-name').textContent = `Student Details: ${student.name}`;
        
        const results = storage.getAllResults().filter(r => r.studentId === studentId);
        const quizzes = storage.getQuizzes();
        
        if (results.length === 0) {
            document.getElementById('detail-total-attempts').textContent = '0';
            document.getElementById('detail-avg-score').textContent = '0%';
            document.getElementById('detail-high-score').textContent = '0%';
            document.getElementById('detail-low-score').textContent = '0%';
            document.getElementById('student-detail-attempts-list').innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No attempts yet.</td></tr>';
            return;
        }
        
        const scores = results.map(r => r.manualScore !== null ? r.manualScore : r.score);
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const highScore = Math.max(...scores);
        const lowScore = Math.min(...scores);
        
        document.getElementById('detail-total-attempts').textContent = results.length;
        document.getElementById('detail-avg-score').textContent = avgScore + '%';
        document.getElementById('detail-high-score').textContent = highScore + '%';
        document.getElementById('detail-low-score').textContent = lowScore + '%';
        
        // Render chart
        setTimeout(() => {
            analytics.renderPerformanceOverTime('student-detail-chart', studentId);
        }, 100);
        
        // Render attempts table
        const tbody = document.getElementById('student-detail-attempts-list');
        tbody.innerHTML = '';
        
        results.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((result, index) => {
            const quiz = quizzes.find(q => q.id === result.quizId);
            const score = result.manualScore !== null ? result.manualScore : result.score;
            const points = result.earnedPoints !== undefined ? `${result.earnedPoints}/${result.totalPoints}` : 'N/A';
            const date = new Date(result.date);
            const status = result.gradingStatus || 'auto';
            const statusColors = {
                'auto': '#95a5a6',
                'pending': '#f39c12',
                'graded': '#3498db',
                'reviewed': '#2ecc71'
            };
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${quiz ? quiz.title : 'Deleted Quiz'}</td>
                <td>${date.toLocaleString()}</td>
                <td><strong>${score}%</strong></td>
                <td>${points}</td>
                <td>${result.correctCount}/${result.totalQuestions}</td>
                <td><span style="color: ${statusColors[status] || '#95a5a6'}; text-transform: capitalize;">${status}</span></td>
                <td>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 3px 8px; background: #3498db;" onclick="app.showAttemptDetail('${result.id}')">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    showAttemptDetail(resultId) {
        this.currentAttemptId = resultId;
        this.showView('attempt-detail-view');
        this.renderAttemptDetail(resultId);
    }

    showStudentDetail() {
        if (this.currentStudentId) {
            this.renderStudentDetail(this.currentStudentId);
            this.showView('student-detail-view');
        } else {
            this.showStudentPerformance();
        }
    }

    renderAttemptDetail(resultId) {
        const results = storage.getAllResults();
        const result = results.find(r => r.id === resultId);
        if (!result) return;
        
        const quiz = storage.getQuizById(result.quizId);
        const users = storage.getUsers();
        const student = users.find(u => u.id === result.studentId);
        
        if (!quiz || !student) return;
        
        document.getElementById('attempt-detail-title').textContent = `Attempt Details: ${quiz.title}`;
        document.getElementById('attempt-student-name').textContent = student.name;
        document.getElementById('attempt-quiz-title').textContent = quiz.title;
        document.getElementById('attempt-date').textContent = new Date(result.date).toLocaleString();
        
        const score = result.manualScore !== null ? result.manualScore : result.score;
        document.getElementById('attempt-score').textContent = score + '%';
        document.getElementById('attempt-points').textContent = result.earnedPoints !== undefined ? `${result.earnedPoints} / ${result.totalPoints}` : 'N/A';
        
        // Calculate time taken (if we had start time, but for now show duration estimate)
        const timeEstimate = quiz.timeLimit ? `${quiz.timeLimit} min (estimated)` : 'N/A';
        document.getElementById('attempt-duration').textContent = timeEstimate;
        
        // Render questions
        const container = document.getElementById('attempt-questions-container');
        container.innerHTML = '';
        
        quiz.questions.forEach((q, idx) => {
            const userAnswer = result.answers[q.id];
            const points = q.points || 1;
            let isCorrect = false;
            let correctAnswerDisplay = '';
            let userAnswerDisplay = '';
            
            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                isCorrect = userAnswer && q.correctAnswerText && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase();
                correctAnswerDisplay = q.correctAnswerText;
                userAnswerDisplay = userAnswer || '(No Answer)';
            } else {
                isCorrect = userAnswer === q.correctIndex;
                if (q.type === 'true_false') {
                    correctAnswerDisplay = q.correctIndex === 0 ? 'True' : 'False';
                    userAnswerDisplay = userAnswer === 0 ? 'True' : userAnswer === 1 ? 'False' : '(No Answer)';
                } else {
                    correctAnswerDisplay = q.options[q.correctIndex];
                    userAnswerDisplay = userAnswer !== undefined ? q.options[userAnswer] : '(No Answer)';
                }
            }
            
            const earnedPoints = isCorrect ? points : 0;
            
            const div = document.createElement('div');
            div.className = 'card';
            div.style.marginBottom = '15px';
            div.style.borderLeft = isCorrect ? '5px solid #2ecc71' : '5px solid #e74c3c';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4>Question ${idx + 1} (${points} point${points > 1 ? 's' : ''})</h4>
                    <span style="font-size: 1.2em; font-weight: bold; color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">
                        ${isCorrect ? '✓' : '✗'} ${earnedPoints}/${points}
                    </span>
                </div>
                <p style="margin-bottom: 10px;"><strong>${q.text}</strong></p>
                <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; margin-bottom: 10px;">
                    <p><strong>Student Answer:</strong> ${userAnswerDisplay}</p>
                    <p style="color: ${isCorrect ? '#2ecc71' : '#e74c3c'}; margin-top: 5px;">
                        <strong>${isCorrect ? 'Correct!' : 'Incorrect'}</strong>
                        ${!isCorrect ? ` - Correct Answer: ${correctAnswerDisplay}` : ''}
                    </p>
                </div>
                ${q.explanation && quiz.showExplanations ? `
                    <div style="padding: 10px; background: #e8f4f8; border-radius: 4px; margin-top: 10px;">
                        <strong>Explanation:</strong> ${q.explanation}
                    </div>
                ` : ''}
                ${result.feedback && result.feedback[q.id] ? `
                    <div style="padding: 10px; background: #fff3cd; border-radius: 4px; margin-top: 10px;">
                        <strong>Teacher Feedback:</strong> ${result.feedback[q.id]}
                    </div>
                ` : ''}
            `;
            container.appendChild(div);
        });
    }

    exportStudentPerformance() {
        const groupFilter = document.getElementById('performance-filter-group').value;
        const quizFilter = document.getElementById('performance-filter-quiz').value;
        const gradeFilter = document.getElementById('performance-filter-grade').value;
        
        const users = storage.getUsers();
        const students = users.filter(u => u.role === 'student');
        const results = storage.getAllResults();
        const quizzes = storage.getQuizzes();
        const groups = storage.getGroups();
        
        let filteredStudents = students;
        if (groupFilter) {
            const group = groups.find(g => g.id === groupFilter);
            if (group && group.members) {
                filteredStudents = students.filter(s => group.members.includes(s.id));
            } else {
                filteredStudents = [];
            }
        }
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student Name,Group,Quiz,Attempt #,Date,Score (%),Points,Correct/Total,Grade,Status\n";
        
        filteredStudents.forEach(student => {
            let studentResults = results.filter(r => r.studentId === student.id);
            if (quizFilter) {
                studentResults = studentResults.filter(r => r.quizId === quizFilter);
            }
            
            const studentGroups = groups.filter(g => g.members && g.members.includes(student.id));
            const groupNames = studentGroups.map(g => g.name).join('; ') || 'No Group';
            
            studentResults.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((result, index) => {
                const quiz = quizzes.find(q => q.id === result.quizId);
                const score = result.manualScore !== null ? result.manualScore : result.score;
                const points = result.earnedPoints !== undefined ? `${result.earnedPoints}/${result.totalPoints}` : 'N/A';
                const date = new Date(result.date).toLocaleString();
                const status = result.gradingStatus || 'auto';
                
                let grade = 'F';
                if (score >= 90) grade = 'A';
                else if (score >= 80) grade = 'B';
                else if (score >= 70) grade = 'C';
                else if (score >= 60) grade = 'D';
                
                if (gradeFilter) {
                    const [min, max] = gradeFilter.split('-').map(Number);
                    if (score < min || score > max) return; // Skip this attempt
                }
                
                csvContent += `"${student.name}","${groupNames}","${quiz ? quiz.title : 'Deleted Quiz'}",${index + 1},"${date}",${score},"${points}",${result.correctCount}/${result.totalQuestions},"${grade}","${status}"\n`;
            });
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `student_performance_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    populateQuestionBankFilters() {
        const topics = questionBank.getTopics();
        const topicSelect = document.getElementById('qb-filter-topic');
        topicSelect.innerHTML = '<option value="">All Topics</option>';
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic;
            option.textContent = topic;
            topicSelect.appendChild(option);
        });
    }

    renderQuestionBank() {
        const container = document.getElementById('question-bank-list');
        container.innerHTML = '';
        const questions = questionBank.getQuestionBank();

        if (questions.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No questions in bank yet. Add your first question!</p>';
            return;
        }

        questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h4>${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}</h4>
                <p><strong>Type:</strong> ${q.type.replace('_', ' ')}</p>
                ${q.topic ? `<p><strong>Topic:</strong> ${q.topic}</p>` : ''}
                ${q.difficulty ? `<p><strong>Difficulty:</strong> ${q.difficulty}</p>` : ''}
                ${q.tags && q.tags.length > 0 ? `<p><strong>Tags:</strong> ${q.tags.join(', ')}</p>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #3498db;" onclick="app.addQuestionFromBank('${q.id}')">Add to Quiz</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e67e22;" onclick="app.editQuestionInBank('${q.id}')">Edit</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e74c3c;" onclick="app.deleteQuestionFromBank('${q.id}')">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    searchQuestionBank() {
        const query = document.getElementById('qb-search').value;
        const filters = {
            topic: document.getElementById('qb-filter-topic').value,
            difficulty: document.getElementById('qb-filter-difficulty').value,
            type: document.getElementById('qb-filter-type').value
        };

        const results = questionBank.searchQuestions(query, filters);
        const container = document.getElementById('question-bank-list');
        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No questions found.</p>';
            return;
        }

        results.forEach(q => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <h4>${q.text.substring(0, 50)}${q.text.length > 50 ? '...' : ''}</h4>
                <p><strong>Type:</strong> ${q.type.replace('_', ' ')}</p>
                ${q.topic ? `<p><strong>Topic:</strong> ${q.topic}</p>` : ''}
                ${q.difficulty ? `<p><strong>Difficulty:</strong> ${q.difficulty}</p>` : ''}
                ${q.tags && q.tags.length > 0 ? `<p><strong>Tags:</strong> ${q.tags.join(', ')}</p>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #3498db;" onclick="app.addQuestionFromBank('${q.id}')">Add to Quiz</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e67e22;" onclick="app.editQuestionInBank('${q.id}')">Edit</button>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 5px 10px; background: #e74c3c;" onclick="app.deleteQuestionFromBank('${q.id}')">Delete</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    addQuestionFromBank(questionId) {
        const q = questionBank.getQuestionById(questionId);
        if (!q) return;

        // Check if we're in quiz creation view
        const createView = document.getElementById('create-quiz-view');
        if (createView && createView.classList.contains('active')) {
            // Add to current quiz being created
            const uniqueId = this.addQuestionBlock();
            setTimeout(() => {
                const block = document.querySelector(`.question-block[data-id="${uniqueId}"]`);
                if (block) {
                    if (q.type === 'fill_in_blank') {
                        block.querySelector('.q-fill-blank-text').value = q.text;
                    } else {
                        block.querySelector('.q-text').value = q.text;
                    }
                    block.querySelector('.q-type').value = q.type;
                    this.toggleQuestionType(block.querySelector('.q-type'));
                    
                    // Populate based on type
                    setTimeout(() => {
                        if (q.type === 'multiple_choice' || q.type === 'image_question' || q.type === 'video_question') {
                            const options = block.querySelectorAll('.q-option');
                            q.options.forEach((opt, idx) => {
                                if (options[idx]) options[idx].value = opt;
                            });
                            if (q.correctIndex >= 0 && q.correctIndex < q.options.length) {
                                const radio = block.querySelector(`input[type="radio"][name*="correct"][value="${q.correctIndex}"]`);
                                if (radio) radio.checked = true;
                            }
                        } else if (q.type === 'short_answer') {
                            const correctInput = block.querySelector('.q-correct-text');
                            if (correctInput) correctInput.value = q.correctAnswerText || '';
                        } else if (q.type === 'fill_in_blank') {
                            const correctInput = block.querySelector('.q-correct-text');
                            if (correctInput) correctInput.value = q.correctAnswerText || '';
                        }
                        
                        if (q.mediaUrl) {
                            const urlInput = block.querySelector('.q-media-url');
                            if (urlInput) {
                                urlInput.value = q.mediaUrl;
                                if (q.mediaType === 'image') {
                                    const preview = block.querySelector('.q-media-preview');
                                    if (preview) preview.innerHTML = `<img src="${q.mediaUrl}" style="max-width:300px; max-height:200px; border:1px solid #ddd; border-radius:4px;">`;
                                } else if (q.mediaType === 'video') {
                                    const preview = block.querySelector('.q-media-preview');
                                    if (preview) preview.innerHTML = `<video src="${q.mediaUrl}" controls style="max-width:300px; max-height:200px; border:1px solid #ddd; border-radius:4px;"></video>`;
                                }
                            }
                        }
                    }, 200);
                }
            }, 100);
        } else {
            alert('Please go to Create Quiz view first to add questions from the bank.');
        }
    }

    deleteQuestionFromBank(questionId) {
        if (confirm('Are you sure you want to delete this question from the bank?')) {
            questionBank.deleteQuestion(questionId);
            this.renderQuestionBank();
        }
    }

    editQuestionInBank(questionId) {
        // For now, just show an alert - full edit UI can be added later
        if (typeof popupManager !== 'undefined') {
            popupManager.showInfo({
                title: 'Coming Soon',
                message: 'Edit functionality coming soon. For now, delete and re-add the question.',
                autoClose: 4000
            });
        } else if (typeof notifications !== 'undefined') {
            notifications.info('Edit functionality coming soon. For now, delete and re-add the question.');
        } else {
            alert('Edit functionality coming soon. For now, delete and re-add the question.');
        }
    }

    exportQuestionBank() {
        const questions = questionBank.exportQuestions();
        const json = JSON.stringify(questions, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `question_bank_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importQuestionBank(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const questions = JSON.parse(e.target.result);
                if (Array.isArray(questions)) {
                    const count = questionBank.bulkImport(questions);
                    if (typeof notifications !== 'undefined') {
                        notifications.success(`Successfully imported ${count} questions!`);
                    } else {
                        alert(`Successfully imported ${count} questions!`);
                    }
                    this.renderQuestionBank();
                } else {
                    alert('Invalid file format. Expected an array of questions.');
                }
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
        input.value = '';
    }

    addFromQuestionBank(blockElement) {
        // Show a modal or dialog to select from question bank
        // For now, just show the question bank view
        this.showQuestionBank();
        // Store reference to add to this block when selected
        this.currentQuestionBlock = blockElement;
    }

    updateTeacherStats() {
        const quizzes = storage.getQuizzes();
        const users = storage.getUsers();
        document.getElementById('teacher-total-quizzes').textContent = quizzes.length;
        document.getElementById('teacher-total-students').textContent = users.filter(u => u.role === 'student').length;
    }

    renderTeacherQuizList() {
        const tbody = document.getElementById('teacher-quiz-list');
        tbody.innerHTML = '';
        const quizzes = storage.getQuizzes();
        const results = storage.getAllResults();

        quizzes.forEach((quiz, index) => {
            const status = quiz.status || 'draft';
            const statusColor = status === 'published' ? '#2ecc71' : '#f39c12';
            const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
            const gradingMode = quiz.gradingMode || 'auto';
            const quizResults = results.filter(r => r.quizId === quiz.id);
            const pendingCount = quizResults.filter(r => r.gradingStatus === 'pending' || (gradingMode === 'manual' && r.gradingStatus === 'auto')).length;
            const difficulty = quiz.difficulty || 'medium';
            const difficultyColors = { easy: '#2ecc71', medium: '#f39c12', hard: '#e74c3c' };
            const difficultyLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
            
            // Determine results availability
            let resultsStatus = 'Available';
            if (quiz.showGrades === 'never') resultsStatus = 'Hidden';
            else if (quiz.showGrades === 'scheduled' && quiz.gradesTime) {
                const now = new Date();
                const scheduled = new Date(quiz.gradesTime);
                resultsStatus = now >= scheduled ? 'Available' : `Scheduled: ${scheduled.toLocaleDateString()}`;
            } else if (gradingMode === 'manual') {
                resultsStatus = `${pendingCount} pending`;
            }
            
            const tr = document.createElement('tr');
            tr.className = 'fade-in-up';
            tr.style.animationDelay = `${index * 0.05}s`;
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <strong>${quiz.title}</strong>
                        ${quiz.categories && quiz.categories.length > 0 ? `
                            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                                ${quiz.categories.map(cat => `<span class="badge badge-info" style="font-size: 0.75rem; padding: 2px 8px;">${cat}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td>${quiz.questions.length} <span style="color: #666;">(${totalPoints} pts)</span></td>
                <td>${quiz.timeLimit} min</td>
                <td>
                    <span class="badge" style="background: ${statusColor}; color: white; text-transform: capitalize;">${status}</span>
                    <span class="badge" style="background: ${difficultyColors[difficulty]}; color: white; margin-left: 5px;">${difficultyLabels[difficulty]}</span>
                </td>
                <td><span style="text-transform: capitalize;">${gradingMode}</span> ${pendingCount > 0 ? `<span class="badge badge-warning">${pendingCount} pending</span>` : ''}</td>
                <td>${resultsStatus}</td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="action-btn action-btn-view" onclick="app.previewQuizById('${quiz.id}')" title="Preview">👁️</button>
                        <button class="action-btn action-btn-edit" onclick="app.editQuiz('${quiz.id}')" title="Edit">✏️</button>
                        <button class="action-btn" style="background: #9b59b6; color: white;" onclick="app.showQuizStatistics('${quiz.id}')" title="Statistics">📊</button>
                        <button class="action-btn" style="background: #16a085; color: white;" onclick="app.duplicateQuiz('${quiz.id}')" title="Duplicate">📋</button>
                        ${pendingCount > 0 ? `<button class="action-btn" style="background: #e67e22; color: white;" onclick="app.showGradingQueue(); document.getElementById('grading-filter-quiz').value='${quiz.id}'; app.renderGradingQueue();" title="Grade">📝</button>` : ''}
                        <button class="action-btn action-btn-delete" onclick="app.deleteQuiz('${quiz.id}')" title="Delete">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async deleteQuiz(id) {
        const quiz = storage.getQuizById(id);
        const quizTitle = quiz ? quiz.title : 'this quiz';
        
        let confirmed = false;
        if (typeof modalManager !== 'undefined') {
            confirmed = await modalManager.confirm({
                title: 'Delete Quiz',
                message: `Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel'
            });
        } else {
            confirmed = confirm(`Are you sure you want to delete "${quizTitle}"?`);
        }

        if (confirmed) {
            storage.deleteQuiz(id);
            this.renderTeacherQuizList();
            this.updateTeacherStats();
            
            if (typeof notifications !== 'undefined') {
                notifications.success('Quiz deleted successfully');
            }

            if (typeof notificationCenter !== 'undefined') {
                notificationCenter.addNotification(
                    'info',
                    'Quiz Deleted',
                    `Quiz "${quizTitle}" has been deleted.`,
                    'quiz'
                );
            }
        }
    }

    duplicateQuiz(quizId) {
        const quiz = storage.getQuizById(quizId);
        if (!quiz) {
            if (typeof notifications !== 'undefined') {
                notifications.error('Quiz not found');
            }
            return;
        }

        if (typeof modalManager !== 'undefined') {
            modalManager.prompt({
                title: 'Duplicate Quiz',
                placeholder: 'Enter new quiz title...',
                value: `${quiz.title} (Copy)`,
                confirmText: 'Duplicate',
                cancelText: 'Cancel'
            }).then(newTitle => {
                if (newTitle) {
                    const duplicatedQuiz = {
                        ...quiz,
                        id: 'q_' + Date.now(),
                        title: newTitle,
                        status: 'draft',
                        createdAt: new Date().toISOString()
                    };
                    
                    // Remove result-related data
                    delete duplicatedQuiz.results;
                    
                    storage.saveQuiz(duplicatedQuiz);
                    
                    if (typeof notifications !== 'undefined') {
                        notifications.success(`Quiz "${newTitle}" created successfully!`);
                    }
                    
                    this.renderTeacherQuizList();
                    this.updateTeacherStats();
                }
            });
        } else {
            const newTitle = prompt('Enter new quiz title:', `${quiz.title} (Copy)`);
            if (newTitle) {
                const duplicatedQuiz = {
                    ...quiz,
                    id: 'q_' + Date.now(),
                    title: newTitle,
                    status: 'draft',
                    createdAt: new Date().toISOString()
                };
                
                delete duplicatedQuiz.results;
                storage.saveQuiz(duplicatedQuiz);
                this.renderTeacherQuizList();
                this.updateTeacherStats();
            }
        }
    }

    showQuizStatistics(quizId) {
        const quiz = storage.getQuizById(quizId);
        if (!quiz) {
            if (typeof notifications !== 'undefined') {
                notifications.error('Quiz not found');
            }
            return;
        }

        this.showView('quiz-statistics-view');
        this.addBreadcrumb([
            { text: 'Dashboard', onclick: () => this.showTeacherDashboard() },
            { text: 'Quiz Statistics', active: true }
        ]);

        document.getElementById('quiz-stats-title').textContent = `Statistics: ${quiz.title}`;

        const results = storage.getAllResults().filter(r => r.quizId === quizId);
        const users = storage.getUsers();

        // Calculate statistics
        const totalAttempts = results.length;
        const avgScore = totalAttempts > 0 
            ? Math.round(results.reduce((sum, r) => sum + (r.manualScore || r.score), 0) / totalAttempts)
            : 0;
        
        // Calculate completion rate (assuming all results are completed)
        const completionRate = 100; // All results are completed
        
        // Calculate pass rate using quiz-specific pass mark (default 50%)
        const passThreshold = typeof quiz.passMark === 'number' ? quiz.passMark : 50;
        const passedCount = results.filter(r => (r.manualScore || r.score) >= passThreshold).length;
        const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;

        document.getElementById('quiz-stats-attempts').textContent = totalAttempts;
        document.getElementById('quiz-stats-avg-score').textContent = avgScore + '%';
        document.getElementById('quiz-stats-completion').textContent = completionRate + '%';
        document.getElementById('quiz-stats-pass-rate').textContent = passRate + '%';

        // Render score distribution chart
        setTimeout(() => {
            if (typeof analytics !== 'undefined') {
                analytics.renderScoreDistribution('quiz-stats-score-chart', quizId);
            }
        }, 100);

        // Question performance
        const questionStats = {};
        quiz.questions.forEach(q => {
            questionStats[q.id] = {
                question: q,
                total: 0,
                correct: 0,
                percentage: 0
            };
        });

        results.forEach(result => {
            quiz.questions.forEach(q => {
                questionStats[q.id].total++;
                const userAnswer = result.answers[q.id];
                let isCorrect = false;
                
                if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                    isCorrect = userAnswer && q.correctAnswerText && 
                        userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase();
                } else {
                    isCorrect = userAnswer === q.correctIndex;
                }
                
                if (isCorrect) {
                    questionStats[q.id].correct++;
                }
            });
        });

        Object.values(questionStats).forEach(stat => {
            stat.percentage = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        });

        const questionsContainer = document.getElementById('quiz-stats-questions');
        questionsContainer.innerHTML = '';

        Object.values(questionStats)
            .sort((a, b) => a.percentage - b.percentage) // Sort by difficulty (lowest percentage first)
            .forEach((stat, index) => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid ' + 
                    (stat.percentage >= 70 ? '#2ecc71' : stat.percentage >= 50 ? '#f39c12' : '#e74c3c') + ';';
                div.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                        <strong>Q${index + 1}: ${stat.question.text.substring(0, 100)}${stat.question.text.length > 100 ? '...' : ''}</strong>
                        <span style="font-weight: bold; color: ${stat.percentage >= 70 ? '#2ecc71' : stat.percentage >= 50 ? '#f39c12' : '#e74c3c'};">
                            ${stat.percentage}%
                        </span>
                    </div>
                    <div style="font-size: 0.9rem; color: #666;">
                        ${stat.correct} / ${stat.total} correct (${stat.total - stat.correct} missed)
                    </div>
                    <div class="progress-indicator" style="margin-top: 8px;">
                        <div class="progress-indicator-fill" style="width: ${stat.percentage}%;"></div>
                    </div>
                `;
                questionsContainer.appendChild(div);
            });

        // Recent attempts
        const recentAttempts = results
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        const attemptsTbody = document.getElementById('quiz-stats-recent-attempts');
        attemptsTbody.innerHTML = '';

        if (recentAttempts.length === 0) {
            attemptsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #999;">No attempts yet</td></tr>';
        } else {
            recentAttempts.forEach(result => {
                const student = users.find(u => u.id === result.studentId);
                const score = result.manualScore || result.score;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student ? student.name : 'Unknown'}</td>
                    <td>${new Date(result.date).toLocaleString()}</td>
                    <td><strong>${score}%</strong></td>
                    <td>${quiz.timeLimit} min (estimated)</td>
                    <td><span class="badge badge-${result.gradingStatus === 'graded' ? 'success' : result.gradingStatus === 'pending' ? 'warning' : 'info'}">${result.gradingStatus || 'auto'}</span></td>
                `;
                attemptsTbody.appendChild(tr);
            });
        }
    }

    showCreateQuiz() {
        // Reset editing state
        this.editingQuizId = null;
        
        this.showView('create-quiz-view');
        this.addBreadcrumb([
            { text: 'Dashboard', onclick: () => this.showTeacherDashboard() },
            { text: 'Create Quiz', active: true }
        ]);
        // Reset form
        document.getElementById('new-quiz-title').value = '';
        document.getElementById('new-quiz-desc').value = '';
        document.getElementById('new-quiz-time').value = '10';
        document.getElementById('new-quiz-status').value = 'draft';
        document.getElementById('new-quiz-start-date').value = '';
        document.getElementById('new-quiz-end-date').value = '';
        document.getElementById('new-quiz-password').value = '';
        document.getElementById('new-quiz-instructions').value = '';
        document.getElementById('new-quiz-randomize-questions').checked = false;
        document.getElementById('new-quiz-randomize-options').checked = false;
        document.getElementById('new-quiz-allow-retake').checked = false;
        document.getElementById('new-quiz-show-explanations').checked = false;
        document.getElementById('new-quiz-grading-mode').value = 'auto';
        document.getElementById('new-quiz-results-time').value = '';
        document.getElementById('new-quiz-show-answers').value = 'immediately';
        document.getElementById('new-quiz-answers-time').value = '';
        document.getElementById('new-quiz-show-grades').value = 'immediately';
        document.getElementById('new-quiz-grades-time').value = '';
        if (document.getElementById('new-quiz-pass-mark')) {
            document.getElementById('new-quiz-pass-mark').value = '50';
        }
        if (document.getElementById('new-quiz-difficulty')) {
            document.getElementById('new-quiz-difficulty').value = 'medium';
        }
        if (document.getElementById('new-quiz-category')) {
            document.getElementById('new-quiz-category').value = '';
        }
        this.toggleGradingSettings();
        document.getElementById('questions-container').innerHTML = '';
        document.getElementById('quiz-sections-container').innerHTML = '<div class="section-item" style="margin-bottom: 10px;"><input type="text" class="section-title" placeholder="Section Title (e.g., Mathematics)" style="width: 200px; padding: 5px;"><input type="number" class="section-time" placeholder="Time (min)" style="width: 100px; padding: 5px; margin-left: 10px;"><button onclick="this.parentElement.remove()" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; cursor: pointer; margin-left: 10px;">Remove</button></div>';
        document.getElementById('quiz-assigned-students').innerHTML = '';
        
        // Update page title
        const pageTitle = document.querySelector('#create-quiz-view h2');
        if (pageTitle) pageTitle.textContent = 'Create New Quiz';
        
        // Update save button text
        const saveButton = document.querySelector('#create-quiz-view .btn-success');
        if (saveButton) saveButton.textContent = 'Save Quiz';
        
        // Populate dropdowns - will be called again in showView after animation
        // But also call here as backup with multiple attempts
        setTimeout(() => {
            this.populateAssignmentDropdowns();
        }, 100);
        setTimeout(() => {
            this.populateAssignmentDropdowns();
        }, 500);
        
        this.addQuestionBlock(); // Add one empty question by default
        this.updateConditionDropdowns();
    }

    populateAssignmentDropdowns() {
        const studentSelect = document.getElementById('quiz-assign-student-select');
        const groupSelect = document.getElementById('quiz-assign-group-select');
        const statusDiv = document.getElementById('assignment-dropdown-status');
        
        if (!studentSelect || !groupSelect) {
            console.warn('Assignment dropdowns not found. Retrying...');
            if (statusDiv) {
                statusDiv.innerHTML = '<span style="color: #e74c3c;">⚠️ Loading dropdowns...</span>';
            }
            // Retry after a short delay
            setTimeout(() => this.populateAssignmentDropdowns(), 200);
            return;
        }
        
        // Populate students dropdown
        studentSelect.innerHTML = '<option value="">Select Student...</option>';
        const students = storage.getUsers().filter(u => u.role === 'student');
        
        if (students.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No students available';
            option.disabled = true;
            studentSelect.appendChild(option);
        } else {
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.name} (${student.username})`;
                studentSelect.appendChild(option);
            });
        }
        
        // Populate groups dropdown
        groupSelect.innerHTML = '<option value="">Select Group...</option>';
        const groups = storage.getGroups();
        
        if (groups.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No groups available';
            option.disabled = true;
            groupSelect.appendChild(option);
        } else {
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                const memberCount = group.members ? group.members.length : 0;
                option.textContent = `${group.name} (${memberCount} member${memberCount !== 1 ? 's' : ''})`;
                groupSelect.appendChild(option);
            });
        }
        
        // Update status message
        if (statusDiv) {
            if (students.length > 0 || groups.length > 0) {
                statusDiv.innerHTML = `<span style="color: #27ae60;">✓ Loaded ${students.length} student(s) and ${groups.length} group(s)</span>`;
                setTimeout(() => {
                    statusDiv.innerHTML = '';
                }, 3000);
            } else {
                statusDiv.innerHTML = '<span style="color: #f39c12;">⚠️ No students or groups found. Create them first or leave empty for all students.</span>';
            }
        }
        
        // Add visual feedback if no data
        if (students.length === 0 && groups.length === 0) {
            const container = document.getElementById('quiz-assignment-container');
            if (container) {
                // Remove existing warning if any
                const existingWarning = container.querySelector('.assignment-warning');
                if (existingWarning) existingWarning.remove();
                
                const warning = document.createElement('div');
                warning.className = 'assignment-warning';
                warning.style.cssText = 'padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-top: 10px; color: #856404; font-size: 0.9rem;';
                warning.innerHTML = '<strong>ℹ️ Note:</strong> No students or groups found. Please create users and groups first, or leave empty to make quiz available to all students.';
                container.appendChild(warning);
            }
        } else {
            // Remove warning if data exists
            const container = document.getElementById('quiz-assignment-container');
            if (container) {
                const existingWarning = container.querySelector('.assignment-warning');
                if (existingWarning) existingWarning.remove();
            }
        }
    }

    addQuizAssignment() {
        const studentSelect = document.getElementById('quiz-assign-student-select');
        const groupSelect = document.getElementById('quiz-assign-group-select');
        const container = document.getElementById('quiz-assigned-students');
        
        if (studentSelect.value) {
            const student = storage.getUsers().find(u => u.id === studentSelect.value);
            if (student && !container.querySelector(`[data-student-id="${student.id}"]`)) {
                const item = document.createElement('div');
                item.className = 'assigned-student-item';
                item.dataset.studentId = student.id;
                item.style.cssText = 'display: inline-block; padding: 5px 10px; background: #3498db; color: white; border-radius: 4px; margin: 5px;';
                item.innerHTML = `${student.name} <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 5px;">×</button>`;
                container.appendChild(item);
                studentSelect.value = '';
            }
        }
        
        if (groupSelect.value) {
            const group = storage.getGroupById(groupSelect.value);
            if (group && !container.querySelector(`[data-group-id="${group.id}"]`)) {
                const item = document.createElement('div');
                item.className = 'assigned-group-item';
                item.dataset.groupId = group.id;
                item.style.cssText = 'display: inline-block; padding: 5px 10px; background: #2ecc71; color: white; border-radius: 4px; margin: 5px;';
                item.innerHTML = `Group: ${group.name} <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: 5px;">×</button>`;
                container.appendChild(item);
                groupSelect.value = '';
            }
        }
    }

    toggleGradingSettings() {
        const gradingMode = document.getElementById('new-quiz-grading-mode').value;
        const resultsTimeContainer = document.getElementById('grading-delay-container');
        const showAnswers = document.getElementById('new-quiz-show-answers').value;
        const answersTimeContainer = document.getElementById('answers-time-container');
        const showGrades = document.getElementById('new-quiz-show-grades').value;
        const gradesTimeContainer = document.getElementById('grades-time-container');
        
        // Show results time if delayed grading
        if (resultsTimeContainer) {
            resultsTimeContainer.style.display = gradingMode === 'auto_delayed' ? 'block' : 'none';
        }
        
        // Show answers time if scheduled
        if (answersTimeContainer) {
            answersTimeContainer.style.display = showAnswers === 'scheduled' ? 'block' : 'none';
        }
        
        // Show grades time if scheduled
        if (gradesTimeContainer) {
            gradesTimeContainer.style.display = showGrades === 'scheduled' ? 'block' : 'none';
        }
    }

    toggleConditionUI(checkbox) {
        const conditionUI = checkbox.closest('.question-block').querySelector('.q-condition-ui');
        conditionUI.style.display = checkbox.checked ? 'block' : 'none';
        if (checkbox.checked) {
            this.updateConditionDropdowns();
        }
    }

    updateConditionDropdowns() {
        const blocks = document.querySelectorAll('.question-block');
        blocks.forEach((block, index) => {
            const dependsSelect = block.querySelector('.q-condition-depends');
            if (dependsSelect) {
                dependsSelect.innerHTML = '<option value="">Select question...</option>';
                blocks.forEach((prevBlock, prevIndex) => {
                    if (prevIndex < index) {
                        const text = prevBlock.querySelector('.q-text')?.value || 
                                    prevBlock.querySelector('.q-fill-blank-text')?.value || 
                                    `Question ${prevIndex + 1}`;
                        const option = document.createElement('option');
                        option.value = prevIndex;
                        option.textContent = `Q${prevIndex + 1}: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
                        dependsSelect.appendChild(option);
                    }
                });
            }
        });
    }

    addQuizSection() {
        const container = document.getElementById('quiz-sections-container');
        const div = document.createElement('div');
        div.className = 'section-item';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <input type="text" class="section-title" placeholder="Section Title (e.g., Mathematics)" style="width: 200px; padding: 5px;">
            <input type="number" class="section-time" placeholder="Time (min)" style="width: 100px; padding: 5px; margin-left: 10px;">
            <button onclick="this.parentElement.remove()" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; cursor: pointer; margin-left: 10px;">Remove</button>
        `;
        container.appendChild(div);
    }

    addQuestionBlock() {
        const container = document.getElementById('questions-container');
        const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);
        
        const div = document.createElement('div');
        div.className = 'question-block';
        div.dataset.id = uniqueId; // Store ID for easy access
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <label>Question</label>
                <button onclick="app.removeQuestionBlock(this)" style="color:red; cursor:pointer; background:none; border:none;">Remove</button>
            </div>
            <div class="form-group">
                <input type="text" class="q-text" placeholder="Enter question text">
            </div>
            <div style="display: flex; gap: 15px;">
                <div class="form-group" style="flex: 1;">
                <label>Type</label>
                <select class="q-type" onchange="app.toggleQuestionType(this)">
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True/False</option>
                    <option value="short_answer">Short Answer</option>
                        <option value="fill_in_blank">Fill in the Blank</option>
                        <option value="image_question">Image Question</option>
                        <option value="video_question">Video Question</option>
                </select>
                </div>
                <div class="form-group" style="width: 120px;">
                    <label>Points</label>
                    <input type="number" class="q-points" value="1" min="1" style="width: 100%;">
                </div>
            </div>
            <div class="form-group">
                <label>Explanation (Optional - shown after quiz submission)</label>
                <textarea class="q-explanation" placeholder="Explain why this answer is correct..." style="width: 100%; padding: 8px; min-height: 60px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <div class="form-group" style="margin-top: 10px;">
                <button class="btn" style="width: auto; background: #16a085; font-size: 0.9rem; padding: 5px 10px;" onclick="app.addFromQuestionBank(this.closest('.question-block'))">Add from Bank</button>
            </div>
            <div class="form-group" style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <label style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
                    <input type="checkbox" class="q-has-condition" onchange="app.toggleConditionUI(this)">
                    Show this question conditionally
                </label>
                <div class="q-condition-ui" style="display: none; margin-top: 10px;">
                    <select class="q-condition-depends" style="padding: 5px; margin-right: 10px;">
                        <option value="">Select question...</option>
                    </select>
                    <select class="q-condition-operator" style="padding: 5px; margin-right: 10px;">
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                    </select>
                    <input type="text" class="q-condition-value" placeholder="Value" style="padding: 5px; width: 150px;">
                </div>
            </div>
            
            <div class="options-container" id="opts-${uniqueId}">
                <!-- Options injected by toggleQuestionType -->
            </div>
        `;
        container.appendChild(div);
        
        // Initialize with Multiple Choice
        this.renderQuestionOptions(div.querySelector('.options-container'), 'multiple_choice', uniqueId);
        
        // Update condition dropdowns
        this.updateConditionDropdowns();
        
        return uniqueId;
    }

    removeQuestionBlock(button) {
        button.closest('.question-block').remove();
        this.updateConditionDropdowns();
    }
    
    toggleQuestionType(selectElem) {
        const block = selectElem.closest('.question-block');
        const uniqueId = block.dataset.id;
        const type = selectElem.value;
        const container = block.querySelector('.options-container');
        this.renderQuestionOptions(container, type, uniqueId);
    }

    renderQuestionOptions(container, type, uniqueId) {
        let html = '';
        if (type === 'multiple_choice') {
            html = `
                <label>Options (Check the correct answer)</label>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="0"><input type="text" class="q-option" placeholder="Option 1"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="1"><input type="text" class="q-option" placeholder="Option 2"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="2"><input type="text" class="q-option" placeholder="Option 3"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="3"><input type="text" class="q-option" placeholder="Option 4"></div>
            `;
        } else if (type === 'true_false') {
            html = `
                <label>Correct Answer</label>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="0"> True</div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="1"> False</div>
            `;
        } else if (type === 'short_answer') {
            html = `
                <label>Correct Answer (Exact Match, Case Insensitive)</label>
                <input type="text" class="q-correct-text" placeholder="Enter the correct answer text" style="width:100%; padding:8px;">
            `;
        } else if (type === 'fill_in_blank') {
            html = `
                <label>Question Text (use ___ for blank)</label>
                <input type="text" class="q-fill-blank-text" placeholder="The capital of France is ___" style="width:100%; padding:8px; margin-bottom:10px;">
                <label>Correct Answer for Blank</label>
                <input type="text" class="q-correct-text" placeholder="Enter the correct answer" style="width:100%; padding:8px;">
            `;
        } else if (type === 'image_question') {
            html = `
                <label>Image (URL or Upload)</label>
                <input type="text" class="q-media-url" placeholder="Image URL" style="width:100%; padding:8px; margin-bottom:10px;">
                <input type="file" class="q-media-file" accept="image/*" onchange="app.handleMediaUpload(this, 'image', '${uniqueId}')" style="margin-bottom:10px;">
                <div class="q-media-preview" id="preview-${uniqueId}" style="margin-top:10px;"></div>
                <label>Options (Check the correct answer)</label>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="0"><input type="text" class="q-option" placeholder="Option 1"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="1"><input type="text" class="q-option" placeholder="Option 2"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="2"><input type="text" class="q-option" placeholder="Option 3"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="3"><input type="text" class="q-option" placeholder="Option 4"></div>
            `;
        } else if (type === 'video_question') {
            html = `
                <label>Video (URL or Upload)</label>
                <input type="text" class="q-media-url" placeholder="Video URL" style="width:100%; padding:8px; margin-bottom:10px;">
                <input type="file" class="q-media-file" accept="video/*" onchange="app.handleMediaUpload(this, 'video', '${uniqueId}')" style="margin-bottom:10px;">
                <div class="q-media-preview" id="preview-${uniqueId}" style="margin-top:10px;"></div>
                <label>Options (Check the correct answer)</label>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="0"><input type="text" class="q-option" placeholder="Option 1"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="1"><input type="text" class="q-option" placeholder="Option 2"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="2"><input type="text" class="q-option" placeholder="Option 3"></div>
                <div class="option-row"><input type="radio" name="q_${uniqueId}_correct" value="3"><input type="text" class="q-option" placeholder="Option 4"></div>
            `;
        }
        container.innerHTML = html;
    }

    handleMediaUpload(input, mediaType, uniqueId) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const preview = document.getElementById(`preview-${uniqueId}`);
            const urlInput = input.closest('.options-container').querySelector('.q-media-url');
            
            if (mediaType === 'image') {
                preview.innerHTML = `<img src="${base64}" style="max-width:300px; max-height:200px; border:1px solid #ddd; border-radius:4px;">`;
            } else {
                preview.innerHTML = `<video src="${base64}" controls style="max-width:300px; max-height:200px; border:1px solid #ddd; border-radius:4px;"></video>`;
            }
            
            // Store base64 in a hidden way - we'll extract it when saving
            urlInput.dataset.base64 = base64;
        };
        reader.readAsDataURL(file);
    }

    saveQuiz() {
        const title = document.getElementById('new-quiz-title').value;
        const desc = document.getElementById('new-quiz-desc').value;
        const timeLimit = parseInt(document.getElementById('new-quiz-time').value);
        
        if (!title) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'Missing Title',
                    message: 'Please enter a quiz title to continue.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning('Please enter a quiz title');
            } else {
            alert('Please enter a quiz title');
            }
            document.getElementById('new-quiz-title').focus();
            return;
        }

        const questions = [];
        const blocks = document.querySelectorAll('.question-block');
        
        let isValid = true;

        blocks.forEach((block, index) => {
            const textInput = block.querySelector('.q-text');
            const text = textInput ? textInput.value : '';
            const type = block.querySelector('.q-type').value;
            const options = [];
            let correctIndex = -1;
            let correctAnswerText = '';
            let mediaUrl = '';
            let mediaType = '';
            let condition = null;

            // Get condition if exists
            const hasCondition = block.querySelector('.q-has-condition')?.checked;
            if (hasCondition) {
                const dependsOn = block.querySelector('.q-condition-depends')?.value;
                const operator = block.querySelector('.q-condition-operator')?.value;
                const value = block.querySelector('.q-condition-value')?.value;
                if (dependsOn !== '' && operator && value) {
                    condition = {
                        dependsOn: parseInt(dependsOn),
                        operator: operator,
                        value: value
                    };
                }
            }

            if (!text && type !== 'fill_in_blank') {
                isValid = false;
                return;
            }

            if (type === 'multiple_choice') {
                block.querySelectorAll('.q-option').forEach(opt => options.push(opt.value));
                const radio = block.querySelector('input[type="radio"]:checked');
                if (radio) correctIndex = parseInt(radio.value);
            } else if (type === 'true_false') {
                options.push('True', 'False');
                const radio = block.querySelector('input[type="radio"]:checked');
                if (radio) correctIndex = parseInt(radio.value);
            } else if (type === 'short_answer') {
                correctAnswerText = block.querySelector('.q-correct-text')?.value || '';
                if (!correctAnswerText) isValid = false;
            } else if (type === 'fill_in_blank') {
                const fillText = block.querySelector('.q-fill-blank-text')?.value || '';
                correctAnswerText = block.querySelector('.q-correct-text')?.value || '';
                if (!fillText || !correctAnswerText) isValid = false;
                const points = parseInt(block.querySelector('.q-points')?.value || '1');
                const explanation = block.querySelector('.q-explanation')?.value || '';

                questions.push({
                    id: Date.now() + index,
                    text: fillText,
                    type,
                    correctAnswerText,
                    options: [],
                    correctIndex: -1,
                    condition: condition || undefined,
                    points: points || 1,
                    explanation: explanation || undefined
                });
                return;
            } else if (type === 'image_question' || type === 'video_question') {
                const urlInput = block.querySelector('.q-media-url');
                mediaUrl = urlInput?.value || urlInput?.dataset.base64 || '';
                mediaType = type === 'image_question' ? 'image' : 'video';
                block.querySelectorAll('.q-option').forEach(opt => options.push(opt.value));
                const radio = block.querySelector('input[type="radio"]:checked');
                if (radio) correctIndex = parseInt(radio.value);
                if (!mediaUrl) isValid = false;
            }

            const points = parseInt(block.querySelector('.q-points')?.value || '1');
            const explanation = block.querySelector('.q-explanation')?.value || '';

            questions.push({
                id: Date.now() + index,
                text,
                type,
                options,
                correctIndex,
                correctAnswerText: correctAnswerText || undefined,
                mediaUrl: mediaUrl || undefined,
                mediaType: mediaType || undefined,
                condition: condition || undefined,
                points: points || 1,
                explanation: explanation || undefined
            });
        });

        if (!isValid) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showError({
                    title: 'Invalid Questions',
                    message: 'Please fill in all question fields and select correct answers.',
                    autoClose: 4000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.error('Please fill in all question fields and select correct answers.');
            } else {
            alert('Please fill in all question fields and select correct answers.');
            }
            return;
        }

        if (questions.length === 0) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'No Questions',
                    message: 'Please add at least one question to the quiz.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning('Please add at least one question');
            } else {
            alert('Please add at least one question');
            }
            return;
        }

        // Get randomization settings
        const randomizeQuestions = document.getElementById('new-quiz-randomize-questions').checked;
        const randomizeOptions = document.getElementById('new-quiz-randomize-options').checked;
        const allowRetake = document.getElementById('new-quiz-allow-retake').checked;
        const showExplanations = document.getElementById('new-quiz-show-explanations').checked;
        
        // Get quiz settings
        const status = document.getElementById('new-quiz-status').value;
        const difficulty = document.getElementById('new-quiz-difficulty')?.value || 'medium';
        const categoryInput = document.getElementById('new-quiz-category')?.value || '';
        const categories = categoryInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
        const startDate = document.getElementById('new-quiz-start-date').value;
        const endDate = document.getElementById('new-quiz-end-date').value;
        const password = document.getElementById('new-quiz-password').value;
        const instructions = document.getElementById('new-quiz-instructions').value;
        
        // Get grading and results settings
        const gradingMode = document.getElementById('new-quiz-grading-mode').value;
        const resultsTime = document.getElementById('new-quiz-results-time').value;
        const showAnswers = document.getElementById('new-quiz-show-answers').value;
        const answersTime = document.getElementById('new-quiz-answers-time').value;
        const showGrades = document.getElementById('new-quiz-show-grades').value;
        const gradesTime = document.getElementById('new-quiz-grades-time').value;
        const passMarkInput = document.getElementById('new-quiz-pass-mark');
        let passMark = passMarkInput ? parseInt(passMarkInput.value) : NaN;
        
        // Get assigned students/groups
        const assignedStudents = [];
        const assignedGroups = [];
        document.querySelectorAll('.assigned-student-item').forEach(item => {
            const studentId = item.dataset.studentId;
            if (studentId) assignedStudents.push(studentId);
        });
        document.querySelectorAll('.assigned-group-item').forEach(item => {
            const groupId = item.dataset.groupId;
            if (groupId) assignedGroups.push(groupId);
        });
        
        // Get sections
        const sections = [];
        const sectionItems = document.querySelectorAll('.section-item');
        sectionItems.forEach((item, idx) => {
            const title = item.querySelector('.section-title').value;
            const timeLimit = item.querySelector('.section-time').value;
            if (title) {
                sections.push({
                    id: 's_' + idx,
                    title: title,
                    timeLimit: timeLimit ? parseInt(timeLimit) : null,
                    questionIndices: [] // Will be populated below
                });
            }
        });

        // Assign questions to sections if sections exist
        if (sections.length > 0) {
            const questionsPerSection = Math.ceil(questions.length / sections.length);
            questions.forEach((q, idx) => {
                const sectionIndex = Math.min(Math.floor(idx / questionsPerSection), sections.length - 1);
                q.sectionId = sections[sectionIndex].id;
                sections[sectionIndex].questionIndices.push(idx);
            });
        }

        // Check if we're editing an existing quiz
        const isEditing = this.editingQuizId !== null && this.editingQuizId !== undefined;
        const existingQuiz = isEditing ? storage.getQuizById(this.editingQuizId) : null;
        let finalPassMark = passMark;
        if (isNaN(finalPassMark)) {
            if (isEditing && existingQuiz && typeof existingQuiz.passMark === 'number') {
                finalPassMark = existingQuiz.passMark;
            } else {
                finalPassMark = 50;
            }
        }
        if (finalPassMark < 0) finalPassMark = 0;
        if (finalPassMark > 100) finalPassMark = 100;
        
        const quizData = {
            id: isEditing ? this.editingQuizId : ('q_' + Date.now()),
            title,
            description: desc,
            timeLimit,
            questions,
            randomizeQuestions,
            randomizeOptions,
            allowRetake,
            showExplanations,
            status: status || 'draft',
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            password: password || undefined,
            instructions: instructions || undefined,
            assignedStudents: assignedStudents.length > 0 ? assignedStudents : undefined,
            assignedGroups: assignedGroups.length > 0 ? assignedGroups : undefined,
            sections: sections.length > 0 ? sections : undefined,
            gradingMode: gradingMode || 'auto',
            resultsTime: resultsTime || undefined,
            showAnswers: showAnswers || 'immediately',
            answersTime: answersTime || undefined,
            showGrades: showGrades || 'immediately',
            gradesTime: gradesTime || undefined,
            difficulty: difficulty || 'medium',
            categories: categories.length > 0 ? categories : undefined,
            passMark: finalPassMark,
            createdAt: isEditing && existingQuiz ? existingQuiz.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.showLoading(isEditing ? 'Updating quiz...' : 'Saving quiz...');
        
        setTimeout(() => {
            storage.saveQuiz(quizData);
            this.hideLoading();
            
            if (typeof notifications !== 'undefined') {
                notifications.success(isEditing ? 'Quiz updated successfully!' : 'Quiz saved successfully!');
            } else {
                alert(isEditing ? 'Quiz updated successfully!' : 'Quiz saved successfully!');
            }
            
            // Reset editing state
            this.editingQuizId = null;

            // Add notification
            if (typeof notificationCenter !== 'undefined') {
                notificationCenter.addNotification(
                    'success',
                    'Quiz Created',
                    `Quiz "${title}" has been created successfully.`,
                    'quiz',
                    { type: 'view_quiz', target: newQuiz.id, label: 'View Quiz' }
                );
            }
            
            this.showTeacherDashboard();
        }, 300);
    }

    exportResultsCSV() {
        if (typeof reporting !== 'undefined') {
            reporting.exportResultsCSV();
        } else {
            // Fallback to old method
        const results = storage.getAllResults();
        const quizzes = storage.getQuizzes();
        const users = storage.getUsers();

        if (results.length === 0) {
            alert('No results to export.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student Name,Quiz Title,Score (%),Date\n";

        results.forEach(r => {
            const student = users.find(u => u.id === r.studentId);
            const quiz = quizzes.find(q => q.id === r.quizId);
            const studentName = student ? student.name : 'Unknown';
            const quizTitle = quiz ? quiz.title : 'Deleted Quiz';
                const date = new Date(r.date).toLocaleDateString();

            csvContent += `"${studentName}","${quizTitle}",${r.score},${date}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "quiz_results.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        }
    }

    // --- Student Logic ---
    showStudentDashboard() {
        this.showView('student-dashboard');
        this.populateStudentQuizFilters();
        this.renderStudentQuizList();
        this.renderStudentResults();
        this.addBreadcrumb([{ text: 'Dashboard', active: true }]);
        
        // Update notification badge
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.updateBellBadge();
        }
    }

    updateStudentStats() {
        const user = auth.getCurrentUser();
        const results = storage.getResultsByStudent(user.id);
        
        document.getElementById('student-attempts-count').textContent = results.length;
        
        if (results.length > 0) {
            const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
            document.getElementById('student-avg-score').textContent = Math.round(avg) + '%';
        } else {
            document.getElementById('student-avg-score').textContent = '0%';
        }
        
        this.renderPerformanceChart(results);
    }

    renderPerformanceChart(results) {
        const container = document.getElementById('student-performance-chart');
        if (results.length === 0) {
            container.innerHTML = '<p style="color:#777; width:100%; text-align:center; align-self:center;">No attempts yet.</p>';
            return;
        }

        // Take last 5 results
        const recent = results.slice(-5);
        container.innerHTML = '';
        
        recent.forEach(r => {
            const quiz = storage.getQuizById(r.quizId);
            const title = quiz ? quiz.title.substring(0, 10) + '...' : 'Deleted';
            
            const barContainer = document.createElement('div');
            barContainer.style.flex = '1';
            barContainer.style.display = 'flex';
            barContainer.style.flexDirection = 'column';
            barContainer.style.alignItems = 'center';
            barContainer.style.justifyContent = 'flex-end';
            barContainer.style.height = '100%';
            
            const bar = document.createElement('div');
            bar.style.width = '60%';
            bar.style.height = `${r.score}%`;
            bar.style.backgroundColor = r.score >= 50 ? 'var(--success-color)' : 'var(--danger-color)';
            bar.style.borderRadius = '4px 4px 0 0';
            bar.style.position = 'relative';
            bar.title = `${title}: ${r.score}%`;
            
            const label = document.createElement('div');
            label.textContent = title;
            label.style.fontSize = '0.8rem';
            label.style.marginTop = '5px';
            label.style.textAlign = 'center';
            
            const scoreLabel = document.createElement('div');
            scoreLabel.textContent = `${r.score}%`;
            scoreLabel.style.fontSize = '0.8rem';
            scoreLabel.style.marginBottom = '2px';
            
            barContainer.appendChild(scoreLabel);
            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            container.appendChild(barContainer);
        });
    }

    renderStudentQuizList() {
        const container = document.getElementById('student-quiz-list');
        container.innerHTML = '';
        const user = auth.getCurrentUser();
        const quizzes = storage.getQuizzes();
        const groups = storage.getGroups();
        const results = storage.getAllResults();
        
        // Get user's groups
        const userGroups = groups.filter(g => g.members && g.members.includes(user.id));

        // Filter quizzes - only show published quizzes that are:
        // 1. Not assigned (available to all), OR
        // 2. Assigned to this student, OR
        // 3. Assigned to a group this student belongs to
        let availableQuizzes = quizzes.filter(quiz => {
            if (quiz.status !== 'published') return false;
            
            // Check date restrictions
            const now = new Date();
            if (quiz.startDate && new Date(quiz.startDate) > now) return false;
            if (quiz.endDate && new Date(quiz.endDate) < now) return false;
            
            // Check assignment
            if (!quiz.assignedStudents && !quiz.assignedGroups) return true; // Available to all
            if (quiz.assignedStudents && quiz.assignedStudents.includes(user.id)) return true;
            if (quiz.assignedGroups && quiz.assignedGroups.some(gid => userGroups.some(ug => ug.id === gid))) return true;
            
            return false;
        });
        
        // Apply search and filters
        const searchTerm = document.getElementById('student-quiz-search')?.value.toLowerCase() || '';
        const difficultyFilter = document.getElementById('student-quiz-filter-difficulty')?.value || '';
        const categoryFilter = document.getElementById('student-quiz-filter-category')?.value || '';
        
        if (searchTerm) {
            availableQuizzes = availableQuizzes.filter(quiz => 
                quiz.title.toLowerCase().includes(searchTerm) ||
                (quiz.description && quiz.description.toLowerCase().includes(searchTerm)) ||
                (quiz.categories && quiz.categories.some(cat => cat.toLowerCase().includes(searchTerm)))
            );
        }
        
        if (difficultyFilter) {
            availableQuizzes = availableQuizzes.filter(quiz => (quiz.difficulty || 'medium') === difficultyFilter);
        }
        
        if (categoryFilter) {
            availableQuizzes = availableQuizzes.filter(quiz => 
                quiz.categories && quiz.categories.includes(categoryFilter)
            );
        }

        if (availableQuizzes.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-title">No Quizzes Available</div>
                    <div class="empty-state-message">Check back later for new quizzes!</div>
                </div>
            `;
            return;
        }

        availableQuizzes.forEach((quiz, index) => {
            const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
            const difficulty = quiz.difficulty || 'medium';
            const difficultyColors = { easy: '#2ecc71', medium: '#f39c12', hard: '#e74c3c' };
            const difficultyLabels = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
            
            // Check if user has attempted this quiz
            const userResults = results.filter(r => r.quizId === quiz.id && r.studentId === user.id);
            const hasAttempted = userResults.length > 0;
            const bestScore = hasAttempted ? Math.max(...userResults.map(r => r.manualScore || r.score)) : null;
            
            const div = document.createElement('div');
            div.className = 'card fade-in-up';
            div.style.animationDelay = `${index * 0.1}s`;
            div.style.position = 'relative';
            div.style.overflow = 'hidden';
            
            // Check if quiz is due soon
            let dueBadge = '';
            if (quiz.endDate) {
                const endDate = new Date(quiz.endDate);
                const now = new Date();
                const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 3 && daysLeft > 0) {
                    dueBadge = `<span class="badge badge-warning" style="margin-left: 10px;">Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}</span>`;
                } else if (daysLeft <= 0) {
                    dueBadge = '<span class="badge badge-danger" style="margin-left: 10px;">Overdue</span>';
                }
            }
            
            div.innerHTML = `
                ${hasAttempted ? `<div style="position: absolute; top: 10px; right: 10px; background: rgba(46, 204, 113, 0.9); color: white; padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold; z-index: 10;">Best: ${bestScore}%</div>` : ''}
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h3 style="margin: 0; flex: 1;">${quiz.title}</h3>
                    ${dueBadge}
                </div>
                <p style="color: #666; margin-bottom: 15px; line-height: 1.6;">${quiz.description || 'No description'}</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span class="badge badge-info">📝 ${quiz.questions.length} Questions</span>
                    <span class="badge badge-info">⏱️ ${quiz.timeLimit} min</span>
                    <span class="badge badge-info">⭐ ${totalPoints} points</span>
                    <span class="badge" style="background: ${difficultyColors[difficulty]}; color: white;">${difficultyLabels[difficulty]}</span>
                    ${quiz.categories && quiz.categories.length > 0 ? quiz.categories.slice(0, 2).map(cat => `<span class="badge badge-info" style="font-size: 0.8rem;">${cat}</span>`).join('') : ''}
                </div>
                ${quiz.endDate ? `<p style="color: #e74c3c; font-size: 0.9em; margin-bottom: 10px;">📅 Due: ${new Date(quiz.endDate).toLocaleString()}</p>` : ''}
                ${hasAttempted ? `<p style="color: #27ae60; font-size: 0.9em; margin-bottom: 10px;">✅ Attempted ${userResults.length} time${userResults.length > 1 ? 's' : ''}</p>` : ''}
                <button class="btn" style="margin-top: 10px; width: 100%; background: ${hasAttempted ? '#3498db' : '#2ecc71'};" onclick="app.startQuiz('${quiz.id}')">
                    ${hasAttempted ? '🔄 Retake Quiz' : '🚀 Start Quiz'}
                </button>
            `;
            container.appendChild(div);
        });
    }
    
    renderStudentResults() {
        const tbody = document.getElementById('student-results-list');
        tbody.innerHTML = '';
        const user = auth.getCurrentUser();
        let results = storage.getResultsByStudent(user.id);
        const quizzes = storage.getQuizzes();
        
        // Populate quiz filter
        const quizSelect = document.getElementById('student-results-filter-quiz');
        if (quizSelect && quizSelect.children.length <= 1) {
            const uniqueQuizzes = [...new Set(results.map(r => r.quizId))];
            uniqueQuizzes.forEach(quizId => {
                const quiz = quizzes.find(q => q.id === quizId);
                if (quiz) {
                    const option = document.createElement('option');
                    option.value = quizId;
                    option.textContent = quiz.title;
                    quizSelect.appendChild(option);
                }
            });
        }
        
        // Apply filters
        const quizFilter = document.getElementById('student-results-filter-quiz')?.value;
        const gradeFilter = document.getElementById('student-results-filter-grade')?.value;
        
        if (quizFilter) {
            results = results.filter(r => r.quizId === quizFilter);
        }
        
        if (results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: #999;">No results found</td></tr>';
            return;
        }
        
        results.reverse().forEach((r, index) => { // Show newest first
            const quiz = storage.getQuizById(r.quizId);
            const score = r.manualScore !== null ? r.manualScore : r.score;
            
            // Calculate grade
            let grade = 'F';
            if (score >= 90) grade = 'A';
            else if (score >= 80) grade = 'B';
            else if (score >= 70) grade = 'C';
            else if (score >= 60) grade = 'D';
            
            // Filter by grade
            if (gradeFilter && grade !== gradeFilter) return;
            
            const canShowGrade = this.canShowGrades(quiz, r);
            const canShowAnswers = this.canShowAnswers(quiz, r);
            const points = r.earnedPoints !== undefined ? `${r.earnedPoints}/${r.totalPoints}` : 'N/A';
            
            const tr = document.createElement('tr');
            tr.className = 'fade-in-up';
            tr.style.animationDelay = `${index * 0.05}s`;
            tr.innerHTML = `
                <td><strong>${quiz ? quiz.title : 'Deleted Quiz'}</strong></td>
                <td>${new Date(r.date).toLocaleString()}</td>
                <td>${canShowGrade ? `<strong style="font-size: 1.1em;">${score}%</strong>` : '<em>Pending</em>'}</td>
                <td>${canShowGrade ? `<span class="badge" style="background: ${this.getGradeColor(grade)}; color: white; font-weight: bold; padding: 4px 10px; border-radius: 12px;">${grade}</span>` : '-'}</td>
                <td>${canShowGrade ? `<span style="font-weight: 600;">${points}</span>` : '-'}</td>
                <td>${r.gradingStatus === 'pending' ? '<span class="badge badge-warning">Pending</span>' : r.gradingStatus === 'graded' ? '<span class="badge badge-info">Graded</span>' : r.gradingStatus === 'reviewed' ? '<span class="badge badge-success">Reviewed</span>' : '<span class="badge" style="background: #95a5a6; color: white;">Auto</span>'}</td>
                <td>
                    ${canShowAnswers ? `
                        <button class="action-btn action-btn-view" onclick="app.reviewQuiz('${r.id}')" title="Review Answers">👁️ Review</button>
                    ` : '<em style="color: #999;">Not available</em>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    filterStudentResults() {
        this.renderStudentResults();
    }

    exportMyGrades() {
        const user = auth.getCurrentUser();
        const results = storage.getResultsByStudent(user.id);
        const quizzes = storage.getQuizzes();
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Quiz,Date,Score (%),Grade,Points,Correct/Total,Status\n";
        
        results.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(r => {
            const quiz = quizzes.find(q => q.id === r.quizId);
            const score = r.manualScore !== null ? r.manualScore : r.score;
            const points = r.earnedPoints !== undefined ? `${r.earnedPoints}/${r.totalPoints}` : 'N/A';
            const date = new Date(r.date).toLocaleString();
            const status = r.gradingStatus || 'auto';
            
            let grade = 'F';
            if (score >= 90) grade = 'A';
            else if (score >= 80) grade = 'B';
            else if (score >= 70) grade = 'C';
            else if (score >= 60) grade = 'D';
            
            csvContent += `"${quiz ? quiz.title : 'Deleted Quiz'}","${date}",${score},"${grade}","${points}",${r.correctCount}/${r.totalQuestions},"${status}"\n`;
        });
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `my_grades_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showStudentAnalytics() {
        this.showView('student-analytics-view');
        const user = auth.getCurrentUser();
        const stats = analytics.getStudentStats(user.id);
        
        document.getElementById('student-stats-attempts').textContent = stats.totalAttempts;
        document.getElementById('student-stats-avg').textContent = stats.averageScore + '%';
        document.getElementById('student-stats-high').textContent = stats.highestScore + '%';
        document.getElementById('student-stats-improvement').textContent = 
            stats.improvement > 0 ? '+' + stats.improvement + '%' : stats.improvement + '%';
        
        // Render charts
        setTimeout(() => {
            analytics.renderPerformanceOverTime('performance-over-time-chart', user.id);
            analytics.renderTopicDistribution('topic-distribution-chart', user.id);
        }, 100);
    }

    showTeacherAnalytics() {
        this.showView('teacher-analytics-view');
        const stats = analytics.getClassStats();
        
        document.getElementById('analytics-total-students').textContent = stats.totalStudents;
        document.getElementById('analytics-total-attempts').textContent = stats.totalAttempts;
        document.getElementById('analytics-avg-score').textContent = stats.averageScore + '%';
        document.getElementById('analytics-completion-rate').textContent = stats.completionRate + '%';
        
        // Populate quiz select
        const quizSelect = document.getElementById('analytics-quiz-select');
        quizSelect.innerHTML = '<option value="">Select a quiz...</option>';
        storage.getQuizzes().forEach(quiz => {
            const option = document.createElement('option');
            option.value = quiz.id;
            option.textContent = quiz.title;
            quizSelect.appendChild(option);
        });
        
        // Render charts
        setTimeout(() => {
            analytics.renderScoreDistribution('score-distribution-chart');
            analytics.renderTopicHeatmap('topic-heatmap-chart');
        }, 100);
    }

    renderQuizComparison() {
        const quizId = document.getElementById('analytics-quiz-select').value;
        if (quizId) {
            setTimeout(() => {
                analytics.renderClassComparison('quiz-comparison-chart', quizId);
            }, 100);
        }
    }

    showGradingQueue() {
        this.showView('grading-queue-view');
        this.renderGradingQueue();
    }

    renderGradingQueue() {
        const tbody = document.getElementById('grading-queue-list');
        tbody.innerHTML = '';
        
        const statusFilter = document.getElementById('grading-filter-status').value;
        const quizFilter = document.getElementById('grading-filter-quiz').value;
        
        const results = storage.getAllResults();
        const users = storage.getUsers();
        const quizzes = storage.getQuizzes();
        
        // Populate quiz filter
        const quizSelect = document.getElementById('grading-filter-quiz');
        if (quizSelect.children.length <= 1) {
            quizzes.forEach(quiz => {
                const option = document.createElement('option');
                option.value = quiz.id;
                option.textContent = quiz.title;
                quizSelect.appendChild(option);
            });
        }
        
        let filteredResults = results;
        if (statusFilter) {
            filteredResults = filteredResults.filter(r => {
                const status = r.gradingStatus || 'auto';
                return status === statusFilter;
            });
        }
        if (quizFilter) {
            filteredResults = filteredResults.filter(r => r.quizId === quizFilter);
        }
        
        // Sort by date (newest first)
        filteredResults.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        filteredResults.forEach(r => {
            const student = users.find(u => u.id === r.studentId);
            const quiz = quizzes.find(q => q.id === r.quizId);
            const status = r.gradingStatus || 'auto';
            const statusColors = {
                'auto': '#95a5a6',
                'pending': '#f39c12',
                'graded': '#3498db',
                'reviewed': '#2ecc71'
            };
            
            const score = r.manualScore !== null ? r.manualScore : r.score;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student ? student.name : 'Unknown'}</td>
                <td>${quiz ? quiz.title : 'Deleted Quiz'}</td>
                <td>${score}%</td>
                <td><span style="color: ${statusColors[status] || '#95a5a6'}; text-transform: capitalize;">${status}</span></td>
                <td>${new Date(r.date).toLocaleString()}</td>
                <td>
                    <button class="btn" style="width: auto; font-size: 0.9rem; padding: 3px 8px; background: #3498db;" onclick="app.gradeSubmission('${r.id}')">Grade</button>
                    ${status === 'graded' ? `
                        <button class="btn" style="width: auto; font-size: 0.9rem; padding: 3px 8px; background: #2ecc71; margin-left: 5px;" onclick="app.quickGradeResult('${r.id}', 'approve')" title="Mark as Reviewed">✓</button>
                    ` : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    gradeSubmission(resultId) {
        const results = storage.getAllResults();
        const result = results.find(r => r.id === resultId);
        if (!result) return;
        
        const quiz = storage.getQuizById(result.quizId);
        const users = storage.getUsers();
        const student = users.find(u => u.id === result.studentId);
        
        this.currentGradingResult = result;
        this.currentGradingQuiz = quiz;
        
        this.showView('grading-detail-view');
        document.getElementById('grading-detail-title').textContent = `Grade: ${quiz ? quiz.title : 'Quiz'}`;
        document.getElementById('grading-student-name').textContent = student ? student.name : 'Unknown';
        document.getElementById('grading-quiz-title').textContent = quiz ? quiz.title : 'Deleted Quiz';
        document.getElementById('grading-auto-score').textContent = result.score;
        document.getElementById('grading-manual-score').value = result.manualScore !== null ? result.manualScore : '';
        
        // Render questions for grading
        const container = document.getElementById('grading-questions-container');
        container.innerHTML = '';
        
        quiz.questions.forEach((q, idx) => {
            const userAnswer = result.answers[q.id];
            let isCorrect = false;
            let correctAnswerDisplay = '';
            let userAnswerDisplay = '';
            
            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                isCorrect = userAnswer && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase();
                correctAnswerDisplay = q.correctAnswerText;
                userAnswerDisplay = userAnswer || '(No answer)';
            } else {
                isCorrect = userAnswer === q.correctIndex;
                if (q.type === 'true_false') {
                    correctAnswerDisplay = q.correctIndex === 0 ? 'True' : 'False';
                    userAnswerDisplay = userAnswer === 0 ? 'True' : userAnswer === 1 ? 'False' : '(No answer)';
                } else {
                    correctAnswerDisplay = q.options[q.correctIndex];
                    userAnswerDisplay = userAnswer !== undefined ? q.options[userAnswer] : '(No answer)';
                }
            }
            
            const div = document.createElement('div');
            div.className = 'card';
            div.style.marginBottom = '15px';
            div.style.borderLeft = isCorrect ? '5px solid #2ecc71' : '5px solid #e74c3c';
            div.innerHTML = `
                <h4>Question ${idx + 1}: ${q.text}</h4>
                <p><strong>Student Answer:</strong> ${userAnswerDisplay}</p>
                <p><strong>Correct Answer:</strong> ${correctAnswerDisplay}</p>
                <p><strong>Status:</strong> <span style="color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">${isCorrect ? 'Correct' : 'Incorrect'}</span></p>
                <div style="margin-top: 10px;">
                    <label>Feedback (optional):</label>
                    <textarea class="grading-feedback" data-question-id="${q.id}" placeholder="Add feedback for this answer..." style="width: 100%; padding: 8px; margin-top: 5px; min-height: 60px;">${result.feedback && result.feedback[q.id] ? result.feedback[q.id] : ''}</textarea>
                </div>
            `;
            container.appendChild(div);
        });
    }

    saveGrading() {
        if (!this.currentGradingResult) return;
        
        const manualScore = document.getElementById('grading-manual-score').value;
        const feedback = {};
        document.querySelectorAll('.grading-feedback').forEach(textarea => {
            const questionId = textarea.dataset.questionId;
            const feedbackText = textarea.value.trim();
            if (feedbackText) {
                feedback[questionId] = feedbackText;
            }
        });
        
        const results = storage.getAllResults();
        const index = results.findIndex(r => r.id === this.currentGradingResult.id);
        if (index >= 0) {
            results[index].manualScore = manualScore ? parseInt(manualScore) : null;
            results[index].feedback = feedback;
            results[index].gradingStatus = 'graded';
            results[index].gradedBy = auth.getCurrentUser().id;
            results[index].gradedAt = new Date().toISOString();
            
            // If manual score provided, recalculate points if needed
            if (manualScore) {
                const quiz = storage.getQuizById(results[index].quizId);
                if (quiz) {
                    const totalPoints = quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
                    results[index].earnedPoints = Math.round((parseInt(manualScore) / 100) * totalPoints);
                }
            }
            
            // Update in storage
            const data = storage.getData();
            data.results = results;
            storage.saveData(data);
            
            if (typeof notifications !== 'undefined') {
                notifications.success('Grading saved successfully!');
            } else {
                alert('Grading saved successfully!');
            }

            // Add notification for student
            if (typeof notificationCenter !== 'undefined') {
                const student = storage.getUsers().find(u => u.id === results[index].studentId);
                const quiz = storage.getQuizById(results[index].quizId);
                if (student) {
                    notificationCenter.addNotification(
                        'success',
                        'Quiz Graded',
                        `Your quiz "${quiz ? quiz.title : 'Quiz'}" has been graded. Score: ${results[index].manualScore || results[index].score}%`,
                        'grading',
                        { type: 'view_results', target: results[index].id, label: 'View Results' }
                    );
                }
            }

            this.showGradingQueue();
        }
    }

    // Quick grade action - mark as reviewed
    quickGradeResult(resultId, action) {
        const results = storage.getAllResults();
        const index = results.findIndex(r => r.id === resultId);
        if (index >= 0) {
            if (action === 'approve') {
                results[index].gradingStatus = 'reviewed';
            } else if (action === 'regrade') {
                results[index].gradingStatus = 'pending';
            }
            
            const data = storage.getData();
            data.results = results;
            storage.saveData(data);
            
            this.renderGradingQueue();
        }
    }

    // --- Quiz Taking Logic ---
    startQuiz(quizId) {
        this.currentQuiz = storage.getQuizById(quizId);
        if (!this.currentQuiz) return;
        
        // Check if quiz requires password
        if (this.currentQuiz.password) {
            this.pendingQuizId = quizId;
            this.showView('quiz-password-view');
            document.getElementById('quiz-password-title').textContent = this.currentQuiz.title;
            return;
        }
        
        // Check if quiz has instructions
        if (this.currentQuiz.instructions) {
            this.pendingQuizId = quizId;
            this.showView('quiz-instructions-view');
            document.getElementById('instructions-quiz-title').textContent = this.currentQuiz.title;
            document.getElementById('quiz-instructions-content').innerHTML = this.currentQuiz.instructions.replace(/\n/g, '<br>');
            return;
        }
        
        this.startQuizInternal(quizId);
    }

    verifyQuizPassword() {
        const password = document.getElementById('quiz-password-input').value;
        if (password === this.currentQuiz.password) {
            if (typeof notifications !== 'undefined') {
                notifications.success('Password verified!');
            }
            const quizId = this.pendingQuizId;
            this.pendingQuizId = null;
            
            // Check if quiz has instructions
            if (this.currentQuiz.instructions) {
                this.showView('quiz-instructions-view');
                document.getElementById('instructions-quiz-title').textContent = this.currentQuiz.title;
                document.getElementById('quiz-instructions-content').innerHTML = this.currentQuiz.instructions.replace(/\n/g, '<br>');
            } else {
                this.startQuizInternal(quizId);
            }
        } else {
            if (typeof popupManager !== 'undefined') {
                popupManager.showError({
                    title: 'Incorrect Password',
                    message: 'The password you entered is incorrect. Please try again.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.error('Incorrect password. Please try again.');
            } else {
                alert('Incorrect password. Please try again.');
            }
            document.getElementById('quiz-password-input').value = '';
            document.getElementById('quiz-password-input').focus();
        }
    }

    startQuizAfterInstructions() {
        const quizId = this.pendingQuizId;
        this.pendingQuizId = null;
        this.startQuizInternal(quizId);
    }

    startQuizInternal(quizId) {
        this.currentQuiz = storage.getQuizById(quizId);
        if (!this.currentQuiz) return;
        
        // Check attempt locking
        if (!this.currentQuiz.allowRetake) {
            const user = auth.getCurrentUser();
            const existingResults = storage.getAllResults().filter(r => 
                r.quizId === quizId && r.studentId === user.id
            );
            if (existingResults.length > 0) {
                if (typeof popupManager !== 'undefined') {
                    popupManager.showWarning({
                        title: 'Retake Not Allowed',
                        message: 'This quiz does not allow retakes. You have already completed it.',
                        autoClose: 4000
                    });
                } else if (typeof notifications !== 'undefined') {
                    notifications.warning('This quiz does not allow retakes. You have already completed it.');
                } else {
                    alert('This quiz does not allow retakes. You have already completed it.');
                }
                return;
            }
        }
        
        // Cache quiz data for offline access
        if (typeof offlineManager !== 'undefined') {
            offlineManager.cacheQuizData(this.currentQuiz);
        }

        this.currentQuestionIndex = 0;
        
        // Check for saved progress
        const savedProgress = localStorage.getItem(`quiz_progress_${auth.getCurrentUser().id}_${quizId}`);
        if (savedProgress) {
            if (confirm("You have an unfinished attempt. Do you want to continue?")) {
                const progress = JSON.parse(savedProgress);
                this.currentAttempt = progress.attempt;
                if (!this.currentAttempt.flagged) this.currentAttempt.flagged = []; // Backward compatibility
                this.currentQuestionIndex = progress.questionIndex;
                this.startTimer(progress.timeLeft);
            } else {
                localStorage.removeItem(`quiz_progress_${auth.getCurrentUser().id}_${quizId}`);
                this.initNewAttempt();
            }
        } else {
            this.initNewAttempt();
        }

        this.showView('quiz-taker-view');
        document.getElementById('taking-quiz-title').textContent = this.currentQuiz.title;
        
        // Randomize questions if new attempt and not loaded from save
        if (!savedProgress) {
             this.randomizeQuestions();
        }

        // Obfuscate correct answers for security
        if (typeof securityManager !== 'undefined') {
            this.quizCorrectAnswers = securityManager.separateCorrectAnswers(this.currentQuiz);
        }

        // Initialize sections
        if (this.currentQuiz.sections && this.currentQuiz.sections.length > 0) {
            this.currentSectionIndex = 0;
            this.currentQuestionIndex = this.getFirstQuestionInSection(0);
        } else {
            this.currentSectionIndex = -1; // No sections
        }

        // Anti-Cheat: Tab Switch Detection
        this.cheatCount = 0;
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        
        // Anti-Cheat: Disable Copy/Paste/Context Menu
        document.addEventListener('contextmenu', this.preventContextMenu);
        document.addEventListener('copy', this.preventCopy);
        document.addEventListener('paste', this.preventPaste);

        this.renderQuestion();
    }

    getFirstQuestionInSection(sectionIndex) {
        if (!this.currentQuiz.sections || sectionIndex < 0 || sectionIndex >= this.currentQuiz.sections.length) {
            return 0;
        }
        const section = this.currentQuiz.sections[sectionIndex];
        return section.questionIndices[0] || 0;
    }

    getCurrentSection() {
        if (!this.currentQuiz.sections || this.currentSectionIndex < 0) {
            return null;
        }
        return this.currentQuiz.sections[this.currentSectionIndex];
    }

    canMoveToNextSection() {
        const section = this.getCurrentSection();
        if (!section) return false;
        
        // Check if all questions in current section are answered
        const sectionQuestions = this.currentQuiz.questions.filter(q => q.sectionId === section.id);
        return sectionQuestions.every(q => this.currentAttempt.answers[q.id] !== undefined);
    }

    handleVisibilityChange = () => {
        if (document.hidden && this.currentQuiz) {
            this.cheatCount++;
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'Tab Switch Detected',
                    message: `Tab switching is monitored! Warning ${this.cheatCount}.`,
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning(`Tab switching detected! Warning ${this.cheatCount}.`);
            } else {
            alert(`Warning: Tab switching is monitored! Warning ${this.cheatCount}.`);
            }
        }
    }

    preventContextMenu = (e) => { e.preventDefault(); return false; }
    preventCopy = (e) => { e.preventDefault(); return false; }
    preventPaste = (e) => { e.preventDefault(); return false; }

    randomizeQuestions() {
        if (!this.currentQuiz.randomizeQuestions && !this.currentQuiz.randomizeOptions) return;

        // Shuffle question order if enabled
        if (this.currentQuiz.randomizeQuestions) {
            // Fisher-Yates shuffle
        for (let i = this.currentQuiz.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentQuiz.questions[i], this.currentQuiz.questions[j]] = [this.currentQuiz.questions[j], this.currentQuiz.questions[i]];
            }
        }

        // Shuffle answer options if enabled
        if (this.currentQuiz.randomizeOptions) {
            this.currentQuiz.questions.forEach(q => {
                if (q.type === 'multiple_choice' || q.type === 'image_question' || q.type === 'video_question') {
                    // Create array of indices
                    const indices = q.options.map((_, idx) => idx);
                    // Shuffle indices
                    for (let i = indices.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [indices[i], indices[j]] = [indices[j], indices[i]];
                    }
                    // Reorder options and update correctIndex
                    const shuffledOptions = indices.map(idx => q.options[idx]);
                    const newCorrectIndex = indices.indexOf(q.correctIndex);
                    q.options = shuffledOptions;
                    q.correctIndex = newCorrectIndex;
                }
            });
        }
    }

    initNewAttempt() {
        this.currentAttempt = {
            answers: {}, // questionId: selectedOptionIndex
            flagged: []
        };
        // Start Timer
        this.startTimer(this.currentQuiz.timeLimit * 60);
    }

    startTimer(seconds) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        let timeLeft = seconds;
        const timerDisplay = document.getElementById('quiz-timer');
        
        const updateDisplay = () => {
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            timerDisplay.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        };

        updateDisplay();
        
        this.timerInterval = setInterval(() => {
            timeLeft--;
            updateDisplay();
            
            // Save progress every second (or you could do it on answer selection to be less intensive, but this is safe)
            this.saveProgress(timeLeft);

            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                if (typeof popupManager !== 'undefined') {
                    popupManager.showWarning({
                        title: 'Time Up!',
                        message: 'Your time has expired. The quiz will be submitted automatically.',
                        autoClose: 2000
                    });
                } else if (typeof notifications !== 'undefined') {
                    notifications.warning('Time is up! Submitting quiz...');
                } else {
                alert('Time is up! Submitting quiz...');
                }
                setTimeout(() => this.submitQuiz(), 500);
            } else if (timeLeft <= 60) {
                // Warning when less than 1 minute
                timerDisplay.style.color = 'var(--danger-color)';
                timerDisplay.style.animation = 'pulse 1s infinite';
                
                // Show warning notification once
                if (timeLeft === 60 && typeof notifications !== 'undefined') {
                    notifications.warning('Less than 1 minute remaining!', 2000);
                }
            }
        }, 1000);
    }

    saveProgress(timeLeft) {
        if (!this.currentQuiz) return;
        const progress = {
            attempt: this.currentAttempt,
            questionIndex: this.currentQuestionIndex,
            timeLeft: timeLeft,
            timestamp: Date.now()
        };
        localStorage.setItem(`quiz_progress_${auth.getCurrentUser().id}_${this.currentQuiz.id}`, JSON.stringify(progress));
    }
    
    clearProgress() {
        if (!this.currentQuiz) return;
        localStorage.removeItem(`quiz_progress_${auth.getCurrentUser().id}_${this.currentQuiz.id}`);
    }

    evaluateCondition(question, answers) {
        if (!question.condition) return true;
        
        const dependsOnIndex = question.condition.dependsOn;
        if (dependsOnIndex < 0 || dependsOnIndex >= this.currentQuiz.questions.length) return true;
        
        const dependsOnQuestion = this.currentQuiz.questions[dependsOnIndex];
        const answer = answers[dependsOnQuestion.id];
        
        if (answer === undefined) return false;
        
        const answerStr = String(answer).toLowerCase();
        const valueStr = question.condition.value.toLowerCase();
        
        switch (question.condition.operator) {
            case 'equals':
                return answerStr === valueStr;
            case 'not_equals':
                return answerStr !== valueStr;
            case 'contains':
                return answerStr.includes(valueStr) || valueStr.includes(answerStr);
            default:
                return true;
        }
    }

    renderQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        
        // Check condition
        if (!this.evaluateCondition(question, this.currentAttempt.answers)) {
            // Condition not met, skip to next question
            if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
                this.currentQuestionIndex++;
                this.renderQuestion();
                return;
            } else {
                // Last question, submit
                this.submitQuiz();
                return;
            }
        }
        
        const container = document.getElementById('quiz-question-container');
        const section = this.getCurrentSection();
        
        // Calculate progress
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuiz.questions.length) * 100;
        const answeredCount = Object.keys(this.currentAttempt.answers || {}).length;
        const flaggedCount = (this.currentAttempt.flagged || []).length;
        
        // Section info display
        let sectionInfo = '';
        if (section) {
            const sectionNum = this.currentSectionIndex + 1;
            const totalSections = this.currentQuiz.sections.length;
            sectionInfo = `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <strong>Section ${sectionNum} of ${totalSections}: ${section.title}</strong>
                ${section.timeLimit ? ` (${section.timeLimit} min)` : ''}
            </div>`;
        }
        
        // Progress bar
        const progressBar = `
            <div class="quiz-progress" style="margin-bottom: 20px;">
                <div class="quiz-progress-fill" style="width: ${progress}%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 0.9em; color: #666;">
                <span>Question ${this.currentQuestionIndex + 1} of ${this.currentQuiz.questions.length}</span>
                <span>${answeredCount} answered • ${flaggedCount} flagged • ${Math.round(progress)}% Complete</span>
            </div>
        `;
        
        // Navigation buttons state
        const isFirstQuestion = this.currentQuestionIndex === 0 || 
            (section && this.currentQuestionIndex === this.getFirstQuestionInSection(this.currentSectionIndex));
        const isLastQuestion = this.currentQuestionIndex === this.currentQuiz.questions.length - 1 ||
            (section && this.currentQuestionIndex === section.questionIndices[section.questionIndices.length - 1]);
        
        document.getElementById('btn-prev').disabled = isFirstQuestion;
        
        if (isLastQuestion) {
            if (section && this.currentSectionIndex < this.currentQuiz.sections.length - 1) {
                // Show "Next Section" button if there are more sections
                document.getElementById('btn-next').classList.add('hidden');
                const nextSectionBtn = document.getElementById('btn-next-section');
                if (!nextSectionBtn) {
                    const btn = document.createElement('button');
                    btn.id = 'btn-next-section';
                    btn.className = 'btn';
                    btn.style.width = 'auto';
                    btn.textContent = 'Next Section';
                    btn.onclick = () => this.nextSection();
                    document.getElementById('btn-next').parentElement.insertBefore(btn, document.getElementById('btn-submit'));
                }
                document.getElementById('btn-next-section').classList.remove('hidden');
                document.getElementById('btn-submit').classList.add('hidden');
            } else {
                // Last question of last section - show submit
                const nextSectionBtn = document.getElementById('btn-next-section');
                if (nextSectionBtn) nextSectionBtn.classList.add('hidden');
            document.getElementById('btn-next').classList.add('hidden');
            document.getElementById('btn-submit').classList.remove('hidden');
            }
        } else {
            const nextSectionBtn = document.getElementById('btn-next-section');
            if (nextSectionBtn) nextSectionBtn.classList.add('hidden');
            document.getElementById('btn-next').classList.remove('hidden');
            document.getElementById('btn-submit').classList.add('hidden');
        }

        // Render Media if present
        let mediaHtml = '';
        if (question.mediaUrl) {
            if (question.mediaType === 'image') {
                mediaHtml = `<div style="margin: 15px 0;"><img src="${question.mediaUrl}" style="max-width:100%; max-height:400px; border:1px solid #ddd; border-radius:4px;"></div>`;
            } else if (question.mediaType === 'video') {
                mediaHtml = `<div style="margin: 15px 0;"><video src="${question.mediaUrl}" controls style="max-width:100%; max-height:400px; border:1px solid #ddd; border-radius:4px;"></video></div>`;
            }
        }

        // Render Content
        let contentHtml = '';
        let questionText = question.text;
        
        if (question.type === 'fill_in_blank') {
            // Replace ___ with input field
            const parts = question.text.split('___');
            const val = this.currentAttempt.answers[question.id] || '';
            questionText = `${parts[0]}<input type="text" value="${val}" oninput="app.selectAnswer(this.value)" placeholder="Fill in blank" style="border:2px solid var(--primary-color); padding:5px 10px; margin:0 5px; border-radius:4px; min-width:150px;">${parts[1] || ''}`;
        } else if (question.type === 'multiple_choice') {
            question.options.forEach((opt, idx) => {
                const isChecked = this.currentAttempt.answers[question.id] === idx ? 'checked' : '';
                contentHtml += `
                    <label>
                        <input type="radio" name="q_current" value="${idx}" ${isChecked} onchange="app.selectAnswer(${idx})">
                        ${opt}
                    </label>
                `;
            });
        } else if (question.type === 'true_false') {
             ['True', 'False'].forEach((opt, idx) => {
                const isChecked = this.currentAttempt.answers[question.id] === idx ? 'checked' : '';
                contentHtml += `
                    <label>
                        <input type="radio" name="q_current" value="${idx}" ${isChecked} onchange="app.selectAnswer(${idx})">
                        ${opt}
                    </label>
                `;
            });
        } else if (question.type === 'short_answer') {
            const val = this.currentAttempt.answers[question.id] || '';
            contentHtml += `
                <div class="form-group">
                    <input type="text" value="${val}" oninput="app.selectAnswer(this.value)" placeholder="Type your answer here..." style="width:100%; padding:10px;">
                </div>
            `;
        } else if (question.type === 'image_question' || question.type === 'video_question') {
            question.options.forEach((opt, idx) => {
                const isChecked = this.currentAttempt.answers[question.id] === idx ? 'checked' : '';
                contentHtml += `
                    <label>
                        <input type="radio" name="q_current" value="${idx}" ${isChecked} onchange="app.selectAnswer(${idx})">
                        ${opt}
                    </label>
                `;
            });
        }

        container.innerHTML = `
            ${sectionInfo}
            ${progressBar}
            <div class="quiz-question" style="display:flex; justify-content:space-between; align-items:flex-start; gap: 10px; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 8px; margin-bottom: 20px;">
                <div style="flex:1;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <span class="question-number">${this.currentQuestionIndex + 1}</span>
                        <span id="question-text" style="font-size: 1.1rem; line-height: 1.6;">${questionText}</span>
                        ${(this.currentAttempt.flagged || []).includes(question.id) ? '<span style="margin-left: 10px; font-size: 1.5rem;">🚩</span>' : ''}
                </div>
                </div>
                <button onclick="app.toggleFlag()" class="btn" style="width:auto; font-size:0.8rem; padding: 5px 10px; margin:0; flex-shrink:0; ${(this.currentAttempt.flagged || []).includes(question.id) ? 'background: #e74c3c; color: white;' : 'background: #f39c12; color: white;'}" title="${(this.currentAttempt.flagged || []).includes(question.id) ? 'Unflag question' : 'Flag for review'}">
                    ${(this.currentAttempt.flagged || []).includes(question.id) ? '✓ Flagged' : '🚩 Flag'}
                </button>
            </div>
            ${mediaHtml}
            <div class="quiz-options" style="margin-top: 20px;">
                ${contentHtml}
            </div>
        `;
    }

    toggleFlag() {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        if (!this.currentAttempt.flagged) this.currentAttempt.flagged = [];
        
        if (this.currentAttempt.flagged.includes(question.id)) {
            this.currentAttempt.flagged = this.currentAttempt.flagged.filter(id => id !== question.id);
        } else {
            this.currentAttempt.flagged.push(question.id);
        }
        this.renderQuestion();
    }

    selectAnswer(answer) {
        const question = this.currentQuiz.questions[this.currentQuestionIndex];
        this.currentAttempt.answers[question.id] = answer;
        // Also save on interaction to be safe
        // We need the current timer value, which is a bit tricky to access from here without storing it in class
        // But the timer interval saves every second, which is sufficient for "Continue Later"
    }

    nextQuestion() {
        const section = this.getCurrentSection();
        if (section) {
            // Check if we're at the last question of current section
            const lastQuestionIndex = section.questionIndices[section.questionIndices.length - 1];
            if (this.currentQuestionIndex >= lastQuestionIndex) {
                // Can't go to next question in this section
                return;
            }
        }
        
        if (this.currentQuestionIndex < this.currentQuiz.questions.length - 1) {
            this.currentQuestionIndex++;
            // If sections exist, update current section index
            if (section) {
                const newSection = this.currentQuiz.sections.find(s => 
                    s.questionIndices.includes(this.currentQuestionIndex)
                );
                if (newSection) {
                    this.currentSectionIndex = this.currentQuiz.sections.indexOf(newSection);
                }
            }
            this.renderQuestion();
        }
    }

    prevQuestion() {
        const section = this.getCurrentSection();
        if (section) {
            // Check if we're at the first question of current section
            const firstQuestionIndex = section.questionIndices[0];
            if (this.currentQuestionIndex <= firstQuestionIndex) {
                // Can't go to previous question in this section
                return;
            }
        }
        
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            // If sections exist, update current section index
            if (section) {
                const newSection = this.currentQuiz.sections.find(s => 
                    s.questionIndices.includes(this.currentQuestionIndex)
                );
                if (newSection) {
                    this.currentSectionIndex = this.currentQuiz.sections.indexOf(newSection);
                }
            }
            this.renderQuestion();
        }
    }

    nextSection() {
        if (!this.currentQuiz.sections || this.currentSectionIndex < 0) return;
        
        if (!this.canMoveToNextSection()) {
            alert('Please answer all questions in the current section before proceeding.');
            return;
        }
        
        if (this.currentSectionIndex < this.currentQuiz.sections.length - 1) {
            this.currentSectionIndex++;
            this.currentQuestionIndex = this.getFirstQuestionInSection(this.currentSectionIndex);
            this.renderQuestion();
        }
    }

    submitQuiz() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        // Restore correct answers for grading
        if (typeof securityManager !== 'undefined' && this.quizCorrectAnswers) {
            securityManager.restoreCorrectAnswers(this.currentQuiz, this.quizCorrectAnswers);
        }
        
        let correctCount = 0;
        this.currentQuiz.questions.forEach(q => {
            const userAnswer = this.currentAttempt.answers[q.id];
            
            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                if (userAnswer && q.correctAnswerText && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase()) {
                    correctCount++;
                }
            } else {
                // MC, TF, Image, Video
                if (userAnswer === q.correctIndex) {
                    correctCount++;
                }
            }
        });

        // Calculate score based on points
        let totalPoints = 0;
        let earnedPoints = 0;
        
        this.currentQuiz.questions.forEach(q => {
            const points = q.points || 1;
            totalPoints += points;
            const userAnswer = this.currentAttempt.answers[q.id];
            
            let isCorrect = false;
            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                if (userAnswer && q.correctAnswerText && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase()) {
                    isCorrect = true;
                }
            } else {
                if (userAnswer === q.correctIndex) {
                    isCorrect = true;
                }
            }
            
            if (isCorrect) {
                earnedPoints += points;
            }
        });
        
        const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
        
        // Determine initial grading status based on quiz settings
        let initialGradingStatus = 'auto';
        if (this.currentQuiz.gradingMode === 'manual') {
            initialGradingStatus = 'pending';
        }
        
        const result = {
            id: 'r_' + Date.now(),
            quizId: this.currentQuiz.id,
            studentId: auth.getCurrentUser().id,
            date: new Date().toISOString(),
            score: score,
            answers: this.currentAttempt.answers,
            totalQuestions: this.currentQuiz.questions.length,
            correctCount: correctCount,
            earnedPoints: earnedPoints,
            totalPoints: totalPoints,
            gradingStatus: initialGradingStatus, // auto, pending, graded, reviewed
            manualScore: null,
            feedback: {},
            gradedBy: null,
            gradedAt: null
        };
        
        // Save result (offline-aware)
        if (typeof offlineManager !== 'undefined' && !offlineManager.isOnline()) {
            offlineManager.saveResultOffline(result);
            if (typeof notifications !== 'undefined') {
                notifications.warning('Quiz submitted offline. Results will sync when online.');
            }
        } else {
            storage.saveResult(result);
        }
        
        this.clearProgress(); // Clear saved progress on submission

        // Add notification for student
        if (typeof notificationCenter !== 'undefined') {
            const user = auth.getCurrentUser();
            notificationCenter.addNotification(
                'success',
                'Quiz Submitted',
                `Your quiz "${this.currentQuiz.title}" has been submitted successfully. Score: ${score}%`,
                'quiz',
                { type: 'view_results', target: result.id, label: 'View Results' }
            );
        }

        // Add notification for teacher if manual grading
        if (this.currentQuiz.gradingMode === 'manual' && typeof notificationCenter !== 'undefined') {
            const user = auth.getCurrentUser();
            // Get all teachers
            const teachers = storage.getUsers().filter(u => u.role === 'teacher');
            teachers.forEach(teacher => {
                notificationCenter.addNotification(
                    'warning',
                    'Quiz Needs Grading',
                    `${user.name} submitted "${this.currentQuiz.title}". Manual grading required.`,
                    'grading',
                    { type: 'grade', target: this.currentQuiz.id, label: 'Grade Now' }
                );
            });
        }
        
        // Clean up listeners
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        document.removeEventListener('contextmenu', this.preventContextMenu);
        document.removeEventListener('copy', this.preventCopy);
        document.removeEventListener('paste', this.preventPaste);
        this.currentQuiz = null; // Reset current quiz to stop listeners/timers logic

        this.showResultView(score, result.id);
    }

    canShowResults(quiz, result) {
        if (!quiz) return false;
        
        // Check grading mode
        if (quiz.gradingMode === 'manual') {
            // Only show if graded
            return result.gradingStatus === 'graded' || result.gradingStatus === 'reviewed';
        } else if (quiz.gradingMode === 'auto_delayed') {
            // Check if results time has passed
            if (quiz.resultsTime) {
                return new Date() >= new Date(quiz.resultsTime);
            }
            return true;
        }
        
        // Auto grading - show immediately
        return true;
    }

    canShowAnswers(quiz, result) {
        if (!quiz) return false;
        
        if (quiz.showAnswers === 'never') return false;
        if (quiz.showAnswers === 'immediately') return true;
        if (quiz.showAnswers === 'after_grading') {
            return result.gradingStatus === 'graded' || result.gradingStatus === 'reviewed';
        }
        if (quiz.showAnswers === 'scheduled') {
            if (quiz.answersTime) {
                return new Date() >= new Date(quiz.answersTime);
            }
            return false;
        }
        
        return false;
    }

    canShowGrades(quiz, result) {
        if (!quiz) return false;
        
        if (quiz.showGrades === 'never') return false;
        if (quiz.showGrades === 'immediately') return true;
        if (quiz.showGrades === 'after_grading') {
            return result.gradingStatus === 'graded' || result.gradingStatus === 'reviewed';
        }
        if (quiz.showGrades === 'scheduled') {
            if (quiz.gradesTime) {
                return new Date() >= new Date(quiz.gradesTime);
            }
            return false;
        }
        
        return false;
    }

    showResultView(score, resultId) {
        const result = storage.getAllResults().find(r => r.id === resultId);
        const quiz = storage.getQuizById(result.quizId);
        
        this.showView('result-view');
        const container = document.querySelector('#result-view .card');
        const scoreElement = document.getElementById('result-score');
        const msgElement = document.getElementById('result-message');
        const actionsContainer = document.getElementById('result-actions-container');
        
        // Clear actions container
        actionsContainer.innerHTML = '';
        
        const canShowGrade = this.canShowGrades(quiz, result);
        const canShowAnswers = this.canShowAnswers(quiz, result);
        const canShowResults = this.canShowResults(quiz, result);
        
        if (canShowResults && canShowGrade) {
            scoreElement.textContent = score + '%';
            scoreElement.style.display = 'block';
            scoreElement.classList.add('score-display');
            
            if (score >= 80) msgElement.textContent = "Excellent Work! 🎉";
            else if (score >= 50) msgElement.textContent = "Good Effort! 👍";
            else msgElement.textContent = "Keep Practicing! 💪";
            
            // Show grade with animation
            let grade = 'F';
            if (score >= 90) grade = 'A';
            else if (score >= 80) grade = 'B';
            else if (score >= 70) grade = 'C';
            else if (score >= 60) grade = 'D';
            
            const gradeDiv = document.createElement('div');
            gradeDiv.className = 'fade-in-up';
            gradeDiv.style.cssText = 'font-size: 2rem; font-weight: bold; color: ' + this.getGradeColor(grade) + '; margin: 10px 0;';
            gradeDiv.textContent = `Grade: ${grade}`;
            actionsContainer.appendChild(gradeDiv);
            
            // Show confetti effect for high scores
            if (score >= 90 && typeof notifications !== 'undefined') {
                setTimeout(() => {
                    notifications.success('Outstanding performance! 🌟');
                }, 500);
            }
        } else {
            scoreElement.textContent = '?';
            scoreElement.style.display = 'block';
            
            if (quiz.gradingMode === 'manual') {
                msgElement.textContent = "Your quiz has been submitted. Results will be available after grading.";
                if (typeof notifications !== 'undefined') {
                    notifications.info('Your quiz is pending teacher review.');
                }
            } else if (quiz.resultsTime) {
                msgElement.textContent = `Results will be available on ${new Date(quiz.resultsTime).toLocaleString()}`;
            } else {
                msgElement.textContent = "Your quiz has been submitted. Results will be available soon.";
            }
        }
        
        // Add buttons based on permissions
        if (canShowAnswers) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.marginTop = '10px';
        btn.style.background = '#f39c12';
        btn.textContent = 'Review Answers';
        btn.onclick = () => app.reviewQuiz(resultId);
            actionsContainer.appendChild(btn);
        }
        
        if (canShowResults || canShowGrade) {
        const printBtn = document.createElement('button');
        printBtn.className = 'btn';
        printBtn.style.marginTop = '10px';
        printBtn.style.marginLeft = '10px';
        printBtn.style.background = '#34495e';
            printBtn.textContent = 'Print Scorecard';
            printBtn.onclick = () => {
                if (typeof reporting !== 'undefined') {
                    reporting.printScorecard(resultId);
                } else {
                    window.print();
                }
            };
            actionsContainer.appendChild(printBtn);
        }
        
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.style.marginTop = '10px';
        backBtn.style.marginLeft = '10px';
        backBtn.textContent = 'Return to Dashboard';
        backBtn.onclick = () => app.showStudentDashboard();
        actionsContainer.appendChild(backBtn);
    }
    
    reviewQuiz(resultId) {
        // Find result
        const results = storage.getAllResults();
        const result = results.find(r => r.id === resultId);
        const quiz = storage.getQuizById(result.quizId);
        
        if(!result || !quiz) return;
        
        // Check if answers can be shown
        if (!this.canShowAnswers(quiz, result)) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showInfo({
                    title: 'Answers Not Available',
                    message: 'Answers are not available yet. They will be shown after grading is complete or at the scheduled time.',
                    autoClose: 4000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.info('Answers are not available yet. They will be shown after grading is complete or at the scheduled time.');
            } else {
                alert('Answers are not available yet. They will be shown after grading is complete or at the scheduled time.');
            }
            return;
        }
        
        // reuse quiz taker view but modified for review
        this.showView('quiz-taker-view');
        document.getElementById('taking-quiz-title').textContent = "Review: " + quiz.title;
        document.getElementById('quiz-timer').textContent = "Review Mode";
        
        const container = document.getElementById('quiz-question-container');
        container.innerHTML = '';
        
        // Show all questions in one page for review
        quiz.questions.forEach((q, idx) => {
            const userAnswer = result.answers[q.id];
            let isCorrect = false;
            let correctAnswerDisplay = '';
            let userAnswerDisplay = '';
            const points = q.points || 1;
            
            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                isCorrect = userAnswer && q.correctAnswerText && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase();
                correctAnswerDisplay = q.correctAnswerText;
                userAnswerDisplay = userAnswer || '(No Answer)';
            } else {
                isCorrect = userAnswer === q.correctIndex;
                if(q.type === 'true_false') {
                    correctAnswerDisplay = q.correctIndex === 0 ? 'True' : 'False';
                    userAnswerDisplay = userAnswer === 0 ? 'True' : userAnswer === 1 ? 'False' : '(No Answer)';
                } else {
                    correctAnswerDisplay = q.options[q.correctIndex];
                    userAnswerDisplay = userAnswer !== undefined ? q.options[userAnswer] : '(No Answer)';
                }
            }
            
            const earnedPoints = isCorrect ? points : 0;
            
            const div = document.createElement('div');
            div.className = 'question-block';
            div.style.borderLeft = isCorrect ? '5px solid green' : '5px solid red';
            div.style.marginBottom = '15px';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4>Q${idx+1} (${points} point${points > 1 ? 's' : ''})</h4>
                    <span style="font-size: 1.2em; font-weight: bold; color: ${isCorrect ? '#2ecc71' : '#e74c3c'}">
                        ${isCorrect ? '✓' : '✗'} ${earnedPoints}/${points}
                    </span>
                </div>
                <p><strong>${q.text}</strong></p>
                <div style="padding: 10px; background: #f8f9fa; border-radius: 4px; margin: 10px 0;">
                    <p><strong>Your Answer:</strong> ${userAnswerDisplay}</p>
                    ${!isCorrect ? `<p style="color:green; margin-top: 5px;"><strong>Correct Answer:</strong> ${correctAnswerDisplay}</p>` : '<p style="color:green; margin-top: 5px;"><strong>Correct!</strong></p>'}
                </div>
                ${q.explanation && quiz.showExplanations ? `<div style="margin-top: 10px; padding: 10px; background: #e8f4f8; border-radius: 4px;"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
                ${result.feedback && result.feedback[q.id] ? `<div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px;"><strong>Teacher Feedback:</strong> ${result.feedback[q.id]}</div>` : ''}
            `;
            container.appendChild(div);
        });
        
        // Hide Nav buttons
        document.getElementById('btn-prev').classList.add('hidden');
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-submit').classList.add('hidden');
        
        // Add Back Button
        const backBtn = document.createElement('button');
        backBtn.className = 'btn';
        backBtn.textContent = 'Back to Dashboard';
        backBtn.onclick = () => app.showStudentDashboard();
        container.appendChild(backBtn);
    }
    
    // --- Leaderboard Logic ---
    showLeaderboard() {
        this.showView('leaderboard-view');
        const tbody = document.getElementById('leaderboard-list');
        tbody.innerHTML = '';
        
        const results = storage.getAllResults();
        const users = storage.getUsers();
        
        // Calculate total score per student
        const studentScores = {};
        
        results.forEach(r => {
            if (!studentScores[r.studentId]) {
                studentScores[r.studentId] = {
                    totalScore: 0,
                    quizzesTaken: 0
                };
            }
            studentScores[r.studentId].totalScore += r.score;
            studentScores[r.studentId].quizzesTaken += 1;
        });
        
        // Convert to array and sort
        const leaderboard = Object.keys(studentScores).map(studentId => {
            const user = users.find(u => u.id === studentId);
            return {
                name: user ? user.name : 'Unknown Student',
                ...studentScores[studentId]
            };
        }).sort((a, b) => b.totalScore - a.totalScore);
        
        leaderboard.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.name}</td>
                <td>${entry.totalScore}</td>
                <td>${entry.quizzesTaken}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- Data Management ---
    exportData() {
        const data = storage.getData();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "quiz_master_backup_" + Date.now() + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    clearData() {
        if (typeof modalManager !== 'undefined') {
            modalManager.confirm({
                title: 'Clear All Data',
                message: 'Are you sure? This will DELETE ALL quizzes, results, users, and all data permanently. This action cannot be undone!',
                confirmText: 'Delete All',
                cancelText: 'Cancel'
            }).then(confirmed => {
                if (confirmed) {
                    localStorage.clear();
                    if (typeof popupManager !== 'undefined') {
                        popupManager.showInfo({
                            title: 'Data Cleared',
                            message: 'All data has been cleared. The page will reload.',
                            autoClose: 2000
                        });
                    }
                    setTimeout(() => window.location.reload(), 2000);
                }
            });
        } else {
            if (confirm("Are you sure? This will DELETE ALL quizzes and results permanently.")) {
                localStorage.clear();
                window.location.reload();
            }
        }
    }

    showNotificationCenter() {
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.openNotificationCenter();
        }
        
        // Show/hide send notification button based on role
        const user = auth.getCurrentUser();
        const sendBtn = document.getElementById('send-notification-btn');
        if (sendBtn) {
            if (user && (user.role === 'teacher' || user.role === 'admin')) {
                sendBtn.style.display = 'inline-block';
            } else {
                sendBtn.style.display = 'none';
            }
        }
    }

    showSendNotification() {
        // Check if user has permission (teacher or admin)
        const user = auth.getCurrentUser();
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showError({
                    title: 'Access Denied',
                    message: 'Only teachers and admins can send notifications.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.error('Only teachers and admins can send notifications');
            }
            return;
        }

        // Close sidebar first
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.closeNotificationCenter();
        }
        
        this.showView('send-notification-view');
        this.addBreadcrumb([
            { text: 'Notifications', onclick: () => notificationCenter.openNotificationCenter() },
            { text: 'Send Notification', active: true }
        ]);
        
        // Reset form
        const titleInput = document.getElementById('send-notification-title');
        const messageInput = document.getElementById('send-notification-message');
        const typeSelect = document.getElementById('send-notification-type');
        const categorySelect = document.getElementById('send-notification-category');
        const recipientsDiv = document.getElementById('send-notification-recipients');
        
        if (titleInput) titleInput.value = '';
        if (messageInput) messageInput.value = '';
        if (typeSelect) typeSelect.value = 'info';
        if (categorySelect) categorySelect.value = 'system';
        if (recipientsDiv) recipientsDiv.innerHTML = '<span style="color: #666;">No recipients selected</span>';
        this.selectedRecipients = { users: [], groups: [], all: false };
    }

    showSendNotificationRecipients(mode) {
        this.recipientSelectionMode = mode;
        const modal = document.getElementById('notification-recipient-modal');
        const title = document.getElementById('recipient-modal-title');
        const content = document.getElementById('recipient-selection-content');
        
        if (!modal) return;

        if (mode === 'all') {
            title.textContent = 'Send to All Users';
            content.innerHTML = `
                <div style="padding: 20px; text-align: center;">
                    <p>This notification will be sent to all users in the system.</p>
                    <p style="color: #666; font-size: 0.9rem;">Total users: ${storage.getUsers().length}</p>
                </div>
            `;
            this.recipientSelectionData = { all: true };
        } else if (mode === 'users') {
            title.textContent = 'Select Users';
            const users = storage.getUsers();
            const currentUser = auth.getCurrentUser();
            
            let html = '<div style="max-height: 400px; overflow-y: auto;">';
            html += '<div style="margin-bottom: 10px;"><input type="text" id="recipient-user-search" placeholder="🔍 Search users..." class="form-control" oninput="app.filterRecipientUsers()"></div>';
            html += '<div style="margin-bottom: 10px;"><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" id="select-all-users-recipient" onchange="app.toggleSelectAllRecipientUsers()"> Select All</label></div>';
            html += '<div id="recipient-users-list" style="display: flex; flex-direction: column; gap: 8px;">';
            
            users.forEach(user => {
                if (user.id === currentUser.id) return; // Don't show current user
                html += `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s;" class="recipient-user-item" data-user-id="${user.id}" data-user-name="${user.name}" data-user-role="${user.role}">
                        <input type="checkbox" class="recipient-user-checkbox" value="${user.id}">
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${user.name}</div>
                            <div style="font-size: 0.85rem; color: #666;">${user.username} (${user.role})</div>
                        </div>
                    </label>
                `;
            });
            
            html += '</div></div>';
            content.innerHTML = html;
            this.recipientSelectionData = { users: [] };
        } else if (mode === 'groups') {
            title.textContent = 'Select Groups';
            const groups = storage.getGroups();
            
            if (groups.length === 0) {
                content.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No groups available. Please create groups first.</div>';
                this.recipientSelectionData = { groups: [] };
            } else {
                let html = '<div style="max-height: 400px; overflow-y: auto;">';
                html += '<div style="margin-bottom: 10px;"><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" id="select-all-groups-recipient" onchange="app.toggleSelectAllRecipientGroups()"> Select All</label></div>';
                html += '<div id="recipient-groups-list" style="display: flex; flex-direction: column; gap: 8px;">';
                
                groups.forEach(group => {
                    const memberCount = group.members ? group.members.length : 0;
                    html += `
                        <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; transition: all 0.2s;" class="recipient-group-item" data-group-id="${group.id}" data-group-name="${group.name}">
                            <input type="checkbox" class="recipient-group-checkbox" value="${group.id}">
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${group.name}</div>
                                <div style="font-size: 0.85rem; color: #666;">${memberCount} member(s)</div>
                            </div>
                        </label>
                    `;
                });
                
                html += '</div></div>';
                content.innerHTML = html;
                this.recipientSelectionData = { groups: [] };
            }
        }
        
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
    }

    closeRecipientModal() {
        const modal = document.getElementById('notification-recipient-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    toggleSelectAllRecipientUsers() {
        const selectAll = document.getElementById('select-all-users-recipient');
        const checkboxes = document.querySelectorAll('.recipient-user-checkbox');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
    }

    toggleSelectAllRecipientGroups() {
        const selectAll = document.getElementById('select-all-groups-recipient');
        const checkboxes = document.querySelectorAll('.recipient-group-checkbox');
        checkboxes.forEach(cb => cb.checked = selectAll.checked);
    }

    filterRecipientUsers() {
        const search = document.getElementById('recipient-user-search').value.toLowerCase();
        const items = document.querySelectorAll('.recipient-user-item');
        items.forEach(item => {
            const name = item.dataset.userName || '';
            const username = item.querySelector('div').textContent.toLowerCase();
            if (name.toLowerCase().includes(search) || username.includes(search)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    confirmRecipientSelection() {
        try {
            if (this.recipientSelectionMode === 'all') {
                this.selectedRecipients = { users: [], groups: [], all: true };
                const recipientsDiv = document.getElementById('send-notification-recipients');
                if (recipientsDiv) {
                    recipientsDiv.innerHTML = '<span style="color: #2ecc71; font-weight: 500;">All Users</span>';
                }
            } else if (this.recipientSelectionMode === 'users') {
                // Find all checkboxes, including those in hidden (filtered) items
                const allCheckboxes = document.querySelectorAll('.recipient-user-checkbox');
                const selected = Array.from(allCheckboxes).filter(cb => cb.checked);
                
                this.selectedRecipients.users = selected.map(cb => {
                    const item = cb.closest('.recipient-user-item');
                    return {
                        id: cb.value,
                        name: item ? (item.dataset.userName || 'Unknown') : 'Unknown',
                        role: item ? (item.dataset.userRole || '') : ''
                    };
                });
                this.selectedRecipients.all = false;
                this.selectedRecipients.groups = []; // Clear groups when selecting users
                
                const recipientsDiv = document.getElementById('send-notification-recipients');
                if (recipientsDiv) {
                    if (this.selectedRecipients.users.length > 0) {
                        recipientsDiv.innerHTML = `
                            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                ${this.selectedRecipients.users.map(u => `
                                    <span style="background: #3498db; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">${u.name}</span>
                                `).join('')}
                            </div>
                            <div style="margin-top: 5px; font-size: 0.85rem; color: #666;">${this.selectedRecipients.users.length} user(s) selected</div>
                        `;
                    } else {
                        recipientsDiv.innerHTML = '<span style="color: #f39c12;">⚠️ Please select at least one user</span>';
                        // Don't close modal if no selection
                        if (typeof notifications !== 'undefined') {
                            notifications.warning('Please select at least one user');
                        }
                        return; // Don't close modal
                    }
                }
            } else if (this.recipientSelectionMode === 'groups') {
                // Find all checkboxes, including those in hidden (filtered) items
                const allCheckboxes = document.querySelectorAll('.recipient-group-checkbox');
                const selected = Array.from(allCheckboxes).filter(cb => cb.checked);
                
                this.selectedRecipients.groups = selected.map(cb => {
                    const item = cb.closest('.recipient-group-item');
                    return {
                        id: cb.value,
                        name: item ? (item.dataset.groupName || 'Unknown') : 'Unknown'
                    };
                });
                this.selectedRecipients.all = false;
                this.selectedRecipients.users = []; // Clear users when selecting groups
                
                const recipientsDiv = document.getElementById('send-notification-recipients');
                if (recipientsDiv) {
                    if (this.selectedRecipients.groups.length > 0) {
                        recipientsDiv.innerHTML = `
                            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                                ${this.selectedRecipients.groups.map(g => `
                                    <span style="background: #2ecc71; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85rem;">${g.name}</span>
                                `).join('')}
                            </div>
                            <div style="margin-top: 5px; font-size: 0.85rem; color: #666;">${this.selectedRecipients.groups.length} group(s) selected</div>
                        `;
                    } else {
                        recipientsDiv.innerHTML = '<span style="color: #f39c12;">⚠️ Please select at least one group</span>';
                        // Don't close modal if no selection
                        if (typeof notifications !== 'undefined') {
                            notifications.warning('Please select at least one group');
                        }
                        return; // Don't close modal
                    }
                }
            }
            
            // Close modal only if selection was successful
            this.closeRecipientModal();
            
            // Show success feedback
            if (typeof notifications !== 'undefined') {
                if (this.recipientSelectionMode === 'all') {
                    notifications.success('All users selected');
                } else if (this.recipientSelectionMode === 'users') {
                    notifications.success(`${this.selectedRecipients.users.length} user(s) selected`);
                } else if (this.recipientSelectionMode === 'groups') {
                    notifications.success(`${this.selectedRecipients.groups.length} group(s) selected`);
                }
            }
        } catch (error) {
            console.error('Error confirming recipient selection:', error);
            if (typeof popupManager !== 'undefined') {
                popupManager.showError({
                    title: 'Selection Error',
                    message: 'An error occurred while confirming your selection. Please try again.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.error('Error confirming selection');
            }
        }
    }

    sendNotification() {
        const title = document.getElementById('send-notification-title').value.trim();
        const message = document.getElementById('send-notification-message').value.trim();
        const type = document.getElementById('send-notification-type').value;
        const category = document.getElementById('send-notification-category').value;

        if (!title || !message) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'Missing Information',
                    message: 'Please enter both title and message.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning('Please enter both title and message');
            }
            return;
        }

        if (!this.selectedRecipients || (!this.selectedRecipients.all && this.selectedRecipients.users.length === 0 && this.selectedRecipients.groups.length === 0)) {
            if (typeof popupManager !== 'undefined') {
                popupManager.showWarning({
                    title: 'No Recipients',
                    message: 'Please select at least one recipient.',
                    autoClose: 3000
                });
            } else if (typeof notifications !== 'undefined') {
                notifications.warning('Please select at least one recipient');
            }
            return;
        }

        let sentCount = 0;
        const users = storage.getUsers();
        const groups = storage.getGroups();

        if (this.selectedRecipients.all) {
            // Send to all users
            users.forEach(user => {
                if (typeof notificationCenter !== 'undefined') {
                    notificationCenter.addNotificationToUser(user.id, type, title, message, category);
                    sentCount++;
                }
            });
        } else {
            // Send to selected users
            this.selectedRecipients.users.forEach(recipient => {
                if (typeof notificationCenter !== 'undefined') {
                    notificationCenter.addNotificationToUser(recipient.id, type, title, message, category);
                    sentCount++;
                }
            });

            // Send to users in selected groups
            this.selectedRecipients.groups.forEach(groupRecipient => {
                const group = groups.find(g => g.id === groupRecipient.id);
                if (group && group.members) {
                    group.members.forEach(userId => {
                        if (typeof notificationCenter !== 'undefined') {
                            notificationCenter.addNotificationToUser(userId, type, title, message, category);
                            sentCount++;
                        }
                    });
                }
            });
        }

        if (typeof notifications !== 'undefined') {
            notifications.success(`Notification sent to ${sentCount} user(s)!`);
        }

        if (typeof popupManager !== 'undefined') {
            popupManager.showSuccess({
                title: 'Notification Sent',
                message: `Successfully sent notification to ${sentCount} user(s).`,
                autoClose: 3000
            });
        }

        // Reset form
        this.showSendNotification();
    }

    clearAllNotifications() {
        if (typeof modalManager !== 'undefined') {
            modalManager.confirm({
                title: 'Clear All Notifications',
                message: 'Are you sure you want to clear all notifications? This action cannot be undone.',
                confirmText: 'Clear All',
                cancelText: 'Cancel'
            }).then(confirmed => {
                if (confirmed) {
                    if (typeof notificationCenter !== 'undefined') {
                        notificationCenter.clearAll();
                        notificationCenter.renderNotificationSidebar();
                        if (typeof notifications !== 'undefined') {
                            notifications.success('All notifications cleared');
                        }
                    }
                }
            });
        } else {
            if (confirm('Clear all notifications?')) {
                if (typeof notificationCenter !== 'undefined') {
                    notificationCenter.clearAll();
                    notificationCenter.renderNotificationSidebar();
                }
            }
        }
    }

    showNotificationSettings() {
        this.showView('notification-settings-view');
        this.addBreadcrumb([
            { text: 'Notifications', onclick: () => notificationCenter.openNotificationCenter() },
            { text: 'Settings', active: true }
        ]);
        
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.loadNotificationSettings();
        }
    }
}

const app = new App();
