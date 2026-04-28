const Store = (() => {
  const COOKIES_KEY = 'cj_cookies';
  const CATS_KEY = 'cj_categories';

  const DEFAULT_CATEGORIES = [
    { id: 'cat-1', name: 'Proving Capability', order: 0 },
    { id: 'cat-2', name: 'Surviving Rejection', order: 1 },
    { id: 'cat-3', name: 'Endurance and Grit', order: 2 },
    { id: 'cat-4', name: 'Identity Anchors', order: 3 },
  ];

  function init() {
    if (!localStorage.getItem(CATS_KEY)) {
      localStorage.setItem(CATS_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (!localStorage.getItem(COOKIES_KEY)) {
      localStorage.setItem(COOKIES_KEY, JSON.stringify([]));
    }
  }

  function getCategories() {
    return JSON.parse(localStorage.getItem(CATS_KEY) || '[]');
  }

  function getCookies() {
    return JSON.parse(localStorage.getItem(COOKIES_KEY) || '[]');
  }

  function saveCategories(cats) {
    localStorage.setItem(CATS_KEY, JSON.stringify(cats));
  }

  function saveCookies(cookies) {
    localStorage.setItem(COOKIES_KEY, JSON.stringify(cookies));
  }

  function addCookie({ title, categoryId, reflection, photoId }) {
    const cookies = getCookies();
    const cookie = {
      id: crypto.randomUUID(),
      title,
      categoryId,
      reflection: reflection || '',
      photoId: photoId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cookies.unshift(cookie);
    saveCookies(cookies);
    return cookie;
  }

  function updateCookie(id, updates) {
    const cookies = getCookies();
    const idx = cookies.findIndex(c => c.id === id);
    if (idx === -1) return null;
    cookies[idx] = { ...cookies[idx], ...updates, updatedAt: new Date().toISOString() };
    saveCookies(cookies);
    return cookies[idx];
  }

  function deleteCookie(id) {
    const cookies = getCookies();
    const cookie = cookies.find(c => c.id === id);
    saveCookies(cookies.filter(c => c.id !== id));
    return cookie;
  }

  function addCategory(name) {
    const cats = getCategories();
    const cat = { id: crypto.randomUUID(), name: name.trim(), order: cats.length };
    cats.push(cat);
    saveCategories(cats);
    return cat;
  }

  function renameCategory(id, name) {
    const cats = getCategories();
    const cat = cats.find(c => c.id === id);
    if (!cat) return null;
    cat.name = name.trim();
    saveCategories(cats);
    return cat;
  }

  function deleteCategory(id) {
    const hasCookies = getCookies().some(c => c.categoryId === id);
    if (hasCookies) return { error: 'Reassign or delete all cookies in this category first.' };
    saveCategories(getCategories().filter(c => c.id !== id));
    return { ok: true };
  }

  function exportAll() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: getCategories(),
      cookies: getCookies(),
    };
  }

  function importAll(data) {
    if (!data.version || !Array.isArray(data.categories) || !Array.isArray(data.cookies)) {
      throw new Error('Invalid export file.');
    }
    saveCategories(data.categories);
    saveCookies(data.cookies);
  }

  return {
    init,
    getCategories,
    getCookies,
    addCookie,
    updateCookie,
    deleteCookie,
    addCategory,
    renameCategory,
    deleteCategory,
    exportAll,
    importAll,
  };
})();
