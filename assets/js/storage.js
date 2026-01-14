/**
 * StorageManager
 * Handles all interactions with localStorage.
 * Implements a simple JSON store for Quizzes, Users, and Results.
 */

class StorageManager {
    constructor() {
        this.DB_KEY = 'quiz_master_db';
        this.init();
    }

    init() {
        if (!localStorage.getItem(this.DB_KEY)) {
            const initialData = {
                users: [
                    { id: 'u0', username: 'admin', password: 'password', role: 'admin', name: 'System Admin' },
                    { id: 'u1', username: 'teacher', password: 'password', role: 'teacher', name: 'Mr. Smith' },
                    { id: 'u2', username: 'student', password: 'password', role: 'student', name: 'Alice Doe' }
                ],
                quizzes: [],
                results: [],
                questionBank: [],
                templates: [],
                groups: [],
                notifications: [],
                currentUser: null
            };
            this.saveData(initialData);
        }
        // Self-healing: Ensure admin always exists (in case of legacy data)
        this.ensureAdminExists();
    }

    ensureAdminExists() {
        const data = this.getData();
        // Check if admin exists by username to avoid ID conflicts if IDs changed
        if (!data.users.find(u => u.username === 'admin')) {
            // Add admin to the beginning
            data.users.unshift({ id: 'u0', username: 'admin', password: 'password', role: 'admin', name: 'System Admin' });
            this.saveData(data);
            console.log('Admin user restored.');
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.DB_KEY));
    }

    saveData(data) {
        localStorage.setItem(this.DB_KEY, JSON.stringify(data));
    }

    // --- User Methods ---
    getUsers() {
        return this.getData().users;
    }

    addUser(user) {
        const data = this.getData();
        data.users.push(user);
        this.saveData(data);
    }

    deleteUser(userId) {
        const data = this.getData();
        data.users = data.users.filter(u => u.id !== userId);
        this.saveData(data);
    }

    getUserByUsername(username) {
        return this.getUsers().find(u => u.username === username);
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('quiz_master_current_user'));
    }

    setCurrentUser(user) {
        localStorage.setItem('quiz_master_current_user', JSON.stringify(user));
    }

    logoutUser() {
        localStorage.removeItem('quiz_master_current_user');
    }

    // --- Quiz Methods ---
    getQuizzes() {
        return this.getData().quizzes;
    }

    saveQuiz(quiz) {
        const data = this.getData();
        const index = data.quizzes.findIndex(q => q.id === quiz.id);
        if (index >= 0) {
            data.quizzes[index] = quiz;
        } else {
            data.quizzes.push(quiz);
        }
        this.saveData(data);
    }

    deleteQuiz(quizId) {
        const data = this.getData();
        data.quizzes = data.quizzes.filter(q => q.id !== quizId);
        this.saveData(data);
    }

    getQuizById(id) {
        return this.getQuizzes().find(q => q.id === id);
    }

    // --- Result/Attempt Methods ---
    saveResult(result) {
        const data = this.getData();
        data.results.push(result);
        this.saveData(data);
    }

    getResultsByStudent(studentId) {
        return this.getData().results.filter(r => r.studentId === studentId);
    }
    
    getAllResults() {
        return this.getData().results;
    }

    // --- Template Methods ---
    getTemplates() {
        const data = this.getData();
        return data.templates || [];
    }

    saveTemplate(template) {
        const data = this.getData();
        if (!data.templates) data.templates = [];
        const index = data.templates.findIndex(t => t.id === template.id);
        if (index >= 0) {
            data.templates[index] = template;
        } else {
            data.templates.push(template);
        }
        this.saveData(data);
    }

    deleteTemplate(templateId) {
        const data = this.getData();
        data.templates = (data.templates || []).filter(t => t.id !== templateId);
        this.saveData(data);
    }

    getTemplateById(id) {
        return this.getTemplates().find(t => t.id === id);
    }

    // --- Group Methods ---
    getGroups() {
        const data = this.getData();
        return data.groups || [];
    }

    saveGroup(group) {
        const data = this.getData();
        if (!data.groups) data.groups = [];
        const index = data.groups.findIndex(g => g.id === group.id);
        if (index >= 0) {
            data.groups[index] = group;
        } else {
            data.groups.push(group);
        }
        this.saveData(data);
    }

    deleteGroup(groupId) {
        const data = this.getData();
        data.groups = (data.groups || []).filter(g => g.id !== groupId);
        this.saveData(data);
    }

    getGroupById(id) {
        return this.getGroups().find(g => g.id === id);
    }
}

const storage = new StorageManager();
