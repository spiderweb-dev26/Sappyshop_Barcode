import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone, Monitor, Info, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'navbar' | 'banner' | 'compact' | 'sign' | 'menu-item';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'compact',
  onActionComplete
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  const handleTriggerInstall = async () => {
    if (isInstalled) {
      if (onActionComplete) onActionComplete();
      return;
    }

    if (isInstallable) {
      const outcome = await install();
      if (outcome && onActionComplete) onActionComplete();
      return;
    }

    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // Fallback guide for Chromium/Desktop browsers or preview environments
    setShowDesktopGuide(true);
  };

  // Sign variant: A sleek, compact sign with a hover card explaining the app's purposes
  if (variant === 'sign') {
    return (
      <>
        <div className={`relative group/appsign inline-flex ${className}`}>
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 hover:text-white text-[11px] font-semibold transition-all duration-150 cursor-pointer shadow-xs group-hover/appsign:border-emerald-400 group-hover/appsign:shadow-emerald-900/40"
            aria-label="Download Sappy App Sign (Hover to view purpose)"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isInstalled ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isInstalled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <Download className="w-3.5 h-3.5 text-emerald-300" />
            <span className="tracking-tight">Download App</span>
            <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-900 text-emerald-300 border border-emerald-700/60">
              {isInstalled ? 'ACTIVE' : 'SIGN'}
            </span>
          </button>

          {/* Hover Explanation Sign Card (Pops up directly when hovering the sign) */}
          <div className="absolute bottom-full left-0 mb-2 w-72 p-3.5 bg-slate-900/95 text-slate-100 rounded-2xl shadow-2xl border border-emerald-500/50 backdrop-blur-md text-xs opacity-0 invisible group-hover/appsign:opacity-100 group-hover/appsign:visible transition-all duration-200 z-50 pointer-events-none transform -translate-y-1 group-hover/appsign:translate-y-0">
            {/* Sign Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#064e3b] text-emerald-300 flex items-center justify-center font-bold text-xs shadow-inner">
                  <Download className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white leading-tight">Sappy POS Application</h4>
                  <p className="text-[10px] text-emerald-300/90 font-medium">Why install on this system?</p>
                </div>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                PWA
              </span>
            </div>

            {/* Purpose Checklist */}
            <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </div>
                <div>
                  <strong className="text-white font-semibold">Offline Cashier Protection:</strong> Register stays operational even if the store internet goes down.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </div>
                <div>
                  <strong className="text-white font-semibold">Dedicated Workspace:</strong> Runs in fullscreen kiosk mode without browser address bars or tab distractions.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </div>
                <div>
                  <strong className="text-white font-semibold">1-Click Desktop Launch:</strong> Pin directly to Windows Taskbar, Mac Dock, Android, or iOS homescreen.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                  ✓
                </div>
                <div>
                  <strong className="text-white font-semibold">Hardware Acceleration:</strong> Faster barcode scanner camera and receipt thermal printer response.
                </div>
              </div>
            </div>

            {/* Bottom Sign Tip */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
              <span>{isInstalled ? 'App is installed & ready' : 'Click sign to install or see setup'}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Modal guides */}
        {renderGuides()}
      </>
    );
  }

  // Menu-item variant for the More (3 dashes) dropdown in Top Navbar
  if (variant === 'menu-item') {
    return (
      <>
        <button
          type="button"
          onClick={handleTriggerInstall}
          className={`w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left group cursor-pointer ${className}`}
          title="Download & Install Sappy POS App"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#064e3b] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {isInstalled ? 'POS App Installed' : 'Download POS App'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Offline caching &amp; fullscreen mode
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[#064e3b] dark:text-emerald-300 shrink-0">
            {isInstalled ? 'ACTIVE' : 'INSTALL'}
          </span>
        </button>

        {renderGuides()}
      </>
    );
  }

  // If already installed and variant is compact or banner, hide
  if (isInstalled) {
    return null;
  }

  // Banner variant (if needed)
  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-[#064e3b] to-emerald-800 text-white px-3 py-2 rounded-xl flex items-center justify-between gap-2 shadow-md border border-emerald-400/30 ${className}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/30 border border-emerald-300/40 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold leading-tight truncate">Install Sappy POS</p>
              <p className="text-[10px] text-emerald-200/80 leading-tight truncate">Offline access &amp; speeds</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTriggerInstall}
            className="px-2.5 py-1 bg-emerald-400 hover:bg-emerald-300 text-[#064e3b] font-bold text-xs rounded-lg shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            Install
          </button>
        </div>
        {renderGuides()}
      </>
    );
  }

  // Compact variant
  return (
    <>
      <button
        type="button"
        onClick={handleTriggerInstall}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-100/80 hover:bg-emerald-200 text-[#064e3b] text-xs font-bold border border-emerald-300/60 shadow-2xs transition-all active:scale-95 cursor-pointer ${className}`}
        title="Download Sappy POS App for offline use and fast access"
      >
        <Download className="w-3.5 h-3.5 text-[#064e3b]" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>

      {renderGuides()}
    </>
  );

  function renderGuides() {
    return (
      <>
        {/* iOS Safari Guide Modal */}
        {showIOSGuide && (
          <div 
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
            <div 
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-emerald-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#064e3b] flex items-center justify-center text-white font-bold text-xs">
                    POS
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Run Sappy POS like a native app</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064e3b] dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Tap the <Share className="w-3.5 h-3.5 text-blue-600 inline" /> Share button
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Located at the bottom of Safari on iPhone, or top right on iPad.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064e3b] dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Select <PlusSquare className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200 inline" /> &quot;Add to Home Screen&quot;
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Scroll down the share sheet and tap Add to Home Screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#064e3b] dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      Tap <strong className="text-emerald-700 dark:text-emerald-400 font-bold">&quot;Add&quot;</strong> in top-right
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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

        {/* Desktop / Chromium Setup Guide Modal */}
        {showDesktopGuide && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowDesktopGuide(false)}
          >
            <div 
              className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-2xl border border-emerald-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#064e3b] flex items-center justify-center text-white font-bold text-xs">
                    <Monitor className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Install Sappy POS Application</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Desktop &amp; Mobile Web App (PWA)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDesktopGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                  <h4 className="font-bold text-[#064e3b] dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    How to install on Chrome, Edge, or Brave:
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 pl-1">
                    <li>Look at your browser&apos;s URL address bar (top right).</li>
                    <li>Click the <strong>Install icon (🖥️ or ⬇️)</strong> in the address bar.</li>
                    <li>Click <strong>Install</strong> to add Sappy POS to your desktop or taskbar.</li>
                  </ol>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <p className="font-semibold text-slate-900 dark:text-slate-200">Installed Benefits:</p>
                  <ul className="space-y-1 pl-1">
                    <li>• Instant cashier launch without typing web addresses</li>
                    <li>• Full offline transaction support with local cache</li>
                    <li>• Clean full-screen display without browser clutter</li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDesktopGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#043e2f] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
};

