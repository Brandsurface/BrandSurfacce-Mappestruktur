// popup.js
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

  // After re-granting, tell the background to finish the pending job, then close.
  async function resumePending(stateEl) {
    if (!pending) return;
    stateEl.textContent = 'Opretter mappe…';
    stateEl.className = 'muted';
    try {
      await chrome.runtime.sendMessage({ type: 'permission-granted' });
    } catch (_) {}
    setTimeout(() => window.close(), 600);
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

    async function refresh() {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        stateEl.textContent = `✓ ${handle.name} – adgang aktiv.`;
        stateEl.className = 'ok';
        grantBtn.style.display = 'none';
        if (pending && pending.handleKey === idbKey) await resumePending(stateEl);
      } else {
        stateEl.textContent = `${handle.name} – adgang udløbet.`;
        stateEl.className = 'muted';
        grantBtn.style.display = 'inline-block';
      }
    }

    grantBtn.addEventListener('click', async () => {
      try {
        const perm = await handle.requestPermission({ mode: 'readwrite' });
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

    // If a job is waiting on this exact handle, try to re-grant automatically.
    // The popup opened from an icon click carries user activation, so
    // requestPermission() may run without a second click (and silently when
    // "Allow on every visit" was chosen). Fall back to the button on failure.
    if (pending && pending.handleKey === idbKey) {
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        try {
          const r = await handle.requestPermission({ mode: 'readwrite' });
          if (r === 'granted') { await onGranted(); return; }
        } catch (_) { /* no activation / old browser → show button */ }
      }
    }

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
