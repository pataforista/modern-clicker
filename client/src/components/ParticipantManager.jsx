import React, { useEffect, useMemo, useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import {
    UserPlus,
    UserMinus,
    Hash,
    Upload,
    Download,
    Trash2,
    X,
    Search,
    Users
} from 'lucide-react';

const VISIBLE_PARTICIPANTS = 200;

const parseParticipantsFromText = (text, currentParticipants) => {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    const next = { ...currentParticipants };

    lines.forEach((line) => {
        const csvParts = line.split(',').map((part) => part.trim());
        const tsvParts = line.split('\t').map((part) => part.trim());
        const colonMatch = line.match(/^([^:;\-]+)[:;\-](.+)$/);

        let id = '';
        let name = '';
        let number = '';

        if (csvParts.length >= 2) {
            [id, name, number = ''] = csvParts;
        } else if (tsvParts.length >= 2) {
            [id, name, number = ''] = tsvParts;
        } else if (colonMatch) {
            id = colonMatch[1]?.trim() ?? '';
            name = colonMatch[2]?.trim() ?? '';
        }

        if (id && name) {
            next[id] = { id, name, number };
        }
    });

    return next;
};

const downloadTextFile = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

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
    const [numberInput, setNumberInput] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handler = (e) => {
            const { id } = e.detail;
            setIdInput(id);
            // Optionally focus the name input
            const nameEl = document.querySelector('input[placeholder="Ej: Juan Pérez"]');
            if (nameEl) nameEl.focus();
        };
        window.addEventListener('focus-registration', handler);
        return () => window.removeEventListener('focus-registration', handler);
    }, []);

    const participantList = useMemo(
        () =>
            Object.entries(participants)
                .map(([id, participant]) => ({
                    id,
                    name: participant?.name ?? '',
                    number: participant?.number ?? ''
                }))
                .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true })),
        [participants]
    );

    const filteredParticipants = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return participantList;

        return participantList.filter((participant) =>
            [participant.id, participant.name, participant.number]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [participantList, search]);

    const visibleParticipants = filteredParticipants.slice(0, VISIBLE_PARTICIPANTS);
    const hiddenParticipants = filteredParticipants.length - visibleParticipants.length;

    const handleAdd = (e) => {
        e.preventDefault();
        if (idInput.trim() && nameInput.trim()) {
            updateParticipant(idInput.trim(), {
                id: idInput.trim(),
                name: nameInput.trim(),
                number: numberInput.trim()
            });
            setIdInput('');
            setNameInput('');
            setNumberInput('');
        }
    };

    const handleImport = () => {
        const newParticipants = parseParticipantsFromText(bulkText, participants);
        setAllParticipants(newParticipants);
        setBulkText('');
        setShowImport(false);
    };

    const handleExportJson = () => {
        downloadTextFile(
            'participantes_clicker.json',
            JSON.stringify(participants, null, 2),
            'application/json;charset=utf-8'
        );
    };

    const handleExportCsv = () => {
        const rows = [
            ['id_control', 'nombre', 'numero'].join(','),
            ...participantList.map((participant) =>
                [participant.id, participant.name, participant.number]
                    .map((value) => `"${value.toString().replaceAll('"', '""')}"`)
                    .join(',')
            )
        ];

        downloadTextFile('participantes_clicker.csv', rows.join('\n'), 'text/csv;charset=utf-8');
    };

    const useLastId = () => {
        if (lastVoteId) setIdInput(lastVoteId);
    };

    return (
        <section className="card participants-card">
            <div className="card-header">
                <h2>Participantes</h2>
                <div className="header-actions-mini">
                    <button className="icon-btn" onClick={() => setShowImport(!showImport)} title="Importar lista">
                        <Upload size={16} />
                    </button>
                    <button className="icon-btn" onClick={handleExportJson} title="Descargar JSON">
                        <Download size={16} />
                    </button>
                    <button className="icon-btn" onClick={handleExportCsv} title="Descargar CSV">
                        <Users size={16} />
                    </button>
                    <button className="icon-btn text-danger" onClick={clearParticipants} title="Borrar todos">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {showImport && (
                <div className="bulk-import-area">
                    <div className="import-header">
                        <label>Pega tu lista (ID, Nombre, Número opcional)</label>
                        <button className="icon-btn" onClick={() => setShowImport(false)}><X size={14} /></button>
                    </div>
                    <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder="1001, Juan Pérez, 23&#10;1002, María García, 24&#10;1003: Ana López"
                        rows={5}
                    />
                    <button className="btn btn-primary btn-xs" onClick={handleImport}>Aplicar Lista</button>
                </div>
            )}

            <form onSubmit={handleAdd} className="participant-form">
                <div className="input-row input-row-3">
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
                    <div className="input-group">
                        <label>Número</label>
                        <input
                            value={numberInput}
                            onChange={(e) => setNumberInput(e.target.value)}
                            placeholder="Ej: 23"
                        />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!idInput || !nameInput}>
                    <UserPlus size={16} /> Guardar participante
                </button>
            </form>

            <div className="participant-search-row">
                <Search size={14} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Buscar entre ${participantList.length} participantes`}
                />
            </div>

            <div className="participant-list">
                {filteredParticipants.length === 0 ? (
                    <p className="empty-text">No hay participantes que coincidan.</p>
                ) : (
                    <>
                        {visibleParticipants.map((participant) => (
                            <div key={participant.id} className="participant-item">
                                <div className="p-info">
                                    <span className="p-id">#{participant.id}</span>
                                    <span className="p-name">{participant.name}</span>
                                    {participant.number && <span className="p-number">N° {participant.number}</span>}
                                </div>
                                <button className="icon-btn text-danger" onClick={() => removeParticipant(participant.id)}>
                                    <UserMinus size={16} />
                                </button>
                            </div>
                        ))}
                        {hiddenParticipants > 0 && (
                            <p className="list-truncate-note">
                                Mostrando {VISIBLE_PARTICIPANTS} de {filteredParticipants.length} participantes.
                                Usa el buscador para acotar resultados.
                            </p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
