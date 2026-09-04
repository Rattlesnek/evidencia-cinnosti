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
