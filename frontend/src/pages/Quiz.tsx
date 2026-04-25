import React, { useState } from 'react';
import { 
  PlayCircle, 
  History, 
  Settings as SettingsIcon, 
  ArrowLeft, 
  Send, 
  Lightbulb, 
  X,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Quiz() {
  const [selectedOption, setSelectedOption] = useState<number | null>(0);
  const [showTip, setShowTip] = useState(true);

  const options = [
    "To memoize expensive calculations and prevent unnecessary re-renders",
    "To manage global state across the entire application without Redux",
    "To trigger side effects when a component unmounts from the DOM",
    "To directly manipulate the DOM using a declarative reference syntax"
  ];

  return (
    <div className="flex flex-col h-full bg-background-dark/20 relative">
      {/* Top Section: Progress & Context */}
      <section className="flex-1 flex flex-col p-6 md:p-12 max-w-4xl mx-auto w-full space-y-12">
        {/* Video Context Card */}
        <div className="flex items-center gap-6 p-6 rounded-2xl glass-effect border-white/5">
          <div className="h-20 w-36 rounded-xl overflow-hidden shrink-0 bg-slate-800 relative group cursor-pointer shadow-xl">
            <div className="absolute inset-0 bg-linear-to-br from-primary/60 to-primary flex items-center justify-center">
              <PlayCircle className="text-white size-8" />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1.5">Analyzing Video Context</p>
            <h4 className="text-sm font-bold text-slate-100 uppercase tracking-tight">Advanced React Hooks & Performance Optimization</h4>
            <p className="text-[11px] text-slate-500 font-medium">Source: YouTube • 14:20 min</p>
          </div>
        </div>

        {/* Question Area */}
        <div className="space-y-10">
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Generated quiz</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Question 3 of 10</p>
              </div>
              <span className="text-xs font-black text-primary uppercase tracking-widest">30% Complete</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '30%' }}
                className="h-full bg-primary"
              />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white text-sm font-black shrink-0 shadow-lg shadow-primary/20">3</span>
              <h3 className="text-xl font-bold leading-relaxed text-slate-100">
                Which of the following best describes why the speaker recommends using <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded">useMemo</code> at 05:24?
              </h3>
            </div>

            <div className="grid gap-4 pl-16">
              {options.map((option, idx) => (
                <label 
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-5 rounded-2xl border p-5 transition-all",
                    selectedOption === idx 
                      ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(44,15,189,0.2)]" 
                      : "border-white/5 bg-white/2 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "size-6 rounded-full border-2 transition-all flex items-center justify-center",
                    selectedOption === idx ? "border-primary bg-primary" : "border-slate-700 bg-transparent"
                  )}>
                    {selectedOption === idx && <div className="size-2 bg-white rounded-full" />}
                  </div>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    selectedOption === idx ? "text-white" : "text-slate-400"
                  )}>
                    {option}
                  </span>
                  {selectedOption === idx && (
                    <CheckCircle2 className="absolute right-6 text-primary size-5" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-10 border-t border-white/5">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all">
              <ArrowLeft className="size-4" /> Previous
            </button>
            <button className="flex items-center gap-3 px-10 py-3 rounded-xl bg-primary text-white font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/30">
              Submit Answer <Send className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Floating AI Tip Overlay */}
      {showTip && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed bottom-10 right-10 max-w-sm z-50"
        >
          <div className="rounded-2xl glass-effect p-6 shadow-2xl shadow-black/50 border-primary/20 flex items-start gap-5 relative overflow-hidden backdrop-blur-2xl">
            <div className="absolute top-0 right-0 p-2">
              <button 
                onClick={() => setShowTip(false)}
                className="text-slate-600 hover:text-slate-400 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary shrink-0 glow-accent">
              <Lightbulb className="size-5 fill-current" />
            </div>
            
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1.5">AI INSIGHT</p>
              <p className="text-xs leading-relaxed text-slate-300 font-light">
                Based on your previous performance, you exhibit strength in React architecture but frequently struggle with <span className="text-primary font-bold">advanced hook memoization</span>. Focus on dependency optimization in the next module.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-0 size-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
    </div>
  );
}
