import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, User, Fingerprint } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export default function MobileVote() {
    const [id, setId] = useState(() => localStorage.getItem('mobile_vote_id') || Math.random().toString(36).substr(2, 6).toUpperCase());
    const [name, setName] = useState(() => localStorage.getItem('mobile_vote_name') || '');
    const [selectedKey, setSelectedKey] = useState(null);
    const [sending, setSending] = useState(false);
    const [voted, setVoted] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        localStorage.setItem('mobile_vote_id', id);
        localStorage.setItem('mobile_vote_name', name);
    }, [id, name]);

    const handleVote = async (key) => {
        if (!name.trim()) {
            setError('Por favor ingresa tu nombre antes de votar');
            return;
        }

        setError(null);
        setSelectedKey(key);
        setSending(true);

        try {
            const resp = await fetch(`${SOCKET_URL}/vote/mobile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, key, name })
            });

            if (resp.ok) {
                setVoted(true);
                setTimeout(() => setVoted(false), 2000);
            } else {
                setError('Error al enviar voto');
            }
        } catch (e) {
            setError('Sin conexión con el servidor');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mobile-app">
            <header className="mobile-header">
                <h1>Voto <span className="highlight">Móvil</span></h1>
                <p>Sesión en vivo</p>
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
                    Selecciona una opción para votar. Tu nombre se guardará para futuros votos.
                </p>
            </main>
        </div>
    );
}
