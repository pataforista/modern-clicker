import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wifi, WifiOff, Play, Square, RotateCcw, Presentation } from 'lucide-react';
import { QuizProvider, useQuiz } from './context/QuizContext';
import QuizManager from './components/QuizManager';
import PresentationView from './components/PresentationView';

// Connect to the backend using Env Var or Default
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL);

// Main Content Wrapper to use Context
function Dashboard() {
    const [connected, setConnected] = useState(false);
    const [sessionStatus, setSessionStatus] = useState({ status: 'STOPPED', votes: 0 });
    const [serverNote, setServerNote] = useState('Connecting...');

    const [votes, setVotes] = useState({});
    const [recentLog, setRecentLog] = useState([]);

    const { presentationMode, setPresentationMode, currentQuestion } = useQuiz();

    useEffect(() => {
        socket.on('connect', () => {
            setConnected(true);
            setServerNote('Connected');
        });

        socket.on('disconnect', () => {
            setConnected(false);
            setServerNote('Disconnected');
        });

        socket.on('status', (data) => {
            // Data: { mode, connected, session: { status, votes }, note }
            if (data.note) setServerNote(data.note);
            if (data.session) setSessionStatus(data.session);
        });

        socket.on('vote', (data) => {
            // Data: { id, key, ts, source, isUpdate }
            setVotes(prev => ({
                ...prev,
                [data.id]: data.key // Contract uses 'key', not 'response'
            }));

            // Only log if it's new, or maybe log updates too?
            const time = new Date(data.ts).toLocaleTimeString();
            setRecentLog(prev => [`[${time}] ${data.id} -> ${data.key}`, ...prev].slice(0, 15));
        });

        socket.on('snapshot', (allVotes) => {
            const newVotes = {};
            allVotes.forEach(v => { newVotes[v.id] = v.key; });
            setVotes(newVotes);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('status');
            socket.off('vote');
            socket.off('snapshot');
        };
    }, []);

    // Control Functions
    const startSession = () => socket.emit('session/start'); // Need backend support or just POST
    // Actually the plan said POST /session/start, but let's see if we can use fetch or socket?
    // The Backend index.js has APP.POST endpoints.
    // We should use fetch.

    const sendCommand = async (endpoint) => {
        try {
            await fetch(`${SOCKET_URL}/session/${endpoint}`, { method: 'POST' });
        } catch (e) {
            console.error("Command failed", e);
        }
    };

    const data = ['A', 'B', 'C', 'D', 'E'].map(option => ({
        name: option,
        count: Object.values(votes).filter(v => v === option).length
    }));

    const totalVotes = Object.keys(votes).length;

    // Presentation Mode
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
                        <h2>{totalVotes} Votes</h2>
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
                        <span>{serverNote}</span>
                    </div>
                </div>
            </header>

            <main className="dashboard-grid">
                {/* Chart Section */}
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
                            {sessionStatus.status !== 'RUNNING' ? (
                                <button className="btn btn-primary" onClick={() => sendCommand('start')}>
                                    <Play size={18} /> Start Session
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={() => sendCommand('pause')}>
                                    <Square size={18} /> Pause Session
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={() => sendCommand('reset')}>
                                <RotateCcw size={18} /> Reset
                            </button>
                        </div>
                        <div className="polling-indicator">
                            State: <span className={sessionStatus.status === 'RUNNING' ? 'text-green' : 'text-gray'}>{sessionStatus.status}</span>
                        </div>
                    </section>

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
