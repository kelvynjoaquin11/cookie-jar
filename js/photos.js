const Photos = (() => {
  const DB_NAME = 'cookie-jar-db';
  const STORE = 'photos';
  const DB_VERSION = 1;
  let _db = null;

  async function openDB() {
    if (_db) return _db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => e.target.result.createObjectStore(STORE);
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  async function compressImage(file) {
    return new Promise(resolve => {
      const img = new Image();
      const src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(src);
        const compress = (maxDim, quality) => new Promise(res => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const r = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * r);
            height = Math.round(height * r);
          }
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(res, 'image/jpeg', quality);
        });
        Promise.all([compress(1600, 0.85), compress(600, 0.80)])
          .then(([full, thumb]) => resolve({ full, thumb }));
      };
      img.src = src;
    });
  }

  async function savePhoto(file) {
    const { full, thumb } = await compressImage(file);
    const id = crypto.randomUUID();
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const s = tx.objectStore(STORE);
      s.put(full, id);
      s.put(thumb, id + '_thumb');
      tx.oncomplete = () => resolve(id);
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function getPhoto(id, thumb = false) {
    if (!id) return null;
    const db = await openDB();
    const key = thumb ? id + '_thumb' : id;
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ? URL.createObjectURL(e.target.result) : null);
      req.onerror = e => reject(e.target.error);
    });
  }

  async function deletePhoto(id) {
    if (!id) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.objectStore(STORE).delete(id + '_thumb');
      tx.oncomplete = resolve;
      tx.onerror = e => reject(e.target.error);
    });
  }

  async function exportPhotos(ids) {
    const db = await openDB();
    const result = {};
    const blobToDataUrl = blob => new Promise(res => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(blob);
    });
    for (const id of ids) {
      const [full, thumb] = await Promise.all([
        new Promise(res => {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
          req.onsuccess = e => res(e.target.result || null);
        }),
        new Promise(res => {
          const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id + '_thumb');
          req.onsuccess = e => res(e.target.result || null);
        }),
      ]);
      if (full) result[id] = await blobToDataUrl(full);
      if (thumb) result[id + '_thumb'] = await blobToDataUrl(thumb);
    }
    return result;
  }

  async function importPhotos(photoMap) {
    const db = await openDB();
    const dataUrlToBlob = dataUrl => {
      const [header, data] = dataUrl.split(',');
      const mime = header.match(/:(.*?);/)[1];
      const bytes = atob(data);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      return new Blob([arr], { type: mime });
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const s = tx.objectStore(STORE);
      for (const [key, dataUrl] of Object.entries(photoMap)) s.put(dataUrlToBlob(dataUrl), key);
      tx.oncomplete = resolve;
      tx.onerror = e => reject(e.target.error);
    });
  }

  return { savePhoto, getPhoto, deletePhoto, exportPhotos, importPhotos };
})();
