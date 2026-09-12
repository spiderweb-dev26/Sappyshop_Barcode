import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Safely load local file if present in workspace without failing when absent on GitHub
const localConfigModules = import.meta.glob<{ default: Record<string, string> }>('/firebase-applet-config.json', { eager: true });
const fileConfig = localConfigModules['/firebase-applet-config.json']?.default || {};

const hasConfigFile = Boolean(fileConfig && Object.keys(fileConfig).length > 0 && fileConfig.apiKey);
const hasEnvConfig = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID);
const isFirebaseConfigured = hasConfigFile || hasEnvConfig;

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fileConfig.appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || fileConfig.firestoreDatabaseId || '',
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured && config.apiKey && config.projectId) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(appInstance, config.firestoreDatabaseId)
      : getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const FIRESTORE_DATABASE_ID = config.firestoreDatabaseId;
export const FIREBASE_PROJECT_ID = config.projectId;

