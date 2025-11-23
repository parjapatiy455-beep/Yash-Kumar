
import React, { useState, useEffect } from 'react';
import { Quiz, Question } from '../types';
import { X, CheckCircle, XCircle, Trophy, ArrowRight, Timer } from 'lucide-react';

interface QuizModalProps {
    quiz: Quiz;
    onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose }) => {
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [answers, setAnswers] = useState<{qId: string, correct: boolean}[]>([]);
    const [timeLeft, setTimeLeft] = useState(60); // 60 seconds per question default

    // Convert questions object to array
    const questions = quiz.questions ? Object.values(quiz.questions) as Question[] : [];
    const currentQuestion = questions[currentQIndex];

    useEffect(() => {
        setTimeLeft(60);
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleNext();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentQIndex]);

    const handleOptionSelect = (index: number) => {
        setSelectedOption(index);
    };

    const handleNext = () => {
        const isCorrect = selectedOption === currentQuestion.correctOptionIndex;
        if (isCorrect) setScore(s => s + currentQuestion.marks);
        
        setAnswers(prev => [...prev, { qId: currentQuestion.id, correct: isCorrect }]);

        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setShowResult(true);
        }
    };

    if (showResult) {
        const percentage = Math.round((score / (questions.reduce((a, b) => a + b.marks, 0))) * 100);
        return (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-yellow-50 to-transparent"></div>
                    </div>
                    <div className="relative z-10">
                        <Trophy size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
                        <p className="text-slate-600 mb-6">You scored</p>
                        <div className="text-5xl font-extrabold text-primary mb-6">{percentage}%</div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                <p className="text-xs text-green-600 font-bold uppercase">Correct</p>
                                <p className="text-xl font-bold text-green-700">{answers.filter(a => a.correct).length}</p>
                            </div>
                            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                <p className="text-xs text-red-600 font-bold uppercase">Wrong</p>
                                <p className="text-xl font-bold text-red-700">{answers.filter(a => !a.correct).length}</p>
                            </div>
                        </div>

                        <button onClick={onClose} className="btn-primary w-full shadow-xl">
                            Close & Continue Learning
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (questions.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-slate-800">{quiz.title}</h3>
                        <p className="text-xs text-slate-500">Question {currentQIndex + 1} of {questions.length}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${timeLeft < 10 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Timer size={16} /> {timeLeft}s
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 h-1.5">
                    <div className="bg-primary h-1.5 transition-all duration-300" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}></div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    <h4 className="text-lg font-semibold text-slate-800 mb-6 leading-relaxed">
                        {currentQuestion.text}
                    </h4>

                    <div className="space-y-3">
                        {currentQuestion.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleOptionSelect(idx)}
                                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${
                                    selectedOption === idx 
                                    ? 'border-primary bg-primary/5 shadow-md' 
                                    : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${
                                        selectedOption === idx ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-300 group-hover:border-primary'
                                    }`}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={`text-sm font-medium ${selectedOption === idx ? 'text-primary' : 'text-slate-700'}`}>{opt}</span>
                                </div>
                                {selectedOption === idx && <CheckCircle size={20} className="text-primary animate-zoom-in" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-slate-50 flex justify-end">
                    <button 
                        onClick={handleNext} 
                        disabled={selectedOption === null}
                        className="btn-primary px-8 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {currentQIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
