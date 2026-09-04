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
