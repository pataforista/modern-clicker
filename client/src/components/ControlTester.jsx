import React, { useState, useEffect } from 'react';
import { X, Activity, User, Hash, Clock, Info, Wifi, WifiOff, Settings } from 'lucide-react';
import { useQuiz } from '../context/QuizContext';

const ControlTester = ({ socket, serialStatus, serverNote, onClose }) => {
    const [activeDevices, setActiveDevices] = useState({});
    const { participants } = useQuiz();

    useEffect(() => {
        const handleVote = (data) => {
            setActiveDevices((prev) => ({
                ...prev,
                [data.id]: {
                    key: data.key,
                    ts: Date.now(),
                    lastPing: true
                }
            }));

            // Reset ping effect after 500ms
            setTimeout(() => {
                setActiveDevices((prev) => {
                    if (!prev[data.id]) return prev;
                    return {
                        ...prev,
                        [data.id]: { ...prev[data.id], lastPing: false }
                    };
                });
            }, 500);
        };

        socket.on('vote', handleVote);
        return () => socket.off('vote', handleVote);
    }, [socket]);

    const devicesList = Object.entries(activeDevices).sort((a, b) => b[1].ts - a[1].ts);

    return (
        <div className="control-tester-overlay">
            <div className="control-tester-modal">
                <header className="tester-header">
                    <div className="tester-title">
                        <Activity className="text-blue" size={24} />
                        <div>
                            <h2>Diagnóstico de Controles</h2>
                            <p>Verifica la conexión y sincronización de los dispositivos</p>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </header>

                <div className="tester-content">
                    <div className="tester-status-bar">
                        <div className={`status-pill ${serialStatus?.connected ? 'success' : 'danger'}`}>
                            {serialStatus?.connected ? <Wifi size={16} /> : <WifiOff size={16} />}
                            <span>Hardware: {serialStatus?.connected ? 'CONECTADO' : 'DESCONECTADO'}</span>
                        </div>
                        <div className="status-pill info">
                            <Settings size={16} />
                            <span>Modo: {serialStatus?.mode?.toUpperCase() || 'DESCONOCIDO'}</span>
                        </div>
                        {serverNote && <div className="status-note">{serverNote}</div>}
                    </div>

                    <section className="instructions-section">
                        <div className="instruction-card">
                            <Info size={20} className="text-blue" />
                            <div>
                                <h4>¿Cómo sincronizar los controles?</h4>
                                <p>Para que los clickers se conecten, deben estar en el <strong>Canal 41</strong>.</p>
                                <ol>
                                    <li>Presiona el botón <strong>CH</strong> o <strong>Channel</strong> en el clicker.</li>
                                    <li>Ingresa <strong>4</strong> y luego <strong>1</strong>.</li>
                                    <li>Presiona <strong>CH</strong> o <strong>OK</strong> para confirmar.</li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    {devicesList.length === 0 ? (
                        <div className="empty-tester">
                            <div className="pulse-icon">
                                <Activity size={48} />
                            </div>
                            <h3>Esperando señales...</h3>
                            <p>Presiona cualquier botón en un clicker para verlo aquí.</p>
                        </div>
                    ) : (
                        <div className="devices-grid">
                            {devicesList.map(([id, info]) => {
                                const participant = participants[id];
                                return (
                                    <div key={id} className={`device-card ${info.lastPing ? 'ping' : ''}`}>
                                        <div className="device-id-badge">
                                            <Hash size={14} /> {id}
                                        </div>
                                        <div className="device-info">
                                            <div className="participant-name">
                                                <User size={16} />
                                                <span>{participant?.name || 'Invitado'}</span>
                                            </div>
                                            <div className="last-key">
                                                <span className="key-label">Tecla:</span>
                                                <span className="key-value">{info.key}</span>
                                            </div>
                                            <div className="last-seen">
                                                <Clock size={14} />
                                                <span>{new Date(info.ts).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <footer className="tester-footer">
                    <button className="btn btn-secondary" onClick={() => setActiveDevices({})}>
                        Limpiar lista
                    </button>
                    <div className="device-count">
                        <strong>{devicesList.length}</strong> dispositivos detectados
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ControlTester;
