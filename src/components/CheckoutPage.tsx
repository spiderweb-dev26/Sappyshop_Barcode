import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, SaleRecord, getPaymentMethodLabel } from '../types';
import { 
  ArrowLeft, 
  Scan, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Building, 
  Building2, 
  Landmark, 
  Smartphone, 
  CheckCircle2, 
  Printer, 
  Download, 
  ShoppingBag, 
  Tag, 
  User, 
  Phone, 
  FileText, 
  Sparkles, 
  RotateCcw, 
  Receipt,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Package
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SappyLogoMark } from './SappyLogo';
import { formatCurrency } from '../utils/currencyUtils';
import { soundEffects } from '../utils/soundEffects';
import { getItemDisplayImage } from '../utils/imageUtils';

const SAPPY_PAYMENT_METHODS: { 
  id: PaymentMethod; 
  label: string; 
  subLabel: string; 
  icon: React.ComponentType<{ className?: string }>; 
  badgeColor?: string;
}[] = [
  { id: 'CASH', label: 'Cash', subLabel: 'Direct Cash Tender', icon: Banknote },
  { id: 'CBE_YOHANNES', label: 'CBE (Yohannes)', subLabel: 'Commercial Bank', icon: Building, badgeColor: 'bg-purple-100 text-purple-800' },
  { id: 'CBE_AZEB', label: 'CBE (Azeb)', subLabel: 'Commercial Bank', icon: Building, badgeColor: 'bg-indigo-100 text-indigo-800' },
  { id: 'AWASH', label: 'Awash', subLabel: 'Awash Bank Transfer', icon: Building2, badgeColor: 'bg-blue-100 text-blue-800' },
  { id: 'TELEBIRR', label: 'Telebirr', subLabel: 'Telebirr Mobile Pay', icon: Smartphone, badgeColor: 'bg-cyan-100 text-cyan-800' },
  { id: 'BOA', label: 'BOA', subLabel: 'Bank of Abyssinia', icon: Landmark, badgeColor: 'bg-amber-100 text-amber-800' },
  { id: 'CREDIT', label: 'Credit Tab', subLabel: 'Pay Later / Verified', icon: CreditCard, badgeColor: 'bg-orange-100 text-orange-800' },
];

export const CheckoutPage: React.FC = () => {
  const { 
    cart, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart, 
    checkoutSale, 
    settings, 
    currentUser, 
    setActiveTab, 
    setIsScannerModalOpen,
    addToast 
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);

  // Financial calculations
  const subtotal = cart.reduce((acc, c) => acc + (c.unitPrice * c.quantity), 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const totalUnits = cart.reduce((acc, c) => acc + c.quantity, 0);

  // Cash calculations
  const parsedPaid = parseFloat(amountPaidInput) || 0;
  const changeDue = Math.max(0, parsedPaid - grandTotal);
  const isCashInsufficient = paymentMethod === 'CASH' && parsedPaid < grandTotal;

  // Initialize cash input with grand total
  useEffect(() => {
    if (paymentMethod === 'CASH') {
      setAmountPaidInput(grandTotal > 0 ? grandTotal.toFixed(2) : '');
    }
  }, [grandTotal, paymentMethod]);

  const handleSetQuickCash = (amt: number) => {
    setAmountPaidInput(amt.toFixed(2));
  };

  const handleExecuteCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      addToast('warning', 'Cart is Empty', 'Please scan or add items before checkout.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !customerName.trim()) {
      addToast('error', 'Customer Name Required', 'Please enter a customer name for store credit purchases.');
      return;
    }

    const paid = paymentMethod === 'CASH' ? (parseFloat(amountPaidInput) || grandTotal) : grandTotal;

    const result = checkoutSale(
      paymentMethod,
      paid,
      customerName.trim() || undefined,
      customerPhone.trim() || undefined,
      orderNotes.trim() || undefined,
      discountAmount
    );

    if (result) {
      setCompletedSale(result);
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#059669', '#10b981', '#34d399', '#047857', '#fbbf24']
        });
      } catch {
        // Confetti fallback
      }
    }
  };

  // Thermal Receipt Printing
  const handlePrintReceipt = () => {
    window.print();
  };

  // PDF Invoice Download
  const handleDownloadPdfInvoice = (sale: SaleRecord) => {
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
    doc.text(`Cashier: ${sale.cashierName}`, 14, 38);
    doc.text(`Customer: ${sale.customerName || 'Walk-in Customer'}`, 14, 44);
    doc.text(`Payment: ${getPaymentMethodLabel(sale.paymentMethod)} | Status: ${sale.status}`, 14, 50);

    const tableData = sale.items.map(i => [
      i.sku,
      i.name,
      i.quantity.toString(),
      formatCurrency(i.unitPrice, settings.currencySymbol),
      formatCurrency(i.subtotal, settings.currencySymbol)
    ]);

    autoTable(doc, {
      startY: 54,
      head: [['SKU', 'Item Description', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.text(`Subtotal: ${formatCurrency(sale.subtotal, settings.currencySymbol)}`, 130, finalY);
    if (sale.discountAmount > 0) {
      doc.text(`Discount: -${formatCurrency(sale.discountAmount, settings.currencySymbol)}`, 130, finalY + 6);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Grand Total: ${formatCurrency(sale.grandTotal, settings.currencySymbol)}`, 130, finalY + (sale.discountAmount > 0 ? 14 : 8));

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.receiptFooterMessage, 14, finalY + 30);

    doc.save(`${sale.invoiceNo}_Receipt.pdf`);
  };

  // =========================================================================
  // VIEW 1: COMPLETED SALE RECEIPT (FULL PAGE)
  // =========================================================================
  if (completedSale) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-16 print:p-0 print:max-w-none">
        {/* Top Celebration Bar */}
        <div className="bg-white rounded-2xl border border-emerald-200 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Sale Completed!
                </h1>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded-full">
                  {completedSale.invoiceNo}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Processed by <strong className="text-slate-800">{completedSale.cashierName}</strong> via {getPaymentMethodLabel(completedSale.paymentMethod)}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setCompletedSale(null);
                setActiveTab('pos');
              }}
              className="flex-1 sm:flex-none h-11 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Sale</span>
            </button>
            <button
              onClick={() => {
                setCompletedSale(null);
                setActiveTab('sales');
              }}
              className="h-11 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Sales Ledger</span>
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none">
          {/* Action Header on screen */}
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-bold">Official Store Receipt &amp; Tax Slip</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintReceipt}
                className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Thermal Receipt</span>
              </button>
              <button
                onClick={() => handleDownloadPdfInvoice(completedSale)}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF Invoice</span>
              </button>
            </div>
          </div>

          {/* Thermal Receipt Paper */}
          <div className="p-4 sm:p-8 bg-[#fdfbf7] flex justify-center print:p-0 print:bg-white">
            <div 
              id="full-page-thermal-receipt" 
              className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 font-mono text-xs text-slate-800 space-y-4 shadow-sm w-full max-w-md print:border-none print:shadow-none print:p-0 print:max-w-none"
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                <div className="flex justify-center mb-1.5">
                  <SappyLogoMark size={38} color="#064e3b" />
                </div>
                <h2 className="font-extrabold text-base tracking-tight text-slate-900">{settings.storeName}</h2>
                <p className="text-[11px] text-slate-500 font-serif italic">stationery &amp; printing.</p>
                <p className="text-[11px] text-slate-600">{settings.storeAddress}</p>
                <p className="text-[11px] text-slate-600">Tel: {settings.storePhone}</p>
                {settings.storeEmail && (
                  <p className="text-[10px] text-slate-400">{settings.storeEmail}</p>
                )}
              </div>

              {/* Receipt Details */}
              <div className="text-[11px] space-y-1.5 pb-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice No:</span>
                  <strong className="text-slate-900 font-bold">{completedSale.invoiceNo}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date &amp; Time:</span>
                  <span>{new Date(completedSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span className="font-semibold text-slate-900">{completedSale.cashierName}</span>
                </div>
                {completedSale.customerName && completedSale.customerName !== 'Walk-in Customer' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-semibold text-slate-900">{completedSale.customerName}</span>
                  </div>
                )}
                {completedSale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{completedSale.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Itemized Table */}
              <div className="space-y-2 py-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-700 pb-1 border-b border-slate-200 uppercase tracking-wider">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                {completedSale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 truncate">{i.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {i.quantity} &times; {formatCurrency(i.unitPrice, settings.currencySymbol)}
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0 font-mono">
                      {formatCurrency(i.subtotal, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Breakdown */}
              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({completedSale.items.reduce((s, x) => s + x.quantity, 0)} units):</span>
                  <span className="font-mono">{formatCurrency(completedSale.subtotal, settings.currencySymbol)}</span>
                </div>
                {completedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Order Discount:</span>
                    <span className="font-mono">-{formatCurrency(completedSale.discountAmount, settings.currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-2 border-t border-slate-300 text-slate-900">
                  <span>TOTAL AMOUNT:</span>
                  <span className="text-emerald-800 font-mono">
                    {formatCurrency(completedSale.grandTotal, settings.currencySymbol)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between text-slate-700 font-semibold">
                  <span>Payment Channel:</span>
                  <span className="text-emerald-800 font-bold">{getPaymentMethodLabel(completedSale.paymentMethod)}</span>
                </div>

                {completedSale.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Tendered Cash:</span>
                      <span className="font-mono">{formatCurrency(completedSale.amountPaid, settings.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-emerald-800 pt-0.5">
                      <span>Change Given:</span>
                      <span className="font-mono">{formatCurrency(completedSale.changeDue, settings.currencySymbol)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Notes */}
              {completedSale.notes && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600">
                  <strong>Notes:</strong> {completedSale.notes}
                </div>
              )}

              {/* Footer Note */}
              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
                <p className="font-medium text-slate-600">{settings.receiptFooterMessage}</p>
                <p className="text-[9px] text-slate-400 font-sans">Goods sold in good condition are appreciated.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EMPTY CART STATE
  // =========================================================================
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
          <ShoppingBag className="w-8 h-8 text-[#064e3b]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Checkout Register is Empty
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            There are no scanned or added items in your active register cart. Use the camera scanner or POS catalog to add products.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="w-full sm:w-auto h-11 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4" />
            <span>Open Barcode Camera</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="w-full sm:w-auto h-11 px-5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Browse Products Catalog</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: FULL CHECKOUT PAGE WITH SCANNED ITEMS & PAYMENT
  // =========================================================================
  return (
    <div className="space-y-5 pb-24 lg:pb-8">
      {/* Top Breadcrumb & Page Navigation Header */}
      <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('pos')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors"
            title="Return to POS Catalog"
            aria-label="Back to POS"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Order Checkout &amp; Payment
              </h1>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {totalUnits} Units
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cashier: <strong className="text-emerald-900 font-semibold">{currentUser.name}</strong> &bull; Complete payment and generate official receipt.
            </p>
          </div>
        </div>

        {/* Quick Top Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsScannerModalOpen(true)}
            className="flex-1 sm:flex-none h-9 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            <Scan className="w-3.5 h-3.5 text-[#064e3b]" />
            <span>Scan More</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Are you sure you want to cancel and clear this order?')) {
                clearCart();
                setActiveTab('pos');
              }
            }}
            className="h-9 px-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Order</span>
          </button>
        </div>
      </div>

      {/* Main Full-Page Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Scanned Items Breakdown (7 Columns on Desktop, Full on Mobile) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs overflow-hidden">
            {/* Scanned Items Header */}
            <div className="p-4 bg-[#064e3b] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-300" />
                <h2 className="font-bold text-xs uppercase tracking-wider">
                  Scanned Items Breakdown ({cart.length} Products)
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-200">
                {totalUnits} Units Total
              </span>
            </div>

            {/* Scanned Items Detailed Table/Cards */}
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {cart.map(({ item, quantity, unitPrice }) => {
                const lineTotal = unitPrice * quantity;
                return (
                  <div key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                    {/* Item Image Thumbnail */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                      <img
                        src={getItemDisplayImage(item)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold uppercase">
                          {item.sku}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Stock: {item.stock}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 truncate mt-0.5">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {formatCurrency(unitPrice, settings.currencySymbol)} &times; {quantity} {item.unit}
                      </p>
                    </div>

                    {/* Quantity Stepper (Mobile Touch Friendly: min 38px) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, quantity - 1)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold active:scale-95 transition-all"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold font-mono text-sm text-slate-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, quantity + 1)}
                        disabled={quantity >= item.stock}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center font-bold active:scale-95 transition-all"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 min-w-[75px]">
                      <span className="font-mono font-bold text-sm text-slate-900 block">
                        {formatCurrency(lineTotal, settings.currencySymbol)}
                      </span>
                    </div>

                    {/* Remove Action */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Catalog Bar */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Barcode scanning is active in background</span>
              </span>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1"
              >
                <span>Scan camera</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Customer Information & Optional Notes */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-700" />
              <span>Customer Details &amp; Order Notes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Name {paymentMethod === 'CREDIT' ? <span className="text-rose-500">*</span> : '(Optional)'}
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={paymentMethod === 'CREDIT' ? 'Required for Credit Account' : 'e.g. Walk-in or Company'}
                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Customer Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 0911234567"
                    className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Order Notes / Receipt Memo
              </label>
              <div className="relative">
                <FileText className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Optional memo printed on receipt..."
                  className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods & Charge Terminal (5 Columns on Desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleExecuteCheckout} className="space-y-4">
            
            {/* Grand Total Highlight Card */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-xs text-center relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-50 rounded-full pointer-events-none" />
              <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">
                Total Amount Due
              </p>
              <p className="text-3xl sm:text-4xl font-black text-emerald-900 font-mono mt-1 tracking-tight">
                {formatCurrency(grandTotal, settings.currencySymbol)}
              </p>
              <div className="flex items-center justify-center gap-3 mt-2 text-xs text-slate-500">
                <span>Subtotal: {formatCurrency(subtotal, settings.currencySymbol)}</span>
                {discountAmount > 0 && (
                  <span className="text-emerald-700 font-semibold">
                    Discount: -{formatCurrency(discountAmount, settings.currencySymbol)}
                  </span>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Select Payment Channel</span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  6 Sappy Accounts
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SAPPY_PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative min-h-[72px] cursor-pointer ${
                        isSelected
                          ? 'border-emerald-700 bg-emerald-700 text-white shadow-md ring-2 ring-emerald-500/30'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-100' : 'text-slate-600'}`} />
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs leading-tight">{m.label}</div>
                        <div className={`text-[10px] truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {m.subLabel}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cash Payment Details: Tender & Change Calculation */}
              {paymentMethod === 'CASH' && (
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Tendered Cash Amount ({settings.currencySymbol})
                    </label>
                    {changeDue > 0 && (
                      <span className="text-xs font-extrabold text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded-full">
                        Change: {formatCurrency(changeDue, settings.currencySymbol)}
                      </span>
                    )}
                  </div>

                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 px-3 bg-white border border-emerald-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />

                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleSetQuickCash(grandTotal)}
                      className="px-2.5 py-1 bg-white border border-slate-300 hover:border-emerald-600 rounded-lg text-xs font-bold text-slate-800"
                    >
                      Exact
                    </button>
                    {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSetQuickCash(amt)}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-600 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        {amt}
                      </button>
                    ))}
                  </div>

                  {isCashInsufficient && (
                    <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Amount paid is less than grand total due.
                    </p>
                  )}
                </div>
              )}

              {/* Digital Payment Confirmation */}
              {paymentMethod !== 'CASH' && paymentMethod !== 'CREDIT' && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div>
                    <span className="font-bold block">{getPaymentMethodLabel(paymentMethod)} Account Verified</span>
                    <span className="text-[11px] text-emerald-800">Direct digital settlement. Sale completes instantly upon confirmation.</span>
                  </div>
                </div>
              )}

              {/* Credit Tab Notice */}
              {paymentMethod === 'CREDIT' && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2.5 text-xs text-amber-900 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="font-bold block">Store Credit Account Transaction</span>
                    <span className="text-[11px] text-amber-800">This invoice will be marked as UNPAID and tracked under the Credit Tab ledger.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Discount */}
            <div className="bg-white rounded-2xl border border-emerald-100 p-4 shadow-xs flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-700" />
                <span>Special Discount ({settings.currencySymbol}):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={subtotal}
                  inputMode="decimal"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
                {discountAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscountAmount(0)}
                    className="text-[10px] text-slate-400 hover:text-rose-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Execute Sale Button (Desktop + Mobile) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={cart.length === 0 || isCashInsufficient}
                className="w-full h-14 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-2xl text-base font-extrabold shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Complete Sale &amp; Print ({formatCurrency(grandTotal, settings.currencySymbol)})</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
