// Two-device sync test against a fake server. Needs: `npm i -D playwright` (or any Playwright install) and `npx vite --port 5199` running.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ---- independent fake "Firestore": arrayUnion/arrayRemove + nested map merge semantics ----
const server = { state: { pantry: [], favorites: [], useSoon: [], grocery: {} }, subs: new Set(), writes: 0 };
const clone = (x) => JSON.parse(JSON.stringify(x));
const broadcast = async () => { for (const send of server.subs) await send(clone(server.state)); };
function applyServer(ops) {
  for (const op of ops) {
    if (op.t === 'add') server.state[op.field] = [...new Set([...server.state[op.field], ...op.values])];
    else if (op.t === 'remove') server.state[op.field] = server.state[op.field].filter(x => !op.values.includes(x));
    else if (op.t === 'item') server.state.grocery[op.name] = op.item;
    else if (op.t === 'drop') delete server.state.grocery[op.name];
    else if (op.t === 'plan') { server.state.plan ??= {}; if (op.id === null) delete server.state.plan[op.date]; else server.state.plan[op.date] = op.id; }
    else server.state.assumeStaples = op.value;
  }
}
async function device(name, seed) {
  const ctx = await b.newContext(); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(name + ': ' + e.message));
  if (seed) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem('hub:' + k, JSON.stringify(v)); }, seed);
  await p.exposeFunction('__write', async (ops) => { server.writes++; await new Promise(r => setTimeout(r, 20)); applyServer(ops); await broadcast(); });
  await p.exposeFunction('__sub', () => clone(server.state));
  server.subs.add(async (s) => p.evaluate((st) => window.__onState && window.__onState(st), s).catch(() => {}));
  await p.goto('http://localhost:5199/'); await p.waitForTimeout(500);
  await p.evaluate(async () => {
    const core = await import('/src/sync-core.ts'); const store = await import('/src/store.ts');
    window.core = core; window.store = store;
    core.connect({
      subscribe(onState) { window.__onState = onState; window.__sub().then(onState); return () => {}; },
      write: (ops) => window.__write(ops),
    }, { onSynced() {}, onError(e) { console.error(e); } });
  });
  await p.waitForTimeout(200);
  return { p, errs, get: (k) => p.evaluate((k) => window.store[k].value, k), run: (fn) => p.evaluate(fn) };
}
const settle = () => new Promise(r => setTimeout(r, 400));
const ok = (cond, msg) => console.log(cond ? 'PASS' : 'FAIL', msg);
const eq = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const A = await device('A', { pantry: ['egg', 'milk'], grocery: [{ name: 'lemon', done: false }] });
await settle();
ok(eq(server.state.pantry, ['egg', 'milk']) && 'lemon' in server.state.grocery, 'A first connect uploads its local data');

const B = await device('B', { pantry: ['butter'] });
await settle();
ok(eq(server.state.pantry, ['butter', 'egg', 'milk']), 'B first connect merges its local data up (server: ' + server.state.pantry + ')');
ok(eq(await B.get('pantry'), ['butter', 'egg', 'milk']) && (await B.get('grocery')).some(g => g.name === 'lemon'), 'B receives A\'s pantry and grocery');
ok(eq(await A.get('pantry'), ['butter', 'egg', 'milk']), 'A receives B\'s butter');

await B.run(() => window.store.toggleGrocery('lemon')); await settle();
ok((await A.get('grocery')).find(g => g.name === 'lemon')?.done === true && (await A.get('pantry')).includes('lemon'), 'B checks off lemon -> A sees it bought and in pantry');
await B.run(() => window.store.toggleGrocery('lemon')); await settle();
ok(!(await A.get('pantry')).includes('lemon') && (await A.get('grocery')).find(g => g.name === 'lemon')?.done === false, 'B un-checks -> A loses lemon from pantry');

await A.run(() => window.store.removeFromPantry('milk')); await settle();
ok(!(await B.get('pantry')).includes('milk') && !server.state.pantry.includes('milk'), 'A runs out of milk -> removed for B and server');

const w0 = server.writes;
await Promise.all([A.run(() => window.store.addToPantry('flour')), B.run(() => window.store.addToPantry('Sugar'))]); await settle();
ok(eq(await A.get('pantry'), await B.get('pantry')) && (await A.get('pantry')).includes('flour') && (await A.get('pantry')).includes('sugar'), 'simultaneous adds both survive on both devices');

await A.run(() => window.store.addToGrocery(['basil', 'parmesan'])); await B.run(() => window.store.removeFromGrocery('lemon')); await settle();
ok(eq((await B.get('grocery')).map(g => g.name), (await A.get('grocery')).map(g => g.name)) && !(await A.get('grocery')).some(g => g.name === 'lemon') && (await B.get('grocery')).some(g => g.name === 'basil'), 'grocery add + remove converge');

await A.run(() => window.store.toggleFavorite('f-1')); await settle();
ok((await B.get('favorites')).includes('f-1'), 'favorite syncs');
await A.run(() => { window.store.assumeStaples.value = false; }); await settle();
ok((await B.get('assumeStaples')) === false, 'staples setting syncs');

await A.run(() => window.store.setPlan('2026-10-05', 'f-9')); await B.run(() => window.store.setPlan('2026-10-06', 'f-7')); await settle();
ok((await B.get('plan'))['2026-10-05'] === 'f-9' && (await A.get('plan'))['2026-10-06'] === 'f-7', 'meal plan entries sync both ways');
await B.run(() => window.store.clearPlan('2026-10-05')); await settle();
ok(!('2026-10-05' in (await A.get('plan'))) && '2026-10-06' in (await A.get('plan')), 'removing a planned meal syncs');

const quiet = server.writes; await settle(); await settle();
ok(server.writes === quiet, `no write loops (total writes ${server.writes})`);
console.log('errors', [...A.errs, ...B.errs]);
await b.close();
