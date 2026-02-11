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

    const addQuestion = (question) => {
        setQuestions([...questions, { ...question, id: Date.now() }]);
    };

    const updateQuestion = (id, updated) => {
        setQuestions(questions.map(q => q.id === id ? updated : q));
    };

    const deleteQuestion = (id) => {
        setQuestions(questions.filter(q => q.id !== id));
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
            setCurrentQuestionIndex
        }}>
            {children}
        </QuizContext.Provider>
    );
};
