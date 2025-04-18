import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../utils/axiosConfig';
import './TeacherDashboard.css';
import './MakeQuizzes.css';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function TeacherDashboard() {
    const [activeTab, setActiveTab] = useState('home');
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const source = axiosInstance.CancelToken.source();
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
        } else {
            setCurrentUser(JSON.parse(storedUser));
        }

        if (location.state?.quizCode) {
            setActiveTab('results');
        }

        return () => {
            source.cancel('Component unmounted');
        };
    }, [navigate, location]);

    return (
        <div className="teacher-dashboard">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} />
            <Content activeTab={activeTab} currentUser={currentUser} setActiveTab={setActiveTab} location={location} />
        </div>
    );
}

function Sidebar({ activeTab, setActiveTab, currentUser }) {
    const [notificationsCount, setNotificationsCount] = useState(0);

    useEffect(() => {
        if (!currentUser?.id) return;

        const source = axiosInstance.CancelToken.source();
        const fetchNotificationsCount = async () => {
            try {
                const response = await axiosInstance.get(
                    `/api/retest-requests/teacher/${currentUser.id}`,
                    { cancelToken: source.token }
                );
                const unreadCount = response.data.filter(r => r.status === 'pending').length;
                setNotificationsCount(unreadCount);
            } catch (error) {
                if (!axiosInstance.isCancel(error)) {
                    console.error('Error fetching notifications count:', error);
                }
            }
        };

        fetchNotificationsCount();
        return () => {
            source.cancel('Sidebar cleanup');
        };
    }, [currentUser]);

    return (
        <div className="sidebar">
            <h2>Teacher Dashboard</h2>
            {currentUser && (
                <div className="welcome-box">
                    <p>Welcome, {currentUser.username}!</p>
                </div>
            )}

            <nav>
                <ul>
                    {['Home', 'Make Quizzes', 'Results', 'Notifications', 'Settings'].map((tab) => (
                        <li key={tab}>
                            <button
                                className={activeTab === tab.toLowerCase() ? 'active' : ''}
                                onClick={() => setActiveTab(tab.toLowerCase())}
                            >
                                {tab}
                                {tab === 'Notifications' && notificationsCount > 0 && (
                                    <span className="notification-badge">{notificationsCount}</span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

function Content({ activeTab, currentUser, setActiveTab, location }) {
    const { pathname } = location;

    switch (activeTab) {
        case 'home':
            return <HomeContent currentUser={currentUser} setActiveTab={setActiveTab} />;
        case 'make quizzes':
            return <MakeQuizzesContent currentUser={currentUser} />;
        case 'results':
            return <ResultsContent currentUser={currentUser} />;
        case 'notifications':
            return <NotificationsContent currentUser={currentUser} />;
        case 'settings':
            return <SettingsContent currentUser={currentUser} />;
        default:
            return <HomeContent currentUser={currentUser} setActiveTab={setActiveTab} />;
    }
}

function HomeContent({ currentUser, setActiveTab }) {
    const [quizzes, setQuizzes] = useState([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notificationsCount, setNotificationsCount] = useState(0);

    useEffect(() => {
        if (!currentUser?.id) return;

        const source = axiosInstance.CancelToken.source();
        const fetchCreatedQuizzes = async () => {
            setLoading(true);
            setError('');
            try {
                const [quizzesResponse, notificationsResponse] = await Promise.all([
                    axiosInstance.get(`/api/quizzes/created/${currentUser.id}`, {
                        cancelToken: source.token
                    }),
                    axiosInstance.get(`/api/retest-requests/teacher/${currentUser.id}`, {
                        cancelToken: source.token
                    })
                ]);

                setQuizzes(quizzesResponse.data);
                setFilteredQuizzes(quizzesResponse.data);
                const unreadCount = notificationsResponse.data.filter(r => r.status === 'pending').length;
                setNotificationsCount(unreadCount);
            } catch (err) {
                if (!axiosInstance.isCancel(err)) {
                    console.error('Error fetching data:', err);
                    setError('Failed to load your quizzes or notifications. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchCreatedQuizzes();
        return () => {
            source.cancel('HomeContent cleanup');
        };
    }, [currentUser]);

    useEffect(() => {
        const filtered = quizzes.filter(quiz =>
            quiz.quiz_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredQuizzes(filtered);
    }, [searchTerm, quizzes]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleCreateQuiz = () => {
        setActiveTab('make quizzes');
    };

    const handleViewDetails = (quiz) => {
        setActiveTab('results');
        // You might want to pass the quiz data to the ResultsContent component
    };

    if (loading) {
        return <div className="content">Loading...</div>;
    }

    if (error) {
        return <div className="content error">{error}</div>;
    }

    return (
        <div className="content">
            <div className="header">
                <h2>Your Quizzes</h2>
                <div className="actions">
                    <input
                        type="text"
                        placeholder="Search quizzes..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    <button onClick={handleCreateQuiz}>Create New Quiz</button>
                </div>
            </div>

            <div className="quizzes-grid">
                {filteredQuizzes.map((quiz) => (
                    <div key={quiz.quiz_id} className="quiz-card">
                        <h3>{quiz.quiz_name}</h3>
                        <p>Code: {quiz.quiz_code}</p>
                        <p>Due Date: {new Date(quiz.due_date).toLocaleString()}</p>
                        <button onClick={() => handleViewDetails(quiz)}>View Results</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MakeQuizzesContent({ currentUser }) {
    const [quizName, setQuizName] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctOptions, setCorrectOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [quizCode, setQuizCode] = useState('');

    const handleAddQuestion = () => {
        if (currentQuestion && options.every((option) => option.trim() !== '') && correctOptions.length > 0) {
            const newQuestion = {
                question_text: currentQuestion,
                options: options.map((option, index) => ({
                    text: option,
                    is_correct: correctOptions.includes(index),
                })),
            };
            setQuestions([...questions, newQuestion]);
            resetForm();
        } else {
            alert('Please fill in all fields and select at least one correct option before adding the question.');
        }
    };

    const resetForm = () => {
        setCurrentQuestion('');
        setOptions(['', '', '', '']);
        setCorrectOptions([]);
    };

    const handleSubmitQuiz = async () => {
        if (!quizName.trim()) {
            alert('Please enter a name for the quiz.');
            return;
        }
        if (!dueDate) {
            alert('Please set a due date for the quiz.');
            return;
        }
        if (questions.length === 0) {
            alert('Please add at least one question to the quiz.');
            return;
        }
        if (!currentUser) {
            alert('You must be logged in to create a quiz.');
            return;
        }

        setIsLoading(true);
        const generatedCode = generateQuizCode();
        setQuizCode(generatedCode);
        const source = axiosInstance.CancelToken.source();

        const quizData = {
            quiz_name: quizName,
            quiz_code: generatedCode,
            created_by: currentUser.id,
            questions: { questions },
            due_date: dueDate,
        };

        try {
            const response = await axiosInstance.post('/api/quizzes', quizData, {
                headers: {
                    'Content-Type': 'application/json',
                },
                cancelToken: source.token
            });

            alert(`Quiz created successfully! Quiz Code: ${generatedCode}`);
            setQuizName('');
            setDueDate('');
            setQuestions([]);
            resetForm();
        } catch (error) {
            if (!axiosInstance.isCancel(error)) {
                console.error('Error submitting quiz:', error);
                alert(error.response?.data?.message || 'An error occurred while creating the quiz.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="content make-quizzes">
            <h2>Make Quizzes</h2>

            <div className="quiz-details-section">
                <input
                    type="text"
                    value={quizName}
                    onChange={(e) => setQuizName(e.target.value)}
                    placeholder="Enter Quiz Name"
                    className="quiz-name-input"
                    disabled={isLoading}
                />
                <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="due-date-input"
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={isLoading}
                />
            </div>

            <div className="question-form">
                <input
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="Enter your question"
                    className="question-input"
                    disabled={isLoading}
                />
                <div className="options-section">
                    {options.map((option, index) => (
                        <div key={index} className="option-input">
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                disabled={isLoading}
                            />
                            <label>
                                <input
                                    type="checkbox"
                                    checked={correctOptions.includes(index)}
                                    onChange={() => handleCorrectOptionToggle(index)}
                                    disabled={isLoading}
                                />
                                Correct
                            </label>
                        </div>
                    ))}
                </div>
                <button onClick={handleAddQuestion} className="add-question-btn" disabled={isLoading}>
                    {isLoading ? 'Adding...' : 'Add Question'}
                </button>
            </div>

            <div className="questions-list">
                <h3>Added Questions:</h3>
                <ul>
                    {questions.map((q, index) => (
                        <li key={index}>{q.question_text}</li>
                    ))}
                </ul>
            </div>

            {questions.length > 0 && (
                <button onClick={handleSubmitQuiz} className="submit-quiz-btn" disabled={isLoading}>
                    {isLoading ? 'Submitting...' : 'Done - Submit Quiz'}
                </button>
            )}

            {quizCode && (
                <div className="quiz-code-section">
                    <p><strong>Quiz Code:</strong> {quizCode}</p>
                </div>
            )}
        </div>
    );
}

function ResultsContent({ currentUser }) {
    const [quizCode, setQuizCode] = useState('');
    const [attempts, setAttempts] = useState([]);
    const [filteredAttempts, setFilteredAttempts] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [quizName, setQuizName] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });

    useEffect(() => {
        if (quizCode) {
            fetchResults(quizCode);
        }
    }, [quizCode]);

    const fetchResults = async (code) => {
        setLoading(true);
        setError('');
        setAttempts([]);
        setFilteredAttempts([]);
        setQuizName('');
        const source = axiosInstance.CancelToken.source();

        try {
            const response = await axiosInstance.get(`/api/quiz-attempts/${code}`, {
                cancelToken: source.token
            });

            setAttempts(response.data);
            setFilteredAttempts(response.data);
            setQuizName(response.data[0]?.quiz_name || 'Quiz Results');
        } catch (err) {
            if (!axiosInstance.isCancel(err)) {
                console.error('Error fetching quiz attempts:', err);
                setError(err.response?.data?.message || 'An error occurred while fetching results');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleQuizCodeSubmit = async (e) => {
        e.preventDefault();
        if (!quizCode.trim()) {
            setError('Please enter a quiz code');
            return;
        }
        fetchResults(quizCode);
    };

    const handleSort = (key) => {
        const direction = sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
        setSortConfig({ key, direction });

        const sortedAttempts = [...filteredAttempts].sort((a, b) => {
            if (key === 'student_username') {
                return direction === 'asc'
                    ? a[key].localeCompare(b[key])
                    : b[key].localeCompare(a[key]);
            } else if (key === 'attempt_date') {
                const dateA = new Date(a[key]);
                const dateB = new Date(b[key]);
                return direction === 'asc'
                    ? dateA - dateB
                    : dateB - dateA;
            }
            return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
        });
        setFilteredAttempts(sortedAttempts);
    };

    const exportToCSV = () => {
        const headers = ['Student,Quiz Name,Score,Total Questions,Correct Answers,Attempt Date,Time Taken (s),Quiz Code,Student ID,Attempt ID'];
        const rows = filteredAttempts.map(a =>
            `${a.student_username},${quizName},${a.score},${a.total_questions},${a.correct_answers || 'N/A'},${new Date(a.attempt_date).toLocaleString()},${a.time_taken || 'N/A'},${a.quiz_code},${a.student_id},${a.attempt_id}`
        );
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${quizName}_results.csv`;
        link.click();
    };

    const chartData = {
        labels: filteredAttempts.map((attempt) => attempt.student_username.slice(0, 3).toUpperCase()),
        datasets: [
            {
                label: 'Score',
                data: filteredAttempts.map((attempt) => attempt.score),
                backgroundColor: 'rgba(79, 70, 229, 0.85)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: { label: (context) => `${context.raw}/${filteredAttempts[0]?.total_questions}` },
            },
        },
    };

    const totalAttempts = filteredAttempts.length;
    const avgScore = filteredAttempts.length > 0
        ? (filteredAttempts.reduce((sum, a) => sum + a.score, 0) / (filteredAttempts.length * filteredAttempts[0].total_questions) * 100).toFixed(0)
        : 0;
    const topScore = filteredAttempts.length > 0 ? Math.max(...filteredAttempts.map(a => a.score)) : 0;

    return (
        <div className="content results-content-alt">
            <div className="results-container-alt">
                <div className="results-header-card-alt">
                    <h2 className="results-title-alt">{quizName || 'Quiz Results'}</h2>
                    <form onSubmit={handleQuizCodeSubmit} className="results-form-alt">
                        <div className="quiz-code-wrapper-alt">
                            <input
                                type="text"
                                placeholder="Enter Quiz Code"
                                value={quizCode}
                                onChange={(e) => setQuizCode(e.target.value)}
                                className="quiz-code-input-alt"
                                disabled={loading}
                            />
                            {quizCode && <span className="quiz-code-display-alt">{quizCode}</span>}
                        </div>
                        <button type="submit" className="fetch-btn-alt" disabled={loading}>
                            <i>🔍</i> {loading ? 'Fetching...' : 'Fetch'}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="alert-card">
                        <span className="alert-icon error">⚠️</span>
                        <div className="alert-content">
                            <h3 className="alert-title">Error</h3>
                            <p className="alert-message">{error}</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="alert-card">
                        <span className="alert-icon loading">⟳</span>
                        <div className="alert-content">
                            <h3 className="alert-title">Loading</h3>
                            <p className="alert-message">Fetching quiz results...</p>
                        </div>
                    </div>
                )}

                {!loading && !error && filteredAttempts.length === 0 && quizCode && (
                    <div className="empty-state">
                        <span className="empty-icon">📊</span>
                        <h3 className="empty-title">No Results Found</h3>
                        <p className="empty-message">No attempts found for quiz code "{quizCode}". Verify the code or try another.</p>
                    </div>
                )}

                {!loading && !error && filteredAttempts.length > 0 && (
                    <div className="results-body-alt">
                        <div className="stats-card-alt">
                            <h3 className="stats-title-alt">Performance Overview</h3>
                            <div className="stats-grid-alt">
                                <div className="stat-item-alt">
                                    <span className="stat-icon-alt"><i>👥</i></span>
                                    <div className="stat-details-alt">
                                        <span className="stat-value-alt">{totalAttempts}</span>
                                        <span className="stat-label-alt">Attempts</span>
                                    </div>
                                </div>
                                <div className="stat-item-alt">
                                    <span className="stat-icon-alt"><i>📈</i></span>
                                    <div className="stat-details-alt">
                                        <span className="stat-value-alt">{avgScore}%</span>
                                        <span className="stat-label-alt">Average</span>
                                    </div>
                                </div>
                                <div className="stat-item-alt">
                                    <span className="stat-icon-alt"><i>🏆</i></span>
                                    <div className="stat-details-alt">
                                        <span className="stat-value-alt">{topScore}</span>
                                        <span className="stat-label-alt">Top Score</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="chart-card-alt">
                            <div className="chart-header-alt">
                                <h3 className="chart-title-alt">Score Distribution</h3>
                            </div>
                            <div className="chart-body-alt">
                                <Bar data={chartData} options={chartOptions} />
                            </div>
                        </div>

                        <div className="attempts-card-alt">
                            <div className="attempts-header-alt">
                                <h3 className="attempts-title-alt">Student Results</h3>
                                <button className="export-btn-alt" onClick={exportToCSV}>
                                    <i>📥</i> Export
                                </button>
                            </div>
                            <div className="attempts-table-alt">
                                <div className="table-header-alt">
                                    <div 
                                        className={`table-cell-alt ${sortConfig.key === 'student_username' ? `active ${sortConfig.direction}-sort` : ''}`}
                                        onClick={() => handleSort('student_username')}
                                    >
                                        Student
                                    </div>
                                    <div 
                                        className={`table-cell-alt ${sortConfig.key === 'score' ? `active ${sortConfig.direction}-sort` : ''}`}
                                        onClick={() => handleSort('score')}
                                    >
                                        Score
                                    </div>
                                    <div 
                                        className={`table-cell-alt ${sortConfig.key === 'attempt_date' ? `active ${sortConfig.direction}-sort` : ''}`}
                                        onClick={() => handleSort('attempt_date')}
                                    >
                                        Attempt Date
                                    </div>
                                </div>
                                <div className="table-body-alt">
                                    {filteredAttempts.map((attempt) => (
                                        <div key={attempt.attempt_id} className="table-row-alt">
                                            <div className="table-cell-alt">
                                                <div className="student-info-alt">
                                                    <span className="student-avatar-alt">
                                                        {attempt.student_username.slice(0, 2).toUpperCase()}
                                                    </span>
                                                    <span className="student-name-alt">{attempt.student_username}</span>
                                                </div>
                                            </div>
                                            <div className="table-cell-alt">
                                                <span className={`score-badge-alt ${attempt.score >= attempt.total_questions * 0.9 ? 'excellent' : attempt.score >= attempt.total_questions * 0.7 ? 'good' : attempt.score >= attempt.total_questions * 0.5 ? 'average' : 'poor'}`}>
                                                    {attempt.score}/{attempt.total_questions}
                                                </span>
                                            </div>
                                            <div className="table-cell-alt">{new Date(attempt.attempt_date).toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationsContent({ currentUser }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [teacherPassword, setTeacherPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!currentUser?.id) return;

        const source = axiosInstance.CancelToken.source();
        const fetchNotifications = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axiosInstance.get(
                    `/api/retest-requests/teacher/${currentUser.id}`,
                    { cancelToken: source.token }
                );
                setNotifications(response.data);
            } catch (error) {
                if (!axiosInstance.isCancel(error)) {
                    console.error('Error fetching notifications:', error);
                    setError(error.response?.data?.message || 'Failed to load notifications. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
        return () => {
            source.cancel('Notifications cleanup');
        };
    }, [currentUser]);

    const handleRetestAction = async (requestId, status) => {
        if (!teacherPassword) {
            setError('Please enter your password to approve or decline a request.');
            return;
        }

        const source = axiosInstance.CancelToken.source();
        try {
            const response = await axiosInstance.put(
                `/api/retest-requests/${requestId}`,
                {
                    status,
                    teacher_password: teacherPassword,
                },
                { cancelToken: source.token }
            );

            setNotifications(prevNotifications =>
                prevNotifications.map(notif => 
                    notif.request_id === requestId ? { ...notif, status } : notif
                ).filter(n => n.status === 'pending')
            );
            setMessage(`Retest request ${status} successfully!`);
            setTeacherPassword('');
            setError('');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            if (!axiosInstance.isCancel(error)) {
                console.error('Error updating retest request:', error);
                setError(error.response?.data?.error || 'Failed to update request. Check your password.');
            }
        }
    };

    const pendingCount = notifications.filter(n => n.status === 'pending').length;

    return (
        <div className="content">
            {loading && (
                <div className="alert-card loading">
                    <span className="alert-icon loading">⟳</span>
                    <div className="alert-content">
                        <h3 className="alert-title">Loading</h3>
                        <p className="alert-message">Fetching your notifications...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert-card error">
                    <span className="alert-icon error">⚠️</span>
                    <div className="alert-content">
                        <h3 className="alert-title">Error</h3>
                        <p className="alert-message">{error}</p>
                    </div>
                </div>
            )}

            {message && (
                <div className="message success">{message}</div>
            )}

            {!loading && !error && notifications.length === 0 && (
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <h3 className="empty-title">No Notifications</h3>
                    <p className="empty-message">There are no pending retest requests at the moment.</p>
                </div>
            )}

            {!loading && !error && notifications.length > 0 && (
                <div className="notifications-list">
                    {notifications.filter(n => n.status === 'pending').map((notification) => (
                        <div key={notification.request_id} className="notification-item">
                            <div className="notification-content">
                                <div className="notification-header">
                                    <h3 className="notification-title">{notification.quiz_name}</h3>
                                    <span className="notification-time">
                                        {new Date(notification.request_date).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="notification-details">
                                    <div className="student-info">
                                        <span className="student-avatar">
                                            {notification.student_name.slice(0, 2).toUpperCase()}
                                        </span>
                                        <span className="student-name">{notification.student_name}</span>
                                    </div>
                                    <div className="quiz-code-badge">
                                        Quiz Code: {notification.quiz_code}
                                    </div>
                                </div>
                                <div className="notification-actions">
                                    <input
                                        type="password"
                                        placeholder="Enter your password"
                                        value={teacherPassword}
                                        onChange={(e) => setTeacherPassword(e.target.value)}
                                        className="password-input"
                                    />
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => handleRetestAction(notification.request_id, 'approved')}
                                            className="approve-btn"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => handleRetestAction(notification.request_id, 'declined')}
                                            className="decline-btn"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SettingsContent({ currentUser }) {
    const navigate = useNavigate();
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showProfileFields, setShowProfileFields] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
    });
    const [profileData, setProfileData] = useState({
        email: currentUser?.email || '',
        name: currentUser?.name || ''
    });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeCard, setActiveCard] = useState(null);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const handlePasswordChange = async () => {
        setIsLoading(true);
        setMessage('');
        const source = axios.CancelToken.source();

        try {
            const response = await axios.post(`${API_URL}/change-password`, {
                ...formData,
                username: currentUser.username,
                userType: 'teacher',
            }, { cancelToken: source.token });

            setMessage('Password changed successfully');
            setFormData({
                currentPassword: '',
                newPassword: '',
            });
            setShowPasswordFields(false);
            setActiveCard(null);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Error changing password:', error);
                setMessage(error.response?.data?.message || 'An error occurred while changing the password');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        setIsLoading(true);
        setMessage('');
        const source = axios.CancelToken.source();

        try {
            const response = await axios.put(`${API_URL}/api/teachers/${currentUser.id}`, {
                email: profileData.email,
                name: profileData.name
            }, { cancelToken: source.token });

            setMessage('Profile updated successfully');
            const updatedUser = { ...currentUser, ...profileData, username: profileData.name };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setShowProfileFields(false);
            setActiveCard(null);
        } catch (error) {
            if (!axios.isCancel(error)) {
                console.error('Error updating profile:', error);
                setMessage(error.response?.data?.message || 'An error occurred while updating the profile');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleProfileInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const settingsCards = [
        {
            id: 'profile',
            title: 'Profile Settings',
            icon: '👤',
            description: 'View and update your profile information',
            color: '#4f46e5'
        },
        {
            id: 'password',
            title: 'Security',
            icon: '🔒',
            description: 'Change your password and security settings',
            color: '#7c3aed'
        },
        {
            id: 'logout',
            title: 'Logout',
            icon: '🚪',
            description: 'Sign out of your account',
            color: '#dc2626'
        }
    ];

    return (
        <div className="content">
            <div className="settings-container">
                <div className="settings-header">
                    <h2>Settings & Preferences</h2>
                </div>
                
                <div className="settings-grid">
                    {settingsCards.map((card) => (
                        <div 
                            key={card.id}
                            className={`settings-card ${activeCard === card.id ? 'active' : ''}`}
                            style={{'--card-color': card.color}}
                            onClick={() => {
                                if (card.id === 'logout') {
                                    handleLogout();
                                } else {
                                    setActiveCard(activeCard === card.id ? null : card.id);
                                    if (card.id === 'password') {
                                        setShowPasswordFields(!showPasswordFields);
                                        setShowProfileFields(false);
                                    } else if (card.id === 'profile') {
                                        setShowProfileFields(!showProfileFields);
                                        setShowPasswordFields(false);
                                    }
                                }
                            }}
                        >
                            <div className="card-icon">{card.icon}</div>
                            <div className="card-content">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            {card.id !== 'logout' && (
                                <div className="card-arrow">→</div>
                            )}
                        </div>
                    ))}
                </div>

                {showProfileFields && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Profile Settings</h3>
                            <button className="close-panel" onClick={() => {
                                setShowProfileFields(false);
                                setActiveCard(null);
                            }}>×</button>
                        </div>
                        <div className="panel-content">
                            <div className="input-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter your name"
                                    value={profileData.name}
                                    onChange={handleProfileInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    value={profileData.email}
                                    onChange={handleProfileInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                className="update-profile-btn"
                                onClick={handleProfileUpdate}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating...' : 'Update Profile'}
                            </button>
                            {message && <div className="settings-message">{message}</div>}
                        </div>
                    </div>
                )}

                {showPasswordFields && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Change Password</h3>
                            <button className="close-panel" onClick={() => {
                                setShowPasswordFields(false);
                                setActiveCard(null);
                            }}>×</button>
                        </div>
                        <div className="panel-content">
                            <div className="input-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    placeholder="Enter your current password"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="input-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter your new password"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                className="update-password-btn"
                                onClick={handlePasswordChange}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                            {message && <div className="settings-message">{message}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TeacherDashboard;