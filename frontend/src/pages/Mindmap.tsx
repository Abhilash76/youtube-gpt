import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchWithRetry } from '../lib/apiUtils';
import mermaid from 'mermaid';
import { 
  Plus, 
  Minus, 
  Maximize, 
  Zap, 
  Activity,
  ChevronUp,
  ChevronDown,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  mindmap: {
    padding: 20
  }
});

export default function Mindmap() {
  const location = useLocation();
  
  let savedData = null;
  try {
    const raw = localStorage.getItem('class-gpt-data');
    if (raw) savedData = JSON.parse(raw);
  } catch (e) {}

  const transcriptText = location.state?.transcript || savedData?.transcript || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mindmapData, setMindmapData] = useState<string | null>(null);
  
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const mermaidRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  const fetchMindmap = useCallback(async () => {
    if (!transcriptText) {
      setError("No transcript data available to generate Mindmap.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetchWithRetry('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_text: transcriptText })
      }, 5);
      
      const data = await res.json();
      setMindmapData(data.mind_map);
    } catch (err: any) {
      setError(err.message || "Failed to load Mindmap");
    } finally {
      setLoading(false);
    }
  }, [transcriptText]);

  const fetchSummary = useCallback(async () => {
    if (!transcriptText) return;
    setSummaryLoading(true);
    try {
      const res = await fetchWithRetry('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript_text: transcriptText })
      });
      const data = await res.json();
      setSummary(data.summary);
    } catch (e) {
      console.error("Failed to fetch summary", e);
    } finally {
      setSummaryLoading(false);
    }
  }, [transcriptText]);

  useEffect(() => {
    fetchMindmap();
    fetchSummary();
  }, [fetchMindmap, fetchSummary]);

  useEffect(() => {
    if (mindmapData && mermaidRef.current) {
      mermaidRef.current.innerHTML = '';
      mermaid.render('mindmap-svg', mindmapData).then((result) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = result.svg;
          // Force the SVG to take up visible space
          const svgElement = mermaidRef.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.width = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.minHeight = '60vh';
          }
        }
      }).catch((e) => {
        console.error("Mermaid rendering failed:", e);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<div class="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">Failed to render mindmap: ${e.message}</div>`;
        }
      });
    }
  }, [mindmapData]);

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background-dark/20 space-y-4 min-h-screen">
        <Zap className="size-12 text-primary" />
        <p className="text-slate-400">{error}</p>
        <button onClick={() => fetchMindmap()} className="px-6 py-2 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs">
          Retry Component
        </button>
      </div>
    );
  }

  if (loading || !mindmapData) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-background-dark/20 space-y-4 min-h-screen">
        <Activity className="size-12 text-primary animate-pulse" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Generating Mindmap...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-background-dark/20 uppercase tracking-tight min-h-screen">
      <main className="flex-1 relative flex items-center justify-center overflow-auto">
        <div className="absolute top-6 left-6 z-10 flex gap-3">
          <div className="flex glass-effect rounded-xl shadow-2xl p-1 bg-black/40">
            <button onClick={() => setZoom(z => z + 0.2)} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300"><Plus className="size-5" /></button>
            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300 border-x border-white/5"><Minus className="size-5" /></button>
            <button onClick={() => setZoom(1)} className="p-2.5 hover:bg-white/10 rounded-lg text-slate-300"><Maximize className="size-5" /></button>
          </div>
        </div>

        <div className="w-full h-full flex items-center justify-center p-8 mt-12 pb-24">
           <div 
             ref={mermaidRef} 
             style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
             className="w-full h-full flex justify-center items-center transition-transform duration-300 [&>svg]:max-w-6xl [&>svg]:w-full"
           />
        </div>
      </main>

      <div className="absolute bottom-0 left-0 w-full z-20 flex justify-center pb-8 pointer-events-none">
        <div className="w-full max-w-4xl px-4 pointer-events-auto">
          <div className="glass-effect rounded-2xl shadow-2xl border border-white/10 bg-black/80 backdrop-blur-3xl overflow-hidden transition-all duration-500">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5"
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
            >
              <div className="flex items-center gap-3">
                <FileText className="text-primary size-5" />
                <span className="font-black text-sm uppercase tracking-widest text-white">Video Summary</span>
                {summaryLoading && <Activity className="size-4 animate-spin text-slate-500" />}
              </div>
              <button className="p-1 text-slate-400 hover:text-white transition-colors">
                {isSummaryExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            </div>
            
            <AnimatePresence>
              {isSummaryExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5"
                >
                  <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {summary ? (
                      <div 
                         className="text-sm text-slate-300 leading-relaxed normal-case"
                         dangerouslySetInnerHTML={{__html: summary.replace(/\n/g, '<br/>')}}
                      />
                    ) : summaryLoading ? (
                      <p className="text-slate-500 text-xs text-center py-8 uppercase tracking-widest">Generating Summary...</p>
                    ) : (
                      <p className="text-red-400 text-xs text-center py-8 uppercase tracking-widest">Failed to load summary</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
