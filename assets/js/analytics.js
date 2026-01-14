/**
 * AnalyticsManager
 * Handles analytics and chart generation using Chart.js
 */

class AnalyticsManager {
    constructor() {
        this.storage = new StorageManager();
    }

    // Student Performance Over Time (Line Chart)
    renderPerformanceOverTime(canvasId, studentId) {
        const results = this.storage.getResultsByStudent(studentId);
        if (results.length === 0) return;

        const sortedResults = results.sort((a, b) => new Date(a.date) - new Date(b.date));
        const labels = sortedResults.map(r => {
            const date = new Date(r.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const scores = sortedResults.map(r => r.score);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score (%)',
                    data: scores,
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // Topic Distribution (Pie Chart)
    renderTopicDistribution(canvasId, studentId) {
        const results = this.storage.getResultsByStudent(studentId);
        const quizzes = this.storage.getQuizzes();
        
        const topicScores = {};
        results.forEach(r => {
            const quiz = quizzes.find(q => q.id === r.quizId);
            if (quiz && quiz.topic) {
                if (!topicScores[quiz.topic]) {
                    topicScores[quiz.topic] = { total: 0, count: 0 };
                }
                topicScores[quiz.topic].total += r.score;
                topicScores[quiz.topic].count += 1;
            }
        });

        const labels = Object.keys(topicScores);
        const data = labels.map(topic => Math.round(topicScores[topic].total / topicScores[topic].count));

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    // Score Distribution (Bar Chart)
    renderScoreDistribution(canvasId, quizId = null) {
        const results = quizId 
            ? this.storage.getAllResults().filter(r => r.quizId === quizId)
            : this.storage.getAllResults();

        const ranges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
        const distribution = [0, 0, 0, 0, 0];

        results.forEach(r => {
            if (r.score <= 20) distribution[0]++;
            else if (r.score <= 40) distribution[1]++;
            else if (r.score <= 60) distribution[2]++;
            else if (r.score <= 80) distribution[3]++;
            else distribution[4]++;
        });

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ranges,
                datasets: [{
                    label: 'Number of Students',
                    data: distribution,
                    backgroundColor: 'rgba(52, 152, 219, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Class Comparison (Bar Chart)
    renderClassComparison(canvasId, quizId) {
        const results = this.storage.getAllResults().filter(r => r.quizId === quizId);
        const users = this.storage.getUsers();

        const studentScores = results.map(r => {
            const user = users.find(u => u.id === r.studentId);
            return {
                name: user ? user.name : 'Unknown',
                score: r.score
            };
        }).sort((a, b) => b.score - a.score);

        const labels = studentScores.map(s => s.name);
        const scores = studentScores.map(s => s.score);

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score (%)',
                    data: scores,
                    backgroundColor: 'rgba(46, 204, 113, 0.8)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // Heatmap for Topic Difficulty
    renderTopicHeatmap(canvasId) {
        const results = this.storage.getAllResults();
        const quizzes = this.storage.getQuizzes();
        const users = this.storage.getUsers();

        // Group by topic and student
        const topicData = {};
        results.forEach(r => {
            const quiz = quizzes.find(q => q.id === r.quizId);
            if (quiz && quiz.topic) {
                if (!topicData[quiz.topic]) {
                    topicData[quiz.topic] = [];
                }
                topicData[quiz.topic].push(r.score);
            }
        });

        const topics = Object.keys(topicData);
        const avgScores = topics.map(topic => {
            const scores = topicData[topic];
            return scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        // Create heatmap data (simplified - using bar chart)
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topics,
                datasets: [{
                    label: 'Average Score (%)',
                    data: avgScores,
                    backgroundColor: avgScores.map(score => {
                        if (score >= 80) return 'rgba(46, 204, 113, 0.8)';
                        if (score >= 60) return 'rgba(241, 196, 15, 0.8)';
                        return 'rgba(231, 76, 60, 0.8)';
                    })
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    // Get student statistics
    getStudentStats(studentId) {
        const results = this.storage.getResultsByStudent(studentId);
        if (results.length === 0) {
            return {
                totalAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                improvement: 0
            };
        }

        const scores = results.map(r => r.score);
        const sortedResults = results.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return {
            totalAttempts: results.length,
            averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            improvement: sortedResults.length > 1 
                ? sortedResults[sortedResults.length - 1].score - sortedResults[0].score 
                : 0
        };
    }

    // Get class statistics
    getClassStats() {
        const results = this.storage.getAllResults();
        const users = this.storage.getUsers();
        const students = users.filter(u => u.role === 'student');

        if (results.length === 0) {
            return {
                totalStudents: students.length,
                totalAttempts: 0,
                averageScore: 0,
                completionRate: 0
            };
        }

        const scores = results.map(r => r.score);
        const studentIds = new Set(results.map(r => r.studentId));

        return {
            totalStudents: students.length,
            activeStudents: studentIds.size,
            totalAttempts: results.length,
            averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            completionRate: Math.round((studentIds.size / students.length) * 100)
        };
    }
}

const analytics = new AnalyticsManager();

