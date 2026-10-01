import { syncState, signIn, signOutUser } from '../sync';

const DOCS = 'https://github.com/pitchafwa/cooking/blob/claude/upbeat-goodall-ef6uc3/docs/SETUP-FIREBASE.md';

export function SyncPage() {
  const { mode, email, message } = syncState.value;
  return (
    <section class="pantry">
      <p class="eyebrow">Together</p>
      <h1>Sync</h1>
      {mode === 'off' && (
        <>
          <p class="sub">Sync isn't set up yet, so your pantry, grocery list and favorites live on this device only.</p>
          <p>Turning it on takes about ten minutes and is free. <a href={DOCS} target="_blank" rel="noopener">Follow the setup guide</a>, then your changes appear on both phones as you make them.</p>
        </>
      )}
      {(mode === 'loading' || mode === 'syncing') && <p class="sub">Connecting…</p>}
      {mode === 'signedOut' && (
        <>
          <p class="sub">Sign in with Google to share your pantry, grocery list and favorites between your devices.</p>
          <button class="btn" onClick={signIn}>Sign in with Google</button>
          <p class="hint">Whatever is on this device now gets merged into the shared kitchen the first time you sign in.</p>
        </>
      )}
      {(mode === 'synced' || mode === 'offline') && (
        <>
          <p class="sub">{mode === 'synced' ? 'Synced' : 'Offline. Changes are saved here and will sync when you reconnect'}{email ? ` as ${email}` : ''}.</p>
          <p class="hint">Pantry, grocery list, favorites and “use soon” flags are shared. Changes show up on the other device within a moment.</p>
          <button class="btn ghost" onClick={signOutUser}>Sign out</button>
        </>
      )}
      {mode === 'denied' && (
        <>
          <p class="sub">{email} isn't on the allowed list for this kitchen.</p>
          <p class="hint">Sign in with one of the two Google accounts listed in your Firestore rules, or add this one there.</p>
          <button class="btn ghost" onClick={signOutUser}>Sign out</button>
        </>
      )}
      {mode === 'error' && (
        <>
          <p class="sub">Something went wrong with sync.</p>
          {message && <p class="hint">{message}</p>}
          <button class="btn ghost" onClick={signIn}>Try signing in again</button>
        </>
      )}
    </section>
  );
}
