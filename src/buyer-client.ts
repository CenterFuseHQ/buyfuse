export const buyerClientScript = String.raw`
const tokenKey = 'buyfuseToken';
const localKey = 'buyfuseLocalItems';
let token = '';
try { token = sessionStorage.getItem(tokenKey) || ''; } catch {}
let localMode = false;
let localDataIssue = '';
let currentItems = [];
const el = (id) => document.getElementById(id);

function say(message) {
  const node = el('status');
  node.textContent = message;
  node.hidden = false;
  setTimeout(() => { node.hidden = true; }, 3500);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({ error: 'INVALID_RESPONSE' }));
  if (!response.ok) throw new Error(data.error || 'REQUEST_FAILED');
  return data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    if (character === '&') return '&amp;';
    if (character === '<') return '&lt;';
    if (character === '>') return '&gt;';
    if (character === '"') return '&quot;';
    return '&#39;';
  });
}

function safeSourceUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value));
    const sensitiveKey = /(?:access[_-]?token|token|secret|signature|(^|[^a-z])sig(?:nature)?(?:[^a-z]|$)|api[_-]?key|access[_-]?key|auth(?:orization)?|credential|password|passwd|session|(^|[^a-z])code(?:[^a-z]|$))/i;
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || url.hash ||
      [...url.searchParams.keys()].some((key) => sensitiveKey.test(key))) return null;
    return url.href;
  } catch {
    return null;
  }
}

function readLocalItems() {
  let serialized;
  try {
    serialized = localStorage.getItem(localKey);
  } catch {
    localDataIssue = 'unavailable';
    return [];
  }
  if (serialized === null || serialized === '') {
    localDataIssue = '';
    return [];
  }
  let stored;
  try {
    stored = JSON.parse(serialized);
  } catch {
    localDataIssue = 'corrupt';
    return [];
  }
  if (!Array.isArray(stored)) {
    localDataIssue = 'corrupt';
    return [];
  }
  const validItems = stored.filter((item) =>
    item && typeof item === 'object' && typeof item.title === 'string' &&
    item.title.trim().length >= 2 && item.title.trim().length <= 200 &&
    (item.sourceUrl == null || typeof item.sourceUrl === 'string') &&
    (item.notes == null || (typeof item.notes === 'string' && item.notes.length <= 2000)) &&
    (item.status == null || ['CONSIDERING', 'PURCHASED', 'ARCHIVED'].includes(item.status)) &&
    (item.createdAt == null || typeof item.createdAt === 'string') &&
    (item.updatedAt == null || typeof item.updatedAt === 'string')
  );
  if (validItems.length !== stored.length) {
    localDataIssue = 'corrupt';
    return [];
  }
  localDataIssue = '';
  return validItems.map((item) => ({
        id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
        title: item.title.trim().slice(0, 200),
        sourceUrl: typeof item.sourceUrl === 'string' ? (safeSourceUrl(item.sourceUrl) || undefined) : undefined,
        notes: typeof item.notes === 'string' ? item.notes.slice(0, 2000) : undefined,
        status: ['CONSIDERING', 'PURCHASED', 'ARCHIVED'].includes(item.status) ? item.status : 'CONSIDERING',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
      }));
}

function writeLocalItems(items) {
  localStorage.setItem(localKey, JSON.stringify(items));
  localDataIssue = '';
}

function renderItems(items) {
  currentItems = items;
  el('saved-count').textContent = String(items.length);
  el('items').innerHTML = items.length ? items.map((item) => {
    const sourceUrl = safeSourceUrl(item.sourceUrl);
    const sourceLink = sourceUrl
      ? '<p><a target=\"_blank\" rel=\"noopener noreferrer\" href=\"' + escapeHtml(sourceUrl) + '\">Open source</a></p>'
      : '';
    return '<article class=\"state\" style=\"text-align:left\"><h3>' + escapeHtml(item.title) + '</h3>' + sourceLink +
      '<p>' + escapeHtml(item.notes || 'No notes yet.') + '</p><label class=\"field\">Purchase status<select data-item=\"' +
      escapeHtml(item.id) + '\" aria-label=\"Purchase status for ' + escapeHtml(item.title) + '\">' +
      '<option value=\"CONSIDERING\" ' + (item.status === 'CONSIDERING' ? 'selected' : '') + '>Considering</option>' +
      '<option value=\"PURCHASED\" ' + (item.status === 'PURCHASED' ? 'selected' : '') + '>Purchased</option>' +
      '<option value=\"ARCHIVED\" ' + (item.status === 'ARCHIVED' ? 'selected' : '') + '>Archived</option></select></label></article>';
  }).join('') : '<section class=\"state empty\" role=\"status\"><h2>Nothing saved yet</h2><p>Add an item above and it will appear here.</p></section>';

  document.querySelectorAll('[data-item]').forEach((select) => {
    select.onchange = async () => {
      try {
        if (localMode) {
          const existingItems = readLocalItems();
          if (localDataIssue) {
            say(localDataIssue === 'corrupt'
              ? 'Local data could not be read. Restore a valid backup before changing it.'
              : 'Browser storage is unavailable. Local data was not changed.');
            return;
          }
          const updated = existingItems.map((item) => item.id === select.dataset.item
            ? { ...item, status: select.value, updatedAt: new Date().toISOString() }
            : item);
          writeLocalItems(updated);
          renderItems(updated);
          say('Status updated in this browser.');
          return;
        }
        await api('/api/items/' + select.dataset.item + '/status', {
          method: 'PATCH',
          body: JSON.stringify({ status: select.value })
        });
        say('Status updated.');
      } catch {
        say(localMode ? 'Could not update local storage. Existing entries were left unchanged.' : 'Could not update the item. Please try again.');
      }
    };
  });
}

async function load() {
  const data = await api('/api/workspace');
  localMode = false;
  el('auth').hidden = true;
  el('workspace').hidden = false;
  el('workspace-mode').textContent = 'Account items are held in the running service and may reset when that service restarts. Download backups regularly.';
  el('switch-workspace').textContent = 'Use local workspace';
  renderItems(data.savedItems || []);
}

async function authenticate(mode) {
  try {
    const data = await api('/api/auth/' + mode, {
      method: 'POST',
      body: JSON.stringify({ email: el('email').value, password: el('password').value })
    });
    token = data.accessToken;
    sessionStorage.setItem(tokenKey, token);
    await load();
    say('Your workspace is ready.');
  } catch (error) {
    say('Could not continue: ' + error.message);
  }
}

function enterLocalWorkspace() {
  const items = readLocalItems();
  const issue = localDataIssue;
  localMode = true;
  el('auth').hidden = true;
  el('workspace').hidden = false;
  el('switch-workspace').textContent = 'Use account workspace';
  el('export-backup').disabled = Boolean(issue);
  if (issue === 'corrupt') {
    el('workspace-mode').textContent = 'Saved local data could not be read and has not been changed. Restore a valid backup to replace it.';
    renderItems([]);
    say('Local data is unreadable. Restore a valid backup to recover.');
    return;
  }
  if (issue === 'unavailable') {
    el('workspace-mode').textContent = 'Browser storage is unavailable. Local data was not changed; enable storage and try again.';
    renderItems([]);
    say('Browser storage is unavailable. Local data was not changed.');
    return;
  }
  el('workspace-mode').textContent = 'Local entries stay in this browser profile and are not encrypted or uploaded. Clearing site data removes them.';
  renderItems(items);
  say('Local workspace ready. Items stay in this browser profile.');
}

function backupItems() {
  return currentItems.map((item) => ({
    title: item.title,
    ...(safeSourceUrl(item.sourceUrl) ? { sourceUrl: safeSourceUrl(item.sourceUrl) } : {}),
    ...(item.notes ? { notes: item.notes } : {}),
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));
}

function downloadBackup() {
  if (localMode && localDataIssue) {
    say(localDataIssue === 'corrupt'
      ? 'Local data is unreadable. Restore a valid backup before exporting.'
      : 'Browser storage is unavailable. No local backup was created.');
    return;
  }
  const backup = {
    format: 'buyfuse-workspace-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: backupItems()
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'buyfuse-workspace-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  say('Backup downloaded. Store the file somewhere private.');
}

async function restoreBackup(file) {
  if (file.size > 5000000) throw new Error('BACKUP_TOO_LARGE');
  const backup = JSON.parse(await file.text());
  if (backup?.format !== 'buyfuse-workspace-backup' || backup.version !== 1 ||
    !Array.isArray(backup.items) || backup.items.length > 1000) throw new Error('INVALID_BACKUP');
  const now = new Date().toISOString();
  const items = backup.items.map((item) => {
    if (!item || typeof item.title !== 'string' || item.title.trim().length < 2 || item.title.trim().length > 200)
      throw new Error('INVALID_BACKUP_ITEM');
    if (item.sourceUrl != null && typeof item.sourceUrl !== 'string') throw new Error('INVALID_BACKUP_URL');
    const rawUrl = typeof item.sourceUrl === 'string' ? item.sourceUrl : '';
    const sourceUrl = rawUrl ? safeSourceUrl(rawUrl) : null;
    if (rawUrl && !sourceUrl) throw new Error('INVALID_BACKUP_URL');
    if (item.notes != null && (typeof item.notes !== 'string' || item.notes.length > 2000)) throw new Error('INVALID_BACKUP_NOTES');
    if (!['CONSIDERING', 'PURCHASED', 'ARCHIVED'].includes(item.status)) throw new Error('INVALID_BACKUP_STATUS');
    return {
      title: item.title.trim(),
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(typeof item.notes === 'string' ? { notes: item.notes } : {}),
      status: item.status,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now
    };
  });
  if (localMode) {
    const restored = items.map((item) => ({ ...item, id: crypto.randomUUID() }));
    const existingItems = localDataIssue === 'corrupt' ? [] : readLocalItems();
    if (localDataIssue === 'unavailable') throw new Error('LOCAL_STORAGE_UNAVAILABLE');
    const replacingUnreadableData = localDataIssue === 'corrupt';
    const confirmation = replacingUnreadableData
      ? 'Replace unreadable local data with ' + items.length + ' backup item(s)? The original value will stay unchanged unless this restore succeeds.'
      : 'Add ' + items.length + ' backup item(s) to the selected workspace? Existing items will stay in place.';
    if (!window.confirm(confirmation)) return;
    const updated = replacingUnreadableData ? restored : [...restored, ...existingItems];
    writeLocalItems(updated);
    renderItems(updated);
    el('export-backup').disabled = false;
    say((replacingUnreadableData ? 'Recovered ' : 'Restored ') + restored.length + ' item(s) to this browser.');
    return;
  }

  if (!window.confirm('Add ' + items.length + ' backup item(s) to the account workspace? Existing items will stay in place.')) return;
  let restored = 0;
  try {
    for (const item of items) {
      const created = await api('/api/items', {
        method: 'POST',
        body: JSON.stringify({ title: item.title, sourceUrl: item.sourceUrl, notes: item.notes })
      });
      if (item.status !== 'CONSIDERING')
        await api('/api/items/' + created.id + '/status', { method: 'PATCH', body: JSON.stringify({ status: item.status }) });
      restored += 1;
    }
    await load();
    say('Restored ' + restored + ' item(s) to your account workspace.');
  } catch {
    await load().catch(() => {});
    say('Restore stopped after ' + restored + ' item(s). Your existing entries remain available.');
  }
}

el('login').onclick = () => authenticate('login');
el('register').onclick = () => authenticate('register');
el('local-workspace').onclick = enterLocalWorkspace;
el('switch-workspace').onclick = () => {
  if (!localMode) {
    enterLocalWorkspace();
    return;
  }
  localMode = false;
  if (token) {
    load().catch(() => {
      token = '';
      sessionStorage.removeItem(tokenKey);
      el('workspace').hidden = true;
      el('auth').hidden = false;
      say('Account workspace is unavailable. Your local entries remain in this browser.');
    });
  } else {
    el('workspace').hidden = true;
    el('auth').hidden = false;
    say('Local entries remain in this browser. Sign in to open an account workspace.');
  }
};

el('save-form').onsubmit = async (event) => {
  event.preventDefault();
  const title = el('title').value.trim();
  const rawUrl = el('source-url').value.trim();
  const sourceUrl = rawUrl ? safeSourceUrl(rawUrl) : null;
  if (rawUrl && !sourceUrl) {
    say('Use an HTTP or HTTPS link without embedded credentials or sensitive URL parameters.');
    return;
  }
  const notes = el('notes').value.trim();
  if (localMode) {
    const existingItems = readLocalItems();
    if (localDataIssue) {
      say(localDataIssue === 'corrupt'
        ? 'Saved local data is unreadable. Restore a valid backup before saving.'
        : 'Browser storage is unavailable. Local data was not changed.');
      return;
    }
    try {
      const now = new Date().toISOString();
      const item = {
        id: crypto.randomUUID(),
        title,
        ...(sourceUrl ? { sourceUrl } : {}),
        ...(notes ? { notes } : {}),
        status: 'CONSIDERING',
        createdAt: now,
        updatedAt: now
      };
      const updated = [item, ...existingItems];
      writeLocalItems(updated);
      event.target.reset();
      renderItems(updated);
      say('Saved only in this browser profile.');
    } catch {
      say('Could not save locally. Existing entries were left unchanged.');
    }
    return;
  }
  try {
    await api('/api/items', {
      method: 'POST',
      body: JSON.stringify({ title, sourceUrl: sourceUrl || undefined, notes: notes || undefined })
    });
    event.target.reset();
    await load();
    say('Item saved.');
  } catch (error) {
    say('Could not save: ' + error.message);
  }
};

el('export-backup').onclick = downloadBackup;
el('import-backup').onclick = () => el('backup-file').click();
el('backup-file').onchange = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await restoreBackup(file);
  } catch {
    say('Could not restore this file. Choose a valid BuyFuse JSON backup under 5 MB.');
  } finally {
    event.target.value = '';
  }
};

el('buyer-demo-form').onsubmit = (event) => {
  event.preventDefault();
  const title = el('demo-title').value.trim().slice(0, 100);
  const note = el('demo-note').value.trim().slice(0, 500);
  if (!title) {
    el('buyer-demo-result').textContent = 'Enter an item name.';
    return;
  }
  const status = el('demo-status').value;
  const lineBreak = String.fromCharCode(10);
  el('buyer-demo-result').textContent = 'Item: ' + title + lineBreak + 'Status: ' + status + lineBreak + 'Notes: ' +
    (note || 'No notes provided') + lineBreak + lineBreak + 'Simulated preview only · Not saved.';
};

if (token) load().catch(() => {
  token = '';
  try { sessionStorage.removeItem(tokenKey); } catch {}
});
`;
