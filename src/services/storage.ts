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
