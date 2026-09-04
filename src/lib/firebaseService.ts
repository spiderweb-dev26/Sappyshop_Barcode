import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  onSnapshot, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  InventoryItem, 
  User, 
  SaleRecord, 
  ExpenseRecord, 
  StockMovement, 
  ActivityLog, 
  StoreSettings 
} from '../types';

/**
 * Remove undefined values to prevent Firestore serialization errors
 */
export function cleanFirestoreData<T extends Record<string, unknown>>(obj: T): T {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanFirestoreData(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item => 
        item !== null && typeof item === 'object' && !(item instanceof Date)
          ? cleanFirestoreData(item as Record<string, unknown>)
          : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

// Collections references
export const COLLECTIONS = {
  ITEMS: 'items',
  SALES: 'sales',
  USERS: 'users',
  EXPENSES: 'expenses',
  MOVEMENTS: 'movements',
  LOGS: 'logs',
  SETTINGS: 'settings'
} as const;

// Items
export async function syncItemToCloud(item: InventoryItem): Promise<void> {
  try {
    const itemRef = doc(db, COLLECTIONS.ITEMS, item.id);
    await setDoc(itemRef, cleanFirestoreData(item as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save item', item.id, error);
  }
}

export async function deleteItemFromCloud(itemId: string): Promise<void> {
  try {
    const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.warn('Firestore: failed to delete item', itemId, error);
  }
}

export async function syncAllItemsToCloud(items: InventoryItem[]): Promise<void> {
  try {
    const chunks = [];
    for (let i = 0; i < items.length; i += 400) {
      chunks.push(items.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const item of chunk) {
        const itemRef = doc(db, COLLECTIONS.ITEMS, item.id);
        batch.set(itemRef, cleanFirestoreData(item as unknown as Record<string, unknown>), { merge: true });
      }
      await batch.commit();
    }
  } catch (error) {
    console.warn('Firestore: failed batch sync of items', error);
  }
}

// Sales
export async function syncSaleToCloud(sale: SaleRecord): Promise<void> {
  try {
    const saleRef = doc(db, COLLECTIONS.SALES, sale.id);
    await setDoc(saleRef, cleanFirestoreData(sale as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save sale', sale.id, error);
  }
}

// Expenses
export async function syncExpenseToCloud(expense: ExpenseRecord): Promise<void> {
  try {
    const expRef = doc(db, COLLECTIONS.EXPENSES, expense.id);
    await setDoc(expRef, cleanFirestoreData(expense as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save expense', expense.id, error);
  }
}

// Movements
export async function syncMovementToCloud(movement: StockMovement): Promise<void> {
  try {
    const movRef = doc(db, COLLECTIONS.MOVEMENTS, movement.id);
    await setDoc(movRef, cleanFirestoreData(movement as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save movement', movement.id, error);
  }
}

// Activity Logs
export async function syncLogToCloud(logItem: ActivityLog): Promise<void> {
  try {
    const logRef = doc(db, COLLECTIONS.LOGS, logItem.id);
    await setDoc(logRef, cleanFirestoreData(logItem as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save log', logItem.id, error);
  }
}

// Users
export async function syncUserToCloud(user: User): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    await setDoc(userRef, cleanFirestoreData(user as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save user', user.id, error);
  }
}

export async function deleteUserFromCloud(userId: string): Promise<void> {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.warn('Firestore: failed to delete user', userId, error);
  }
}

// Store Settings
export async function syncSettingsToCloud(settings: StoreSettings): Promise<void> {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'store_config');
    await setDoc(settingsRef, cleanFirestoreData(settings as unknown as Record<string, unknown>), { merge: true });
  } catch (error) {
    console.warn('Firestore: failed to save settings', error);
  }
}

// Initial fetch to check if database is empty or has records
export async function fetchCloudData(): Promise<{
  items: InventoryItem[];
  sales: SaleRecord[];
  users: User[];
  expenses: ExpenseRecord[];
  movements: StockMovement[];
  logs: ActivityLog[];
  settings: StoreSettings | null;
} | null> {
  try {
    const itemsSnap = await getDocs(collection(db, COLLECTIONS.ITEMS));
    const items = itemsSnap.docs.map(d => d.data() as InventoryItem);

    const salesSnap = await getDocs(collection(db, COLLECTIONS.SALES));
    const sales = salesSnap.docs.map(d => d.data() as SaleRecord);

    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    const users = usersSnap.docs.map(d => d.data() as User);

    const expensesSnap = await getDocs(collection(db, COLLECTIONS.EXPENSES));
    const expenses = expensesSnap.docs.map(d => d.data() as ExpenseRecord);

    const movSnap = await getDocs(collection(db, COLLECTIONS.MOVEMENTS));
    const movements = movSnap.docs.map(d => d.data() as StockMovement);

    const logsSnap = await getDocs(query(collection(db, COLLECTIONS.LOGS), limit(200)));
    const logs = logsSnap.docs.map(d => d.data() as ActivityLog);

    const settingsSnap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'store_config'));
    const settings = settingsSnap.exists() ? (settingsSnap.data() as StoreSettings) : null;

    return {
      items,
      sales,
      users,
      expenses,
      movements,
      logs,
      settings
    };
  } catch (error) {
    console.warn('Firestore: failed to fetch cloud data', error);
    return null;
  }
}

// Listeners for live sync across terminals
export function subscribeToLiveCloudItems(onUpdate: (items: InventoryItem[]) => void): () => void {
  try {
    return onSnapshot(collection(db, COLLECTIONS.ITEMS), (snapshot) => {
      const items = snapshot.docs.map(d => d.data() as InventoryItem);
      if (items.length > 0) {
        onUpdate(items);
      }
    }, (err) => {
      console.warn('Firestore onSnapshot items error:', err);
    });
  } catch {
    return () => {};
  }
}

export function subscribeToLiveCloudSales(onUpdate: (sales: SaleRecord[]) => void): () => void {
  try {
    return onSnapshot(collection(db, COLLECTIONS.SALES), (snapshot) => {
      const sales = snapshot.docs.map(d => d.data() as SaleRecord);
      if (sales.length > 0) {
        onUpdate(sales);
      }
    }, (err) => {
      console.warn('Firestore onSnapshot sales error:', err);
    });
  } catch {
    return () => {};
  }
}

export function subscribeToLiveCloudUsers(onUpdate: (users: User[]) => void): () => void {
  try {
    return onSnapshot(collection(db, COLLECTIONS.USERS), (snapshot) => {
      const users = snapshot.docs.map(d => d.data() as User);
      if (users.length > 0) {
        onUpdate(users);
      }
    }, (err) => {
      console.warn('Firestore onSnapshot users error:', err);
    });
  } catch {
    return () => {};
  }
}
