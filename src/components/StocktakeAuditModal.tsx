import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem, StocktakeItemSummary } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  ClipboardCheck, 
  Scan, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Printer, 
  Download, 
  RotateCcw,
  Check,
  Package
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StocktakeAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StocktakeAuditModal: React.FC<StocktakeAuditModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    items, 
    settings, 
    currentUser, 
    commitStocktake, 
    addToast,
    setIsScannerModalOpen 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [onlyShowDiscrepancies, setOnlyShowDiscrepancies] = useState<boolean>(false);

  // Initialize counts with existing stock values on open
  React.useEffect(() => {
    if (items.length > 0) {
      const initial: Record<string, number> = {};
      items.forEach(i => {
        initial[i.id] = i.stock;
      });
      setCounts(initial);
    }
  }, [items]);

  if (!isOpen) return null;

  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  const filteredItems = items.filter(item => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.includes(q);

    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;

    if (onlyShowDiscrepancies) {
      const counted = counts[item.id] !== undefined ? counts[item.id] : item.stock;
      const hasDiff = counted !== item.stock;
      return matchesSearch && matchesCat && hasDiff;
    }

    return matchesSearch && matchesCat;
  });

  const handleUpdateCount = (itemId: string, val: number) => {
    setCounts(prev => ({
      ...prev,
      [itemId]: Math.max(0, val)
    }));
  };

  // Compile summary of modified items
  const summaries: StocktakeItemSummary[] = items.map(item => {
    const counted = counts[item.id] !== undefined ? counts[item.id] : item.stock;
    const variance = counted - item.stock;
    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      expectedStock: item.stock,
      countedStock: counted,
      variance,
      costPrice: item.costPrice
    };
  });

  const itemsWithDiscrepancy = summaries.filter(s => s.variance !== 0);
  const totalVarianceUnits = itemsWithDiscrepancy.reduce((acc, s) => acc + s.variance, 0);
  const totalVarianceCost = itemsWithDiscrepancy.reduce((acc, s) => acc + (s.variance * s.costPrice), 0);

  const handleCommit = () => {
    if (itemsWithDiscrepancy.length === 0) {
      addToast('info', 'No Discrepancies', 'All physical counts match the recorded database stock.');
      onClose();
      return;
    }

    const confirmMsg = `Apply inventory audit? This will update stock counts for ${itemsWithDiscrepancy.length} item(s) and record formal stock adjustment logs. Proceed?`;
    if (!window.confirm(confirmMsg)) return;

    commitStocktake(summaries);
    addToast('success', 'Stocktake Finalized', `Catalog stock updated for ${itemsWithDiscrepancy.length} items.`);
    onClose();
  };

  const handleExportStocktakePdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.storeName.toUpperCase(), 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('PHYSICAL STOCKTAKE & INVENTORY COUNT AUDIT', 14, 20);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Audited By: ${currentUser.name} (${currentUser.role})`, 14, 35);
    doc.text(`Date & Time: ${new Date().toLocaleString()}`, 14, 40);

    const rows = itemsWithDiscrepancy.map(s => [
      s.sku,
      s.name,
      s.category,
      s.expectedStock.toString(),
      s.countedStock.toString(),
      `${s.variance >= 0 ? '+' : ''}${s.variance}`,
      formatCurrency(s.variance * s.costPrice, settings.currencySymbol)
    ]);

    autoTable(doc, {
      startY: 46,
      head: [['SKU', 'Product Name', 'Category', 'System', 'Counted', 'Variance', `Financial Impact (${settings.currencySymbol})`]],
      body: rows.length > 0 ? rows : [['-', 'No discrepancies found', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 }
    });

    doc.save(`${settings.storeName.replace(/\s+/g, '_')}_Stocktake_Audit.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Physical Inventory Count & Stocktake Audit</h3>
              <p className="text-[11px] text-slate-300">
                Audit on-hand stock and reconcile catalog counts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search SKU, name, or barcode..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyShowDiscrepancies}
                onChange={(e) => setOnlyShowDiscrepancies(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span className="font-semibold">Only Show Discrepancies ({itemsWithDiscrepancy.length})</span>
            </label>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-200">
                  <th className="p-2.5 font-bold">Item Description</th>
                  <th className="p-2.5 font-bold text-center">System Recorded</th>
                  <th className="p-2.5 font-bold text-center w-28">Physical Count</th>
                  <th className="p-2.5 font-bold text-center">Variance</th>
                  <th className="p-2.5 font-bold text-right">Cost Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredItems.map(item => {
                  const counted = counts[item.id] !== undefined ? counts[item.id] : item.stock;
                  const variance = counted - item.stock;
                  const costVariance = variance * item.costPrice;

                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${variance !== 0 ? 'bg-amber-50/30' : ''}`}>
                      <td className="p-2.5 font-sans">
                        <span className="font-bold text-slate-800 block truncate max-w-xs">{item.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.category}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-600">
                        {item.stock} {item.unit || 'pcs'}
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={counted}
                          onChange={(e) => handleUpdateCount(item.id, parseInt(e.target.value) || 0)}
                          className={`w-20 px-2 py-1 bg-white border rounded-lg text-center text-xs font-bold font-mono focus:outline-none ${
                            variance !== 0 ? 'border-amber-400 bg-amber-50 font-bold' : 'border-slate-300'
                          }`}
                        />
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {variance === 0 ? (
                          <span className="text-emerald-600 flex items-center justify-center gap-0.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>Match</span>
                          </span>
                        ) : variance > 0 ? (
                          <span className="text-blue-600 font-bold">+{variance}</span>
                        ) : (
                          <span className="text-rose-600 font-bold">{variance}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        {costVariance === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={costVariance > 0 ? 'text-blue-600' : 'text-rose-600'}>
                            {costVariance > 0 ? '+' : ''}{formatCurrency(costVariance, settings.currencySymbol)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary & Commit */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Discrepancies:</span>
              <span className="font-bold text-slate-800">{itemsWithDiscrepancy.length} SKUs</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Net Unit Variance:</span>
              <span className={`font-bold ${totalVarianceUnits >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {totalVarianceUnits >= 0 ? '+' : ''}{totalVarianceUnits} units
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-sans block">Total Valuation Variance:</span>
              <span className={`font-bold ${totalVarianceCost >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {totalVarianceCost >= 0 ? '+' : ''}{formatCurrency(totalVarianceCost, settings.currencySymbol)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStocktakePdf}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Audit PDF</span>
            </button>
            <button
              type="button"
              onClick={handleCommit}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Commit Reconciled Counts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
