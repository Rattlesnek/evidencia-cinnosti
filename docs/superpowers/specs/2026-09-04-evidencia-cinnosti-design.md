# Evidencia činnosti — Design Spec

**Dátum:** 2026-09-04
**Autor:** apankuch@purestorage.com
**Stav:** Draft na schválenie
**Klasifikácia:** Architectural (nový projekt, viac subsystémov)

## 1. Účel

Offline desktop aplikácia pre psychologickú poradňu na:

1. Evidenciu klientov (deti, rodičia, škola, poznámky).
2. Denný záznam vykonaných činností per klient (Diagnostika, Terapia,
   Konzultácie, …).
3. Automatické generovanie predvyplnených Word (.docx) dokumentov zo
   šablón pre každý typ činnosti.
4. Mesačný prehľad histórie s možnosťou dohľadať a otvoriť
   vygenerované dokumenty.

Aplikácia je pre **jedného používateľa** na jednom počítači. Žiadny
sieťový sync, žiadny multi-user, žiadny cloud.

## 2. Technický stack

| Vrstva | Nástroj |
|---|---|
| Framework | Tauri v2 |
| Renderer | React + TypeScript + Vite |
| Styling | Tailwind CSS |
| UI komponenty | shadcn/ui + Lucide icons |
| Router | React Router v6 |
| State | Zustand (3 stores) |
| Ukladanie dát | JSON súbory v `AppLocalData` cez `@tauri-apps/plugin-fs` |
| Docx generovanie | `docxtemplater` + `pizzip` (v rendereri) |
| Výber priečinka | `@tauri-apps/plugin-dialog` |
| Otvorenie súboru | `@tauri-apps/plugin-shell` |
| Testy | Vitest (unit only) |

**Custom Rust kód: žiadny.** Používame len oficiálne Tauri pluginy.
Rust vrstva je Tauri jadro "z výroby".

## 3. Architektúra

```
┌──────────────────── Renderer (React + TS) ────────────────────┐
│                                                                │
│  Pages (React Router)                                          │
│    /clients   /logs   /history   /settings                     │
│                                                                │
│  Zustand stores                                                │
│    clientsStore   logsStore   settingsStore                    │
│                                                                │
│  Services                                                      │
│    storage.ts        — atomic JSON I/O                         │
│    docxGenerator.ts  — docxtemplater + pizzip                  │
│    filenames.ts      — konvencia YYYY-MM-DD_Priezvisko_...     │
│    dateUtils.ts      — vek, sk formátovanie                    │
│                                                                │
│  UI kit                                                        │
│    shadcn: button, input, select, dialog, alert-dialog,        │
│    table, checkbox, command, popover, sonner, badge, label,    │
│    separator                                                   │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────── Tauri Core (Rust) ────────────────────────┐
│  plugin-fs, plugin-dialog, plugin-shell (žiadne custom cmds)   │
└────────────────────────────────────────────────────────────────┘
```

**Priečinková štruktúra:**

```
evidencia-cinnosti/
├── src/
│   ├── pages/           Clients.tsx, Logs.tsx, History.tsx, Settings.tsx
│   ├── components/      ClientDialog, ClientTable, LogRow, LogForm, ...
│   ├── components/ui/   (shadcn generated — nemodifikovať ručne)
│   ├── stores/          clientsStore.ts, logsStore.ts, settingsStore.ts
│   ├── services/        storage.ts, docxGenerator.ts, filenames.ts, dateUtils.ts
│   ├── types/           domain.ts
│   ├── App.tsx, main.tsx, router.tsx
├── src-tauri/           default Tauri v2 scaffold + plugin config
├── docs/superpowers/    (tento spec)
├── package.json, vite.config.ts, tailwind.config.ts, tsconfig.json
```

## 4. Dátový model

```ts
export type ActivityType =
  | 'Diagnostika'
  | 'Poradenstvo pre dieťa'
  | 'Poradenstvo pre rodiča'
  | 'Konzultácia pre učiteľa'
  | 'Správa z vyšetrenia'
  | 'Terapia'
  | 'Konzílium s kolegami';

export interface Client {
  id: string;              // uuid v4
  firstName: string;
  lastName: string;
  birthDate: string;       // ISO 'YYYY-MM-DD'
  parentName: string;      // '' ak neuvedené
  school: string;          // ''
  note: string;            // ''
  createdAt: string;       // ISO datetime
}

export interface DailyLog {
  id: string;              // uuid v4
  date: string;            // 'YYYY-MM-DD'
  clientId: string;        // FK → Client.id
  activityType: ActivityType;
  isDocFilled: boolean;
  isEvupFilled: boolean;
  generatedDocPath: string | null;  // null = generácia zlyhala
  createdAt: string;       // ISO datetime
}

export interface Settings {
  templatesFolderPath: string;   // default: <AppLocalData>/templates
  outputFolderPath: string;      // default: <AppLocalData>/output
}
```

**Rozhodnutia:**

- `id` je uuid v4 (nie autoinkrement).
- Dátumy sú ISO stringy, nie `Date`.
- `generatedDocPath: null` je legitímny stav (chýbala šablóna) → UI
  ukáže "Regenerovať" namiesto "Otvoriť".
- Delete klienta cascade-uje na jeho logy po explicit confirm.
- Nikdy soft-delete.
- Vek klienta sa nikde neuchováva — počíta sa z `birthDate` a
  `log.date` pri generácii docx.
- `ACTIVITY_TYPES` je hard-kódované v `types/domain.ts`; pridanie
  nového = code change (YAGNI pre custom typy).

## 5. Storage service

Jeden modul `src/services/storage.ts` obaľuje tri kolekcie:

- `clients.json`
- `daily_logs.json`
- `settings.json`

Všetky v `BaseDirectory.AppLocalData`.

**Vlastnosti:**

- **Atomic write:** zápis do `<file>.tmp` + `rename` na cieľ.
  Pri páde počas zápisu ostáva pôvodný súbor intaktný.
- **Bootstrap:** ak súbor neexistuje pri prvom čítaní, vráti sa
  fallback (`[]` pre kolekcie, defaultné cesty pre settings).
- **Debounced flush:** stores volajú `flush()` s debounce 300 ms, aby
  rýchle klikanie checkboxov nezaťažilo disk.
- **Beforeunload flush:** pri zavretí okna sa vynúti okamžitý flush.
- **Corrupt JSON = hard fail:** modal cez celú appku s cestou k
  súboru. Žiadne ticho, žiadny auto-repair.
- **Žiadna schema migrácia vo v1.** Nové polia sa v deserializácii
  tolerujú defaultmi (`??`).

**Ponytail poznámka v kóde:**

```
// ponytail: full-file rewrite, jeden JSON per collection.
// Migrácia na SQLite ak > ~5000 klientov alebo > 50k logov.
```

## 6. Docx generátor

Jedna funkcia `generateDocx({ client, log, templatesFolder, outputFolder })`
v `src/services/docxGenerator.ts`. Používaná pri evidencii aj pri
regenerácii.

**Placeholderová konvencia (docxtemplater default `{{...}}`):**

| Placeholder | Zdroj |
|---|---|
| `{{meno}}` | `client.firstName` |
| `{{priezvisko}}` | `client.lastName` |
| `{{datum_narodenia}}` | `formatSk(client.birthDate)` |
| `{{rodic}}` | `client.parentName` |
| `{{skola}}` | `client.school` |
| `{{poznamka}}` | `client.note` |
| `{{typ_cinnosti}}` | `log.activityType` |
| `{{datum_cinnosti}}` | `formatSk(log.date)` |
| `{{vek}}` | `ageAt(client.birthDate, log.date)` |

**Mapa `ActivityType → filename`** je hard-kódovaná konštanta v
generátore (napr. `Terapia → terapia.docx`, `Diagnostika →
diagnostika.docx`, …). Presné názvy sa dohodnú keď šablóny prídu.
Zmena = 1 riadok.

**Output filename:** `YYYY-MM-DD_Priezvisko_Meno_TypCinnosti.docx`.
Sanitizujú sa iba znaky, ktoré Windows zakazuje
(`< > : " / \ | ? * \x00-\x1F`). Diakritika sa ponecháva.

**Návratový typ (nie throw):**

```ts
type GenerateResult =
  | { ok: true;  outputPath: string }
  | { ok: false; reason: 'template-missing' | 'template-corrupt'
                       | 'render-failed'   | 'write-failed';
      message: string };
```

**Regenerácia = presne rovnaké volanie** s existujúcim `logId`. Prepíše
výstupný súbor. Žiadne verziovanie (`_v2`, …).

**Formátovanie dátumov:** `Intl.DateTimeFormat('sk-SK')` → `dd.MM.yyyy`.
Bez `date-fns`.

**Otvorenie z UI:** `plugin-shell.open(generatedDocPath)` — Windows
otvorí Word podľa asociácie.

## 7. Obrazovky (UI)

Spoločný layout: bočný sidebar so 4 položkami (ikony Lucide) + hlavná
plocha + Sonner toaster.

### 7.1 `/clients`

- Toolbar: search (`firstName` + `lastName`, case-insensitive) +
  `Pridať klienta`.
- Table: Priezvisko | Meno | Dátum nar. | Škola | Rodič | Poznámka |
  Akcie (Upraviť / Zmazať).
- `ClientDialog` (add + edit rovnaký komponent): povinné iba
  `firstName`, `lastName`, `birthDate`. Dátum: natívny
  `<input type="date">`.
- Zmazať: `AlertDialog`. Ak klient má logy → text "Klient má **N**
  záznamov v denníku. Zmazať klienta aj všetky jeho záznamy?" +
  cascade delete pri potvrdení.

### 7.2 `/logs`

- Header: `<input type="date">` (default = dnes) + počítadlo záznamov.
- Formulár pridania (nad tabuľkou, vždy viditeľný):
  - Combobox "Klient" (shadcn `Command` + `Popover`).
  - Select "Typ činnosti".
  - `Zaevidovať & Vygenerovať .docx` — disabled kým nie sú vyplnené
    obidve polia.
- Table pre daný deň: Klient | Typ činnosti | Doc vyplnený | EvuP |
  Akcie.
  - Checkboxy inline editovateľné (klik = store update + debounced
    flush).
  - Akcie: `Otvoriť .docx` (ak path != null) alebo `Regenerovať` (ak
    null); `Zmazať`.
- Toasty: success, alebo error variantne podľa
  `GenerateResult.reason`.

### 7.3 `/history`

- Header: select Rok + select Mesiac (default aktuálny mesiac).
- Sumár: N záznamov, X klientov, badges per typ činnosti.
- Table: Dátum | Klient | Typ činnosti | Doc | EvuP | Akcie.
  - Zdieľaný komponent `LogRow` s `/logs`.
  - Zoradenie: `date` desc, potom `createdAt` desc.
- Bez per-klient filtra vo v1 (pridá sa keď treba).

### 7.4 `/settings`

- Dva riadky: `templatesFolderPath`, `outputFolderPath`. Read-only
  cesta + `Vybrať priečinok…` cez `plugin-dialog.open({ directory:
  true })`.
- Sekcia **Stav šablón**: pre každý `ActivityType` badge ✓/✗ s
  očakávaným názvom súboru + refresh button.
- Sekcia **O aplikácii**: verzia, cesta k dátovému priečinku,
  `Otvoriť dátový priečinok` (`plugin-shell.open`).

**Shadcn komponenty na inštaláciu:** `button`, `input`, `label`,
`select`, `dialog`, `alert-dialog`, `table`, `checkbox`, `command`,
`popover`, `sonner`, `badge`, `separator`.

## 8. Chybové stavy (kompletná mapa)

| Situácia | Správanie |
|---|---|
| `clients.json` / `daily_logs.json` neexistuje | Vytvorí sa prázdny pri prvom zápise; store načíta `[]`. |
| `settings.json` neexistuje | Vytvorí sa s defaultmi; priečinky sa `mkdir` recursive. |
| JSON súbor je poškodený | Hard stop: modal cez celú appku s cestou k súboru. |
| Zápis JSON zlyhá (disk full, permissions) | Toast + retry; rollback in-memory stavu na pred-mutačný stav. |
| Šablóna pre daný typ chýba | Log sa vytvorí s `generatedDocPath: null`; toast s očakávaným názvom; riadok ukáže `Regenerovať`. |
| Šablóna je korupt / nevalidný docx | To isté, toast "Šablóna X poškodená". |
| Neznámy placeholder v šablóne | Toast "Šablóna X používa neznámy placeholder: {{...}}"; `generatedDocPath: null`. |
| Output priečinok neexistuje / nezapísateľný | Toast + `Otvoriť Nastavenia`. |
| Zmazanie klienta s logmi | AlertDialog s počtom; cascade delete pri potvrdení. |
| Otvorenie .docx zlyhá (súbor externe zmazaný) | Toast "Súbor už neexistuje, regenerujte." s regenerate akciou. |
| `plugin-dialog.open` cancelled | No-op. |

**Princíp:** dáta sa nikdy ticho nestratia. Každý fail má toast s
akciou. Nikdy neprepisujeme užívateľov obsah bez explicit confirm.

## 9. Testovanie (rozsah v1)

Vitest, žiadne fixtures, žiadne mocky Tauri API (Tauri API sa volá cez
`services/storage`, ktorý má interface — v testoch in-memory
implementácia).

**Unit testy:**

- `filenames.spec.ts` — normal case, diakritika ostáva, Windows
  zakázané znaky preč, prázdne stringy.
- `dateUtils.spec.ts` — `ageAt`: pred/po/na narodeninách, priestupný
  rok 29.2.
- `stores/logsStore.spec.ts` — add / update / remove volajú storage;
  cascade delete pri odstránení klienta.
- `services/storage.spec.ts` — atomic write: pri simulovanom páde
  medzi tmp write a rename ostáva pôvodný súbor.

**Smoke test docx generátora:** `dev-scripts/smoke-docx.ts` — spúšťa
sa ručne s reálnou šablónou. Šablóna sa do repa **necommituje**.

**E2E:** nie vo v1. Overkill pre single-user desktop app. Ak treba,
`@tauri-apps/webdriver`.

**CI:** GitHub Actions, minimal —
`npm ci && npm test && npm run typecheck && cargo build --manifest-path src-tauri/Cargo.toml`.
Bez release automation. Produkčný build robí user manuálne cez
`npm run tauri build`.

## 10. Non-goals (explicitne mimo v1)

- Multi-user, sync, cloud.
- Export/backup UI (dáta sú v `AppLocalData`, user má prístup manuálne).
- Verziovanie generovaných .docx.
- Per-klient filter v histórii.
- Súhrnný mesačný .docx export.
- Tlač priamo z appky.
- Custom typy činností v UI.
- Dark mode.
- Preklady (UI je iba slovenská).
- Auto-update aplikácie.

## 11. Otvorené body (dohodneme pri implementácii)

- **Presné názvy súborov šablón** — dohodne sa keď užívateľ dodá
  šablóny na tento počítač. Do tej doby použijeme dohodnutú konvenciu
  (`terapia.docx`, `diagnostika.docx`, `poradenstvo_dieta.docx`,
  `poradenstvo_rodic.docx`, `konzultacia_ucitel.docx`,
  `sprava_vysetrenie.docx`, `konzilium.docx`).
- **Ikona aplikácie** — default Tauri, kým užívateľ nedodá.
