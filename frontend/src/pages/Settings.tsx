import React from 'react';
import { 
  User, 
  Shield, 
  CreditCard, 
  Bell, 
  Moon, 
  ChevronRight, 
  LogOut, 
  Smartphone,
  Globe,
  Database,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const sections = [
    {
      title: 'Personal Info',
      items: [
        { icon: User, label: 'Profile Settings', desc: 'Update name, avatar, and academic credentials' },
        { icon: Globe, label: 'Language & Region', desc: 'English (US), GMT-5' }
      ]
    },
    {
      title: 'Security & Access',
      items: [
        { icon: Shield, label: 'Login Security', desc: 'Password, 2FA, and active sessions' },
        { icon: Smartphone, label: 'Connected Devices', desc: 'Manage mobile and tablet access' }
      ]
    },
    {
      title: 'Billing & Storage',
      items: [
        { icon: CreditCard, label: 'Subscription Plan', desc: 'Insight Scholar Pro • $12/month' },
        { icon: Database, label: 'Storage Management', desc: '7.2 GB of 10 GB used' }
      ]
    }
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12 pb-20">
      <header className="flex items-end justify-between border-b border-white/5 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter uppercase mb-2">Account Center</h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Manage your learner profile and preferences</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all">
          <LogOut className="size-4" /> Sign Out
        </button>
      </header>

      {/* Profile Card */}
      <section className="flex flex-col md:flex-row items-center gap-8 p-10 rounded-3xl glass-effect border-primary/20 bg-linear-to-br from-primary/10 to-transparent">
        <div className="size-32 rounded-full border-4 border-primary/40 p-1 relative shadow-2xl">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" 
            alt="Alex" 
            className="rounded-full w-full h-full object-cover" 
          />
          <button className="absolute bottom-0 right-0 size-10 rounded-full bg-primary text-white border-4 border-background-dark flex items-center justify-center hover:scale-110 transition-transform">
            <User className="size-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">Alex Rivera</h2>
            <p className="text-primary font-bold text-sm uppercase tracking-widest">PHD CANDIDATE • COMPUTER SCIENCE</p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-400">
              MEMBER SINCE AUG 2023
            </div>
            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-400">
              45 COURSES COMPLETED
            </div>
          </div>
        </div>
        <button className="px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2">
          Verify Academic Status <ArrowRight className="size-4" />
        </button>
      </section>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] pl-2">{section.title}</h3>
            <div className="space-y-4">
              {section.items.map((item, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -2 }}
                  className="p-6 rounded-2xl bg-white/2 border border-white/5 hover:border-white/20 transition-all cursor-pointer group flex gap-5 items-start"
                >
                  <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <item.icon className="size-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white uppercase tracking-tight mb-1">{item.label}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed">{item.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-slate-700 mt-1" />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Subscription Callout */}
      <section className="p-10 rounded-3xl bg-slate-900 border border-white/5 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute top-0 right-0 size-64 bg-primary/20 blur-[100px] pointer-events-none"></div>
        <div className="relative z-10 max-w-xl">
          <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Level up with <span className="text-primary italic">Scholar Pro</span></h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Get unlimited AI credits, offline library access, and priority support for your most ambitious research projects.
          </p>
        </div>
        <button className="relative z-10 px-10 py-5 bg-white text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-2xl hover:bg-slate-100 transition-all">
          Upgrade Now
        </button>
      </section>
    </div>
  );
}
