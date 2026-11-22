import Dexie from 'dexie';

export const localDb = new Dexie('nutrition-coach-local');
localDb.version(1).stores({
  foods: 'id, name',
  recipes: 'id',
  diary: 'id, eaten_at',
  weights: 'id, measured_at',
  outbox: '++seq, type, created_at'
});

export async function readLocalSnapshot() {
  const [foods, recipes, diary, weights] = await Promise.all([
    localDb.foods.toArray(),
    localDb.recipes.toArray(),
    localDb.diary.toArray(),
    localDb.weights.orderBy('measured_at').reverse().toArray()
  ]);
  return { foods, recipes, diary, weights };
}

export async function cacheSnapshot({ foods, recipes, diary, weights }) {
  await localDb.transaction('rw', localDb.foods, localDb.recipes, localDb.diary, localDb.weights, async () => {
    if (foods) await localDb.foods.bulkPut(foods);
    if (recipes) await localDb.recipes.bulkPut(recipes);
    if (diary) await localDb.diary.bulkPut(diary);
    if (weights) await localDb.weights.bulkPut(weights);
  });
}

export async function queueOperation(type, payload) {
  return localDb.outbox.add({
    type,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0
  });
}

export async function pendingOperations() {
  return localDb.outbox.orderBy('seq').toArray();
}

export async function markOperationSynced(seq) {
  await localDb.outbox.delete(seq);
}

export async function markOperationFailed(seq, attempts) {
  await localDb.outbox.update(seq, { attempts, last_attempt_at: new Date().toISOString() });
}
