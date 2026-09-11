import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Lock,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole, MASTER_PASSCODE } from '../types';
import { SappyLogoMark } from './SappyLogo';
import { LoginBackground } from './LoginBackground';
import confetti from 'canvas-confetti';

export const AuthAnimationPage: React.FC = () => {
  const { 
    currentUser, 
    users,
    loginUser, 
    signupUser, 
    setActiveTab, 
    addToast
  } = useApp();

  // Auth Mode: If no users exist yet, default to 'signup' so user sets up their account
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>(() => {
    return (users && users.length > 0) ? 'signin' : 'signup';
  });

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('sappy_terminal_saved_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('CASHIER');
  const [masterCode, setMasterCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showMasterCode, setShowMasterCode] = useState(false);
  const [rememberTerminal, setRememberTerminal] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingNotice, setPendingNotice] = useState<{ name: string; email: string; role: string } | null>(null);

  const isMasterCodeValid = masterCode.trim() === MASTER_PASSCODE;

  const toggleAuthMode = (newMode: 'signup' | 'signin') => {
    if (newMode === authMode) return;
    setAuthMode(newMode);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (authMode === 'signup') {
        if (!name.trim()) {
          addToast('error', 'Full name required', 'Please enter your staff or admin name.');
          setIsSubmitting(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          addToast('error', 'Valid email required', 'Please enter a valid email address.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 4) {
          addToast('error', 'Password / PIN too short', 'Please provide at least 4 characters or a PIN.');
          setIsSubmitting(false);
          return;
        }

        if (selectedRole === 'ADMIN' && !isMasterCodeValid && users.length > 0) {
          addToast('error', 'Master Passcode Required', 'Please enter the valid Master Passcode to register with Admin permissions.');
          setIsSubmitting(false);
          return;
        }

        const roleToAssign = isMasterCodeValid ? (selectedRole || 'ADMIN') : selectedRole;
        const result = signupUser(name, email, password, roleToAssign, masterCode);
        if (result.success) {
          if (result.requiresApproval) {
            setPendingNotice({
              name: name.trim(),
              email: email.trim(),
              role: roleToAssign
            });
            setName('');
            setPassword('');
            setMasterCode('');
            setAuthMode('signin');
          } else {
            if (rememberTerminal && email.trim()) {
              try {
                localStorage.setItem('sappy_terminal_saved_email', email.trim());
              } catch { /* ignore */ }
            }
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
              colors: ['#064e3b', '#10b981', '#fbbf24', '#f59e0b']
            });
            setTimeout(() => {
              setActiveTab('dashboard');
            }, 400);
          }
        }
      } else {
        // Sign in
        if (!email.trim()) {
          addToast('error', 'Credentials required', 'Please enter your email or staff name.');
          setIsSubmitting(false);
          return;
        }

        const success = loginUser(email, password);
        if (success) {
          if (rememberTerminal && email.trim()) {
            try {
              localStorage.setItem('sappy_terminal_saved_email', email.trim());
            } catch { /* ignore */ }
          } else {
            try {
              localStorage.removeItem('sappy_terminal_saved_email');
            } catch { /* ignore */ }
          }
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#064e3b', '#34d399', '#fbbf24']
          });
          setTimeout(() => {
            setActiveTab('dashboard');
          }, 400);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bladeSkew = -5;
  const currentBladeSkew = isDesktop ? (authMode === 'signup' ? bladeSkew : -bladeSkew) : 0;
  const currentCounterSkew = isDesktop ? (authMode === 'signup' ? -bladeSkew : bladeSkew) : 0;

  return (
    <LoginBackground>
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center font-sans px-2 sm:px-4">
        {/* Standalone Morphing Auth Card */}
        <div className="relative w-full min-h-[480px] bg-[#f8f4ec] text-slate-900 rounded-[24px] sm:rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden border border-[#e5dec9] flex flex-col md:flex-row transition-all duration-300">
        
        {/* Form Area with Warm Off-White / Cream Theme */}
        <div className={`w-full md:w-7/12 p-8 sm:p-10 flex flex-col justify-center bg-[#f8f4ec] relative z-10 ${
          authMode === 'signup' ? 'md:order-2' : 'md:order-1'
        }`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={authMode}
              initial={{ opacity: 0, x: authMode === 'signup' ? 15 : -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: authMode === 'signup' ? -15 : 15 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mb-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 border border-emerald-300/80 px-2.5 py-1 rounded-full w-fit mb-2.5">
                  <Lock className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>256-Bit Encrypted Terminal • Protected Session</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {authMode === 'signup' ? 'Create account' : 'Sign in'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {authMode === 'signup' 
                    ? 'Enter details to create an account. Master code unlocks all permissions.' 
                    : 'Enter your credentials or staff PIN to unlock this terminal session.'}
                </p>
              </div>

              {authMode === 'signin' && users.length > 0 && (
                <div className="mb-4 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Quick Select Profile</span>
                    <span className="text-[10px] text-slate-400 font-normal">Tap to auto-fill</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {users
                      .filter(u => u.approvalStatus !== 'REJECTED' && u.active)
                      .slice(0, 6)
                      .map(u => {
                        const isSelected = email.toLowerCase() === u.email.toLowerCase() || email.toLowerCase() === u.name.toLowerCase();
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setEmail(u.email || u.name);
                              setPassword('');
                              const pwdInput = document.getElementById('auth-password-input');
                              if (pwdInput) pwdInput.focus();
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs'
                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${u.role === 'ADMIN' ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                            <span className="truncate max-w-[110px]">{u.name.split(' ')[0]}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                              isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {u.role}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {authMode === 'signin' && pendingNotice && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs mb-4 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-950">Registration Submitted: Awaiting Admin Approval</div>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Staff account for <strong>{pendingNotice.name}</strong> ({pendingNotice.role}) has been submitted. A Store Administrator must approve this account before you can sign in.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name Field (Signup only) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full bg-transparent border-b border-slate-300 focus:border-[#064e3b] pb-2 pt-1 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-colors pr-8"
                      />
                      <UserIcon className="w-4 h-4 text-slate-400 absolute right-1 top-2" />
                    </div>
                  </div>
                )}

                {/* Email / Username Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {authMode === 'signup' ? 'Email Address' : 'Email or Staff Name'}
                  </label>
                  <div className="relative">
                    <input
                      type={authMode === 'signup' ? 'email' : 'text'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={authMode === 'signup' ? 'name@sappypos.com' : 'Enter email or name'}
                      className="w-full bg-transparent border-b border-slate-300 focus:border-[#064e3b] pb-2 pt-1 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-colors pr-8"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-1 top-2" />
                  </div>
                </div>

                {/* Password / PIN Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Password / PIN</span>
                      <span className="text-[10px] text-emerald-800 font-mono font-medium bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300">SHA-256</span>
                    </label>
                    {authMode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => addToast('info', 'PIN Assistance', 'Please contact your store administrator to reset your PIN or use the Master Passcode.')}
                        className="text-xs text-slate-600 hover:text-emerald-800 font-medium"
                      >
                        Forgot PIN?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-b border-slate-300 focus:border-[#064e3b] pb-2 pt-1 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none transition-colors pr-8 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Master Passcode Field (Signup only) */}
                {authMode === 'signup' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-800" />
                        <span>Master Security Code</span>
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Unlocks Admin & All Permissions
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type={showMasterCode ? 'text' : 'password'}
                        value={masterCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMasterCode(val);
                          if (val.trim() === MASTER_PASSCODE) {
                            setSelectedRole('ADMIN');
                          }
                        }}
                        placeholder="Enter master code for all permissions"
                        className={`w-full bg-transparent border-b pb-2 pt-1 text-sm font-mono placeholder-slate-400 focus:outline-none transition-colors pr-8 tracking-wider ${
                          isMasterCodeValid 
                            ? 'border-emerald-600 text-emerald-900 font-bold bg-emerald-50/50' 
                            : 'border-slate-300 focus:border-[#064e3b] text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowMasterCode(!showMasterCode)}
                        className="absolute right-1 top-2 text-slate-400 hover:text-slate-700"
                      >
                        {showMasterCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {isMasterCodeValid && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-md border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Master Code Verified — All System Permissions & Admin Role Granted!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Role Selection (Signup only) */}
                {authMode === 'signup' && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Assigned Role & Permissions
                      </label>
                      {isMasterCodeValid && (
                        <span className="text-[10px] font-bold text-emerald-700 uppercase">
                          All Permissions Unlocked
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['CASHIER', 'MANAGER', 'AUDITOR', 'ADMIN'] as UserRole[]).map((r) => {
                        const isSelected = selectedRole === r;
                        const isLocked = r === 'ADMIN' && !isMasterCodeValid;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                addToast('warning', 'Master Code Required', 'Enter the Master Security Code above to unlock the Admin role with all permissions.');
                              } else {
                                setSelectedRole(r);
                              }
                            }}
                            className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border text-center transition-all relative ${
                              isSelected
                                ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs'
                                : isLocked
                                ? 'bg-slate-100/80 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-white/70 text-slate-700 border-slate-300 hover:bg-white'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-1">
                              {isLocked && <Lock className="w-2.5 h-2.5 opacity-60" />}
                              {r}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedRole !== 'ADMIN' && !isMasterCodeValid && users.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-50/90 border border-amber-200 rounded-lg flex items-start gap-2 text-[11px] text-amber-900 leading-snug">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Admin Approval Required:</strong> Creating a {selectedRole} staff account requires approval from a Store Administrator before login is enabled.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Remember profile (Signin only) */}
                {authMode === 'signin' && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="remember-terminal"
                        checked={rememberTerminal}
                        onChange={(e) => setRememberTerminal(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-700 accent-[#064e3b]"
                      />
                      <label htmlFor="remember-terminal" className="text-xs text-slate-700 cursor-pointer select-none font-medium">
                        Remember staff profile on this terminal
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 pl-6">
                      For store security, PIN is never stored and login screen is always required on load.
                    </p>
                  </div>
                )}

                {/* Pill Action Button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-6 rounded-full bg-[#064e3b] hover:bg-[#085a44] text-white font-bold text-sm tracking-wide shadow-sm hover:shadow transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    <span>{authMode === 'signup' ? 'Create account' : 'Sign in'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Switch Link */}
                <div className="text-center pt-2">
                  <p className="text-xs text-slate-600">
                    {authMode === 'signup' ? (
                      <>
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => toggleAuthMode('signin')}
                          className="font-bold underline text-slate-900 hover:text-[#064e3b]"
                        >
                          Sign in
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => toggleAuthMode('signup')}
                          className="font-bold underline text-slate-900 hover:text-[#064e3b]"
                        >
                          Create account
                        </button>
                      </>
                    )}
                  </p>
                </div>

              </form>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Morphing Sliding Blade / Band (Dark Forest Green Panel) */}
        <motion.div
          layout
          transition={{
            type: 'spring',
            stiffness: 130,
            damping: 20
          }}
          style={{
            transform: `skewX(${currentBladeSkew}deg)`
          }}
          className={`w-full md:w-5/12 bg-[#04281e] text-white p-6 sm:p-9 flex flex-col justify-between relative overflow-hidden z-20 ${
            authMode === 'signup' ? 'md:order-1' : 'md:order-2'
          }`}
        >
          {/* Counter-skew inner container so all text & icons remain perfectly vertical */}
          <div 
            style={{
              transform: `skewX(${currentCounterSkew}deg)`
            }}
            className="h-full flex flex-col justify-between relative z-10"
          >
            {/* Sappy POS Brand Tag Top */}
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shadow-xs">
                  <SappyLogoMark size={18} color="#34d399" />
                </div>
                <span className="font-bold text-xs tracking-wider text-emerald-400 uppercase font-mono">
                  SAPPY POS
                </span>
              </div>
            </div>

            {/* Editorial Headline & Subtitle */}
            <div className="my-8 sm:my-auto">
              <AnimatePresence mode="wait">
                {authMode === 'signup' ? (
                  <motion.div
                    key="signup-blade-text"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      Start the <br />
                      <span className="font-serif italic font-normal text-amber-200">
                        first page.
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100/75 mt-3 leading-relaxed">
                      Create a staff profile or enter master code for full administrative permissions.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signin-blade-text"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                  >
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      {users.length > 0 ? (
                        <>
                          Welcome <br />
                          <span className="font-serif italic font-normal text-amber-200">
                            back.
                          </span>
                        </>
                      ) : (
                        <>
                          Sappy <br />
                          <span className="font-serif italic font-normal text-amber-200">
                            Stationary.
                          </span>
                        </>
                      )}
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100/75 mt-3 leading-relaxed">
                      {users.length > 0 
                        ? 'Sign in to access your inventory registers, sales terminal, and store analytics.'
                        : 'Create your store administrator account to begin managing inventory, barcode scanning, and sales.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Status */}
            <div className="pt-4 border-t border-emerald-800/40 flex items-center justify-between text-xs text-emerald-300/70">
              <span className="truncate">
                {users.length > 0 
                  ? `${users.length} Staff Profile${users.length > 1 ? 's' : ''} Configured` 
                  : 'Ready for Administrator Setup'}
              </span>
              <span className="font-mono uppercase font-bold text-emerald-400 shrink-0 ml-2">Terminal Active</span>
            </div>
          </div>

          {/* Subtle glowing edge seam */}
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent"></div>
        </motion.div>

      </div>
    </div>
  </LoginBackground>
  );
};
