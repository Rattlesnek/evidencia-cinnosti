import { useMemo } from 'react';
import { CalendarIcon } from 'lucide-react';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatSk } from '@/services/dateUtils';

type Props = {
  value: string;                              // 'YYYY-MM-DD' alebo ''
  onChange: (v: string) => void;              // vždy 'YYYY-MM-DD'
  captionLayout?: 'label' | 'dropdown';       // 'dropdown' pre dátum narodenia
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/** ISO 'YYYY-MM-DD' → local-midnight Date (bez timezone posunu). */
function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local Date → ISO 'YYYY-MM-DD' (bez timezone posunu). */
function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePicker({
  value, onChange, captionLayout = 'label',
  placeholder = 'Vyber dátum…', disabled, className,
}: Props) {
  const selected = useMemo(() => isoToDate(value), [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatSk(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => d && onChange(dateToIso(d))}
          captionLayout={captionLayout}
          locale={sk}
          defaultMonth={selected ?? new Date()}
          // ponytail: birthdate rozsah 1920..dnes; pre non-birthdate ostane default (bez limitu).
          startMonth={captionLayout === 'dropdown' ? new Date(1920, 0) : undefined}
          endMonth={captionLayout === 'dropdown' ? new Date() : undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
