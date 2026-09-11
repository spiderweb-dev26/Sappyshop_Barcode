import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, UserCheck, Sparkles, ArrowRight, Store, ShoppingBag, Boxes } from 'lucide-react';
import { User } from '../types';
import { soundEffects } from '../utils/soundEffects';
import confetti from 'canvas-confetti';
import { SappyLogoMark } from './SappyLogo';

interface WelcomeAnimationProps {
  user: User | null;
  onComplete: () => void;
  enableSound?: boolean;
}

export const WelcomeAnimation: React.FC<WelcomeAnimationProps> = ({ 
  user, 
  onComplete,
  enableSound = true 
}) => {
  const [progress, setProgress] = useState(0);

  // Time-of-day greeting
  const greetingTime = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const fullName = user?.name?.trim() || 'Store Operator';
  const role = user?.role || 'CASHIER';

  useEffect(() => {
    if (!user) return;

    // Confetti celebration burst
    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.55 },
        colors: ['#34d399', '#10b981', '#064e3b', '#fbbf24', '#f59e0b', '#ffffff']
      });
    } catch {
      // Ignore if blocked
    }

    // Audio chime
    if (enableSound) {
      soundEffects.playWelcomeChime();
    }

    // Progress bar animation
    const startTime = Date.now();
    const duration = 2200; // 2.2 seconds display

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(currentPct);

      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete();
      }
    }, 30);

    // Allow user to dismiss with Enter or Space
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        clearInterval(interval);
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, enableSound, onComplete]);

  if (!user) return null;

  const roleLabel = {
    ADMIN: 'Store Administrator',
    CASHIER: 'Cashier & POS Operator',
    INVENTORY_MANAGER: 'Inventory & Stock Manager',
    AUDITOR: 'Financial Auditor',
    VIEWER: 'Staff Member'
  }[role] || role;

  const roleIcon = {
    ADMIN: ShieldCheck,
    CASHIER: ShoppingBag,
    INVENTORY_MANAGER: Boxes,
    AUDITOR: Sparkles,
    VIEWER: UserCheck
  }[role] || UserCheck;

  const RoleIconComponent = roleIcon;

  // Initials for avatar
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');

  return (
    <AnimatePresence>
      <motion.div
        id="welcome-animation-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        onClick={onComplete}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md cursor-pointer select-none overflow-hidden"
      >
        {/* Ambient atmospheric glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-emerald-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.3)_0%,transparent_70%)] pointer-events-none" />

        {/* Central Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -15 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 24, 
            mass: 0.8 
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-gradient-to-b from-[#064e3b] to-[#043327] border border-emerald-400/30 rounded-3xl p-8 sm:p-10 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] text-center text-white overflow-hidden"
        >
          {/* Subtle gold ribbon line at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80" />

          {/* Animated User Avatar with radiant pulse */}
          <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
            {/* Spinning decorative orbit ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/40"
            />
            
            {/* Pulsing glow circle */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="absolute -inset-1.5 rounded-full bg-emerald-400/20 blur-xs"
            />

            {/* Core avatar circle */}
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-xl border-2 border-emerald-300/60 ${user.avatarColor || 'bg-emerald-600'} text-white`}>
              <span>{initials || 'SP'}</span>

              {/* Status Badge in corner */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-md border-2 border-[#064e3b]">
                <RoleIconComponent className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Terminal Session Verified Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold tracking-wider uppercase mb-3 shadow-inner"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Terminal Access Granted</span>
          </motion.div>

          {/* Main "Welcome, [User Full Name]" Headline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-1 mb-3"
          >
            <p className="text-emerald-200/90 text-sm sm:text-base font-medium tracking-wide">
              {greetingTime},
            </p>
            <h1 
              id="welcome-user-fullname"
              className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm font-sans"
            >
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-amber-200">{fullName}</span>!
            </h1>
          </motion.div>

          {/* Role badge & message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-2 mb-6"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-emerald-100 text-xs font-medium border border-white/10">
              <RoleIconComponent className="w-3.5 h-3.5 text-amber-300" />
              <span>{roleLabel}</span>
            </div>
            <p className="text-xs text-emerald-200/70 max-w-xs mx-auto">
              Your workstation is ready with live inventory, rapid scanning, and POS register.
            </p>
          </motion.div>

          {/* Progress Loading Bar */}
          <div className="space-y-2">
            <div className="w-full bg-emerald-950/80 rounded-full h-2 overflow-hidden p-0.5 border border-emerald-500/30">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-300/80 font-mono">
              <span>Loading Terminal...</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Click to continue fast */}
          <button
            type="button"
            onClick={onComplete}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-emerald-300/80 hover:text-white transition-colors cursor-pointer"
          >
            <span>Tap anywhere to jump in</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
