/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Loader2, 
  FileText, 
  BrainCircuit, 
  Send,
  Youtube,
  ChevronLeft,
  AlertCircle,
  Bot,
  User
} from 'lucide-react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const videoData = location.state?.video || {};
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'transcript'>('summary');
  const [loading, setLoading] = useState({ transcript: true, summary: true, rag: true, chat: false });
  const [data, setData] = useState({ summary: '', transcript: '' });
  const [error, setError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatStatus, setChatStatus] = useState("");

  const statusMessages = [
    "Searching through video context...",
    "Finding relevant transcript chunks...",
    "Ranking chunks for semantic similarity...",
    "Synthesizing answer from retrieved data..."
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatStatus]);

  useEffect(() => {
    if (!id) return;
    const fullUrl = `https://www.youtube.com/watch?v=${id}`;

    const startProcessingPipeline = async () => {
      try {
        setError(null);
        const transcriptRes = await fetch('/api/transcript', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_url: fullUrl, title: videoData.title || "Research Video" }),
        });

        if (!transcriptRes.ok) throw new Error("Failed to fetch transcript");
        const transcriptData = await transcriptRes.json();
        setData(prev => ({ ...prev, transcript: transcriptData.transcript }));
        setLoading(prev => ({ ...prev, transcript: false }));

        const summaryPromise = fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript_text: transcriptData.transcript }),
        });

        const ingestPromise = fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video_id: transcriptData.video_id, transcript_text: transcriptData.transcript }),
        });

        const [sRes] = await Promise.all([summaryPromise, ingestPromise]);
        if (sRes.ok) {
          const sData = await sRes.json();
          setData(prev => ({ ...prev, summary: sData.summary }));
        }
        setLoading(prev => ({ ...prev, summary: false, rag: false }));

      } catch (err: any) {
        setError("AI pipeline failed.");
        setLoading({ transcript: false, summary: false, rag: false, chat: false });
      }
    };
    startProcessingPipeline();
  }, [id, videoData.title]);

  const handleChat = async () => {
    if (!chatInput.trim() || !id || loading.chat) return;
    const userQuery = chatInput;
    setMessages(prev => [...prev, { role: 'user', text: userQuery }]);
    setChatInput('');
    setLoading(prev => ({ ...prev, chat: true }));
    setIsStreaming(false);

    let sIdx = 0;
    setChatStatus(statusMessages[0]);
    const statusInterval = setInterval(() => {
      sIdx++;
      if (sIdx < statusMessages.length) setChatStatus(statusMessages[sIdx]);
      else clearInterval(statusInterval);
    }, 20000);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: id, query: userQuery }),
      });
      if (!response.ok) throw new Error("Chat error");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      setIsStreaming(true);
      setLoading(prev => ({ ...prev, chat: false }));
      clearInterval(statusInterval);
      setChatStatus("");

      setMessages(prev => [...prev, { role: 'ai', text: '' }]);
      let acc = "";
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].text = acc;
          return newMsgs;
        });
      }
    } catch (err) {
      clearInterval(statusInterval);
      setMessages(prev => [...prev, { role: 'ai', text: "Error in chat stream." }]);
    } finally {
      setLoading(prev => ({ ...prev, chat: false }));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#050505] overflow-hidden">
      
      {/* LEFT COLUMN: Fixed to Viewport via min-h-0 */}
      <main className="flex-1 flex flex-col min-h-0 bg-black/20 border-r border-white/5">
        <header className="p-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
              <ChevronLeft size={20} />
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Youtube size={14} /> Knowledge Ingestion Engine
            </div>
          </div>
          {error && <div className="text-red-500 text-[10px] font-black uppercase flex items-center gap-2"><AlertCircle size={14} /> Error</div>}
        </header>

        {/* This scrollbar-hide container will now stay within the 100vh limit */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-8 space-y-8">
          <div className="w-full aspect-video rounded-[32px] overflow-hidden bg-black border border-white/5 shadow-2xl shrink-0">
            <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${id}?autoplay=1`} frameBorder="0" allowFullScreen></iframe>
          </div>
          
          <div className="space-y-4">
             <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
               {videoData.title || "Loading Material..."}
             </h1>
             <p className="text-sm text-slate-500 font-medium">Source: YouTube Intelligence Index</p>
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR: Standard Layout */}
      <aside className="w-full lg:w-[480px] h-full bg-[#0A0A0B] flex flex-col shrink-0 overflow-hidden">
        
        <div className="p-6 shrink-0 border-b border-white/5">
          <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5">
            {['summary', 'chat', 'transcript'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab === 'chat' ? 'RAG Chat' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-8 py-6 flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto pr-2 scrollbar-hide">
                {loading.summary ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500">
                    <Loader2 className="animate-spin text-primary" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Processing...</p>
                  </div>
                ) : (
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-10">
                    {data.summary}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-2 scrollbar-hide">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'ai' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'}`}>
                        {m.role === 'ai' ? <Bot size={16}/> : <User size={16}/>}
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${m.role === 'ai' ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-primary text-white'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}

                  {loading.chat && !isStreaming && (
                    <div className="flex gap-3">
                      <div className="size-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0"><Loader2 size={16} className="animate-spin" /></div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 w-full">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">AI Thinking</p>
                        <p className="text-xs text-slate-400 animate-pulse">{chatStatus}</p>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="relative mt-auto shrink-0 pb-2">
                  <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Ask about this video..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-sm text-white outline-none focus:ring-2 ring-primary transition-all"
                  />
                  <button onClick={handleChat} disabled={loading.chat} className="absolute right-2 top-2 h-10 aspect-square bg-primary rounded-xl flex items-center justify-center text-white mt-1">
                    <Send size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'transcript' && (
              <motion.div key="transcript" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto pr-2 scrollbar-hide pb-10">
                <div className="text-[11px] leading-loose text-slate-500 font-mono bg-black/40 p-6 rounded-2xl border border-white/5 whitespace-pre-wrap">
                  {data.transcript || "Loading transcript..."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}