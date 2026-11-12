// IndexedDB preserves the exact form and optional File across a timeout/reload.
// A request is never sent unless its stable intention has first been saved.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('home-fashion-payment-intentions-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('intents');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error('No se pudo conservar la intención. Habilita el almacenamiento del navegador.')
      );
  });
}
async function operation<T>(
  key: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('intents', mode);
      const request = action(tx.objectStore('intents'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () =>
        reject(new Error('No se pudo conservar la intención de pago.'));
    });
  } finally {
    db.close();
  }
}
export async function savePaymentIntention(key: string, form: FormData) {
  await operation(key, 'readwrite', (store) => store.put(Array.from(form.entries()), key));
}
export async function loadPaymentIntention(key: string): Promise<FormData | null> {
  const entries = await operation<Array<[string, string | File]> | undefined>(
    key,
    'readonly',
    (store) => store.get(key)
  );
  if (!entries) return null;
  const form = new FormData();
  for (const [name, value] of entries) form.set(name, value);
  return form;
}
export async function clearPaymentIntention(key: string) {
  await operation(key, 'readwrite', (store) => store.delete(key));
}
