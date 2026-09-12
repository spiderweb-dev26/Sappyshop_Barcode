import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/currencyUtils';
import { getItemDisplayImage, getStationeryFallbackSvg } from '../utils/imageUtils';
import { AlertCircle, Plus, X, ShoppingCart, Package, Barcode as BarcodeIcon } from 'lucide-react';

export const DuplicateScanModal: React.FC = () => {
  const { pendingDuplicateScan, confirmDuplicateScan, cancelDuplicateScan, settings } = useApp();

  // Keyboard shortcut listener: Enter = Add +1, Escape = Cancel
  useEffect(() => {
    if (!pendingDuplicateScan) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmDuplicateScan();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelDuplicateScan();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDuplicateScan, confirmDuplicateScan, cancelDuplicateScan]);

  if (!pendingDuplicateScan) return null;

  const { item, currentQuantity } = pendingDuplicateScan;
  const isAtMaxStock = currentQuantity >= item.stock;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="duplicate-scan-dialog"
        className="bg-white rounded-2xl border border-amber-300 shadow-2xl max-w-md w-full overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200"
      >
        {/* Header with Amber Warning Accent */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl border border-amber-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Duplicate Item Scanned</h3>
              <p className="text-xs text-amber-800 font-medium">Confirmation Required</p>
            </div>
          </div>
          <button
            onClick={cancelDuplicateScan}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {/* Product Details Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-start gap-3">
              {/* Product Image */}
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                <img
                  src={getItemDisplayImage(item)}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getStationeryFallbackSvg(item.category, item.name);
                  }}
                  className="w-full h-full object-contain p-1"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.category}</p>
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-snug">{item.name}</h4>
                    {item.nameAmharic && (
                      <p className="text-xs text-emerald-800 font-medium truncate mt-0.5" title={item.nameAmharic}>
                        {item.nameAmharic}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 font-mono pt-1 border-t border-slate-200/60">
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                <BarcodeIcon className="w-3 h-3 text-slate-400" /> {item.barcode}
              </span>
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                SKU: {item.sku}
              </span>
              <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                <Package className="w-3 h-3 text-slate-400" /> Stock: {item.stock} units
              </span>
            </div>
          </div>

          {/* Current Cart Status Highlight */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-950">
              <ShoppingCart className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Currently in Cart:</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-amber-950 text-sm">{currentQuantity} unit{currentQuantity !== 1 ? 's' : ''}</span>
              <span className="text-[11px] text-amber-800 ml-1.5">
                ({formatCurrency(item.sellingPrice * currentQuantity, settings.currencySymbol)})
              </span>
            </div>
          </div>

          {/* Prompt Question */}
          <p className="text-xs text-slate-600 text-center">
            {isAtMaxStock ? (
              <span className="text-rose-600 font-semibold">
                Cannot add more: Max available stock ({item.stock}) already in cart.
              </span>
            ) : (
              <span>
                Do you want to add another unit (<strong>+1</strong>) of this item to the cart?
              </span>
            )}
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={cancelDuplicateScan}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel (Keep {currentQuantity})</span>
            </button>

            <button
              type="button"
              onClick={confirmDuplicateScan}
              disabled={isAtMaxStock}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-900/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add +1 ({currentQuantity + 1} total)</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-600">Enter</kbd> to add</span>
          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-600">Esc</kbd> to cancel</span>
        </div>
      </div>
    </div>
  );
};
