// options.js
(async () => {
  // --- Initialer / prefix ---
  const prefixInput = document.getElementById('prefix');

  const { prefix = 'XX' } = await chrome.storage.sync.get('prefix');
  prefixInput.value = prefix;

  function cleanPrefix(v) {
    return (v || '').replace(/[<>:"/\\|?*\s]/g, '').slice(0, 20).toUpperCase();
  }

  // --- Persistent storage ---
  // Required so Chrome reliably keeps the stored handle (and remembers the
  // "Allow on every visit" grant) across restarts. Returns true if persistent.
  async function ensurePersistentStorage() {
    try {
      if (await navigator.storage?.persisted?.()) return true;
      return !!(await navigator.storage?.persist?.());
    } catch (_) {
      return false;
    }
  }

  // --- Hjælpefunktion til at vise gemt mappe ---
  async function showSavedDir(idbKey, statusEl, clearBtn) {
    try {
      const saved = await idbGet(idbKey);
      if (saved) {
        statusEl.textContent = `Gemt: ${saved.name}`;
        statusEl.className = 'ok';
        clearBtn.style.display = 'inline-block';
      } else {
        statusEl.textContent = 'Ikke valgt endnu.';
        statusEl.className = 'muted';
        clearBtn.style.display = 'none';
      }
    } catch (_) {}
  }

  // --- Primær destination ---
  const pickBtn = document.getElementById('pick');
  const status = document.getElementById('status');
  const clearPrimaryBtn = document.getElementById('clearPrimary');

  await showSavedDir('desktopDir', status, clearPrimaryBtn);

  pickBtn.addEventListener('click', async () => {
    try {
      const handle = await window.showDirectoryPicker({ id: 'pick-desktop', mode: 'readwrite' });
      await idbSet('desktopDir', handle);
      await chrome.storage.local.set({ hasPrimary: true });
      await ensurePersistentStorage(); // best-effort; udvidelsens data er holdbar uanset
      status.textContent = `Primær destination gemt: ${handle.name}`;
      status.className = 'ok';
      clearPrimaryBtn.style.display = 'inline-block';
    } catch (e) {
      if (e?.name !== 'AbortError') {
        status.textContent = 'Fejl ved valg: ' + (e?.message || e);
        status.className = 'err';
      } else {
        status.textContent = 'Valg af mappe annulleret.';
        status.className = 'muted';
      }
    }
  });

  clearPrimaryBtn.addEventListener('click', async () => {
    await idbDelete('desktopDir');
    await chrome.storage.local.set({ hasPrimary: false });
    status.textContent = 'Primær destination fjernet.';
    status.className = 'muted';
    clearPrimaryBtn.style.display = 'none';
  });

  // --- Arkivdestination ---
  const pickArchiveBtn = document.getElementById('pickArchive');
  const archiveStatus = document.getElementById('archiveStatus');
  const clearArchiveBtn = document.getElementById('clearArchive');

  await showSavedDir('archiveDir', archiveStatus, clearArchiveBtn);

  pickArchiveBtn.addEventListener('click', async () => {
    try {
      const handle = await window.showDirectoryPicker({ id: 'pick-archive', mode: 'readwrite' });
      await idbSet('archiveDir', handle);
      await chrome.storage.local.set({ hasArchive: true });
      await ensurePersistentStorage(); // best-effort; udvidelsens data er holdbar uanset
      archiveStatus.textContent = `Arkivdestination gemt: ${handle.name}`;
      archiveStatus.className = 'ok';
      clearArchiveBtn.style.display = 'inline-block';
    } catch (e) {
      if (e?.name !== 'AbortError') {
        archiveStatus.textContent = 'Fejl ved valg: ' + (e?.message || e);
        archiveStatus.className = 'err';
      } else {
        archiveStatus.textContent = 'Valg af mappe annulleret.';
        archiveStatus.className = 'muted';
      }
    }
  });

  clearArchiveBtn.addEventListener('click', async () => {
    await idbDelete('archiveDir');
    await chrome.storage.local.set({ hasArchive: false });
    archiveStatus.textContent = 'Arkivdestination fjernet.';
    archiveStatus.className = 'muted';
    clearArchiveBtn.style.display = 'none';
  });

  // --- Mappestruktur-editor ---
  const treeContainer = document.getElementById('treeContainer');
  const addRootBtn = document.getElementById('addRoot');
  const resetStructBtn = document.getElementById('resetStruct');

  // Migrér evt. tidligere struktur (gemt i chrome.storage før v1.6.4) til IndexedDB.
  try {
    const existing = await idbGet('structure');
    if (!(Array.isArray(existing) && existing.length)) {
      const { structure: legacy } = await chrome.storage.sync.get('structure');
      if (Array.isArray(legacy) && legacy.length) await idbSet('structure', legacy);
    }
  } catch (_) {}

  let structureTree = pathsToTree(await loadStructure());

  function newNode(name) {
    return { id: ++_structIdCounter, name: name || 'Ny mappe', children: [] };
  }

  // Find en node (og dens container-array + forælder) ud fra id.
  function locate(nodes, id, parent = null) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { arr: nodes, index: i, parent };
      const r = locate(nodes[i].children, id, nodes[i]);
      if (r) return r;
    }
    return null;
  }

  function iconBtn(label, title, onClick, extra) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = title;
    b.className = 'tree-btn' + (extra ? ' ' + extra : '');
    b.addEventListener('click', onClick);
    return b;
  }

  function buildItem(node) {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'tree-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tree-name';
    input.value = node.name;
    input.addEventListener('input', () => { node.name = input.value; });

    row.appendChild(input);
    row.appendChild(iconBtn('⬆', 'Flyt op', () => move(node.id, -1)));
    row.appendChild(iconBtn('⬇', 'Flyt ned', () => move(node.id, +1)));
    row.appendChild(iconBtn('⬅', 'Ryk ud', () => outdent(node.id)));
    row.appendChild(iconBtn('➡', 'Ryk ind (undermappe)', () => indent(node.id)));
    row.appendChild(iconBtn('＋', 'Tilføj undermappe', () => addChild(node.id)));
    row.appendChild(iconBtn('🗑', 'Slet', () => removeNode(node.id), 'danger'));

    li.appendChild(row);
    if (node.children && node.children.length) li.appendChild(buildList(node.children));
    return li;
  }

  function buildList(nodes) {
    const ul = document.createElement('ul');
    ul.className = 'tree';
    nodes.forEach((node) => ul.appendChild(buildItem(node)));
    return ul;
  }

  function renderTree() {
    treeContainer.innerHTML = '';
    if (structureTree.length) {
      treeContainer.appendChild(buildList(structureTree));
    } else {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Ingen mapper – tilføj en hovedmappe.';
      treeContainer.appendChild(p);
    }
  }

  function removeNode(id) {
    const l = locate(structureTree, id);
    if (l) { l.arr.splice(l.index, 1); renderTree(); }
  }
  function addChild(id) {
    const l = locate(structureTree, id);
    if (l) { l.arr[l.index].children.push(newNode()); renderTree(); }
  }
  function move(id, dir) {
    const l = locate(structureTree, id);
    if (!l) return;
    const j = l.index + dir;
    if (j < 0 || j >= l.arr.length) return;
    [l.arr[l.index], l.arr[j]] = [l.arr[j], l.arr[l.index]];
    renderTree();
  }
  function indent(id) {
    const l = locate(structureTree, id);
    if (!l || l.index === 0) return; // kan kun rykke ind under en forrige søskende
    const node = l.arr.splice(l.index, 1)[0];
    l.arr[l.index - 1].children.push(node);
    renderTree();
  }
  function outdent(id) {
    const l = locate(structureTree, id);
    if (!l || !l.parent) return; // allerede på øverste niveau
    const node = l.arr.splice(l.index, 1)[0];
    const g = locate(structureTree, l.parent.id);
    g.arr.splice(g.index + 1, 0, node);
    renderTree();
  }

  addRootBtn.addEventListener('click', () => { structureTree.push(newNode()); renderTree(); });
  resetStructBtn.addEventListener('click', () => {
    structureTree = pathsToTree(DEFAULT_STRUCTURE.slice());
    renderTree();
  });

  renderTree();

  // --- Gem alle indstillinger + samlet bekræftelse ---
  const saveAllBtn = document.getElementById('saveAll');
  const saveStatus = document.getElementById('saveStatus');

  const saveBtnLabel = saveAllBtn.textContent;

  saveAllBtn.addEventListener('click', async () => {
    saveStatus.textContent = 'Gemmer…';
    saveStatus.className = 'savebox muted';
    try {
      // 1) Gem initialer.
      const value = cleanPrefix(prefixInput.value) || 'XX';
      prefixInput.value = value;
      await chrome.storage.sync.set({ prefix: value });

      // 2) Rens mappenavne og gem mappestrukturen.
      (function clean(nodes) {
        nodes.forEach((n) => { n.name = sanitizeFolderName(n.name) || 'Ny mappe'; clean(n.children); });
      })(structureTree);
      renderTree();
      const structurePaths = treeToPaths(structureTree);
      await saveStructure(structurePaths);

      // 3) Verificér ved at læse værdierne tilbage fra lageret.
      const savedPrefix = (await chrome.storage.sync.get('prefix')).prefix;
      const savedStructure = await idbGet('structure');
      const prefixOk = savedPrefix === value;
      const structOk = Array.isArray(savedStructure) && savedStructure.length === structurePaths.length;
      if (!prefixOk || !structOk) {
        throw new Error('Kunne ikke bekræfte at indstillingerne blev gemt. Prøv igen.');
      }

      // 4) Best-effort persistent storage (udvidelsens data er holdbar uanset).
      await ensurePersistentStorage();

      // 5) Læs de aktuelt gemte destinationer tilbage til bekræftelsen.
      let primaryName = 'ikke valgt';
      let archiveName = 'ikke valgt';
      try { const p = await idbGet('desktopDir'); if (p) primaryName = p.name; } catch (_) {}
      try { const a = await idbGet('archiveDir'); if (a) archiveName = a.name; } catch (_) {}

      // 6) Vis tydelig, verificeret bekræftelse.
      const time = new Date().toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
      const msg =
        `✓ Gemt og bekræftet (kl. ${time})\n` +
        `• Initialer: ${value}\n` +
        `• Primær destination: ${primaryName}\n` +
        `• Arkivdestination: ${archiveName}\n` +
        `• Mappestruktur: ${structurePaths.length} mapper`;
      saveStatus.textContent = msg;
      saveStatus.className = 'savebox ok';

      // Kort visuel kvittering på selve knappen.
      saveAllBtn.textContent = '✓ Gemt!';
      saveAllBtn.disabled = true;
      setTimeout(() => { saveAllBtn.textContent = saveBtnLabel; saveAllBtn.disabled = false; }, 1800);
    } catch (e) {
      saveStatus.textContent = '✗ Kunne ikke gemme: ' + (e?.message || e);
      saveStatus.className = 'savebox err';
    }
  });
})();
