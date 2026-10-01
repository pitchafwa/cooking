import { signal } from '@preact/signals';
import { firebaseConfig } from './firebaseConfig';
import { connect } from './sync-core';

export type SyncMode = 'off' | 'loading' | 'signedOut' | 'syncing' | 'synced' | 'offline' | 'denied' | 'error';
export const syncState = signal<{ mode: SyncMode; email?: string; message?: string }>({ mode: firebaseConfig ? 'loading' : 'off' });

type Auth = import('firebase/auth').Auth;
let fbAuth: typeof import('firebase/auth') | null = null;
let auth: Auth | null = null;
let stop: (() => void) | null = null;

const set = (mode: SyncMode, extra: { email?: string; message?: string } = {}) => (syncState.value = { mode, ...extra });

/** Loads Firebase lazily (only when configured) so the app stays light otherwise. */
export async function initSync() {
  if (!firebaseConfig) return;
  try {
    const [app, a, fs, adapterMod] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore'), import('./sync-firebase'),
    ]);
    fbAuth = a;
    const fbApp = app.initializeApp(firebaseConfig);
    auth = a.getAuth(fbApp);
    const db = fs.initializeFirestore(fbApp, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });

    const updateOnline = () => {
      const cur = syncState.value;
      if (!navigator.onLine && cur.mode === 'synced') set('offline', { email: cur.email });
      if (navigator.onLine && cur.mode === 'offline') set('synced', { email: cur.email });
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    a.onAuthStateChanged(auth, (user) => {
      stop?.(); stop = null;
      if (!user) return set('signedOut');
      const email = user.email ?? undefined;
      set('syncing', { email });
      stop = connect(adapterMod.firestoreAdapter(fs, db), {
        onSynced: () => set(navigator.onLine ? 'synced' : 'offline', { email }),
        onError: (e) => {
          const code = (e as { code?: string })?.code;
          if (code === 'permission-denied') set('denied', { email });
          else set('error', { email, message: (e as Error)?.message });
        },
      });
    });
  } catch (e) {
    set('error', { message: (e as Error)?.message });
  }
}

export async function signIn() {
  if (!fbAuth || !auth) return;
  try {
    await fbAuth.signInWithPopup(auth, new fbAuth.GoogleAuthProvider());
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') set('error', { message: (e as Error)?.message });
  }
}

export async function signOutUser() {
  if (fbAuth && auth) await fbAuth.signOut(auth);
}
