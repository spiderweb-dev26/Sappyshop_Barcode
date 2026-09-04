import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SaleRecord, PaymentMethod, getPaymentMethodLabel } from '../types';
import { 
  Receipt, 
  Search, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Eye, 
  RotateCcw, 
  X, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  CreditCard,
  Banknote,
  Building,
  Building2,
  Landmark,
  Smartphone,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { exportSalesToExcel, exportSalesToPdf } from '../utils/excelPdfUtils';
import { formatCurrency } from '../utils/currencyUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SAPPY_PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'CBE_YOHANNES', label: 'CBE (Yohannes)', icon: Building },
  { id: 'CBE_AZEB', label: 'CBE (Azeb)', icon: Building },
  { id: 'AWASH', label: 'Awash', icon: Building2 },
  { id: 'TELEBIRR', label: 'Telebirr', icon: Smartphone },
  { id: 'BOA', label: 'BOA', icon: Landmark },
];

export const SalesHistory: React.FC = () => {
  const { 
    sales, 
    refundSale, 
    settleCustomerCredit, 
    hasPermission, 
    settings, 
    addToast,
    requestMasterAuth 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  
  // Modals
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [refundTargetSale, setRefundTargetSale] = useState<SaleRecord | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [creditSettlingSale, setCreditSettlingSale] = useState<SaleRecord | null>(null);
  const [settlementMethod, setSettlementMethod] = useState<PaymentMethod>('CASH');

  const filteredSales = (sales || []).filter((s) => {
    if (!s) return false;
    const matchesSearch =
      (s.invoiceNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (s.customerPhone && s.customerPhone.includes(search)) ||
      (s.cashierName && s.cashierName.toLowerCase().includes(search.toLowerCase())) ||
      ((s.items || []).some(i => i && ((i.name || '').toLowerCase().includes(search.toLowerCase()) || (i.sku || '').toLowerCase().includes(search.toLowerCase()))));

    const matchesMethod = selectedMethod === 'ALL' || s.paymentMethod === selectedMethod;
    
    let matchesStatus = true;
    if (selectedStatus === 'COMPLETED') {
      matchesStatus = s.status === 'COMPLETED' && s.paymentStatus !== 'UNPAID_CREDIT';
    } else if (selectedStatus === 'UNPAID_CREDIT') {
      matchesStatus = s.paymentStatus === 'UNPAID_CREDIT' || s.paymentMethod === 'CREDIT';
    } else if (selectedStatus === 'REFUNDED') {
      matchesStatus = s.status === 'REFUNDED';
    }

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.status === 'COMPLETED' ? s.grandTotal : 0), 0);
  const totalGrossProfit = filteredSales.reduce((acc, s) => acc + (s.status === 'COMPLETED' ? s.netProfit : 0), 0);
  
  const unpaidCreditSales = sales.filter(s => (s.paymentStatus === 'UNPAID_CREDIT' || s.paymentMethod === 'CREDIT') && s.status !== 'REFUNDED');
  const totalUnpaidCreditAmount = unpaidCreditSales.reduce((acc, s) => acc + s.grandTotal, 0);

  const handleExecuteRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTargetSale || !refundReason.trim()) return;

    requestMasterAuth({
      title: 'Invoice Refund Master Authorization',
      actionName: `Process Full Refund for Invoice ${refundTargetSale.invoiceNo}`,
      description: `Grand Total: ${formatCurrency(refundTargetSale.grandTotal, settings.currencySymbol)}. Items: ${refundTargetSale.items.length}. Customer: ${refundTargetSale.customerName || 'Walk-in'}. Reason: ${refundReason.trim()}`,
      warning: 'Refunding marks the invoice as void and automatically returns all items back into active on-hand inventory.',
      onSuccess: () => {
        const success = refundSale(refundTargetSale.id, refundReason.trim());
        if (success) {
          setRefundTargetSale(null);
          setRefundReason('');
        }
      }
    });
  };

  const handleExecuteCreditSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditSettlingSale) return;
    const success = settleCustomerCredit(creditSettlingSale.id, settlementMethod);
    if (success) {
      setCreditSettlingSale(null);
    }
  };

  const handleDownloadPdf = (sale: SaleRecord) => {
    const doc = new jsPDF();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, doc.internal.pageSize.width, 24, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.storeName.toUpperCase(), 14, 12);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`TAX INVOICE & RECEIPT: ${sale.invoiceNo}`, 14, 19);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Date: ${new Date(sale.createdAt).toLocaleString()}`, 14, 32);
    doc.text(`Customer: ${sale.customerName || 'Walk-in'} | Cashier: ${sale.cashierName}`, 14, 38);
    doc.text(`Payment: ${sale.paymentMethod} | Status: ${sale.status}`, 14, 44);

    const tableData = sale.items.map(i => [
      i.sku,
      i.name,
      i.quantity.toString(),
      formatCurrency(i.unitPrice, settings.currencySymbol),
      formatCurrency(i.subtotal, settings.currencySymbol)
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['SKU', 'Item Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.text(`Subtotal: ${formatCurrency(sale.subtotal, settings.currencySymbol)}`, 140, finalY);
    if (sale.discountAmount > 0) {
      doc.text(`Discount: -${formatCurrency(sale.discountAmount, settings.currencySymbol)}`, 140, finalY + 6);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Grand Total: ${formatCurrency(sale.grandTotal, settings.currencySymbol)}`, 140, finalY + (sale.discountAmount > 0 ? 14 : 8));

    doc.save(`${sale.invoiceNo}_Receipt.pdf`);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">
            Sales Ledger & Invoicing Audit
          </h1>
          <p className="text-xs text-slate-500">
            Audit sales transactions, customer receipts, tax records, and return/refund processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSalesToExcel(filteredSales, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => exportSalesToPdf(filteredSales, settings)}
            className="h-8 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filtered Revenue</span>
          <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {formatCurrency(totalRevenue, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{filteredSales.length} Total Invoices</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Profit Realized</span>
          <p className="text-2xl font-bold text-emerald-800 mt-1 font-mono">
            +{formatCurrency(totalGrossProfit, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Margin: {totalRevenue > 0 ? ((totalGrossProfit / totalRevenue) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-amber-200 bg-amber-50/40 shadow-sm">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-600" /> Unpaid Customer Credits
          </span>
          <p className="text-2xl font-bold text-amber-900 mt-1 font-mono">
            {formatCurrency(totalUnpaidCreditAmount, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
            {unpaidCreditSales.length} Outstanding Store Tabs (Carried in Year-End)
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Refunded Orders</span>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {sales.filter(s => s.status === 'REFUNDED').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Restocked back to catalog</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice #, customer name, cashier, or item SKU..."
            className="w-full h-8 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full md:w-44 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Payment Methods</option>
            {SAPPY_PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full md:w-44 h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Paid / Completed</option>
            <option value="UNPAID_CREDIT">Unpaid Credit Tabs Only</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
      </div>

      {/* Sales Data Table */}
      <div className="bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 text-[11px] uppercase">
                <th className="py-2.5 px-4">Invoice #</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Cashier</th>
                <th className="py-2.5 px-4">Payment & Credit</th>
                <th className="py-2.5 px-4 text-center">Items</th>
                <th className="py-2.5 px-4 text-right">Grand Total</th>
                {hasPermission(['ADMIN', 'MANAGER', 'AUDITOR']) && (
                  <th className="py-2.5 px-4 text-right">Gross Profit</th>
                )}
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No Sales Records Found</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const isRefunded = sale.status === 'REFUNDED';
                  const isUnpaidCredit = (sale.paymentMethod === 'CREDIT' || sale.paymentStatus === 'UNPAID_CREDIT') && !isRefunded;
                  const isSettledCredit = sale.paymentMethod === 'CREDIT' && sale.paymentStatus === 'PAID';
                  const totalUnits = sale.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr key={sale.id} className={`transition-colors ${isUnpaidCredit ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {sale.invoiceNo}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(sale.createdAt).toLocaleDateString()}{' '}
                        <span className="text-[10px]">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {sale.customerName || 'Walk-in'}
                        {sale.customerPhone && (
                          <span className="block text-[10px] text-slate-400 font-mono">{sale.customerPhone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sale.cashierName}
                      </td>
                      <td className="py-3 px-4">
                        {isUnpaidCredit ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                            <BookOpen className="w-2.5 h-2.5 text-amber-700" /> Unpaid Credit
                          </span>
                        ) : isSettledCredit ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Credit (Settled)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                            {getPaymentMethodLabel(sale.paymentMethod)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {totalUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(sale.grandTotal, settings.currencySymbol)}
                      </td>
                      {hasPermission(['ADMIN', 'MANAGER', 'AUDITOR']) && (
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                          {isRefunded ? formatCurrency(0, settings.currencySymbol) : `+${formatCurrency(sale.netProfit, settings.currencySymbol)}`}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isRefunded
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isUnpaidCredit
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isRefunded ? 'REFUNDED' : isUnpaidCredit ? 'UNPAID TAB' : 'PAID'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isUnpaidCredit && hasPermission(['ADMIN', 'MANAGER', 'CASHIER']) && (
                            <button
                              onClick={() => {
                                setCreditSettlingSale(sale);
                                setSettlementMethod('CASH');
                              }}
                              className="h-6 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs"
                              title="Settle Outstanding Customer Credit"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Settle</span>
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(sale)}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {!isRefunded && hasPermission(['ADMIN', 'MANAGER']) && (
                            <button
                              onClick={() => {
                                setRefundTargetSale(sale);
                                setRefundReason('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Process Return / Refund"
                            >
                              <RotateCcw className="w-4 h-4" />
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
      {/* INVOICE DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-emerald-100 shadow-xl max-w-lg w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh]">
            <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Invoice {selectedSale.invoiceNo}</h3>
              </div>
              <button onClick={() => setSelectedSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer:</span>
                  <strong className="text-slate-800">{selectedSale.customerName || 'Walk-in Customer'}</strong>
                  {selectedSale.customerPhone && (
                    <p className="text-slate-500 font-mono text-[11px]">{selectedSale.customerPhone}</p>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cashier / Staff:</span>
                  <strong className="text-slate-800">{selectedSale.cashierName}</strong>
                  <p className="text-slate-500 text-[11px]">{new Date(selectedSale.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Line items */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">Purchased Items</h4>
                <div className="border border-slate-200 rounded-md overflow-hidden divide-y divide-slate-100 text-xs">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          SKU: {item.sku} &bull; {formatCurrency(item.unitPrice, settings.currencySymbol)} &times; {item.quantity}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(item.subtotal, settings.currencySymbol)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial summary */}
              <div className="p-3 bg-emerald-50/60 rounded-md border border-emerald-200/80 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal, settings.currencySymbol)}</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discountAmount, settings.currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-slate-900 pt-1 border-t border-emerald-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-800">{formatCurrency(selectedSale.grandTotal, settings.currencySymbol)}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md border border-slate-200">
                  <strong>Notes:</strong> {selectedSale.notes}
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => handleDownloadPdf(selectedSale)}
                className="h-8 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Invoice PDF</span>
              </button>
              <button
                onClick={() => setSelectedSale(null)}
                className="h-8 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REFUND CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {refundTargetSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-rose-100 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-rose-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Process Refund & Return</h3>
              </div>
              <button onClick={() => setRefundTargetSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRefund} className="p-4 space-y-3">
              <div className="p-2.5 bg-rose-50 rounded-md border border-rose-200 text-xs text-rose-900">
                <p className="font-bold">Refund Invoice: {refundTargetSale.invoiceNo}</p>
                <p className="mt-0.5">
                  Total Refund Amount: <strong className="font-mono">{formatCurrency(refundTargetSale.grandTotal, settings.currencySymbol)}</strong>
                </p>
                <p className="text-[10px] text-rose-700 mt-1">
                  All items ({refundTargetSale.items.reduce((a, b) => a + b.quantity, 0)} units) will be automatically returned to inventory stock on hand.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Return / Refund *</label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer returned unopened item, defect, exchange"
                  className="w-full h-8 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRefundTargetSale(null)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold shadow-xs"
                >
                  Confirm & Restock Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SETTLE CREDIT MODAL */}
      {/* ========================================================================= */}
      {creditSettlingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg border border-emerald-100 shadow-xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-3.5 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-200" />
                <h3 className="font-bold text-xs uppercase tracking-wider">Settle Customer Credit Tab</h3>
              </div>
              <button onClick={() => setCreditSettlingSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteCreditSettlement} className="p-4 space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-xs text-amber-950">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-900">Invoice: {creditSettlingSale.invoiceNo}</span>
                  <span className="bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">UNPAID</span>
                </div>
                <p>
                  Customer: <strong>{creditSettlingSale.customerName || 'Credit Customer'}</strong>
                  {creditSettlingSale.customerPhone && ` (${creditSettlingSale.customerPhone})`}
                </p>
                <div className="mt-2 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-amber-800 font-medium">Balance to Pay:</span>
                  <span className="text-base font-bold font-mono text-amber-950">{formatCurrency(creditSettlingSale.grandTotal, settings.currencySymbol)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Payment Method Received</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SAPPY_PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSettlementMethod(m.id)}
                        className={`p-2.5 rounded-lg border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                          settlementMethod === m.id
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreditSettlingSale(null)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Record Payment & Settle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
