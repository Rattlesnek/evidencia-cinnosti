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
