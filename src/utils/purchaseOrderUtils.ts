import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InventoryItem, StoreSettings, Supplier, User } from '../types';
import { formatCurrency } from './currencyUtils';

export interface PurchaseOrderItem {
  item: InventoryItem;
  suggestedQuantity: number;
  orderQuantity: number;
  unitCost: number;
  subtotal: number;
}

export function generatePurchaseOrderPdf(
  poNumber: string,
  supplier: Supplier | null,
  orderItems: PurchaseOrderItem[],
  settings: StoreSettings,
  user: User,
  notes?: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header Banner
  doc.setFillColor(6, 78, 59); // Emerald 900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.storeName.toUpperCase(), 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL RESTOCK PURCHASE ORDER', 14, 21);

  // PO Number Pill on top right
  doc.setFont('helvetica', 'bold');
  doc.text(poNumber, pageWidth - 14, 17, { align: 'right' });

  // Metadata Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLIER / VENDOR:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(supplier ? supplier.name : 'General Stationery Distributor', 14, 43);
  if (supplier?.contactPerson) doc.text(`Contact: ${supplier.contactPerson}`, 14, 48);
  if (supplier?.phone) doc.text(`Phone: ${supplier.phone}`, 14, 53);
  if (supplier?.address) doc.text(`Address: ${supplier.address}`, 14, 58);

  doc.setFont('helvetica', 'bold');
  doc.text('ORDER DETAILS:', pageWidth / 2 + 10, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, pageWidth / 2 + 10, 43);
  doc.text(`Prepared By: ${user.name} (${user.role})`, pageWidth / 2 + 10, 48);
  doc.text(`Store Contact: ${settings.storePhone}`, pageWidth / 2 + 10, 53);
  doc.text(`Delivery Destination: ${settings.storeAddress}`, pageWidth / 2 + 10, 58);

  const startTableY = 65;

  const tableBody = orderItems.map((oi, idx) => [
    (idx + 1).toString(),
    oi.item.sku,
    oi.item.name,
    oi.item.category,
    `${oi.item.stock} ${oi.item.unit || 'Pcs'}`,
    `${oi.orderQuantity} ${oi.item.unit || 'Pcs'}`,
    formatCurrency(oi.unitCost, settings.currencySymbol),
    formatCurrency(oi.subtotal, settings.currencySymbol)
  ]);

  const totalBudget = orderItems.reduce((acc, oi) => acc + oi.subtotal, 0);
  const totalUnits = orderItems.reduce((acc, oi) => acc + oi.orderQuantity, 0);

  autoTable(doc, {
    startY: startTableY,
    head: [['#', 'SKU', 'Item Description', 'Category', 'Current', 'Order Qty', 'Est. Unit Cost', 'Subtotal']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 20 },
      2: { cellWidth: 55 },
      4: { halign: 'center' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const lastY = (doc as any).lastAutoTable.finalY + 8;

  // Summary and Sign-off
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total Order Units: ${totalUnits} Pcs`, 14, lastY);
  doc.text(`Estimated Order Total: ${formatCurrency(totalBudget, settings.currencySymbol)}`, pageWidth - 14, lastY, { align: 'right' });

  if (notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Special Instructions: ${notes}`, 14, lastY + 8);
  }

  // Signature lines
  const sigY = lastY + 22;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, sigY, 70, sigY);
  doc.line(pageWidth - 70, sigY, pageWidth - 14, sigY);

  doc.setFontSize(8);
  doc.text('Authorized Signature / Store Stamp', 14, sigY + 5);
  doc.text('Vendor Acknowledgment', pageWidth - 70, sigY + 5);

  doc.save(`${poNumber}_${(supplier?.name || 'Reorder').replace(/\s+/g, '_')}.pdf`);
}
