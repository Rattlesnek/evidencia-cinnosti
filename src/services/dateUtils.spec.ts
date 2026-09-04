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
    expect(ageAt('2000-02-29', '2026-02-28')).toBe(25);
    expect(ageAt('2000-02-29', '2026-03-01')).toBe(26);
  });
  it('rovnaký rok — 0', () => {
    expect(ageAt('2026-01-01', '2026-06-01')).toBe(0);
  });
});
