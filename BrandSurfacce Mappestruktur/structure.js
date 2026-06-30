// structure.js — delt standard-mappestruktur + lagring og tree-hjælpere.
// Indlæses i både options.html (editoren) og offscreen.html (oprettelsen).

const DEFAULT_STRUCTURE = [
  "01_Management/01_Correspondence",
  "01_Management/01_Quote",
  "01_Management/01_Project management",
  "02_Start-up material/02_From client",
  "02_Start-up material/02_From previous job",
  "03_WIP/03_Links",
  "03_WIP/03_YY.MM.DD_{INIT}",
  "04_Final/04_Approval",
  "04_Final/04_Artwork",
];

// Strukturen gemmes i IndexedDB (via idb.js), fordi det er det eneste lager der
// er tilgængeligt i BÅDE service worker og offscreen-dokument. chrome.storage
// virker IKKE i offscreen-dokumenter.
const STRUCTURE_KEY = 'structure';

// Hent den gemte struktur (array af relative stier) eller fald tilbage til standard.
async function loadStructure() {
  try {
    const structure = await idbGet(STRUCTURE_KEY);
    if (Array.isArray(structure) && structure.length) return structure;
  } catch (_) {}
  return DEFAULT_STRUCTURE.slice();
}

async function saveStructure(paths) {
  await idbSet(STRUCTURE_KEY, paths);
}

// Rens et enkelt mappenavn: fjern stiseparatorer og ulovlige tegn, behold { } og .
function sanitizeFolderName(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

// Bruges af editoren til at give hver node et unikt id.
let _structIdCounter = 0;

// Lav nested tree ud fra en liste af stier ("a/b/c").
function pathsToTree(paths) {
  const root = [];
  for (const p of paths) {
    const parts = String(p).split('/').filter(Boolean);
    let level = root;
    for (const part of parts) {
      let node = level.find((n) => n.name === part);
      if (!node) {
        node = { id: ++_structIdCounter, name: part, children: [] };
        level.push(node);
      }
      level = node.children;
    }
  }
  return root;
}

// Lav liste af blad-stier ud fra et tree (forældre oprettes automatisk via stien).
function treeToPaths(tree) {
  const out = [];
  const walk = (nodes, prefix) => {
    for (const n of nodes) {
      const name = sanitizeFolderName(n.name);
      if (!name) continue;
      const full = prefix ? `${prefix}/${name}` : name;
      if (n.children && n.children.length) walk(n.children, full);
      else out.push(full);
    }
  };
  walk(tree, '');
  return out;
}
