/**
 * Browser-local draft persistence using IndexedDB.
 * Photo blobs stay on the device and are never uploaded.
 */
export class DraftStore {
  static open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('lines-in-transit-studio', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  static async get() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readonly');
      const request = transaction.objectStore('drafts').get('current');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  }

  static async save(draft) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').put({ ...draft, id: 'current', savedAt: Date.now() });
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  static async clear() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete('current');
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
