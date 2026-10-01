/**
 * Firebase web config for sync (see docs/SETUP-FIREBASE.md).
 * These values identify the project; they are not secrets. Access is controlled by the Firestore rules.
 * Set to `null` and the app works on one device only.
 */
export const firebaseConfig: {
  apiKey: string; authDomain: string; projectId: string; storageBucket?: string; messagingSenderId?: string; appId: string;
} | null = {
  apiKey: 'AIzaSyCA3ABiYy-xTZARP7DiiuESAz3K-LKgQ1U',
  authDomain: 'cooking-4f3e4.firebaseapp.com',
  projectId: 'cooking-4f3e4',
  storageBucket: 'cooking-4f3e4.firebasestorage.app',
  messagingSenderId: '357868772727',
  appId: '1:357868772727:web:6fd3b8a2e8850a946f1572',
};
