import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useClientsStore } from '@/stores/clientsStore';

type Props = { value: string; onChange: (id: string) => void };

export function ClientCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const clients = useClientsStore(s => s.clients);
  const selected = clients.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-72 justify-between">
          {selected ? `${selected.lastName} ${selected.firstName}` : 'Vyber klienta…'}
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command filter={(v, s) => v.toLowerCase().includes(s.toLowerCase()) ? 1 : 0}>
          <CommandInput placeholder="Hľadať klienta…" />
          <CommandEmpty>Nič nenájdené.</CommandEmpty>
          <CommandGroup>
            {clients.map(c => {
              const label = `${c.lastName} ${c.firstName}`;
              return (
                <CommandItem key={c.id} value={label} onSelect={() => { onChange(c.id); setOpen(false); }}>
                  <Check className={cn('mr-2 h-4 w-4', c.id === value ? 'opacity-100' : 'opacity-0')} />
                  {label}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
