import { useMemo, useState } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePicker } from '@/components/DatePicker';
import { toast } from 'sonner';
import { openPath } from '@tauri-apps/plugin-opener';
import type { ActivityType, DailyLog } from '@/types/domain';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateDocx } from '@/services/docxGenerator';
import { LogAddForm } from '@/components/LogAddForm';
import { LogRow } from '@/components/LogRow';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

function today() { return new Date().toISOString().slice(0, 10); }

export default function Logs() {
  const [date, setDate] = useState(today());
  const [toDelete, setToDelete] = useState<DailyLog | null>(null);

  const clients = useClientsStore(s => s.clients);
  const logs = useLogsStore(s => s.logs);
  const addLog = useLogsStore(s => s.add);
  const updateLog = useLogsStore(s => s.update);
  const removeLog = useLogsStore(s => s.remove);
  const settings = useSettingsStore(s => s.settings);

  const dayLogs = useMemo(
    () => logs.filter(l => l.date === date).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [logs, date],
  );
  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  async function doGenerate(log: DailyLog, opts: { regenerate?: boolean } = {}) {
    const client = clientById.get(log.clientId);
    if (!client) { toast.error('Klient neexistuje'); return; }
    const r = await generateDocx({
      client, log,
      templatesFolder: settings.templatesFolderPath,
      outputFolder: settings.outputFolderPath,
    });
    if (r.ok) {
      await updateLog(log.id, { generatedDocPath: r.outputPath });
      toast.success(opts.regenerate ? 'Dokument regenerovaný' : 'Zaevidované a vygenerované');
    } else {
      await updateLog(log.id, { generatedDocPath: null });
      toast.error(r.message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Denník</h1>
        <DatePicker value={date} onChange={setDate} className="w-52" />
        <span className="text-sm text-slate-500">{dayLogs.length} záznamov</span>
      </div>

      <LogAddForm onSubmit={async (clientId, activityType: ActivityType) => {
        const log = await addLog({
          date, clientId, activityType,
          isDocFilled: false, isEvupFilled: false, generatedDocPath: null,
        });
        await doGenerate(log);
      }} />

      <Table>
        <TableHeader><TableRow>
          <TableHead>Klient</TableHead>
          <TableHead>Typ činnosti</TableHead>
          <TableHead>Doc vyplnený</TableHead>
          <TableHead>EvuP</TableHead>
          <TableHead className="text-right">Akcie</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {dayLogs.map(l => (
            <LogRow key={l.id}
              log={l} client={clientById.get(l.clientId)}
              onToggleDoc={(log, v) => updateLog(log.id, { isDocFilled: v })}
              onToggleEvup={(log, v) => updateLog(log.id, { isEvupFilled: v })}
              onOpenDoc={async (log) => {
                if (!log.generatedDocPath) return;
                try { await openPath(log.generatedDocPath); }
                catch (e) { toast.error(`Nepodarilo sa otvoriť súbor: ${String(e)}`); }
              }}
              onRegenerate={(log) => doGenerate(log, { regenerate: true })}
              onDelete={(log) => setToDelete(log)}
            />
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať záznam"
        description="Naozaj zmazať tento záznam? Vygenerovaný .docx ostáva na disku."
        onConfirm={async () => {
          if (!toDelete) return;
          const id = toDelete.id;
          setToDelete(null);
          await removeLog(id);
          toast.success('Záznam zmazaný');
        }}
      />
    </div>
  );
}
