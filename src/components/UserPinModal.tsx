import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { X, ShieldCheck, Lock, UserCheck, KeyRound } from 'lucide-react';

interface UserPinModalProps {
  isOpen?: boolean;
  onClose: () => void;
  targetUser?: User | null;
}

export const UserPinModal: React.FC<UserPinModalProps> = ({ isOpen = true, onClose, targetUser }) => {
  const { users, currentUser, switchUser } = useApp();
  const approvedUsers = (users || []).filter(u => u.approvalStatus === 'APPROVED' || !u.approvalStatus);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    targetUser?.id || currentUser?.id || approvedUsers[0]?.id || users[0]?.id || ''
  );
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || (users || []).length === 0) return null;

  const activeTarget = (users || []).find(u => u && u.id === selectedUserId) || approvedUsers[0] || currentUser;

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

  const attemptLogin = (userId: string, pinToVerify: string) => {
    const success = switchUser(userId, pinToVerify);
    if (success) {
      setPin('');
      setErrorMsg('');
      onClose();
    } else {
      setErrorMsg('Incorrect PIN. Please check security code.');
      setPin('');
    }
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
      <div className="bg-white rounded-lg shadow-xl border border-emerald-100 w-full max-w-md overflow-hidden text-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/10 rounded">
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider">Terminal Access & Role Switcher</h3>
              <p className="text-[11px] text-emerald-200">Role-Based Security Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* User selector cards */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Select User Profile
            </label>
            <div className="grid grid-cols-2 gap-2">
              {approvedUsers.map((u) => {
                const isSelected = u.id === selectedUserId;
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPin('');
                      setErrorMsg('');
                    }}
                    className={`flex items-center gap-2 p-2 rounded-md border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
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
          <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-800" />
              <span className="text-xs text-slate-600">
                Signing in as: <strong className="text-slate-900">{activeTarget?.name || 'Staff User'}</strong>
              </span>
            </div>
            <span className="text-[11px] text-emerald-800 font-mono font-medium">PIN Authentication Required</span>
          </div>

          {/* PIN Display */}
          <div className="flex flex-col items-center justify-center space-y-1.5">
            <div className="flex items-center justify-center gap-2.5">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-9 h-10 rounded-md border-2 flex items-center justify-center transition-all ${
                    pin.length > idx
                      ? 'border-emerald-600 bg-emerald-50 scale-105'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  {pin.length > idx ? (
                    <div className="w-3 h-3 bg-emerald-800 rounded-full animate-in zoom-in-75 duration-100" />
                  ) : null}
                </div>
              ))}
            </div>

            {errorMsg ? (
              <p className="text-xs font-semibold text-rose-600 text-center animate-shake">{errorMsg}</p>
            ) : (
              <p className="text-[11px] text-slate-400">Enter 4-digit security PIN</p>
            )}
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyClick(digit)}
                className="h-10 rounded-md bg-slate-100 hover:bg-emerald-100/70 active:bg-emerald-200 text-slate-800 font-bold text-base border border-slate-200/80 shadow-xs transition-colors flex items-center justify-center"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-10 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs border border-slate-200 shadow-xs transition-colors flex items-center justify-center"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeyClick('0')}
              className="h-10 rounded-md bg-slate-100 hover:bg-emerald-100/70 active:bg-emerald-200 text-slate-800 font-bold text-base border border-slate-200/80 shadow-xs transition-colors flex items-center justify-center"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded-md bg-slate-100 hover:bg-rose-50 text-rose-600 font-semibold text-xs border border-slate-200 shadow-xs transition-colors flex items-center justify-center"
            >
              Del
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
