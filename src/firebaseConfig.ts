/**
 * Paste your Firebase web config here to turn on sync (see docs/SETUP-FIREBASE.md).
 * These values identify your project; they are not secrets. Access is controlled by the Firestore rules.
 * Leave as `null` and the app works on one device only.
 */
export const firebaseConfig: {
  apiKey: string; authDomain: string; projectId: string; storageBucket?: string; messagingSenderId?: string; appId: string;
} | null = null;
