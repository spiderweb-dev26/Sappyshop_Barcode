import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, ExpenseRecord } from '../types';
import { 
  TrendingDown, 
  Plus, 
  Search, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Trash2, 
  DollarSign, 
  X, 
  Calendar, 
  Tag, 
  Layers,
  Building,
  CreditCard,
  Banknote
} from 'lucide-react';
import { exportExpensesToExcel, exportExpensesToPdf } from '../utils/excelPdfUtils';
import { formatCurrency } from '../utils/currencyUtils';

export const ExpenseTracker: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    hasPermission, 
    settings, 
    currentUser,
    requestMasterAuth 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter expenses
  const filteredExpenses = (expenses || []).filter((e) => {
    if (!e) return false;
    const matchesSearch =
      (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.payee && e.payee.toLowerCase().includes(search.toLowerCase())) ||
      (e.expenseNo && e.expenseNo.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCat === 'ALL' || e.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const totalExpenseAmount = filteredExpenses.reduce((acc, e) => acc + (e?.amount || 0), 0);

  // Group by category
  const catSums: Record<string, number> = {};
  (expenses || []).forEach(e => {
    if (e && e.category) {
      catSums[e.category] = (catSums[e.category] || 0) + (e.amount || 0);
    }
  });

  const expenseCategoriesList: ExpenseCategory[] = [
    'RENT',
    'UTILITIES',
    'SALARIES',
    'SUPPLIES',
    'LOGISTICS',
    'MARKETING',
    'MAINTENANCE',
    'PACKAGING',
    'TAXES',
    'OTHER'
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Store Expenses & Overhead Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Log store operational expenses, utilities, payroll, and maintenance for P&L net margin calculations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExpensesToExcel(filteredExpenses, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => exportExpensesToPdf(filteredExpenses, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export PDF</span>
          </button>
          {hasPermission(['ADMIN', 'MANAGER']) && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Breakdown & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Operating Outflow</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalExpenseAmount, settings.currencySymbol)}
            </p>
          </div>
          <div className="pt-2 mt-2 border-t border-slate-100 text-[11px] text-slate-500">
            {filteredExpenses.length} Records Logged
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-lg border border-emerald-100 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Top Expense Categories
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(catSums).slice(0, 6).map(([cat, amt]) => (
              <div key={cat} className="p-2 rounded bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500">{cat}</span>
                <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                  {formatCurrency(amt, settings.currencySymbol)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses by title, vendor, reference invoice..."
            className="w-full h-8 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="w-full sm:w-48 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">All Categories</option>
          {expenseCategoriesList.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-[11px] uppercase">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Expense Title</th>
                <th className="py-2.5 px-4">Vendor / Payee</th>
                <th className="py-2.5 px-4">Payment Method</th>
                <th className="py-2.5 px-4">Recorded By</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <TrendingDown className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No Expenses Recorded</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {exp.date || new Date(exp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 uppercase">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {exp.title}
                      <span className="text-[10px] text-slate-400 font-mono ml-2">
                        {exp.expenseNo}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {exp.payee || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 uppercase text-[11px]">
                      {exp.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {exp.recordedByName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-700 text-sm">
                      {formatCurrency(exp.amount, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {hasPermission(['ADMIN']) && (
                        <button
                          onClick={() => {
                            requestMasterAuth({
                              title: 'Delete Expense Record Master Authorization',
                              actionName: `Delete Expense: ${exp.title} (${formatCurrency(exp.amount, settings.currencySymbol)})`,
                              description: `Category: ${exp.category}. Vendor: ${exp.vendor || 'N/A'}. Recorded by: ${exp.recordedByName}.`,
                              warning: 'This will remove the expense from store financial ledger and net profit calculations.',
                              onSuccess: () => {
                                deleteExpense(exp.id);
                              }
                            });
                          }}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RECORD EXPENSE MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSave={(data) => {
            addExpense(data);
            setIsAddModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'recordedBy' | 'recordedByName'>) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onSave }) => {
  const { settings } = useApp();
  const [category, setCategory] = useState<ExpenseCategory>('UTILITIES');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'>('TRANSFER');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!title.trim() || amt <= 0) return;

    onSave({
      category,
      title: title.trim(),
      amount: amt,
      vendor: vendor.trim() || undefined,
      referenceNumber: referenceNumber.trim() || undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900">
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-200" />
            <h3 className="font-bold text-sm">Record Store Expense</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Title / Description *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Electricity Bill, Packaging Bags"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                <option value="RENT">Rent</option>
                <option value="UTILITIES">Utilities</option>
                <option value="SALARIES">Salaries & Wages</option>
                <option value="SUPPLIES">Store Supplies</option>
                <option value="LOGISTICS">Logistics / Delivery</option>
                <option value="MARKETING">Marketing & Ads</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="PACKAGING">Packaging</option>
                <option value="TAXES">Taxes & Licenses</option>
                <option value="OTHER">Other Expense</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Amount ({settings.currencySymbol}) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor / Payee</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. City Power Co."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt / Ref #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-9923"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="TRANSFER">Bank Transfer</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Additional Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
