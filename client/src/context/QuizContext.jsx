import React, { createContext, useContext, useState } from 'react';

const QuizContext = createContext();

export const useQuiz = () => useContext(QuizContext);

export const QuizProvider = ({ children }) => {
    const [questions, setQuestions] = useState([
        {
            id: 1,
            text: "What is the capital of France?",
            options: [
                { label: "A", text: "London" },
                { label: "B", text: "Berlin" },
                { label: "C", text: "Paris" },
                { label: "D", text: "Madrid" },
                { label: "E", text: "Rome" }
            ],
            correctAnswer: "C"
        }
    ]);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [presentationMode, setPresentationMode] = useState(false);
    const [participants, setParticipants] = useState({}); // { id: name }
    const [lastVoteId, setLastVoteId] = useState(null);

    const addQuestion = (question) => {
        setQuestions([...questions, { ...question, id: Date.now() }]);
    };

    const updateQuestion = (id, updated) => {
        setQuestions(questions.map(q => q.id === id ? { ...updated, id } : q));
    };

    const deleteQuestion = (id) => {
        setQuestions((prev) => {
            if (prev.length <= 1) return prev;

            const next = prev.filter(q => q.id !== id);

            setCurrentQuestionIndex((idx) => {
                if (idx >= next.length) return Math.max(0, next.length - 1);
                return idx;
            });

            return next;
        });
    };

    const updateParticipant = (id, name) => {
        setParticipants(prev => ({ ...prev, [id]: name }));
    };

    const removeParticipant = (id) => {
        setParticipants(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const goToNextSlide = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const goToPrevSlide = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <QuizContext.Provider value={{
            questions,
            currentQuestion,
            currentQuestionIndex,
            addQuestion,
            updateQuestion,
            deleteQuestion,
            goToNextSlide,
            goToPrevSlide,
            presentationMode,
            setPresentationMode,
            setCurrentQuestionIndex,
            participants,
            updateParticipant,
            removeParticipant,
            lastVoteId,
            setLastVoteId
        }}>
            {children}
        </QuizContext.Provider>
    );
};
