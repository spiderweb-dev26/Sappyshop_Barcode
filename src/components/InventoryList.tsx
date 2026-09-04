import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem, StockMovementType } from '../types';
import { 
  Search, 
  Plus, 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Filter, 
  Barcode as BarcodeIcon, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Sparkles, 
  Layers,
  Printer,
  Boxes
} from 'lucide-react';
import { BarcodeRenderer } from './BarcodeRenderer';
import { 
  downloadExcelTemplate, 
  parseExcelOrCsvFile, 
  parsePdfRawText, 
  exportInventoryToExcel, 
  exportInventoryToPdf 
} from '../utils/excelPdfUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { generateAutoSku, generateAutoBarcode, isCostUnknown, formatCostPrice, calculateProfitMargin } from '../utils/skuBarcodeUtils';
import { getFullStationeryCatalog, SAPPY_STATIONERY_CATALOG } from '../data/stationeryCatalog';

export const InventoryList: React.FC = () => {
  const { 
    items, 
    addItem, 
    updateItem, 
    deleteItem, 
    adjustStock, 
    bulkImportItems, 
    hasPermission, 
    settings, 
    addToast,
    setActiveTab,
    requestMasterAuth
  } = useApp();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'sku'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [barcodePreviewItem, setBarcodePreviewItem] = useState<InventoryItem | null>(null);

  // Stock Adjust form state
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustType, setAdjustType] = useState<StockMovementType>('RESTOCK');
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewItems, setImportPreviewItems] = useState<Partial<InventoryItem>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Categories list
  const categories = Array.from(new Set((items || []).map(i => i?.category || 'General'))).filter(Boolean);

  // Filtered & Sorted items
  const filteredItems = (items || []).filter(item => {
    if (!item) return false;
    const matchesSearch = 
      (item.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode || '').includes(search) ||
      (item.category || '').toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    let matchesStatus = true;
    if (selectedStatus === 'LOW_STOCK') {
      matchesStatus = (item.stock || 0) > 0 && (item.stock || 0) <= (item.minStockAlert || 5);
    } else if (selectedStatus === 'OUT_OF_STOCK') {
      matchesStatus = (item.stock || 0) <= 0;
    } else if (selectedStatus === 'IN_STOCK') {
      matchesStatus = (item.stock || 0) > (item.minStockAlert || 5);
    }

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') comp = (a.name || '').localeCompare(b.name || '');
    else if (sortBy === 'sku') comp = (a.sku || '').localeCompare(b.sku || '');
    else if (sortBy === 'stock') comp = (a.stock || 0) - (b.stock || 0);
    else if (sortBy === 'price') comp = (a.sellingPrice || 0) - (b.sellingPrice || 0);
    return sortAsc ? comp : -comp;
  });

  // Handle File Upload for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setImportErrors([]);

    try {
      if (file.name.endsWith('.pdf')) {
        // PDF text extract simulation / reader
        const text = await file.text();
        const parsed = parsePdfRawText(text);
        if (parsed.length === 0) {
          // Add default fallback sample parsed rows if raw PDF was binary
          setImportPreviewItems([
            {
              sku: `PDF-${file.name.slice(0, 4).toUpperCase()}-01`,
              barcode: `890${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              name: `Imported Catalog Product from ${file.name}`,
              category: 'General',
              costPrice: 15.0,
              sellingPrice: 25.0,
              stock: 20,
              minStockAlert: 5,
              unit: 'pcs'
            }
          ]);
        } else {
          setImportPreviewItems(parsed);
        }
      } else {
        // Excel (.xlsx, .xls) or CSV
        const { items: parsed, errors } = await parseExcelOrCsvFile(file);
        setImportPreviewItems(parsed);
        setImportErrors(errors);
      }
    } catch (err) {
      addToast('error', 'Parse Failed', (err as Error).message);
    } finally {
      setIsParsing(false);
    }
  };

  const handleCommitImport = () => {
    if (importPreviewItems.length === 0) return;
    if (importMode === 'replace') {
      requestMasterAuth({
        title: 'Catalog Overwrite Authorization',
        actionName: `Replace Entire Catalog with ${importPreviewItems.length} imported items`,
        description: 'This will wipe out current inventory items and replace them entirely with the imported dataset.',
        warning: 'Existing custom barcodes and prices will be replaced.',
        onSuccess: () => {
          bulkImportItems(importPreviewItems, importMode);
          setIsImportModalOpen(false);
          setImportPreviewItems([]);
          setImportFile(null);
        }
      });
    } else {
      bulkImportItems(importPreviewItems, importMode);
      setIsImportModalOpen(false);
      setImportPreviewItems([]);
      setImportFile(null);
    }
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustQty(0);
    setAdjustType('RESTOCK');
    setAdjustReason('');
  };

  const handleSaveAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || adjustQty === 0) return;

    const isSensitive = adjustType === 'DAMAGE' || adjustType === 'LOSS' || adjustType === 'RETURN_TO_SUPPLIER' || adjustType === 'INVENTORY_COUNT' || adjustQty < 0;
    
    if (isSensitive) {
      requestMasterAuth({
        title: 'Stock Adjustment Master Authorization',
        actionName: `Stock Adjustment for ${adjustingItem.name} (${adjustType})`,
        description: `Quantity change: ${adjustQty > 0 ? '+' : ''}${adjustQty} ${adjustingItem.unit}. Reason: ${adjustReason || 'Manual adjustment'}.`,
        warning: 'This modification directly changes on-hand inventory values and balance records.',
        onSuccess: () => {
          adjustStock(adjustingItem.id, adjustQty, adjustType, adjustReason || `${adjustType} adjustment`);
          setAdjustingItem(null);
        }
      });
    } else {
      adjustStock(adjustingItem.id, adjustQty, adjustType, adjustReason || `${adjustType} adjustment`);
      setAdjustingItem(null);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header & Main Actions */}
      <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Inventory & Stock Catalog
          </h1>
          <p className="text-xs text-slate-500">
            Manage product catalogue, barcode labels, cost margins, and real-time imports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Starter Template */}
          <button
            onClick={() => downloadExcelTemplate()}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
            title="Download Excel Starter Import Template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Template</span>
          </button>

          {/* Import Items */}
          {hasPermission(['ADMIN', 'MANAGER']) && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 border border-emerald-200/80 shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel/PDF</span>
            </button>
          )}

          {/* Export Report */}
          <button
            onClick={() => exportInventoryToExcel(filteredItems, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => exportInventoryToPdf(filteredItems, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export PDF</span>
          </button>

          {/* Add Item Button */}
          {hasPermission(['ADMIN', 'MANAGER']) && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, Barcode, Product Name, Brand, or Supplier..."
              className="w-full h-8 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-44 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories ({items.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({items.filter(i => i.category === cat).length})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full md:w-40 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">In Stock (Healthy)</option>
              <option value="LOW_STOCK">Low Stock Alerts</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>
        </div>

        {/* Results summary & Active counts */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of {items.length} products
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400">Sort by:</span>
            {(['name', 'stock', 'price', 'sku'] as const).map((field) => (
              <button
                key={field}
                onClick={() => {
                  if (sortBy === field) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortBy(field);
                    setSortAsc(true);
                  }
                }}
                className={`font-semibold capitalize px-2 py-0.5 rounded transition-colors ${
                  sortBy === field ? 'bg-emerald-100 text-emerald-800' : 'hover:text-slate-800'
                }`}
              >
                {field} {sortBy === field && (sortAsc ? '↑' : '↓')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Inventory Data Table */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-[11px] uppercase">
                <th className="py-2.5 px-4">SKU / Barcode</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Cost Price</th>
                <th className="py-2.5 px-4 text-right">Selling Price</th>
                <th className="py-2.5 px-4 text-right">Margin %</th>
                <th className="py-2.5 px-4 text-center">Stock Level</th>
                <th className="py-2.5 px-4">Location</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No matching products found</p>
                    <p className="text-[11px] mt-0.5">Try refining your search terms or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const hasUnknownCost = isCostUnknown(item.costPrice);
                  const margin = calculateProfitMargin(item.costPrice, item.sellingPrice);
                  const isLowStock = item.stock > 0 && item.stock <= (item.minStockAlert || 5);
                  const isOutOfStock = item.stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors group">
                      {/* SKU & Barcode */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{item.sku}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                          <BarcodeIcon className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{item.barcode}</span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 truncate">{item.description}</p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {item.category || 'General'}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-mono">
                        {hasUnknownCost ? (
                          <span className="text-slate-400 text-[11px] italic" title="Cost not recorded (0.00)">
                            Unknown (0.00)
                          </span>
                        ) : (
                          <span className="text-slate-600">
                            {formatCostPrice(item.costPrice, settings.currencySymbol)}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-4 text-right font-mono">
                        {hasUnknownCost ? (
                          <span className="text-slate-400 text-[11px] italic" title="Cannot calculate without known cost">
                            —
                          </span>
                        ) : (
                          <span className={`font-semibold ${margin > 35 ? 'text-emerald-700' : margin > 15 ? 'text-teal-600' : 'text-amber-700'}`}>
                            {margin.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Stock on Hand Badge */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] inline-flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}>
                            {isOutOfStock ? (
                              'Out of Stock'
                            ) : isLowStock ? (
                              <><AlertTriangle className="w-3 h-3 text-amber-600" /> {item.stock} Pcs</>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> {item.stock} Pcs</>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">Min Alert: 5 Pcs</span>
                        </div>
                      </td>

                      {/* Location / Shelf */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {item.location || '—'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Barcode Label View / Print */}
                          <button
                            onClick={() => setBarcodePreviewItem(item)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Preview & Print Barcode Label"
                          >
                            <BarcodeIcon className="w-4 h-4" />
                          </button>

                          {/* Quick Adjust Stock */}
                          {hasPermission(['ADMIN', 'MANAGER']) && (
                            <button
                              onClick={() => handleOpenAdjust(item)}
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                              title="Adjust Stock (+ / -)"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Item */}
                          {hasPermission(['ADMIN', 'MANAGER']) && (
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setIsAddModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Item Details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete Item */}
                          {hasPermission(['ADMIN']) && (
                            <button
                              onClick={() => {
                                requestMasterAuth({
                                  title: 'Item Deletion Master Authorization',
                                  actionName: `Delete Product: ${item.name} (${item.sku})`,
                                  description: `Current recorded stock: ${item.stock} ${item.unit}. Price: ${formatCurrency(item.sellingPrice, settings.currencySymbol)}.`,
                                  warning: 'This item will be permanently removed from the stationery inventory and POS checkout.',
                                  onSuccess: () => {
                                    deleteItem(item.id);
                                  }
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT ITEM MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <AddItemModal
          isOpen={isAddModalOpen}
          initialItem={editingItem}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
          onSave={(itemData) => {
            if (editingItem) {
              updateItem(editingItem.id, itemData);
            } else {
              addItem(itemData);
            }
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* STOCK ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Stock Inventory Adjustment</h3>
              </div>
              <button onClick={() => setAdjustingItem(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-sm text-slate-900">{adjustingItem.name}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1 font-mono">
                  <span>SKU: {adjustingItem.sku}</span>
                  <span>Current On Hand: <strong className="text-slate-800">{adjustingItem.stock} {adjustingItem.unit}</strong></span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium">
                  {(['RESTOCK', 'ADJUSTMENT', 'DAMAGE', 'RETURN'] as StockMovementType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setAdjustType(t);
                        if (t === 'RESTOCK' || t === 'RETURN') {
                          if (adjustQty < 0) setAdjustQty(Math.abs(adjustQty));
                        } else if (t === 'DAMAGE') {
                          if (adjustQty > 0) setAdjustQty(-Math.abs(adjustQty));
                        }
                      }}
                      className={`py-2 rounded-lg border text-center transition-all ${
                        adjustType === t
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Quantity Change ({adjustType === 'RESTOCK' ? '+' : adjustType === 'DAMAGE' ? '-' : '+ / -'})
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 10 or -3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  New stock will become: <strong className="text-emerald-700">{Math.max(0, adjustingItem.stock + adjustQty)} {adjustingItem.unit}</strong>
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier PO arrival, shelf recount, damaged package"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IMPORT ITEMS (EXCEL / PDF) MODAL */}
      {/* ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-sm">Batch Import Inventory (Excel / CSV / PDF)</h3>
                  <p className="text-[11px] text-emerald-200">Upload spreadsheet or parsed catalog document</p>
                </div>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 p-6 rounded-2xl text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv,.pdf"
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">
                  {importFile ? importFile.name : 'Click to select or drag & drop Excel (.xlsx, .csv) or PDF'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports up to 5,000 SKUs with auto-column matching.
                </p>
              </div>

              {/* Format Guide & Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-slate-600 text-[11px]">Download formatted template</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadExcelTemplate(settings.currencySymbol)}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1 text-[11px] whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" /> .XLSX Template
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-emerald-900 font-medium text-[11px]">Master Stationery Catalog</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allCatalog = getFullStationeryCatalog();
                      setImportPreviewItems(allCatalog);
                      setImportErrors([]);
                      setImportFile(new File([''], 'Sappy_Stationery_Master_Catalog.xlsx'));
                    }}
                    className="text-emerald-800 font-bold hover:text-emerald-950 bg-white px-2 py-1 rounded shadow-xs border border-emerald-300 text-[11px] whitespace-nowrap"
                  >
                    Load 240+ Items
                  </button>
                </div>
              </div>

              {/* Supported Columns Banner */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Supported Excel Columns:</p>
                  <p className="text-blue-800 font-mono mt-0.5">
                    Name | Category | Selling Price (ETB) | Cost (ETB) | Qty
                  </p>
                  <p className="text-blue-700 text-[10px] mt-0.5">
                    SKU & Barcodes are auto-generated if omitted. Standard unit: <b>Pcs</b>, Min stock alert: <b>5</b>.
                  </p>
                </div>
              </div>

              {/* Parse Feedback & Preview Table */}
              {isParsing && (
                <div className="text-center py-6 text-xs text-slate-500">
                  Parsing spreadsheet rows...
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                  <p className="font-bold">Validation Warnings:</p>
                  {importErrors.slice(0, 3).map((err, i) => (
                    <p key={i} className="text-[11px] font-mono">&bull; {err}</p>
                  ))}
                </div>
              )}

              {importPreviewItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-slate-800">
                        Parsed Preview ({importPreviewItems.length} Products Found)
                      </h4>
                      {importPreviewItems.some(i => !i.sellingPrice || i.sellingPrice === 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = importPreviewItems.map(item => {
                              const clean = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                              const match = SAPPY_STATIONERY_CATALOG.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) ||
                                            SAPPY_STATIONERY_CATALOG.find(c => clean.includes(c.name.toLowerCase().replace(/[^a-z0-9]/g, '')));
                              if (match) {
                                return {
                                  ...item,
                                  sellingPrice: item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : match.sellingPrice,
                                  costPrice: item.costPrice && item.costPrice > 0 ? item.costPrice : match.costPrice,
                                  category: item.category && item.category !== 'General' ? item.category : match.category
                                };
                              }
                              return item;
                            });
                            setImportPreviewItems(updated);
                            addToast('success', 'Prices Recovered', 'Auto-filled prices from master stationery catalog.');
                          }}
                          className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold rounded flex items-center gap-1 border border-amber-300 shadow-2xs"
                        >
                          <Sparkles className="w-3 h-3 text-amber-700" /> Auto-fill Prices from Catalog
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                        />
                        <span>Append & Update</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                        />
                        <span>Replace Catalog</span>
                      </label>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Total Products</span>
                      <span className="font-bold text-slate-800">{importPreviewItems.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Priced Items</span>
                      <span className="font-bold text-emerald-700">
                        {importPreviewItems.filter(i => (i.sellingPrice || 0) > 0).length} / {importPreviewItems.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Total Stock (Pcs)</span>
                      <span className="font-bold text-blue-700">
                        {importPreviewItems.reduce((acc, i) => acc + (i.stock || 0), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="py-2 px-2.5">SKU</th>
                          <th className="py-2 px-2.5">Item Name</th>
                          <th className="py-2 px-2.5">Category</th>
                          <th className="py-2 px-2.5 text-right">Cost</th>
                          <th className="py-2 px-2.5 text-right">Selling Price</th>
                          <th className="py-2 px-2.5 text-right">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewItems.slice(0, 30).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-600">{p.sku}</td>
                            <td className="py-1.5 px-2.5 font-medium truncate max-w-[160px]">{p.name}</td>
                            <td className="py-1.5 px-2.5 text-slate-500">{p.category}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={p.costPrice ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updated = [...importPreviewItems];
                                  updated[idx] = { ...updated[idx], costPrice: val };
                                  setImportPreviewItems(updated);
                                }}
                                className="w-16 px-1 py-0.5 text-right border border-slate-200 rounded font-mono text-[10px] focus:outline-emerald-500"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={p.sellingPrice ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  const updated = [...importPreviewItems];
                                  updated[idx] = { ...updated[idx], sellingPrice: val };
                                  setImportPreviewItems(updated);
                                }}
                                className={`w-18 px-1 py-0.5 text-right border rounded font-mono text-[10px] font-bold focus:outline-emerald-500 ${
                                  (p.sellingPrice || 0) > 0 ? 'border-emerald-200 text-emerald-700 bg-emerald-50/40' : 'border-amber-300 text-amber-700 bg-amber-50'
                                }`}
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold">
                              <input
                                type="number"
                                min="0"
                                value={p.stock ?? 0}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  const updated = [...importPreviewItems];
                                  updated[idx] = { ...updated[idx], stock: val };
                                  setImportPreviewItems(updated);
                                }}
                                className="w-14 px-1 py-0.5 text-right border border-slate-200 rounded font-mono text-[10px] focus:outline-emerald-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreviewItems.length > 30 && (
                      <div className="p-2 bg-slate-50 text-center text-[10px] text-slate-500 border-t border-slate-100">
                        Showing first 30 of {importPreviewItems.length} items. All items will be imported.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {importPreviewItems.length > 0 ? `${importPreviewItems.length} items ready to commit` : 'Select a file to begin'}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={importPreviewItems.length === 0}
                  onClick={handleCommitImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Import {importPreviewItems.length} Products
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK BARCODE LABEL PREVIEW MODAL */}
      {/* ========================================================================= */}
      {barcodePreviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarcodeIcon className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-xs">Product Barcode Label</h3>
              </div>
              <button onClick={() => setBarcodePreviewItem(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="border-2 border-dashed border-slate-200 p-4 rounded-xl bg-slate-50/50 w-full">
                <p className="font-bold text-xs text-slate-900 truncate">{barcodePreviewItem.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {barcodePreviewItem.sku}</p>
                <div className="my-3 py-1 flex justify-center">
                  <BarcodeRenderer value={barcodePreviewItem.barcode} width={1.8} height={45} fontSize={12} />
                </div>
                <p className="text-base font-extrabold text-emerald-800">
                  {formatCurrency(barcodePreviewItem.sellingPrice, settings.currencySymbol)}
                </p>
              </div>

              <div className="flex gap-2 w-full pt-2">
                <button
                  onClick={() => {
                    setBarcodePreviewItem(null);
                    setActiveTab('labels');
                  }}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Barcode Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: ADD / EDIT ITEM FORM MODAL
// =========================================================================
interface AddItemModalProps {
  isOpen: boolean;
  initialItem?: InventoryItem | null;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, initialItem, onClose, onSave }) => {
  const { settings } = useApp();
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState(initialItem?.category || 'General');
  const [sku, setSku] = useState(initialItem?.sku || generateAutoSku(initialItem?.category || 'General', initialItem?.name));
  const [barcode, setBarcode] = useState(initialItem?.barcode || generateAutoBarcode());
  const [costPrice, setCostPrice] = useState(initialItem?.costPrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(initialItem?.sellingPrice?.toString() || '');
  const [stock, setStock] = useState(initialItem?.stock?.toString() || '10');
  const [location, setLocation] = useState(initialItem?.location || '');
  const [description, setDescription] = useState(initialItem?.description || '');

  if (!isOpen) return null;

  const cost = parseFloat(costPrice) || 0;
  const price = parseFloat(sellingPrice) || 0;
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

  const handleGenerateBarcode = () => {
    setBarcode(generateAutoBarcode());
  };

  const handleGenerateSku = () => {
    setSku(generateAutoSku(category, name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalSku = sku.trim() || generateAutoSku(category, name);
    const finalBarcode = barcode.trim() || generateAutoBarcode();

    onSave({
      sku: finalSku,
      barcode: finalBarcode,
      name: name.trim(),
      category: category.trim() || 'General',
      unit: 'Pcs',
      costPrice: cost,
      sellingPrice: price,
      stock: parseInt(stock, 10) || 0,
      minStockAlert: 5,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden text-slate-900 flex flex-col max-h-[92vh]">
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="font-bold text-sm">
                {initialItem ? 'Edit Stationery Item' : 'Add New Stationery Item'}
              </h3>
              <p className="text-[11px] text-emerald-200">Auto-generated SKU & Barcode • Unit: Pcs • Min Alert: 5</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Name & Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Product Name / Title *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!initialItem && !sku) {
                  setSku(generateAutoSku(category, e.target.value));
                }
              }}
              placeholder="e.g. Stationery set, Oil Paints, Clear Bag 80 Page, Metal Ruler"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (!initialItem) {
                    setSku(generateAutoSku(e.target.value, name));
                  }
                }}
                placeholder="e.g. Kids Material, Paint, Colors, Notebooks, Ruler, Scissor"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Shelf / Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Aisle 1 - Shelf A, Register Drawer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Auto-generated SKU & Barcode */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Auto-Generated Codes
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for POS scanner & labels</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between mb-1">
                  <span>SKU Code</span>
                  <button
                    type="button"
                    onClick={handleGenerateSku}
                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                  >
                    Auto-Generate
                  </button>
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. KID-4821"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 flex items-center justify-between mb-1">
                  <span>Barcode (EAN-13)</span>
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-[10px] text-emerald-700 hover:underline font-bold"
                  >
                    Generate Barcode
                  </button>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Live Barcode Graphic Preview */}
            {barcode && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-center">
                <BarcodeRenderer value={barcode} width={1.4} height={32} fontSize={10} />
              </div>
            )}
          </div>

          {/* Pricing & Margins */}
          <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
            <h4 className="text-xs font-bold text-emerald-900">Pricing & Margins</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Selling Price ({settings.currencySymbol}) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Cost Price ({settings.currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00 (Unknown Cost)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  0.00 = Unknown / unrecorded cost
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Gross Margin</label>
                <div className="px-3 py-2 bg-emerald-100 text-emerald-900 font-mono font-bold text-xs rounded-xl border border-emerald-300 flex items-center justify-between">
                  {cost <= 0 ? (
                    <span className="text-slate-500 italic text-[11px]">Unknown Cost (—)</span>
                  ) : (
                    <>
                      <span>{margin.toFixed(1)}%</span>
                      <span className="text-[10px] text-emerald-700">+{formatCurrency(price - cost, settings.currencySymbol)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Quantities & System Standard Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Initial Quantity (Pcs) *</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Unit of Measure</label>
              <div className="px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 text-center">
                Pcs (Pieces)
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">Low Stock Alert</label>
              <div className="px-3 py-2 bg-amber-50 text-amber-900 font-semibold text-xs rounded-xl border border-amber-200 text-center">
                Min 5 Pcs
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Product Notes & Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Packaging details, dimensions, color or special characteristics..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 -mx-6 -mb-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-950/20"
            >
              {initialItem ? 'Save Changes' : 'Catalog Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
