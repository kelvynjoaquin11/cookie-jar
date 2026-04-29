// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  filter: 'all',
  query: '',
  detailId: null,
  editMode: false,
  formCookieId: null,
  pendingFile: null,
  previewUrl: null,
  shuffled: false,
  shuffleOrder: [],
};

// Object URLs created for grid cards — revoked on each render.
let gridUrls = [];
// Object URLs created for the detail modal — revoked on close.
let detailUrls = [];

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Store.init();
  setupListeners();
  renderAll();
});

function renderAll() {
  renderFilterChips();
  renderGrid();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function autoGrow(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function showToast(msg, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

function showModal(id) {
  const modal = document.getElementById(id);
  modal.hidden = false;
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => modal.classList.add('modal-visible'));
  const firstFocusable = modal.querySelector('input, textarea, select, button:not(.modal-close)');
  if (firstFocusable) firstFocusable.focus();
}

function hideModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('modal-visible');
  setTimeout(() => {
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
  }, 220);
}

// ─── Filter Chips ─────────────────────────────────────────────────────────────

function renderFilterChips() {
  const cats = Store.getCategories();
  const wrap = document.getElementById('filter-chips');
  const chips = [{ id: 'all', name: 'All' }, ...cats];
  wrap.innerHTML = chips.map(c => `
    <button class="chip${state.filter === c.id ? ' chip-active' : ''}" data-filter="${esc(c.id)}">
      ${esc(c.name)}
    </button>
  `).join('');
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

async function renderGrid() {
  gridUrls.forEach(u => URL.revokeObjectURL(u));
  gridUrls = [];

  let cookies = Store.getCookies();

  if (state.filter !== 'all') cookies = cookies.filter(c => c.categoryId === state.filter);

  if (state.shuffled && state.shuffleOrder.length) {
    cookies = [...cookies].sort((a, b) => state.shuffleOrder.indexOf(a.id) - state.shuffleOrder.indexOf(b.id));
  }

  if (state.query) {
    const q = state.query.toLowerCase();
    cookies = cookies.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.reflection && c.reflection.toLowerCase().includes(q))
    );
  }

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty-state');
  const allCookies = Store.getCookies();

  if (cookies.length === 0) {
    grid.hidden = true;
    empty.hidden = false;
    const title = document.getElementById('empty-title');
    const body = document.getElementById('empty-body');
    const newBtn = document.getElementById('btn-new-empty');
    if (allCookies.length === 0) {
      title.textContent = 'Your jar is empty';
      body.textContent = 'Every challenge you\'ve survived belongs here. Start adding your cookies.';
      newBtn.hidden = false;
    } else if (state.query) {
      title.textContent = 'No results found';
      body.textContent = `Nothing matched "${state.query}". Try a different search.`;
      newBtn.hidden = true;
    } else {
      title.textContent = 'No cookies in this category';
      body.textContent = 'Add a cookie to this category or switch the filter.';
      newBtn.hidden = true;
    }
    return;
  }

  grid.hidden = false;
  empty.hidden = true;

  const cats = Store.getCategories();
  grid.innerHTML = cookies.map(cookie => {
    const cat = cats.find(c => c.id === cookie.categoryId);
    const snippet = cookie.reflection
      ? cookie.reflection.slice(0, 100) + (cookie.reflection.length > 100 ? '…' : '')
      : '';
    return `
      <article class="card" data-id="${esc(cookie.id)}" tabindex="0" role="button" aria-label="Open ${esc(cookie.title)}">
        <div class="card-img-wrap">
          <img class="card-img" data-photo-id="${esc(cookie.photoId || '')}" alt="" hidden>
          <div class="card-img-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
        </div>
        <div class="card-body">
          <span class="category-badge">${esc(cat ? cat.name : 'Unknown')}</span>
          <h3 class="card-title">${esc(cookie.title)}</h3>
          ${snippet ? `<p class="card-snippet">${esc(snippet)}</p>` : ''}
        </div>
      </article>
    `;
  }).join('');

  // Load thumbnails asynchronously
  cookies.forEach(cookie => {
    if (!cookie.photoId) return;
    Photos.getPhoto(cookie.photoId, true).then(url => {
      if (!url) return;
      gridUrls.push(url);
      const card = grid.querySelector(`[data-id="${cookie.id}"]`);
      if (!card) return;
      const img = card.querySelector('.card-img');
      const placeholder = card.querySelector('.card-img-placeholder');
      img.src = url;
      img.hidden = false;
      if (placeholder) placeholder.hidden = true;
    });
  });
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

async function openDetail(cookieId) {
  const cookies = Store.getCookies();
  const cookie = cookies.find(c => c.id === cookieId);
  if (!cookie) return;

  state.detailId = cookieId;
  state.editMode = false;

  const cats = Store.getCategories();
  const cat = cats.find(c => c.id === cookie.categoryId);

  document.getElementById('detail-category-badge').textContent = cat ? cat.name : 'Unknown';
  document.getElementById('detail-date').textContent = formatDate(cookie.createdAt);

  const titleEl = document.getElementById('detail-title-el');
  const reflectionEl = document.getElementById('detail-reflection');
  titleEl.textContent = cookie.title;
  titleEl.contentEditable = 'false';
  reflectionEl.textContent = cookie.reflection || '';
  reflectionEl.contentEditable = 'false';

  document.getElementById('detail-normal-actions').hidden = false;
  document.getElementById('detail-edit-actions').hidden = true;
  document.getElementById('detail-delete-confirm').hidden = true;

  // Load photo
  detailUrls.forEach(u => URL.revokeObjectURL(u));
  detailUrls = [];

  const photoEl = document.getElementById('detail-photo');
  const noPhoto = document.getElementById('detail-no-photo');

  if (cookie.photoId) {
    const url = await Photos.getPhoto(cookie.photoId, false);
    if (url) {
      detailUrls.push(url);
      photoEl.src = url;
      photoEl.hidden = false;
      noPhoto.hidden = true;
    } else {
      photoEl.hidden = true;
      noPhoto.hidden = false;
    }
  } else {
    photoEl.src = '';
    photoEl.hidden = true;
    noPhoto.hidden = false;
  }

  showModal('detail-modal');
}

function closeDetail() {
  detailUrls.forEach(u => URL.revokeObjectURL(u));
  detailUrls = [];
  state.detailId = null;
  state.editMode = false;
  hideModal('detail-modal');
}

function startDetailEdit() {
  state.editMode = true;
  const titleEl = document.getElementById('detail-title-el');
  const reflectionEl = document.getElementById('detail-reflection');
  titleEl.contentEditable = 'true';
  reflectionEl.contentEditable = 'true';
  document.getElementById('detail-normal-actions').hidden = true;
  document.getElementById('detail-edit-actions').hidden = false;
  titleEl.focus();
  // Place cursor at end
  const range = document.createRange();
  range.selectNodeContents(titleEl);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function saveDetailEdit() {
  const title = document.getElementById('detail-title-el').textContent.trim();
  const reflection = document.getElementById('detail-reflection').textContent.trim();
  if (!title) {
    showToast('Title cannot be empty', 'error');
    document.getElementById('detail-title-el').focus();
    return;
  }
  Store.updateCookie(state.detailId, { title, reflection });
  cancelDetailEdit();
  renderGrid();
  showToast('Saved');
}

function cancelDetailEdit() {
  const cookie = Store.getCookies().find(c => c.id === state.detailId);
  if (cookie) {
    document.getElementById('detail-title-el').textContent = cookie.title;
    document.getElementById('detail-reflection').textContent = cookie.reflection || '';
  }
  document.getElementById('detail-title-el').contentEditable = 'false';
  document.getElementById('detail-reflection').contentEditable = 'false';
  document.getElementById('detail-normal-actions').hidden = false;
  document.getElementById('detail-edit-actions').hidden = true;
  state.editMode = false;
}

async function replaceDetailPhoto(file) {
  if (!state.detailId) return;
  const cookie = Store.getCookies().find(c => c.id === state.detailId);
  if (!cookie) return;

  const btn = document.getElementById('btn-replace-photo-detail');
  btn.textContent = 'Uploading…';
  btn.disabled = true;

  try {
    const oldPhotoId = cookie.photoId;
    const newPhotoId = await Photos.savePhoto(file);
    if (oldPhotoId) await Photos.deletePhoto(oldPhotoId);
    Store.updateCookie(state.detailId, { photoId: newPhotoId });

    detailUrls.forEach(u => URL.revokeObjectURL(u));
    detailUrls = [];

    const url = await Photos.getPhoto(newPhotoId, false);
    if (url) {
      detailUrls.push(url);
      const photoEl = document.getElementById('detail-photo');
      photoEl.src = url;
      photoEl.hidden = false;
      document.getElementById('detail-no-photo').hidden = true;
    }
    renderGrid();
    showToast('Photo updated');
  } catch (err) {
    console.error(err);
    showToast('Photo upload failed', 'error');
  } finally {
    btn.textContent = 'Replace photo';
    btn.disabled = false;
  }
}

// ─── Cookie Form Modal ────────────────────────────────────────────────────────

function resetPhotoArea() {
  document.getElementById('photo-placeholder').hidden = false;
  document.getElementById('photo-preview-wrap').hidden = true;
  document.getElementById('photo-preview').src = '';
  document.getElementById('field-photo').value = '';
}

function showPhotoPreview(url) {
  document.getElementById('photo-placeholder').hidden = true;
  document.getElementById('photo-preview-wrap').hidden = false;
  document.getElementById('photo-preview').src = url;
}

function openCookieModal(cookieId = null) {
  state.formCookieId = cookieId;
  state.pendingFile = null;
  if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }

  const cats = Store.getCategories();
  const catSelect = document.getElementById('field-category');
  catSelect.innerHTML = cats.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');

  const titleEl = document.getElementById('cookie-modal-title');
  const saveBtn = document.getElementById('btn-save-cookie');
  saveBtn.disabled = false;

  if (cookieId) {
    const cookie = Store.getCookies().find(c => c.id === cookieId);
    if (!cookie) return;
    titleEl.textContent = 'Edit Cookie';
    saveBtn.textContent = 'Save changes';
    document.getElementById('field-title').value = cookie.title;
    catSelect.value = cookie.categoryId;
    const reflectionEl = document.getElementById('field-reflection');
    reflectionEl.value = cookie.reflection || '';
    setTimeout(() => autoGrow(reflectionEl), 0);
    resetPhotoArea();
    if (cookie.photoId) {
      Photos.getPhoto(cookie.photoId, false).then(url => {
        if (!url) return;
        state.previewUrl = url;
        showPhotoPreview(url);
      });
    }
  } else {
    titleEl.textContent = 'New Cookie';
    saveBtn.textContent = 'Save Cookie';
    document.getElementById('cookie-form').reset();
    resetPhotoArea();
    setTimeout(() => autoGrow(document.getElementById('field-reflection')), 0);
  }

  showModal('cookie-modal');
}

function closeCookieModal() {
  if (state.previewUrl) { URL.revokeObjectURL(state.previewUrl); state.previewUrl = null; }
  state.pendingFile = null;
  hideModal('cookie-modal');
}

async function handlePhotoFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
  state.pendingFile = file;
  state.previewUrl = URL.createObjectURL(file);
  showPhotoPreview(state.previewUrl);
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('field-title').value.trim();
  const categoryId = document.getElementById('field-category').value;
  const reflection = document.getElementById('field-reflection').value.trim();

  if (!title) {
    showToast('Please enter a title', 'error');
    document.getElementById('field-title').focus();
    return;
  }

  const saveBtn = document.getElementById('btn-save-cookie');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';

  try {
    if (state.formCookieId) {
      const existing = Store.getCookies().find(c => c.id === state.formCookieId);
      let photoId = existing.photoId;
      if (state.pendingFile) {
        if (photoId) await Photos.deletePhoto(photoId);
        photoId = await Photos.savePhoto(state.pendingFile);
      }
      Store.updateCookie(state.formCookieId, { title, categoryId, reflection, photoId });
      showToast('Cookie updated');
    } else {
      let photoId = null;
      if (state.pendingFile) photoId = await Photos.savePhoto(state.pendingFile);
      Store.addCookie({ title, categoryId, reflection, photoId });
      showToast('Cookie added to your jar');
    }
    closeCookieModal();
    renderAll();
  } catch (err) {
    console.error(err);
    showToast('Something went wrong — please try again', 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = state.formCookieId ? 'Save changes' : 'Save Cookie';
  }
}

// ─── Categories Modal ─────────────────────────────────────────────────────────

function openCategoriesModal() {
  renderCategoryList();
  document.getElementById('new-category-name').value = '';
  showModal('categories-modal');
}

function closeCategoriesModal() {
  hideModal('categories-modal');
}

function renderCategoryList() {
  const cats = Store.getCategories();
  const cookies = Store.getCookies();
  const list = document.getElementById('category-list');
  list.innerHTML = cats.map(cat => {
    const count = cookies.filter(c => c.categoryId === cat.id).length;
    return `
      <li class="category-item" data-cat-id="${esc(cat.id)}">
        <span class="cat-name" contenteditable="false" spellcheck="false">${esc(cat.name)}</span>
        <span class="cat-count">${count} cookie${count !== 1 ? 's' : ''}</span>
        <div class="cat-actions">
          <button class="cat-btn btn-rename" aria-label="Rename ${esc(cat.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
          </button>
          <button class="cat-btn btn-delete-cat" aria-label="Delete ${esc(cat.name)}" ${count > 0 ? 'disabled title="Reassign or delete all cookies first"' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </li>
    `;
  }).join('');
}

// ─── Export / Import ──────────────────────────────────────────────────────────

async function exportData() {
  const data = Store.exportAll();
  const photoIds = data.cookies.filter(c => c.photoId).map(c => c.photoId);
  const btn = document.getElementById('btn-export-data');
  btn.textContent = 'Exporting…';
  btn.disabled = true;
  try {
    data.photos = await Photos.exportPhotos(photoIds);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookie-jar-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded');
  } catch (err) {
    console.error(err);
    showToast('Export failed', 'error');
  } finally {
    btn.textContent = 'Export data';
    btn.disabled = false;
  }
}

async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    Store.importAll(data);
    if (data.photos) await Photos.importPhotos(data.photos);
    state.filter = 'all';
    state.query = '';
    document.getElementById('search').value = '';
    closeCategoriesModal();
    renderAll();
    showToast('Data imported');
  } catch (err) {
    console.error(err);
    showToast('Import failed — invalid file', 'error');
  }
}

// ─── Shuffle & Random ─────────────────────────────────────────────────────────

function shuffleCookies() {
  state.shuffled = !state.shuffled;
  if (state.shuffled) {
    const ids = Store.getCookies().map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    state.shuffleOrder = ids;
  } else {
    state.shuffleOrder = [];
  }
  document.getElementById('btn-shuffle').classList.toggle('shuffle-active', state.shuffled);
  renderGrid();
}

function randomCookie() {
  const cookies = Store.getCookies();
  if (!cookies.length) return;
  const pick = cookies[Math.floor(Math.random() * cookies.length)];
  openDetail(pick.id);
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupListeners() {
  // Header
  document.getElementById('btn-new').addEventListener('click', () => openCookieModal());
  document.getElementById('btn-manage').addEventListener('click', openCategoriesModal);
  document.getElementById('btn-new-empty').addEventListener('click', () => openCookieModal());

  // Search
  document.getElementById('search').addEventListener('input', e => {
    state.query = e.target.value.trim();
    renderGrid();
  });

  // Filter chips (delegated)
  document.getElementById('filter-chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    renderFilterChips();
    renderGrid();
  });

  // Grid card click (delegated)
  document.getElementById('grid').addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) openDetail(card.dataset.id);
  });
  document.getElementById('grid').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.card');
      if (card) { e.preventDefault(); openDetail(card.dataset.id); }
    }
  });

  // Cookie form modal
  document.getElementById('cookie-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('btn-cancel-form').addEventListener('click', closeCookieModal);

  // Photo drop zone
  const dropZone = document.getElementById('photo-drop');
  const fileInput = document.getElementById('field-photo');

  document.getElementById('btn-browse').addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
  document.getElementById('btn-replace-in-form').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handlePhotoFile(e.target.files[0]); });

  dropZone.addEventListener('click', e => {
    if (!e.target.closest('button') && document.getElementById('photo-placeholder').hidden === false) {
      fileInput.click();
    }
  });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handlePhotoFile(file);
  });

  // Paste image anywhere when form modal is open
  document.addEventListener('paste', e => {
    if (document.getElementById('cookie-modal').hidden) return;
    const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
    if (item) handlePhotoFile(item.getAsFile());
  });

  // Detail modal
  document.getElementById('detail-close').addEventListener('click', closeDetail);
  document.getElementById('btn-detail-edit').addEventListener('click', startDetailEdit);
  document.getElementById('btn-detail-save').addEventListener('click', saveDetailEdit);
  document.getElementById('btn-detail-cancel').addEventListener('click', cancelDetailEdit);

  document.getElementById('btn-delete-cookie').addEventListener('click', () => {
    document.getElementById('detail-normal-actions').hidden = true;
    document.getElementById('detail-delete-confirm').hidden = false;
  });

  document.getElementById('btn-delete-cancel').addEventListener('click', () => {
    document.getElementById('detail-delete-confirm').hidden = true;
    document.getElementById('detail-normal-actions').hidden = false;
  });

  document.getElementById('btn-delete-confirm-yes').addEventListener('click', async () => {
    const cookie = Store.getCookies().find(c => c.id === state.detailId);
    if (!cookie) return;
    if (cookie.photoId) await Photos.deletePhoto(cookie.photoId);
    Store.deleteCookie(state.detailId);
    closeDetail();
    renderAll();
    showToast('Cookie deleted');
  });

  document.getElementById('btn-replace-photo-detail').addEventListener('click', () => {
    document.getElementById('detail-replace-input').click();
  });
  document.getElementById('detail-replace-input').addEventListener('change', e => {
    if (e.target.files[0]) replaceDetailPhoto(e.target.files[0]);
    e.target.value = '';
  });

  // Detail inline edit: Cmd/Ctrl+Enter saves, Esc cancels
  document.getElementById('detail-modal').addEventListener('keydown', e => {
    if (!state.editMode) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveDetailEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelDetailEdit(); }
  });

  // Categories modal
  document.getElementById('categories-modal').addEventListener('click', e => {
    const item = e.target.closest('.category-item');
    if (!item) return;
    const catId = item.dataset.catId;

    if (e.target.closest('.btn-rename')) {
      const nameEl = item.querySelector('.cat-name');
      nameEl.contentEditable = 'true';
      nameEl.focus();
      const r = document.createRange();
      r.selectNodeContents(nameEl);
      r.collapse(false);
      const s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);

      function finishRename() {
        nameEl.contentEditable = 'false';
        const newName = nameEl.textContent.trim();
        if (!newName) { nameEl.textContent = Store.getCategories().find(c => c.id === catId)?.name || ''; return; }
        Store.renameCategory(catId, newName);
        renderFilterChips();
      }
      nameEl.addEventListener('blur', finishRename, { once: true });
      nameEl.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
        if (e.key === 'Escape') {
          const orig = Store.getCategories().find(c => c.id === catId)?.name || '';
          nameEl.textContent = orig;
          nameEl.contentEditable = 'false';
        }
      }, { once: true });
    }

    if (e.target.closest('.btn-delete-cat')) {
      const result = Store.deleteCategory(catId);
      if (result.error) { showToast(result.error, 'error'); return; }
      if (state.filter === catId) state.filter = 'all';
      renderCategoryList();
      renderAll();
    }
  });

  document.getElementById('btn-add-category').addEventListener('click', () => {
    const input = document.getElementById('new-category-name');
    const name = input.value.trim();
    if (!name) return;
    Store.addCategory(name);
    input.value = '';
    renderCategoryList();
    renderFilterChips();
  });
  document.getElementById('new-category-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-category').click(); }
  });

  document.getElementById('btn-export-data').addEventListener('click', exportData);
  document.getElementById('import-file-input').addEventListener('change', e => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });

  // Modal backdrops
  document.querySelectorAll('.modal-backdrop').forEach(el => {
    el.addEventListener('click', () => {
      const modalId = el.dataset.close;
      if (modalId === 'cookie-modal') closeCookieModal();
      else if (modalId === 'detail-modal') closeDetail();
      else if (modalId === 'categories-modal') closeCategoriesModal();
    });
  });
  document.querySelectorAll('.modal-close[data-close]').forEach(el => {
    el.addEventListener('click', () => {
      const modalId = el.dataset.close;
      if (modalId === 'cookie-modal') closeCookieModal();
      else if (modalId === 'categories-modal') closeCategoriesModal();
    });
  });
  document.getElementById('detail-close').addEventListener('click', closeDetail);

  // Textarea auto-grow
  document.getElementById('field-reflection').addEventListener('input', function () { autoGrow(this); });

  // Global keyboard shortcuts
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName.toLowerCase();
    const inInput = ['input', 'textarea', 'select'].includes(tag) || document.activeElement.isContentEditable;
    const anyModal = !document.getElementById('cookie-modal').hidden || !document.getElementById('detail-modal').hidden || !document.getElementById('categories-modal').hidden;

    if (!inInput && !anyModal) {
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openCookieModal(); }
      if (e.key === '/') { e.preventDefault(); document.getElementById('search').focus(); }
    }
    if (e.key === 'Escape') {
      if (!document.getElementById('cookie-modal').hidden) closeCookieModal();
      else if (!document.getElementById('categories-modal').hidden) closeCategoriesModal();
      else if (!document.getElementById('detail-modal').hidden && !state.editMode) closeDetail();
    }
  });

  // Shuffle & Random (at end so a missing element never breaks earlier listeners)
  document.getElementById('btn-shuffle')?.addEventListener('click', shuffleCookies);
  document.getElementById('btn-random')?.addEventListener('click', randomCookie);
}
