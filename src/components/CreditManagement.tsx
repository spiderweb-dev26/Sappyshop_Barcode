import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SaleRecord, PaymentMethod, PAYMENT_METHODS, getPaymentMethodLabel } from '../types';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Phone, 
  Receipt, 
  FileText, 
  Printer, 
  DollarSign, 
  ChevronRight, 
  ArrowUpRight, 
  Check, 
  X, 
  MessageSquare, 
  Share2, 
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

export const CreditManagement: React.FC = () => {
  const { sales, settings, settleCustomerCredit, setActiveTab, currentUser } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID_ONLY' | 'PARTIAL_ONLY' | 'SETTLED_ONLY'>('UNPAID_ONLY');
  const [viewMode, setViewMode] = useState<'invoices' | 'customers'>('invoices');

  // Settlement Modal State
  const [settlingSale, setSettlingSale] = useState<SaleRecord | null>(null);
  const [settleMethod, setSettleMethod] = useState<PaymentMethod>('CASH');
  const [settleAmount, setSettleAmount] = useState<string>('');
  const [isFullSettlement, setIsFullSettlement] = useState<boolean>(true);

  // Settlement Receipt Preview Modal
  const [receiptSale, setReceiptSale] = useState<SaleRecord | null>(null);

  // Reminder Copied state
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);

  // All sales with credit method or unpaid/partial status
  const creditSales = useMemo(() => {
    return (sales || []).filter(s => 
      s.status !== 'REFUNDED' && (
        s.paymentMethod === 'CREDIT' || 
        s.paymentStatus === 'UNPAID_CREDIT' || 
        s.paymentStatus === 'PARTIALLY_PAID' ||
        s.creditSettledAt
      )
    );
  }, [sales]);

  // Calculations
  const unpaidSales = creditSales.filter(s => s.paymentStatus === 'UNPAID_CREDIT' || (s.paymentStatus === 'PARTIALLY_PAID' && (s.amountPaid || 0) < s.grandTotal));
  const settledSales = creditSales.filter(s => s.paymentStatus === 'PAID' && s.creditSettledAt);

  const totalOutstandingCredit = unpaidSales.reduce((acc, s) => {
    const remaining = Math.max(0, s.grandTotal - (s.amountPaid || 0));
    return acc + remaining;
  }, 0);

  const totalSettledCredit = settledSales.reduce((acc, s) => acc + s.grandTotal, 0);

  // Group by customer for customer summary
  const customerDebts = useMemo(() => {
    const map = new Map<string, {
      name: string;
      phone?: string;
      totalDebt: number;
      totalInvoices: number;
      unpaidInvoices: number;
      sales: SaleRecord[];
      lastPurchaseDate: string;
    }>();

    creditSales.forEach(sale => {
      const key = (sale.customerName || 'Walk-in Customer').trim().toLowerCase();
      const existing = map.get(key) || {
        name: sale.customerName || 'Walk-in Customer',
        phone: sale.customerPhone,
        totalDebt: 0,
        totalInvoices: 0,
        unpaidInvoices: 0,
        sales: [],
        lastPurchaseDate: sale.createdAt
      };

      const remaining = sale.paymentStatus === 'PAID' ? 0 : Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
      existing.totalDebt += remaining;
      existing.totalInvoices += 1;
      if (remaining > 0) existing.unpaidInvoices += 1;
      if (sale.customerPhone && !existing.phone) existing.phone = sale.customerPhone;
      existing.sales.push(sale);

      if (new Date(sale.createdAt) > new Date(existing.lastPurchaseDate)) {
        existing.lastPurchaseDate = sale.createdAt;
      }

      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalDebt - a.totalDebt);
  }, [creditSales]);

  // Filtered List
  const filteredSales = useMemo(() => {
    return creditSales.filter(s => {
      const remaining = s.paymentStatus === 'PAID' ? 0 : Math.max(0, s.grandTotal - (s.amountPaid || 0));
      const isUnpaid = remaining > 0 && (!s.amountPaid || s.amountPaid === 0);
      const isPartial = remaining > 0 && (s.amountPaid || 0) > 0;
      const isSettled = s.paymentStatus === 'PAID' || remaining === 0;

      let statusMatch = true;
      if (statusFilter === 'UNPAID_ONLY') statusMatch = remaining > 0;
      else if (statusFilter === 'PARTIAL_ONLY') statusMatch = isPartial;
      else if (statusFilter === 'SETTLED_ONLY') statusMatch = isSettled;

      const searchLower = searchTerm.toLowerCase();
      const searchMatch = !searchTerm.trim() ||
        (s.invoiceNo || '').toLowerCase().includes(searchLower) ||
        (s.customerName || '').toLowerCase().includes(searchLower) ||
        (s.customerPhone || '').includes(searchLower) ||
        (s.notes || '').toLowerCase().includes(searchLower);

      return statusMatch && searchMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [creditSales, statusFilter, searchTerm]);

  // Open Settle Modal
  const handleOpenSettle = (sale: SaleRecord) => {
    setSettlingSale(sale);
    setSettleMethod('CASH');
    const remaining = Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
    setSettleAmount(remaining.toFixed(2));
    setIsFullSettlement(true);
  };

  // Submit Settlement
  const handleConfirmSettle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingSale) return;

    const remaining = Math.max(0, settlingSale.grandTotal - (settlingSale.amountPaid || 0));
    const amountToPay = isFullSettlement ? remaining : (parseFloat(settleAmount) || remaining);

    if (amountToPay <= 0) return;

    settleCustomerCredit(settlingSale.id, settleMethod, amountToPay);
    
    // Open receipt confirmation
    const updatedSale: SaleRecord = {
      ...settlingSale,
      paymentStatus: (amountToPay >= remaining) ? 'PAID' : 'PARTIALLY_PAID',
      amountPaid: (settlingSale.amountPaid || 0) + amountToPay,
      creditSettledAt: new Date().toISOString(),
      creditSettledMethod: settleMethod
    };
    setReceiptSale(updatedSale);
    setSettlingSale(null);
  };

  // Generate WhatsApp / SMS reminder string
  const handleCopyReminder = (sale: SaleRecord) => {
    const remaining = Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
    const text = `Dear ${sale.customerName || 'Customer'},\nThis is a polite reminder from ${settings.storeName} regarding your outstanding store credit balance of ${formatCurrency(remaining, settings.currencySymbol)} for Invoice #${sale.invoiceNo} dated ${new Date(sale.createdAt).toLocaleDateString()}.\n\nPlease settle at your earliest convenience. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedInvoiceId(sale.id);
    setTimeout(() => setCopiedInvoiceId(null), 3000);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Header & Quick Action */}
      <div className="bg-[#fdfbf7] p-4 sm:p-5 rounded-2xl border border-[#dfd7c7] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300/80 flex items-center justify-center font-bold shadow-inner shrink-0">
            <CreditCard className="w-6 h-6 text-amber-800" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Customer Credit Management & Ledger
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                Store Tabs
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Track outstanding customer debts, record partial or full credit settlements, and issue payment clearances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('pos')}
            className="flex-1 md:flex-initial h-9 px-4 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>New Credit Sale (POS)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards in Sappy Warm Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Outstanding Debt */}
        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-amber-300/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
            <span className="uppercase tracking-wider text-[10px]">Total Outstanding Debt</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950 font-mono">
            {formatCurrency(totalOutstandingCredit, settings.currencySymbol)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-medium">
            <span>{unpaidSales.length} open unpaid invoices</span>
          </div>
        </div>

        {/* Active Debtors Count */}
        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#dfd7c7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
            <span className="uppercase tracking-wider text-[10px]">Active Debtors / Customers</span>
            <User className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {customerDebts.filter(c => c.totalDebt > 0).length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Customers with pending balance
          </p>
        </div>

        {/* Total Settled Credits */}
        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#dfd7c7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold mb-1">
            <span className="uppercase tracking-wider text-[10px]">Total Settled Credits</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">
            {formatCurrency(totalSettledCredit, settings.currencySymbol)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {settledSales.length} settled credit receipts
          </p>
        </div>

        {/* Total Credit Transactions */}
        <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#dfd7c7] shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-600 font-bold mb-1">
            <span className="uppercase tracking-wider text-[10px]">Total Credit Invoices</span>
            <Receipt className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {creditSales.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Historical store tab orders
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Status Filters & View Toggle */}
      <div className="bg-[#fdfbf7] p-3.5 sm:p-4 rounded-xl border border-[#dfd7c7] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, invoice #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8.5 pl-9 pr-3 text-xs bg-white border border-[#dfd7c7] rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#064e3b]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="inline-flex rounded-lg border border-[#dfd7c7] bg-[#f5f1e8] p-0.5 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('UNPAID_ONLY')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'UNPAID_ONLY' ? 'bg-[#064e3b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unpaid ({unpaidSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'ALL' ? 'bg-[#064e3b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({creditSales.length})
            </button>
            <button
              onClick={() => setStatusFilter('SETTLED_ONLY')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                statusFilter === 'SETTLED_ONLY' ? 'bg-[#064e3b] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled ({settledSales.length})
            </button>
          </div>

          {/* View Toggle */}
          <div className="inline-flex rounded-lg border border-[#dfd7c7] bg-[#f5f1e8] p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('invoices')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'invoices' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setViewMode('customers')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'customers' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Customer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'customers' ? (
        /* CUSTOMER GROUPED SUMMARY VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {customerDebts.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-[#fdfbf7] rounded-xl border border-[#dfd7c7] text-slate-400">
              <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">No Customer Debt Records Found</p>
              <p className="text-xs text-slate-400 mt-0.5">Credit sales recorded in POS will appear here automatically.</p>
            </div>
          ) : (
            customerDebts.map((c, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border transition-all ${
                  c.totalDebt > 0 
                    ? 'bg-[#fdfbf7] border-amber-300/90 shadow-2xs' 
                    : 'bg-[#fdfbf7] border-[#dfd7c7] opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#064e3b] border border-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs truncate max-w-[170px]">{c.name}</h3>
                      {c.phone ? (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No phone on file</p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.totalDebt > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {c.totalDebt > 0 ? `${c.unpaidInvoices} Unpaid` : 'Cleared'}
                  </span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-[#dfd7c7] flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Balance Due</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {formatCurrency(c.totalDebt, settings.currencySymbol)}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSearchTerm(c.name);
                      setViewMode('invoices');
                      setStatusFilter('ALL');
                    }}
                    className="text-xs font-bold text-[#064e3b] hover:text-emerald-800 hover:underline flex items-center gap-0.5"
                  >
                    <span>View Invoices ({c.totalInvoices})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* DETAILED INVOICE TABLE VIEW */
        <div className="bg-[#fdfbf7] rounded-xl border border-[#dfd7c7] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8f4ec] text-slate-600 font-bold border-b border-[#dfd7c7] text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice &amp; Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items / Summary</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7db]">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-700 text-sm">No matching credit records</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try altering your search or status filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const remaining = sale.paymentStatus === 'PAID' ? 0 : Math.max(0, sale.grandTotal - (sale.amountPaid || 0));
                    const isFullySettled = remaining === 0 || sale.paymentStatus === 'PAID';
                    const isPartiallyPaid = !isFullySettled && (sale.amountPaid || 0) > 0;

                    return (
                      <tr key={sale.id} className="hover:bg-[#f8f4ec] transition-colors group">
                        {/* Invoice & Date */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{sale.invoiceNo}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{sale.customerName || 'Walk-in Customer'}</p>
                          {sale.customerPhone && (
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sale.customerPhone}</p>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="truncate font-medium text-slate-800">
                            {sale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </p>
                          <span className="text-[10px] text-slate-400">Cashier: {sale.cashierName}</span>
                        </td>

                        {/* Grand Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(sale.grandTotal, settings.currencySymbol)}
                        </td>

                        {/* Amount Paid */}
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-800 font-semibold">
                          {formatCurrency(sale.amountPaid || 0, settings.currencySymbol)}
                        </td>

                        {/* Balance Due */}
                        <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm">
                          <span className={remaining > 0 ? 'text-amber-900' : 'text-slate-400'}>
                            {formatCurrency(remaining, settings.currencySymbol)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {isFullySettled ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Settled ({sale.creditSettledMethod ? getPaymentMethodLabel(sale.creditSettledMethod) : 'Paid'})</span>
                            </span>
                          ) : isPartiallyPaid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                              <Clock className="w-3 h-3 text-teal-600" />
                              <span>Partial ({((sale.amountPaid / sale.grandTotal) * 100).toFixed(0)}%)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-700" />
                              <span>Unpaid Credit</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {remaining > 0 ? (
                              <>
                                <button
                                  onClick={() => handleOpenSettle(sale)}
                                  className="h-7 px-2.5 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Record Payment Settlement"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  <span>Settle</span>
                                </button>

                                <button
                                  onClick={() => handleCopyReminder(sale)}
                                  className="h-7 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-[#dfd7c7] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Copy SMS / WhatsApp Payment Reminder text"
                                >
                                  {copiedInvoiceId === sale.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <MessageSquare className="w-3 h-3 text-slate-500" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setReceiptSale(sale)}
                                className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                title="View Credit Clearance Receipt"
                              >
                                <FileText className="w-3 h-3 text-slate-600" />
                                <span>Receipt</span>
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
      )}

      {/* ========================================================================= */}
      {/* SETTLE CREDIT MODAL */}
      {/* ========================================================================= */}
      {settlingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900">
            <div className="p-4 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm">Settle Customer Credit</h3>
                  <p className="text-[10px] text-emerald-200">Invoice: {settlingSale.invoiceNo}</p>
                </div>
              </div>
              <button onClick={() => setSettlingSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettle} className="p-5 space-y-4">
              {/* Customer & Debt Summary */}
              <div className="p-3.5 bg-[#f8f4ec] rounded-xl border border-[#dfd7c7] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Customer</span>
                  <span className="font-bold text-xs text-slate-900">{settlingSale.customerName || 'Walk-in Customer'}</span>
                </div>
                {settlingSale.customerPhone && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Phone</span>
                    <span className="font-mono text-slate-800">{settlingSale.customerPhone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-[#dfd7c7]/80 text-xs">
                  <span className="font-semibold text-slate-700">Remaining Balance Due</span>
                  <span className="font-black text-sm font-mono text-amber-950">
                    {formatCurrency(Math.max(0, settlingSale.grandTotal - (settlingSale.amountPaid || 0)), settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Payment Settlement Amount Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Settlement Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFullSettlement(true);
                      const remaining = Math.max(0, settlingSale.grandTotal - (settlingSale.amountPaid || 0));
                      setSettleAmount(remaining.toFixed(2));
                    }}
                    className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                      isFullSettlement
                        ? 'border-[#064e3b] bg-emerald-50 text-[#064e3b] font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Full Settlement (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullSettlement(false)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                      !isFullSettlement
                        ? 'border-[#064e3b] bg-emerald-50 text-[#064e3b] font-bold shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Partial Settlement
                  </button>
                </div>
              </div>

              {/* Custom Partial Amount input */}
              {!isFullSettlement && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Amount to Settle ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Math.max(0, settlingSale.grandTotal - (settlingSale.amountPaid || 0))}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#064e3b]"
                    required
                  />
                </div>
              )}

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Settlement Payment Method</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSettleMethod(pm.id)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        settleMethod === pm.id
                          ? 'border-[#064e3b] bg-emerald-50 font-bold text-[#064e3b] shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{pm.short}</span>
                      {settleMethod === pm.id && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettlingSale(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Settlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SETTLEMENT RECEIPT MODAL */}
      {/* ========================================================================= */}
      {receiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden text-slate-900 flex flex-col">
            <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-300" />
                <h3 className="font-bold text-xs">Credit Settlement Voucher</h3>
              </div>
              <button onClick={() => setReceiptSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[80vh] text-center space-y-3 font-mono text-xs">
              <div className="border-b-2 border-dashed border-slate-200 pb-3">
                <h2 className="font-extrabold text-sm uppercase text-slate-900">{settings.storeName}</h2>
                <p className="text-[10px] text-slate-500">{settings.storeAddress}</p>
                <p className="text-[10px] text-slate-500">Tel: {settings.storePhone}</p>
                <div className="my-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded text-[10px]">
                  CREDIT CLEARANCE RECEIPT
                </div>
              </div>

              <div className="text-left space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-bold">{receiptSale.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold">{receiptSale.customerName || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settled Date:</span>
                  <span>{new Date(receiptSale.creditSettledAt || receiptSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-bold">{receiptSale.creditSettledMethod ? getPaymentMethodLabel(receiptSale.creditSettledMethod) : 'Cash'}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-200 py-2 text-left text-[11px] space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Total Invoice Amount:</span>
                  <span>{formatCurrency(receiptSale.grandTotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Total Settled to Date:</span>
                  <span>{formatCurrency(receiptSale.amountPaid || receiptSale.grandTotal, settings.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-800">{receiptSale.paymentStatus === 'PAID' ? 'FULLY SETTLED' : 'PARTIALLY PAID'}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                {settings.receiptFooterMessage || 'Thank you for your business!'}
              </p>

              <div className="pt-2 flex gap-2 no-print">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-[#064e3b] hover:bg-[#043b2c] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setReceiptSale(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
