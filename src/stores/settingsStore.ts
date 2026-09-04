import { create } from 'zustand';
import { appLocalDataDir, join } from '@tauri-apps/api/path';
import type { Settings } from '@/types/domain';
import { storage as defaultStorage, ensureAppDataSubdir, type Storage } from '@/services/storage';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'settings.json';
type State = {
  settings: Settings;
  load: () => Promise<void>;
  setTemplatesFolder: (path: string) => Promise<void>;
  setOutputFolder: (path: string) => Promise<void>;
};

async function defaults(): Promise<Settings> {
  const base = await appLocalDataDir();
  return {
    templatesFolderPath: await join(base, 'templates'),
    outputFolderPath:    await join(base, 'output'),
  };
}

export const useSettingsStore = create<State>((set, get) => ({
  settings: { templatesFolderPath: '', outputFolderPath: '' },
  async load() {
    const d = await defaults();
    const s = await storage.read<Settings>(FILE, d);
    set({ settings: s });
    if (s === d) {
      await ensureAppDataSubdir('templates');
      await ensureAppDataSubdir('output');
      await storage.write(FILE, s);
    }
  },
  async setTemplatesFolder(p) {
    const next = { ...get().settings, templatesFolderPath: p };
    set({ settings: next });
    await storage.write(FILE, next);
  },
  async setOutputFolder(p) {
    const next = { ...get().settings, outputFolderPath: p };
    set({ settings: next });
    await storage.write(FILE, next);
  },
}));
