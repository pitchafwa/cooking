import type { Firestore } from 'firebase/firestore';
import type { Adapter, Op, RemoteState } from './sync-core';
import { emptyRemote } from './sync-core';

/** The single shared document both of you read and write. */
export const HOUSEHOLD_PATH = ['households', 'home'] as const;

type FS = typeof import('firebase/firestore');

export function firestoreAdapter(fs: FS, db: Firestore): Adapter {
  const ref = fs.doc(db, ...HOUSEHOLD_PATH);
  return {
    subscribe(onState, onError) {
      return fs.onSnapshot(
        ref,
        (snap) => {
          const d = snap.exists() ? snap.data() : {};
          const state: RemoteState = {
            ...emptyRemote(),
            pantry: d.pantry ?? [], favorites: d.favorites ?? [], useSoon: d.useSoon ?? [],
            assumeStaples: d.assumeStaples, grocery: d.grocery ?? {},
          };
          onState(state);
        },
        onError,
      );
    },
    async write(ops: Op[]) {
      const batch = fs.writeBatch(db);
      for (const op of ops) {
        if (op.t === 'add') batch.set(ref, { [op.field]: fs.arrayUnion(...op.values) }, { merge: true });
        else if (op.t === 'remove') batch.set(ref, { [op.field]: fs.arrayRemove(...op.values) }, { merge: true });
        else if (op.t === 'item') batch.set(ref, { grocery: { [op.name]: op.item } }, { merge: true });
        else if (op.t === 'drop') batch.set(ref, { grocery: { [op.name]: fs.deleteField() } }, { merge: true });
        else batch.set(ref, { assumeStaples: op.value }, { merge: true });
      }
      await batch.commit();
    },
  };
}
