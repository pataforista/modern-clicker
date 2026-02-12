import React, { useState, useEffect } from 'react';
import { X, Activity, User, Hash, Clock, Info, Wifi, WifiOff, Settings, AlertTriangle, CheckCircle2, RefreshCcw, Cpu } from 'lucide-react';
import { useQuiz } from '../context/QuizContext';

const ControlTester = ({ socket, serialStatus, serverNote, onClose }) => {
    const [activeDevices, setActiveDevices] = useState({});
    const [showTroubleshooting, setShowTroubleshooting] = useState(false);
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
                            <p>Estado del sistema y guía de sincronización</p>
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

                    <div className="alert-box-critical">
                        <Cpu size={20} />
                        <div>
                            <strong>¡Acción Necesaria!:</strong> He corregido el código del Arduino. Por favor, <strong>sube de nuevo el archivo `firmware/receiver.ino`</strong> a tu placa para que los controles puedan sincronizarse correctamente.
                        </div>
                    </div>

                    <div className="tester-layout">
                        <div className="tester-main">
                            {devicesList.length === 0 ? (
                                <div className="empty-tester">
                                    <div className="pulse-icon">
                                        <Activity size={48} />
                                    </div>
                                    <h3>Esperando señales...</h3>
                                    <p>Realiza la secuencia de sincronización en tus clickers.</p>
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

                        <aside className="tester-sidebar">
                            <section className="guide-section">
                                <h3><RefreshCcw size={18} /> Sincronización (Canal 41)</h3>
                                <div className="guide-steps">
                                    <div className="step">
                                        <div className="step-num">1</div>
                                        <div className="step-text">
                                            Presiona <strong>CH</strong>. El LED parpadeará <strong>Rojo/Verde</strong> (Modo edición).
                                        </div>
                                    </div>
                                    <div className="step">
                                        <div className="step-num">2</div>
                                        <div className="step-text">
                                            Ingresa <strong>4</strong> y luego <strong>1</strong>.
                                        </div>
                                    </div>
                                    <div className="step">
                                        <div className="step-num">3</div>
                                        <div className="step-text">
                                            Presiona <strong>CH</strong> otra vez. Debe parpadear <strong>Verde</strong> (Éxito).
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="led-section">
                                <h3><Info size={18} /> Diagnóstico LED</h3>
                                <ul className="led-list">
                                    <li><span className="led-dot green"></span> <strong>Verde:</strong> Conectado y listo.</li>
                                    <li><span className="led-dot double"></span> <strong>Rojo/Verde:</strong> Ingresando canal...</li>
                                    <li><span className="led-dot red"></span> <strong>Rojo:</strong> Error (Sube el firmware nuevo).</li>
                                </ul>
                            </section>

                            <button
                                className={`btn-tp ${showTroubleshooting ? 'active' : ''}`}
                                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                            >
                                <AlertTriangle size={18} /> Ayuda Técnica
                            </button>

                            {showTroubleshooting && (
                                <div className="troubleshooting-box">
                                    <ul>
                                        <li>Prueba con el canal <strong>01</strong> si el 41 falla.</li>
                                        <li>Usa un puerto USB 2.0 si el 3.0 falla.</li>
                                        <li>Mantén el clicker a 2 metros del receptor al sincronizar.</li>
                                    </ul>
                                </div>
                            )}
                        </aside>
                    </div>
                </div>

                <footer className="tester-footer">
                    <button className="btn btn-secondary" onClick={() => setActiveDevices({})}>
                        Limpiar lista
                    </button>
                    <div className="device-count">
                        <CheckCircle2 size={16} className="text-green" />
                        <strong>{devicesList.length}</strong> dispositivos detectados
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ControlTester;
