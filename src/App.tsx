import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { CorruptJsonError } from '@/services/storage';

export default function App() {
  const [ready, setReady] = useState(false);
  const [corrupt, setCorrupt] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await useSettingsStore.getState().load();
        await useClientsStore.getState().load();
        await useLogsStore.getState().load();
        setReady(true);
      } catch (e) {
        if (e instanceof CorruptJsonError) setCorrupt(e.path);
        else {
          // ponytail: nezakryť tichým throw-om — aby biela obrazovka nikdy nebola záhada.
          console.error('Bootstrap failed:', e);
          setFatalError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
  }, []);

  if (corrupt) return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-2">Poškodené dáta</h1>
      <p>Súbor <code>{corrupt}</code> je poškodený. Aplikácia neštartuje.</p>
      <p className="mt-2 text-sm text-slate-600">
        Otvor priečinok s dátami a súbor oprav alebo obnov zo zálohy.
      </p>
    </div>
  );
  if (fatalError) return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-2">Chyba pri štarte</h1>
      <pre className="text-sm bg-slate-100 p-3 rounded whitespace-pre-wrap">{fatalError}</pre>
      <p className="mt-2 text-sm text-slate-600">Detaily v konzole (Cmd+Option+I).</p>
    </div>
  );
  if (!ready) return <div className="p-8">Načítavam…</div>;
  return <RouterProvider router={router} />;
}
