import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const QuizContext = createContext();
const QUIZ_STORAGE_KEY = 'modern-clicker-quiz-state-v1';

const DEFAULT_QUESTIONS = [
    {
        id: 1,
        text: '¿Cuál es la capital de Francia?',
        options: [
            { label: 'A', text: 'Londres' },
            { label: 'B', text: 'Berlín' },
            { label: 'C', text: 'París' },
            { label: 'D', text: 'Madrid' },
            { label: 'E', text: 'Roma' }
        ],
        correctAnswer: 'C'
    }
];

const normalizeParticipant = (id, participant) => {
    if (typeof participant === 'string') {
        return { id, name: participant, number: '' };
    }

    return {
        id,
        name: participant?.name?.toString().trim() ?? '',
        number: participant?.number?.toString().trim() ?? ''
    };
};

const normalizeParticipantsMap = (rawParticipants = {}) => {
    return Object.entries(rawParticipants).reduce((acc, [id, value]) => {
        acc[id] = normalizeParticipant(id, value);
        return acc;
    }, {});
};

const loadPersistedState = () => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

        return {
            ...parsed,
            participants: normalizeParticipantsMap(parsed.participants)
        };
    } catch {
        return null;
    }
};

export const useQuiz = () => useContext(QuizContext);

export const QuizProvider = ({ children }) => {
    const persisted = useMemo(() => loadPersistedState(), []);

    const [questions, setQuestions] = useState(persisted?.questions ?? DEFAULT_QUESTIONS);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
        persisted?.currentQuestionIndex ?? 0
    );
    const [presentationMode, setPresentationMode] = useState(false);
    const [participants, setParticipants] = useState(persisted?.participants ?? {});
    const [lastVoteId, setLastVoteId] = useState(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const state = {
            questions,
            currentQuestionIndex,
            participants
        };

        window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state));
    }, [questions, currentQuestionIndex, participants]);

    const addQuestion = (question) => {
        setQuestions((prev) => [...prev, { ...question, id: Date.now() }]);
    };

    const addQuestions = (newQuestions) => {
        setQuestions((prev) => [
            ...prev,
            ...newQuestions.map((question, index) => ({
                ...question,
                id: Date.now() + index + 1
            }))
        ]);
    };

    const updateQuestion = (id, updated) => {
        setQuestions((prev) => prev.map((q) => (q.id === id ? { ...updated, id } : q)));
    };

    const deleteQuestion = (id) => {
        setQuestions((prev) => {
            if (prev.length <= 1) return prev;

            const next = prev.filter((q) => q.id !== id);

            setCurrentQuestionIndex((idx) => {
                if (idx >= next.length) return Math.max(0, next.length - 1);
                return idx;
            });

            return next;
        });
    };

    const updateParticipant = (id, payload) => {
        const normalized = normalizeParticipant(id, payload);
        if (!normalized.name) return;
        setParticipants((prev) => ({ ...prev, [id]: normalized }));
    };

    const setAllParticipants = (newList) => {
        setParticipants(normalizeParticipantsMap(newList));
    };

    const removeParticipant = (id) => {
        setParticipants((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const clearParticipants = () => {
        setParticipants({});
    };

    const goToNextSlide = () => {
        setCurrentQuestionIndex((prev) => Math.min(prev + 1, questions.length - 1));
    };

    const goToPrevSlide = () => {
        setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
    };

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <QuizContext.Provider
            value={{
                questions,
                currentQuestion,
                currentQuestionIndex,
                addQuestion,
                addQuestions,
                updateQuestion,
                deleteQuestion,
                goToNextSlide,
                goToPrevSlide,
                presentationMode,
                setPresentationMode,
                setCurrentQuestionIndex,
                participants,
                updateParticipant,
                setAllParticipants,
                removeParticipant,
                clearParticipants,
                lastVoteId,
                setLastVoteId
            }}
        >
            {children}
        </QuizContext.Provider>
    );
};
