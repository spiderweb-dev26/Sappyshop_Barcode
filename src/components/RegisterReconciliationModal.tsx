import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { RegisterShift } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  Calculator, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  X, 
  Clock, 
  User, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Receipt
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RegisterReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegisterReconciliationModal: React.FC<RegisterReconciliationModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    activeShift, 
    openRegisterShift, 
    closeRegisterShift, 
    shiftsHistory, 
    sales, 
    expenses, 
    settings, 
    currentUser, 
    addToast 
  } = useApp();

  // Open Shift Form State
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('500');
  const [openNotesInput, setOpenNotesInput] = useState<string>('');

  // Close Shift Form State
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotesInput, setCloseNotesInput] = useState<string>('');

  // View state: 'reconcile' | 'history' | 'zreport'
  const [viewMode, setViewMode] = useState<'reconcile' | 'history'>('reconcile');
  const [lastClosedShift, setLastClosedShift] = useState<RegisterShift | null>(null);

  // Compute live active shift figures
  const shiftMetrics = useMemo(() => {
    if (!activeShift) return null;

    const shiftStart = new Date(activeShift.openedAt).getTime();

    // Sales during shift
    const shiftSales = sales.filter(s => 
      new Date(s.createdAt).getTime() >= shiftStart && s.status === 'COMPLETED'
    );

    let cashSalesTotal = 0;
    let nonCashSalesTotal = 0;

    shiftSales.forEach(s => {
      if (s.splitPayments && s.splitPayments.length > 0) {
        s.splitPayments.forEach(sp => {
          if (sp.method === 'CASH') {
            cashSalesTotal += Number(sp.amount) || 0;
          } else {
            nonCashSalesTotal += Number(sp.amount) || 0;
          }
        });
      } else if (s.paymentMethod === 'CASH') {
        cashSalesTotal += s.grandTotal;
      } else {
        nonCashSalesTotal += s.grandTotal;
      }
    });

    // Cash expenses during shift
    const shiftExpenses = expenses.filter(e => 
      new Date(e.createdAt).getTime() >= shiftStart && e.paymentMethod === 'CASH'
    );
    const cashExpensesTotal = shiftExpenses.reduce((acc, e) => acc + e.amount, 0);

    const expectedCashInDrawer = activeShift.openingFloat + cashSalesTotal - cashExpensesTotal;

    return {
      salesCount: shiftSales.length,
      cashSalesTotal,
      nonCashSalesTotal,
      totalSalesRevenue: cashSalesTotal + nonCashSalesTotal,
      cashExpensesTotal,
      expectedCashInDrawer
    };
  }, [activeShift, sales, expenses]);

  if (!isOpen) return null;

  const countedCash = parseFloat(countedCashInput) || 0;
  const discrepancy = shiftMetrics ? (countedCash - shiftMetrics.expectedCashInDrawer) : 0;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloatInput) || 0;
    openRegisterShift(floatVal, openNotesInput.trim() || undefined);
    setOpenNotesInput('');
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCashInput.trim()) {
      addToast('error', 'Counted Cash Required', 'Please enter the physical cash counted in the drawer.');
      return;
    }

    const closed = closeRegisterShift(countedCash, closeNotesInput.trim() || undefined);
    if (closed) {
      setLastClosedShift(closed);
      setCountedCashInput('');
      setCloseNotesInput('');
    }
  };

  const handlePrintZReport = (shift: RegisterShift) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // 80mm thermal receipt format
    });

    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.text(settings.storeName.toUpperCase(), 40, 10, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('courier', 'normal');
    doc.text('END-OF-DAY REGISTER Z-REPORT', 40, 15, { align: 'center' });
    doc.text('--------------------------------', 40, 19, { align: 'center' });

    doc.setFontSize(8);
    doc.text(`Shift ID: ${shift.id.slice(-8)}`, 5, 24);
    doc.text(`Opened: ${new Date(shift.openedAt).toLocaleString()}`, 5, 28);
    doc.text(`Closed: ${shift.closedAt ? new Date(shift.closedAt).toLocaleString() : 'N/A'}`, 5, 32);
    doc.text(`Cashier: ${shift.openedByName}`, 5, 36);

    doc.text('--------------------------------', 40, 40, { align: 'center' });
    doc.setFont('courier', 'bold');
    doc.text('CASH DRAWER RECONCILIATION', 40, 44, { align: 'center' });
    doc.setFont('courier', 'normal');

    let y = 50;
    doc.text(`Opening Float:`, 5, y);
    doc.text(formatCurrency(shift.openingFloat, settings.currencySymbol), 75, y, { align: 'right' });

    y += 5;
    doc.text(`(+) Cash Sales:`, 5, y);
    doc.text(formatCurrency(shift.cashSalesTotal, settings.currencySymbol), 75, y, { align: 'right' });

    y += 5;
    doc.text(`(-) Cash Expenses:`, 5, y);
    doc.text(`-${formatCurrency(shift.cashExpensesTotal, settings.currencySymbol)}`, 75, y, { align: 'right' });

    y += 5;
    doc.setFont('courier', 'bold');
    doc.text(`(=) Expected Cash:`, 5, y);
    doc.text(formatCurrency(shift.expectedCash || 0, settings.currencySymbol), 75, y, { align: 'right' });

    y += 6;
    doc.text(`Counted Cash:`, 5, y);
    doc.text(formatCurrency(shift.closingCashCounted || 0, settings.currencySymbol), 75, y, { align: 'right' });

    y += 5;
    const diff = shift.discrepancy || 0;
    doc.text(`Over / Short:`, 5, y);
    doc.text(`${diff >= 0 ? '+' : ''}${formatCurrency(diff, settings.currencySymbol)}`, 75, y, { align: 'right' });

    y += 7;
    doc.setFont('courier', 'normal');
    doc.text('--------------------------------', 40, y, { align: 'center' });
    y += 4;
    doc.text(`Digital / Bank Sales:`, 5, y);
    doc.text(formatCurrency(shift.nonCashSalesTotal, settings.currencySymbol), 75, y, { align: 'right' });

    y += 5;
    doc.setFont('courier', 'bold');
    doc.text(`Total Gross Revenue:`, 5, y);
    doc.text(formatCurrency(shift.cashSalesTotal + shift.nonCashSalesTotal, settings.currencySymbol), 75, y, { align: 'right' });

    y += 12;
    doc.setFont('courier', 'normal');
    doc.text('Cashier Signature: ____________', 5, y);
    y += 6;
    doc.text('Manager Verification: _________', 5, y);

    doc.save(`ZReport_${shift.id.slice(-6)}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Register Reconciliation & Z-Report</h3>
              <p className="text-[11px] text-slate-300">
                End-of-day drawer audit & cash count
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setViewMode('reconcile')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  viewMode === 'reconcile' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Current Shift
              </button>
              <button
                type="button"
                onClick={() => setViewMode('history')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  viewMode === 'history' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                History ({shiftsHistory.length})
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {viewMode === 'history' ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Past Register Shifts & Z-Reports</h4>
              {shiftsHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-bold text-slate-500">No shifts closed yet</p>
                  <p className="text-[11px] text-slate-400">Closed shifts and Z-reports will appear here.</p>
                </div>
              ) : (
                shiftsHistory.map(shift => (
                  <div key={shift.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          Shift #{shift.id.slice(-6)}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                          CLOSED
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {shift.closedAt ? new Date(shift.closedAt).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                      <div className="bg-white p-1.5 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Total Sales</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(shift.cashSalesTotal + shift.nonCashSalesTotal, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-sans block">Counted Cash</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(shift.closingCashCounted || 0, settings.currencySymbol)}
                        </span>
                      </div>
                      <div className={`p-1.5 rounded border ${
                        (shift.discrepancy || 0) === 0
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold'
                          : (shift.discrepancy || 0) > 0
                          ? 'bg-blue-50 border-blue-200 text-blue-800 font-bold'
                          : 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                      }`}>
                        <span className="text-[10px] font-sans block">Variance</span>
                        <span>
                          {(shift.discrepancy || 0) >= 0 ? '+' : ''}
                          {formatCurrency(shift.discrepancy || 0, settings.currencySymbol)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[11px] text-slate-500">
                      <span>Cashier: {shift.openedByName}</span>
                      <button
                        type="button"
                        onClick={() => handlePrintZReport(shift)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print Z-Report</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : lastClosedShift ? (
            /* Just Closed Shift Banner */
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Register Shift Closed Successfully</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shift #{lastClosedShift.id.slice(-6)} reconciliation is finalized and archived.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left font-mono text-xs space-y-1.5 max-w-sm mx-auto">
                <div className="flex justify-between text-slate-600">
                  <span>Opening Float:</span>
                  <span>{formatCurrency(lastClosedShift.openingFloat, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cash Sales:</span>
                  <span>+{formatCurrency(lastClosedShift.cashSalesTotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cash Expenses:</span>
                  <span>-{formatCurrency(lastClosedShift.cashExpensesTotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Expected Drawer Cash:</span>
                  <span>{formatCurrency(lastClosedShift.expectedCash || 0, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Physical Cash Counted:</span>
                  <span>{formatCurrency(lastClosedShift.closingCashCounted || 0, settings.currencySymbol)}</span>
                </div>
                <div className={`flex justify-between font-bold pt-1 border-t border-slate-200 ${
                  (lastClosedShift.discrepancy || 0) === 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  <span>Discrepancy (Over/Short):</span>
                  <span>
                    {(lastClosedShift.discrepancy || 0) >= 0 ? '+' : ''}
                    {formatCurrency(lastClosedShift.discrepancy || 0, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintZReport(lastClosedShift)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Official Z-Report PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastClosedShift(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Start New Shift
                </button>
              </div>
            </div>
          ) : !activeShift ? (
            /* Open Shift Screen */
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950">
                  <p className="font-bold">No Register Shift Currently Open</p>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Start an opening shift by declaring the starting cash drawer float. All POS sales and drawer expenses will be tracked automatically.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Starting Cash Float in Drawer ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={openingFloatInput}
                  onChange={(e) => setOpeningFloatInput(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Petty cash placed in the register for giving change at the start of shift.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Shift Notes / Cashier Comments (Optional)
                </label>
                <input
                  type="text"
                  value={openNotesInput}
                  onChange={(e) => setOpenNotesInput(e.target.value)}
                  placeholder="e.g. Morning Shift - Counter #1"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Open Register Shift</span>
              </button>
            </form>
          ) : (
            /* Active Shift Reconciliation Form */
            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Active Shift Summary Header */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-950">Shift in Progress</span>
                  </div>
                  <span className="text-[11px] text-emerald-700">
                    Started {new Date(activeShift.openedAt).toLocaleTimeString()} by {activeShift.openedByName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Opening Float</span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {formatCurrency(activeShift.openingFloat, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Real-time Ledger Breakdown */}
              {shiftMetrics && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Opening Float:</span>
                    <span>{formatCurrency(activeShift.openingFloat, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>(+) Cash Sales ({shiftMetrics.salesCount} orders):</span>
                    <span className="text-emerald-700">+{formatCurrency(shiftMetrics.cashSalesTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>(-) Cash Paid Out (Expenses):</span>
                    <span className="text-rose-700">-{formatCurrency(shiftMetrics.cashExpensesTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Digital / Mobile (Telebirr/CBE):</span>
                    <span>{formatCurrency(shiftMetrics.nonCashSalesTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200 text-sm">
                    <span className="font-sans">Expected Drawer Cash:</span>
                    <span className="text-emerald-900">{formatCurrency(shiftMetrics.expectedCashInDrawer, settings.currencySymbol)}</span>
                  </div>
                </div>
              )}

              {/* Physical Cash Count Input */}
              <div className="p-3.5 bg-white border border-slate-300 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Counted Physical Cash in Drawer ({settings.currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={countedCashInput}
                  onChange={(e) => setCountedCashInput(e.target.value)}
                  placeholder="Enter counted notes & coins"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />

                {/* Live Over/Short calculation */}
                {countedCashInput.trim() && shiftMetrics && (
                  <div className={`p-2 rounded-lg flex items-center justify-between text-xs font-mono font-bold ${
                    discrepancy === 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : discrepancy > 0
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <span>Drawer Status:</span>
                    <span>
                      {discrepancy === 0 ? 'Exact Match (Balanced)' : discrepancy > 0 ? `Over by +${formatCurrency(discrepancy, settings.currencySymbol)}` : `Short by -${formatCurrency(Math.abs(discrepancy), settings.currencySymbol)}`}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Closing Notes / Discrepancy Reason (Optional)
                </label>
                <input
                  type="text"
                  value={closeNotesInput}
                  onChange={(e) => setCloseNotesInput(e.target.value)}
                  placeholder="e.g. End of evening shift, cash counted with manager"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Close Shift & Print Z-Report</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
