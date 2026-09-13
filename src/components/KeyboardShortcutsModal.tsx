import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Keyboard, 
  X, 
  PlayCircle, 
  Scan, 
  CreditCard, 
  PauseCircle, 
  Search, 
  Sun, 
  Moon, 
  Sparkles,
  Command,
  CornerDownLeft,
  Check
} from 'lucide-react';

interface ShortcutRowProps {
  keys: string[];
  secondaryKey?: string;
  title: string;
  description: string;
  categoryBadge?: string;
  badgeColor?: string;
  onAction?: () => void;
  actionLabel?: string;
}

const ShortcutRow: React.FC<ShortcutRowProps> = ({
  keys,
  secondaryKey,
  title,
  description,
  categoryBadge,
  badgeColor = 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60',
  onAction,
  actionLabel = 'Run Now'
}) => {
  return (
    <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-start gap-3 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5 sm:pt-0">
          {keys.map((k, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-400 text-xs font-bold">+</span>}
              <kbd className="min-w-[2.2rem] h-7 px-2 bg-[#f8f4ec] dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono font-black text-xs rounded-md border border-[#dfd7c7] dark:border-slate-700 shadow-xs flex items-center justify-center tracking-tight">
                {k}
              </kbd>
            </React.Fragment>
          ))}
          {secondaryKey && (
            <>
              <span className="text-slate-400 text-[10px] font-semibold uppercase px-0.5">or</span>
              <kbd className="h-7 px-2 bg-[#f8f4ec] dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px] rounded-md border border-[#dfd7c7] dark:border-slate-700 shadow-xs flex items-center justify-center">
                {secondaryKey}
              </kbd>
            </>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
              {title}
            </h4>
            {categoryBadge && (
              <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${badgeColor}`}>
                {categoryBadge}
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
            {description}
          </p>
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-end sm:self-auto shrink-0 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          title={`Execute ${title}`}
        >
          <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export const KeyboardShortcutsModal: React.FC = () => {
  const { 
    isShortcutsModalOpen, 
    setIsShortcutsModalOpen,
    startNewSale,
    toggleScannerModal,
    processCheckoutShortcut,
    parkOrder,
    cart,
    setActiveTab,
    toggleThemeMode,
    themeMode,
    addToast
  } = useApp();

  // Close with Escape key
  useEffect(() => {
    if (!isShortcutsModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShortcutsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsModalOpen, setIsShortcutsModalOpen]);

  if (!isShortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#fdfbf7] dark:bg-[#0c1220] rounded-2xl border border-[#dfd7c7] dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 transition-colors">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#064e3b] to-[#043b2c] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-emerald-300 border border-white/15">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  Desktop Cashier Keyboard Shortcuts
                </h2>
                <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-400 text-slate-950 rounded-full uppercase tracking-wider">
                  Live Global Listener
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Speed up customer lines with zero-click keyboard triggers on your register
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close keyboard shortcuts dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Shortcut List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6 divide-y divide-slate-200/70 dark:divide-slate-800">
          
          {/* Section 1: Primary Cashier Sales Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Primary Register Actions (Universal Function Keys)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Works across all tabs</span>
            </div>

            <div className="space-y-2">
              <ShortcutRow
                keys={['F2']}
                secondaryKey="Alt+N"
                title="Start New Sale"
                description="Resets register, clears previous cart, and places cursor in the product search field ready for customer items."
                categoryBadge="Essential POS"
                badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
                actionLabel="Trigger F2"
                onAction={() => {
                  startNewSale();
                  setIsShortcutsModalOpen(false);
                }}
              />

              <ShortcutRow
                keys={['F3']}
                secondaryKey="Alt+S"
                title="Open / Toggle Barcode Scanner"
                description="Instantly opens the camera barcode scanner modal or toggles it closed."
                categoryBadge="Hardware / Camera"
                badgeColor="bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700/60"
                actionLabel="Trigger F3"
                onAction={() => {
                  toggleScannerModal();
                  setIsShortcutsModalOpen(false);
                }}
              />

              <ShortcutRow
                keys={['F4']}
                secondaryKey="Ctrl+Enter"
                title="Process Checkout / Pay"
                description="Switches from POS register to Checkout terminal. If already on Checkout, completes transaction payment immediately."
                categoryBadge="Tender & Pay"
                badgeColor="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                actionLabel="Trigger F4"
                onAction={() => {
                  processCheckoutShortcut();
                  setIsShortcutsModalOpen(false);
                }}
              />

              <ShortcutRow
                keys={['F8']}
                secondaryKey="Alt+H"
                title="Hold / Park Current Cart"
                description="Temporarily parks the active customer order so you can serve the next customer in line immediately."
                categoryBadge="Multi-Customer"
                badgeColor="bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700/60"
                actionLabel="Trigger F8"
                onAction={() => {
                  if (cart.length > 0) {
                    parkOrder();
                    addToast('info', 'Cart Held (F8)', 'Order parked successfully.');
                  } else {
                    addToast('warning', 'Cart Is Empty', 'No items to hold.');
                  }
                  setIsShortcutsModalOpen(false);
                }}
              />

              <ShortcutRow
                keys={['F9']}
                secondaryKey="Alt+F"
                title="Quick Product Search & Barcode Input"
                description="Jumps directly to the POS register catalog and focuses the search input for typing SKUs or names."
                categoryBadge="Search"
                badgeColor="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                actionLabel="Focus Search"
                onAction={() => {
                  setActiveTab('pos');
                  setIsShortcutsModalOpen(false);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('sappy:focus-search'));
                  }, 50);
                }}
              />
            </div>
          </div>

          {/* Section 2: Rapid Payment Tender Keys on Checkout */}
          <div className="pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Payment Method Selection (On Checkout Screen)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Keys 1 - 7</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">1. Cash Payment</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">1 or Alt+1</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">2. CBE (Yohannes)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">2 or Alt+2</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">3. CBE (Azeb)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">3 or Alt+3</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">4. Awash Bank</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">4 or Alt+4</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">5. Telebirr Mobile Pay</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">5 or Alt+5</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">6. Bank of Abyssinia</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">6 or Alt+6</kbd>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between col-span-1 sm:col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">7. Credit Customer Tab (Store Ledger)</span>
                <kbd className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold rounded">7 or Alt+7</kbd>
              </div>
            </div>
          </div>

          {/* Section 3: Navigation, Lighting & Dialogs */}
          <div className="pt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                <h3 className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Store Display & Modal Controls
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              <ShortcutRow
                keys={['Alt', 'T']}
                title="Toggle Store Lighting Theme"
                description="Switches between default warm stationery light mode and high-contrast dark mode for dim store environments."
                categoryBadge="Lighting"
                badgeColor="bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60"
                actionLabel={themeMode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                onAction={toggleThemeMode}
              />

              <ShortcutRow
                keys={['F1']}
                secondaryKey="?"
                title="Show Keyboard Shortcuts Reference"
                description="Toggles this desktop cashier shortcut cheat sheet on or off."
                categoryBadge="Help"
                badgeColor="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60"
              />

              <ShortcutRow
                keys={['Escape']}
                title="Dismiss Dialog / Close Scanner"
                description="Closes the camera scanner, dismisses active dialogs or overlays, and cancels duplicate scan alerts."
                categoryBadge="Universal"
                badgeColor="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                actionLabel="Close Modal"
                onAction={() => setIsShortcutsModalOpen(false)}
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Hardware USB barcode scanners trigger automatic item addition via rapid Enter sequence.</span>
          </div>

          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(false)}
            className="w-full sm:w-auto px-4 py-2 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Done &amp; Return to Register
          </button>
        </div>

      </div>
    </div>
  );
};
