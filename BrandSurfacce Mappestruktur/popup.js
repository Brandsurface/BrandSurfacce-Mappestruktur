// popup.js
const STATE_EL_ID = { desktopDir: 'state', archiveDir: 'archiveState' };

document.addEventListener('DOMContentLoaded', async () => {
  const openLink = document.getElementById('open');
  openLink?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // A folder creation may be waiting for a permission re-grant (set by the
  // background service worker when access had expired after a restart).
  let pending = null;
  try {
    ({ __bs_pending: pending } = await chrome.storage.local.get('__bs_pending'));
  } catch (_) {}

  let pendingResolved = false;

  // Tell the background to finish the pending job, then close this popup.
  async function resumePending(stateEl) {
    if (pendingResolved) return;
    pendingResolved = true;
    if (stateEl) {
      stateEl.textContent = 'Opretter mappe…';
      stateEl.className = 'muted';
    }
    try {
      await chrome.runtime.sendMessage({ type: 'permission-granted' });
    } catch (_) {}
    setTimeout(() => window.close(), 600);
  }

  // Try to silently finish the pending job as the very first thing this popup
  // does, before any other DOM/IndexedDB work: every extra await before
  // requestPermission() risks losing the user-activation window carried over
  // from the click that opened this popup — that's the difference between
  // this popup auto-closing itself ("just pressing the button" for the user)
  // and the user having to click "Giv adgang" manually below. If this fails,
  // the normal per-handle UI further down still offers that manual fallback.
  if (pending) {
    try {
      const handle = await idbGet(pending.handleKey);
      if (handle) {
        const stateEl = document.getElementById(STATE_EL_ID[pending.handleKey]);
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          await resumePending(stateEl);
        } else if (perm !== 'denied') {
          const r = await handle.requestPermission({ mode: 'readwrite' });
          if (r === 'granted') {
            try { await navigator.storage?.persist?.(); } catch (_) {}
            await resumePending(stateEl);
          }
        }
      }
    } catch (_) { /* fall through — the normal per-handle UI below still works */ }
  }

  async function setupHandleUI(idbKey, stateEl, grantBtn) {
    let handle = null;
    try {
      handle = await idbGet(idbKey);
    } catch (_) {}

    if (!handle) {
      stateEl.textContent = `Ikke valgt. Gå til indstillinger.`;
      stateEl.className = 'muted';
      grantBtn.style.display = 'none';
      return;
    }

    async function onGranted() {
      // Reinforce persistence so Chrome remembers the choice across restarts.
      try { await navigator.storage?.persist?.(); } catch (_) {}
      stateEl.textContent = `✓ ${handle.name} – adgang aktiv.`;
      stateEl.className = 'ok';
      grantBtn.style.display = 'none';
      if (pending && pending.handleKey === idbKey) await resumePending(stateEl);
    }

    // Permanently denied ('Block' was chosen) — requestPermission() will never
    // show a prompt again for this handle, so a "Giv adgang" button here would
    // just silently fail. The only way forward is picking the folder again.
    function showDenied() {
      stateEl.textContent =
        `${handle.name} – adgang afvist permanent. Vælg mappen igen via "Åbn indstillinger" nedenfor.`;
      stateEl.className = 'err';
      grantBtn.style.display = 'none';
    }

    async function refresh() {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        stateEl.textContent = `✓ ${handle.name} – adgang aktiv.`;
        stateEl.className = 'ok';
        grantBtn.style.display = 'none';
        if (pending && pending.handleKey === idbKey) await resumePending(stateEl);
      } else if (perm === 'denied') {
        showDenied();
      } else {
        stateEl.textContent = `${handle.name} – adgang udløbet.`;
        stateEl.className = 'muted';
        grantBtn.style.display = 'inline-block';
      }
    }

    grantBtn.addEventListener('click', async () => {
      try {
        const perm = await handle.requestPermission({ mode: 'readwrite' });
        if (perm === 'denied') {
          showDenied();
          return;
        }
        if (perm !== 'granted') {
          stateEl.textContent = 'Adgang afvist.';
          stateEl.className = 'err';
          return;
        }
        await onGranted();
      } catch (e) {
        stateEl.textContent = 'Fejl: ' + (e?.message || e);
        stateEl.className = 'err';
      }
    });

    await refresh();
  }

  await setupHandleUI(
    'desktopDir',
    document.getElementById('state'),
    document.getElementById('grant')
  );

  await setupHandleUI(
    'archiveDir',
    document.getElementById('archiveState'),
    document.getElementById('grantArchive')
  );
});
