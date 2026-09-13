import React from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { getItemDisplayImage, getStationeryFallbackSvg } from '../utils/imageUtils';
import { Star, Zap, ShoppingCart } from 'lucide-react';

interface QuickKeysBarProps {
  onSelectItem: (item: InventoryItem) => void;
}

export const QuickKeysBar: React.FC<QuickKeysBarProps> = ({ onSelectItem }) => {
  const { items, settings, toggleQuickKeyFavorite } = useApp();

  // Pick items marked as favorite, or fallback to the top 8 popular stationery items
  const quickItems = React.useMemo(() => {
    const favorites = items.filter(i => i.isFavoriteQuickKey);
    if (favorites.length >= 4) return favorites;

    // Complement with high-frequency stationery items (e.g. pens, pencils, notebooks, rulers, sharpeners)
    const keywords = ['pen', 'pencil', 'notebook', 'eraser', 'ruler', 'sharpener', 'marker', 'glue'];
    const candidates = items.filter(i => 
      !i.isFavoriteQuickKey && 
      keywords.some(k => i.name.toLowerCase().includes(k) || i.category.toLowerCase().includes(k))
    );

    return [...favorites, ...candidates].slice(0, 10);
  }, [items]);

  if (quickItems.length === 0) return null;

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Quick Keys & Fast Items</span>
          <span className="text-[10px] font-normal text-slate-400">1-Tap register shortcuts</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">{quickItems.length} shortcuts</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {quickItems.map(item => {
          const isFavorited = Boolean(item.isFavoriteQuickKey);
          const isOut = item.stock <= 0;

          return (
            <div
              key={item.id}
              className={`group relative shrink-0 w-28 sm:w-32 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl p-2 transition-all cursor-pointer flex flex-col justify-between ${
                isOut ? 'opacity-50 pointer-events-none' : ''
              }`}
              onClick={() => onSelectItem(item)}
            >
              {/* Star / Unstar button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleQuickKeyFavorite(item.id);
                }}
                className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-amber-500 transition-colors z-10"
                title={isFavorited ? 'Remove from Quick Keys' : 'Pin to Quick Keys'}
              >
                <Star className={`w-3 h-3 ${isFavorited ? 'text-amber-500 fill-amber-500' : ''}`} />
              </button>

              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-white border border-slate-100 flex items-center justify-center p-0.5">
                  <img
                    src={getItemDisplayImage(item)}
                    alt={item.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getStationeryFallbackSvg(item.category, item.name);
                    }}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400 truncate">
                  {item.sku}
                </span>
              </div>

              <div className="min-h-[28px]">
                <h4 className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-950">
                  {item.name}
                </h4>
                {item.wholesalePrice && item.wholesaleMinQty && (
                  <span className="inline-block text-[9px] text-purple-700 font-bold">
                    Wholesale: {formatCurrency(item.wholesalePrice, settings.currencySymbol)} (≥{item.wholesaleMinQty})
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold font-mono text-emerald-800">
                  {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                </span>
                <span className={`text-[9px] font-mono px-1 rounded ${
                  item.stock <= item.minStockAlert ? 'bg-amber-100 text-amber-800 font-bold' : 'text-slate-400'
                }`}>
                  {item.stock} left
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
