export type UserRole = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'AUDITOR';
export type UserApprovalStatus = 'APPROVED' | 'PENDING' | 'REJECTED';

export const MASTER_PASSCODE = 'Sappy@1313';

export interface MasterAuthRequest {
  title?: string;
  actionName: string;
  description?: string;
  warning?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin: string; // 4-digit PIN for quick terminal access
  avatarColor: string;
  avatar?: string;
  lastLogin?: string;
  active: boolean;
  approvalStatus?: UserApprovalStatus;
  requestedRole?: UserRole;
  registeredAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand?: string;
  unit: string; // 'pcs' | 'kg' | 'box' | 'pack' | 'bottle' | 'meter' etc.
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  location?: string; // Shelf A1, Warehouse B, etc.
  supplier?: string;
  batchNumber?: string;
  expiryDate?: string;
  description?: string;
  imageUrl?: string; // Product photo (data URL or web URL)
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  discount: number; // in percentage or fixed
}

export interface SaleItem {
  itemId: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  imageUrl?: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
  discount: number;
}

export type PaymentMethod = 
  | 'CASH' 
  | 'CBE_YOHANNES' 
  | 'CBE_AZEB' 
  | 'AWASH' 
  | 'TELEBIRR' 
  | 'BOA'
  | 'CARD'
  | 'TRANSFER'
  | 'CREDIT';

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; short: string; color: string }[] = [
  { id: 'CASH', label: 'Cash', short: 'Cash', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'CBE_YOHANNES', label: 'CBE (Yohannes)', short: 'CBE (Yohannes)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'CBE_AZEB', label: 'CBE (Azeb)', short: 'CBE (Azeb)', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'AWASH', label: 'Awash', short: 'Awash Bank', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'TELEBIRR', label: 'Telebirr', short: 'Telebirr', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { id: 'BOA', label: 'BOA', short: 'Bank of Abyssinia', color: 'bg-amber-100 text-amber-800 border-amber-300' },
];

export const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'CASH': return 'Cash';
    case 'CBE_YOHANNES': return 'CBE (Yohannes)';
    case 'CBE_AZEB': return 'CBE (Azeb)';
    case 'AWASH': return 'Awash';
    case 'TELEBIRR': return 'Telebirr';
    case 'BOA': return 'BOA';
    case 'CARD': return 'Card';
    case 'TRANSFER': return 'Transfer';
    case 'CREDIT': return 'Credit Tab';
    default: return method;
  }
};

export interface SaleRecord {
  id: string;
  invoiceNo: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number;
  netProfit: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeDue: number;
  customerName?: string;
  customerPhone?: string;
  cashierId: string;
  cashierName: string;
  status: 'COMPLETED' | 'REFUNDED';
  paymentStatus?: 'PAID' | 'UNPAID_CREDIT' | 'PARTIALLY_PAID';
  creditSettledAt?: string;
  creditSettledMethod?: PaymentMethod;
  createdAt: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'RENT' 
  | 'UTILITIES' 
  | 'SALARIES' 
  | 'SUPPLIES' 
  | 'LOGISTICS' 
  | 'MARKETING' 
  | 'MAINTENANCE' 
  | 'PACKAGING' 
  | 'TAXES' 
  | 'OTHER';

export interface ExpenseRecord {
  id: string;
  expenseNo: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  payee: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  recordedById: string;
  recordedByName: string;
  createdAt: string;
}

export type StockMovementType = 
  | 'SALE' 
  | 'RESTOCK' 
  | 'ADJUSTMENT' 
  | 'DAMAGE' 
  | 'RETURN' 
  | 'INITIAL' 
  | 'IMPORT'
  | 'YEAR_END_ROLLOVER';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number; // e.g. -2 for sale, +10 for restock
  previousStock: number;
  newStock: number;
  referenceId?: string; // invoiceNo, expenseNo, etc.
  reason: string;
  performedById: string;
  performedByName: string;
  timestamp: string;
}

export type ActionType = 
  | 'ITEM_CREATED' 
  | 'ITEM_UPDATED' 
  | 'ITEM_DELETED' 
  | 'STOCK_ADJUSTED' 
  | 'SALE_CREATED' 
  | 'SALE_REFUNDED' 
  | 'EXPENSE_CREATED' 
  | 'EXPENSE_DELETED' 
  | 'BULK_IMPORT' 
  | 'DATA_EXPORT' 
  | 'USER_CREATED' 
  | 'ROLE_CHANGED' 
  | 'USER_LOGIN' 
  | 'SETTINGS_UPDATED'
  | 'DATA_RESTORED'
  | 'FULL_RESET'
  | 'YEAR_END_RESET'
  | 'CREDIT_SETTLED'
  | 'MASTER_AUTH_SUCCESS';

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  actionType: ActionType;
  entityType: 'ITEM' | 'SALE' | 'EXPENSE' | 'USER' | 'SYSTEM' | 'REPORT';
  entityId?: string;
  details: string;
  metadata?: Record<string, unknown>;
}

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  currencySymbol: string;
  taxRatePercent: number;
  lowStockThresholdDefault: number;
  receiptFooterMessage: string;
  enableSoundEffects: boolean;
  enableHardwareScannerAutoSubmit: boolean;
  requirePinForSwitching?: boolean; // When false, staff and admins can switch profiles without entering a PIN
}

export interface BarcodeLabelOption {
  template: 'single' | 'sheet-30' | 'sheet-24' | 'shelf-tag';
  showName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcodeText: boolean;
  showCategory: boolean;
  barcodeType: 'CODE128' | 'EAN13' | 'UPC' | 'QR';
}
