# Evidencia činnosti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zostaviť offline desktop appku (Tauri v2 + React + TS) pre psychologickú poradňu — klienti, denné záznamy činností, generovanie predvyplnených .docx zo šablón, mesačná história.

**Architecture:** Renderer (React + Zustand + shadcn/ui) drží celú logiku a UI. Tauri core je len oficiálne pluginy (fs, dialog, shell) — žiadny custom Rust. Dáta v `AppLocalData` ako tri JSON súbory s atomic write (tmp + rename) a debounced flush. Docx generovanie v rendereri cez docxtemplater + pizzip.

**Tech Stack:** Tauri v2, React 18 + TypeScript + Vite, Tailwind, shadcn/ui, Lucide, React Router v6, Zustand, `@tauri-apps/plugin-{fs,dialog,shell}`, docxtemplater + pizzip, uuid, Vitest.

**Spec:** [docs/superpowers/specs/2026-09-04-evidencia-cinnosti-design.md](../specs/2026-09-04-evidencia-cinnosti-design.md)

## Global Constraints

- **Framework:** Tauri v2 (nie v1). Renderer: React 18 + TypeScript + Vite.
- **Custom Rust: žiadny.** Iba oficiálne pluginy: `@tauri-apps/plugin-fs`, `plugin-dialog`, `plugin-shell`.
- **UI jazyk:** iba slovenčina, s diakritikou. Žiadny i18n framework.
- **Dátumy:** ISO stringy `'YYYY-MM-DD'` v modeli, nikdy `Date` objekt v state. Formátovanie pre UI cez `Intl.DateTimeFormat('sk-SK')` → `dd.MM.yyyy`. **Bez `date-fns`.**
- **IDs:** uuid v4 (`crypto.randomUUID()` — dostupné v Tauri webview).
- **Storage location:** `BaseDirectory.AppLocalData` pre všetky tri JSON súbory.
- **Docx placeholder syntax:** docxtemplater default `{{...}}`.
- **Output filename konvencia:** `YYYY-MM-DD_Priezvisko_Meno_TypCinnosti.docx`. Diakritika sa zachováva; sanitizuje sa iba `< > : " / \ | ? *` a kontrolné znaky `\x00-\x1F`.
- **Nikdy soft-delete.** Delete klienta cascade-uje na jeho logy iba po explicit confirm dialógu.
- **Nikdy neprepisovať user obsah bez confirm.** Regenerácia docx prepisuje bez potvrdenia (to je celý bod tlačidla), ale zmazanie klienta / záznamu vždy s AlertDialog.
- **Test framework:** Vitest, unit only. UI komponenty netestujeme.
- **Balíček manager:** npm (Tauri scaffold default).
- **Node:** ≥ 20 (Vite 5 requirement, matches .nvmrc convention).
- **Commit message format:** `No-Jira - <lowercase imperative sentence>` (bez pointky).

---

## File Structure

```
evidencia-cinnosti/
├── src/
│   ├── main.tsx
│   ├── App.tsx                          # BrowserRouter + Sonner + Layout
│   ├── router.tsx                       # Route definície
│   ├── pages/
│   │   ├── Clients.tsx
│   │   ├── Logs.tsx
│   │   ├── History.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Layout.tsx                   # sidebar + <Outlet/>
│   │   ├── Sidebar.tsx
│   │   ├── ClientDialog.tsx             # add + edit v jednom
│   │   ├── ClientTable.tsx
│   │   ├── ClientCombobox.tsx           # shadcn Command + Popover
│   │   ├── ActivitySelect.tsx           # shadcn Select
│   │   ├── LogRow.tsx                   # zdieľaný medzi /logs a /history
│   │   ├── LogAddForm.tsx
│   │   ├── ConfirmDeleteDialog.tsx      # generický AlertDialog
│   │   └── ui/                          # shadcn generated — nemodifikovať
│   ├── stores/
│   │   ├── clientsStore.ts
│   │   ├── logsStore.ts
│   │   └── settingsStore.ts
│   ├── services/
│   │   ├── storage.ts                   # interface + Tauri impl + in-memory impl
│   │   ├── docxGenerator.ts
│   │   ├── filenames.ts
│   │   ├── dateUtils.ts
│   │   └── debounce.ts                  # 5-riadkový helper
│   └── types/
│       └── domain.ts                    # Client, DailyLog, Settings, ActivityType, ACTIVITY_TYPES, TEMPLATE_MAP
├── src-tauri/                           # default Tauri v2 scaffold + plugin config
├── dev-scripts/
│   └── smoke-docx.ts                    # ručný smoke test docx generátora
├── docs/superpowers/                    # spec + tento plán
├── .github/workflows/ci.yml
├── package.json, vite.config.ts, tailwind.config.ts, tsconfig.json, postcss.config.js
```

**Súbory s testami:**
- `src/services/dateUtils.spec.ts`
- `src/services/filenames.spec.ts`
- `src/services/storage.spec.ts`
- `src/stores/logsStore.spec.ts`

---

## Task 1: Scaffold projektu (Tauri v2 + React + TS + Vite + Tailwind + shadcn)

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`
- Create: `src-tauri/` (celý default v2 scaffold)
- Create: `.gitignore`, `.nvmrc`
- Test: N/A (scaffold task)

**Interfaces:**
- Consumes: nič
- Produces: bežiaci `npm run tauri dev`, dostupné shadcn CLI, Tailwind funkčný, plugin-fs/dialog/shell registrované v `src-tauri/tauri.conf.json` + `src-tauri/Cargo.toml` + `src-tauri/src/lib.rs`.

- [ ] **Step 1.1: Vytvor Tauri v2 projekt s React+TS+Vite šablónou**

```bash
cd /Users/apankuch/personal-projects/evidencia-cinnosti
# Tauri v2 create scaffold do prázdneho adresára
npm create tauri-app@latest . -- --template react-ts --manager npm --identifier sk.pankuch.evidencia --app-name "Evidencia činnosti"
```

Ak scaffold odmietne prázdny existujúci adresár, dočasne presuň `docs/` mimo, spusti scaffold, presuň späť.

- [ ] **Step 1.2: Nainštaluj závislosti a over dev server**

```bash
npm install
npm run tauri dev
```

Očakávaný výsledok: otvorí sa okno s default Tauri React šablónou. Zavri.

- [ ] **Step 1.3: Nainštaluj oficiálne Tauri pluginy (JS + Rust strana)**

```bash
npm install @tauri-apps/plugin-fs @tauri-apps/plugin-dialog @tauri-apps/plugin-shell
cd src-tauri
cargo add tauri-plugin-fs tauri-plugin-dialog tauri-plugin-shell
cd ..
```

- [ ] **Step 1.4: Registruj pluginy v Rust vrstve**

Uprav [src-tauri/src/lib.rs](src-tauri/src/lib.rs): do buildera pridaj:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_shell::init())
    // ... zvyšok default scaffoldu
```

- [ ] **Step 1.5: Povol capabilities pre pluginy**

Vytvor / uprav [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json):

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capabilities pre evidenciu činnosti",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "fs:default",
    { "identifier": "fs:allow-read-file",   "allow": [{ "path": "$APPLOCALDATA/**" }] },
    { "identifier": "fs:allow-write-file",  "allow": [{ "path": "$APPLOCALDATA/**" }] },
    { "identifier": "fs:allow-mkdir",       "allow": [{ "path": "$APPLOCALDATA/**" }] },
    { "identifier": "fs:allow-exists",      "allow": [{ "path": "$APPLOCALDATA/**" }] },
    { "identifier": "fs:allow-rename",      "allow": [{ "path": "$APPLOCALDATA/**" }] },
    { "identifier": "fs:allow-read-file",   "allow": [{ "path": "$HOME/**" }] },
    { "identifier": "fs:allow-write-file",  "allow": [{ "path": "$HOME/**" }] },
    "dialog:allow-open",
    "shell:allow-open"
  ]
}
```

Poznámka: `$HOME/**` scope povoľuje čítanie/písanie šablón a výstupov kdekoľvek — user si vyberá priečinky v Settings, defaultne pod AppLocalData.

- [ ] **Step 1.6: Pridaj Tailwind + PostCSS**

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
npx tailwindcss init -p
```

Uprav [tailwind.config.ts](tailwind.config.ts):

```ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

Nahraď obsah [src/styles.css](src/styles.css):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Importuj v [src/main.tsx](src/main.tsx): `import './styles.css'`.

- [ ] **Step 1.7: Nainštaluj shadcn CLI + init**

Pridaj do [tsconfig.json](tsconfig.json) `compilerOptions.baseUrl: "."` a `paths: { "@/*": ["src/*"] }`. Do [vite.config.ts](vite.config.ts) pridaj `resolve.alias = { '@': path.resolve(__dirname, './src') }` (a `import path from 'node:path'`).

```bash
npx shadcn@latest init
```

Odpovede: TypeScript ✓, Default style, Slate base color, CSS variables ✓, `src/styles.css`, `tailwind.config.ts`, `@/components`, `@/lib/utils`, RSC nie.

- [ ] **Step 1.8: Nainštaluj potrebné shadcn komponenty a Lucide**

```bash
npx shadcn@latest add button input label select dialog alert-dialog table checkbox command popover sonner badge separator
npm install lucide-react
```

- [ ] **Step 1.9: Pridaj runtime závislosti aplikácie**

```bash
npm install zustand react-router-dom docxtemplater pizzip uuid
npm install -D @types/uuid vitest @vitest/ui
```

- [ ] **Step 1.10: Skript pre testy a typecheck**

Do [package.json](package.json) `scripts` pridaj:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 1.11: Over že všetko sedí**

```bash
npm run typecheck
npm test        # 0 testov — OK
npm run tauri dev
```

Očakávaný výsledok: okno sa otvorí, žiadne CSS chyby.

- [ ] **Step 1.12: Commit**

```bash
git init && git add -A
git commit -m "No-Jira - scaffold tauri v2 react ts vite tailwind shadcn"
```

---

## Task 2: Doménové typy + konštanty

**Files:**
- Create: `src/types/domain.ts`
- Test: N/A (iba typy + `as const` konštanty)

**Interfaces:**
- Consumes: nič
- Produces:
  - `type ActivityType`, `const ACTIVITY_TYPES: readonly ActivityType[]`
  - `interface Client { id, firstName, lastName, birthDate, parentName, school, note, createdAt }`
  - `interface DailyLog { id, date, clientId, activityType, isDocFilled, isEvupFilled, generatedDocPath: string | null, createdAt }`
  - `interface Settings { templatesFolderPath, outputFolderPath }`
  - `const TEMPLATE_FILENAME: Record<ActivityType, string>` — mapa typu na názov šablóny

- [ ] **Step 2.1: Vytvor `src/types/domain.ts`**

```ts
export type ActivityType =
  | 'Diagnostika'
  | 'Poradenstvo pre dieťa'
  | 'Poradenstvo pre rodiča'
  | 'Konzultácia pre učiteľa'
  | 'Správa z vyšetrenia'
  | 'Terapia'
  | 'Konzílium s kolegami';

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'Diagnostika',
  'Poradenstvo pre dieťa',
  'Poradenstvo pre rodiča',
  'Konzultácia pre učiteľa',
  'Správa z vyšetrenia',
  'Terapia',
  'Konzílium s kolegami',
] as const;

/** Mapa ActivityType → očakávaný názov docx šablóny v templates priečinku.
 *  ponytail: dohodnutá konvencia zo spec §11. Zmena = 1 riadok. */
export const TEMPLATE_FILENAME: Record<ActivityType, string> = {
  'Diagnostika':              'diagnostika.docx',
  'Poradenstvo pre dieťa':    'poradenstvo_dieta.docx',
  'Poradenstvo pre rodiča':   'poradenstvo_rodic.docx',
  'Konzultácia pre učiteľa':  'konzultacia_ucitel.docx',
  'Správa z vyšetrenia':      'sprava_vysetrenie.docx',
  'Terapia':                  'terapia.docx',
  'Konzílium s kolegami':     'konzilium.docx',
};

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;      // 'YYYY-MM-DD'
  parentName: string;
  school: string;
  note: string;
  createdAt: string;      // ISO datetime
}

export interface DailyLog {
  id: string;
  date: string;           // 'YYYY-MM-DD'
  clientId: string;
  activityType: ActivityType;
  isDocFilled: boolean;
  isEvupFilled: boolean;
  generatedDocPath: string | null;
  createdAt: string;
}

export interface Settings {
  templatesFolderPath: string;
  outputFolderPath: string;
}
```

- [ ] **Step 2.2: Over typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/types/domain.ts
git commit -m "No-Jira - add domain types and activity constants"
```

---

## Task 3: Date utilities (TDD)

**Files:**
- Create: `src/services/dateUtils.ts`
- Test: `src/services/dateUtils.spec.ts`

**Interfaces:**
- Consumes: nič
- Produces:
  - `formatSk(iso: string): string` — `'2026-09-04'` → `'04.09.2026'`
  - `ageAt(birthDate: string, atDate: string): number` — plné roky

- [ ] **Step 3.1: Napíš failing testy**

Vytvor [src/services/dateUtils.spec.ts](src/services/dateUtils.spec.ts):

```ts
import { describe, it, expect } from 'vitest';
import { formatSk, ageAt } from './dateUtils';

describe('formatSk', () => {
  it('formátuje ISO dátum na dd.MM.yyyy', () => {
    expect(formatSk('2026-09-04')).toBe('04.09.2026');
  });
  it('doplní vedúce nuly', () => {
    expect(formatSk('2026-01-05')).toBe('05.01.2026');
  });
});

describe('ageAt', () => {
  it('vek presne v deň narodenín', () => {
    expect(ageAt('2000-05-10', '2026-05-10')).toBe(26);
  });
  it('vek deň pred narodeninami — o rok menej', () => {
    expect(ageAt('2000-05-10', '2026-05-09')).toBe(25);
  });
  it('vek deň po narodeninách', () => {
    expect(ageAt('2000-05-10', '2026-05-11')).toBe(26);
  });
  it('priestupný rok: 29.2. narodený, kontrola 28.2. v nepriestupnom roku', () => {
    // narodený 2000-02-29, dnes 2026-02-28 — ešte nemá narodeniny
    expect(ageAt('2000-02-29', '2026-02-28')).toBe(25);
    // 2026-03-01 — už má
    expect(ageAt('2000-02-29', '2026-03-01')).toBe(26);
  });
  it('rovnaký rok — 0', () => {
    expect(ageAt('2026-01-01', '2026-06-01')).toBe(0);
  });
});
```

- [ ] **Step 3.2: Spusti — musia zlyhať**

```bash
npm test -- dateUtils
```

Expected: FAIL (module neexistuje).

- [ ] **Step 3.3: Implementuj**

Vytvor [src/services/dateUtils.ts](src/services/dateUtils.ts):

```ts
/** ISO 'YYYY-MM-DD' → 'dd.MM.yyyy'. Bez Date parseru — čisté string operácie. */
export function formatSk(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Plné roky medzi birthDate a atDate. Oba ISO 'YYYY-MM-DD'. */
export function ageAt(birthDate: string, atDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ay, am, ad] = atDate.split('-').map(Number);
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age--;
  return age;
}
```

- [ ] **Step 3.4: Spusti — musia prejsť**

```bash
npm test -- dateUtils
```

Expected: PASS (6 testov).

- [ ] **Step 3.5: Commit**

```bash
git add src/services/dateUtils.ts src/services/dateUtils.spec.ts
git commit -m "No-Jira - add date utils formatSk and ageAt with tests"
```

---

## Task 4: Filename utility (TDD)

**Files:**
- Create: `src/services/filenames.ts`
- Test: `src/services/filenames.spec.ts`

**Interfaces:**
- Consumes: `ActivityType` z `@/types/domain`
- Produces:
  - `buildOutputFilename(args: { date: string; lastName: string; firstName: string; activityType: ActivityType }): string`
  - vždy suffix `.docx`

- [ ] **Step 4.1: Napíš failing testy**

Vytvor [src/services/filenames.spec.ts](src/services/filenames.spec.ts):

```ts
import { describe, it, expect } from 'vitest';
import { buildOutputFilename } from './filenames';

describe('buildOutputFilename', () => {
  it('normal case', () => {
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: 'Novak', firstName: 'Jozef', activityType: 'Terapia',
    })).toBe('2026-09-04_Novak_Jozef_Terapia.docx');
  });

  it('zachováva diakritiku', () => {
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: 'Žúrik', firstName: 'Ľuboš', activityType: 'Diagnostika',
    })).toBe('2026-09-04_Žúrik_Ľuboš_Diagnostika.docx');
  });

  it('sanitizuje Windows zakázané znaky', () => {
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: 'Van/der:Berg', firstName: 'A*B?', activityType: 'Terapia',
    })).toBe('2026-09-04_VanderBerg_AB_Terapia.docx');
  });

  it('sanitizuje kontrolné znaky', () => {
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: 'X\x01Y', firstName: 'A\nB', activityType: 'Terapia',
    })).toBe('2026-09-04_XY_AB_Terapia.docx');
  });

  it('activityType s diakritikou v názve', () => {
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: 'Novak', firstName: 'Jozef',
      activityType: 'Konzílium s kolegami',
    })).toBe('2026-09-04_Novak_Jozef_Konzílium s kolegami.docx');
  });

  it('prázdny lastName/firstName ostáva prázdny segment', () => {
    // ponytail: povinnosť neprázdnosti si vynucuje ClientDialog, tu iba build
    expect(buildOutputFilename({
      date: '2026-09-04', lastName: '', firstName: 'Jozef', activityType: 'Terapia',
    })).toBe('2026-09-04__Jozef_Terapia.docx');
  });
});
```

- [ ] **Step 4.2: Spusti — musia zlyhať**

```bash
npm test -- filenames
```

Expected: FAIL.

- [ ] **Step 4.3: Implementuj**

Vytvor [src/services/filenames.ts](src/services/filenames.ts):

```ts
import type { ActivityType } from '@/types/domain';

// Windows zakázané: < > : " / \ | ? *  a kontrolné 0x00-0x1F
const FORBIDDEN = /[<>:"/\\|?*\x00-\x1F]/g;

function sanitize(s: string): string {
  return s.replace(FORBIDDEN, '');
}

export function buildOutputFilename(args: {
  date: string;
  lastName: string;
  firstName: string;
  activityType: ActivityType;
}): string {
  const parts = [
    args.date,
    sanitize(args.lastName),
    sanitize(args.firstName),
    sanitize(args.activityType),
  ];
  return parts.join('_') + '.docx';
}
```

- [ ] **Step 4.4: Spusti — musia prejsť**

```bash
npm test -- filenames
```

Expected: PASS (6 testov).

- [ ] **Step 4.5: Commit**

```bash
git add src/services/filenames.ts src/services/filenames.spec.ts
git commit -m "No-Jira - add output filename builder with sanitization"
```

---

## Task 5: Storage service — interface + Tauri impl + in-memory impl (TDD atomic write)

**Files:**
- Create: `src/services/storage.ts`
- Create: `src/services/debounce.ts`
- Test: `src/services/storage.spec.ts`

**Interfaces:**
- Consumes: `@tauri-apps/plugin-fs`
- Produces:
  - `interface Storage { read<T>(name: string, fallback: T): Promise<T>; write<T>(name: string, data: T): Promise<void> }`
  - `class TauriStorage implements Storage`
  - `class InMemoryStorage implements Storage` (pre testy, export)
  - `export class CorruptJsonError extends Error { constructor(public path: string, public cause: unknown) }`
  - `export const storage: Storage` — singleton pre app (TauriStorage)
  - `export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms: number): { call: (...a: A) => void; flush: () => void }`

- [ ] **Step 5.1: Napíš debounce helper**

Vytvor [src/services/debounce.ts](src/services/debounce.ts):

```ts
/** ponytail: minimal debounce with flush(); netreba lodash. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
): { call: (...args: A) => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: A | null = null;
  return {
    call(...args: A) {
      pending = args;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        const p = pending; pending = null;
        if (p) fn(...p);
      }, ms);
    },
    flush() {
      if (timer) { clearTimeout(timer); timer = null; }
      const p = pending; pending = null;
      if (p) fn(...p);
    },
  };
}
```

- [ ] **Step 5.2: Napíš failing testy pre storage (atomic write + corrupt JSON)**

Vytvor [src/services/storage.spec.ts](src/services/storage.spec.ts):

```ts
import { describe, it, expect } from 'vitest';
import { InMemoryStorage, CorruptJsonError, atomicWriteInto } from './storage';

describe('InMemoryStorage', () => {
  it('read fallback keď kľúč neexistuje', async () => {
    const s = new InMemoryStorage();
    expect(await s.read('clients.json', [])).toEqual([]);
  });
  it('write potom read vráti to isté', async () => {
    const s = new InMemoryStorage();
    await s.write('clients.json', [{ id: '1' }]);
    expect(await s.read('clients.json', [])).toEqual([{ id: '1' }]);
  });
  it('korupt JSON hodí CorruptJsonError', async () => {
    const s = new InMemoryStorage();
    s.setRawForTest('clients.json', '{ zlé json');
    await expect(s.read('clients.json', [])).rejects.toBeInstanceOf(CorruptJsonError);
  });
});

describe('atomicWriteInto (bez Tauri — cez fake fs)', () => {
  it('pri páde počas write tmp súboru zostáva pôvodný súbor intaktný', async () => {
    const files = new Map<string, string>();
    files.set('a.json', '"old"');
    const fs = {
      writeTextFile: async (p: string) => {
        if (p.endsWith('.tmp')) throw new Error('disk full');
        files.set(p, '');
      },
      rename: async (from: string, to: string) => {
        const c = files.get(from); files.delete(from); files.set(to, c!);
      },
    };
    await expect(atomicWriteInto(fs, 'a.json', 'new')).rejects.toThrow('disk full');
    expect(files.get('a.json')).toBe('"old"');
  });

  it('normal write: tmp sa napíše, potom rename', async () => {
    const files = new Map<string, string>();
    files.set('a.json', '"old"');
    const fs = {
      writeTextFile: async (p: string, c: string) => { files.set(p, c); },
      rename: async (from: string, to: string) => {
        const c = files.get(from)!; files.delete(from); files.set(to, c);
      },
    };
    await atomicWriteInto(fs, 'a.json', '"new"');
    expect(files.get('a.json')).toBe('"new"');
    expect(files.has('a.json.tmp')).toBe(false);
  });
});
```

- [ ] **Step 5.3: Spusti — musia zlyhať**

```bash
npm test -- storage
```

Expected: FAIL.

- [ ] **Step 5.4: Implementuj storage**

Vytvor [src/services/storage.ts](src/services/storage.ts):

```ts
import {
  BaseDirectory, exists, mkdir, readTextFile, writeTextFile, rename,
} from '@tauri-apps/plugin-fs';

export class CorruptJsonError extends Error {
  constructor(public path: string, public cause: unknown) {
    super(`Poškodený JSON: ${path}`);
    this.name = 'CorruptJsonError';
  }
}

export interface Storage {
  read<T>(name: string, fallback: T): Promise<T>;
  write<T>(name: string, data: T): Promise<void>;
}

/** Injektabilná forma pre testy — bez BaseDirectory param. */
export async function atomicWriteInto(
  fs: {
    writeTextFile: (p: string, c: string) => Promise<void>;
    rename: (from: string, to: string) => Promise<void>;
  },
  path: string,
  content: string,
): Promise<void> {
  const tmp = `${path}.tmp`;
  await fs.writeTextFile(tmp, content);
  await fs.rename(tmp, path);
}

export class TauriStorage implements Storage {
  async read<T>(name: string, fallback: T): Promise<T> {
    const opts = { baseDir: BaseDirectory.AppLocalData };
    if (!(await exists(name, opts))) return fallback;
    const raw = await readTextFile(name, opts);
    try {
      return JSON.parse(raw) as T;
    } catch (e) {
      throw new CorruptJsonError(name, e);
    }
  }
  async write<T>(name: string, data: T): Promise<void> {
    const opts = { baseDir: BaseDirectory.AppLocalData };
    // AppLocalData dir sa vytvorí sám pri prvom mkdir; volaj idempotentne.
    // Pre subpath v mene (nemáme) by sme mkdir robili tu.
    await atomicWriteInto(
      {
        writeTextFile: (p, c) => writeTextFile(p, c, opts),
        rename: (from, to) => rename(from, to, {
          oldPathBaseDir: BaseDirectory.AppLocalData,
          newPathBaseDir: BaseDirectory.AppLocalData,
        }),
      },
      name,
      JSON.stringify(data, null, 2),
    );
  }
}

/** Pre unit testy. */
export class InMemoryStorage implements Storage {
  private files = new Map<string, string>();
  setRawForTest(name: string, raw: string) { this.files.set(name, raw); }
  async read<T>(name: string, fallback: T): Promise<T> {
    const raw = this.files.get(name);
    if (raw === undefined) return fallback;
    try { return JSON.parse(raw) as T; }
    catch (e) { throw new CorruptJsonError(name, e); }
  }
  async write<T>(name: string, data: T): Promise<void> {
    this.files.set(name, JSON.stringify(data, null, 2));
  }
}

/** Aplikačný singleton. */
export const storage: Storage = new TauriStorage();

/** Utility na vytvorenie AppLocalData default output/templates priečinkov (volá sa raz pri bootstrape settings). */
export async function ensureAppDataSubdir(name: string): Promise<void> {
  const opts = { baseDir: BaseDirectory.AppLocalData };
  if (!(await exists(name, opts))) {
    await mkdir(name, { ...opts, recursive: true });
  }
}
```

- [ ] **Step 5.5: Spusti — musia prejsť**

```bash
npm test -- storage
```

Expected: PASS (5 testov).

- [ ] **Step 5.6: Commit**

```bash
git add src/services/storage.ts src/services/debounce.ts src/services/storage.spec.ts
git commit -m "No-Jira - add storage service with atomic write and debounce"
```

---

## Task 6: Zustand stores (TDD cascade delete)

**Files:**
- Create: `src/stores/clientsStore.ts`
- Create: `src/stores/logsStore.ts`
- Create: `src/stores/settingsStore.ts`
- Test: `src/stores/logsStore.spec.ts`

**Interfaces:**
- Consumes: `Client`, `DailyLog`, `Settings` z `@/types/domain`; `Storage` z `@/services/storage`; `debounce` z `@/services/debounce`.
- Produces:
  - `useClientsStore` s: `clients: Client[]`, `load()`, `add(input: Omit<Client,'id'|'createdAt'>)`, `update(id, patch)`, `remove(id)`.
  - `useLogsStore` s: `logs: DailyLog[]`, `load()`, `add(input: Omit<DailyLog,'id'|'createdAt'>)`, `update(id, patch)`, `remove(id)`, `removeByClient(clientId)`.
  - `useSettingsStore` s: `settings: Settings`, `load()`, `setTemplatesFolder(path)`, `setOutputFolder(path)`.
  - `flushAllStores(): Promise<void>` — volá `.flush()` na debouncers.
  - Každý store si drží `Storage` inštanciu; default = `storage` singleton. Test override cez `_setStorageForTest(s)`.

- [ ] **Step 6.1: Napíš failing testy pre logsStore (cascade + persistence)**

Vytvor [src/stores/logsStore.spec.ts](src/stores/logsStore.spec.ts):

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useLogsStore, _setStorageForTest, flushLogsForTest } from './logsStore';
import { InMemoryStorage } from '@/services/storage';

let mem: InMemoryStorage;
beforeEach(() => {
  mem = new InMemoryStorage();
  _setStorageForTest(mem);
  useLogsStore.setState({ logs: [] });
});

describe('logsStore', () => {
  it('add zapíše do storage (po flush)', async () => {
    await useLogsStore.getState().add({
      date: '2026-09-04', clientId: 'c1', activityType: 'Terapia',
      isDocFilled: false, isEvupFilled: false, generatedDocPath: null,
    });
    await flushLogsForTest();
    const persisted = await mem.read('daily_logs.json', [] as unknown[]);
    expect(persisted).toHaveLength(1);
  });

  it('removeByClient vymaže všetky logy klienta', async () => {
    useLogsStore.setState({ logs: [
      { id: 'a', clientId: 'c1', date: '2026-01-01', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
      { id: 'b', clientId: 'c2', date: '2026-01-02', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
      { id: 'c', clientId: 'c1', date: '2026-01-03', activityType: 'Diagnostika',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
    ]});
    await useLogsStore.getState().removeByClient('c1');
    expect(useLogsStore.getState().logs.map(l => l.id)).toEqual(['b']);
  });

  it('update prepisuje polia', async () => {
    useLogsStore.setState({ logs: [
      { id: 'a', clientId: 'c1', date: '2026-01-01', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
    ]});
    await useLogsStore.getState().update('a', { isDocFilled: true });
    expect(useLogsStore.getState().logs[0].isDocFilled).toBe(true);
  });
});
```

- [ ] **Step 6.2: Spusti — musia zlyhať**

```bash
npm test -- logsStore
```

Expected: FAIL.

- [ ] **Step 6.3: Implementuj clientsStore**

Vytvor [src/stores/clientsStore.ts](src/stores/clientsStore.ts):

```ts
import { create } from 'zustand';
import type { Client } from '@/types/domain';
import { storage as defaultStorage, type Storage } from '@/services/storage';
import { debounce } from '@/services/debounce';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'clients.json';
type State = {
  clients: Client[];
  load: () => Promise<void>;
  add: (input: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  update: (id: string, patch: Partial<Client>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const flusher = debounce((data: Client[]) => { void storage.write(FILE, data); }, 300);
export function flushClientsForTest() {
  return new Promise<void>((r) => { flusher.flush(); setTimeout(r, 0); });
}

export const useClientsStore = create<State>((set, get) => ({
  clients: [],
  async load() {
    const data = await storage.read<Client[]>(FILE, []);
    set({ clients: data });
  },
  async add(input) {
    const c: Client = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set({ clients: [...get().clients, c] });
    flusher.call(get().clients);
    return c;
  },
  async update(id, patch) {
    set({ clients: get().clients.map(c => c.id === id ? { ...c, ...patch } : c) });
    flusher.call(get().clients);
  },
  async remove(id) {
    set({ clients: get().clients.filter(c => c.id !== id) });
    flusher.call(get().clients);
  },
}));
```

- [ ] **Step 6.4: Implementuj logsStore**

Vytvor [src/stores/logsStore.ts](src/stores/logsStore.ts):

```ts
import { create } from 'zustand';
import type { DailyLog } from '@/types/domain';
import { storage as defaultStorage, type Storage } from '@/services/storage';
import { debounce } from '@/services/debounce';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'daily_logs.json';
type State = {
  logs: DailyLog[];
  load: () => Promise<void>;
  add: (input: Omit<DailyLog, 'id' | 'createdAt'>) => Promise<DailyLog>;
  update: (id: string, patch: Partial<DailyLog>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeByClient: (clientId: string) => Promise<void>;
};

const flusher = debounce((data: DailyLog[]) => { void storage.write(FILE, data); }, 300);
export function flushLogsForTest() {
  return new Promise<void>((r) => { flusher.flush(); setTimeout(r, 0); });
}

export const useLogsStore = create<State>((set, get) => ({
  logs: [],
  async load() { set({ logs: await storage.read<DailyLog[]>(FILE, []) }); },
  async add(input) {
    const l: DailyLog = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set({ logs: [...get().logs, l] });
    flusher.call(get().logs);
    return l;
  },
  async update(id, patch) {
    set({ logs: get().logs.map(l => l.id === id ? { ...l, ...patch } : l) });
    flusher.call(get().logs);
  },
  async remove(id) {
    set({ logs: get().logs.filter(l => l.id !== id) });
    flusher.call(get().logs);
  },
  async removeByClient(clientId) {
    set({ logs: get().logs.filter(l => l.clientId !== clientId) });
    flusher.call(get().logs);
  },
}));
```

- [ ] **Step 6.5: Implementuj settingsStore**

Vytvor [src/stores/settingsStore.ts](src/stores/settingsStore.ts):

```ts
import { create } from 'zustand';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import type { Settings } from '@/types/domain';
import { storage as defaultStorage, ensureAppDataSubdir, type Storage } from '@/services/storage';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'settings.json';
type State = {
  settings: Settings;
  load: () => Promise<void>;
  setTemplatesFolder: (path: string) => Promise<void>;
  setOutputFolder: (path: string) => Promise<void>;
};

async function defaults(): Promise<Settings> {
  const base = await appLocalDataDir();
  return {
    templatesFolderPath: await join(base, 'templates'),
    outputFolderPath:    await join(base, 'output'),
  };
}

export const useSettingsStore = create<State>((set, get) => ({
  settings: { templatesFolderPath: '', outputFolderPath: '' },
  async load() {
    const d = await defaults();
    const s = await storage.read<Settings>(FILE, d);
    set({ settings: s });
    if (s === d) {
      await ensureAppDataSubdir('templates');
      await ensureAppDataSubdir('output');
      await storage.write(FILE, s);
    }
  },
  async setTemplatesFolder(p) {
    const next = { ...get().settings, templatesFolderPath: p };
    set({ settings: next });
    await storage.write(FILE, next);
  },
  async setOutputFolder(p) {
    const next = { ...get().settings, outputFolderPath: p };
    set({ settings: next });
    await storage.write(FILE, next);
  },
}));
```

Poznámka: settingsStore nedebounce-uje — user klikne raz, chceme write hneď.

- [ ] **Step 6.6: Spusti — musia prejsť**

```bash
npm test -- logsStore
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6.7: Commit**

```bash
git add src/stores src/services/storage.ts
git commit -m "No-Jira - add zustand stores for clients logs settings"
```

---

## Task 7: App shell — router, layout, sidebar, Sonner, bootstrap load

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/router.tsx`, `src/components/Layout.tsx`, `src/components/Sidebar.tsx`
- Create: `src/pages/Clients.tsx`, `src/pages/Logs.tsx`, `src/pages/History.tsx`, `src/pages/Settings.tsx` (stub obsah `<div>Klienti</div>` atď.)

**Interfaces:**
- Consumes: React Router, shadcn `Toaster` (sonner), Lucide ikony, všetky tri stores.
- Produces: bežiaca appka so 4 route-ami a sidebar-om, pri štarte `.load()` na všetkých storoch, corrupt JSON → alert modal.

- [ ] **Step 7.1: Vytvor Sidebar**

[src/components/Sidebar.tsx](src/components/Sidebar.tsx):

```tsx
import { NavLink } from 'react-router-dom';
import { Users, Calendar, History, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/clients',  label: 'Klienti',  icon: Users },
  { to: '/logs',     label: 'Denník',   icon: Calendar },
  { to: '/history',  label: 'História', icon: History },
  { to: '/settings', label: 'Nastavenia', icon: SettingsIcon },
];

export function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r bg-slate-50 p-3 flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => cn(
            'flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-200',
            isActive && 'bg-slate-200 font-medium',
          )}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 7.2: Vytvor Layout**

[src/components/Layout.tsx](src/components/Layout.tsx):

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export function Layout() {
  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6"><Outlet /></main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
```

- [ ] **Step 7.3: Vytvor stub pages**

Pre každú z `Clients.tsx`, `Logs.tsx`, `History.tsx`, `Settings.tsx`:

```tsx
export default function Clients() { return <h1 className="text-2xl font-semibold">Klienti</h1>; }
```

(nahraď meno per stránka)

- [ ] **Step 7.4: Router**

[src/router.tsx](src/router.tsx):

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import Clients from '@/pages/Clients';
import Logs from '@/pages/Logs';
import History from '@/pages/History';
import Settings from '@/pages/Settings';

export const router = createBrowserRouter([
  { path: '/', element: <Layout />, children: [
    { index: true, element: <Navigate to="/logs" replace /> },
    { path: 'clients',  element: <Clients /> },
    { path: 'logs',     element: <Logs /> },
    { path: 'history',  element: <History /> },
    { path: 'settings', element: <Settings /> },
  ]},
]);
```

- [ ] **Step 7.5: App bootstrap s corrupt JSON handlingom**

[src/App.tsx](src/App.tsx):

```tsx
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { CorruptJsonError } from '@/services/storage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [corrupt, setCorrupt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await useSettingsStore.getState().load();
        await useClientsStore.getState().load();
        await useLogsStore.getState().load();
        setReady(true);
      } catch (e) {
        if (e instanceof CorruptJsonError) setCorrupt(e.path);
        else throw e;
      }
    })();
  }, []);

  if (corrupt) return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-2">Poškodené dáta</h1>
      <p>Súbor <code>{corrupt}</code> je poškodený. Aplikácia neštartuje.</p>
      <p className="mt-2 text-sm text-slate-600">
        Otvor priečinok s dátami a súbor oprav alebo obnov zo zálohy.
      </p>
    </div>
  );
  if (!ready) return <div className="p-8">Načítavam…</div>;
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 7.6: main.tsx — beforeunload flush**

[src/main.tsx](src/main.tsx):

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { flushClientsForTest } from '@/stores/clientsStore';
import { flushLogsForTest } from '@/stores/logsStore';

window.addEventListener('beforeunload', () => {
  // ponytail: reuse test flush helpers (rovnaká debounce inštancia).
  void flushClientsForTest();
  void flushLogsForTest();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
```

- [ ] **Step 7.7: Over že bežiaci dev otvorí sidebar a route sa prepínajú**

```bash
npm run typecheck
npm run tauri dev
```

Expected: okno so sidebar-om, kliknutie prepína medzi 4 stub stránkami.

- [ ] **Step 7.8: Commit**

```bash
git add src/App.tsx src/main.tsx src/router.tsx src/components src/pages
git commit -m "No-Jira - add app shell router layout and page stubs"
```

---

## Task 8: /clients — Add/Edit dialóg, tabuľka, cascade delete

**Files:**
- Modify: `src/pages/Clients.tsx`
- Create: `src/components/ClientDialog.tsx`
- Create: `src/components/ClientTable.tsx`
- Create: `src/components/ConfirmDeleteDialog.tsx`

**Interfaces:**
- Consumes: `useClientsStore`, `useLogsStore` (na počet záznamov + cascade), shadcn `Dialog`, `AlertDialog`, `Table`, `Input`, `Label`, `Button`.
- Produces: plne funkčná /clients stránka podľa spec §7.1.

- [ ] **Step 8.1: ConfirmDeleteDialog (generický)**

[src/components/ConfirmDeleteDialog.tsx](src/components/ConfirmDeleteDialog.tsx):

```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({ open, onOpenChange, title, description, confirmLabel = 'Zmazať', onConfirm }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušiť</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 8.2: ClientDialog (add + edit)**

[src/components/ClientDialog.tsx](src/components/ClientDialog.tsx):

```tsx
import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Client } from '@/types/domain';

type Props = {
  trigger: React.ReactNode;
  initial?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void> | void;
};

const empty = { firstName: '', lastName: '', birthDate: '', parentName: '', school: '', note: '' };

export function ClientDialog({ trigger, initial, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);

  useEffect(() => {
    if (open) setForm(initial
      ? { firstName: initial.firstName, lastName: initial.lastName, birthDate: initial.birthDate,
          parentName: initial.parentName, school: initial.school, note: initial.note }
      : empty);
  }, [open, initial]);

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.birthDate;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{initial ? 'Upraviť klienta' : 'Pridať klienta'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Meno *</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><Label>Priezvisko *</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          <div><Label>Dátum narodenia *</Label><Input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
          <div><Label>Rodič</Label><Input value={form.parentName} onChange={e => setForm({ ...form, parentName: e.target.value })} /></div>
          <div className="col-span-2"><Label>Škola</Label><Input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} /></div>
          <div className="col-span-2"><Label>Poznámka</Label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Zrušiť</Button>
          <Button disabled={!canSubmit} onClick={async () => { await onSubmit(form); setOpen(false); }}>
            {initial ? 'Uložiť' : 'Pridať'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8.3: ClientTable**

[src/components/ClientTable.tsx](src/components/ClientTable.tsx):

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { formatSk } from '@/services/dateUtils';
import type { Client } from '@/types/domain';
import { ClientDialog } from './ClientDialog';

type Props = {
  clients: Client[];
  onEdit: (id: string, data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onAskDelete: (c: Client) => void;
};

export function ClientTable({ clients, onEdit, onAskDelete }: Props) {
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Priezvisko</TableHead><TableHead>Meno</TableHead>
        <TableHead>Dátum nar.</TableHead><TableHead>Škola</TableHead>
        <TableHead>Rodič</TableHead><TableHead>Poznámka</TableHead>
        <TableHead className="text-right">Akcie</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {clients.map(c => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.lastName}</TableCell>
            <TableCell>{c.firstName}</TableCell>
            <TableCell>{formatSk(c.birthDate)}</TableCell>
            <TableCell>{c.school}</TableCell>
            <TableCell>{c.parentName}</TableCell>
            <TableCell className="max-w-xs truncate">{c.note}</TableCell>
            <TableCell className="text-right">
              <ClientDialog
                trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                initial={c}
                onSubmit={(data) => onEdit(c.id, data)}
              />
              <Button variant="ghost" size="icon" onClick={() => onAskDelete(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 8.4: Clients page**

Prepíš [src/pages/Clients.tsx](src/pages/Clients.tsx):

```tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { ClientDialog } from '@/components/ClientDialog';
import { ClientTable } from '@/components/ClientTable';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import type { Client } from '@/types/domain';

export default function Clients() {
  const clients = useClientsStore(s => s.clients);
  const addClient = useClientsStore(s => s.add);
  const updateClient = useClientsStore(s => s.update);
  const removeClient = useClientsStore(s => s.remove);
  const removeLogsByClient = useLogsStore(s => s.removeByClient);
  const allLogs = useLogsStore(s => s.logs);

  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter(c =>
      c.firstName.toLowerCase().includes(needle) || c.lastName.toLowerCase().includes(needle));
  }, [clients, q]);

  const logsForToDelete = toDelete ? allLogs.filter(l => l.clientId === toDelete.id).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Klienti</h1>
        <Input placeholder="Hľadať (meno alebo priezvisko)…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
        <div className="flex-1" />
        <ClientDialog
          trigger={<Button><Plus className="h-4 w-4 mr-1" />Pridať klienta</Button>}
          onSubmit={async (data) => { await addClient(data); toast.success('Klient pridaný'); }}
        />
      </div>
      <ClientTable
        clients={filtered}
        onEdit={async (id, data) => { await updateClient(id, data); toast.success('Uložené'); }}
        onAskDelete={(c) => setToDelete(c)}
      />
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať klienta"
        description={logsForToDelete > 0
          ? <>Klient má <b>{logsForToDelete}</b> záznamov v denníku. Zmazať klienta aj všetky jeho záznamy?</>
          : 'Naozaj chcete klienta zmazať?'}
        onConfirm={async () => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          await removeLogsByClient(id);
          await removeClient(id);
          toast.success('Klient zmazaný');
        }}
      />
    </div>
  );
}
```

- [ ] **Step 8.5: Over ručne**

```bash
npm run typecheck
npm run tauri dev
```

Klik: Pridať → vytvor 2 klientov → Upraviť jedného → Search → Zmaz (bez logov, bez varovania). OK zavri.

- [ ] **Step 8.6: Commit**

```bash
git add src/pages/Clients.tsx src/components/ClientDialog.tsx src/components/ClientTable.tsx src/components/ConfirmDeleteDialog.tsx
git commit -m "No-Jira - add clients page with add edit delete and cascade"
```

---

## Task 9: docx generátor + smoke skript

**Files:**
- Create: `src/services/docxGenerator.ts`
- Create: `dev-scripts/smoke-docx.ts`
- Modify: `.gitignore` — pridaj `dev-scripts/templates/` a `dev-scripts/output/`
- Test: N/A (smoke only — spec §9)

**Interfaces:**
- Consumes: `docxtemplater`, `pizzip`, `@tauri-apps/plugin-fs` (readFile ako Uint8Array, writeFile ako Uint8Array), `buildOutputFilename`, `formatSk`, `ageAt`, `TEMPLATE_FILENAME`.
- Produces:
  - `type GenerateResult = { ok: true; outputPath: string } | { ok: false; reason: 'template-missing'|'template-corrupt'|'render-failed'|'write-failed'; message: string }`
  - `generateDocx(args: { client: Client; log: DailyLog; templatesFolder: string; outputFolder: string }): Promise<GenerateResult>`

- [ ] **Step 9.1: Implementuj generátor**

Vytvor [src/services/docxGenerator.ts](src/services/docxGenerator.ts):

```ts
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { readFile, writeFile, exists } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import type { Client, DailyLog } from '@/types/domain';
import { TEMPLATE_FILENAME } from '@/types/domain';
import { buildOutputFilename } from './filenames';
import { formatSk, ageAt } from './dateUtils';

export type GenerateResult =
  | { ok: true; outputPath: string }
  | { ok: false; reason: 'template-missing' | 'template-corrupt' | 'render-failed' | 'write-failed'; message: string };

export async function generateDocx(args: {
  client: Client; log: DailyLog; templatesFolder: string; outputFolder: string;
}): Promise<GenerateResult> {
  const { client, log, templatesFolder, outputFolder } = args;
  const templateName = TEMPLATE_FILENAME[log.activityType];
  const templatePath = await join(templatesFolder, templateName);

  if (!(await exists(templatePath))) {
    return { ok: false, reason: 'template-missing', message: `Šablóna nenájdená: ${templateName}` };
  }

  let bytes: Uint8Array;
  try {
    bytes = await readFile(templatePath);
  } catch (e) {
    return { ok: false, reason: 'template-corrupt', message: `Šablónu ${templateName} sa nepodarilo prečítať: ${String(e)}` };
  }

  let doc: Docxtemplater;
  try {
    const zip = new PizZip(bytes);
    doc = new Docxtemplater(zip, {
      paragraphLoop: true, linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });
  } catch (e) {
    return { ok: false, reason: 'template-corrupt', message: `Šablóna ${templateName} je poškodený .docx: ${String(e)}` };
  }

  const data = {
    meno: client.firstName,
    priezvisko: client.lastName,
    datum_narodenia: formatSk(client.birthDate),
    rodic: client.parentName,
    skola: client.school,
    poznamka: client.note,
    typ_cinnosti: log.activityType,
    datum_cinnosti: formatSk(log.date),
    vek: String(ageAt(client.birthDate, log.date)),
  };

  try {
    doc.render(data);
  } catch (e: any) {
    const errors = e?.properties?.errors;
    const first = Array.isArray(errors) && errors[0];
    const unknown = first?.properties?.explanation ?? String(e);
    return { ok: false, reason: 'render-failed', message: `Šablóna ${templateName} — chyba pri vyplňovaní: ${unknown}` };
  }

  const out = doc.getZip().generate({ type: 'uint8array' });
  const outName = buildOutputFilename({
    date: log.date, lastName: client.lastName, firstName: client.firstName, activityType: log.activityType,
  });
  const outPath = await join(outputFolder, outName);

  try {
    await writeFile(outPath, out);
  } catch (e) {
    return { ok: false, reason: 'write-failed', message: `Nepodarilo sa uložiť ${outName}: ${String(e)}` };
  }

  return { ok: true, outputPath: outPath };
}
```

- [ ] **Step 9.2: Smoke skript**

Vytvor [dev-scripts/smoke-docx.ts](dev-scripts/smoke-docx.ts):

```ts
/**
 * Ručný smoke test — spustí sa v prehliadači cez Vite dev, nie v Node.
 * Použitie:
 *   1) Do priečinka `dev-scripts/templates/` polož reálnu `terapia.docx`
 *      obsahujúcu placeholdery {{meno}} {{priezvisko}} {{datum_cinnosti}} {{vek}}.
 *   2) Do jednej z pages dočasne pridaj `import('@/../dev-scripts/smoke-docx').then(m => m.run())`.
 *   3) Otvor konzolu — mala by ohlásiť ok:true a cestu k výstupu.
 *
 * ponytail: schválne bez runneru — spec §9 zakazuje committovať šablóny.
 */
import { generateDocx } from '@/services/docxGenerator';
import { appLocalDataDir, join } from '@tauri-apps/api/path';

export async function run() {
  const base = await appLocalDataDir();
  const templatesFolder = await join(base, 'templates');
  const outputFolder = await join(base, 'output');

  const r = await generateDocx({
    client: {
      id: 't', firstName: 'Jozef', lastName: 'Novák',
      birthDate: '2015-05-10', parentName: 'Mária Nováková',
      school: 'ZŠ Test', note: 'smoke', createdAt: new Date().toISOString(),
    },
    log: {
      id: 't', date: '2026-09-04', clientId: 't', activityType: 'Terapia',
      isDocFilled: false, isEvupFilled: false, generatedDocPath: null,
      createdAt: new Date().toISOString(),
    },
    templatesFolder, outputFolder,
  });
  console.log('smoke-docx result:', r);
}
```

- [ ] **Step 9.3: `.gitignore` pre šablóny/output smoke priečinkov**

Pridaj na koniec [.gitignore](.gitignore):

```
dev-scripts/templates/
dev-scripts/output/
```

- [ ] **Step 9.4: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/services/docxGenerator.ts dev-scripts/smoke-docx.ts .gitignore
git commit -m "No-Jira - add docx generator and manual smoke script"
```

---

## Task 10: /logs — combobox, add form, LogRow, inline checkboxy, actions

**Files:**
- Modify: `src/pages/Logs.tsx`
- Create: `src/components/ClientCombobox.tsx`
- Create: `src/components/ActivitySelect.tsx`
- Create: `src/components/LogAddForm.tsx`
- Create: `src/components/LogRow.tsx`

**Interfaces:**
- Consumes: `useClientsStore`, `useLogsStore`, `useSettingsStore`, `generateDocx`, `formatSk`, `plugin-shell.open`.
- Produces:
  - `LogRow` prijme `log`, `client`, prop `onOpenDoc(log)`, `onRegenerate(log)`, `onDelete(log)`, `onToggleDoc(log)`, `onToggleEvup(log)`. Reused v /history.
  - `ClientCombobox({ value, onChange })` — shadcn `Command` + `Popover`, search po `firstName + lastName`.
  - `ActivitySelect({ value, onChange })` — shadcn `Select` s `ACTIVITY_TYPES`.

- [ ] **Step 10.1: ClientCombobox**

[src/components/ClientCombobox.tsx](src/components/ClientCombobox.tsx):

```tsx
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useClientsStore } from '@/stores/clientsStore';

type Props = { value: string; onChange: (id: string) => void };

export function ClientCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const clients = useClientsStore(s => s.clients);
  const selected = clients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-72 justify-between">
          {selected ? `${selected.lastName} ${selected.firstName}` : 'Vyber klienta…'}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command filter={(v, s) => v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0}>
          <CommandInput placeholder="Hľadať klienta…" />
          <CommandEmpty>Nič nenájdené.</CommandEmpty>
          <CommandGroup>
            {clients.map(c => {
              const label = `${c.lastName} ${c.firstName}`;
              return (
                <CommandItem key={c.id} value={label} onSelect={() => { onChange(c.id); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', c.id === value ? 'opacity-100' : 'opacity-0')} />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 10.2: ActivitySelect**

[src/components/ActivitySelect.tsx](src/components/ActivitySelect.tsx):

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACTIVITY_TYPES, type ActivityType } from '@/types/domain';

type Props = { value: ActivityType | ''; onChange: (v: ActivityType) => void };

export function ActivitySelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ActivityType)}>
      <SelectTrigger className="w-72"><SelectValue placeholder="Typ činnosti…" /></SelectTrigger>
      <SelectContent>
        {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 10.3: LogRow (zdieľaný komponent)**

[src/components/LogRow.tsx](src/components/LogRow.tsx):

```tsx
import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import type { Client, DailyLog } from '@/types/domain';
import { formatSk } from '@/services/dateUtils';

type Props = {
  log: DailyLog;
  client: Client | undefined;
  showDate?: boolean;
  onToggleDoc: (log: DailyLog, v: boolean) => void;
  onToggleEvup: (log: DailyLog, v: boolean) => void;
  onOpenDoc: (log: DailyLog) => void;
  onRegenerate: (log: DailyLog) => void;
  onDelete: (log: DailyLog) => void;
};

export function LogRow({ log, client, showDate, onToggleDoc, onToggleEvup, onOpenDoc, onRegenerate, onDelete }: Props) {
  return (
    <TableRow>
      {showDate && <TableCell>{formatSk(log.date)}</TableCell>}
      <TableCell>{client ? `${client.lastName} ${client.firstName}` : <span className="text-slate-400">(zmazaný)</span>}</TableCell>
      <TableCell>{log.activityType}</TableCell>
      <TableCell><Checkbox checked={log.isDocFilled} onCheckedChange={(v) => onToggleDoc(log, !!v)} /></TableCell>
      <TableCell><Checkbox checked={log.isEvupFilled} onCheckedChange={(v) => onToggleEvup(log, !!v)} /></TableCell>
      <TableCell className="text-right">
        {log.generatedDocPath
          ? <Button variant="ghost" size="sm" onClick={() => onOpenDoc(log)}><FileText className="h-4 w-4 mr-1" />Otvoriť</Button>
          : <Button variant="ghost" size="sm" onClick={() => onRegenerate(log)}><RefreshCw className="h-4 w-4 mr-1" />Regenerovať</Button>}
        <Button variant="ghost" size="icon" onClick={() => onDelete(log)}><Trash2 className="h-4 w-4" /></Button>
      </TableCell>
    </TableRow>
  );
}
```

- [ ] **Step 10.4: LogAddForm**

[src/components/LogAddForm.tsx](src/components/LogAddForm.tsx):

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilePlus2 } from 'lucide-react';
import type { ActivityType } from '@/types/domain';
import { ClientCombobox } from './ClientCombobox';
import { ActivitySelect } from './ActivitySelect';

type Props = { onSubmit: (clientId: string, activityType: ActivityType) => Promise<void> };

export function LogAddForm({ onSubmit }: Props) {
  const [clientId, setClientId] = useState('');
  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [busy, setBusy] = useState(false);

  const disabled = !clientId || !activity || busy;

  return (
    <div className="flex items-end gap-3 p-3 rounded border bg-slate-50">
      <ClientCombobox value={clientId} onChange={setClientId} />
      <ActivitySelect value={activity} onChange={setActivity} />
      <Button disabled={disabled} onClick={async () => {
        if (!clientId || !activity) return;
        setBusy(true);
        try { await onSubmit(clientId, activity); setClientId(''); setActivity(''); }
        finally { setBusy(false); }
      }}>
        <FilePlus2 className="h-4 w-4 mr-1" />Zaevidovať &amp; Vygenerovať .docx
      </Button>
    </div>
  );
}
```

- [ ] **Step 10.5: Logs page**

Prepíš [src/pages/Logs.tsx](src/pages/Logs.tsx):

```tsx
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import type { ActivityType, DailyLog } from '@/types/domain';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateDocx } from '@/services/docxGenerator';
import { LogAddForm } from '@/components/LogAddForm';
import { LogRow } from '@/components/LogRow';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

function today() { return new Date().toISOString().slice(0, 10); }

export default function Logs() {
  const [date, setDate] = useState(today());
  const [toDelete, setToDelete] = useState<DailyLog | null>(null);

  const clients = useClientsStore(s => s.clients);
  const logs = useLogsStore(s => s.logs);
  const addLog = useLogsStore(s => s.add);
  const updateLog = useLogsStore(s => s.update);
  const removeLog = useLogsStore(s => s.remove);
  const settings = useSettingsStore(s => s.settings);

  const dayLogs = useMemo(
    () => logs.filter(l => l.date === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [logs, date],
  );
  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  async function doGenerate(log: DailyLog, opts: { regenerate?: boolean } = {}) {
    const client = clientById.get(log.clientId);
    if (!client) { toast.error('Klient neexistuje'); return; }
    const r = await generateDocx({
      client, log,
      templatesFolder: settings.templatesFolderPath,
      outputFolder: settings.outputFolderPath,
    });
    if (r.ok) {
      await updateLog(log.id, { generatedDocPath: r.outputPath });
      toast.success(opts.regenerate ? 'Dokument regenerovaný' : 'Zaevidované a vygenerované');
    } else {
      await updateLog(log.id, { generatedDocPath: null });
      toast.error(r.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Denník</h1>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        <span className="text-sm text-slate-500">{dayLogs.length} záznamov</span>
      </div>

      <LogAddForm onSubmit={async (clientId, activityType: ActivityType) => {
        const log = await addLog({
          date, clientId, activityType,
          isDocFilled: false, isEvupFilled: false, generatedDocPath: null,
        });
        await doGenerate(log);
      }} />

      <Table>
        <TableHeader><TableRow>
          <TableHead>Klient</TableHead>
          <TableHead>Typ činnosti</TableHead>
          <TableHead>Doc vyplnený</TableHead>
          <TableHead>EvuP</TableHead>
          <TableHead className="text-right">Akcie</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {dayLogs.map(l => (
            <LogRow key={l.id}
              log={l} client={clientById.get(l.clientId)}
              onToggleDoc={(log, v) => updateLog(log.id, { isDocFilled: v })}
              onToggleEvup={(log, v) => updateLog(log.id, { isEvupFilled: v })}
              onOpenDoc={async (log) => {
                if (!log.generatedDocPath) return;
                try { await shellOpen(log.generatedDocPath); }
                catch { toast.error('Súbor už neexistuje, regenerujte.'); }
              }}
              onRegenerate={(log) => doGenerate(log, { regenerate: true })}
              onDelete={(log) => setToDelete(log)}
            />
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať záznam"
        description="Naozaj zmazať tento záznam? Vygenerovaný .docx ostáva na disku."
        onConfirm={async () => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          await removeLog(id);
          toast.success('Záznam zmazaný');
        }}
      />
    </div>
  );
}
```

- [ ] **Step 10.6: Over**

```bash
npm run typecheck
npm run tauri dev
```

Ručne: pridaj klienta, prepni na Denník, zaeviduj s typom Terapia. Toast oznámi missing template (šablóna neexistuje) — očakávané.

- [ ] **Step 10.7: Commit**

```bash
git add src/pages/Logs.tsx src/components/ClientCombobox.tsx src/components/ActivitySelect.tsx src/components/LogAddForm.tsx src/components/LogRow.tsx
git commit -m "No-Jira - add logs page with combobox add form and inline actions"
```

---

## Task 11: /history — rok/mesiac filter, sumár, tabuľka

**Files:**
- Modify: `src/pages/History.tsx`

**Interfaces:**
- Consumes: `useLogsStore`, `useClientsStore`, `useSettingsStore`, `generateDocx`, `LogRow`, `ACTIVITY_TYPES`.
- Produces: history stránka podľa spec §7.3.

- [ ] **Step 11.1: History page**

Prepíš [src/pages/History.tsx](src/pages/History.tsx):

```tsx
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import type { ActivityType, DailyLog } from '@/types/domain';
import { ACTIVITY_TYPES } from '@/types/domain';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateDocx } from '@/services/docxGenerator';
import { LogRow } from '@/components/LogRow';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const MONTHS = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];

export default function History() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1..12
  const [toDelete, setToDelete] = useState<DailyLog | null>(null);

  const clients = useClientsStore(s => s.clients);
  const logs = useLogsStore(s => s.logs);
  const updateLog = useLogsStore(s => s.update);
  const removeLog = useLogsStore(s => s.remove);
  const settings = useSettingsStore(s => s.settings);

  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    logs.forEach(l => ys.add(Number(l.date.slice(0, 4))));
    return Array.from(ys).sort((a, b) => b - a);
  }, [logs, now]);

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = useMemo(
    () => logs
      .filter(l => l.date.startsWith(prefix))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [logs, prefix],
  );

  const uniqueClients = new Set(rows.map(r => r.clientId)).size;
  const byType: Record<string, number> = {};
  ACTIVITY_TYPES.forEach(t => { byType[t] = 0; });
  rows.forEach(r => { byType[r.activityType] = (byType[r.activityType] ?? 0) + 1; });

  async function regenerate(log: DailyLog) {
    const client = clientById.get(log.clientId);
    if (!client) { toast.error('Klient neexistuje'); return; }
    const r = await generateDocx({
      client, log,
      templatesFolder: settings.templatesFolderPath,
      outputFolder: settings.outputFolderPath,
    });
    if (r.ok) { await updateLog(log.id, { generatedDocPath: r.outputPath }); toast.success('Regenerované'); }
    else { await updateLog(log.id, { generatedDocPath: null }); toast.error(r.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">História</h1>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span><b>{rows.length}</b> záznamov</span>
        <span>· <b>{uniqueClients}</b> klientov</span>
        {ACTIVITY_TYPES.filter(t => byType[t] > 0).map(t => (
          <Badge key={t} variant="secondary">{t}: {byType[t]}</Badge>
        ))}
      </div>

      <Table>
        <TableHeader><TableRow>
          <TableHead>Dátum</TableHead>
          <TableHead>Klient</TableHead>
          <TableHead>Typ činnosti</TableHead>
          <TableHead>Doc</TableHead>
          <TableHead>EvuP</TableHead>
          <TableHead className="text-right">Akcie</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(l => (
            <LogRow key={l.id}
              log={l} client={clientById.get(l.clientId)} showDate
              onToggleDoc={(log, v) => updateLog(log.id, { isDocFilled: v })}
              onToggleEvup={(log, v) => updateLog(log.id, { isEvupFilled: v })}
              onOpenDoc={async (log) => {
                if (!log.generatedDocPath) return;
                try { await shellOpen(log.generatedDocPath); }
                catch { toast.error('Súbor už neexistuje, regenerujte.'); }
              }}
              onRegenerate={regenerate}
              onDelete={(log) => setToDelete(log)}
            />
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať záznam"
        description="Naozaj zmazať tento záznam?"
        onConfirm={async () => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          await removeLog(id);
          toast.success('Záznam zmazaný');
        }}
      />
    </div>
  );
}
```

- [ ] **Step 11.2: Over**

```bash
npm run typecheck
npm run tauri dev
```

Ručne: zmeň mesiac na predchádzajúci — tabuľka prázdna, badges nezobrazené. Vytvor záznam pre aktuálny mesiac → objaví sa.

- [ ] **Step 11.3: Commit**

```bash
git add src/pages/History.tsx
git commit -m "No-Jira - add history page with year month filter and summary"
```

---

## Task 12: /settings — folder pickers, stav šablón, about

**Files:**
- Modify: `src/pages/Settings.tsx`

**Interfaces:**
- Consumes: `useSettingsStore`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-shell`, `@tauri-apps/plugin-fs.exists`, `@tauri-apps/api/app.getVersion`, `TEMPLATE_FILENAME`, `ACTIVITY_TYPES`.
- Produces: settings stránka podľa spec §7.4.

- [ ] **Step 12.1: Settings page**

Prepíš [src/pages/Settings.tsx](src/pages/Settings.tsx):

```tsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, RefreshCw, Folder } from 'lucide-react';
import { open as pickFolder } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { exists } from '@tauri-apps/plugin-fs';
import { join, appLocalDataDir } from '@tauri-apps/api/path';
import { getVersion } from '@tauri-apps/api/app';
import { ACTIVITY_TYPES, TEMPLATE_FILENAME } from '@/types/domain';
import { useSettingsStore } from '@/stores/settingsStore';

export default function Settings() {
  const settings = useSettingsStore(s => s.settings);
  const setTemplates = useSettingsStore(s => s.setTemplatesFolder);
  const setOutput = useSettingsStore(s => s.setOutputFolder);

  const [version, setVersion] = useState('');
  const [dataDir, setDataDir] = useState('');
  const [templateStatus, setTemplateStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setVersion(await getVersion());
      setDataDir(await appLocalDataDir());
    })();
  }, []);

  async function refreshTemplateStatus() {
    const next: Record<string, boolean> = {};
    for (const t of ACTIVITY_TYPES) {
      const p = await join(settings.templatesFolderPath, TEMPLATE_FILENAME[t]);
      next[t] = await exists(p);
    }
    setTemplateStatus(next);
  }
  useEffect(() => { if (settings.templatesFolderPath) void refreshTemplateStatus(); }, [settings.templatesFolderPath]);

  async function pick(kind: 'templates' | 'output') {
    const picked = await pickFolder({ directory: true, multiple: false });
    if (typeof picked !== 'string') return;
    if (kind === 'templates') await setTemplates(picked);
    else await setOutput(picked);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Nastavenia</h1>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm text-slate-500">Priečinok so šablónami</div>
            <div className="font-mono text-sm truncate">{settings.templatesFolderPath || '—'}</div>
          </div>
          <Button variant="outline" onClick={() => pick('templates')}><FolderOpen className="h-4 w-4 mr-1" />Vybrať</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm text-slate-500">Priečinok pre výstupné dokumenty</div>
            <div className="font-mono text-sm truncate">{settings.outputFolderPath || '—'}</div>
          </div>
          <Button variant="outline" onClick={() => pick('output')}><FolderOpen className="h-4 w-4 mr-1" />Vybrať</Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stav šablón</h2>
          <Button variant="ghost" size="sm" onClick={refreshTemplateStatus}><RefreshCw className="h-4 w-4 mr-1" />Obnoviť</Button>
        </div>
        <div className="space-y-1">
          {ACTIVITY_TYPES.map(t => {
            const ok = templateStatus[t];
            return (
              <div key={t} className="flex items-center gap-3 text-sm">
                <Badge variant={ok ? 'default' : 'destructive'}>{ok ? '✓' : '✗'}</Badge>
                <span className="w-64">{t}</span>
                <span className="font-mono text-slate-600">{TEMPLATE_FILENAME[t]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-semibold">O aplikácii</h2>
        <div>Verzia: <b>{version}</b></div>
        <div>Dátový priečinok: <span className="font-mono">{dataDir}</span></div>
        <Button variant="outline" size="sm" onClick={() => dataDir && shellOpen(dataDir)}>
          <Folder className="h-4 w-4 mr-1" />Otvoriť dátový priečinok
        </Button>
      </section>
    </div>
  );
}
```

- [ ] **Step 12.2: Over**

```bash
npm run typecheck
npm run tauri dev
```

Ručne: prekliknúť Settings, vybrať priečinok šablón (napr. Desktop), skontrolovať že cesta sa uloží (reštart appky → ostane).

- [ ] **Step 12.3: Commit**

```bash
git add src/pages/Settings.tsx
git commit -m "No-Jira - add settings page with folder pickers and template status"
```

---

## Task 13: CI + finálny cleanup

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `README.md` (krátky bootstrap návod pre buduceho seba)

**Interfaces:**
- Consumes: nič
- Produces: passing CI na push/PR, README so 6 riadkami "ako to spustiť".

- [ ] **Step 13.1: CI workflow**

Vytvor [.github/workflows/ci.yml](.github/workflows/ci.yml):

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - uses: dtolnay/rust-toolchain@stable
      - name: Cache cargo
        uses: Swatinem/rust-cache@v2
        with: { workspaces: 'src-tauri -> target' }
      - name: Install tauri linux deps
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev
      - run: npm ci
      - run: npm test
      - run: npm run typecheck
      - run: cargo build --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 13.2: README**

Vytvor / prepíš [README.md](README.md):

```md
# Evidencia činnosti

Offline desktop appka pre psychologickú poradňu.
Spec: [docs/superpowers/specs/2026-09-04-evidencia-cinnosti-design.md](docs/superpowers/specs/2026-09-04-evidencia-cinnosti-design.md).

## Vývoj

```
npm install
npm run tauri dev     # dev okno
npm test              # vitest
npm run typecheck     # tsc --noEmit
npm run tauri build   # produkčný build (.msi/.dmg podľa OS)
```

Dáta a defaultné šablóny/output priečinky sú v OS-native `AppLocalData` — cestu ukazuje stránka Nastavenia.
```

- [ ] **Step 13.3: Finálny sanity check**

```bash
npm test
npm run typecheck
npm run tauri dev
```

Prejdi manuálne: pridaj klienta, zaeviduj záznam s typom (bez šablôn — čakaj toast), skontroluj že po reštarte appky sú dáta na mieste.

- [ ] **Step 13.4: Commit**

```bash
git add .github/workflows/ci.yml README.md
git commit -m "No-Jira - add ci workflow and readme"
```

---

## Self-Review

**Spec coverage:**

| Spec sekcia | Task |
|---|---|
| §2 Tech stack | 1 |
| §3 Architektúra + priečinky | 1, 7 (shell) |
| §4 Doménový model + ACTIVITY_TYPES konštanta | 2 |
| §5 Storage (atomic, debounced, corrupt hard-fail, beforeunload) | 5 (storage), 6 (debounced flush), 7 (bootstrap + corrupt modal + beforeunload) |
| §6 Docx generátor (GenerateResult, mapa typov, regenerácia = prepis) | 9 |
| §7.1 /clients | 8 |
| §7.2 /logs | 10 |
| §7.3 /history | 11 |
| §7.4 /settings | 12 |
| Shadcn komponenty (button, input, label, select, dialog, alert-dialog, table, checkbox, command, popover, sonner, badge, separator) | 1 (install), 8/10/11/12 (use) |
| §8 Chybové stavy — corrupt JSON | 7 (App bootstrap) |
| §8 — chýbajúca šablóna / render fail / write fail | 9 (GenerateResult) + 10/11 (toast) |
| §8 — otvorenie zmazaného .docx | 10, 11 (try/catch shell open) |
| §8 — cascade delete | 6 (removeByClient), 8 (Confirm dialog) |
| §9 Testy (filenames, dateUtils, storage, logsStore) | 4, 3, 5, 6 |
| §9 Smoke docx | 9 |
| §9 CI | 13 |
| §10 Non-goals | rešpektované (bez dark mode, bez i18n, bez per-klient filtra) |
| §11 Otvorené body — template filenames | 2 (TEMPLATE_FILENAME konštanta = 1-riadková zmena keď prídu reálne názvy) |

**Placeholder scan:** žiadne TBD, žiadne "similar to Task N", žiadne "add appropriate error handling" — každý krok má konkrétny kód alebo príkaz.

**Type consistency:**
- `Storage.read/write` — konzistentne generic `<T>` naprieč Task 5/6.
- `GenerateResult` union — spotrebúva sa v Task 10 a 11 rovnako (`r.ok ? r.outputPath : r.message`).
- `LogRow` props — definované v Task 10, použité identicky v Task 11 (`showDate` volitelný flag).
- `removeByClient(clientId)` v Task 6 == volané v Task 8.
- `TEMPLATE_FILENAME` v Task 2 == čítané v Task 9 aj 12.

**Známy kompromis (ponytail):** `flushClientsForTest`/`flushLogsForTest` v Task 6 slúžia aj ako beforeunload hook v Task 7 (Step 7.6) — jednoduchšie ako duplikovať debouncer. Ak by neskôr flush() semantiku bolo treba oddeliť, premenovať export a exportnúť oba.

---

## Execution Handoff

**Plan complete and saved to [docs/superpowers/plans/2026-09-04-evidencia-cinnosti-implementation.md](docs/superpowers/plans/2026-09-04-evidencia-cinnosti-implementation.md). Two execution options:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review medzi taskami, rýchla iterácia.

**2. Inline Execution** — Tasky beží táto session, batch checkpoints.

**Ktorý spôsob?**
