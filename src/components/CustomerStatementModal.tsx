import React from 'react';
import { useApp } from '../context/AppContext';
import { SaleRecord } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { generateCustomerStatementPdf } from '../utils/customerStatementUtils';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone,
  CreditCard
} from 'lucide-react';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  customerSales: SaleRecord[];
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  customerSales
}) => {
  const { settings, currentUser } = useApp();

  if (!isOpen) return null;

  const sortedSales = [...customerSales].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalCreditPurchased = customerSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalSettled = customerSales.reduce((acc, s) => {
    return acc + (s.paymentStatus === 'PAID' ? s.grandTotal : (s.amountPaid || 0));
  }, 0);
  const outstandingBalance = Math.max(0, totalCreditPurchased - totalSettled);

  const handleDownloadPdf = () => {
    generateCustomerStatementPdf(
      customerName,
      customerPhone,
      customerSales,
      settings,
      currentUser
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-emerald-300 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Customer Credit Account Statement</h3>
              <p className="text-[11px] text-emerald-300">
                Official statement of account ledger & repayment history
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

        {/* Customer Profile Banner */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-sm text-slate-900">{customerName}</h4>
            </div>
            {customerPhone && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{customerPhone}</span>
              </p>
            )}
          </div>

          {/* Metrics summary */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-sans block">Total Credit</span>
              <span className="font-bold text-slate-800">
                {formatCurrency(totalCreditPurchased, settings.currencySymbol)}
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 font-sans block">Paid Back</span>
              <span className="font-bold text-emerald-700">
                {formatCurrency(totalSettled, settings.currencySymbol)}
              </span>
            </div>
            <div className={`p-2 rounded-lg border ${
              outstandingBalance > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}>
              <span className="text-[10px] font-sans block">Current Due</span>
              <span className="font-bold text-sm">
                {formatCurrency(outstandingBalance, settings.currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Transaction History */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-200">
                  <th className="p-2.5 font-bold">Date & Invoice</th>
                  <th className="p-2.5 font-bold">Purchased Items</th>
                  <th className="p-2.5 font-bold text-right">Invoice Total</th>
                  <th className="p-2.5 font-bold text-right">Amount Paid</th>
                  <th className="p-2.5 font-bold text-right">Balance Due</th>
                  <th className="p-2.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {sortedSales.map(s => {
                  const isPaid = s.paymentStatus === 'PAID';
                  const paid = isPaid ? s.grandTotal : (s.amountPaid || 0);
                  const due = isPaid ? 0 : Math.max(0, s.grandTotal - (s.amountPaid || 0));

                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2.5">
                        <span className="font-bold text-slate-800 block">{s.invoiceNo}</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans">
                        <div className="truncate max-w-xs text-slate-700">
                          {s.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-800">
                        {formatCurrency(s.grandTotal, settings.currencySymbol)}
                      </td>
                      <td className="p-2.5 text-right text-emerald-700">
                        {formatCurrency(paid, settings.currencySymbol)}
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        <span className={due > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatCurrency(due, settings.currencySymbol)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isPaid ? 'SETTLED' : 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {customerSales.length} credit invoice{customerSales.length === 1 ? '' : 's'} on record
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Statement PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
