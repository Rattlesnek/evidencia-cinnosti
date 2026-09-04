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
