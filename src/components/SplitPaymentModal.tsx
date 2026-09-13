import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, SplitPayment, PAYMENT_METHODS, getPaymentMethodLabel } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  Split, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Banknote, 
  Smartphone, 
  Building, 
  CreditCard 
} from 'lucide-react';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  discountAmount?: number;
  onSuccess: (saleId: string) => void;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotal,
  customerName,
  customerPhone,
  notes,
  discountAmount,
  onSuccess
}) => {
  const { checkoutSale, settings, addToast } = useApp();

  // Initial splits: 2 tenders (Cash + Telebirr)
  const [splits, setSplits] = useState<SplitPayment[]>([
    { method: 'CASH', amount: Math.floor(grandTotal / 2) },
    { method: 'TELEBIRR', amount: Math.ceil(grandTotal / 2) }
  ]);

  if (!isOpen) return null;

  const totalAllocated = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const remainingToAllocate = grandTotal - totalAllocated;
  const isFullyAllocated = Math.abs(remainingToAllocate) < 0.01;

  const handleAddSplit = () => {
    const nextAmount = Math.max(0, remainingToAllocate);
    const availableMethods: PaymentMethod[] = ['CASH', 'TELEBIRR', 'CBE_YOHANNES', 'CBE_AZEB', 'AWASH', 'BOA', 'CREDIT'];
    const used = splits.map(s => s.method);
    const unused = availableMethods.find(m => !used.includes(m)) || 'CASH';

    setSplits(prev => [...prev, { method: unused, amount: nextAmount }]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length <= 2) {
      addToast('warning', 'Minimum Tenders', 'Split payment requires at least two payment tenders.');
      return;
    }
    setSplits(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateSplit = (index: number, field: keyof SplitPayment, value: any) => {
    setSplits(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSplitEvenly = () => {
    const count = splits.length;
    if (count === 0) return;
    const share = Math.floor((grandTotal / count) * 100) / 100;
    const remainder = Math.round((grandTotal - (share * count)) * 100) / 100;

    setSplits(prev => prev.map((s, idx) => ({
      ...s,
      amount: idx === 0 ? share + remainder : share
    })));
  };

  const handleFillRemaining = (index: number) => {
    const otherAllocated = splits.reduce((acc, s, idx) => idx === index ? acc : acc + (Number(s.amount) || 0), 0);
    const needed = Math.max(0, grandTotal - otherAllocated);
    handleUpdateSplit(index, 'amount', needed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFullyAllocated) {
      addToast('error', 'Unbalanced Split', `Please allocate the exact grand total (${formatCurrency(grandTotal, settings.currencySymbol)}). Currently ${remainingToAllocate > 0 ? 'under by' : 'over by'} ${formatCurrency(Math.abs(remainingToAllocate), settings.currencySymbol)}.`);
      return;
    }

    // Filter valid splits
    const validSplits = splits.filter(s => Number(s.amount) > 0);
    if (validSplits.length < 2) {
      addToast('warning', 'Multiple Methods Required', 'Please enter amounts for at least two tenders.');
      return;
    }

    // Primary method is the one with highest amount
    const primaryMethod = [...validSplits].sort((a, b) => b.amount - a.amount)[0].method;

    // Check credit customer requirement
    const hasCredit = validSplits.some(s => s.method === 'CREDIT');
    if (hasCredit && (!customerName || !customerName.trim())) {
      addToast('error', 'Customer Name Required', 'Customer name is mandatory when splitting part of payment to Credit.');
      return;
    }

    const sale = checkoutSale(
      primaryMethod,
      grandTotal,
      customerName,
      customerPhone,
      notes ? `${notes} [Split Tender: ${validSplits.map(s => `${getPaymentMethodLabel(s.method)}: ${formatCurrency(s.amount, settings.currencySymbol)}`).join(', ')}]` : `[Split Tender: ${validSplits.map(s => `${getPaymentMethodLabel(s.method)}: ${formatCurrency(s.amount, settings.currencySymbol)}`).join(', ')}]`,
      discountAmount,
      validSplits
    );

    if (sale) {
      onSuccess(sale.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-300 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Split Multi-Tender Payment</h3>
              <p className="text-[11px] text-emerald-300">
                Divide total across multiple tender accounts
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

        {/* Bill Summary Banner */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium">Grand Total Due:</span>
            <div className="text-base font-bold font-mono text-slate-900">
              {formatCurrency(grandTotal, settings.currencySymbol)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-500 font-medium">Balance Status:</span>
            <div className={`text-xs font-bold font-mono flex items-center gap-1 justify-end ${
              isFullyAllocated ? 'text-emerald-600' : remainingToAllocate > 0 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {isFullyAllocated ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Fully Balanced</span>
                </>
              ) : remainingToAllocate > 0 ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{formatCurrency(remainingToAllocate, settings.currencySymbol)} left</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{formatCurrency(Math.abs(remainingToAllocate), settings.currencySymbol)} over</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Tenders & Amounts</span>
            <button
              type="button"
              onClick={handleSplitEvenly}
              className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
            >
              Split Evenly (50/50)
            </button>
          </div>

          <div className="space-y-2">
            {splits.map((split, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={split.method}
                    onChange={(e) => handleUpdateSplit(idx, 'method', e.target.value as PaymentMethod)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CASH">Cash Tender</option>
                    <option value="TELEBIRR">Telebirr Wallet</option>
                    <option value="CBE_YOHANNES">CBE (Yohannes)</option>
                    <option value="CBE_AZEB">CBE (Azeb)</option>
                    <option value="AWASH">Awash Bank</option>
                    <option value="BOA">Bank of Abyssinia</option>
                    <option value="CARD">Debit / POS Card</option>
                    <option value="CREDIT">Store Credit Tab</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={split.amount || ''}
                        onChange={(e) => handleUpdateSplit(idx, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    {splits.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                  <input
                    type="text"
                    value={split.reference || ''}
                    onChange={(e) => handleUpdateSplit(idx, 'reference', e.target.value)}
                    placeholder="Ref / Transaction ID (Optional)"
                    className="text-[10px] bg-transparent border-none p-0 focus:outline-none text-slate-600 placeholder:text-slate-400 w-44"
                  />
                  {!isFullyAllocated && remainingToAllocate > 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining(idx)}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Fill remaining
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddSplit}
            className="w-full py-2 border border-dashed border-slate-300 hover:border-emerald-400 text-slate-600 hover:text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Another Payment Tender</span>
          </button>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFullyAllocated}
              className={`w-2/3 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 ${
                isFullyAllocated
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-emerald-900/20'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Split Sale</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
