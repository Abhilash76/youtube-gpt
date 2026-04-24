import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Sparkles, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      // Extract YouTube ID for the player
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      navigate(`/video/${videoId}`);
    } catch (err) {
      alert("Failed to process video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-10">
      <section className="relative p-12 rounded-[40px] bg-primary overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-5xl font-black text-white mb-6 tracking-tighter">
            Interact with any <span className="text-blue-200 underline">YouTube Video</span>
          </h2>
          <form onSubmit={handleAnalyze} className="flex gap-3 mb-8">
            <input 
              type="text" 
              placeholder="Paste YouTube Link..."
              className="flex-1 px-6 py-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/50 outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button disabled={loading} className="px-8 py-4 bg-white text-primary rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">
              {loading ? 'Processing...' : 'Analyze'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}