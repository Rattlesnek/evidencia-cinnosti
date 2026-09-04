import { create } from 'zustand';
import type { DailyLog } from '@/types/domain';
import { storage as defaultStorage, type Storage } from '@/services/storage';
import { debounce } from '@/services/debounce';

let storage: Storage = defaultStorage;
export function _setStorageForTest(s: Storage) { storage = s; }

const FILE = 'daily_logs.json';
type State = {
  logs: DailyLog[];
  load: () => Promise<void>;
  add: (input: Omit<DailyLog, 'id' | 'createdAt'>) => Promise<DailyLog>;
  update: (id: string, patch: Partial<DailyLog>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeByClient: (clientId: string) => Promise<void>;
};

const flusher = debounce((data: DailyLog[]) => { void storage.write(FILE, data); }, 300);
export function flushLogsForTest() {
  return new Promise<void>((r) => { flusher.flush(); setTimeout(r, 0); });
}

export const useLogsStore = create<State>((set, get) => ({
  logs: [],
  async load() { set({ logs: await storage.read<DailyLog[]>(FILE, []) }); },
  async add(input) {
    const l: DailyLog = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set({ logs: [...get().logs, l] });
    flusher.call(get().logs);
    return l;
  },
  async update(id, patch) {
    set({ logs: get().logs.map(l => l.id === id ? { ...l, ...patch } : l) });
    flusher.call(get().logs);
  },
  async remove(id) {
    set({ logs: get().logs.filter(l => l.id !== id) });
    flusher.call(get().logs);
  },
  async removeByClient(clientId) {
    set({ logs: get().logs.filter(l => l.clientId !== clientId) });
    flusher.call(get().logs);
  },
}));
