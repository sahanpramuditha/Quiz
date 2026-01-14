/**
 * QuestionBankManager
 * Manages question bank with categorization, search, and bulk operations
 */

class QuestionBankManager {
    constructor() {
        this.storage = new StorageManager();
    }

    getQuestionBank() {
        const data = this.storage.getData();
        return data.questionBank || [];
    }

    saveQuestionBank(questionBank) {
        const data = this.storage.getData();
        data.questionBank = questionBank;
        this.storage.saveData(data);
    }

    addQuestion(question) {
        const bank = this.getQuestionBank();
        if (!question.id) {
            question.id = 'qb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        question.createdAt = question.createdAt || new Date().toISOString();
        bank.push(question);
        this.saveQuestionBank(bank);
        return question;
    }

    updateQuestion(questionId, updates) {
        const bank = this.getQuestionBank();
        const index = bank.findIndex(q => q.id === questionId);
        if (index >= 0) {
            bank[index] = { ...bank[index], ...updates };
            this.saveQuestionBank(bank);
            return bank[index];
        }
        return null;
    }

    deleteQuestion(questionId) {
        const bank = this.getQuestionBank();
        const filtered = bank.filter(q => q.id !== questionId);
        this.saveQuestionBank(filtered);
    }

    getQuestionById(questionId) {
        return this.getQuestionBank().find(q => q.id === questionId);
    }

    searchQuestions(query, filters = {}) {
        let results = this.getQuestionBank();
        
        // Text search
        if (query) {
            const lowerQuery = query.toLowerCase();
            results = results.filter(q => 
                q.text.toLowerCase().includes(lowerQuery) ||
                (q.topic && q.topic.toLowerCase().includes(lowerQuery)) ||
                (q.tags && q.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
            );
        }

        // Filter by topic
        if (filters.topic) {
            results = results.filter(q => q.topic === filters.topic);
        }

        // Filter by difficulty
        if (filters.difficulty) {
            results = results.filter(q => q.difficulty === filters.difficulty);
        }

        // Filter by type
        if (filters.type) {
            results = results.filter(q => q.type === filters.type);
        }

        return results;
    }

    getTopics() {
        const bank = this.getQuestionBank();
        const topics = new Set();
        bank.forEach(q => {
            if (q.topic) topics.add(q.topic);
        });
        return Array.from(topics).sort();
    }

    bulkImport(questions) {
        const bank = this.getQuestionBank();
        questions.forEach(q => {
            if (!q.id) {
                q.id = 'qb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            q.createdAt = q.createdAt || new Date().toISOString();
            bank.push(q);
        });
        this.saveQuestionBank(bank);
        return questions.length;
    }

    exportQuestions(questionIds = null) {
        const bank = this.getQuestionBank();
        if (questionIds) {
            return bank.filter(q => questionIds.includes(q.id));
        }
        return bank;
    }
}

const questionBank = new QuestionBankManager();

