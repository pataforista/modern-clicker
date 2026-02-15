import React, { useState, useEffect } from 'react';
import { X, Activity, User, Hash, Clock, Info, Wifi, WifiOff, Settings, AlertTriangle, CheckCircle2, RefreshCcw, Cpu } from 'lucide-react';
import { useQuiz } from '../context/QuizContext';

const ControlTester = ({ socket, serialStatus, serverNote, onClose }) => {
    const [activeDevices, setActiveDevices] = useState({});
    const [showTroubleshooting, setShowTroubleshooting] = useState(false);
    const [showAssemblyGuide, setShowAssemblyGuide] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanData, setScanData] = useState([]);
    const [scanRecommended, setScanRecommended] = useState(null);
    const [currentChannel, setCurrentChannel] = useState(41);
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

        const handleScanResults = (data) => {
            setScanData(Array.isArray(data?.noise) ? data.noise : []);
            setScanRecommended(Number.isInteger(data?.recommended) ? data.recommended : null);
            setScanning(false);
        };

        socket.on('vote', handleVote);
        socket.on('scan_results', handleScanResults);
        return () => {
            socket.off('vote', handleVote);
            socket.off('scan_results', handleScanResults);
        };
    }, [socket]);

    const runScan = () => {
        setScanning(true);
        setScanData([]);
        setScanRecommended(null);
        fetch(`${socket.io.uri}/hw/scan`, { method: 'POST' });
    };

    const changeChannel = (ch) => {
        setCurrentChannel(ch);
        fetch(`${socket.io.uri}/hw/channel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: ch })
        });
    };

    const applyRecommendedChannel = () => {
        if (scanRecommended == null) return;
        changeChannel(scanRecommended);
    };

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
                            <span>Receptor: {serialStatus?.connected ? 'DETECTADO' : 'NO ENCONTRADO'}</span>
                        </div>
                        <div className="status-pill info">
                            <Settings size={16} />
                            <span>Tipo: {serialStatus?.mode === 'official' ? 'Original USB' : serialStatus?.mode?.toUpperCase()}</span>
                        </div>
                        {serverNote && <div className="status-note">{serverNote}</div>}
                        <div className="flex-grow"></div>
                        <a
                            href="/guia_rapida.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-xs"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Info size={14} /> 📄 Ver Manual de Ayuda
                        </a>
                    </div>

                    <div className="setup-tabs">
                        <button
                            className={`tab-btn ${!showAssemblyGuide ? 'active' : ''}`}
                            onClick={() => setShowAssemblyGuide(false)}
                        >
                            Diagnóstico en Vivo
                        </button>
                        <button
                            className={`tab-btn ${showAssemblyGuide ? 'active' : ''}`}
                            onClick={() => setShowAssemblyGuide(true)}
                        >
                            Guía de Instalación
                        </button>
                    </div>

                    {showAssemblyGuide ? (
                        <div className="assembly-guide">
                            <section className="guide-card">
                                <h3><Wifi size={18} /> Opción A: Receptor Original (Recomendado)</h3>
                                <div className="guide-step-item">
                                    <div className="g-num">1</div>
                                    <p>Conecta el receptor USB blanco/negro de TurningPoint a tu computadora.</p>
                                </div>
                                <div className="guide-step-item">
                                    <div className="g-num">2</div>
                                    <p>El sistema debería decir "DETECTADO" arriba en pocos segundos. No requiere drivers adicionales.</p>
                                </div>
                            </section>

                            <section className="guide-card">
                                <h3><Cpu size={18} /> Opción B: Receptor Arduino (Casero)</h3>
                                <p className="text-sm opacity-70 mb-2">Usa esto solo si no tienes el receptor original.</p>
                                <div className="arduino-map">
                                    <table className="pin-table">
                                        <thead>
                                            <tr><th>Pin Radio</th><th>Pin Arduino</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr><td>GND</td><td>GND</td></tr>
                                            <tr><td>VCC</td><td><strong className="text-red">3.3V</strong></td></tr>
                                            <tr><td>CE</td><td>9</td></tr>
                                            <tr><td>CSN</td><td>10</td></tr>
                                            <tr><td>SCK</td><td>13</td></tr>
                                            <tr><td>MOSI</td><td>11</td></tr>
                                            <tr><td>MISO</td><td>12</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        </div>
                    ) : (
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
                                                <div key={id} className={`device-card ${info.lastPing ? 'ping' : ''} ${participant ? 'is-linked' : 'is-guest'}`}>
                                                    <div className="device-id-badge">
                                                        <Hash size={14} /> {id}
                                                    </div>
                                                    <div className="device-info">
                                                        <div className="participant-name">
                                                            {participant ? <CheckCircle2 size={16} className="text-green" /> : <User size={16} />}
                                                            <span>{participant?.name || 'Invitado (Sin nombre)'}</span>
                                                        </div>

                                                        <div className="status-indicators">
                                                            <div className="last-key-badge">
                                                                <span className="key-value">{info.key}</span>
                                                            </div>
                                                            <div className="ack-status">
                                                                <div className="signal-bars">
                                                                    <div className="bar active"></div>
                                                                    <div className="bar active"></div>
                                                                    <div className="bar active"></div>
                                                                </div>
                                                                <span>Confirmado</span>
                                                            </div>
                                                        </div>

                                                        {!participant && (
                                                            <button
                                                                className="btn btn-primary btn-xs w-full mt-2"
                                                                onClick={() => {
                                                                    onClose();
                                                                    window.dispatchEvent(new CustomEvent('focus-registration', { detail: { id } }));
                                                                }}
                                                            >
                                                                Asignar a una persona
                                                            </button>
                                                        )}

                                                        <div className="last-seen">
                                                            <Clock size={12} />
                                                            <span>Recibido a las {new Date(info.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
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
                                    <h3><RefreshCcw size={18} /> Sincronización (Canal {currentChannel})</h3>
                                    <div className="channel-selector">
                                        <label>Cambiar Canal Base:</label>
                                        <div className="channel-btns">
                                            {[41, 1, 10, 80].map(ch => (
                                                <button
                                                    key={ch}
                                                    className={`ch-btn ${currentChannel === ch ? 'active' : ''}`}
                                                    onClick={() => changeChannel(ch)}
                                                >
                                                    {ch.toString().padStart(2, '0')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="guide-steps">
                                        <div className="step">
                                            <div className="step-num">1</div>
                                            <div className="step-text">
                                                Presiona <strong>CH</strong>. El LED parpadeará <strong>Rojo/Verde</strong>.
                                            </div>
                                        </div>
                                        <div className="step">
                                            <div className="step-num">2</div>
                                            <div className="step-text">
                                                Ingresa <strong>{currentChannel.toString().split('').join(' y ')}</strong>.
                                            </div>
                                        </div>
                                        <div className="step">
                                            <div className="step-num">3</div>
                                            <div className="step-text">
                                                Presiona <strong>CH</strong> otra vez. Debe parpadear <strong>Verde</strong>.
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="scan-section">
                                    <h3><Cpu size={18} /> Escáner de Frecuencia</h3>
                                    <div className="scan-container">
                                        {scanning ? (
                                            <div className="scanning-loader">
                                                <div className="spinner"></div>
                                                <span>Escaneando ambiente...</span>
                                            </div>
                                        ) : scanData.length > 0 ? (
                                            <div className="scan-results">
                                                <div className="mini-chart">
                                                    {scanData.map((v, i) => (
                                                        <div
                                                            key={i}
                                                            className="chart-bar"
                                                            style={{ height: `${(v / 10) * 100}%`, background: v > 5 ? 'var(--danger-color)' : 'var(--success-color)' }}
                                                            title={`Ch ${i}: ${v}/10 interferencia`}
                                                        ></div>
                                                    ))}
                                                </div>
                                                <p className="scan-note">Las barras rojas indican interferencia WiFi.</p>
                                                {scanRecommended != null && (
                                                    <div className="scan-recommendation">
                                                        <span>Canal recomendado: <strong>{scanRecommended.toString().padStart(2, '0')}</strong></span>
                                                        <button className="btn btn-primary btn-xs" onClick={applyRecommendedChannel}>
                                                            Aplicar canal recomendado
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <button className="btn btn-secondary btn-sm w-full" onClick={runScan}>
                                                <Activity size={14} /> Iniciar análisis de señal
                                            </button>
                                        )}
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
                    )}
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
