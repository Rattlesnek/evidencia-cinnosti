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
