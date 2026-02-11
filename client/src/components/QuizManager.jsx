import React, { useMemo, useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { Plus, Trash2, PlayCircle, Save, X, Edit } from 'lucide-react';

const EMPTY_DRAFT = {
    text: '',
    options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' },
        { label: 'E', text: '' }
    ],
    correctAnswer: 'A'
};

export default function QuizManager() {
    const {
        questions,
        addQuestion,
        updateQuestion,
        deleteQuestion,
        setPresentationMode,
        setCurrentQuestionIndex
    } = useQuiz();

    const [editingId, setEditingId] = useState(null);
    const [draft, setDraft] = useState(EMPTY_DRAFT);

    const editingQuestion = useMemo(
        () => questions.find((q) => q.id === editingId) ?? null,
        [editingId, questions]
    );

    const handleStartPresentation = (index) => {
        setCurrentQuestionIndex(index);
        setPresentationMode(true);
    };

    const handleCreate = () => {
        const question = {
            text: 'New Question',
            options: [
                { label: 'A', text: 'Option 1' },
                { label: 'B', text: 'Option 2' },
                { label: 'C', text: 'Option 3' },
                { label: 'D', text: 'Option 4' },
                { label: 'E', text: 'Option 5' }
            ],
            correctAnswer: 'A'
        };

        addQuestion(question);
    };

    const startEditing = (question) => {
        setEditingId(question.id);
        setDraft({
            text: question.text,
            options: question.options.map((o) => ({ ...o })),
            correctAnswer: question.correctAnswer
        });
    };

    const stopEditing = () => {
        setEditingId(null);
        setDraft(EMPTY_DRAFT);
    };

    const setOptionText = (label, value) => {
        setDraft((prev) => ({
            ...prev,
            options: prev.options.map((o) => (o.label === label ? { ...o, text: value } : o))
        }));
    };

    const canSave =
        draft.text.trim().length > 4 &&
        draft.options.every((opt) => opt.text.trim().length > 0) &&
        /^[A-E]$/.test(draft.correctAnswer);

    const handleSave = () => {
        if (!editingQuestion || !canSave) return;

        updateQuestion(editingQuestion.id, {
            ...editingQuestion,
            text: draft.text.trim(),
            options: draft.options.map((opt) => ({ ...opt, text: opt.text.trim() })),
            correctAnswer: draft.correctAnswer
        });

        stopEditing();
    };

    return (
        <div className="card quiz-manager">
            <div className="card-header">
                <h2>Banco de Preguntas</h2>
                <button className="btn btn-secondary" onClick={handleCreate}>
                    <Plus size={16} /> Nueva Pregunta
                </button>
            </div>

            <div className="question-list">
                {questions.map((q, idx) => (
                    <div key={q.id} className="question-item">
                        <div className="q-info">
                            <span className="q-num">P{idx + 1}</span>
                            <span className="q-text">{q.text}</span>
                        </div>
                        <div className="q-actions">
                            <button className="icon-btn" onClick={() => startEditing(q)} title="Editar texto">
                                <Edit size={18} />
                            </button>
                            <button className="icon-btn" onClick={() => handleStartPresentation(idx)} title="Ver en pantalla">
                                <PlayCircle size={18} />
                            </button>
                            <button
                                className="icon-btn text-danger"
                                onClick={() => deleteQuestion(q.id)}
                                title={questions.length === 1 ? 'Se requiere al menos una pregunta' : 'Eliminar'}
                                disabled={questions.length === 1}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editingQuestion && (
                <div className="editor-panel">
                    <h3>Editar pregunta</h3>
                    <label>
                        Texto de la pregunta
                        <input
                            value={draft.text}
                            onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
                            placeholder="Escribe la pregunta aquí..."
                        />
                    </label>

                    <div className="editor-options">
                        {draft.options.map((opt) => (
                            <label key={opt.label}>
                                Opción {opt.label}
                                <input
                                    value={opt.text}
                                    onChange={(e) => setOptionText(opt.label, e.target.value)}
                                    placeholder={`Texto para ${opt.label}`}
                                />
                            </label>
                        ))}
                    </div>

                    <label style={{ marginTop: '0.5rem' }}>
                        Respuesta correcta
                        <select
                            value={draft.correctAnswer}
                            onChange={(e) => setDraft((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                        >
                            {['A', 'B', 'C', 'D', 'E'].map((option) => (
                                <option key={option} value={option}>Letra {option}</option>
                            ))}
                        </select>
                    </label>

                    <div className="editor-actions" style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
                            <Save size={16} /> Guardar Cambios
                        </button>
                        <button className="btn btn-secondary" onClick={stopEditing}>
                            <X size={16} /> Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
