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
  AlertCircle
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
          imgUrl: v.thumbnail || v.thumbnail_url || (v.thumbnails && v.thumbnails.high?.url) || v.thumbnails?.[0]?.url
        }));

        setVideos(validVideos.slice(0, 6)); // Display top results
      } else {
        alert(`Search Error: ${data.detail || 'The YouTube agent failed to find videos.'}`);
      }
    } catch (err) {
      console.error('Connection Error:', err);
      alert("Backend Connection Failed. Make sure your Python server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto">
      {/* Hero Search Section */}
      <section className={`relative p-12 rounded-[40px] overflow-hidden bg-primary transition-all duration-700 shadow-2xl shadow-primary/20 ${videos.length > 0 ? 'py-10' : 'min-h-[450px] flex flex-col justify-center'}`}>
        <motion.div layout className="relative z-10 max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Sparkles className="size-4" /> Scholar Research Agent
          </motion.div>

          <h2 className={`font-black text-white mb-8 leading-tight tracking-tighter transition-all duration-500 ${videos.length > 0 ? 'text-4xl' : 'text-6xl'}`}>
            {videos.length > 0 ? (
              <>Sources for <span className="text-blue-200 italic">"{topic}"</span></>
            ) : (
              <>Research Any Topic via <br/><span className="text-blue-200 italic underline decoration-blue-400/50">YouTube Intelligence.</span></>
            )}
          </h2>
          
          <form onSubmit={handleResearch} className="relative group max-w-2xl mx-auto">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-6 text-white/40 group-focus-within:text-white" />
            <input 
              type="text" 
              placeholder="Enter a topic (e.g., Quantum Physics, Stock Analysis...)"
              className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] py-6 pl-16 pr-44 text-white placeholder:text-white/40 outline-none focus:ring-4 ring-white/10 text-lg font-medium"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <button 
              disabled={loading}
              className="absolute right-3 top-3 bottom-3 px-8 bg-white text-primary rounded-[24px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin size-5" /> : <Rocket className="size-5" />}
              {loading ? 'Fetching...' : 'Research'}
            </button>
          </form>
        </motion.div>
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-transparent pointer-events-none" />
      </section>

      {/* Video Results Grid */}
      <AnimatePresence mode="wait">
        {videos.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Video Content Synthesized</h3>
              <button onClick={() => setVideos([])} className="text-[10px] font-black uppercase text-slate-400 hover:text-white">New Search</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {videos.map((video, index) => (
                <motion.div 
                  key={video.id || video.video_id || index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/video/${video.id || video.video_id}`, { state: { video } })}
                  className="group cursor-pointer bg-white/[0.02] rounded-[32px] border border-white/5 overflow-hidden hover:border-primary/50 transition-all shadow-xl"
                >
                  <div className="aspect-video relative overflow-hidden bg-slate-900">
                    {video.imgUrl ? (
                      <img 
                        src={video.imgUrl} 
                        alt={video.title} 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                        onError={(e) => {
                          // Handle broken images by showing a placeholder
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Youtube className="size-12 text-slate-700" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="size-14 rounded-full bg-primary flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform">
                        <PlayCircle size={28} />
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

      {/* Suggested Topics (Placeholder State) */}
      {videos.length === 0 && !loading && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-40">
          {['Quantum Physics', 'Neural Networks', 'Global Economics', 'Philosophy 101'].map(t => (
            <div key={t} className="p-8 rounded-[32px] border border-white/5 bg-white/[0.02]">
              <div className="h-4 w-2/3 bg-white/10 rounded mb-4" />
              <div className="h-2 w-1/2 bg-white/5 rounded" />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}