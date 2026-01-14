/**
 * AuthManager
 * Handles authentication logic using StorageManager.
 */

class AuthManager {
    constructor() {
        this.storage = new StorageManager();
    }

    login(username, password) {
        const user = this.storage.getUserByUsername(username);
        if (user && user.password === password) {
            this.storage.setCurrentUser(user);
            return { success: true, user: user };
        }
        return { success: false, message: 'Invalid credentials' };
    }

    logout() {
        this.storage.logoutUser();
        window.location.reload();
    }

    getCurrentUser() {
        return this.storage.getCurrentUser();
    }

    requireRole(role) {
        const user = this.getCurrentUser();
        if (!user || user.role !== role) {
            return false;
        }
        return true;
    }
    
    isAuthenticated() {
        return !!this.getCurrentUser();
    }
}

const auth = new AuthManager();
