import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'banner' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as installed standalone PWA, suppress the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with beforeinstallprompt
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className={`bg-gradient-to-r from-[#064e3b] to-emerald-800 text-white px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-md border border-emerald-400/30 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/30 border border-emerald-300/40 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Install Sappy POS App</p>
              <p className="text-[11px] text-emerald-200/80 leading-tight">Instant offline access & faster mobile speeds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={install}
            className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-[#064e3b] font-bold text-xs rounded-lg shadow-sm shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            Install
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-100/80 hover:bg-emerald-200 text-[#064e3b] text-xs font-bold border border-emerald-300/60 shadow-2xs transition-all active:scale-95 cursor-pointer ${className}`}
        title="Install Sappy POS to your device"
      >
        <Download className="w-3.5 h-3.5 text-[#064e3b]" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  // iOS Safari flow (WebKit doesn't trigger beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-100/80 hover:bg-emerald-200 text-[#064e3b] text-xs font-bold border border-emerald-300/60 shadow-2xs transition-all active:scale-95 cursor-pointer ${className}`}
          title="Add Sappy POS to Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#064e3b]" />
          <span>Add to Phone</span>
        </button>

        {showIOSGuide && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
            <div 
              className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-emerald-100 text-slate-800 animate-in slide-in-from-bottom-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#064e3b] flex items-center justify-center text-white font-bold text-xs">
                    POS
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-500">Run Sappy POS like a native app</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#064e3b] font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Tap the <Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share button
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Located at the bottom of Safari on iPhone, or top right on iPad.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#064e3b] font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Select <PlusSquare className="w-3.5 h-3.5 text-slate-800 inline" /> &quot;Add to Home Screen&quot;
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down the share sheet and tap Add to Home Screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-[#064e3b] font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Tap <strong className="text-emerald-700 font-bold">&quot;Add&quot;</strong> in top-right
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Sappy POS icon will appear on your home screen for instant 1-tap loading!
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#043e2f] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
