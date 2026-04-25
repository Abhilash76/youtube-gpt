import React, { useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function Notebook() {
  const [messages, setMessages] = useState([{ role: 'ai', text: "Hello! I've indexed the research. Ask me anything." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Connection to AI lost." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto space-y-6 mb-6 scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'ai' && <div className="size-10 bg-primary rounded-xl flex items-center justify-center shrink-0"><Bot size={20}/></div>}
            <div className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/10'}`}>
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && <Loader2 className="animate-spin text-primary mx-auto" />}
      </div>
      <div className="relative">
        <input 
          className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 ring-primary"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-primary rounded-xl">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}