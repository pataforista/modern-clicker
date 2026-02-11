import React from 'react';
import { useQuiz } from '../context/QuizContext';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PresentationView({ children }) {
    const { currentQuestion, goToNextSlide, goToPrevSlide, setPresentationMode } = useQuiz();

    if (!currentQuestion) return null;

    return (
        <div className="presentation-overlay">
            <button className="close-pres-btn" onClick={() => setPresentationMode(false)}>
                <X size={24} /> Exit
            </button>

            <div className="slide-content">
                <h1 className="slide-question">{currentQuestion.text}</h1>

                <div className="slide-grid">
                    <div className="options-list">
                        {currentQuestion.options.map((opt) => (
                            <div key={opt.label} className={`option-row ${currentQuestion.correctAnswer === opt.label ? 'is-correct-reveal' : ''}`}>
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
                <button className="nav-btn" onClick={goToPrevSlide}><ChevronLeft size={32} /></button>
                <button className="nav-btn" onClick={goToNextSlide}><ChevronRight size={32} /></button>
            </div>
        </div>
    );
}
