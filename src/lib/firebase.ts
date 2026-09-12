import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import appletConfig from '../../firebase-applet-config.json';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'AIzaSyCxo-AhTp7ut7Aic9RoNn44zhEA-HEKVNk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'alert-imagery-zcbh2.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'alert-imagery-zcbh2',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'alert-imagery-zcbh2.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '448152244711',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || '1:448152244711:web:30b623934f482579206d42',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || 'ai-studio-sappystationaryp-324ce6ca-1220-49d7-a002-75feb310e41d',
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

try {
  appInstance = getApps().length === 0 ? initializeApp(config) : getApp();
  dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
    ? getFirestore(appInstance, config.firestoreDatabaseId)
    : getFirestore(appInstance);
  authInstance = getAuth(appInstance);
} catch (err) {
  console.warn('Firebase initialization error:', err);
}

export const app = appInstance;
export const db = dbInstance;
export const auth = authInstance;
export const FIRESTORE_DATABASE_ID = config.firestoreDatabaseId;
export const FIREBASE_PROJECT_ID = config.projectId;

