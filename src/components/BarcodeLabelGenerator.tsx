import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';
import { formatCurrency } from '../utils/currencyUtils';
import { exportBarcodeLabelsToPdf, BarcodeLayoutType } from '../utils/excelPdfUtils';
import { 
  Barcode as BarcodeIcon, 
  Printer, 
  Settings2, 
  CheckSquare, 
  Square, 
  Sparkles,
  Layers,
  Tag,
  Grid3X3,
  Columns2,
  FileDown,
  Search,
  Zap,
  RotateCcw,
  Boxes,
  Plus,
  Minus,
  CheckCircle2,
  LayoutGrid,
  Scroll,
  Megaphone,
  Maximize2
} from 'lucide-react';

interface LayoutDef {
  id: BarcodeLayoutType;
  title: string;
  category: 'sheet' | 'shelf' | 'thermal';
  badge: string;
  dimensions: string;
  desc: string;
  icon: React.ElementType;
}

const LAYOUT_DEFINITIONS: LayoutDef[] = [
  {
    id: 'sheet-30',
    title: '30-Per-Sheet (3×10)',
    category: 'sheet',
    badge: 'Avery 5160',
    dimensions: '1" × 2.625"',
    desc: 'Standard letter sheet for merchandise & retail',
    icon: Grid3X3
  },
  {
    id: 'sheet-24',
    title: '24-Per-Sheet (3×8)',
    category: 'sheet',
    badge: 'Avery 5163',
    dimensions: '1.33" × 4"',
    desc: 'Spacious medium labels with wide barcode width',
    icon: LayoutGrid
  },
  {
    id: 'sheet-40',
    title: '40-Per-Sheet (4×10)',
    category: 'sheet',
    badge: 'Avery 5195',
    dimensions: '0.66" × 1.75"',
    desc: 'Compact stickers for stationery & cosmetics',
    icon: Grid3X3
  },
  {
    id: 'sheet-80',
    title: '80-Per-Sheet (4×20)',
    category: 'sheet',
    badge: 'Micro 80',
    dimensions: '0.5" × 1.75"',
    desc: 'Ultra-compact micro stickers for jewelry & pens',
    icon: Grid3X3
  },
  {
    id: 'sheet-14',
    title: '14-Per-Sheet (2×7)',
    category: 'sheet',
    badge: 'Avery 5162',
    dimensions: '1.33" × 4.25"',
    desc: 'Large shipping, bin, & package address labels',
    icon: Columns2
  },
  {
    id: 'sheet-8',
    title: '8-Per-Sheet (2×4)',
    category: 'sheet',
    badge: 'Avery 5168',
    dimensions: '3.5" × 5"',
    desc: 'Jumbo bin, warehouse carton & pallet markers',
    icon: Columns2
  },
  {
    id: 'shelf-tag',
    title: 'Shelf Edge Tag (2×4)',
    category: 'shelf',
    badge: 'Retail Strip',
    dimensions: '3" × 2"',
    desc: 'High-contrast bold shelf strip pricing labels',
    icon: Tag
  },
  {
    id: 'shelf-talker',
    title: 'Promo Shelf Talker (2×2)',
    category: 'shelf',
    badge: 'Sale Spotlight',
    dimensions: '4.25" × 5.5"',
    desc: 'Jumbo eye-catching promotional cards with banner',
    icon: Megaphone
  },
  {
    id: 'single',
    title: 'Standard Thermal Roll',
    category: 'thermal',
    badge: '50×30 mm',
    dimensions: '2" × 1.2"',
    desc: 'Universal continuous thermal label printers (Zebra/Xprinter)',
    icon: Scroll
  },
  {
    id: 'single-wide',
    title: 'Wide Thermal Roll',
    category: 'thermal',
    badge: '60×40 mm',
    dimensions: '2.4" × 1.6"',
    desc: 'Wide thermal sticker for boxes & shipping',
    icon: Scroll
  },
  {
    id: 'single-mini',
    title: 'Mini Thermal Roll',
    category: 'thermal',
    badge: '30×20 mm',
    dimensions: '1.2" × 0.8"',
    desc: 'Compact thermal sticker for cosmetics & hardware',
    icon: Scroll
  },
  {
    id: 'jewelry-tag',
    title: 'Foldover / Barbell Tag',
    category: 'thermal',
    badge: '60×22 mm',
    dimensions: 'Dual-Wing',
    desc: 'Foldover barbell tag for rings, eyewear & watches',
    icon: Maximize2
  }
];

export const BarcodeLabelGenerator: React.FC = () => {
  const { items, settings, addToast } = useApp();

  // Selected item IDs
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => 
    items.slice(0, 6).map(i => i.id)
  );

  // Per-item copy counts dictionary { [itemId]: number }
  const [itemCopies, setItemCopies] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    items.forEach(i => {
      initial[i.id] = 1;
    });
    return initial;
  });

  // Global default copies when selecting new items
  const [defaultCopies, setDefaultCopies] = useState<number>(1);
  const [layout, setLayout] = useState<BarcodeLayoutType>('sheet-30');
  const [layoutCategoryFilter, setLayoutCategoryFilter] = useState<'all' | 'sheet' | 'shelf' | 'thermal'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Filter & Search in product selector
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Customization Toggles
  const [showStoreName, setShowStoreName] = useState(true);
  const [showItemName, setShowItemName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showBarcodeText, setShowBarcodeText] = useState(true);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [items]);

  // Filtered items list for product selector
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch = !searchTerm.trim() || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, searchTerm]);

  // Filtered Layouts
  const visibleLayouts = useMemo(() => {
    if (layoutCategoryFilter === 'all') return LAYOUT_DEFINITIONS;
    return LAYOUT_DEFINITIONS.filter(l => l.category === layoutCategoryFilter);
  }, [layoutCategoryFilter]);

  // Item selection handlers
  const toggleItemSelect = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedItemIds(items.map(i => i.id));
  };

  const selectInStockOnly = () => {
    const inStock = items.filter(i => i.stock > 0).map(i => i.id);
    setSelectedItemIds(inStock);
    addToast('info', 'In-Stock Items Selected', `Selected ${inStock.length} items with stock > 0.`);
  };

  const clearSelection = () => {
    setSelectedItemIds([]);
  };

  // Adjust copy count for an item
  const updateItemCopies = (id: string, count: number) => {
    const safeCount = Math.max(1, count);
    setItemCopies(prev => ({
      ...prev,
      [id]: safeCount
    }));
  };

  // Multiply/Set all selected items to their inventory stock count
  const matchAllSelectedToStock = () => {
    const updated = { ...itemCopies };
    let adjustedCount = 0;
    selectedItemIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        updated[id] = Math.max(1, item.stock);
        adjustedCount++;
      }
    });
    setItemCopies(updated);
    addToast('success', 'Stock Multiplier Applied', `Updated copy counts for ${adjustedCount} items to match current inventory.`);
  };

  // Reset all selected items to 1 copy
  const resetAllToSingleCopy = () => {
    const updated = { ...itemCopies };
    selectedItemIds.forEach(id => {
      updated[id] = 1;
    });
    setItemCopies(updated);
    addToast('info', 'Copies Reset', 'Reset all selected items to 1 label copy.');
  };

  // Compile final array of labels to render based on per-item copies
  const printLabels = useMemo(() => {
    const labels: InventoryItem[] = [];
    selectedItemIds.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) {
        const count = itemCopies[id] ?? defaultCopies;
        for (let c = 0; c < count; c++) {
          labels.push(item);
        }
      }
    });
    return labels;
  }, [items, selectedItemIds, itemCopies, defaultCopies]);

  // Handle PDF Generation & Download
  const handleDownloadPdf = async () => {
    if (printLabels.length === 0) {
      addToast('warning', 'No Labels Selected', 'Please select at least one item to generate barcode labels.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      // Let React update the UI with loading state before heavy PDF generation
      setTimeout(() => {
        exportBarcodeLabelsToPdf(printLabels, {
          layout,
          showStoreName,
          showItemName,
          showPrice,
          showSku,
          showBarcodeText,
          storeName: settings.storeName,
          currencySymbol: settings.currencySymbol || 'ETB',
        });
        setIsGeneratingPdf(false);
        addToast('success', 'PDF Downloaded', `Successfully generated ${printLabels.length} barcode labels in PDF format.`);
      }, 50);
    } catch (err) {
      setIsGeneratingPdf(false);
      addToast('error', 'PDF Generation Failed', (err as Error).message);
    }
  };

  // Standard window print trigger
  const handlePrint = () => {
    if (printLabels.length === 0) {
      addToast('warning', 'No Labels Selected', 'Please select at least one item to print.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-4 pb-8 print:p-0 print:m-0 print:space-y-0">
      {/* Header Bar with Download PDF & Print buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 shrink-0">
            <BarcodeIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Barcode Label Studio & Generator
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                {printLabels.length} Queued
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              12 printable layout formats, stock quantity multiplier, customizable elements, and instant PDF download.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Download PDF Option */}
          <button
            id="download-labels-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={printLabels.length === 0 || isGeneratingPdf}
            className="h-9 px-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </button>

          {/* Browser Print */}
          <button
            id="print-labels-window-btn"
            onClick={handlePrint}
            disabled={printLabels.length === 0}
            className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print {printLabels.length} Label{printLabels.length !== 1 ? 's' : ''}</span>
          </button>
        </div>
      </div>

      {/* Grid: Controls (Left) & Live Sheet Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 print:block print:p-0 print:m-0">
        {/* Left Column: Layout, Stock Multiplier & Item Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5 print:hidden">
          {/* Label Sheet Layout Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-700" /> Layout Formats ({LAYOUT_DEFINITIONS.length} Options)
              </h2>
            </div>

            {/* Layout Category Filters */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLayoutCategoryFilter('all')}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer ${
                  layoutCategoryFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({LAYOUT_DEFINITIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setLayoutCategoryFilter('sheet')}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer ${
                  layoutCategoryFilter === 'sheet' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sheet Labels
              </button>
              <button
                type="button"
                onClick={() => setLayoutCategoryFilter('shelf')}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer ${
                  layoutCategoryFilter === 'shelf' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shelf & Promo
              </button>
              <button
                type="button"
                onClick={() => setLayoutCategoryFilter('thermal')}
                className={`flex-1 py-1 text-center rounded-md transition-all cursor-pointer ${
                  layoutCategoryFilter === 'thermal' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal Rolls
              </button>
            </div>

            {/* Layout Choice Grid */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {visibleLayouts.map((l) => {
                const Icon = l.icon;
                const isSelected = layout === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l.id)}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded">
                          {l.badge}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="font-bold text-xs text-slate-900 leading-tight">
                        {l.title}
                      </p>
                      <p className="text-[10px] text-emerald-800 font-mono font-semibold mt-0.5">
                        {l.dimensions}
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 leading-tight line-clamp-2">
                      {l.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity & Stock Multiplier Tools */}
          <div className="bg-white p-4 rounded-xl border border-emerald-200/90 shadow-xs space-y-3 bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-emerald-700" /> Label Quantity & Stock Multiplier
              </h2>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {selectedItemIds.length} SKUs Selected
              </span>
            </div>

            {/* Quick Multiplier Action Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                id="multiply-by-stock-btn"
                onClick={matchAllSelectedToStock}
                disabled={selectedItemIds.length === 0}
                className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-[11px]"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Multiply by Stock Qty</span>
              </button>

              <button
                type="button"
                onClick={resetAllToSingleCopy}
                disabled={selectedItemIds.length === 0}
                className="p-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 font-bold rounded-lg border border-slate-200 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer text-[11px]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to 1 Copy Each</span>
              </button>
            </div>

            {/* Default Global Copies Stepper */}
            <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-700 block">Default Copies Per SKU:</span>
                <span className="text-[10px] text-slate-500">Applied when selecting new items</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(1, defaultCopies - 1);
                    setDefaultCopies(next);
                    const updated = { ...itemCopies };
                    selectedItemIds.forEach(id => { updated[id] = next; });
                    setItemCopies(updated);
                  }}
                  className="w-7 h-7 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={defaultCopies}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                    setDefaultCopies(val);
                    const updated = { ...itemCopies };
                    selectedItemIds.forEach(id => { updated[id] = val; });
                    setItemCopies(updated);
                  }}
                  className="w-14 h-7 px-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold text-center focus:outline-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = defaultCopies + 1;
                    setDefaultCopies(next);
                    const updated = { ...itemCopies };
                    selectedItemIds.forEach(id => { updated[id] = next; });
                    setItemCopies(updated);
                  }}
                  className="w-7 h-7 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50 text-slate-600 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Selection List with Per-Item Stock and Copies */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Products ({selectedItemIds.length}/{items.length})
                </h2>
                <div className="flex items-center gap-2 text-[11px]">
                  <button onClick={selectAll} className="text-emerald-700 font-bold hover:underline cursor-pointer">
                    All
                  </button>
                  <span>&bull;</span>
                  <button onClick={selectInStockOnly} className="text-emerald-700 font-bold hover:underline cursor-pointer">
                    In Stock ({items.filter(i => i.stock > 0).length})
                  </button>
                  <span>&bull;</span>
                  <button onClick={clearSelection} className="text-slate-500 hover:text-slate-700 cursor-pointer">
                    None
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, SKU, barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-7 pl-8 pr-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-emerald-500"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-7 px-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-emerald-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List of selectable products with individual quantity control */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No matching products found.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const currentCopies = itemCopies[item.id] ?? defaultCopies;
                  const isStockMatched = currentCopies === item.stock;

                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-50/40 text-slate-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 opacity-80'
                      }`}
                    >
                      {/* Checkbox and Product Details */}
                      <div 
                        onClick={() => toggleItemSelect(item.id)}
                        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-bold text-xs text-slate-900">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span>SKU: {item.sku}</span>
                            <span>&bull;</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(item.sellingPrice, settings.currencySymbol)}</span>
                            <span>&bull;</span>
                            <span className={`px-1 rounded font-bold ${item.stock > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-700'}`}>
                              {item.stock} in stock
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Per-Item Copy Stepper & Stock Matcher */}
                      {isSelected && (
                        <div className="flex items-center gap-1 shrink-0 bg-white p-1 rounded-md border border-slate-200">
                          {item.stock > 0 && !isStockMatched && (
                            <button
                              type="button"
                              title={`Multiply by stock (${item.stock} copies)`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateItemCopies(item.id, item.stock);
                              }}
                              className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded cursor-pointer whitespace-nowrap"
                            >
                              ={item.stock}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateItemCopies(item.id, currentCopies - 1);
                            }}
                            className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={currentCopies}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateItemCopies(item.id, parseInt(e.target.value, 10) || 1);
                            }}
                            className="w-9 h-5 text-center text-[10px] font-mono font-bold border border-slate-200 rounded focus:outline-emerald-500"
                          />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateItemCopies(item.id, currentCopies + 1);
                            }}
                            className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-[10px] cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Display Customization Elements */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-emerald-700" /> Elements on Label
            </h2>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 cursor-pointer">
                <span className="text-slate-700 font-medium text-[11px]">Store Header</span>
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 cursor-pointer">
                <span className="text-slate-700 font-medium text-[11px]">Product Title</span>
                <input
                  type="checkbox"
                  checked={showItemName}
                  onChange={(e) => setShowItemName(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 cursor-pointer">
                <span className="text-slate-700 font-medium text-[11px]">Selling Price</span>
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 cursor-pointer">
                <span className="text-slate-700 font-medium text-[11px]">SKU Reference</span>
                <input
                  type="checkbox"
                  checked={showSku}
                  onChange={(e) => setShowSku(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-200 cursor-pointer col-span-2">
                <span className="text-slate-700 font-medium text-[11px]">Human-Readable Barcode Digits</span>
                <input
                  type="checkbox"
                  checked={showBarcodeText}
                  onChange={(e) => setShowBarcodeText(e.target.checked)}
                  className="accent-emerald-600 w-3.5 h-3.5 rounded"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Sheet Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col print:w-full print:block print:p-0 print:m-0">
          <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-t-xl flex items-center justify-between text-xs print:hidden">
            <span className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Live Print Preview ({printLabels.length} total stickers queued across {selectedItemIds.length} SKUs)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                {LAYOUT_DEFINITIONS.find(l => l.id === layout)?.badge || layout.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="bg-slate-100 p-4 sm:p-6 rounded-b-xl border-x border-b border-slate-200/80 flex-1 overflow-y-auto max-h-[780px] print:bg-white print:p-0 print:m-0 print:border-none print:max-h-none print:overflow-visible">
            {printLabels.length === 0 ? (
              <div className="py-24 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 print:hidden">
                <BarcodeIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-xs text-slate-600">No Items Selected For Printing</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Select one or more products from the catalog on the left to queue labels.</p>
              </div>
            ) : (
              /* Printable Sheet Grid Container */
              <div
                id="printable-label-sheet"
                className={`bg-white p-4 shadow-md rounded-xl border border-slate-200 mx-auto layout-${layout} print:bg-white print:p-0 print:m-0 print:border-none print:shadow-none print:w-full ${
                  layout === 'sheet-30'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-w-4xl'
                    : layout === 'sheet-24'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl'
                    : layout === 'sheet-40'
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-w-4xl'
                    : layout === 'sheet-80'
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-w-4xl'
                    : layout === 'sheet-14'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl'
                    : layout === 'sheet-8'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl'
                    : layout === 'shelf-tag'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl'
                    : layout === 'shelf-talker'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl'
                    : layout === 'jewelry-tag'
                    ? 'grid grid-cols-1 gap-3 max-w-md'
                    : layout === 'single-wide'
                    ? 'grid grid-cols-1 gap-3 max-w-sm'
                    : layout === 'single-mini'
                    ? 'grid grid-cols-1 gap-2 max-w-xs'
                    : 'grid grid-cols-1 gap-2 max-w-sm'
                }`}
              >
                {printLabels.map((item, idx) => {
                  if (layout === 'jewelry-tag') {
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className="barcode-label-card border border-dashed border-slate-300 rounded-lg p-2 flex items-center justify-between bg-white shadow-2xs print:border print:border-dashed print:border-slate-400 print:shadow-none"
                      >
                        {/* Left Fold Wing: Barcode */}
                        <div className="w-1/2 pr-2 flex flex-col items-center justify-center border-r border-dashed border-slate-200">
                          <BarcodeRenderer
                            value={item.barcode}
                            displayValue={showBarcodeText}
                            width={1.1}
                            height={24}
                            fontSize={8}
                          />
                        </div>

                        {/* Right Fold Wing: Details */}
                        <div className="w-1/2 pl-2 flex flex-col justify-between text-left">
                          {showStoreName && (
                            <span className="text-[7px] uppercase font-bold text-slate-400 block">
                              {settings.storeName}
                            </span>
                          )}
                          {showItemName && (
                            <h4 className="text-[9px] font-bold text-slate-900 leading-tight line-clamp-1">
                              {item.name}
                            </h4>
                          )}
                          <div className="mt-1 flex items-center justify-between text-[8px] font-mono">
                            {showSku && <span className="text-slate-500">{item.sku}</span>}
                            {showPrice && (
                              <span className="font-extrabold text-emerald-800">
                                {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (layout === 'shelf-talker') {
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        className="barcode-label-card border-2 border-red-600 rounded-xl overflow-hidden flex flex-col items-center text-center bg-white shadow-sm print:border-2 print:border-red-600 print:shadow-none"
                      >
                        {/* Red Spotlight Header */}
                        <div className="w-full bg-red-600 text-white font-extrabold text-xs py-1.5 uppercase tracking-wider flex items-center justify-center gap-1">
                          <span>★ SPECIAL PRICE ★</span>
                        </div>

                        <div className="p-3.5 w-full flex flex-col items-center justify-between flex-1">
                          {showItemName && (
                            <h3 className="text-sm font-extrabold text-slate-900 leading-snug line-clamp-2 my-1">
                              {item.name}
                            </h3>
                          )}

                          {/* Massive Price Callout */}
                          {showPrice && (
                            <div className="my-2 py-1 px-4 bg-red-50 border border-red-200 rounded-lg text-center w-full">
                              <span className="text-lg font-black text-red-600 font-mono block">
                                {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                              </span>
                            </div>
                          )}

                          {/* Barcode Graphic */}
                          <div className="my-1.5 w-full flex justify-center overflow-hidden">
                            <BarcodeRenderer
                              value={item.barcode}
                              displayValue={showBarcodeText}
                              width={1.6}
                              height={34}
                              fontSize={9}
                            />
                          </div>

                          {/* Footer */}
                          <div className="w-full flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-200 font-mono text-slate-500">
                            {showSku && <span>SKU: {item.sku}</span>}
                            {showStoreName && <span className="font-bold text-slate-700">{settings.storeName}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${item.id}-${idx}`}
                      className={`barcode-label-card border border-slate-300 rounded-lg flex flex-col items-center justify-between text-center bg-white shadow-2xs print:border print:border-slate-300 print:shadow-none print:rounded-md ${
                        layout === 'shelf-tag' || layout === 'sheet-8'
                          ? 'p-3.5 border-2 border-slate-800 print:border-2 print:border-slate-900'
                          : layout === 'sheet-80'
                          ? 'p-1 text-[8px]'
                          : layout === 'single-mini'
                          ? 'p-1.5'
                          : 'p-2.5'
                      }`}
                    >
                      {/* Header */}
                      {showStoreName && layout !== 'sheet-80' && (
                        <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                          {settings.storeName}
                        </span>
                      )}

                      {/* Item Name */}
                      {showItemName && (
                        <h4 className={`font-bold text-slate-900 leading-tight line-clamp-1 max-w-full ${
                          layout === 'shelf-tag' || layout === 'sheet-8' ? 'text-xs' : 
                          layout === 'sheet-80' ? 'text-[8px]' : 'text-[11px]'
                        }`}>
                          {item.name}
                        </h4>
                      )}

                      {/* Barcode Graphic */}
                      <div className="my-1 w-full flex justify-center overflow-hidden">
                        <BarcodeRenderer
                          value={item.barcode}
                          displayValue={showBarcodeText && layout !== 'sheet-80'}
                          width={
                            layout === 'sheet-80' ? 0.9 :
                            layout === 'sheet-40' ? 1.1 :
                            layout === 'sheet-14' || layout === 'sheet-8' || layout === 'single-wide' ? 1.8 : 1.3
                          }
                          height={
                            layout === 'sheet-80' ? 18 :
                            layout === 'shelf-tag' || layout === 'sheet-8' ? 38 :
                            layout === 'single-mini' ? 20 : 30
                          }
                          fontSize={layout === 'sheet-80' ? 7 : 9}
                        />
                      </div>

                      {/* Footer Row: SKU & Price */}
                      <div className="w-full flex items-center justify-between pt-1 border-t border-slate-100 font-mono text-[10px]">
                        {showSku && (
                          <span className="text-slate-500 font-bold truncate max-w-[90px] text-[8px] sm:text-[9px]">
                            {item.sku}
                          </span>
                        )}
                        {showPrice && (
                          <span className={`font-extrabold text-emerald-800 font-mono ml-auto ${
                            layout === 'shelf-tag' || layout === 'sheet-8' ? 'text-xs' : 
                            layout === 'sheet-80' ? 'text-[8px]' : 'text-[11px]'
                          }`}>
                            {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

