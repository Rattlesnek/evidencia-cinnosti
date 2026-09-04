import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilePlus2 } from 'lucide-react';
import type { ActivityType } from '@/types/domain';
import { ClientCombobox } from './ClientCombobox';
import { ActivitySelect } from './ActivitySelect';

type Props = { onSubmit: (clientId: string, activityType: ActivityType) => Promise<void> };

export function LogAddForm({ onSubmit }: Props) {
  const [clientId, setClientId] = useState('');
  const [activity, setActivity] = useState<ActivityType | ''>('');
  const [busy, setBusy] = useState(false);

  const disabled = !clientId || !activity || busy;

  return (
    <div className="flex items-end gap-3 p-3 rounded border bg-slate-50">
      <ClientCombobox value={clientId} onChange={setClientId} />
      <ActivitySelect value={activity} onChange={setActivity} />
      <Button disabled={disabled} onClick={async () => {
        if (!clientId || !activity) return;
        setBusy(true);
        try { await onSubmit(clientId, activity); setClientId(''); setActivity(''); }
        finally { setBusy(false); }
      }}>
        <FilePlus2 className="h-4 w-4 mr-1" />Zaevidovať &amp; Vygenerovať .docx
      </Button>
    </div>
  );
}
