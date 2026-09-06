/** ISO 'YYYY-MM-DD' → 'dd.MM.yyyy'. Bez Date parseru — čisté string operácie. */
export function formatSk(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** 'd.M.yyyy' (aj 'dd.MM.yyyy') → ISO 'YYYY-MM-DD', alebo null ak vstup nie je platný dátum.
 *  Toleruje medzery okolo (napr. copy-paste). Roky < 1000 alebo > 9999 = null. */
export function parseSk(input: string): string | null {
  const m = /^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/.exec(input);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  // validácia: kalendárny dátum musí existovať (odchytí 31.02, 30.02, 31.04, ...)
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${yyyy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Plné roky medzi birthDate a atDate. Oba ISO 'YYYY-MM-DD'. */
export function ageAt(birthDate: string, atDate: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ay, am, ad] = atDate.split('-').map(Number);
  let age = ay - by;
  if (am < bm || (am === bm && ad < bd)) age--;
  return age;
}
