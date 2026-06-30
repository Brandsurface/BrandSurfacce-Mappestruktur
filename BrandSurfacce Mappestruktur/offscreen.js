// offscreen.js
// Creates a root folder and a predefined subfolder structure.

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'offscreen') return;
  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'create-folder') {
      const handleKey = msg.handleKey || 'desktopDir';
      const res = await createJobFolder(msg.folderName, msg.prefix, handleKey);
      // Background may have timed out and disconnected the port already; ignore the error.
      try { port.postMessage(res); } catch (_) {}
    }
  });
});

async function ensurePath(dirHandle, path) {
  const parts = path.split('/').filter(Boolean);
  let current = dirHandle;
  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

function sanitizePrefix(prefix) {
  // Keep folder names valid: strip illegal/whitespace chars, fall back to 'XX'.
  const out = (prefix || '').replace(/[<>:"/\\|?*\s]/g, '').slice(0, 20);
  return out || 'XX';
}

async function createJobFolder(rootName, prefix, handleKey = 'desktopDir') {
  try {
    const desktop = await idbGet(handleKey);
    if (!desktop) return { status: 'missing-handle' };
    // Only query here: the offscreen document has no user activation, so
    // requestPermission() cannot show a prompt. Re-granting happens from the
    // popup (which has a user gesture). See popup.js.
    const perm = await desktop.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return { status: 'need-permission' };

    const root = await desktop.getDirectoryHandle(rootName, { create: true });

    // Generate current date in YY.MM.DD format
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yy}.${mm}.${dd}`;

    const initials = sanitizePrefix(prefix);

    const structureList = await loadStructure();
    for (const rel of structureList) {
      // Replace the YY.MM.DD placeholder with today's date and {INIT} with the
      // initials chosen in the extension's settings.
      let pathWithDynamics = rel.replace(/YY\.MM\.DD/g, dateStr);
      pathWithDynamics = pathWithDynamics.replace(/\{INIT\}/g, initials);
      await ensurePath(root, pathWithDynamics);
    }
    const label = handleKey === 'archiveDir' ? 'Arkivmappe' : 'Jobmappe';
    return { status: 'ok', message: `${label} oprettet: ${rootName}` };
  } catch (e) {
    // Map a missing/disconnected destination to a clear Danish message instead
    // of a raw technical string (e.g. drive unplugged or folder deleted).
    const name = e && e.name;
    const text = String(e && e.message || e);
    if (name === 'NotFoundError' || /could not be found|not be found|no longer exists/i.test(text)) {
      return { status: 'error', message: 'Mappen/disken kunne ikke findes – er den tilgængelig? Vælg evt. destinationen igen i indstillinger.' };
    }
    return { status: 'error', message: text };
  }
}