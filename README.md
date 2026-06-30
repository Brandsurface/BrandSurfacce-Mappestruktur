# 📁 BrandSurface Jobmappe

> Chrome-udvidelse der lader dig **højreklikke på markeret tekst** og med ét klik
> oprette en komplet jobmappe med BrandSurfaces faste mappestruktur — direkte på din
> valgte disk.

<p>
  <img alt="Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-blue">
  <img alt="Version" src="https://img.shields.io/badge/version-1.7.2-green">
  <img alt="Krav" src="https://img.shields.io/badge/Chrome-127%2B-orange">
</p>

© BrandSurface 2025 og Lars Sohl

---

## ✨ Hvad gør den?

Markér et jobnavn på en hvilken som helst webside, **højreklik → "BrandSurface
jobmappe"**, og udvidelsen opretter automatisk en mappe med det navn — fyldt med den
faste undermappestruktur (Management, Start-up material, WIP, Final). Du kan have to
destinationer: en **primær** til daglige jobs og en **arkivdestination**.

```
<Jobnavn>/
├─ 01_Management/        (Correspondence · Quote · Project management)
├─ 02_Start-up material/ (From client · From previous job)
├─ 03_WIP/               (Links · 03_YY.MM.DD_<INIT>)
└─ 04_Final/             (Approval · Artwork)
```

Datoen og dine initialer indsættes automatisk, og strukturen kan tilpasses i
indstillingerne.

---

## 🚀 Kom hurtigt i gang

1. **Hent koden** — `git clone` dette repo, eller download som ZIP og pak ud.
2. Åbn `chrome://extensions` og slå **Udviklertilstand / Developer mode** til.
3. Klik **Indlæs upakket / Load unpacked** og vælg mappen
   [`BrandSurfacce Mappestruktur/`](./BrandSurfacce%20Mappestruktur).
4. Åbn udvidelsens **indstillinger**, sæt dine **initialer** og vælg en **destination**
   (vælg *"Tillad ved hvert besøg"* i Chromes dialog).
5. Markér tekst på en side → højreklik → **BrandSurface jobmappe** ✅

> **Krav:** Chrome **127 eller nyere** (tjek under `chrome://version`).

---

## 📖 Fuld dokumentation

Den detaljerede vejledning — førstegangsopsætning, daglig brug, tilpasning af
strukturen, adgang efter genstart, indstillinger, fejlfinding og teknisk beskrivelse —
ligger her:

➡️ **[BrandSurfacce Mappestruktur/README.md](./BrandSurfacce%20Mappestruktur/README.md)**

---

## 🗂️ Projektets filer

Alle udvidelsens filer ligger i mappen `BrandSurfacce Mappestruktur/`:

| Fil | Rolle |
|---|---|
| `manifest.json` | Udvidelsens definition og rettigheder (Manifest V3) |
| `background.js` | Service worker: højreklik-menu, auto-popup, genoptag job |
| `offscreen.js` · `offscreen.html` | Opretter mapperne på disken (File System Access API) |
| `popup.js` · `popup.html` | Lille vindue: status og fornyelse af adgang |
| `options.js` · `options.html` | Indstillinger: initialer, destinationer + struktur-editor |
| `structure.js` | Standardstruktur + lagring og tree-hjælpere (delt) |
| `idb.js` | Gemmer/henter mappehåndtag i IndexedDB |
| `toast.js` | Viser bekræftelse på siden efter oprettelse |
| `icon16/48/128.png` | Udvidelsens ikoner |

---

## 🔒 Sådan virker det kort

Mappehåndtaget (`FileSystemDirectoryHandle`) gemmes i **IndexedDB** og overlever
genstart. Selve oprettelsen sker via **File System Access API** i et offscreen-dokument.
Efter en browser-genstart nulstiller Chrome af sikkerhedshensyn kun *adgangstilladelsen*
— dit valg af disk huskes, og adgangen fornys automatisk ved første mappeoprettelse.

---

<sub>© BrandSurface 2025 og Lars Sohl · Manifest V3 Chrome-udvidelse</sub>
