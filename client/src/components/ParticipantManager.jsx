import React, { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { UserPlus, UserMinus, UserCheck, Hash } from 'lucide-react';

export default function ParticipantManager() {
    const {
        participants,
        updateParticipant,
        removeParticipant,
        lastVoteId
    } = useQuiz();

    const [idInput, setIdInput] = useState('');
    const [nameInput, setNameInput] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        if (idInput.trim() && nameInput.trim()) {
            updateParticipant(idInput.trim(), nameInput.trim());
            setIdInput('');
            setNameInput('');
        }
    };

    const useLastId = () => {
        if (lastVoteId) setIdInput(lastVoteId);
    };

    const participantList = Object.entries(participants);

    return (
        <section className="card participants-card">
            <div className="card-header">
                <h2>Asignar Nombres</h2>
            </div>

            <form onSubmit={handleAdd} className="participant-form">
                <div className="input-row">
                    <div className="input-group">
                        <label>ID Control</label>
                        <div className="id-input-wrapper">
                            <input
                                value={idInput}
                                onChange={(e) => setIdInput(e.target.value)}
                                placeholder="Ej: 1001"
                            />
                            {lastVoteId && (
                                <button
                                    type="button"
                                    className="btn-mini"
                                    onClick={useLastId}
                                    title={`Usar último ID detectado: ${lastVoteId}`}
                                >
                                    <Hash size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Nombre Persona</label>
                        <input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!idInput || !nameInput}>
                    <UserPlus size={16} /> Registrar
                </button>
            </form>

            <div className="participant-list">
                {participantList.length === 0 ? (
                    <p className="empty-text">No hay nombres registrados.</p>
                ) : (
                    participantList.map(([id, name]) => (
                        <div key={id} className="participant-item">
                            <div className="p-info">
                                <span className="p-id">#{id}</span>
                                <span className="p-name">{name}</span>
                            </div>
                            <button className="icon-btn text-danger" onClick={() => removeParticipant(id)}>
                                <UserMinus size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
