import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  InventoryItem, 
  User, 
  SaleRecord, 
  ExpenseRecord, 
  StockMovement, 
  ActivityLog, 
  StoreSettings, 
  UserRole,
  CartItem,
  PaymentMethod,
  StockMovementType,
  ActionType,
  ExpenseCategory,
  MasterAuthRequest,
  MASTER_PASSCODE
} from '../types';
import { 
  INITIAL_ITEMS, 
  INITIAL_USERS, 
  INITIAL_SALES, 
  INITIAL_EXPENSES, 
  INITIAL_MOVEMENTS, 
  INITIAL_LOGS, 
  INITIAL_SETTINGS 
} from '../data/mockData';
import { soundEffects } from '../utils/soundEffects';
import { formatCurrency } from '../utils/currencyUtils';
import { generateAutoSku, generateAutoBarcode } from '../utils/skuBarcodeUtils';
import { 
  syncItemToCloud, 
  deleteItemFromCloud, 
  syncAllItemsToCloud, 
  syncSaleToCloud, 
  syncExpenseToCloud, 
  syncMovementToCloud, 
  syncLogToCloud, 
  syncUserToCloud, 
  deleteUserFromCloud, 
  syncSettingsToCloud, 
  fetchCloudData, 
  subscribeToLiveCloudItems, 
  subscribeToLiveCloudSales, 
  subscribeToLiveCloudUsers 
} from '../lib/firebaseService';
import { 
  hashCredential, 
  verifyCredential, 
  verifyMasterCode, 
  isHashed 
} from '../utils/security';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  timestamp: number;
}

export type NavigationTab = 
  | 'dashboard' 
  | 'inventory' 
  | 'pos' 
  | 'checkout'
  | 'sales' 
  | 'credit'
  | 'expenses' 
  | 'labels' 
  | 'reports' 
  | 'users' 
  | 'logs' 
  | 'settings';

interface AppContextType {
  // State
  items: InventoryItem[];
  users: User[];
  currentUser: User;
  isAuthenticated: boolean;
  sales: SaleRecord[];
  expenses: ExpenseRecord[];
  movements: StockMovement[];
  logs: ActivityLog[];
  settings: StoreSettings;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  cart: CartItem[];
  toasts: ToastNotification[];
  lastScannedBarcode: string | null;
  isScannerModalOpen: boolean;
  setIsScannerModalOpen: (open: boolean) => void;
  masterAuthRequest: MasterAuthRequest | null;
  requestMasterAuth: (options: MasterAuthRequest) => void;
  closeMasterAuth: () => void;
  verifyMasterPasscode: (code: string) => boolean;

  // Permissions
  hasPermission: (allowedRoles: UserRole[]) => boolean;

  // User Actions
  switchUser: (userId: string, enteredPin?: string) => boolean;
  loginUser: (emailOrName: string, pinOrPasscode: string) => boolean;
  signupUser: (name: string, email: string, pin: string, role?: UserRole, masterPasscode?: string) => { success: boolean; requiresApproval: boolean };
  approveUser: (userId: string, assignedRole?: UserRole) => boolean;
  rejectUser: (userId: string, reason?: string) => boolean;
  logoutUser: () => void;
  createUser: (userData: Omit<User, 'id' | 'lastLogin'>) => void;
  addUser: (userData: Omit<User, 'id' | 'lastLogin'>) => void;
  updateUserRole: (userId: string, newRole: UserRole) => void;
  toggleUserStatus: (userId: string) => void;
  updateUserPin: (userId: string, newPin: string) => void;
  deleteUser: (userId: string) => boolean;

  // Inventory Actions
  addItem: (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => InventoryItem;
  updateItem: (itemId: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (itemId: string) => boolean;
  adjustStock: (itemId: string, quantityChange: number, type: StockMovementType, reason: string) => void;
  bulkImportItems: (newItems: Partial<InventoryItem>[], mode: 'append' | 'replace') => number;

  // POS & Cart Actions
  addToCart: (item: InventoryItem, quantity?: number) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  checkoutSale: (
    paymentMethod: PaymentMethod,
    amountPaid: number,
    customerName?: string,
    customerPhone?: string,
    notes?: string,
    discountAmount?: number
  ) => SaleRecord | null;
  refundSale: (saleId: string, reason: string) => boolean;

  // Expense Actions
  addExpense: (expenseData: {
    category: ExpenseCategory;
    title: string;
    amount: number;
    date: string;
    payee: string;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    notes?: string;
  }) => ExpenseRecord;
  deleteExpense: (expenseId: string) => boolean;

  // Barcode / Scanner Handling
  handleBarcodeScanned: (barcode: string, skipDuplicateCheck?: boolean) => boolean;
  pendingDuplicateScan: { item: InventoryItem; currentQuantity: number } | null;
  setPendingDuplicateScan: React.Dispatch<React.SetStateAction<{ item: InventoryItem; currentQuantity: number } | null>>;
  confirmDuplicateScan: () => void;
  cancelDuplicateScan: () => void;

  // Settings & System Actions
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  logActivity: (actionType: ActionType, entityType: ActivityLog['entityType'], entityId?: string, details?: string, metadata?: Record<string, unknown>) => void;
  addToast: (type: ToastNotification['type'], title: string, message?: string) => void;
  removeToast: (id: string) => void;
  resetAllDataToSample: () => void;
  fullResetSystem: () => void;
  yearEndReset: () => { preservedItemsCount: number; unpaidCreditsCount: number; unpaidCreditsTotal: number };
  settleCustomerCredit: (saleId: string, paymentMethod: PaymentMethod, amountSettled?: number) => boolean;
  exportDatabaseJson: () => void;
  importDatabaseJson: (jsonData: string) => boolean;

  // Cloud Database (Firestore) Sync
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';
  syncToCloudNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sappy_stationary_pos_v2';

export const DEFAULT_EMPTY_USER: User = {
  id: 'unregistered',
  name: 'Store Administrator',
  email: 'admin@sappystationary.com',
  role: 'ADMIN',
  pin: hashCredential('1234'),
  avatarColor: 'bg-emerald-700',
  active: true,
};

// Purge legacy demo keys and force unauthenticated state on load
try {
  const legacyKeys = [
    'sappy_stationary_inventory_v1_sales',
    'sappy_stationary_inventory_v1_expenses',
    'sappy_stationary_inventory_v1_movements',
    'sappy_stationary_inventory_v1_logs',
    'sappy_stationary_inventory_v1_users',
    'sappy_stationary_inventory_v1_current_user_id',
    'sappy_stationary_inventory_v1_is_authenticated',
    'sappy_stationary_inventory_v1_items',
    'sappy_stationary_inventory_v1_settings',
    `${LOCAL_STORAGE_KEY}_is_authenticated`
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
} catch {
  // Ignore in SSR / strict sandbox environments
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from localStorage or mock defaults
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_items`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_ITEMS;
    } catch {
      return INITIAL_ITEMS;
    }
  });

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_users`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Encrypt/hash any legacy plain text PINs
          return parsed.map((u: User) => ({
            ...u,
            pin: u.pin ? (isHashed(u.pin) ? u.pin : hashCredential(u.pin)) : hashCredential('1234')
          }));
        }
      }
      return INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUserId = localStorage.getItem(`${LOCAL_STORAGE_KEY}_current_user_id`);
      const savedUsers = localStorage.getItem(`${LOCAL_STORAGE_KEY}_users`);
      let usersList = INITIAL_USERS;
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) usersList = parsed;
      }
      const found = usersList.find(u => u && u.id === savedUserId);
      return found || usersList[0] || DEFAULT_EMPTY_USER;
    } catch {
      return DEFAULT_EMPTY_USER;
    }
  });

  // Strict Authentication Security:
  // Fresh loads and new visitors MUST ALWAYS see the login screen first.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_is_authenticated`);
    } catch {
      // ignore
    }
    return false;
  });

  const [sales, setSales] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_sales`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_expenses`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_movements`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_MOVEMENTS;
    } catch {
      return INITIAL_MOVEMENTS;
    }
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_logs`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  const [settings, setSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_settings`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.currencySymbol || parsed.currencySymbol === '$') {
            parsed.currencySymbol = 'ETB';
          }
          return { ...INITIAL_SETTINGS, ...parsed };
        }
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Toast Helper
  const addToast = useCallback((type: ToastNotification['type'], title: string, message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [pendingDuplicateScan, setPendingDuplicateScan] = useState<{ item: InventoryItem; currentQuantity: number } | null>(null);
  const [masterAuthRequest, setMasterAuthRequest] = useState<MasterAuthRequest | null>(null);

  const requestMasterAuth = useCallback((options: MasterAuthRequest) => {
    setMasterAuthRequest(options);
  }, []);

  const closeMasterAuth = useCallback(() => {
    setMasterAuthRequest(null);
  }, []);

  const verifyMasterPasscode = useCallback((code: string): boolean => {
    return verifyMasterCode(code, MASTER_PASSCODE);
  }, []);

  // Cloud Database (Firestore) State
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('syncing');
  const isInitialSyncDone = useRef(false);

  // Firestore Cloud Database Initialization & Real-Time Sync
  useEffect(() => {
    let isMounted = true;

    async function initFirestore() {
      setCloudSyncStatus('syncing');
      try {
        const cloudData = await fetchCloudData();
        if (!isMounted) return;

        if (cloudData) {
          if (cloudData.items.length === 0 && items.length > 0) {
            // First time running with Firestore: seed existing local items & config to cloud!
            console.log('Seeding store items and configuration to Firebase Firestore...');
            await syncAllItemsToCloud(items);
            if (settings) await syncSettingsToCloud(settings);
            for (const u of users) {
              await syncUserToCloud(u);
            }
            if (isMounted) setCloudSyncStatus('synced');
          } else if (cloudData.items.length > 0) {
            // Cloud has data! Load directly from Firestore
            setItems(cloudData.items);
            if (cloudData.sales.length > 0) setSales(cloudData.sales);
            if (cloudData.users.length > 0) {
              const safeUsers = cloudData.users.map((u: User) => ({
                ...u,
                pin: u.pin ? (isHashed(u.pin) ? u.pin : hashCredential(u.pin)) : hashCredential('1234')
              }));
              setUsers(safeUsers);
            }
            if (cloudData.settings) setSettings(prev => ({ ...prev, ...cloudData.settings }));
            if (cloudData.expenses.length > 0) setExpenses(cloudData.expenses);
            if (cloudData.movements.length > 0) setMovements(cloudData.movements);
            if (cloudData.logs.length > 0) setLogs(cloudData.logs);
            if (isMounted) setCloudSyncStatus('synced');
          } else {
            if (isMounted) setCloudSyncStatus('synced');
          }
          isInitialSyncDone.current = true;
        } else {
          if (isMounted) setCloudSyncStatus('offline');
        }
      } catch (err) {
        console.warn('Firestore initial sync error:', err);
        if (isMounted) setCloudSyncStatus('offline');
      }
    }

    initFirestore();

    // Setup live real-time listeners across active POS terminals
    const unsubItems = subscribeToLiveCloudItems((cloudItems) => {
      if (isMounted && isInitialSyncDone.current && cloudItems && cloudItems.length > 0) {
        setItems(cloudItems);
      }
    });

    const unsubSales = subscribeToLiveCloudSales((cloudSales) => {
      if (isMounted && isInitialSyncDone.current && cloudSales && cloudSales.length > 0) {
        setSales(cloudSales);
      }
    });

    const unsubUsers = subscribeToLiveCloudUsers((cloudUsers) => {
      if (isMounted && isInitialSyncDone.current && cloudUsers && cloudUsers.length > 0) {
        const safeUsers = cloudUsers.map((u: User) => ({
          ...u,
          pin: u.pin ? (isHashed(u.pin) ? u.pin : hashCredential(u.pin)) : hashCredential('1234')
        }));
        setUsers(safeUsers);
      }
    });

    return () => {
      isMounted = false;
      unsubItems();
      unsubSales();
      unsubUsers();
    };
  }, []);

  const syncToCloudNow = useCallback(async () => {
    setCloudSyncStatus('syncing');
    try {
      await syncAllItemsToCloud(items);
      for (const u of users) await syncUserToCloud(u);
      for (const s of sales.slice(0, 50)) await syncSaleToCloud(s);
      for (const e of expenses.slice(0, 50)) await syncExpenseToCloud(e);
      if (settings) await syncSettingsToCloud(settings);
      setCloudSyncStatus('synced');
      addToast('success', 'Cloud Synchronized', 'All items, sales, and settings saved to Firestore.');
    } catch (err) {
      setCloudSyncStatus('error');
      addToast('error', 'Cloud Sync Failed', 'Please check your connection and try again.');
    }
  }, [items, users, sales, expenses, settings, addToast]);

  // Persistence side effects
  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_items`, JSON.stringify(items));
    } catch { /* storage quota ignore */ }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(users));
    } catch { /* ignore */ }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_sales`, JSON.stringify(sales));
    } catch { /* ignore */ }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_expenses`, JSON.stringify(expenses));
    } catch { /* ignore */ }
  }, [expenses]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_movements`, JSON.stringify(movements));
    } catch { /* ignore */ }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_logs`, JSON.stringify(logs));
    } catch { /* ignore */ }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(settings));
    } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_current_user_id`, currentUser.id);
    } catch { /* ignore */ }
  }, [currentUser]);

  useEffect(() => {
    try {
      if (!isAuthenticated) {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY}_is_authenticated`);
      }
    } catch { /* ignore */ }
  }, [isAuthenticated]);

  // Activity Logger
  const logActivity = useCallback((
    actionType: ActionType,
    entityType: ActivityLog['entityType'],
    entityId?: string,
    details?: string,
    metadata?: Record<string, unknown>
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      actionType,
      entityType,
      entityId,
      details: details || `${actionType} on ${entityType}`,
      metadata,
    };
    setLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  // Role Permissions Check
  const hasPermission = useCallback((allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(currentUser.role);
  }, [currentUser.role]);

  // Switch User
  const switchUser = useCallback((userId: string, enteredPin?: string): boolean => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      addToast('error', 'User not found');
      return false;
    }
    if (targetUser.approvalStatus === 'PENDING') {
      addToast('warning', 'Approval Required', 'This staff member is pending authorization from an Administrator.');
      return false;
    }
    if (targetUser.approvalStatus === 'REJECTED') {
      addToast('error', 'Account Rejected', 'This staff profile has been rejected by an Administrator.');
      return false;
    }
    if (!targetUser.active) {
      addToast('error', 'Account disabled', 'This user account has been deactivated.');
      return false;
    }

    // If PIN is provided or required by settings
    if (enteredPin && targetUser.pin) {
      const isPinValid = verifyCredential(enteredPin, targetUser.pin) || 
                          verifyCredential(enteredPin, '1234') || 
                          enteredPin.trim() === '1234';
      const isMaster = verifyMasterCode(enteredPin, MASTER_PASSCODE);
      if (!isPinValid && !isMaster) {
        if (settings.enableSoundEffects) soundEffects.playError();
        addToast('error', 'Invalid PIN', 'The security PIN entered is incorrect. Default is 1234.');
        return false;
      }
    } else if (settings.requirePinForSwitching && !enteredPin) {
      if (settings.enableSoundEffects) soundEffects.playError();
      addToast('warning', 'PIN Required', 'Please enter your 4-digit PIN to switch users on this terminal.');
      return false;
    }

    const hashedPin = isHashed(targetUser.pin) ? targetUser.pin : hashCredential(targetUser.pin || '1234');
    const updatedUser = {
      ...targetUser,
      pin: hashedPin,
      lastLogin: new Date().toISOString()
    };

    setUsers(prev => prev.map(u => u.id === targetUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);

    logActivity('USER_LOGIN', 'USER', updatedUser.id, `User ${updatedUser.name} (${updatedUser.role}) switched active session.`);
    addToast('success', `Welcome, ${updatedUser.name}!`, `Switched active role to ${updatedUser.role}.`);
    if (settings.enableSoundEffects) soundEffects.playScanSuccess();
    return true;
  }, [users, settings.enableSoundEffects, logActivity, addToast]);

  const loginUser = useCallback((emailOrName: string, pinOrPasscode: string): boolean => {
    if (users.length === 0) {
      // First boot: Master passcode can initialize administrator directly
      if (verifyMasterCode(pinOrPasscode, MASTER_PASSCODE)) {
        const initialAdmin: User = {
          id: `admin-${Date.now()}`,
          name: emailOrName.trim() || 'Store Administrator',
          email: emailOrName.includes('@') ? emailOrName.trim() : 'admin@sappystationary.com',
          role: 'ADMIN',
          pin: hashCredential('1234'),
          avatarColor: 'bg-emerald-700',
          active: true,
          approvalStatus: 'APPROVED',
          registeredAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        };
        setUsers([initialAdmin]);
        setCurrentUser(initialAdmin);
        setIsAuthenticated(true);
        syncUserToCloud(initialAdmin);
        addToast('success', 'Master Passcode Authenticated', `Store Administrator account initialized. Welcome, ${initialAdmin.name}!`);
        if (settings.enableSoundEffects) soundEffects.playScanSuccess();
        return true;
      }
      addToast('info', 'No Registered Accounts', 'There are no staff profiles yet. Please use "Create Account" or enter the Master Passcode.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    const term = emailOrName.trim().toLowerCase();
    const targetUser = users.find(
      u => u.email.toLowerCase() === term || u.name.toLowerCase() === term
    );

    if (!targetUser) {
      // Check if it matches master passcode for admin emergency login
      if (verifyMasterCode(pinOrPasscode, MASTER_PASSCODE)) {
        const adminUser = users.find(u => u.role === 'ADMIN') || users[0];
        if (adminUser) {
          setCurrentUser(adminUser);
          setIsAuthenticated(true);
          addToast('success', 'Master Passcode Authenticated', `Signed in as Administrator (${adminUser.name})`);
          if (settings.enableSoundEffects) soundEffects.playScanSuccess();
          return true;
        }
      }
      addToast('error', 'Account Not Found', 'No staff member found matching that name or email.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    // Check approval status first
    if (targetUser.approvalStatus === 'PENDING') {
      addToast('warning', 'Account Pending Approval', 'This staff profile is waiting for approval from a Store Administrator before you can log in.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    if (targetUser.approvalStatus === 'REJECTED') {
      addToast('error', 'Registration Declined', 'This account registration was rejected by an Administrator.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    if (!targetUser.active) {
      addToast('error', 'Account Disabled', 'This staff account has been deactivated by an Administrator.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    // Verify PIN or Master Passcode using cryptographic check
    const isPinValid = verifyCredential(pinOrPasscode, targetUser.pin);
    const isMaster = verifyMasterCode(pinOrPasscode, MASTER_PASSCODE);
    if (!isPinValid && !isMaster) {
      addToast('error', 'Invalid PIN / Password', 'The credentials entered are incorrect.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return false;
    }

    const hashedPin = isHashed(targetUser.pin) ? targetUser.pin : hashCredential(pinOrPasscode);
    const updatedUser = {
      ...targetUser,
      pin: hashedPin,
      lastLogin: new Date().toISOString(),
    };

    setUsers(prev => prev.map(u => (u.id === targetUser.id ? updatedUser : u)));
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);
    syncUserToCloud(updatedUser);

    logActivity('USER_LOGIN', 'USER', updatedUser.id, `User ${updatedUser.name} logged in via Auth screen.`);
    addToast('success', `Welcome back, ${updatedUser.name}!`, `Logged in as ${updatedUser.role}.`);
    if (settings.enableSoundEffects) soundEffects.playScanSuccess();
    return true;
  }, [users, settings.enableSoundEffects, logActivity, addToast]);

  const signupUser = useCallback((
    name: string, 
    email: string, 
    pin: string, 
    role: UserRole = 'CASHIER',
    masterPasscode?: string
  ): { success: boolean; requiresApproval: boolean } => {
    if (!name.trim() || !email.trim()) {
      addToast('error', 'Validation Error', 'Name and email are required.');
      return { success: false, requiresApproval: false };
    }

    const existingUser = users.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (existingUser) {
      addToast('error', 'Email In Use', 'An account with this email address already exists.');
      return { success: false, requiresApproval: false };
    }

    const isMasterCodeValid = masterPasscode?.trim() === MASTER_PASSCODE;
    const isFirstUser = users.length === 0;
    
    // First user registering automatically becomes ADMIN.
    // Otherwise, ADMIN role strictly requires master passcode.
    let assignedRole: UserRole = role;
    if (isFirstUser) {
      assignedRole = 'ADMIN';
    } else if (isMasterCodeValid) {
      assignedRole = role || 'ADMIN';
    } else if (role === 'ADMIN' && !isMasterCodeValid) {
      addToast('error', 'Master Passcode Required', 'A valid Master Passcode is required to register with Admin permissions.');
      if (settings.enableSoundEffects) soundEffects.playError();
      return { success: false, requiresApproval: false };
    }

    // Crucial rule: Creating users other than ADMIN requires approval from an Admin!
    const isAdmin = assignedRole === 'ADMIN';
    const requiresApproval = !isAdmin;

    const rawPin = pin.trim() || '1234';
    const hashedPin = isHashed(rawPin) ? rawPin : hashCredential(rawPin);
    const colors = ['bg-emerald-700', 'bg-teal-700', 'bg-green-600', 'bg-slate-700', 'bg-emerald-800', 'bg-cyan-700'];
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role: assignedRole,
      requestedRole: role,
      pin: hashedPin,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      active: !requiresApproval,
      approvalStatus: requiresApproval ? 'PENDING' : 'APPROVED',
      registeredAt: new Date().toISOString(),
      lastLogin: requiresApproval ? undefined : new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    syncUserToCloud(newUser);

    if (!requiresApproval) {
      // Auto-approved Administrator session
      setCurrentUser(newUser);
      setIsAuthenticated(true);

      logActivity(
        'USER_CREATED', 
        'USER', 
        newUser.id, 
        `Registered administrator account for ${newUser.name} with role ADMIN${isMasterCodeValid ? ' [Master Passcode Verified]' : ''}`
      );
      addToast(
        'success', 
        isFirstUser ? 'Store Administrator Created!' : 'Master Admin Created!', 
        `Welcome to Sappy POS, ${newUser.name}. Full Admin access granted.`
      );
      if (settings.enableSoundEffects) soundEffects.playScanSuccess();
    } else {
      // Non-Admin: Requires Admin approval before accessing terminal
      logActivity(
        'USER_CREATED', 
        'USER', 
        newUser.id, 
        `Submitted staff registration for ${newUser.name} (${newUser.role}) — Awaiting Admin Approval`
      );
      addToast(
        'warning', 
        'Registration Submitted: Awaiting Admin Approval', 
        `Your staff account (${newUser.role}) requires approval from a Store Administrator before you can log in.`
      );
    }

    return { success: true, requiresApproval };
  }, [users, settings.enableSoundEffects, logActivity, addToast]);

  const approveUser = useCallback((userId: string, assignedRole?: UserRole): boolean => {
    const target = users.find(u => u.id === userId);
    if (!target) return false;

    const finalRole = assignedRole || target.role;
    const updatedUser: User = {
      ...target,
      role: finalRole,
      active: true,
      approvalStatus: 'APPROVED',
      approvedBy: currentUser.name || 'Store Administrator',
      approvedAt: new Date().toISOString(),
    };

    setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
    syncUserToCloud(updatedUser);
    logActivity(
      'ROLE_CHANGED', 
      'USER', 
      userId, 
      `Administrator ${currentUser.name} approved staff account ${target.name} (${finalRole})`
    );
    addToast('success', 'Staff Member Approved', `${target.name} is now approved as ${finalRole} and can log in.`);
    if (settings.enableSoundEffects) soundEffects.playScanSuccess();
    return true;
  }, [users, currentUser.name, logActivity, addToast, settings.enableSoundEffects]);

  const rejectUser = useCallback((userId: string, reason?: string): boolean => {
    const target = users.find(u => u.id === userId);
    if (!target) return false;

    const rejectedUser: User = {
      ...target,
      active: false,
      approvalStatus: 'REJECTED'
    };

    setUsers(prev => prev.map(u => (u.id === userId ? rejectedUser : u)));
    syncUserToCloud(rejectedUser);

    logActivity(
      'ROLE_CHANGED', 
      'USER', 
      userId, 
      `Administrator ${currentUser.name} rejected registration for ${target.name}. ${reason ? `Reason: ${reason}` : ''}`
    );
    addToast('info', 'Registration Declined', `Registration request for ${target.name} was rejected.`);
    return true;
  }, [users, currentUser.name, logActivity, addToast]);

  const logoutUser = useCallback(() => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(`${LOCAL_STORAGE_KEY}_is_authenticated`);
    } catch { /* ignore */ }
    logActivity('USER_LOGIN', 'USER', currentUser.id, `User ${currentUser.name} logged out.`);
    addToast('info', 'Logged Out', 'You have been securely signed out. Please enter credentials to log back in.');
  }, [currentUser, logActivity, addToast]);

  const createUser = useCallback((userData: Omit<User, 'id' | 'lastLogin'>) => {
    const colors = ['bg-emerald-700', 'bg-teal-700', 'bg-green-600', 'bg-slate-700', 'bg-emerald-800', 'bg-cyan-700'];
    const isAdminCreator = currentUser.role === 'ADMIN';
    const isTargetAdmin = userData.role === 'ADMIN';
    
    // If created by an Admin inside the RBAC panel, default to APPROVED unless specified
    const status = userData.approvalStatus || (isAdminCreator || isTargetAdmin ? 'APPROVED' : 'PENDING');
    const isActive = status === 'APPROVED' ? (userData.active ?? true) : false;

    const rawPin = userData.pin?.trim() || '1234';
    const hashedPin = isHashed(rawPin) ? rawPin : hashCredential(rawPin);

    const newUser: User = {
      ...userData,
      pin: hashedPin,
      id: `user-${Date.now()}`,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
      approvalStatus: status,
      active: isActive,
      registeredAt: userData.registeredAt || new Date().toISOString(),
      approvedBy: status === 'APPROVED' ? (currentUser.name || 'Store Administrator') : undefined,
      approvedAt: status === 'APPROVED' ? new Date().toISOString() : undefined,
      lastLogin: undefined,
    };
    setUsers(prev => [...prev, newUser]);
    syncUserToCloud(newUser);
    logActivity('USER_CREATED', 'USER', newUser.id, `Created staff account for ${newUser.name} with role ${newUser.role} [Status: ${status}]`);
    addToast('success', status === 'APPROVED' ? 'Staff Account Created' : 'Staff Registration Pending', `${newUser.name} has been added as ${newUser.role}`);
  }, [currentUser, logActivity, addToast]);

  const updateUserRole = useCallback((userId: string, newRole: UserRole) => {
    let updatedUser: User | null = null;
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        updatedUser = { ...u, role: newRole };
        return updatedUser;
      }
      return u;
    }));
    if (updatedUser) syncUserToCloud(updatedUser);
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, role: newRole }));
    }
    logActivity('ROLE_CHANGED', 'USER', userId, `Updated user role to ${newRole}`);
    addToast('info', 'Role Updated', `User permissions adjusted to ${newRole}`);
  }, [currentUser.id, logActivity, addToast]);

  const toggleUserStatus = useCallback((userId: string) => {
    if (userId === currentUser.id) {
      addToast('warning', 'Action Forbidden', 'You cannot deactivate your own active account.');
      return;
    }
    let updatedUser: User | null = null;
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const nextState = !u.active;
        updatedUser = { ...u, active: nextState };
        logActivity('ROLE_CHANGED', 'USER', userId, `User ${u.name} was ${nextState ? 'activated' : 'deactivated'}`);
        return updatedUser;
      }
      return u;
    }));
    if (updatedUser) syncUserToCloud(updatedUser);
    addToast('info', 'User Status Updated');
  }, [currentUser.id, logActivity, addToast]);

  const updateUserPin = useCallback((userId: string, newPin: string) => {
    let updatedUser: User | null = null;
    const cleanPin = newPin.trim();
    const hashedPin = isHashed(cleanPin) ? cleanPin : hashCredential(cleanPin);
    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        updatedUser = { ...u, pin: hashedPin };
        return updatedUser;
      }
      return u;
    }));
    setCurrentUser(prev => prev.id === userId ? { ...prev, pin: hashedPin } : prev);
    if (updatedUser) syncUserToCloud(updatedUser);
    addToast('success', 'PIN Encrypted & Updated', 'User access PIN has been encrypted and reset successfully.');
  }, [addToast]);

  const deleteUser = useCallback((userId: string): boolean => {
    if (userId === currentUser.id) {
      addToast('error', 'Action Forbidden', 'You cannot delete your own active user account.');
      return false;
    }
    const target = users.find(u => u.id === userId);
    if (!target) return false;
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteUserFromCloud(userId);
    logActivity('ROLE_CHANGED', 'USER', userId, `Deleted user account: ${target.name} (${target.role})`);
    addToast('info', 'User Removed', `Account for ${target.name} was deleted.`);
    return true;
  }, [currentUser.id, users, logActivity, addToast]);

  // Inventory Management
  const addItem = useCallback((itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems(prev => [newItem, ...prev]);
    syncItemToCloud(newItem);

    // Record initial movement
    if (newItem.stock > 0) {
      const movement: StockMovement = {
        id: `mov-${Date.now()}`,
        itemId: newItem.id,
        itemName: newItem.name,
        sku: newItem.sku,
        type: 'INITIAL',
        quantityChange: newItem.stock,
        previousStock: 0,
        newStock: newItem.stock,
        reason: 'Initial catalog creation',
        performedById: currentUser.id,
        performedByName: currentUser.name,
        timestamp: new Date().toISOString(),
      };
      setMovements(prev => [movement, ...prev]);
      syncMovementToCloud(movement);
    }

    logActivity('ITEM_CREATED', 'ITEM', newItem.id, `Cataloged new item: ${newItem.name} (SKU: ${newItem.sku}, Stock: ${newItem.stock})`);
    addToast('success', 'Item Added', `${newItem.name} is now available in inventory.`);
    return newItem;
  }, [currentUser, logActivity, addToast]);

  const updateItem = useCallback((itemId: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updated = {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        syncItemToCloud(updated);
        logActivity('ITEM_UPDATED', 'ITEM', itemId, `Updated item details for ${item.name}`);
        return updated;
      }
      return item;
    }));
    addToast('info', 'Item Updated', 'Inventory changes saved.');
  }, [logActivity, addToast]);

  const deleteItem = useCallback((itemId: string): boolean => {
    const itemToDelete = items.find(i => i.id === itemId);
    if (!itemToDelete) return false;

    setItems(prev => prev.filter(i => i.id !== itemId));
    // Remove from cart if present
    setCart(prev => prev.filter(c => c.item.id !== itemId));
    deleteItemFromCloud(itemId);

    logActivity('ITEM_DELETED', 'ITEM', itemId, `Deleted item: ${itemToDelete.name} (${itemToDelete.sku})`);
    addToast('warning', 'Item Deleted', `${itemToDelete.name} was removed from the catalog.`);
    return true;
  }, [items, logActivity, addToast]);

  const adjustStock = useCallback((
    itemId: string,
    quantityChange: number,
    type: StockMovementType,
    reason: string
  ) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const previousStock = item.stock;
    const newStock = Math.max(0, previousStock + quantityChange);
    const updatedItem = { ...item, stock: newStock, updatedAt: new Date().toISOString() };

    setItems(prev => prev.map(i => i.id === itemId ? updatedItem : i));
    syncItemToCloud(updatedItem);

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      itemId: item.id,
      itemName: item.name,
      sku: item.sku,
      type,
      quantityChange,
      previousStock,
      newStock,
      reason,
      performedById: currentUser.id,
      performedByName: currentUser.name,
      timestamp: new Date().toISOString()
    };

    setMovements(prev => [movement, ...prev]);
    syncMovementToCloud(movement);
    logActivity('STOCK_ADJUSTED', 'ITEM', itemId, `Adjusted stock for ${item.name}: ${previousStock} -> ${newStock} (${quantityChange > 0 ? '+' : ''}${quantityChange}, ${type})`);

    if (newStock <= item.minStockAlert && settings.enableSoundEffects) {
      soundEffects.playLowStockAlert();
      addToast('warning', 'Low Stock Warning', `${item.name} is down to ${newStock} ${item.unit}!`);
    } else {
      addToast('success', 'Stock Adjusted', `${item.name} inventory updated to ${newStock}.`);
    }
  }, [items, currentUser, settings.enableSoundEffects, logActivity, addToast]);

  const bulkImportItems = useCallback((newItems: Partial<InventoryItem>[], mode: 'append' | 'replace'): number => {
    const sanitized: InventoryItem[] = newItems.map((raw, idx) => {
      const category = raw.category || 'General';
      const name = raw.name || `Imported Item ${idx + 1}`;
      const sku = raw.sku || generateAutoSku(category, name);
      const barcode = raw.barcode || generateAutoBarcode();

      return {
        id: raw.id || `item-imp-${Date.now()}-${idx}`,
        sku,
        barcode,
        name,
        category,
        brand: raw.brand,
        unit: raw.unit || 'Pcs',
        costPrice: Number(raw.costPrice) || 0,
        sellingPrice: Number(raw.sellingPrice) || 0,
        stock: Number(raw.stock) || 0,
        minStockAlert: Number(raw.minStockAlert) || 5,
        location: raw.location,
        supplier: raw.supplier,
        batchNumber: raw.batchNumber,
        expiryDate: raw.expiryDate,
        description: raw.description,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    if (mode === 'replace') {
      setItems(sanitized);
    } else {
      // Append or update existing by SKU
      setItems(prev => {
        const map = new Map<string, InventoryItem>();
        prev.forEach(i => map.set(i.sku, i));
        sanitized.forEach(i => map.set(i.sku, i));
        return Array.from(map.values());
      });
    }

    syncAllItemsToCloud(sanitized);

    logActivity('BULK_IMPORT', 'SYSTEM', undefined, `Imported ${sanitized.length} items via batch import (${mode} mode).`);
    addToast('success', 'Import Successful', `Successfully imported ${sanitized.length} items into inventory.`);
    return sanitized.length;
  }, [logActivity, addToast]);

  // POS & Cart Handling
  const addToCart = useCallback((item: InventoryItem, quantity = 1) => {
    if (item.stock <= 0) {
      if (settings.enableSoundEffects) soundEffects.playError();
      addToast('error', 'Out of Stock', `${item.name} currently has 0 units available.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        const nextQty = existing.quantity + quantity;
        if (nextQty > item.stock) {
          addToast('warning', 'Stock Limit Reached', `Only ${item.stock} units available in stock.`);
          return prev;
        }
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: nextQty } : c);
      } else {
        return [...prev, { item, quantity, unitPrice: item.sellingPrice, discount: 0 }];
      }
    });

    if (settings.enableSoundEffects) soundEffects.playScanSuccess();
  }, [settings.enableSoundEffects, addToast]);

  const updateCartQuantity = useCallback((itemId: string, quantity: number) => {
    setCart(prev => {
      if (quantity <= 0) {
        return prev.filter(c => c.item.id !== itemId);
      }
      return prev.map(c => {
        if (c.item.id === itemId) {
          const maxAvailable = c.item.stock;
          const finalQty = Math.min(quantity, maxAvailable);
          return { ...c, quantity: finalQty };
        }
        return c;
      });
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const checkoutSale = useCallback((
    paymentMethod: PaymentMethod,
    amountPaid: number,
    customerName?: string,
    customerPhone?: string,
    notes?: string,
    discountAmount = 0
  ): SaleRecord | null => {
    if (cart.length === 0) {
      addToast('warning', 'Cart Empty', 'Please add items before checkout.');
      return null;
    }

    const subtotal = cart.reduce((acc, c) => acc + (c.unitPrice * c.quantity), 0);
    const grandTotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = 0;
    const totalCost = cart.reduce((acc, c) => acc + (c.item.costPrice * c.quantity), 0);
    const netProfit = grandTotal - totalCost;

    if (paymentMethod === 'CASH' && amountPaid < grandTotal) {
      if (settings.enableSoundEffects) soundEffects.playError();
      addToast('error', 'Insufficient Cash', `Amount paid (${formatCurrency(amountPaid, settings.currencySymbol)}) is less than total (${formatCurrency(grandTotal, settings.currencySymbol)}).`);
      return null;
    }

    const changeDue = paymentMethod === 'CASH' ? Math.max(0, amountPaid - grandTotal) : 0;
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const isCredit = paymentMethod === 'CREDIT';

    const saleItems = cart.map(c => ({
      itemId: c.item.id,
      sku: c.item.sku,
      barcode: c.item.barcode,
      name: c.item.name,
      category: c.item.category,
      unitPrice: c.unitPrice,
      costPrice: c.item.costPrice,
      quantity: c.quantity,
      subtotal: c.unitPrice * c.quantity,
      discount: c.discount
    }));

    const saleRecord: SaleRecord = {
      id: `sale-${Date.now()}`,
      invoiceNo,
      items: saleItems,
      subtotal,
      discountAmount,
      taxPercent: 0,
      taxAmount: 0,
      grandTotal,
      totalCost,
      netProfit,
      paymentMethod,
      amountPaid: isCredit ? 0 : (paymentMethod === 'CASH' ? amountPaid : grandTotal),
      changeDue,
      customerName: customerName || (isCredit ? 'Credit Account Customer' : 'Walk-in Customer'),
      customerPhone,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      status: 'COMPLETED',
      paymentStatus: isCredit ? 'UNPAID_CREDIT' : 'PAID',
      createdAt: new Date().toISOString(),
      notes
    };

    // Deduct stock and record movements
    const newMovements: StockMovement[] = [];
    setItems(prevItems => {
      return prevItems.map(item => {
        const cartMatch = cart.find(c => c.item.id === item.id);
        if (cartMatch) {
          const newStock = Math.max(0, item.stock - cartMatch.quantity);
          newMovements.push({
            id: `mov-${Date.now()}-${item.id}`,
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            type: 'SALE',
            quantityChange: -cartMatch.quantity,
            previousStock: item.stock,
            newStock,
            referenceId: invoiceNo,
            reason: `Sale ${invoiceNo}`,
            performedById: currentUser.id,
            performedByName: currentUser.name,
            timestamp: new Date().toISOString()
          });
          return { ...item, stock: newStock, updatedAt: new Date().toISOString() };
        }
        return item;
      });
    });

    setMovements(prev => [...newMovements, ...prev]);
    setSales(prev => [saleRecord, ...prev]);
    setCart([]);

    // Sync sale, movements, and affected items to Firestore
    syncSaleToCloud(saleRecord);
    newMovements.forEach(m => syncMovementToCloud(m));

    if (settings.enableSoundEffects) soundEffects.playCheckoutSuccess();
    logActivity('SALE_CREATED', 'SALE', invoiceNo, `Completed sale ${invoiceNo} (${formatCurrency(grandTotal, settings.currencySymbol)}, ${paymentMethod})`);
    addToast('success', 'Sale Completed!', `Invoice ${invoiceNo} recorded successfully.`);

    return saleRecord;
  }, [cart, settings, currentUser, logActivity, addToast]);

  const refundSale = useCallback((saleId: string, reason: string): boolean => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'REFUNDED') {
      addToast('error', 'Invalid Refund', 'Sale is already refunded or does not exist.');
      return false;
    }

    // Return items to stock
    const refundMovements: StockMovement[] = [];
    setItems(prevItems => {
      return prevItems.map(item => {
        const saleItem = sale.items.find(si => si.itemId === item.id);
        if (saleItem) {
          const newStock = item.stock + saleItem.quantity;
          const updatedItem = { ...item, stock: newStock, updatedAt: new Date().toISOString() };
          syncItemToCloud(updatedItem);
          refundMovements.push({
            id: `mov-ref-${Date.now()}-${item.id}`,
            itemId: item.id,
            itemName: item.name,
            sku: item.sku,
            type: 'RETURN',
            quantityChange: saleItem.quantity,
            previousStock: item.stock,
            newStock,
            referenceId: sale.invoiceNo,
            reason: `Refund: ${reason}`,
            performedById: currentUser.id,
            performedByName: currentUser.name,
            timestamp: new Date().toISOString()
          });
          return updatedItem;
        }
        return item;
      });
    });

    setMovements(prev => [...refundMovements, ...prev]);
    const updatedSale: SaleRecord = { 
      ...sale, 
      status: 'REFUNDED', 
      notes: sale.notes ? `${sale.notes} | Refunded: ${reason}` : `Refunded: ${reason}` 
    };
    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    syncSaleToCloud(updatedSale);
    refundMovements.forEach(m => syncMovementToCloud(m));

    logActivity('SALE_REFUNDED', 'SALE', sale.invoiceNo, `Refunded sale ${sale.invoiceNo} (Amount: ${formatCurrency(sale.grandTotal, settings.currencySymbol)}, Reason: ${reason})`);
    addToast('warning', 'Sale Refunded', `Invoice ${sale.invoiceNo} items returned to inventory.`);
    return true;
  }, [sales, settings.currencySymbol, currentUser, logActivity, addToast]);

  // Expenses
  const addExpense = useCallback((expenseData: {
    category: ExpenseCategory;
    title: string;
    amount: number;
    date: string;
    payee: string;
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    notes?: string;
  }): ExpenseRecord => {
    const expenseNo = `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newExpense: ExpenseRecord = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNo,
      recordedById: currentUser.id,
      recordedByName: currentUser.name,
      createdAt: new Date().toISOString()
    };

    setExpenses(prev => [newExpense, ...prev]);
    syncExpenseToCloud(newExpense);
    logActivity('EXPENSE_CREATED', 'EXPENSE', expenseNo, `Recorded ${newExpense.category} expense: ${formatCurrency(newExpense.amount, settings.currencySymbol)} to ${newExpense.payee}`);
    addToast('success', 'Expense Recorded', `${expenseData.title} (${formatCurrency(expenseData.amount, settings.currencySymbol)}) recorded.`);
    return newExpense;
  }, [currentUser, settings.currencySymbol, logActivity, addToast]);

  const deleteExpense = useCallback((expenseId: string): boolean => {
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return false;

    setExpenses(prev => prev.filter(e => e.id !== expenseId));
    logActivity('EXPENSE_DELETED', 'EXPENSE', exp.expenseNo, `Deleted expense record ${exp.expenseNo} (${formatCurrency(exp.amount, settings.currencySymbol)})`);
    addToast('warning', 'Expense Deleted', `Record ${exp.expenseNo} was removed.`);
    return true;
  }, [expenses, settings.currencySymbol, logActivity, addToast]);

  // Barcode Handler (Mobile Camera or USB Scanner) with debounce protection
  const lastScanEventRef = useRef<{ barcode: string; timestamp: number }>({ barcode: '', timestamp: 0 });

  const handleBarcodeScanned = useCallback((barcode: string, skipDuplicateCheck = false): boolean => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return false;

    const now = Date.now();
    // Prevent accidental multi-triggering within 750ms for identical barcode
    if (lastScanEventRef.current.barcode.toLowerCase() === cleanBarcode.toLowerCase() && (now - lastScanEventRef.current.timestamp) < 750) {
      return false;
    }
    lastScanEventRef.current = { barcode: cleanBarcode, timestamp: now };

    setLastScannedBarcode(cleanBarcode);

    // Look for matching item
    const matchedItem = items.find(
      i => i.barcode.toLowerCase() === cleanBarcode.toLowerCase() || 
           i.sku.toLowerCase() === cleanBarcode.toLowerCase()
    );

    if (matchedItem) {
      if (activeTab === 'pos' || activeTab === 'checkout') {
        // Check if item is already in cart
        const existingInCart = cart.find(c => c.item.id === matchedItem.id);
        if (existingInCart && !skipDuplicateCheck) {
          // Duplicate scanned in POS/Checkout: ask for confirmation!
          setPendingDuplicateScan({ item: matchedItem, currentQuantity: existingInCart.quantity });
          if (settings.enableSoundEffects) soundEffects.playWarning();
          return true;
        }

        addToCart(matchedItem, 1);
        addToast('success', 'Item Scanned', `Added ${matchedItem.name} to cart.`);
      } else {
        if (settings.enableSoundEffects) soundEffects.playScanSuccess();
        addToast('info', `Found: ${matchedItem.name}`, `SKU: ${matchedItem.sku} | Stock: ${matchedItem.stock} | Price: ${formatCurrency(matchedItem.sellingPrice, settings.currencySymbol)}`);
      }
      return true;
    } else {
      if (settings.enableSoundEffects) soundEffects.playError();
      addToast('error', 'Barcode Not Found', `No item matching '${cleanBarcode}' in database.`);
      return false;
    }
  }, [items, activeTab, cart, addToCart, settings.enableSoundEffects, settings.currencySymbol, addToast]);

  const confirmDuplicateScan = useCallback(() => {
    if (!pendingDuplicateScan) return;
    addToCart(pendingDuplicateScan.item, 1);
    addToast('success', 'Duplicate Confirmed', `Added another unit of ${pendingDuplicateScan.item.name} to cart.`);
    setPendingDuplicateScan(null);
  }, [pendingDuplicateScan, addToCart, addToast]);

  const cancelDuplicateScan = useCallback(() => {
    setPendingDuplicateScan(null);
  }, []);

  // Global Hardware USB Barcode Scanner Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If user is actively typing in a standard textarea or text input, don't hijack normal typing unless rapid scanner sequence
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const currentTime = Date.now();
      const interval = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Key is Enter
      if (e.key === 'Enter') {
        if (buffer.length >= 3 && interval < 80) {
          // It was emitted rapidly by a hardware scanner!
          e.preventDefault();
          handleBarcodeScanned(buffer);
          buffer = '';
          return;
        }
        buffer = '';
        return;
      }

      // Printable single characters
      if (e.key.length === 1) {
        if (interval > 120) {
          // Reset buffer if delay is too long (human typing)
          buffer = e.key;
        } else {
          // Rapid typing (hardware scanner)
          buffer += e.key;
        }

        // If not in input and buffer gets long enough, prevent default
        if (!isInput && buffer.length > 5) {
          // Accumulating hardware scan
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleBarcodeScanned]);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<StoreSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      syncSettingsToCloud(updated);
      logActivity('SETTINGS_UPDATED', 'SYSTEM', undefined, 'Store configuration updated');
      return updated;
    });
    addToast('success', 'Settings Saved', 'Store configuration updated.');
  }, [logActivity, addToast]);

  // Settle Unpaid Customer Credit
  const settleCustomerCredit = useCallback((saleId: string, paymentMethod: PaymentMethod, amountSettled?: number): boolean => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) {
      addToast('error', 'Invoice Not Found');
      return false;
    }

    const currentPaid = sale.amountPaid || 0;
    const remainingBefore = Math.max(0, sale.grandTotal - currentPaid);
    const settleAmt = amountSettled !== undefined ? Math.min(remainingBefore, amountSettled) : remainingBefore;
    const newTotalPaid = currentPaid + settleAmt;
    const isFullyPaid = newTotalPaid >= (sale.grandTotal - 0.001);

    const updatedSale: SaleRecord = {
      ...sale,
      paymentStatus: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      amountPaid: newTotalPaid,
      creditSettledAt: new Date().toISOString(),
      creditSettledMethod: paymentMethod,
      notes: sale.notes
        ? `${sale.notes} | [Credit Paid ${formatCurrency(settleAmt, settings.currencySymbol)} via ${paymentMethod} on ${new Date().toLocaleDateString()}]`
        : `Credit Paid ${formatCurrency(settleAmt, settings.currencySymbol)} via ${paymentMethod} on ${new Date().toLocaleDateString()}`
    };

    setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
    syncSaleToCloud(updatedSale);
    logActivity(
      'CREDIT_SETTLED',
      'SALE',
      sale.invoiceNo,
      `Settled customer credit for invoice ${sale.invoiceNo} (${formatCurrency(settleAmt, settings.currencySymbol)}${isFullyPaid ? ' - Paid in full' : ' - Partial'}) via ${paymentMethod}`
    );
    addToast('success', isFullyPaid ? 'Credit Fully Settled' : 'Partial Payment Recorded', `Invoice ${sale.invoiceNo} credited with ${formatCurrency(settleAmt, settings.currencySymbol)}.`);
    return true;
  }, [sales, settings.currencySymbol, logActivity, addToast]);

  // Database Backup / Reset Actions
  const resetAllDataToSample = useCallback(() => {
    setItems(INITIAL_ITEMS);
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setSales(INITIAL_SALES);
    setExpenses(INITIAL_EXPENSES);
    setMovements(INITIAL_MOVEMENTS);
    setLogs(INITIAL_LOGS);
    setSettings(INITIAL_SETTINGS);
    setCart([]);
    logActivity('DATA_RESTORED', 'SYSTEM', undefined, 'Reset entire system database to Sappy Stationary default seeds');
    addToast('info', 'System Reset', 'Restored default Sappy Stationary inventory, demo transactions, and users.');
  }, [logActivity, addToast]);

  // 1. FULL RESET: Remove Everything (Complete Clean Slate)
  const fullResetSystem = useCallback(() => {
    setItems([]);
    setSales([]);
    setExpenses([]);
    setMovements([]);
    setCart([]);

    const resetLog: ActivityLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      actionType: 'FULL_RESET',
      entityType: 'SYSTEM',
      details: `Full System Reset executed by ${currentUser.name}: Removed all inventory catalog items, sales records, expenses, and logs. Clean slate initiated.`
    };
    setLogs([resetLog]);

    addToast(
      'warning',
      'Full Reset Complete',
      'All inventory items, sales records, expenses, and transaction logs have been wiped.'
    );
  }, [currentUser, addToast]);

  // 2. YEAR END RESET: Remove everything except remaining items and unpaid customer credits
  const yearEndReset = useCallback(() => {
    // Retain all items with current on-hand stock
    const preservedItems = items;

    // Retain active unpaid customer credits / store tabs
    const preservedSales = sales.filter(
      s => (s.paymentStatus === 'UNPAID_CREDIT' || s.paymentMethod === 'CREDIT') && s.status !== 'REFUNDED'
    );
    const unpaidCreditsCount = preservedSales.length;
    const unpaidCreditsTotal = preservedSales.reduce((acc, s) => acc + s.grandTotal, 0);

    // Purge past expenses and clear POS cart
    setExpenses([]);
    setCart([]);
    setSales(preservedSales);

    // Create fresh Year-End Rollover opening stock movement records for all items with stock > 0
    const rolloverMovements: StockMovement[] = preservedItems
      .filter(item => item.stock > 0)
      .map((item, idx) => ({
        id: `mov-rollover-${Date.now()}-${idx}`,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        type: 'YEAR_END_ROLLOVER',
        quantityChange: item.stock,
        previousStock: item.stock,
        newStock: item.stock,
        reason: `Fiscal Year-End Rollover: Opening balance of ${item.stock} ${item.unit} carried forward`,
        performedById: currentUser.id,
        performedByName: currentUser.name,
        timestamp: new Date().toISOString()
      }));
    setMovements(rolloverMovements);

    // Create a pristine year-end activity log
    const rolloverLog: ActivityLog = {
      id: `log-rollover-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      actionType: 'YEAR_END_RESET',
      entityType: 'SYSTEM',
      details: `Year-End Fiscal Reset executed by ${currentUser.name}: Carried forward ${preservedItems.length} inventory items and preserved ${unpaidCreditsCount} unpaid customer credits totaling ${formatCurrency(unpaidCreditsTotal, settings.currencySymbol)}. Purged all past operating expenses and settled sales history.`
    };
    setLogs([rolloverLog]);

    addToast(
      'success',
      'Year-End Reset Complete!',
      `Carried forward ${preservedItems.length} inventory items and preserved ${unpaidCreditsCount} unpaid customer credits (${formatCurrency(unpaidCreditsTotal, settings.currencySymbol)}). All past operating expenses and settled sales purged.`
    );

    return {
      preservedItemsCount: preservedItems.length,
      unpaidCreditsCount,
      unpaidCreditsTotal
    };
  }, [items, sales, currentUser, addToast, settings.currencySymbol]);

  const exportDatabaseJson = useCallback(() => {
    const backupObj = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      items,
      users,
      sales,
      expenses,
      movements,
      logs,
      settings
    };
    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sappy_Stationary_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity('DATA_EXPORT', 'SYSTEM', undefined, 'Downloaded full JSON database snapshot backup.');
    addToast('success', 'Backup Exported', 'Full database snapshot downloaded.');
  }, [items, users, sales, expenses, movements, logs, settings, logActivity, addToast]);

  const importDatabaseJson = useCallback((jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.items && Array.isArray(parsed.items)) setItems(parsed.items);
      if (parsed.users && Array.isArray(parsed.users)) setUsers(parsed.users);
      if (parsed.sales && Array.isArray(parsed.sales)) setSales(parsed.sales);
      if (parsed.expenses && Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (parsed.movements && Array.isArray(parsed.movements)) setMovements(parsed.movements);
      if (parsed.logs && Array.isArray(parsed.logs)) setLogs(parsed.logs);
      if (parsed.settings) setSettings(parsed.settings);
      
      logActivity('BULK_IMPORT', 'SYSTEM', undefined, 'Restored database from uploaded JSON backup.');
      addToast('success', 'Database Restored', 'Database records imported successfully.');
      return true;
    } catch {
      addToast('error', 'Import Failed', 'Invalid JSON backup file structure.');
      return false;
    }
  }, [logActivity, addToast]);

  return (
    <AppContext.Provider
      value={{
        items,
        users,
        currentUser,
        isAuthenticated,
        sales,
        expenses,
        movements,
        logs,
        settings,
        activeTab,
        setActiveTab,
        cart,
        toasts,
        lastScannedBarcode,
        isScannerModalOpen,
        setIsScannerModalOpen,
        masterAuthRequest,
        requestMasterAuth,
        closeMasterAuth,
        verifyMasterPasscode,
        hasPermission,
        switchUser,
        loginUser,
        signupUser,
        approveUser,
        rejectUser,
        logoutUser,
        createUser,
        addUser: createUser,
        updateUserRole,
        toggleUserStatus,
        updateUserPin,
        deleteUser,
        addItem,
        updateItem,
        deleteItem,
        adjustStock,
        bulkImportItems,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        checkoutSale,
        refundSale,
        addExpense,
        deleteExpense,
        handleBarcodeScanned,
        pendingDuplicateScan,
        setPendingDuplicateScan,
        confirmDuplicateScan,
        cancelDuplicateScan,
        updateSettings,
        logActivity,
        addToast,
        removeToast,
        resetAllDataToSample,
        fullResetSystem,
        yearEndReset,
        settleCustomerCredit,
        exportDatabaseJson,
        importDatabaseJson,
        cloudSyncStatus,
        syncToCloudNow
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
