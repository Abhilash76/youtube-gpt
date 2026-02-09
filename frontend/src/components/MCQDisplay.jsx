import React, { useState } from 'react';

const MCQDisplay = ({ questions, onSubmit, gradingResults, loading }) => {
    const [answers, setAnswers] = useState({});

    const handleOptionSelect = (questionId, option) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: option
        }));
    };

    const handleSubmit = () => {
        onSubmit(answers);
    };

    if (!questions || questions.length === 0) return null;

    return (
        <>
            <h3>Knowledge Check</h3>

            {questions.map((q) => {
                const result = gradingResults?.feedback?.find(f => f.question_id === q.id);
                const isCorrect = result?.correct;

                return (
                    <div key={q.id} className={`mcq-card ${result ? (isCorrect ? 'correct' : 'incorrect') : ''}`}>
                        <p className="mcq-question">{q.id}. {q.question}</p>
                        <div className="mcq-options">
                            {q.options.map((option, idx) => (
                                <label key={idx} className={`mcq-option ${answers[q.id] === option ? 'selected' : ''}`} onClick={() => !gradingResults && handleOptionSelect(q.id, option)}>
                                    <span className="option-index">{idx + 1}</span>
                                    {option}
                                </label>
                            ))}
                        </div>

                        {result && (
                            <div className="mcq-feedback">
                                <p className="feedback-status">{isCorrect ? '✅ Correct' : '❌ Incorrect'}</p>
                                {!isCorrect && <p className="correct-answer">Correct Answer: {result.correct_answer}</p>}
                                <p className="explanation">{result.explanation}</p>
                            </div>
                        )}
                    </div>
                );
            })}

            {!gradingResults && (
                <button
                    className="submit-mcq-button"
                    onClick={handleSubmit}
                    disabled={loading || Object.keys(answers).length < questions.length}
                >
                    {loading ? 'Grading...' : 'Submit Answers'}
                </button>
            )}

            {gradingResults && (
                <div className="grading-summary">
                    <h4>Final Score: {gradingResults.score}</h4>
                </div>
            )}
        </>
    );
};

export default MCQDisplay;
