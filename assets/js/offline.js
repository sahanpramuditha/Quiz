/**
 * OfflineManager
 * Handles offline functionality and sync
 */

class OfflineManager {
    constructor() {
        this.storage = new StorageManager();
        this.pendingResults = [];
        this.init();
    }

    init() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration);
                    this.setupBackgroundSync(registration);
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });

            // Listen for service worker messages
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SYNC_RESULTS') {
                    this.syncPendingResults();
                }
            });
        }

        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.handleOnline();
        });

        window.addEventListener('offline', () => {
            this.handleOffline();
        });

        // Load pending results
        this.loadPendingResults();
    }

    setupBackgroundSync(registration) {
        if ('sync' in registration) {
            // Background sync is supported
            registration.sync.register('sync-quiz-results');
        }
    }

    handleOnline() {
        // Show online indicator
        this.updateOfflineIndicator(false);
        // Sync pending results
        this.syncPendingResults();
    }

    handleOffline() {
        // Show offline indicator
        this.updateOfflineIndicator(true);
    }

    updateOfflineIndicator(isOffline) {
        let indicator = document.getElementById('offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #e74c3c; color: white; padding: 10px; text-align: center; z-index: 10000; display: none;';
            document.body.appendChild(indicator);
        }
        
        if (isOffline) {
            indicator.textContent = '⚠️ You are offline. Your progress will be saved locally.';
            indicator.style.display = 'block';
        } else {
            indicator.textContent = '✓ Back online. Syncing data...';
            indicator.style.display = 'block';
            setTimeout(() => {
                indicator.style.display = 'none';
            }, 3000);
        }
    }

    cacheQuizData(quiz) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_QUIZ_DATA',
                quiz: quiz
            });
        }
    }

    saveResultOffline(result) {
        // Save to pending results
        this.pendingResults.push({
            ...result,
            pending: true,
            timestamp: Date.now()
        });
        this.savePendingResults();
    }

    loadPendingResults() {
        const stored = localStorage.getItem('quizmaster_pending_results');
        if (stored) {
            try {
                this.pendingResults = JSON.parse(stored);
            } catch (e) {
                this.pendingResults = [];
            }
        }
    }

    savePendingResults() {
        localStorage.setItem('quizmaster_pending_results', JSON.stringify(this.pendingResults));
    }

    syncPendingResults() {
        if (!navigator.onLine) return;

        const toSync = [...this.pendingResults];
        this.pendingResults = [];

        toSync.forEach(result => {
            try {
                // Save result to main storage
                this.storage.saveResult(result);
            } catch (e) {
                // If sync fails, add back to pending
                this.pendingResults.push(result);
            }
        });

        this.savePendingResults();
    }

    isOnline() {
        return navigator.onLine;
    }
}

const offlineManager = new OfflineManager();

