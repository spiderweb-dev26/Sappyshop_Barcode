import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  Boxes, 
  ShoppingCart, 
  Search, 
  Plus, 
  ChevronRight, 
  Package,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '../utils/currencyUtils';

export const DashboardOverview: React.FC = () => {
  const { 
    settings,
    items, 
    setActiveTab
  } = useApp();

  const [filterQuery, setFilterQuery] = useState('');

  // Calculations for Metrics matching dashboard cards
  const totalStockUnits = (items || []).reduce((acc, i) => acc + (i?.stock || 0), 0);
  const totalStockValue = (items || []).reduce((acc, i) => acc + ((i?.stock || 0) * (i?.sellingPrice || 0)), 0);
  const totalCategoriesCount = (items || []).length > 0 
    ? Array.from(new Set((items || []).map(i => i?.category || 'General'))).length 
    : 0;

  // Filtered Items for Main Table
  const filteredItems = (items || []).filter(item => 
    item && (
      (item.name || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(filterQuery.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(filterQuery.toLowerCase())
    )
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-20 relative">
      
      {/* 3 KPI Metric Cards Row (Stock Value, Total Units, Categories) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Card 1: Emerald Accent Strip (Stock Value - Sum of all items * Selling Price) */}
        <div className="bg-[#fdfbf7] rounded-2xl p-4 shadow-xs border border-[#dfd7c7] relative overflow-hidden flex items-center justify-between group hover:shadow-md transition-all">
          <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-[#064e3b] rounded-r-full"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#064e3b] shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Value</p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#064e3b] tracking-tight font-mono">
                {formatCurrency(totalStockValue, settings.currencySymbol)}
              </p>
            </div>
          </div>
          <div className="text-right pr-1">
            <span className="text-[10px] font-bold text-[#064e3b] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              Qty × Price
            </span>
          </div>
        </div>

        {/* Card 2: Indigo Accent Strip (Total Stock Units) */}
        <div className="bg-[#fdfbf7] rounded-2xl p-4 shadow-xs border border-[#dfd7c7] relative overflow-hidden flex items-center justify-between group hover:shadow-md transition-all">
          <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-blue-600 rounded-r-full"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Units</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight font-mono">
                {totalStockUnits.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right pr-1">
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              In Stock
            </span>
          </div>
        </div>

        {/* Card 3: Rose/Coral Accent Strip (Categories / SKUs) */}
        <div className="bg-[#fdfbf7] rounded-2xl p-4 shadow-xs border border-[#dfd7c7] relative overflow-hidden flex items-center justify-between group hover:shadow-md transition-all">
          <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-rose-500 rounded-r-full"></div>
          <div className="flex items-center gap-3 pl-2">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categories</p>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {totalCategoriesCount}
              </p>
            </div>
          </div>
          <div className="text-right pr-1">
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              {items.length} SKUs
            </span>
          </div>
        </div>

      </div>

      {/* Main Spacious Content Card */}
      <div className="bg-[#fdfbf7] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs border border-[#dfd7c7]">
        
        {/* Table Card Header with Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-[#dfd7c7]">
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              Catalog Items &amp; Inventory Ledger
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Live product pricing, SKU locations, and shelf distribution
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search filter */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter items..."
                className="w-full sm:w-44 h-8 pl-8 pr-3 bg-[#f8f4ec] border border-[#dfd7c7] rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-[#fdfbf7] focus:ring-2 focus:ring-emerald-500/30 transition-all"
              />
            </div>

            {/* Quick POS Jump */}
            <button
              onClick={() => setActiveTab('pos')}
              className="h-8 px-3.5 sm:px-4 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-full text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Launch POS</span>
            </button>
          </div>
        </div>

        {/* Mobile-Optimized Card List (visible on small screens) */}
        <div className="block sm:hidden divide-y divide-[#eee7db] mt-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No items found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Add items in Inventory or import stock in Settings.</p>
            </div>
          ) : (
            filteredItems.slice(0, 8).map((item, idx) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#064e3b]/10 text-[#064e3b] border border-[#064e3b]/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {(item.name || 'IT').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono">{item.sku}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{item.category}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-extrabold text-xs text-slate-900">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</p>
                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full mt-0.5 ${
                    item.stock <= item.minStockAlert ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {item.stock} left
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block overflow-x-auto mt-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700 text-sm">No items in catalog</p>
              <p className="text-xs text-slate-400 mt-0.5">Catalog has been reset. Create new items in Inventory or import backup data in Settings.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] text-slate-500 font-bold border-b border-[#dfd7c7]">
                  <th className="py-3 px-4">Item &amp; SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description &amp; Location</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7db] text-xs">
                {filteredItems.slice(0, 8).map((item, idx) => {
                  const avatarPalettes = [
                    'bg-rose-100 text-rose-800 border-rose-300',
                    'bg-emerald-100 text-[#064e3b] border-emerald-300',
                    'bg-amber-100 text-amber-900 border-amber-300',
                    'bg-teal-100 text-teal-900 border-teal-300',
                  ];
                  const palette = avatarPalettes[idx % avatarPalettes.length];

                  return (
                    <tr key={item.id} className="hover:bg-[#f8f4ec] transition-colors group">
                      
                      {/* Item with Circular Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full ${palette} border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}>
                            {(item.name || 'IT').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs tracking-tight group-hover:text-[#064e3b] transition-colors">
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              SKU: {item.sku}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-[#f8f4ec] border border-[#dfd7c7] text-slate-700 font-semibold rounded-full text-[10px]">
                          {item.category}
                        </span>
                      </td>

                      {/* Description / Location */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-600 text-[11px]">
                        <p className="truncate">{item.description || 'Fine quality stationery & craft supplies'}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Zone: {item.location || 'A-12'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                        {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                      </td>

                      {/* Stock status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                          item.stock <= item.minStockAlert 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.stock <= item.minStockAlert ? 'bg-rose-500' : 'bg-emerald-600'}`}></span>
                          {item.stock} {item.unit}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveTab('labels')}
                          className="text-xs font-bold text-[#064e3b] hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Label</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* View All Footer link */}
        <div className="mt-4 pt-3 border-t border-[#dfd7c7] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {Math.min(8, filteredItems.length)} of {items.length} inventory products</span>
          <button
            onClick={() => setActiveTab('inventory')}
            className="font-bold text-[#064e3b] hover:text-emerald-800 hover:underline transition-colors"
          >
            Open Full Inventory Catalog &rarr;
          </button>
        </div>
      </div>

      {/* Floating Quick Action Button (FAB) in Emerald & Coral */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-2">
        {/* Floating Quick Count Badge */}
        <div className="bg-[#fdfbf7]/95 backdrop-blur-sm border border-[#dfd7c7] shadow-md px-3 py-1 rounded-full text-xs font-extrabold text-slate-700 font-mono mb-1 hidden sm:block">
          {totalStockUnits.toLocaleString()} units
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setActiveTab('pos')}
          className="w-13 h-13 sm:w-14 sm:h-14 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-full shadow-2xl flex items-center justify-center font-bold text-2xl hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer focus:outline-none border-2 border-emerald-400/40"
          title="Quick Launch POS Checkout"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </button>
      </div>

    </div>
  );
};
