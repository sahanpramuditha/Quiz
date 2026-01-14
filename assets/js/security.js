/**
 * SecurityManager
 * Handles security features like answer obfuscation
 */

class SecurityManager {
    constructor() {
        this.obfuscationKey = this.generateKey();
    }

    generateKey() {
        // Generate a simple obfuscation key
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    obfuscateAnswer(answer) {
        // Simple obfuscation - encode answer
        if (typeof answer === 'number') {
            return this.obfuscateNumber(answer);
        }
        return btoa(String(answer)).split('').reverse().join('');
    }

    deobfuscateAnswer(obfuscated) {
        try {
            return obfuscated.split('').reverse().join('').split('').map(c => atob(c)).join('');
        } catch (e) {
            return obfuscated;
        }
    }

    obfuscateNumber(num) {
        // Simple number obfuscation
        return (num * 7 + 13) % 1000;
    }

    deobfuscateNumber(obfuscated) {
        // Reverse the obfuscation
        for (let i = 0; i < 1000; i++) {
            if ((i * 7 + 13) % 1000 === obfuscated) {
                return i;
            }
        }
        return obfuscated;
    }

    // Store correct answers separately from question display
    separateCorrectAnswers(quiz) {
        const answers = {};
        quiz.questions.forEach(q => {
            answers[q.id] = {
                correctIndex: q.correctIndex,
                correctAnswerText: q.correctAnswerText
            };
            // Remove from question object
            delete q.correctIndex;
            delete q.correctAnswerText;
        });
        return answers;
    }

    // Restore correct answers for grading
    restoreCorrectAnswers(quiz, answers) {
        quiz.questions.forEach(q => {
            if (answers[q.id]) {
                q.correctIndex = answers[q.id].correctIndex;
                q.correctAnswerText = answers[q.id].correctAnswerText;
            }
        });
    }
}

const securityManager = new SecurityManager();

