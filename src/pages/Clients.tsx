import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { ClientDialog } from '@/components/ClientDialog';
import { ClientTable } from '@/components/ClientTable';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import type { Client } from '@/types/domain';

export default function Clients() {
  const clients = useClientsStore(s => s.clients);
  const addClient = useClientsStore(s => s.add);
  const updateClient = useClientsStore(s => s.update);
  const removeClient = useClientsStore(s => s.remove);
  const removeLogsByClient = useLogsStore(s => s.removeByClient);
  const allLogs = useLogsStore(s => s.logs);

  const [q, setQ] = useState('');
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return clients;
    return clients.filter(c =>
      c.firstName.toLowerCase().includes(needle) || c.lastName.toLowerCase().includes(needle));
  }, [clients, q]);

  const logsForToDelete = toDelete ? allLogs.filter(l => l.clientId === toDelete.id).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Klienti</h1>
        <Input placeholder="Hľadať (meno alebo priezvisko)…" value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
        <div className="flex-1" />
        <ClientDialog
          trigger={<Button><Plus className="h-4 w-4 mr-1" />Pridať klienta</Button>}
          onSubmit={async (data) => { await addClient(data); toast.success('Klient pridaný'); }}
        />
      </div>
      <ClientTable
        clients={filtered}
        onEdit={async (id, data) => { await updateClient(id, data); toast.success('Uložené'); }}
        onAskDelete={(c) => setToDelete(c)}
      />
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať klienta"
        description={logsForToDelete > 0
          ? <>Klient má <b>{logsForToDelete}</b> záznamov v denníku. Zmazať klienta aj všetky jeho záznamy?</>
          : 'Naozaj chcete klienta zmazať?'}
        onConfirm={async () => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          await removeLogsByClient(id);
          await removeClient(id);
          toast.success('Klient zmazaný');
        }}
      />
    </div>
  );
}
