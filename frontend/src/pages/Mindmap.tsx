import React from 'react';
import { 
  Plus, 
  Minus, 
  Maximize, 
  Zap, 
  Layers, 
  Share2, 
  MoreVertical,
  Activity,
  Code,
  Bookmark,
  X,
  PlayCircle,
  FileText,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export default function Mindmap() {
  return (
    <div className="flex h-full overflow-hidden relative bg-background-dark/20 uppercase tracking-tight">
      {/* Canvas Area */}
      <main className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Controls Overlay */}
        <div className="absolute top-6 left-6 z-10 flex gap-3">
          <div className="flex glass-effect rounded-xl shadow-2xl p-1 bg-black/40">
            <button className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300"><Plus className="size-5" /></button>
            <button className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300 border-x border-white/5"><Minus className="size-5" /></button>
            <button className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300"><Maximize className="size-5" /></button>
          </div>
          <div className="flex bg-white/5 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 p-1">
            <button className="px-4 py-2 hover:bg-white/5 rounded-lg text-[10px] font-black text-slate-300 flex items-center gap-2">
              <Zap className="size-4 text-primary fill-current" />
              AUTO-LAYOUT
            </button>
          </div>
        </div>

        {/* View Toggles */}
        <div className="absolute top-6 right-6 z-10">
          <div className="flex glass-effect rounded-xl shadow-2xl p-1 bg-black/40 font-black text-[10px] uppercase tracking-widest">
            <button className="px-5 py-2.5 bg-primary text-white rounded-lg">Concept</button>
            <button className="px-5 py-2.5 hover:bg-white/5 text-slate-500 rounded-lg">Timeline</button>
            <button className="px-5 py-2.5 hover:bg-white/5 text-slate-500 rounded-lg">Resources</button>
          </div>
        </div>

        {/* SVG Visualization (Simplified representation) */}
        <div className="relative w-full h-full flex items-center justify-center p-20">
          <svg className="absolute inset-0 size-full pointer-events-none opacity-20">
            <line x1="50%" y1="50%" x2="35%" y2="35%" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="65%" y2="35%" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="35%" y2="65%" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" />
            <line x1="50%" y1="50%" x2="65%" y2="65%" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 4" />
          </svg>

          {/* Core Master Node */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute z-20"
          >
            <div className="bg-primary p-8 rounded-3xl flex flex-col items-center gap-3 border-4 border-primary/30 text-center min-w-[220px] shadow-[0_0_50px_rgba(44,15,189,0.4)]">
              <Activity className="size-10 text-white" />
              <h3 className="text-white font-black text-xl tracking-tighter">Neural Networks</h3>
              <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">Master Concept</p>
            </div>
          </motion.div>

          {/* Sub-Node: Architecture */}
          <motion.div 
            initial={{ x: -100, y: -100, opacity: 0 }}
            animate={{ x: -200, y: -150, opacity: 1 }}
            className="absolute z-10"
          >
            <div className="glass-effect p-5 rounded-2xl border-2 border-primary/20 shadow-2xl flex flex-col items-center gap-2 group cursor-pointer hover:border-primary transition-all">
              <Layers className="size-6 text-primary" />
              <h4 className="text-white font-bold text-sm uppercase">Architecture</h4>
              <div className="flex gap-1.5 mt-2">
                <div className="size-2 rounded-full bg-primary"></div>
                <div className="size-2 rounded-full bg-primary"></div>
                <div className="size-2 rounded-full bg-slate-700"></div>
              </div>
            </div>
          </motion.div>

          {/* More sub-nodes could be here... */}
        </div>

        {/* Video Mini-Player Bottom Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6">
          <div className="glass-effect rounded-2xl shadow-2xl border-primary/20 p-4 flex items-center gap-6 backdrop-blur-3xl bg-black/60">
            <div className="w-40 aspect-video rounded-xl overflow-hidden relative shrink-0 group cursor-pointer shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1620712943543-bcc4628c6757?auto=format&fit=crop&q=80&w=600" 
                alt="Mini" 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <PlayCircle className="text-white size-10" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-2">
                <h5 className="text-white font-black text-xs truncate uppercase tracking-tight">4.2 - Understanding the Multi-layer Perceptron</h5>
                <span className="text-[10px] text-slate-500 font-bold">12:45 / 18:20</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full mb-4">
                <div className="w-[70%] h-full bg-primary rounded-full relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 size-4 bg-white border-4 border-primary rounded-full shadow-2xl"></div>
                </div>
              </div>
              <div className="flex gap-6">
                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-primary transition-colors tracking-widest">
                  <FileText className="size-4" /> Add Note
                </button>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-primary transition-colors tracking-widest">
                  <Sparkles className="size-4" /> Take Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Right Details Sidebar */}
      <aside className="hidden xl:flex w-80 flex-col border-l border-white/5 bg-background-dark/40 p-8 gap-8 overflow-y-auto scrollbar-hide">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-black text-sm uppercase tracking-widest">Node Details</h3>
          <X className="size-5 text-slate-600 cursor-pointer" />
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/2 overflow-hidden shadow-2xl">
          <div className="h-32 bg-primary/20 relative flex items-center justify-center">
            <Layers className="size-12 text-primary opacity-50" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <h4 className="text-white font-black text-xs uppercase tracking-widest">ARCHITECTURE</h4>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Defines the structural blueprint including input, output, and hidden layers. Critical for understanding forward propagation.
            </p>
            <div className="space-y-3">
              {[
                { icon: Bookmark, label: 'Input Layer Basics' },
                { icon: PlayCircle, label: 'Hidden Layers Deep Dive' },
                { icon: Code, label: 'PyTorch Implementation' }
              ].map((res, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-white/2 border border-white/5 hover:border-primary/40 transition-all cursor-pointer">
                  <res.icon className="size-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-tight text-slate-300">{res.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Key Terminologies</h4>
          <div className="flex flex-wrap gap-2">
            {['Neurons', 'Weights', 'Biases', 'Tensors', 'Softmax'].map(term => (
              <span key={term} className="px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 text-[9px] font-black text-primary uppercase tracking-widest">
                {term}
              </span>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
