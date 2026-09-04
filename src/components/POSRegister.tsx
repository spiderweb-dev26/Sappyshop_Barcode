import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { InventoryItem, PaymentMethod, SaleRecord, getPaymentMethodLabel } from '../types';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Building,
  Building2,
  Landmark,
  Smartphone,
  Scan, 
  Printer, 
  Download, 
  Share2, 
  X, 
  CheckCircle2, 
  Receipt as ReceiptIcon,
  Tag,
  Sparkles,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SappyLogoMark } from './SappyLogo';
import { formatCurrency } from '../utils/currencyUtils';

const SAPPY_PAYMENT_METHODS: { id: PaymentMethod; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'CASH', label: 'Cash', subLabel: 'Direct Cash', icon: Banknote },
  { id: 'CBE_YOHANNES', label: 'CBE (Yohannes)', subLabel: 'Commercial Bank', icon: Building },
  { id: 'CBE_AZEB', label: 'CBE (Azeb)', subLabel: 'Commercial Bank', icon: Building },
  { id: 'AWASH', label: 'Awash', subLabel: 'Awash Bank', icon: Building2 },
  { id: 'TELEBIRR', label: 'Telebirr', subLabel: 'Telebirr Wallet', icon: Smartphone },
  { id: 'BOA', label: 'BOA', subLabel: 'Bank of Abyssinia', icon: Landmark },
];

export const POSRegister: React.FC = () => {
  const { 
    items, 
    cart, 
    addToCart, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart, 
    checkoutSale, 
    settings, 
    setIsScannerModalOpen,
    currentUser,
    handleBarcodeScanned 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('ALL');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<SaleRecord | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Categories
  const categories = Array.from(new Set(items.map(i => i.category))).filter(Boolean);

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search);
    const matchesCat = selectedCat === 'ALL' || item.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  // Calculate totals (No taxes)
  const subtotal = cart.reduce((acc, c) => acc + (c.unitPrice * c.quantity), 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = 0;

  // Paid cash calculations
  const parsedPaid = parseFloat(amountPaidInput) || 0;
  const changeDue = Math.max(0, parsedPaid - grandTotal);

  const handleBarcodeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    const scanned = handleBarcodeScanned(search.trim());
    if (scanned) {
      setSearch('');
    }
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setAmountPaidInput(grandTotal.toFixed(2));
    setIsCheckoutOpen(true);
  };

  const handleExecuteCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const paid = paymentMethod === 'CASH' ? (parseFloat(amountPaidInput) || grandTotal) : grandTotal;
    const result = checkoutSale(
      paymentMethod,
      paid,
      undefined,
      undefined,
      undefined,
      discountAmount
    );

    if (result) {
      setIsCheckoutOpen(false);
      setCompletedSale(result);
      // Trigger festive celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#34d399', '#047857']
        });
      } catch {
        // Ignore if unavailable
      }
    }
  };

  // Quick denomination helper buttons
  const setQuickCash = (amt: number) => {
    setAmountPaidInput(amt.toFixed(2));
  };

  // Print thermal receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Download PDF Receipt
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
    doc.text(`Payment: ${getPaymentMethodLabel(sale.paymentMethod)} | Status: ${sale.status}`, 14, 44);

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

  return (
    <div className="space-y-4 pb-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">
              Point of Sale (POS) Checkout Register
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Cashier: <strong className="text-emerald-800 font-semibold">{currentUser.name}</strong> &bull; Hardware Barcode Scanner & Camera Live
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScannerModalOpen(true)}
            className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-200" />
            <span>Open Camera Scanner</span>
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Product Selection Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-3 flex flex-col">
          {/* Search bar */}
          <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
            <form onSubmit={handleBarcodeSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scan barcode, type SKU or product title to add directly..."
                className="w-full h-8 pl-9 pr-20 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
              >
                Find & Add
              </button>
            </form>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2.5 pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCat('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
                  selectedCat === 'ALL'
                    ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All Products ({items.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
                    selectedCat === cat
                      ? 'bg-emerald-800 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[580px] p-1">
            {filteredItems.map((item) => {
              const isOut = item.stock <= 0;
              const isLow = item.stock > 0 && item.stock <= item.minStockAlert;
              const inCart = cart.find(c => c.item.id === item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => !isOut && addToCart(item, 1)}
                  className={`p-3 rounded-lg border transition-all flex flex-col justify-between text-left select-none relative group ${
                    isOut
                      ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-white hover:bg-emerald-50/40 border-emerald-100 hover:border-emerald-400 shadow-xs cursor-pointer active:scale-98'
                  }`}
                >
                  {/* Cart count badge */}
                  {inCart && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 text-white font-bold rounded-full text-[10px] flex items-center justify-center shadow-xs">
                      {inCart.quantity}
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      {item.sku}
                    </span>
                    <h3 className="font-bold text-xs text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-800 font-mono">
                        {formatCurrency(item.sellingPrice, settings.currencySymbol)}
                      </p>
                      <span className="text-[10px] text-slate-400">/{item.unit}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isOut
                        ? 'bg-rose-100 text-rose-800'
                        : isLow
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.stock} left
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active POS Cart (5 cols) */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-lg border border-emerald-100 shadow-sm overflow-hidden">
          {/* Cart Header */}
          <div className="p-3.5 bg-[#064e3b] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-300" />
              <div>
                <h2 className="font-bold text-xs uppercase tracking-wider">Active Order Cart</h2>
                <p className="text-[11px] text-emerald-200">
                  {cart.reduce((acc, c) => acc + c.quantity, 0)} Items Added
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] font-semibold text-rose-200 hover:text-rose-100 bg-rose-950/60 hover:bg-rose-950 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 p-3 overflow-y-auto max-h-[380px] divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-bold text-xs text-slate-600">Register Cart Is Empty</p>
                <p className="text-[11px] max-w-xs mx-auto text-slate-400">
                  Scan a barcode or click any product from the catalog on the left.
                </p>
              </div>
            ) : (
              cart.map(({ item, quantity, unitPrice }) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatCurrency(unitPrice, settings.currencySymbol)} &times; {quantity} {item.unit}
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateCartQuantity(item.id, quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold font-mono text-slate-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, quantity + 1)}
                      disabled={quantity >= item.stock}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center justify-center font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="text-right shrink-0 min-w-[60px]">
                    <p className="font-mono font-bold text-slate-900">
                      {formatCurrency(unitPrice * quantity, settings.currencySymbol)}
                    </p>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-slate-300 hover:text-rose-600 p-1"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Cart Pricing Calculation & Checkout Button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-mono font-semibold">{formatCurrency(subtotal, settings.currencySymbol)}</span>
            </div>

            {/* Discount line */}
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-600" /> Order Discount ({settings.currencySymbol})
              </span>
              <input
                type="number"
                step="0.5"
                min="0"
                max={subtotal}
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
                className="w-20 px-2 py-0.5 bg-white border border-slate-200 rounded text-right font-mono text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Grand Total */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-base">
              <span className="font-extrabold text-slate-900">Grand Total</span>
              <span className="font-extrabold text-emerald-700 font-mono text-xl">
                {formatCurrency(grandTotal, settings.currencySymbol)}
              </span>
            </div>

            {/* Checkout Action Button */}
            <button
              disabled={cart.length === 0}
              onClick={handleOpenCheckout}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              <span>Charge & Checkout ({formatCurrency(grandTotal, settings.currencySymbol)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHECKOUT PAYMENT MODAL */}
      {/* ========================================================================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-slate-900">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Payment & Checkout Terminal</h3>
              </div>
              <button onClick={() => setIsCheckoutOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteCheckout} className="p-6 space-y-4">
              {/* Grand Total Highlight */}
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Amount Due</p>
                <p className="text-3xl font-extrabold text-emerald-900 font-mono mt-0.5">
                  {formatCurrency(grandTotal, settings.currencySymbol)}
                </p>
              </div>

              {/* Payment Method Selector (Strictly limited to 6 Sappy Stationary methods) */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SAPPY_PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`} />
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs leading-snug">{m.label}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {m.subLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* If Cash: Quick change & amount paid */}
              {paymentMethod === 'CASH' && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Tendered Cash Amount ({settings.currencySymbol})</label>
                    {changeDue > 0 && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Change Due: {formatCurrency(changeDue, settings.currencySymbol)}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                    autoFocus
                  />

                  {/* Quick Cash Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => setQuickCash(grandTotal)}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg text-xs font-bold text-slate-700"
                    >
                      Exact ({formatCurrency(grandTotal, settings.currencySymbol)})
                    </button>
                    {[50, 100, 200, 500, 1000, 2000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickCash(amt)}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-lg text-xs font-bold text-slate-700"
                      >
                        {formatCurrency(amt, settings.currencySymbol)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* If Digital Payment Method */}
              {paymentMethod !== 'CASH' && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-semibold block">Confirmed: {getPaymentMethodLabel(paymentMethod)}</span>
                    <span className="text-[11px] text-emerald-700">Digital transfer verified. Ready to complete sale instantly.</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Back to Cart
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-950/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Sale & Print</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COMPLETED SALE / RECEIPT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {completedSale && (
        <div className="printable-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-h-none print:w-auto">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Sale Completed Successfully!</h3>
              </div>
              <button onClick={() => setCompletedSale(null)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 print:p-0 print:overflow-visible">
              <div id="printable-receipt-area" className="bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs text-slate-800 space-y-3 shadow-inner print:bg-white print:border-none print:shadow-none print:p-0">
                {/* Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <div className="flex justify-center mb-1">
                    <SappyLogoMark size={32} color="#064e3b" />
                  </div>
                  <h4 className="font-bold text-sm tracking-tight text-slate-900">{settings.storeName}</h4>
                  <p className="text-[10px] text-slate-500 font-serif italic">stationery &amp; printing.</p>
                  <p className="text-[10px] text-slate-500">{settings.storeAddress}</p>
                  <p className="text-[10px] text-slate-500">Tel: {settings.storePhone}</p>
                </div>

                {/* Details */}
                <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span>Invoice:</span>
                    <strong className="text-slate-900">{completedSale.invoiceNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(completedSale.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{completedSale.cashierName}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1.5 py-1">
                  {completedSale.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <div className="truncate max-w-[180px]">
                        <span>{i.name}</span>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {i.quantity} &times; {formatCurrency(i.unitPrice, settings.currencySymbol)}
                        </div>
                      </div>
                      <span className="font-bold">{formatCurrency(i.subtotal, settings.currencySymbol)}</span>
                    </div>
                  ))}
                </div>

                {/* Summary Totals */}
                <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(completedSale.subtotal, settings.currencySymbol)}</span>
                  </div>
                  {completedSale.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span>-{formatCurrency(completedSale.discountAmount, settings.currencySymbol)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-300 text-slate-900">
                    <span>TOTAL:</span>
                    <span className="text-emerald-800">{formatCurrency(completedSale.grandTotal, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 pt-1 font-semibold">
                    <span>Payment Method:</span>
                    <span className="text-emerald-800">{getPaymentMethodLabel(completedSale.paymentMethod)}</span>
                  </div>
                  {completedSale.paymentMethod === 'CASH' && (
                    <>
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Amount Tendered:</span>
                        <span>{formatCurrency(completedSale.amountPaid, settings.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-800">
                        <span>Change Due:</span>
                        <span>{formatCurrency(completedSale.changeDue, settings.currencySymbol)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer Message */}
                <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 leading-snug">
                  {settings.receiptFooterMessage}
                </div>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <button
                onClick={handlePrintReceipt}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Receipt</span>
              </button>

              <button
                onClick={() => handleDownloadPdfInvoice(completedSale)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>PDF Invoice</span>
              </button>

              <button
                onClick={() => setCompletedSale(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
              >
                New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
