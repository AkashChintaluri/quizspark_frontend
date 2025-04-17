// src/App.jsx
import './App.css';
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import Header from './components/Header';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const StudentLogin = lazy(() => import('./pages/StudentLogin'));
const TeacherLogin = lazy(() => import('./pages/TeacherLogin'));
const SignupForm = lazy(() => import('./pages/SignupForm'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));

const LoadingFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
    </div>
);

const Layout = ({ children }) => {
    const location = useLocation();
    const hideHeaderPaths = ['/student-dashboard', '/teacher-dashboard'];
    const shouldShowHeader = !hideHeaderPaths.some(path => location.pathname.startsWith(path));

    return (
        <div className="layout-container">
            {shouldShowHeader && <Header />}
            <main className="main-content">
                <Suspense fallback={<LoadingFallback />}>
                    {children}
                </Suspense>
            </main>
        </div>
    );
};

function App() {
    return (
        <ChakraProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<Layout><Home /></Layout>} />
                        <Route path="/student-login" element={<Layout><StudentLogin /></Layout>} />
                        <Route path="/teacher-login" element={<Layout><TeacherLogin /></Layout>} />
                        <Route path="/signup" element={<Layout><SignupForm /></Layout>} />

                        {/* Student Dashboard Routes */}
                        <Route path="/student-dashboard/*" element={<StudentDashboard />}>
                            <Route index element={null} />
                            <Route path="take-quiz/:quizCode" element={null} />
                            <Route path="quiz/:quizCode" element={null} />
                            <Route path="leaderboard/:quizCode?" element={null} />
                        </Route>

                        <Route path="/teacher-dashboard" element={<Layout><TeacherDashboard /></Layout>} />
                    </Routes>
                </div>
            </Router>
        </ChakraProvider>
    );
}

export default App;