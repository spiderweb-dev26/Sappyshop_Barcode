export interface FirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export const defaultFirebaseConfig: FirebaseConfig = {
  projectId: "alert-imagery-zcbh2",
  appId: "1:448152244711:web:30b623934f482579206d42",
  apiKey: "AIzaSyCxo-AhTp7ut7Aic9RoNn44zhEA-HEKVNk",
  authDomain: "alert-imagery-zcbh2.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sappystationaryp-324ce6ca-1220-49d7-a002-75feb310e41d",
  storageBucket: "alert-imagery-zcbh2.firebasestorage.app",
  messagingSenderId: "448152244711",
  measurementId: "",
  oAuthClientId: "448152244711-co3i8ttu4rfqi2p2ib0sfo7k0ohgs3ht.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};
