import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleRecord, StoreSettings, User } from '../types';
import { formatCurrency } from './currencyUtils';

export function generateCustomerStatementPdf(
  customerName: string,
  customerPhone: string | undefined,
  sales: SaleRecord[],
  settings: StoreSettings,
  user: User
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Emerald header
  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.storeName.toUpperCase(), 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('STATEMENT OF CUSTOMER CREDIT ACCOUNT', 14, 20);

  // Date and Time
  doc.text(new Date().toLocaleDateString(), pageWidth - 14, 16, { align: 'right' });

  // Customer Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER ACCOUNT:', 14, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, 14, 42);
  if (customerPhone) doc.text(`Phone: ${customerPhone}`, 14, 47);

  // Store details
  doc.setFont('helvetica', 'bold');
  doc.text('ISSUED BY:', pageWidth / 2 + 10, 36);
  doc.setFont('helvetica', 'normal');
  doc.text(`${settings.storeName} (${settings.storeAddress})`, pageWidth / 2 + 10, 42);
  doc.text(`Phone: ${settings.storePhone}`, pageWidth / 2 + 10, 47);
  doc.text(`Staff: ${user.name}`, pageWidth / 2 + 10, 52);

  const sortedSales = [...sales].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let totalCreditPurchased = 0;
  let totalSettled = 0;

  const rows = sortedSales.map(s => {
    const isPaid = s.paymentStatus === 'PAID';
    const amountPaid = isPaid ? s.grandTotal : (s.amountPaid || 0);
    const balanceDue = isPaid ? 0 : Math.max(0, s.grandTotal - (s.amountPaid || 0));

    totalCreditPurchased += s.grandTotal;
    totalSettled += amountPaid;

    const itemsSummary = s.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

    return [
      new Date(s.createdAt).toLocaleDateString(),
      s.invoiceNo,
      itemsSummary.length > 35 ? itemsSummary.slice(0, 32) + '...' : itemsSummary,
      formatCurrency(s.grandTotal, settings.currencySymbol),
      formatCurrency(amountPaid, settings.currencySymbol),
      formatCurrency(balanceDue, settings.currencySymbol),
      isPaid ? 'SETTLED' : 'OUTSTANDING'
    ];
  });

  const outstandingBalance = Math.max(0, totalCreditPurchased - totalSettled);

  autoTable(doc, {
    startY: 58,
    head: [['Date', 'Invoice #', 'Purchased Items', 'Total Bill', 'Paid', 'Balance Due', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'center', fontStyle: 'bold' }
    }
  });

  const lastY = (doc as any).lastAutoTable.finalY + 8;

  // Account Summary Card in PDF
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, lastY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL CREDIT PURCHASES', 20, lastY + 8);
  doc.text('TOTAL PAYMENTS RECEIVED', 80, lastY + 8);
  doc.text('CURRENT OUTSTANDING BALANCE', 140, lastY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(formatCurrency(totalCreditPurchased, settings.currencySymbol), 20, lastY + 16);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(totalSettled, settings.currencySymbol), 80, lastY + 16);
  doc.setTextColor(outstandingBalance > 0 ? 185 : 5, outstandingBalance > 0 ? 28 : 150, outstandingBalance > 0 ? 28 : 105);
  doc.text(formatCurrency(outstandingBalance, settings.currencySymbol), 140, lastY + 16);

  // Footer notes
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your business. Please contact management for any account reconciliations.', 14, lastY + 30);

  doc.save(`${customerName.replace(/\s+/g, '_')}_Account_Statement.pdf`);
}
