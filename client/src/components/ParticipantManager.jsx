import React, { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { UserPlus, UserMinus, UserCheck, Hash, Upload, Download, Trash2, X } from 'lucide-react';

export default function ParticipantManager() {
    const {
        participants,
        updateParticipant,
        setAllParticipants,
        removeParticipant,
        clearParticipants,
        lastVoteId
    } = useQuiz();

    const [idInput, setIdInput] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [bulkText, setBulkText] = useState('');

    const handleAdd = (e) => {
        e.preventDefault();
        if (idInput.trim() && nameInput.trim()) {
            updateParticipant(idInput.trim(), nameInput.trim());
            setIdInput('');
            setNameInput('');
        }
    };

    const handleImport = () => {
        const lines = bulkText.split('\n');
        const newParticipants = { ...participants };
        lines.forEach(line => {
            const parts = line.split(/[:\t,-]/);
            if (parts.length >= 2) {
                const id = parts[0].trim();
                const name = parts.slice(1).join(' ').trim();
                if (id && name) {
                    newParticipants[id] = name;
                }
            }
        });
        setAllParticipants(newParticipants);
        setBulkText('');
        setShowImport(false);
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(participants, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "participantes_clicker.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const useLastId = () => {
        if (lastVoteId) setIdInput(lastVoteId);
    };

    const participantList = Object.entries(participants);

    return (
        <section className="card participants-card">
            <div className="card-header">
                <h2>Asignar Nombres</h2>
                <div className="header-actions-mini">
                    <button className="icon-btn" onClick={() => setShowImport(!showImport)} title="Importar lista">
                        <Upload size={16} />
                    </button>
                    <button className="icon-btn" onClick={handleExport} title="Descargar lista">
                        <Download size={16} />
                    </button>
                    <button className="icon-btn text-danger" onClick={clearParticipants} title="Borrar todos">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {showImport && (
                <div className="bulk-import-area">
                    <div className="import-header">
                        <label>Pega tu lista (ID: Nombre)</label>
                        <button className="icon-btn" onClick={() => setShowImport(false)}><X size={14} /></button>
                    </div>
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="1001: Juan Pérez&#10;1002: María García"
                        rows={4}
                    />
                    <button className="btn btn-primary btn-xs" onClick={handleImport}>Aplicar Lista</button>
                </div>
            )}

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
