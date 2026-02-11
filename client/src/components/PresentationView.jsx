import React, { useState } from 'react';
import { useQuiz } from '../context/QuizContext';
import { X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';

export default function PresentationView({ children }) {
    const {
        currentQuestion,
        currentQuestionIndex,
        questions,
        goToNextSlide,
        goToPrevSlide,
        setPresentationMode
    } = useQuiz();
    const [revealAnswer, setRevealAnswer] = useState(false);

    if (!currentQuestion) return null;

    return (
        <div className="presentation-overlay">
            <button className="close-pres-btn" onClick={() => setPresentationMode(false)} title="Cerrar presentación">
                <X size={24} /> Salir
            </button>

            <div className="slide-content">
                <div className="slide-meta">Pregunta {currentQuestionIndex + 1} de {questions.length}</div>
                <h1 className="slide-question">{currentQuestion.text}</h1>

                <div className="slide-grid">
                    <div className="options-list">
                        {currentQuestion.options.map((opt) => (
                            <div key={opt.label} className={`option-row ${revealAnswer && currentQuestion.correctAnswer === opt.label ? 'is-correct-reveal' : ''}`}>
                                <span className="opt-label">{opt.label}</span>
                                <span className="opt-text">{opt.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="chart-area-embedded">
                        {children}
                    </div>
                </div>
            </div>

            <div className="slide-controls">
                <button className="nav-btn" onClick={goToPrevSlide} disabled={currentQuestionIndex === 0} title="Pregunta anterior">
                    <ChevronLeft size={32} />
                </button>
                <button className="nav-btn" onClick={() => setRevealAnswer((prev) => !prev)} title={revealAnswer ? "Ocultar respuesta" : "Mostrar respuesta correcta"}>
                    {revealAnswer ? <EyeOff size={26} /> : <Eye size={26} />}
                </button>
                <button className="nav-btn" onClick={goToNextSlide} disabled={currentQuestionIndex >= questions.length - 1} title="Siguiente pregunta">
                    <ChevronRight size={32} />
                </button>
            </div>

            <div style={{ position: 'absolute', bottom: '1rem', right: '2rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
                Usa las flechas para navegar
            </div>
        </div>
    );
}
