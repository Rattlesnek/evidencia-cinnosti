import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/DatePicker';
import type { Client } from '@/types/domain';

type Props = {
  trigger: React.ReactNode;
  initial?: Client;
  onSubmit: (data: Omit<Client, 'id' | 'createdAt'>) => Promise<void> | void;
};

const empty = { firstName: '', lastName: '', birthDate: '', address: '', school: '', note: '' };

export function ClientDialog({ trigger, initial, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);

  useEffect(() => {
    if (open) setForm(initial
      ? { firstName: initial.firstName, lastName: initial.lastName, birthDate: initial.birthDate,
          address: initial.address, school: initial.school, note: initial.note }
      : empty);
  }, [open, initial]);

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.birthDate;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{initial ? 'Upraviť klienta' : 'Pridať klienta'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Meno *</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><Label>Priezvisko *</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          <div>
            <Label>Dátum narodenia *</Label>
            <DatePicker
              value={form.birthDate}
              onChange={(v) => setForm({ ...form, birthDate: v })}
              captionLayout="dropdown"
              className="w-full"
            />
          </div>
          <div><Label>Bydlisko</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div className="col-span-2"><Label>Škola</Label><Input value={form.school} onChange={e => setForm({ ...form, school: e.target.value })} /></div>
          <div className="col-span-2"><Label>Poznámka</Label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Zrušiť</Button>
          <Button disabled={!canSubmit} onClick={async () => { await onSubmit(form); setOpen(false); }}>
            {initial ? 'Uložiť' : 'Pridať'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
