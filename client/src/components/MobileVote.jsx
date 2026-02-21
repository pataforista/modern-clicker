import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, User, Fingerprint } from 'lucide-react';

const getSocketUrl = () => {
    if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;

    const { protocol, hostname, origin } = window.location;

    // If we are on a tunnel or public URL (not localhost), use the same origin
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return origin;
    }

    // Fallback for local development
    return `${protocol}//${hostname}:3001`;
};


const SOCKET_URL = getSocketUrl();

export default function MobileVote() {
    const [id, setId] = useState(() => localStorage.getItem('mobile_vote_id') || Math.random().toString(36).substr(2, 6).toUpperCase());
    const [name, setName] = useState(() => localStorage.getItem('mobile_vote_name') || '');
    const [selectedKey, setSelectedKey] = useState(null);
    const [sending, setSending] = useState(false);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState(null);
    const [queue, setQueue] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('mobile_vote_queue') || '[]');
        } catch {
            return [];
        }
    });
    const [retrying, setRetrying] = useState(false);

    useEffect(() => {
        localStorage.setItem('mobile_vote_id', id);
        localStorage.setItem('mobile_vote_name', name);
    }, [id, name]);

    useEffect(() => {
        localStorage.setItem('mobile_vote_queue', JSON.stringify(queue));
    }, [queue]);

    const flushQueue = async () => {
        if (queue.length === 0) return;
        setRetrying(true);
        setError(null);

        const pending = [...queue];
        const stillPending = [];

        for (const item of pending) {
            try {
                const resp = await fetch(`${SOCKET_URL}/vote/mobile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });

                if (!resp.ok) {
                    stillPending.push(item);
                }
            } catch {
                stillPending.push(item);
            }
        }

        setQueue(stillPending);
        if (stillPending.length > 0) {
            setError(`Se mantienen ${stillPending.length} voto(s) en cola por conectividad.`);
        }
        setRetrying(false);
    };

    useEffect(() => {
        const goOnline = () => {
            flushQueue();
        };
        window.addEventListener('online', goOnline);

        if (navigator.onLine && queue.length > 0) {
            flushQueue();
        }

        return () => window.removeEventListener('online', goOnline);
    }, [queue.length]);

    const handleVote = async (key) => {
        if (!name.trim()) {
            setError('Por favor ingresa tu nombre antes de votar');
            return;
        }

        setError(null);
        setSelectedKey(key);
        setSending(true);

        const payload = {
            id,
            key,
            name,
            voteId: `${id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        };

        try {
            const resp = await fetch(`${SOCKET_URL}/vote/mobile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                setVoted(true);
                setTimeout(() => setVoted(false), 2000);
            } else {
                const data = await resp.json();
                setError(data.error || 'Error al enviar voto');
            }

        } catch (e) {
            setQueue(prev => [payload, ...prev].slice(0, 20));
            setError('Sin conexión estable. Tu voto se guardó en cola y se enviará al reconectar.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mobile-app">
            <header className="mobile-header">
                <h1>Voto <span className="highlight">Móvil</span></h1>
                <p>Sesión en vivo (modo resiliente)</p>
            </header>

            <main className="mobile-main">
                <section className="mobile-card">
                    <div className="input-field">
                        <label><User size={16} /> Tu Nombre</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                            disabled={sending}
                        />
                    </div>
                    <div className="input-field">
                        <label><Fingerprint size={16} /> ID de Sesión</label>
                        <input value={id} readOnly className="id-display" />
                    </div>
                </section>

                {error && <div className="mobile-error">{error}</div>}

                <div className="mobile-keys-grid">
                    {['A', 'B', 'C', 'D', 'E'].map(key => (
                        <button
                            key={key}
                            className={`mobile-key-btn ${selectedKey === key ? 'active' : ''} ${voted && selectedKey === key ? 'success' : ''}`}
                            onClick={() => handleVote(key)}
                            disabled={sending}
                        >
                            <span className="key-char">{key}</span>
                            {voted && selectedKey === key ? <CheckCircle2 size={24} /> : <Send size={20} />}
                        </button>
                    ))}
                </div>

                <p className="mobile-instruction">
                    Selecciona una opción para votar. Si se cae la red, tu voto queda en cola y se reintenta automáticamente.
                </p>

                {queue.length > 0 && (
                    <div className="mobile-error">
                        Hay <strong>{queue.length}</strong> voto(s) pendientes por enviar.
                    </div>
                )}

                {retrying && <div className="mobile-instruction">Reintentando envío de votos pendientes...</div>}
            </main>
        </div>
    );
}
