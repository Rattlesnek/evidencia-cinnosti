import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, Trash2 } from 'lucide-react';
import type { Client, DailyLog } from '@/types/domain';
import { formatSk } from '@/services/dateUtils';

type Props = {
  log: DailyLog;
  client: Client | undefined;
  showDate?: boolean;
  onToggleDoc: (log: DailyLog, v: boolean) => void;
  onToggleEvup: (log: DailyLog, v: boolean) => void;
  onOpenDoc: (log: DailyLog) => void;
  onRegenerate: (log: DailyLog) => void;
  onDelete: (log: DailyLog) => void;
};

export function LogRow({ log, client, showDate, onToggleDoc, onToggleEvup, onOpenDoc, onRegenerate, onDelete }: Props) {
  return (
    <TableRow>
      {showDate && <TableCell>{formatSk(log.date)}</TableCell>}
      <TableCell>{client ? `${client.lastName} ${client.firstName}` : <span className="text-slate-400">(zmazaný)</span>}</TableCell>
      <TableCell>{log.activityType}</TableCell>
      <TableCell><Checkbox checked={log.isDocFilled} onCheckedChange={(v) => onToggleDoc(log, !!v)} /></TableCell>
      <TableCell><Checkbox checked={log.isEvupFilled} onCheckedChange={(v) => onToggleEvup(log, !!v)} /></TableCell>
      <TableCell className="text-right">
        {log.generatedDocPath
          ? <Button variant="ghost" size="sm" onClick={() => onOpenDoc(log)}><FileText className="h-4 w-4 mr-1" />Otvoriť</Button>
          : <Button variant="ghost" size="sm" onClick={() => onRegenerate(log)}><RefreshCw className="h-4 w-4 mr-1" />Regenerovať</Button>}
        <Button variant="ghost" size="icon" onClick={() => onDelete(log)}><Trash2 className="h-4 w-4" /></Button>
      </TableCell>
    </TableRow>
  );
}
