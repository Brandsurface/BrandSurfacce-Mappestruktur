# BrandSurface Jobmappe

Chrome-udvidelse der lader dig **højreklikke på markeret tekst** og med ét klik oprette
en jobmappe med BrandSurfaces faste mappestruktur — direkte på din valgte disk.

> © BrandSurface 2025 og Lars Sohl

---

## Indhold
- [Hvad gør udvidelsen?](#hvad-gør-udvidelsen)
- [Installation](#installation)
- [Førstegangsopsætning](#førstegangsopsætning)
- [Daglig brug](#daglig-brug)
- [Mappestrukturen](#mappestrukturen)
- [Adgang og genstart (vigtigt)](#adgang-og-genstart-vigtigt)
- [Indstillinger](#indstillinger)
- [Fejlfinding](#fejlfinding)
- [Sådan virker det (teknisk)](#sådan-virker-det-teknisk)

---

## Hvad gør udvidelsen?

Du markerer fx et jobnavn på en webside, højreklikker og vælger **"BrandSurface
jobmappe"**. Udvidelsen opretter automatisk en mappe med det markerede navn og fylder den
med den faste undermappestruktur (Management, Start-up material, WIP, Final osv.).

Du kan have **to destinationer**:
- **Primær jobmappe** – hvor nye jobs oprettes til daglig.
- **Arkivdestination** – til arkivering (samme struktur, anden placering).

---

## Installation

1. Download/klon koden:
   ```
   git clone https://github.com/Brandsurface/BrandSurface-Jobmappe.git
   ```
   (eller download som ZIP og pak ud)
2. Åbn Chrome og gå til `chrome://extensions`.
3. Slå **"Udviklertilstand" / "Developer mode"** til (øverst til højre).
4. Klik **"Indlæs upakket" / "Load unpacked"** og vælg mappen med filerne.
5. Udvidelsen **BrandSurface Jobmappe** dukker nu op i værktøjslinjen.

> **Krav:** Chrome **version 127 eller nyere** (tjek under `chrome://version`).
> Den fulde automatik efter genstart kræver denne version.

---

## Førstegangsopsætning

1. Klik på **BrandSurface-ikonet** i værktøjslinjen → **"Åbn indstillinger"**
   (eller højreklik på ikonet → "Indstillinger…").
2. **Vælg dine initialer** (fx `LS`) under *Initialer* og tryk **Gem**.
   Initialerne bruges i mappenavnet `03_YY.MM.DD_{INIT}`.
3. Klik **"Vælg primær destination"** og peg på den mappe/disk hvor jobs skal oprettes.
4. I Chromes tilladelsesdialog: **vælg "Tillad ved hvert besøg" / "Allow on every
   visit"**. Det er nøglen til at adgangen huskes bedst muligt efter genstart.
5. (Valgfrit) Gentag med **"Vælg arkivdestination"** hvis du vil bruge arkivering.

Når status viser *"Primær destination gemt: …"* er du klar.

---

## Daglig brug

1. **Markér** den tekst der skal være mappenavn (fx kundens/jobbets navn) på en side.
2. **Højreklik** → vælg **"BrandSurface jobmappe: …"** (eller **"BrandSurface arkivér:
   …"** for arkivdestinationen).
3. Mappen og hele strukturen oprettes. Du får en bekræftelse:
   - en grøn ✓ på udvidelsesikonet,
   - en lille besked (toast) på siden.

Ulovlige filtegn i navnet fjernes automatisk, og navnet forkortes til maks. 120 tegn.

---

## Mappestrukturen

Hver ny jobmappe oprettes med følgende undermapper:

```
<Jobnavn>/
├─ 01_Management/
│  ├─ 01_Correspondence
│  ├─ 01_Quote
│  └─ 01_Project management
├─ 02_Start-up material/
│  ├─ 02_From client
│  └─ 02_From previous job
├─ 03_WIP/
│  ├─ 03_Links
│  └─ 03_YY.MM.DD_<INIT>      ← dags dato + dine initialer
└─ 04_Final/
   ├─ 04_Approval
   └─ 04_Artwork
```

- `YY.MM.DD` udfyldes automatisk med **dagens dato** (fx `26.06.29`).
- `<INIT>` erstattes med dine **initialer** fra indstillingerne (fx `LS`).

### Tilpas strukturen selv

Strukturen ovenfor er kun **standarden**. I indstillingerne kan du under
*Mappestruktur* selv:

- **oprette** mapper (➕ Tilføj hovedmappe / ＋ undermappe),
- **omdøbe** ved at skrive direkte i feltet,
- **slette** mapper (🗑),
- **ændre hierarkiet** med pilene: ⬆⬇ flytter op/ned, ⬅ rykker ud, ➡ rykker ind
  (gør mappen til undermappe af mappen ovenfor).

Brug stadig `YY.MM.DD` og `{INIT}` i et mappenavn for dato/initialer. Tryk
**"Gem indstillinger"** for at gemme. Du kan altid trykke **"Nulstil til standard"**.

---

## Adgang og genstart (vigtigt)

**Dit valg af disk/mappe huskes permanent** — også efter genstart. Det er kun
*adgangstilladelsen* som Chrome af sikkerhedshensyn nulstiller, hver gang browseren
genstartes (eller udvidelsen opdateres).

Sådan håndterer udvidelsen det:

- **Samme Chrome-session:** ingen klik — det virker bare.
- **Efter genstart:** Når du første gang opretter en mappe, åbnes udvidelsens lille
  vindue **automatisk**, adgangen **fornys** (uden dialog når du har valgt *"Tillad ved
  hvert besøg"*), og **mappen oprettes derefter automatisk**. Det er altså **ét klik** —
  og det færdiggør samtidig jobbet.

> Chromes sikkerhedsmodel tillader ikke at fjerne dét ene klik helt efter en *fuld*
> genstart. Udvidelsen gør det så gnidningsfrit som muligt.

Skulle automatikken ikke kunne køre (ældre browser, eller Chrome blokerer), vises i
stedet knappen **"Giv adgang"** i vinduet — tryk på den, så fuldføres jobbet.

---

## Indstillinger

| Indstilling | Beskrivelse |
|---|---|
| **Initialer** | 1–20 tegn, bruges i `03_YY.MM.DD_{INIT}`. Standard: `LS`. |
| **Primær destination** | Mappen hvor nye jobs oprettes. |
| **Arkivdestination** | Valgfri mappe til arkivering. |
| **Fjern** | Nulstiller den pågældende destination. |

Status under hvert felt viser den gemte mappe. Får du en **"OBS"-note** om at adgangen
måske ikke huskes efter genstart, betyder det at Chrome ikke kunne gøre lageret
permanent — vælg destinationen igen og bekræft *"Tillad ved hvert besøg"*.

---

## Fejlfinding

| Symptom | Løsning |
|---|---|
| Menupunktet mangler ved højreklik | Du skal markere tekst først (menuen vises kun ved markering), og en destination skal være valgt i indstillinger. |
| "Adgang udløbet" | Normalt efter genstart — bekræft i det vindue der åbner, så oprettes mappen. Ellers tryk **"Giv adgang"**. |
| "Mappen/disken kunne ikke findes" | Disken/mappen er flyttet, slettet eller ikke tilgængelig. Vælg destinationen igen i indstillinger. |
| Intet sker / rød ✗ | Genindlæs udvidelsen på `chrome://extensions`, eller vælg destinationen igen. |
| Adgang nulstilles efter opdatering | Forventet — første oprettelse efter en opdatering kører blot fornyelses-flowet (ét klik). |

---

## Sådan virker det (teknisk)

- **Manifest V3** Chrome-udvidelse.
- Mappehåndtaget (`FileSystemDirectoryHandle`) gemmes i **IndexedDB** (`idb.js`) og
  overlever genstart.
- Selve mappeoprettelsen sker i et **offscreen-dokument** (`offscreen.js`) via **File
  System Access API**.
- En **service worker** (`background.js`) styrer højreklik-menuen, åbner popup'en
  automatisk ved manglende adgang og genoptager det ventende job bagefter.
- **Popup'en** (`popup.js`) fornyer adgangen med en brugerhandling og forstærker
  *persistent storage*, så valget huskes bedst muligt.

| Fil | Rolle |
|---|---|
| `manifest.json` | Udvidelsens definition og rettigheder |
| `background.js` | Service worker: menu, auto-popup, genoptag job |
| `offscreen.js` / `offscreen.html` | Opretter mapperne på disken |
| `popup.js` / `popup.html` | Lille vindue: status og fornyelse af adgang |
| `options.js` / `options.html` | Indstillinger: initialer, destinationer + mappestruktur-editor |
| `structure.js` | Standardstruktur + lagring og tree-konvertering (delt) |
| `idb.js` | Gemmer/henter mappehåndtag i IndexedDB |
| `toast.js` | Viser besked på siden efter oprettelse |
