import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wifi, WifiOff, Play, Square, RotateCcw, Presentation } from 'lucide-react';
import { QuizProvider, useQuiz } from './context/QuizContext';
import QuizManager from './components/QuizManager';
import PresentationView from './components/PresentationView';

// Connect to the backend
const socket = io('http://localhost:3001');

// Main Content Wrapper to use Context
function Dashboard() {
    const [connected, setConnected] = useState(false);
    const [hardwareStatus, setHardwareStatus] = useState('Disconnected');
    const [votes, setVotes] = useState({});
    const [isPolling, setIsPolling] = useState(false);
    const [recentLog, setRecentLog] = useState([]);

    const { presentationMode, setPresentationMode, currentQuestion } = useQuiz();

    useEffect(() => {
        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
            setHardwareStatus('Server Disconnected');
        });

        socket.on('status', (data) => {
            setHardwareStatus(data.message);
        });

        socket.on('vote', (data) => {
            if (!isPolling) return;

            setVotes(prev => ({
                ...prev,
                [data.id]: data.response
            }));

            setRecentLog(prev => [`[${new Date(data.timestamp).toLocaleTimeString()}] ${data.id} voted ${data.response}`, ...prev].slice(0, 10));
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('status');
            socket.off('vote');
        };
    }, [isPolling]);

    const data = ['A', 'B', 'C', 'D', 'E'].map(option => ({
        name: option,
        count: Object.values(votes).filter(v => v === option).length
    }));

    const totalVotes = Object.keys(votes).length;

    const handleReset = () => {
        setVotes({});
        setRecentLog([]);
    };

    // If in Presentation Mode, show the Overlay
    if (presentationMode) {
        return (
            <PresentationView>
                <div style={{ width: '100%', height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis dataKey="name" stroke="#8884d8" />
                            <YAxis stroke="#8884d8" />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', color: 'white', marginTop: '1rem' }}>
                        <h2>{totalVotes} Votes Received</h2>
                    </div>
                </div>
            </PresentationView>
        );
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="brand">
                    <div className="logo-icon"></div>
                    <h1>PointSolutions <span className="highlight">Modern</span></h1>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setPresentationMode(true)}>
                        <Presentation size={18} /> Present
                    </button>
                    <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
                        {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                        <span>{hardwareStatus}</span>
                    </div>
                </div>
            </header>

            <main className="dashboard-grid">
                {/* Main Chart Area */}
                <section className="card chart-card">
                    <div className="card-header">
                        <h2>Live Results</h2>
                        <div className="vote-count">{totalVotes} Votes</div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis dataKey="name" stroke="#8884d8" />
                                <YAxis stroke="#8884d8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Sidebar */}
                <div className="side-column">
                    <section className="card controls-card">
                        <h2>Session Control</h2>
                        <div className="button-group">
                            {!isPolling ? (
                                <button className="btn btn-primary" onClick={() => setIsPolling(true)}>
                                    <Play size={18} /> Start Polling
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={() => setIsPolling(false)}>
                                    <Square size={18} /> Stop Polling
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={handleReset}>
                                <RotateCcw size={18} /> Reset Votes
                            </button>
                        </div>
                        <div className="polling-indicator">
                            Status: <span className={isPolling ? 'text-green' : 'text-gray'}>{isPolling ? 'LISTENING' : 'PAUSED'}</span>
                        </div>
                    </section>

                    {/* New Quiz Manager */}
                    <QuizManager />

                    <section className="card log-card">
                        <h2>Activity Log</h2>
                        <ul className="log-list">
                            {recentLog.map((log, i) => (
                                <li key={i} className="log-item">{log}</li>
                            ))}
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <QuizProvider>
            <Dashboard />
        </QuizProvider>
    );
}

export default App;
