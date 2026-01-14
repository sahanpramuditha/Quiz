/**
 * ReportingManager
 * Handles report generation and export
 */

class ReportingManager {
    constructor() {
        this.storage = new StorageManager();
    }

    exportResultsCSV(quizId = null) {
        const results = quizId 
            ? this.storage.getAllResults().filter(r => r.quizId === quizId)
            : this.storage.getAllResults();
        const quizzes = this.storage.getQuizzes();
        const users = this.storage.getUsers();

        if (results.length === 0) {
            alert('No results to export.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Student Name,Quiz Title,Score (%),Date,Status,Manual Score,Feedback\n";

        results.forEach(r => {
            const student = users.find(u => u.id === r.studentId);
            const quiz = quizzes.find(q => q.id === r.quizId);
            const studentName = student ? student.name : 'Unknown';
            const quizTitle = quiz ? quiz.title : 'Deleted Quiz';
            const date = new Date(r.date).toLocaleDateString();
            const status = r.gradingStatus || 'auto';
            const manualScore = r.manualScore !== null ? r.manualScore : '';
            const feedback = r.feedback ? Object.keys(r.feedback).length + ' feedback items' : '';

            csvContent += `"${studentName}","${quizTitle}",${r.manualScore !== null ? r.manualScore : r.score},${date},"${status}",${manualScore},"${feedback}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `quiz_results_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateScorecard(resultId) {
        const results = this.storage.getAllResults();
        const result = results.find(r => r.id === resultId);
        if (!result) return null;

        const quiz = this.storage.getQuizById(result.quizId);
        const users = this.storage.getUsers();
        const student = users.find(u => u.id === result.studentId);

        if (!quiz || !student) return null;

        const scorecard = {
            studentName: student.name,
            quizTitle: quiz.title,
            date: new Date(result.date).toLocaleDateString(),
            score: result.manualScore !== null ? result.manualScore : result.score,
            totalQuestions: result.totalQuestions,
            correctCount: result.correctCount,
            questions: []
        };

        quiz.questions.forEach((q, idx) => {
            const userAnswer = result.answers[q.id];
            let isCorrect = false;
            let correctAnswer = '';
            let userAnswerDisplay = '';

            if (q.type === 'short_answer' || q.type === 'fill_in_blank') {
                isCorrect = userAnswer && userAnswer.trim().toLowerCase() === q.correctAnswerText.trim().toLowerCase();
                correctAnswer = q.correctAnswerText;
                userAnswerDisplay = userAnswer || '(No answer)';
            } else {
                isCorrect = userAnswer === q.correctIndex;
                if (q.type === 'true_false') {
                    correctAnswer = q.correctIndex === 0 ? 'True' : 'False';
                    userAnswerDisplay = userAnswer === 0 ? 'True' : userAnswer === 1 ? 'False' : '(No answer)';
                } else {
                    correctAnswer = q.options[q.correctIndex];
                    userAnswerDisplay = userAnswer !== undefined ? q.options[userAnswer] : '(No answer)';
                }
            }

            scorecard.questions.push({
                number: idx + 1,
                text: q.text,
                userAnswer: userAnswerDisplay,
                correctAnswer: correctAnswer,
                isCorrect: isCorrect,
                feedback: result.feedback && result.feedback[q.id] ? result.feedback[q.id] : null
            });
        });

        return scorecard;
    }

    printScorecard(resultId) {
        const scorecard = this.generateScorecard(resultId);
        if (!scorecard) {
            alert('Could not generate scorecard.');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scorecard - ${scorecard.quizTitle}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .info { margin-bottom: 20px; }
                    .score { font-size: 2em; font-weight: bold; text-align: center; margin: 20px 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .correct { background-color: #d4edda; }
                    .incorrect { background-color: #f8d7da; }
                    .feedback { font-style: italic; color: #666; margin-top: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${scorecard.quizTitle}</h1>
                    <h2>Scorecard</h2>
                </div>
                <div class="info">
                    <p><strong>Student:</strong> ${scorecard.studentName}</p>
                    <p><strong>Date:</strong> ${scorecard.date}</p>
                    <div class="score">Score: ${scorecard.score}%</div>
                    <p>Correct: ${scorecard.correctCount} / ${scorecard.totalQuestions}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Question</th>
                            <th>Your Answer</th>
                            <th>Correct Answer</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${scorecard.questions.map(q => `
                            <tr class="${q.isCorrect ? 'correct' : 'incorrect'}">
                                <td>${q.number}</td>
                                <td>${q.text}</td>
                                <td>${q.userAnswer}</td>
                                <td>${q.correctAnswer}</td>
                                <td>${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}</td>
                            </tr>
                            ${q.feedback ? `<tr><td colspan="5" class="feedback">Feedback: ${q.feedback}</td></tr>` : ''}
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    generatePerformanceReport(studentId = null, quizId = null) {
        const results = this.storage.getAllResults();
        const users = this.storage.getUsers();
        const quizzes = this.storage.getQuizzes();

        let filteredResults = results;
        if (studentId) {
            filteredResults = filteredResults.filter(r => r.studentId === studentId);
        }
        if (quizId) {
            filteredResults = filteredResults.filter(r => r.quizId === quizId);
        }

        const report = {
            generatedAt: new Date().toISOString(),
            studentId: studentId,
            quizId: quizId,
            totalAttempts: filteredResults.length,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 100,
            scores: [],
            byQuiz: {},
            byDate: {}
        };

        if (filteredResults.length === 0) {
            return report;
        }

        const scores = filteredResults.map(r => r.score);
        report.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        report.highestScore = Math.max(...scores);
        report.lowestScore = Math.min(...scores);
        report.scores = scores;

        // Group by quiz
        filteredResults.forEach(r => {
            const quiz = quizzes.find(q => q.id === r.quizId);
            const quizTitle = quiz ? quiz.title : 'Unknown Quiz';
            if (!report.byQuiz[quizTitle]) {
                report.byQuiz[quizTitle] = { attempts: 0, totalScore: 0 };
            }
            report.byQuiz[quizTitle].attempts++;
            report.byQuiz[quizTitle].totalScore += r.score;
        });

        // Group by date
        filteredResults.forEach(r => {
            const date = new Date(r.date).toLocaleDateString();
            if (!report.byDate[date]) {
                report.byDate[date] = { attempts: 0, totalScore: 0 };
            }
            report.byDate[date].attempts++;
            report.byDate[date].totalScore += r.score;
        });

        return report;
    }

    exportPerformanceReport(studentId = null, quizId = null) {
        const report = this.generatePerformanceReport(studentId, quizId);
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance_report_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

const reporting = new ReportingManager();

