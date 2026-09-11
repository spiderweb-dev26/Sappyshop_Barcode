import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole, MASTER_PASSCODE } from '../types';
import { X, ShieldCheck, Lock, KeyRound, CheckCircle2, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';

interface UserPinModalProps {
  isOpen?: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

export const UserPinModal: React.FC<UserPinModalProps> = ({ isOpen = true, onClose, targetUser }) => {
  const { users, currentUser, switchUser, settings } = useApp();
  const approvedUsers = (users || []).filter(u => u.approvalStatus === 'APPROVED' || !u.approvalStatus);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    targetUser?.id || currentUser?.id || approvedUsers[0]?.id || users[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [textPassword, setTextPassword] = useState<string>('');
  const [useTextPasswordMode, setUseTextPasswordMode] = useState<boolean>(false);
  const [showTextPassword, setShowTextPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || (users || []).length === 0) return null;

  const activeTarget = (users || []).find(u => u && u.id === selectedUserId) || approvedUsers[0] || currentUser;
  const isCurrentActiveUser = activeTarget?.id === currentUser?.id;
  const requirePin = settings.requirePinForSwitching ?? false;

  const handleKeyClick = (digit: string) => {
    if ((pin || '').length < 4) {
      const nextPin = (pin || '') + digit;
      setPin(nextPin);
      setErrorMsg('');
      if (nextPin.length === 4) {
        attemptLogin(selectedUserId, nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg('');
  };

  const attemptLogin = (userId: string, pinToVerify?: string) => {
    const success = switchUser(userId, pinToVerify);
    if (success) {
      setPin('');
      setTextPassword('');
      setErrorMsg('');
      onClose();
    } else {
      setErrorMsg('Incorrect PIN. Default is 1234 or Master Code.');
      setPin('');
    }
  };

  const handleQuickSwitchNoPin = () => {
    attemptLogin(selectedUserId);
  };

  const handleUseDefaultPin = () => {
    attemptLogin(selectedUserId, '1234');
  };

  const handleTextPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textPassword.trim()) return;
    attemptLogin(selectedUserId, textPassword.trim());
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'MANAGER':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'CASHIER':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'AUDITOR':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-emerald-100 w-full max-w-md overflow-hidden text-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">Terminal Access & Role Switcher</h3>
              <p className="text-[11px] text-emerald-200">Store Profile & Operator Session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
          {/* User selector cards */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Select User Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {approvedUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                const isCurrent = u.id === currentUser?.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPin('');
                      setTextPassword('');
                      setErrorMsg('');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" title="Active" />
                        )}
                      </div>
                      <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border uppercase inline-block mt-0.5 ${getRoleBadge(u.role)}`}>
                        {u.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Target Banner */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span className="text-xs text-slate-600">
                Selected: <strong className="text-slate-900">{activeTarget?.name || 'Staff User'}</strong>
              </span>
            </div>
            {isCurrentActiveUser ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
                Active Session
              </span>
            ) : requirePin ? (
              <span className="text-[10px] text-amber-700 font-mono font-bold bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full">
                PIN Verification
              </span>
            ) : (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 border border-emerald-300 px-2 py-0.5 rounded-full">
                Quick Access
              </span>
            )}
          </div>

          {/* If already active as this user: simply offer Dismiss / Continue */}
          {isCurrentActiveUser ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">You are already signed in as {activeTarget?.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your current terminal role is <strong className="text-emerald-800 font-bold">{activeTarget?.role}</strong>. No PIN verification is required.
                </p>
              </div>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  Continue Active Session
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* One-Click Quick Switch (No PIN Required) */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Instant Switch (No PIN Required)</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium">1-Click</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Switch terminal operator to <strong>{activeTarget?.name}</strong> immediately without entering a passcode.
                </p>
                <button
                  type="button"
                  onClick={handleQuickSwitchNoPin}
                  className="w-full h-9 bg-[#064e3b] hover:bg-[#085a44] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Switch to {activeTarget?.name.split(' ')[0]} Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Security Hint & Default PIN Banner */}
              <div className="flex items-center justify-between p-2 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  <span>Default PIN: <strong className="text-slate-900 font-mono">1234</strong></span>
                </span>
                <button
                  type="button"
                  onClick={handleUseDefaultPin}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                >
                  Fill Default 1234
                </button>
              </div>

              {/* Password Mode Toggle */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setUseTextPasswordMode(!useTextPasswordMode)}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 underline font-medium"
                >
                  {useTextPasswordMode ? 'Use 4-digit keypad instead' : 'Enter account password instead'}
                </button>
                <span className="text-[10px] text-slate-400 font-mono">Master Code: {MASTER_PASSCODE}</span>
              </div>

              {/* Text Password Mode (if user set a password instead of 4-digit PIN) */}
              {useTextPasswordMode ? (
                <form onSubmit={handleTextPasswordSubmit} className="space-y-2 pt-1">
                  <div className="relative">
                    <input
                      type={showTextPassword ? 'text' : 'password'}
                      value={textPassword}
                      onChange={(e) => setTextPassword(e.target.value)}
                      placeholder="Enter account password or PIN"
                      className="w-full h-10 px-3 pr-9 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-600"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowTextPassword(!showTextPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showTextPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errorMsg && <p className="text-xs font-semibold text-rose-600 text-center">{errorMsg}</p>}
                  <button
                    type="submit"
                    className="w-full h-9 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Authenticate with Password
                  </button>
                </form>
              ) : (
                /* Numeric Keypad Mode */
                <div className="space-y-2 pt-1">
                  {/* PIN Display */}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      {[0, 1, 2, 3].map((idx) => (
                        <div
                          key={idx}
                          className={`w-8 h-9 rounded-lg border-2 flex items-center justify-center transition-all ${
                            pin.length > idx
                              ? 'border-emerald-600 bg-emerald-50 scale-105'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          {pin.length > idx ? (
                            <div className="w-2.5 h-2.5 bg-emerald-800 rounded-full animate-in zoom-in-75 duration-100" />
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {errorMsg ? (
                      <p className="text-[11px] font-semibold text-rose-600 text-center">{errorMsg}</p>
                    ) : (
                      <p className="text-[10px] text-slate-400">Enter 4-digit PIN (Default: 1234)</p>
                    )}
                  </div>

                  {/* Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => handleKeyClick(digit)}
                        className="h-9 rounded-lg bg-slate-100 hover:bg-emerald-100/70 active:bg-emerald-200 text-slate-800 font-bold text-sm border border-slate-200/80 shadow-xs transition-colors flex items-center justify-center"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs border border-slate-200 shadow-xs transition-colors flex items-center justify-center"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeyClick('0')}
                      className="h-9 rounded-lg bg-slate-100 hover:bg-emerald-100/70 active:bg-emerald-200 text-slate-800 font-bold text-sm border border-slate-200/80 shadow-xs transition-colors flex items-center justify-center"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-9 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-600 font-semibold text-xs border border-slate-200 shadow-xs transition-colors flex items-center justify-center"
                    >
                      Del
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Close Button Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2 rounded"
            >
              Cancel / Close
            </button>
            <span className="text-[10px] text-slate-400">
              Terminal POS Security v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
