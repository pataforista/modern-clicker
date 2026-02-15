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

    // --- Sync Logic ---
    const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

    const pushParticipants = async (newList) => {
        try {
            await fetch(`${API_URL}/sync/participants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participants: newList })
            });
        } catch (e) { console.error("Sync failed", e); }
    };

    const pushQuestions = async (newList) => {
        try {
            await fetch(`${API_URL}/sync/questions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions: newList })
            });
        } catch (e) { console.error("Sync failed", e); }
    };

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
        const next = [...questions, { ...question, id: Date.now() }];
        setQuestions(next);
        pushQuestions(next);
    };

    const addQuestions = (newQuestions) => {
        const next = [
            ...questions,
            ...newQuestions.map((question, index) => ({
                ...question,
                id: Date.now() + index + 1
            }))
        ];
        setQuestions(next);
        pushQuestions(next);
    };

    const updateQuestion = (id, updated) => {
        const next = questions.map((q) => (q.id === id ? { ...updated, id } : q));
        setQuestions(next);
        pushQuestions(next);
    };

    const deleteQuestion = (id) => {
        setQuestions((prev) => {
            if (prev.length <= 1) return prev;
            const next = prev.filter((q) => q.id !== id);

            setCurrentQuestionIndex((idx) => {
                const newIdx = idx >= next.length ? Math.max(0, next.length - 1) : idx;
                return newIdx;
            });

            pushQuestions(next);
            return next;
        });
    };

    const updateParticipant = (id, payload) => {
        const normalized = normalizeParticipant(id, payload);
        if (!normalized.name) return;
        setParticipants((prev) => {
            const next = { ...prev, [id]: normalized };
            pushParticipants(next);
            return next;
        });
    };

    const setAllParticipants = (newList) => {
        const normalized = normalizeParticipantsMap(newList);
        setParticipants(normalized);
        pushParticipants(normalized);
    };

    const removeParticipant = (id) => {
        setParticipants((prev) => {
            const next = { ...prev };
            delete next[id];
            pushParticipants(next);
            return next;
        });
    };

    const clearParticipants = () => {
        setParticipants({});
        pushParticipants({});
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
                setQuestions, // Allow overriding from server
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
                setParticipants, // Allow overriding from server
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
