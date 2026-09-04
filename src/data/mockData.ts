import { InventoryItem, User, SaleRecord, ExpenseRecord, StockMovement, ActivityLog, StoreSettings } from '../types';
import { getFullStationeryCatalog } from './stationeryCatalog';

// Clean initial state: No demo users (Users create their own accounts via auth/admin setup)
export const INITIAL_USERS: User[] = [];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Sappy Stationary',
  storeAddress: '14 Pen & Paper Lane, Suite 100, Arts & Commerce District',
  storePhone: '+1 (555) 727-7978',
  storeEmail: 'orders@sappystationary.com',
  currencySymbol: 'ETB',
  taxRatePercent: 0,
  lowStockThresholdDefault: 8,
  receiptFooterMessage: 'Thank you for shopping at Sappy Stationary! Fine papers, notebooks, pens & desk accessories. Returns accepted within 30 days with receipt.',
  enableSoundEffects: true,
  enableHardwareScannerAutoSubmit: true,
};

export const INITIAL_ITEMS: InventoryItem[] = getFullStationeryCatalog();

// Clean initial state: No demo transactions or sales history
export const INITIAL_SALES: SaleRecord[] = [];

// Clean initial state: No demo operating expenses
export const INITIAL_EXPENSES: ExpenseRecord[] = [];

// Clean initial state: No demo stock movements
export const INITIAL_MOVEMENTS: StockMovement[] = [];

// Clean initial state: No demo activity logs
export const INITIAL_LOGS: ActivityLog[] = [];
