/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  PlayCircle, 
  Rocket, 
  Sparkles, 
  Search, 
  Loader2, 
  Youtube, 
  Clock, 
  ChevronRight,
  AlertCircle,
  BrainCircuit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const navigate = useNavigate();

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setVideos([]); // Reset grid for new search
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: topic }),
      });

      const data = await response.json();

      if (response.ok) {
        // Normalizing different possible backend response structures
        const results = Array.isArray(data) ? data : (data.videos || data.results || []);
        
        // Ensure we are only taking valid video objects
        const validVideos = results.map((v: any) => ({
          ...v,
          // Fallback logic for thumbnail keys
          img: v.thumbnails?.[0]?.url || v.thumbnail || v.image,
          id: v.id || v.videoId,
          author: v.channel?.name || v.author?.name || v.author,
          duration: v.duration?.text || v.duration || 'Video'
        }));

        setVideos(validVideos);
      } else {
        throw new Error(data.detail || 'Search failed');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        {/* Abstract Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-30 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
        >
          <Sparkles size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AI-Powered Video Research</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.85]"
        >
          SEARCH. ANALYZE.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-blue-500">UNDERSTAND.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl text-slate-400 text-lg md:text-xl mb-12 leading-relaxed font-medium"
        >
          The ultimate engine for YouTube intelligence. Extract insights, summarize complex topics, and chat with any video in seconds.
        </motion.p>

        {/* Dynamic Search Bar */}
        <motion.form 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleResearch}
          className="w-full max-w-3xl relative"
        >
          <div className="relative flex items-center p-2 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-xl focus-within:border-primary/50 focus-within:ring-4 ring-primary/10 transition-all duration-500">
            <div className="pl-6 text-slate-500">
              <Search size={22} />
            </div>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What do you want to learn today?"
              className="flex-1 bg-transparent border-none outline-none px-6 py-5 text-white placeholder:text-slate-600 text-lg font-medium"
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-blue-600 disabled:opacity-50 text-white px-10 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all flex items-center gap-3 group shadow-xl shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>Research <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </div>
        </motion.form>
      </section>

      {/* Results Section */}
      <AnimatePresence>
        {videos.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-6 pb-32"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Youtube size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Intelligence Feed</h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Results for: {topic}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video, idx) => (
                <motion.div
                  key={video.id + idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(`/video/${video.id}`, { state: { video } })}
                  className="group relative bg-white/[0.02] border border-white/5 rounded-[40px] overflow-hidden cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={video.img} 
                      alt={video.title}
                      className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="size-16 rounded-full bg-primary/90 text-white flex items-center justify-center backdrop-blur-md shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                        <PlayCircle size={32} />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <h4 className="font-bold text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors text-sm">
                      {video.title || 'Untitled Research Video'}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span className="truncate max-w-[150px]">{video.author || video.channel_name || 'YouTube Education'}</span>
                      <div className="flex items-center gap-1"><Clock size={10}/> {video.duration || 'Video'}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Suggested Topics */}
      {videos.length === 0 && !loading && (
        <section className="flex flex-wrap justify-center gap-3 mt-12 max-w-3xl mx-auto px-6">
          {['Quantum Computing', 'Neural Networks', 'Roman Empire', 'Photosynthesis', 'SpaceX Starship', 'React Components'].map(t => (
            <button 
              key={t}
              onClick={() => setTopic(t)}
              className="px-6 py-3 rounded-2xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
            >
              {t}
            </button>
          ))}
        </section>
      )}

      {/* Feature Section Placeholder */}
      {videos.length === 0 && !loading && (
        <section className="max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            { icon: <Rocket />, title: "Instant Indexing", desc: "Process any video URL or topic search in real-time." },
            { icon: <BrainCircuit />, title: "Contextual RAG", desc: "Chat with your data using advanced vector embeddings." },
            { icon: <Sparkles />, title: "Smart Synthesis", desc: "Get condensed summaries of hour-long lectures instantly." }
          ].map((f, i) => (
            <div key={i} className="space-y-4">
              <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">{f.icon}</div>
              <h4 className="text-sm font-black uppercase tracking-widest">{f.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}