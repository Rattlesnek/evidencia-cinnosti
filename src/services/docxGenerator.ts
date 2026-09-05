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
    bydlisko: client.address,
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
