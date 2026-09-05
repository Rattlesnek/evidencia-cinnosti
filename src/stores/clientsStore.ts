import { create } from 'zustand';
import type { Client } from '@/types/domain';
import { storage as defaultStorage, type Storage } from '@/services/storage';
import { debounce } from '@/services/debounce';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'clients.json';
type State = {
  clients: Client[];
  load: () => Promise<void>;
  add: (input: Omit<Client, 'id' | 'createdAt'>) => Promise<Client>;
  update: (id: string, patch: Partial<Client>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const flusher = debounce((data: Client[]) => { void storage.write(FILE, data); }, 300);
export function flushClientsForTest() {
  return new Promise<void>((r) => { flusher.flush(); setTimeout(r, 0); });
}

export const useClientsStore = create<State>((set, get) => ({
  clients: [],
  async load() {
    // ponytail: migrate legacy `parentName` → `address` on read; drop when no live JSON has it.
    const raw = await storage.read<Array<Client & { parentName?: string }>>(FILE, []);
    const clients: Client[] = raw.map(({ parentName, ...c }) => ({
      ...c, address: c.address ?? parentName ?? '',
    }));
    set({ clients });
  },
  async add(input) {
    const c: Client = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set({ clients: [...get().clients, c] });
    flusher.call(get().clients);
    return c;
  },
  async update(id, patch) {
    set({ clients: get().clients.map(c => c.id === id ? { ...c, ...patch } : c) });
    flusher.call(get().clients);
  },
  async remove(id) {
    set({ clients: get().clients.filter(c => c.id !== id) });
    flusher.call(get().clients);
  },
}));
