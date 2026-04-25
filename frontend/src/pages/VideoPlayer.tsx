import React, { useState } from 'react';
import { 
  Play, 
  Bookmark, 
  ThumbsUp, 
  Share2, 
  Sparkles, 
  MessageSquare, 
  LayoutGrid, 
  Check, 
  Download,
  Volume2,
  Maximize
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function VideoPlayer() {
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'next'>('summary');

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left Section: Video Player & Info */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 scrollbar-hide">
        {/* Video Player Container */}
        <div className="group relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl shadow-primary/10">
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200" 
              alt="Thumbnail" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <button className="flex items-center justify-center rounded-full size-20 bg-primary/90 text-white shadow-lg transform group-hover:scale-110 transition-transform z-10">
              <Play className="size-10 fill-current" />
            </button>
          </div>
          
          {/* Custom Controls Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-4 text-white">
              <Play className="size-5 cursor-pointer fill-current" />
              <div className="h-1 flex-1 rounded-full bg-white/20 relative cursor-pointer">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-primary rounded-full"></div>
                <div className="absolute top-1/2 left-1/3 -translate-y-1/2 size-3 bg-white rounded-full shadow"></div>
              </div>
              <p className="text-xs font-medium font-mono">12:45 / 42:20</p>
              <Volume2 className="size-5 cursor-pointer" />
              <Maximize className="size-5 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Video Metadata */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary text-white">Course</span>
                <p className="text-xs text-slate-500 font-medium">Advanced Systems Architecture • Lecture 12</p>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-white tracking-tight">
                Mastering Distributed Systems: Scalability & Fault Tolerance
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-semibold text-slate-300">
                <ThumbsUp className="size-4" /> 1.2k
              </button>
              <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity text-sm font-bold shadow-lg shadow-primary/20">
                <Bookmark className="size-4" /> Save
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="size-12 rounded-full border-2 border-primary/40 p-0.5">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Elena" 
                alt="Professor" 
                className="rounded-full w-full h-full object-cover" 
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white uppercase tracking-tight">Dr. Elena Rodriguez</p>
              <p className="text-xs text-slate-500">Computer Science Dept. • MIT</p>
            </div>
            <button className="text-primary text-sm font-bold px-5 py-2 rounded-full border border-primary hover:bg-primary hover:text-white transition-all">
              Follow
            </button>
          </div>
        </div>
      </div>

      {/* Right Section: Tabbed Hub */}
      <aside className="w-full lg:w-[420px] bg-background-dark/80 backdrop-blur-3xl border-l border-white/5 flex flex-col h-full shadow-2xl">
        {/* Tabs Navigation */}
        <div className="flex border-b border-white/5 px-2 pt-2">
          {[
            { id: 'summary', icon: Sparkles, label: 'Summary' },
            { id: 'chat', icon: MessageSquare, label: 'Chat' },
            { id: 'next', icon: LayoutGrid, label: 'Resources' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-4 border-b-2 transition-all font-bold text-sm uppercase tracking-widest",
                activeTab === tab.id 
                  ? "border-primary text-primary" 
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="size-4" />
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content: Summary (Active) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Key Insights</h3>
                <span className="text-[10px] font-bold py-1 px-3 bg-primary/20 text-primary rounded-full uppercase tracking-widest">AI Generated</span>
              </div>
              
              <p className="text-sm text-slate-400 leading-relaxed font-light">
                This lecture covers the fundamental trade-offs between consistency and availability in large-scale cloud architectures.
              </p>
              
              <ul className="space-y-6">
                {[
                  { title: 'CAP Theorem Decoded', desc: 'Why distributed systems can only provide two out of three guarantees.' },
                  { title: 'Eventual Consistency', desc: 'Deep dive into Base vs ACID models and global data sync.' },
                  { title: 'Leader Election Protocols', desc: 'Analysis of Raft and Paxos algorithms for source of truth.' },
                  { title: 'Practical Scaling', desc: 'Horizontal vs Vertical scaling strategies and network overhead.' }
                ].map((insight, i) => (
                  <li key={i} className="flex gap-4 group">
                    <div className="mt-1 shrink-0 size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                      <Check className="size-4 font-bold" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 mb-1">{insight.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{insight.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Quiz Preview */}
              <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="size-4" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Knowledge Check</p>
                </div>
                <p className="text-sm font-semibold text-slate-200 leading-snug">Ready to test your knowledge on distributed systems?</p>
                <button className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 uppercase tracking-widest">
                  Start Lesson Quiz
                </button>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col justify-center items-center text-center p-8">
              <MessageSquare className="size-12 text-slate-700 mb-4" />
              <p className="text-slate-500 text-sm">Chat is initializing...</p>
            </div>
          )}

          {activeTab === 'next' && (
            <div className="h-full flex flex-col justify-center items-center text-center p-8">
              <LayoutGrid className="size-12 text-slate-700 mb-4" />
              <p className="text-slate-500 text-sm">Suggested resources loading...</p>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="p-6 border-t border-white/5 bg-white/2">
          <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-sm font-bold text-slate-300">
            <Download className="size-4" />
            Export Full Transcript (PDF)
          </button>
        </div>
      </aside>
    </div>
  );
}
