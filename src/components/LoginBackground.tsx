import React, { useState, useEffect } from 'react';
import { 
  Store, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  BookOpen, 
  PenTool, 
  Sparkles, 
  Clock,
  Compass,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SappyLogoMark } from './SappyLogo';

interface LoginBackgroundProps {
  children: React.ReactNode;
  onQuickFill?: (email: string, pin: string) => void;
}

export const LoginBackground: React.FC<LoginBackgroundProps> = ({ children, onQuickFill }) => {
  const { users } = useApp();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full relative bg-[#04130e] text-slate-100 flex flex-col justify-between overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* 1. ATMOSPHERIC RADIAL GLOW LAYERS */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 50% 35%, rgba(6, 78, 59, 0.45) 0%, rgba(4, 30, 22, 0.25) 45%, transparent 70%),
            radial-gradient(circle at 10% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
            radial-gradient(circle at 90% 15%, rgba(16, 185, 129, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 80% 85%, rgba(6, 95, 70, 0.15) 0%, transparent 45%)
          `
        }}
      />

      {/* 2. STATIONERY DOT-GRID & NOTEBOOK MATRIX OVERLAY */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.07] z-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, #34d399 1px, transparent 1px),
            linear-gradient(to right, rgba(52, 211, 153, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(52, 211, 153, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 120px 120px, 120px 120px'
        }}
      />

      {/* 3. DRAFTING RULER TICK ACCENT (TOP EDGE) */}
      <div className="absolute top-0 inset-x-0 h-6 border-b border-emerald-500/10 pointer-events-none z-0 flex items-center justify-between px-4 text-[9px] font-mono text-emerald-500/30 overflow-hidden select-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex items-end gap-1 h-full pb-0.5">
            <span className="h-3.5 w-[1px] bg-emerald-500/30"></span>
            <span className="hidden sm:inline">{i * 25}mm</span>
            <span className="h-2 w-[1px] bg-emerald-500/20"></span>
            <span className="h-1.5 w-[1px] bg-emerald-500/15"></span>
            <span className="h-2 w-[1px] bg-emerald-500/20"></span>
          </div>
        ))}
      </div>

      {/* 4. STATIONERY & DRAFTING WATERMARK OUTLINES */}
      <div className="absolute top-16 left-8 pointer-events-none opacity-[0.035] text-emerald-300 hidden lg:block select-none">
        <PenTool className="w-48 h-48 transform -rotate-12" strokeWidth={1} />
      </div>

      <div className="absolute bottom-16 right-8 pointer-events-none opacity-[0.035] text-amber-200 hidden lg:block select-none">
        <BookOpen className="w-56 h-56 transform rotate-6" strokeWidth={1} />
      </div>

      <div className="absolute bottom-28 left-12 pointer-events-none opacity-[0.025] text-emerald-200 hidden md:block select-none">
        <Compass className="w-40 h-40 transform -rotate-45" strokeWidth={1} />
      </div>

      {/* 5. TOP BRAND HEADER / SYSTEM STATUS */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-950 border border-emerald-400/30 flex items-center justify-center shadow-lg shadow-emerald-950/40">
            <SappyLogoMark size={20} color="#6ee7b7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight uppercase font-sans">
                SAPPY STATIONERY
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 tracking-wider">
                POS v2.4
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/60 font-medium">
              Retail Inventory & Terminal Management System
            </p>
          </div>
        </div>

        {/* Right: Live Terminal Telemetry */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-bold">SYSTEM ONLINE</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-emerald-200/70 text-[11px] px-3 py-1 rounded-lg bg-white/5 border border-white/10">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{currentDate}</span>
            <span className="text-emerald-400 font-bold">{currentTime}</span>
          </div>
        </div>
      </header>

      {/* 6. MAIN AUTH CARD CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-6 px-3 sm:px-4">
        {children}
      </main>

      {/* 7. BOTTOM SECURITY FOOTER */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-emerald-300/60 font-mono border-t border-emerald-500/10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Offline-Ready Local Database & Cloud Protection</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Multi-Terminal Retail Security</span>
          <span className="hidden sm:inline">•</span>
          <span>© {new Date().getFullYear()} Sappy Stationery Store</span>
        </div>
      </footer>

    </div>
  );
};
