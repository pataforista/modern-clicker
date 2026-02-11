import React, { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { Plus, Trash2, PlayCircle, Edit } from 'lucide-react';

export default function QuizManager() {
    const { questions, addQuestion, deleteQuestion, setPresentationMode, setCurrentQuestionIndex } = useQuiz();
    const [isEditing, setIsEditing] = useState(false);
    const [newQ, setNewQ] = useState({ text: '', options: [], correctAnswer: '' });

    const handleStartPresentation = (index) => {
        setCurrentQuestionIndex(index);
        setPresentationMode(true);
    };

    const handleCreate = () => {
        addQuestion({
            text: "New Question",
            options: [
                { label: 'A', text: 'Option 1' },
                { label: 'B', text: 'Option 2' },
                { label: 'C', text: 'Option 3' },
                { label: 'D', text: 'Option 4' },
                { label: 'E', text: 'Option 5' }
            ],
            correctAnswer: 'A'
        });
    };

    return (
        <div className="card quiz-manager">
            <div className="card-header">
                <h2>Quiz Questions</h2>
                <button className="btn btn-secondary" onClick={handleCreate}>
                    <Plus size={16} /> Add New
                </button>
            </div>

            <div className="question-list">
                {questions.map((q, idx) => (
                    <div key={q.id} className="question-item">
                        <div className="q-info">
                            <span className="q-num">Q{idx + 1}</span>
                            <span className="q-text">{q.text}</span>
                        </div>
                        <div className="q-actions">
                            <button className="icon-btn" onClick={() => handleStartPresentation(idx)} title="Present">
                                <PlayCircle size={18} />
                            </button>
                            <button className="icon-btn text-danger" onClick={() => deleteQuestion(q.id)} title="Delete">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
