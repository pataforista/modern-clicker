import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Wifi,
  WifiOff,
  Play,
  Square,
  RotateCcw,
  Presentation,
  Download,
  CloudOff,
  CheckCircle2,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { QuizProvider, useQuiz } from './context/QuizContext';
import QuizManager from './components/QuizManager';
import PresentationView from './components/PresentationView';
import ParticipantManager from './components/ParticipantManager';
import ControlTester from './components/ControlTester';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true
});

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const downloadCsv = (filename, rows) => {
  const body = rows.map((row) => row.map((value) => `"${(value ?? '').toString().replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [sessionStatus, setSessionStatus] = useState({ status: 'STOPPED', votes: 0 });
  const [serverNote, setServerNote] = useState('Conectando al servidor...');
  const [votes, setVotes] = useState({});
  const [voteLog, setVoteLog] = useState({});
  const [showTester, setShowTester] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const { presentationMode, setPresentationMode, currentQuestion, setLastVoteId, participants } = useQuiz();

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      setServerNote('Servidor conectado. Puedes iniciar una sesión.');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setServerNote('Sin conexión al servidor. Revisa cable/puerto o usa simulador.');
    });

    socket.on('status', (data) => {
      if (data.note) setServerNote(data.note);
      if (data.session) setSessionStatus(data.session);
    });

    socket.on('vote', (data) => {
      setVotes((prev) => ({
        ...prev,
        [data.id]: data.key
      }));
      setVoteLog((prev) => ({
        ...prev,
        [data.id]: {
          key: data.key,
          respondedAt: new Date().toISOString()
        }
      }));
      setLastVoteId(data.id);
    });

    socket.on('snapshot', (allVotes) => {
      const newVotes = {};
      const snapshotLog = {};
      allVotes.forEach((v) => {
        newVotes[v.id] = v.key;
        snapshotLog[v.id] = {
          key: v.key,
          respondedAt: new Date().toISOString()
        };
      });
      setVotes(newVotes);
      setVoteLog(snapshotLog);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('status');
      socket.off('vote');
      socket.off('snapshot');
    };
  }, [setLastVoteId]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const sendCommand = async (endpoint) => {
    try {
      if (endpoint === 'test') {
        setShowTester(true);
      }
      await fetch(`${SOCKET_URL}/session/${endpoint}`, { method: 'POST' });
      if (endpoint === 'reset') {
        setVotes({});
        setVoteLog({});
      }
    } catch (e) {
      console.error('Command failed', e);
      setServerNote('No se pudo enviar el comando al servidor.');
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const data = useMemo(
    () =>
      ['A', 'B', 'C', 'D', 'E'].map((option) => ({
        name: option,
        count: Object.values(votes).filter((v) => v === option).length
      })),
    [votes]
  );

  const participantRecords = useMemo(
    () => Object.entries(participants).map(([id, participant]) => ({
      id,
      name: participant?.name ?? '',
      number: participant?.number ?? '',
      answer: votes[id] ?? '',
      responded: Boolean(votes[id]),
      respondedAt: voteLog[id]?.respondedAt ?? ''
    })),
    [participants, votes, voteLog]
  );

  const responseSummary = useMemo(() => {
    const total = participantRecords.length;
    const answered = participantRecords.filter((participant) => participant.responded).length;
    const unknown = Object.keys(votes).filter((id) => !participants[id]).length;

    return {
      total,
      answered,
      missing: Math.max(total - answered, 0),
      unknown,
      rate: total > 0 ? Math.round((answered / total) * 100) : 0
    };
  }, [participantRecords, votes, participants]);

  const exportResponseCsv = () => {
    const rows = [
      ['id_control', 'nombre', 'numero', 'respondio', 'respuesta', 'fecha_hora'],
      ...participantRecords.map((participant) => [
        participant.id,
        participant.name,
        participant.number,
        participant.responded ? 'SI' : 'NO',
        participant.answer,
        participant.respondedAt
      ])
    ];

    const unknownVotes = Object.entries(votes)
      .filter(([id]) => !participants[id])
      .map(([id, answer]) => [id, 'SIN REGISTRO', '', 'SI', answer, voteLog[id]?.respondedAt ?? '']);

    downloadCsv(`respuestas_${new Date().toISOString().slice(0, 10)}.csv`, [...rows, ...unknownVotes]);
  };

  const totalVotes = Object.keys(votes).length;
  const isSessionRunning = sessionStatus.status === 'RUNNING';

  if (presentationMode) {
    return (
      <PresentationView>
        <div style={{ width: '100%', height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis stroke="#8884d8" />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={BAR_COLORS[index]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: 'center', color: 'white', marginTop: '1rem' }}>
            <h2>{totalVotes} votos recibidos</h2>
          </div>
        </div>
      </PresentationView>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <h1>PointSolutions <span className="highlight">Modern</span></h1>
          <p className="brand-subtitle">Panel simple para docentes y facilitadores</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setPresentationMode(true)}>
            <Presentation size={18} /> Proyectar
          </button>
          {deferredPrompt && (
            <button className="btn btn-secondary" onClick={installApp}>
              <Download size={18} /> Instalar app
            </button>
          )}
          <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{connected ? 'Servidor conectado' : 'Servidor desconectado'}</span>
          </div>
          <button className="btn btn-secondary" onClick={() => sendCommand('test')}>
            <Activity size={18} /> Probar Controles
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="card chart-card">
          <div className="card-header chart-header">
            <div>
              <h2>Resultados en vivo</h2>
              <div className="active-question">{currentQuestion?.text ?? 'Sin pregunta activa'}</div>
            </div>
            <div className="vote-count">{totalVotes} votos</div>
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
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="side-column">
          <section className="card quick-guide-card">
            <h2>Guía rápida (3 pasos)</h2>
            <ol>
              <li><strong>1.</strong> Presiona <strong>Iniciar sesión</strong>.</li>
              <li><strong>2.</strong> Pide a las personas que respondan en su control.</li>
              <li><strong>3.</strong> Mira los resultados en vivo y proyecta si lo necesitas.</li>
            </ol>
            <div className="status-line">
              {isOnline ? <CheckCircle2 size={16} /> : <CloudOff size={16} />}
              <span>
                {isOnline
                  ? 'Internet disponible. Puedes usar funciones web y sincronizar cambios.'
                  : 'Sin internet. La interfaz seguirá funcionando con los datos guardados localmente.'}
              </span>
            </div>
            <p className="server-note">{serverNote}</p>
          </section>

          <section className="card controls-card">
            <h2>Control de sesión</h2>
            <div className="button-group">
              {!isSessionRunning ? (
                <button className="btn btn-primary" onClick={() => sendCommand('start')}>
                  <Play size={18} /> Iniciar sesión
                </button>
              ) : (
                <button className="btn btn-danger" onClick={() => sendCommand('pause')}>
                  <Square size={18} /> Pausar sesión
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => sendCommand('reset')}>
                <RotateCcw size={18} /> Limpiar votos
              </button>
            </div>
            <div className="polling-indicator">
              Estado: <span className={isSessionRunning ? 'text-green' : 'text-gray'}>{isSessionRunning ? 'ACTIVA' : 'DETENIDA'}</span>
            </div>
          </section>

          <section className="card response-card">
            <div className="card-header">
              <h2>Registro de respuestas</h2>
              <button className="btn btn-secondary btn-sm" onClick={exportResponseCsv}>
                <FileSpreadsheet size={16} /> Exportar CSV
              </button>
            </div>
            <div className="response-stats">
              <div><strong>{responseSummary.answered}</strong> respondieron</div>
              <div><strong>{responseSummary.missing}</strong> sin responder</div>
              <div><strong>{responseSummary.rate}%</strong> cobertura</div>
              {responseSummary.unknown > 0 && <div><strong>{responseSummary.unknown}</strong> IDs sin registro</div>}
            </div>
          </section>

          <QuizManager />
          <ParticipantManager />
        </div>
      </main>

      {showTester && (
        <ControlTester
          socket={socket}
          onClose={() => {
            setShowTester(false);
            sendCommand('reset');
          }}
        />
      )}
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
