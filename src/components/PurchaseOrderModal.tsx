import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem, Supplier } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { generatePurchaseOrderPdf, PurchaseOrderItem } from '../utils/purchaseOrderUtils';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  Building2, 
  Boxes, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Trash2,
  Search
} from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose
}) => {
  const { items, suppliers, settings, currentUser, addToast } = useApp();

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('Urgent restock needed for high-demand school stationery items.');
  
  // Suggested order items state: map of itemId -> order quantity
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});

  // Low stock items
  const lowStockCandidates = useMemo(() => {
    return items.filter(i => i.stock <= i.minStockAlert);
  }, [items]);

  // Initialize suggested quantities
  React.useEffect(() => {
    if (lowStockCandidates.length > 0) {
      const initial: Record<string, number> = {};
      lowStockCandidates.forEach(i => {
        const needed = Math.max(10, (i.minStockAlert * 2) - i.stock);
        initial[i.id] = needed;
      });
      setOrderQuantities(initial);
    }
  }, [lowStockCandidates]);

  if (!isOpen) return null;

  const filteredCandidates = lowStockCandidates.filter(item => {
    const matchesSearch = !searchTerm.trim() || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSupplier = selectedSupplierId === 'ALL' || item.supplier === selectedSupplierId;
    return matchesSearch && matchesSupplier;
  });

  const handleUpdateQty = (itemId: string, qty: number) => {
    setOrderQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(0, qty)
    }));
  };

  // Compile active purchase order lines
  const activeOrderItems: PurchaseOrderItem[] = filteredCandidates
    .map(item => {
      const orderQty = orderQuantities[item.id] !== undefined ? orderQuantities[item.id] : Math.max(10, (item.minStockAlert * 2) - item.stock);
      return {
        item,
        suggestedQuantity: Math.max(10, (item.minStockAlert * 2) - item.stock),
        orderQuantity: orderQty,
        unitCost: item.costPrice,
        subtotal: orderQty * item.costPrice
      };
    })
    .filter(oi => oi.orderQuantity > 0);

  const totalEstimatedCost = activeOrderItems.reduce((acc, oi) => acc + oi.subtotal, 0);
  const totalUnits = activeOrderItems.reduce((acc, oi) => acc + oi.orderQuantity, 0);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId || s.name === selectedSupplierId) || null;

  const handleExportPdf = () => {
    if (activeOrderItems.length === 0) {
      addToast('warning', 'No Items in Order', 'Please specify order quantities for at least one item.');
      return;
    }

    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    generatePurchaseOrderPdf(
      poNumber,
      selectedSupplier,
      activeOrderItems,
      settings,
      currentUser,
      poNotes
    );
    addToast('success', 'Purchase Order Generated', `Saved ${poNumber} for ${activeOrderItems.length} items.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-300 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Low-Stock Purchase Order Generator</h3>
              <p className="text-[11px] text-emerald-300">
                Generate restock orders with supplier details & cost basis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Filter by Supplier / Vendor
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Stationery Suppliers ({suppliers.length})</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Search SKU or Item Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 stroke-1" />
              <p className="text-xs font-bold text-slate-700">Stock Levels are Healthy</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No items currently match low stock alert criteria for this filter.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-200">
                    <th className="p-2.5 font-bold">Item Description</th>
                    <th className="p-2.5 font-bold text-center">In Stock</th>
                    <th className="p-2.5 font-bold text-center">Min Alert</th>
                    <th className="p-2.5 font-bold text-center w-24">Order Qty</th>
                    <th className="p-2.5 font-bold text-right">Unit Cost</th>
                    <th className="p-2.5 font-bold text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredCandidates.map(item => {
                    const orderQty = orderQuantities[item.id] !== undefined ? orderQuantities[item.id] : Math.max(10, (item.minStockAlert * 2) - item.stock);
                    const lineCost = orderQty * item.costPrice;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-sans">
                          <span className="font-bold text-slate-800 block truncate max-w-xs">{item.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{item.sku} • {item.category}</span>
                        </td>
                        <td className="p-2.5 text-center text-rose-600 font-bold">
                          {item.stock} {item.unit || 'pcs'}
                        </td>
                        <td className="p-2.5 text-center text-slate-400">
                          {item.minStockAlert}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={orderQty}
                            onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-1.5 py-1 bg-white border border-slate-300 rounded text-center text-xs font-bold font-mono focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                        <td className="p-2.5 text-right text-slate-600">
                          {formatCurrency(item.costPrice, settings.currencySymbol)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-slate-900">
                          {formatCurrency(lineCost, settings.currencySymbol)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Notes */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Purchase Order Instructions / Delivery Notes
            </label>
            <input
              type="text"
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="e.g. Standard payment terms apply. Deliver to retail branch."
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Footer Summary & Generate Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-500 block">Total PO Estimation:</span>
            <div className="flex items-center gap-3">
              <span className="text-base font-bold font-mono text-emerald-950">
                {formatCurrency(totalEstimatedCost, settings.currencySymbol)}
              </span>
              <span className="text-xs text-slate-500">
                ({totalUnits} units across {activeOrderItems.length} SKUs)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={activeOrderItems.length === 0}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
                activeOrderItems.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Export Official PO PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
