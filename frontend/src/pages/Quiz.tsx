/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithRetry } from '../lib/apiUtils';
import { useLocation } from 'react-router-dom';
import { 
  BrainCircuit, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RotateCcw,
  Trophy,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MCQ {
  id: string | number;
  question: string;
  options: string[];
}

interface GradeResult {
  score: string;
  feedback: Array<{
    question_id: string | number;
    correct: boolean;
    correct_answer: string;
    explanation: string;
  }>;
}

export default function Quiz({ transcriptText: propsTranscript }: { transcriptText?: string }) {
  const location = useLocation();
  
  let savedData = null;
  try {
    const raw = localStorage.getItem('class-gpt-data');
    if (raw) savedData = JSON.parse(raw);
  } catch (e) {}
  
  const transcriptText = propsTranscript || location.state?.transcript || savedData?.transcript || "";

  const [loading, setLoading] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchMCQs = useCallback(async (attempts = 5) => {
    // DEBUG LOG
    console.log("1. fetchMCQs triggered. Transcript length:", transcriptText?.length);

    if (!transcriptText) {
      console.warn("ABORTING: No transcriptText found in location.state");
      return;
    }
    
    setLoading(true);
    setError(null);
    setResults(null);
    setCurrentIndex(0);
    setUserAnswers({});
    
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`2. Attempting /generate-mcq (Attempt ${i + 1})`);
        
        const res = await fetchWithRetry('/api/generate-mcq', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript_text: transcriptText }) 
        }, 5);

        const data = await res.json();
        console.log("4. Data received:", data);

        // API calls the key "questions"
        if (data.questions && data.questions.length > 0) {
          setMcqs(data.questions);
          setLoading(false);
          return; 
        } else {
          throw new Error("No questions returned in JSON");
        }

      } catch (err: any) {
        console.error(`Attempt ${i + 1} failed:`, err.message);
        setRetryCount(i + 1);
        if (i === attempts - 1) {
          setError("The LLM is currently unavailable, Please try again after some time.");
        } else {
          await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s
        }
      }
    }
    setLoading(false);
  }, [transcriptText]);

  useEffect(() => {
    console.log("useEffect: Component mounted or transcript changed");
    fetchMCQs();
  }, [fetchMCQs]);

  const evaluateQuiz = async () => {
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/grade-mcq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript_text: transcriptText,
          questions: mcqs,
          user_answers: userAnswers
        }),
      }, 5);
      const data = await res.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentMcq = mcqs[currentIndex];
  const isLastQuestion = currentIndex === mcqs.length - 1;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-16">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
              <BrainCircuit size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Quiz</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">mcq_service interaction</p>
            </div>
          </div>
          
          <button 
            onClick={() => fetchMCQs()}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold border border-white/5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Retry Component
          </button>
        </header>

        {loading && mcqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {retryCount > 0 ? `Retrying Assessment (${retryCount}/5)...` : "Generating Quiz..."}
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-40 border border-white/5 bg-white/[0.02] rounded-[40px]">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-slate-400 mb-6">{error}</p>
            <button onClick={() => fetchMCQs()} className="bg-primary px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest">
              Manual Retry
            </button>
          </div>
        ) : loading && mcqs.length > 0 && !results ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Answers are being graded by an expert...
            </p>
          </div>
        ) : mcqs.length > 0 && !results ? (
          <div className="space-y-10">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary" 
                initial={{ width: 0 }} 
                animate={{ width: `${((currentIndex + 1) / mcqs.length) * 100}%` }} 
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 md:p-14"
              >
                <h2 className="text-2xl font-bold mb-10">{currentMcq.question}</h2>
                <div className="grid gap-4">
                  {currentMcq.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setUserAnswers({ ...userAnswers, [currentMcq.id.toString()]: option })}
                      className={`w-full text-left p-6 rounded-2xl border transition-all ${
                        userAnswers[currentMcq.id.toString()] === option 
                        ? 'bg-primary border-primary' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between">
              <button 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="text-slate-500 font-bold uppercase text-[10px] tracking-widest disabled:opacity-0"
              >
                <ChevronLeft size={14} className="inline mr-1"/> Back
              </button>

              <button 
                disabled={!userAnswers[currentMcq.id.toString()]}
                onClick={isLastQuestion ? evaluateQuiz : () => setCurrentIndex(prev => prev + 1)}
                className="bg-primary px-10 py-4 rounded-xl font-black text-[10px] tracking-widest shadow-lg shadow-primary/20"
              >
                {isLastQuestion ? 'Evaluate' : 'Next'}
              </button>
            </div>
          </div>
        ) : results ? (
          <div className="space-y-8 pb-20">
            <div className="bg-primary/20 border border-primary/20 rounded-[40px] p-12 text-center">
              <Trophy className="mx-auto text-primary mb-6" size={64} />
              <h2 className="text-4xl font-black">Score: {results.score}</h2>
            </div>
            <div className="space-y-6">
              {results.feedback.map((f, i) => {
                const question = mcqs.find(q => q.id.toString() === f.question_id.toString());
                return (
                  <div key={i} className={`p-6 rounded-2xl border ${f.correct ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                    <h3 className="font-bold mb-4 text-lg">{question?.question}</h3>
                    {!f.correct && (
                      <div className="mb-4 text-sm text-red-300 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                        <span className="font-bold block mb-1">Your answer:</span> {userAnswers[f.question_id.toString()]}
                      </div>
                    )}
                    <div className="mb-2 text-sm text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20">
                      <span className="font-bold block mb-1">Correct answer:</span> {f.correct_answer}
                    </div>
                    <div className="text-sm text-slate-300 mt-4 border-t border-white/5 pt-4 leading-relaxed">
                      {f.explanation}
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={() => fetchMCQs()} className="w-full p-8 bg-white/5 border border-white/10 rounded-[32px] font-black uppercase text-xs hover:bg-white/10 transition-colors">
              <RotateCcw size={18} className="inline mr-2" /> Start New Quiz
            </button>
          </div>
        ) : (
          <div className="text-center py-40 opacity-50">
             <Loader2 className="animate-spin mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em]">Waiting for data synchronization...</p>
          </div>
        )}
      </div>
    </div>
  );
}