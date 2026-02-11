import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Wifi, WifiOff, Play, Square, RotateCcw, Presentation } from 'lucide-react';
import { QuizProvider, useQuiz } from './context/QuizContext';
import QuizManager from './components/QuizManager';
import PresentationView from './components/PresentationView';
import ParticipantManager from './components/ParticipantManager';

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

  const { presentationMode, setPresentationMode, currentQuestion, setLastVoteId } = useQuiz();

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

      // Track last vote ID for participant registration
      setLastVoteId(data.id);

      // Only log if it's new, or maybe log updates too?
      const time = new Date(data.ts).toLocaleTimeString();
      setRecentLog(prev => [\`[\${time}] \${data.id} -> \${data.key}\`, ...prev].slice(0, 15));
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
  const sendCommand = async (endpoint) => {
      try {
          await fetch(\`\${SOCKET_URL}/session/\${endpoint}\`, { method: 'POST' });
          if (endpoint === 'reset') {
              setVotes({});
              setRecentLog([]);
          }
      } catch (e) {
          console.error("Command failed", e);
      }
  };

  const data = ['A', 'B', 'C', 'D', 'E'].map(option => ({
    name: option,
    count: Object.values(votes).filter(v => v === option).length
  }));

  const totalVotes = Object.keys(votes).length;

  // Presentación
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
                    <Cell key={`cell - ${ index }`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: 'center', color: 'white', marginTop: '1rem' }}>
                <h2>{totalVotes} Votos Recibidos</h2>
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
             <Presentation size={18} /> Proyectar
           </button>
           <div className={`status - badge ${ connected? 'online': 'offline' }`}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{connected ? 'Conectado' : 'Desconectado'}</span>
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* Chart Section */}
        <section className="card chart-card">
          <div className="card-header">
            <div>
                <h2>Resultados en Vivo</h2>
                <div className="active-question">{currentQuestion?.text ?? 'Sin pregunta activa'}</div>
            </div>
            <div className="vote-count">{totalVotes} Votos</div>
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
                    <Cell key={`cell - ${ index }`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Sidebar */}
        <div className="side-column">
          <section className="card controls-card">
            <h2>Control de Sesión</h2>
            <div className="button-group">
              {sessionStatus.status !== 'RUNNING' ? (
                <button className="btn btn-primary" onClick={() => sendCommand('start')}>
                  <Play size={18} /> Iniciar Sesión
                </button>
              ) : (
                <button className="btn btn-danger" onClick={() => sendCommand('pause')}>
                  <Square size={18} /> Pausar Sesión
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => sendCommand('reset')}>
                <RotateCcw size={18} /> Limpiar Votos
              </button>
            </div>
            <div className="polling-indicator">
              Estado: <span className={sessionStatus.status === 'RUNNING' ? 'text-green' : 'text-gray'}>
                {sessionStatus.status === 'RUNNING' ? 'ACTIVA' : 'DETENIDA'}
              </span>
            </div>
          </section>
          
          <QuizManager />
          <ParticipantManager />

          {/* Activity Log hidden for simplicity as per plan */}
          {false && (
            <section className="card log-card">
                <h2>Registro de Actividad</h2>
                <ul className="log-list">
                {recentLog.map((log, i) => (
                    <li key={i} className="log-item">{log}</li>
                ))}
                </ul>
            </section>
          )}
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
