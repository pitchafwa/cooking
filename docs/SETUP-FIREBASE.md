# Turn on sync (about 10 minutes, free)

This shares your pantry, grocery list, favorites and "use soon" flags between your phones and laptops.
Without it the app still works, but each device keeps its own copy.

You need: one Google account to own the Firebase project (yours), and the Google email addresses you and your wife
will sign in with.

## 1. Create the project
1. Go to <https://console.firebase.google.com> and sign in.
2. **Add project** → name it (for example `our-kitchen`) → turn **off** Google Analytics → **Create project**.

## 2. Turn on Google sign-in
1. In the left menu: **Build → Authentication → Get started**.
2. **Sign-in method** → **Google** → **Enable** → pick a support email → **Save**.
3. **Settings → Authorized domains → Add domain** → `pitchafwa.github.io` → **Add**.
   (`localhost` is already there.)

## 3. Create the database
1. **Build → Firestore Database → Create database**.
2. Choose a location near you, then **Start in production mode** → **Create**.

## 4. Lock it to the two of you
1. Firestore → **Rules** tab.
2. Replace everything with the contents of [`firestore.rules`](../firestore.rules), changing `YOU@gmail.com` and
   `WIFE@gmail.com` to the two Google emails.
3. **Publish**.

Anyone else who signs in is refused, even though the app's page is public.

## 5. Get the app config
1. Project settings (gear icon, top left) → **General** → scroll to **Your apps** → click the web icon `</>`.
2. Nickname: `kitchen` → leave Hosting unchecked → **Register app**.
3. Copy the `firebaseConfig` block (apiKey, authDomain, projectId, appId...).
   These values identify the project; they are not passwords.
4. Send it to Claude in chat, or paste it into `src/firebaseConfig.ts` replacing `null`, and commit.

## 6. Use it
Open the site → **Sync** tab → **Sign in with Google**. Do the same on the other device with the other account.
The first device to sign in uploads what is already on it; a second device merges its own data in once,
then both stay in step.

## Notes
- Works offline: changes are saved on the device and sent when you are back online.
- Free tier limits are far beyond what this uses.
- Sign-in uses a pop-up. If a phone browser blocks it, allow pop-ups for the site.
