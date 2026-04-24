import React, { useState } from 'react';
import { Bot, Send, User, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Notebook() {
  const [messages, setMessages] = useState([{ role: 'ai', text: "I've analyzed the video. What would you like to know?" }]);
  const [input, setInput] = useState('');

  const handleChat = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Error connecting to backend." }]);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background-dark/20 p-8">
      <div className="flex-1 overflow-y-auto space-y-6 mb-8 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'ai' && <div className="size-10 rounded-xl bg-primary flex items-center justify-center"><Bot className="text-white"/></div>}
            <div className={`p-5 rounded-2xl max-w-lg ${msg.role === 'user' ? 'bg-primary/40' : 'glass-effect'}`}>
              <p className="text-sm font-light leading-relaxed">{msg.text}</p>
            </div>
            {msg.role === 'user' && <div className="size-10 rounded-full bg-slate-700"></div>}
          </div>
        ))}
      </div>
      <div className="relative">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChat()}
          className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 ring-primary"
          placeholder="Ask a question about the video..."
        />
        <button onClick={handleChat} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-primary rounded-xl hover:scale-110 transition-all">
          <Send className="size-5" />
        </button>
      </div>
    </div>
  );
}