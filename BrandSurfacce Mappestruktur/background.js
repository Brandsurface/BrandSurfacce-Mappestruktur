// background.js
const OFFSCREEN_URL = 'offscreen.html';

function sanitizeName(name) {
  const illegal = /[<>:"/\\|?*]/g;
  let out = (name || '').replace(illegal, ' ').replace(/\s+/g, ' ').trim();
  if (!out) out = 'Ny mappe';
  if (out.length > 120) out = out.slice(0, 120);
  return out;
}

// ── Notification (three layers) ───────────────────────────────────────────────
//
// Layer 1: Action badge on toolbar icon — guaranteed, zero extra permissions.
// Layer 2: Toast injected via toast.js — works on all normal web pages.
// Layer 3: Native Chrome notification — last resort (may be blocked by OS).

async function showToast(tabId, message, type, { retryable = false } = {}) {
  const isOk = type === 'ok';

  // Layer 1: coloured badge on extension icon (always visible).
  try {
    chrome.action.setBadgeBackgroundColor({ color: isOk ? '#16a34a' : '#dc2626' });
    chrome.action.setBadgeText({ text: isOk ? '✓' : '✗' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => {}), 4000);
  } catch (_) {}

  // Layer 2: floating toast in the current tab via injected file.
  if (tabId != null) {
    try {
      await chrome.storage.local.set({ __bs_toast_data: { message, type, ts: Date.now(), retryable } });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['toast.js'] });
      return; // success — skip native notification
    } catch (_) {}
  }

  // Layer 3: native Chrome notification fallback.
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: isOk ? 'Mappe oprettet' : 'Fejl',
      message,
    });
  } catch (_) {}
}

// ── Menu visibility ───────────────────────────────────────────────────────────

async function updateMenuVisibility() {
  const { hasPrimary = false, hasArchive = false } =
    await chrome.storage.local.get(['hasPrimary', 'hasArchive']);
  await Promise.allSettled([
    chrome.contextMenus.update('create-desktop-folder-from-selection', { visible: hasPrimary }),
    chrome.contextMenus.update('archive-folder-from-selection', { visible: hasArchive }),
  ]);
}

updateMenuVisibility();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if ('hasPrimary' in changes || 'hasArchive' in changes) updateMenuVisibility();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.contextMenus.create({
    id: 'create-desktop-folder-from-selection',
    title: 'BrandSurface jobmappe: "%s"',
    contexts: ['selection'],
    visible: false,
  });
  chrome.contextMenus.create({
    id: 'archive-folder-from-selection',
    title: 'BrandSurface arkivér: "%s"',
    contexts: ['selection'],
    visible: false,
  });
  chrome.contextMenus.create({
    id: 'select-desktop-folder',
    title: 'Indstillinger…',
    contexts: ['action'],
  });

  if (details.reason === 'update') {
    const existing = await chrome.storage.local.get(['hasPrimary']);
    if (!('hasPrimary' in existing)) {
      await chrome.storage.local.set({ hasPrimary: true, hasArchive: false });
    }
  }

  await updateMenuVisibility();
});

// ── Offscreen document ────────────────────────────────────────────────────────

let _ensuringOffscreen = null;

async function ensureOffscreen() {
  if (_ensuringOffscreen) return _ensuringOffscreen;
  _ensuringOffscreen = _doEnsureOffscreen().finally(() => { _ensuringOffscreen = null; });
  return _ensuringOffscreen;
}

async function _doEnsureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['DOM_SCRAPING'],
    justification: 'Opret mapper med File System Access ved brug af gemt mappe-handle.',
  });
  await new Promise(r => setTimeout(r, 80));
}

function askOffscreen(msg, retries = 3) {
  return new Promise((resolve) => {
    const port = chrome.runtime.connect({ name: 'offscreen' });
    let settled = false;

    function settle(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    }

    const timer = setTimeout(() => {
      port.disconnect();
      settle({ status: 'error', message: 'Timeout: offscreen dokument svarede ikke.' });
    }, 8000);

    port.onMessage.addListener((resp) => {
      port.disconnect();
      settle(resp);
    });

    port.onDisconnect.addListener(() => {
      if (settled) return;
      clearTimeout(timer);
      settled = true;
      if (retries > 0) {
        setTimeout(() => askOffscreen(msg, retries - 1).then(resolve), 150);
      } else {
        resolve({ status: 'error', message: 'Forbindelsen til offscreen dokument blev afbrudt.' });
      }
    });

    port.postMessage(msg);
  });
}

// ── Folder creation ───────────────────────────────────────────────────────────

// Run the actual folder creation in the offscreen document.
async function createViaOffscreen({ folderName, prefix, handleKey }) {
  try {
    await ensureOffscreen();
    return await askOffscreen({ type: 'create-folder', folderName, prefix, handleKey });
  } catch (e) {
    return { status: 'error', message: String(e?.message || e) };
  }
}

// Turn an offscreen response into user-visible feedback.
async function notifyResult(tabId, resp) {
  if (resp?.status === 'missing-handle') {
    chrome.runtime.openOptionsPage();
    await showToast(tabId, 'Ingen destination valgt – åbner indstillinger…', 'error');
  } else if (resp?.status === 'ok') {
    await showToast(tabId, resp.message, 'ok');
  } else if (resp?.status === 'error') {
    await showToast(tabId, resp.message || 'Kunne ikke oprette mapperne.', 'error');
  } else {
    await showToast(tabId, 'Ukendt svar fra extension – prøv igen.', 'error');
  }
}

// Try to open the extension popup so the user can (re-)grant access to a
// pending job's handle, and show a red toast either way. The toast is always
// clickable ('retryable') so the user can re-trigger this from the page too —
// e.g. if the popup opened but got closed/missed, or the auto-open failed.
async function offerPermissionRetry(tabId) {
  let opened = false;
  try {
    await chrome.action.openPopup();
    opened = true;
  } catch (_) {}
  await showToast(
    tabId,
    opened
      ? 'Adgang udløbet – bekræft i vinduet, så oprettes mappen automatisk.'
      : 'Adgang udløbet – klik her for at åbne godkendelse.',
    'error',
    { retryable: true },
  );
  return opened;
}

async function handleFolderAction(info, tab, handleKey) {
  const tabId = tab?.id ?? null;
  const folderName = sanitizeName(info.selectionText);
  const { prefix = 'XX' } = await chrome.storage.sync.get('prefix');

  const resp = await createViaOffscreen({ folderName, prefix, handleKey });

  if (resp?.status === 'need-permission') {
    // Permission resets after a Chrome restart. Stash the request so the popup
    // (or a later retry click on the toast) can finish it after the user
    // re-grants.
    await chrome.storage.local.set({
      __bs_pending: { handleKey, folderName, prefix, tabId, ts: Date.now() },
    });
    await offerPermissionRetry(tabId);
    return;
  }

  await notifyResult(tabId, resp);
}

// The popup tells us it just re-granted permission; finish the pending job.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'permission-granted') return;
  (async () => {
    const { __bs_pending: pending } = await chrome.storage.local.get('__bs_pending');
    if (!pending) { sendResponse({ status: 'no-pending' }); return; }
    await chrome.storage.local.remove('__bs_pending');
    const resp = await createViaOffscreen({
      folderName: pending.folderName,
      prefix: pending.prefix,
      handleKey: pending.handleKey,
    });
    await notifyResult(pending.tabId ?? null, resp);
    sendResponse(resp);
  })();
  return true; // keep the message channel open for the async response
});

// The red "adgang udløbet" toast was clicked — try again to open the popup
// for whatever job is still pending.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'retry-permission') return;
  (async () => {
    const { __bs_pending: pending } = await chrome.storage.local.get('__bs_pending');
    if (!pending) { sendResponse({ status: 'no-pending' }); return; }
    const opened = await offerPermissionRetry(pending.tabId ?? null);
    sendResponse({ opened });
  })();
  return true; // keep the message channel open for the async response
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'select-desktop-folder') {
    chrome.runtime.openOptionsPage();
    return;
  }
  try {
    if (info.menuItemId === 'create-desktop-folder-from-selection') {
      await handleFolderAction(info, tab, 'desktopDir');
    } else if (info.menuItemId === 'archive-folder-from-selection') {
      await handleFolderAction(info, tab, 'archiveDir');
    }
  } catch (e) {
    // Last-resort: if everything above throws, at least show a badge.
    try {
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
      chrome.action.setBadgeText({ text: '✗' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }).catch(() => {}), 4000);
    } catch (_) {}
  }
});
