/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Library, 
  BookOpen, 
  BrainCircuit, 
  GraduationCap, 
  Settings, 
  Plus, 
  History, 
  Trash2, 
  Users,
  Search,
  Bell,
  Share2,
  MoreVertical,
  ChevronRight,
  PlayCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from './lib/utils';

// Pages - defined placeholder style first to ensure build succeeds
import HomePage from './pages/Home';
import VideoPlayerPage from './pages/VideoPlayer';
import NotebookPage from './pages/Notebook';
import MindmapPage from './pages/Mindmap';
import QuizPage from './pages/Quiz';
import SettingsPage from './pages/Settings';

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Library, label: 'My Notebooks', path: '/notebook' },
  ];

  const secondaryItems = [
    { icon: Users, label: 'Shared', path: '#' },
    { icon: History, label: 'Recent', path: '#' },
    { icon: Trash2, label: 'Trash', path: '#' },
  ];

  return (
    <aside className="w-64 hidden lg:flex flex-col border-r border-white/10 dark:bg-background-dark/50 backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3">
        <Link to="/" className="size-10 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <BookOpen className="text-white size-6" />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight dark:text-white">LearnHub</h1>
          <p className="text-xs text-primary/60 font-medium">Pro Researcher</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
              location.pathname === item.path 
                ? "bg-primary/10 text-primary font-semibold" 
                : "text-slate-400 hover:bg-primary/10 hover:text-primary"
            )}
          >
            <item.icon className="size-5" />
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}

        <div className="pt-6 pb-2 px-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Library</span>
        </div>

        {secondaryItems.map((item) => (
          <Link
            key={item.label}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
          >
            <item.icon className="size-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 space-y-4">
        <div className="p-4 rounded-xl glass-effect relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Storage</p>
            <div className="h-1.5 w-full bg-slate-800 rounded-full mb-2">
              <div className="h-full bg-primary rounded-full w-3/4"></div>
            </div>
            <p className="text-[10px] text-slate-500">7.2 GB of 10 GB used</p>
          </div>
          <div className="absolute -right-4 -bottom-4 size-16 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all"></div>
        </div>
        
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-primary/10 hover:text-primary transition-colors">
          <Settings className="size-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
        
        <button className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-primary/30 transition-all active:scale-95">
          <Plus className="size-4" />
          <span className="text-sm">New Resource</span>
        </button>
      </div>
    </aside>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 glass-effect dark:border-white/5">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
          <input 
            className="w-full pl-11 pr-4 py-2 bg-primary/10 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm text-white placeholder:text-slate-500" 
            placeholder="Search your knowledge base..." 
            type="text" 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-4">
        <button className="p-2 rounded-lg hover:bg-primary/10 text-slate-400 transition-colors">
          <Bell className="size-5" />
        </button>
        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white uppercase tracking-tighter">Alex Rivera</p>
            <p className="text-[10px] text-slate-500 font-bold">Lvl 12 Explorer</p>
          </div>
          <Link to="/settings" className="size-10 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
              alt="Avatar" 
              className="rounded-full w-full h-full object-cover" 
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-background-dark dark:text-slate-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <Header />
          <main className="flex-1 overflow-y-auto scrollbar-hide">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/video/:id" element={<VideoPlayerPage />} />
              <Route path="/notebook" element={<NotebookPage />} />
              <Route path="/mindmap" element={<MindmapPage />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
