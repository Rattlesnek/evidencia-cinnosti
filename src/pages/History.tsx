import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { openPath } from '@tauri-apps/plugin-opener';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { DailyLog } from '@/types/domain';
import { ACTIVITY_TYPES } from '@/types/domain';
import { useClientsStore } from '@/stores/clientsStore';
import { useLogsStore } from '@/stores/logsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { generateDocx } from '@/services/docxGenerator';
import { LogRow } from '@/components/LogRow';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';

const MONTHS = ['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];

function SortableHead({ col, sort, onToggle, children }: {
  col: SortCol;
  sort: { col: SortCol; dir: SortDir };
  onToggle: (c: SortCol) => void;
  children: React.ReactNode;
}) {
  const active = sort.col === col;
  const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <TableHead onClick={() => onToggle(col)} className="cursor-pointer select-none">
      <span className="inline-flex items-center gap-1">
        {children}
        <Icon className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-30'}`} />
      </span>
    </TableHead>
  );
}

type SortCol = 'date' | 'client' | 'activityType' | 'isDocFilled' | 'isEvupFilled';
type SortDir = 'asc' | 'desc';

export default function History() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1..12
  const [toDelete, setToDelete] = useState<DailyLog | null>(null);
  const [sort, setSort] = useState<{ col: SortCol; dir: SortDir }>({ col: 'date', dir: 'desc' });

  const clients = useClientsStore(s => s.clients);
  const logs = useLogsStore(s => s.logs);
  const updateLog = useLogsStore(s => s.update);
  const removeLog = useLogsStore(s => s.remove);
  const settings = useSettingsStore(s => s.settings);

  const clientById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    logs.forEach(l => ys.add(Number(l.date.slice(0, 4))));
    return Array.from(ys).sort((a, b) => b - a);
  }, [logs, now]);

  function toggleSort(col: SortCol) {
    setSort(s => s.col === col
      ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: col === 'date' ? 'desc' : 'asc' });
  }

  function sortKey(l: DailyLog, col: SortCol): string | number {
    switch (col) {
      case 'date': return l.date + l.createdAt;
      case 'client': {
        const c = clientById.get(l.clientId);
        return c ? `${c.lastName} ${c.firstName}`.toLowerCase() : '';
      }
      case 'activityType':  return l.activityType.toLowerCase();
      case 'isDocFilled':   return l.isDocFilled ? 1 : 0;
      case 'isEvupFilled':  return l.isEvupFilled ? 1 : 0;
    }
  }

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    return logs
      .filter(l => l.date.startsWith(prefix))
      .slice()
      .sort((a, b) => {
        const ka = sortKey(a, sort.col);
        const kb = sortKey(b, sort.col);
        if (ka < kb) return -1 * sign;
        if (ka > kb) return  1 * sign;
        // tiebreak: novšie createdAt hore
        return b.createdAt.localeCompare(a.createdAt);
      });
    // sortKey uses clientById, but we intentionally depend only on the primary inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, prefix, sort, clientById]);

  const uniqueClients = new Set(rows.map(r => r.clientId)).size;
  const byType: Record<string, number> = {};
  ACTIVITY_TYPES.forEach(t => { byType[t] = 0; });
  rows.forEach(r => { byType[r.activityType] = (byType[r.activityType] ?? 0) + 1; });

  async function regenerate(log: DailyLog) {
    const client = clientById.get(log.clientId);
    if (!client) { toast.error('Klient neexistuje'); return; }
    const r = await generateDocx({
      client, log,
      templatesFolder: settings.templatesFolderPath,
      outputFolder: settings.outputFolderPath,
    });
    if (r.ok) { await updateLog(log.id, { generatedDocPath: r.outputPath }); toast.success('Regenerované'); }
    else { await updateLog(log.id, { generatedDocPath: null }); toast.error(r.message); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">História</h1>
        <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span><b>{rows.length}</b> záznamov</span>
        <span>· <b>{uniqueClients}</b> klientov</span>
        {ACTIVITY_TYPES.filter(t => byType[t] > 0).map(t => (
          <Badge key={t} variant="secondary">{t}: {byType[t]}</Badge>
        ))}
      </div>

      <Table>
        <TableHeader><TableRow>
          <SortableHead col="date"          sort={sort} onToggle={toggleSort}>Dátum</SortableHead>
          <SortableHead col="client"        sort={sort} onToggle={toggleSort}>Klient</SortableHead>
          <SortableHead col="activityType"  sort={sort} onToggle={toggleSort}>Typ činnosti</SortableHead>
          <SortableHead col="isDocFilled"   sort={sort} onToggle={toggleSort}>Doc</SortableHead>
          <SortableHead col="isEvupFilled"  sort={sort} onToggle={toggleSort}>EvuP</SortableHead>
          <TableHead className="text-right">Akcie</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {rows.map(l => (
            <LogRow key={l.id}
              log={l} client={clientById.get(l.clientId)} showDate
              onToggleDoc={(log, v) => updateLog(log.id, { isDocFilled: v })}
              onToggleEvup={(log, v) => updateLog(log.id, { isEvupFilled: v })}
              onOpenDoc={async (log) => {
                if (!log.generatedDocPath) return;
                try { await openPath(log.generatedDocPath); }
                catch (e) { toast.error(`Nepodarilo sa otvoriť súbor: ${String(e)}`); }
              }}
              onRegenerate={regenerate}
              onDelete={(log) => setToDelete(log)}
            />
          ))}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Zmazať záznam"
        description="Naozaj zmazať tento záznam?"
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
