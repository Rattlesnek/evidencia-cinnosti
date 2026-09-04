import { describe, it, expect, beforeEach } from 'vitest';
import { useLogsStore, _setStorageForTest, flushLogsForTest } from './logsStore';
import { InMemoryStorage } from '@/services/storage';

let mem: InMemoryStorage;
beforeEach(() => {
  mem = new InMemoryStorage();
  _setStorageForTest(mem);
  useLogsStore.setState({ logs: [] });
});

describe('logsStore', () => {
  it('add zapíše do storage (po flush)', async () => {
    await useLogsStore.getState().add({
      date: '2026-09-04', clientId: 'c1', activityType: 'Terapia',
      isDocFilled: false, isEvupFilled: false, generatedDocPath: null,
    });
    await flushLogsForTest();
    const persisted = await mem.read('daily_logs.json', [] as unknown[]);
    expect(persisted).toHaveLength(1);
  });

  it('removeByClient vymaže všetky logy klienta', async () => {
    useLogsStore.setState({ logs: [
      { id: 'a', clientId: 'c1', date: '2026-01-01', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
      { id: 'b', clientId: 'c2', date: '2026-01-02', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
      { id: 'c', clientId: 'c1', date: '2026-01-03', activityType: 'Diagnostika',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
    ]});
    await useLogsStore.getState().removeByClient('c1');
    expect(useLogsStore.getState().logs.map(l => l.id)).toEqual(['b']);
  });

  it('update prepisuje polia', async () => {
    useLogsStore.setState({ logs: [
      { id: 'a', clientId: 'c1', date: '2026-01-01', activityType: 'Terapia',
        isDocFilled: false, isEvupFilled: false, generatedDocPath: null, createdAt: '' },
    ]});
    await useLogsStore.getState().update('a', { isDocFilled: true });
    expect(useLogsStore.getState().logs[0].isDocFilled).toBe(true);
  });
});
