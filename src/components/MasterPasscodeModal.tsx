import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MASTER_PASSCODE } from '../types';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { soundEffects } from '../utils/soundEffects';

export const MasterPasscodeModal: React.FC = () => {
  const { 
    masterAuthRequest, 
    closeMasterAuth, 
    logActivity, 
    addToast, 
    settings 
  } = useApp();

  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (masterAuthRequest) {
      setPasscode('');
      setErrorMsg('');
      setShowPassword(false);
      setIsVerifying(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [masterAuthRequest]);

  if (!masterAuthRequest) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode) {
      setErrorMsg('Please enter the master passcode.');
      return;
    }

    setIsVerifying(true);

    if (passcode.trim() === MASTER_PASSCODE) {
      if (settings.enableSoundEffects) {
        soundEffects.playScanSuccess();
      }

      logActivity(
        'MASTER_AUTH_SUCCESS',
        'SYSTEM',
        undefined,
        `Master passcode authorized for: ${masterAuthRequest.actionName}`
      );

      addToast(
        'success',
        'Master Authorized',
        `Security verification passed for: ${masterAuthRequest.actionName}`
      );

      const callback = masterAuthRequest.onSuccess;
      closeMasterAuth();
      if (callback) {
        callback();
      }
    } else {
      if (settings.enableSoundEffects) {
        soundEffects.playError();
      }
      setErrorMsg('Invalid master passcode. Access denied.');
      setIsVerifying(false);
      inputRef.current?.focus();
    }
  };

  const handleCancel = () => {
    if (masterAuthRequest.onCancel) {
      masterAuthRequest.onCancel();
    }
    closeMasterAuth();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-rose-200/80 w-full max-w-md overflow-hidden text-slate-800 flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Header with High-Security Theme */}
        <div className="p-4 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-500/20 rounded-lg border border-rose-400/30 text-rose-200">
              <ShieldAlert className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-wide">Master Passcode Required</h3>
                <span className="text-[10px] bg-rose-500/30 border border-rose-400/40 text-rose-200 px-1.5 py-0.2 rounded font-mono uppercase">
                  Protected
                </span>
              </div>
              <p className="text-xs text-rose-200/80">
                {masterAuthRequest.title || 'Sensitive System Authorization'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Action Context Box */}
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Target Action:</span>
            </div>
            <p className="text-xs font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200/70 font-mono">
              {masterAuthRequest.actionName}
            </p>
            {masterAuthRequest.description && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {masterAuthRequest.description}
              </p>
            )}
          </div>

          {/* Warning Message if any */}
          {masterAuthRequest.warning && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-950">Security Caution</strong>
                <p className="text-[11px] text-amber-800">{masterAuthRequest.warning}</p>
              </div>
            </div>
          )}

          {/* Passcode Input Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-slate-400" /> Enter Master Passcode
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Authorization Required</span>
            </div>

            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Enter Master Passcode"
                className={`w-full h-10 pl-3.5 pr-10 bg-slate-50 border rounded-lg text-sm font-mono text-slate-900 focus:outline-none transition-colors ${
                  errorMsg 
                    ? 'border-rose-500 bg-rose-50/50 focus:border-rose-600' 
                    : 'border-slate-300 focus:border-emerald-600 focus:bg-white'
                }`}
                required
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1 pt-0.5 animate-in fade-in">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="h-9 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying || !passcode}
              className="h-9 px-5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authorize Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
