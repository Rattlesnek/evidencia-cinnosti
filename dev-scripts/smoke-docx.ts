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
