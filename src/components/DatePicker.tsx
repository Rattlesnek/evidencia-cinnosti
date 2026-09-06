import { useEffect, useMemo, useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { sk } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatSk, parseSk } from '@/services/dateUtils';

type Props = {
  value: string;                              // 'YYYY-MM-DD' alebo ''
  onChange: (v: string) => void;              // vždy 'YYYY-MM-DD' alebo ''
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
  placeholder = 'dd.mm.rrrr', disabled, className,
}: Props) {
  const selected = useMemo(() => isoToDate(value), [value]);
  const [text, setText] = useState(value ? formatSk(value) : '');
  const [invalid, setInvalid] = useState(false);

  // sync input text keď sa `value` zmení zvonku (kalendár, form reset, …)
  useEffect(() => {
    setText(value ? formatSk(value) : '');
    setInvalid(false);
  }, [value]);

  function commit() {
    const trimmed = text.trim();
    if (trimmed === '') { onChange(''); setInvalid(false); return; }
    const iso = parseSk(trimmed);
    if (iso) { onChange(iso); setInvalid(false); }
    else setInvalid(true);
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Input
        type="text"
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { setText(e.target.value); if (invalid) setInvalid(false); }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
        className={cn('flex-1', invalid && 'border-red-500 focus-visible:ring-red-500')}
        aria-invalid={invalid}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="Otvoriť kalendár">
            <CalendarIcon className="h-4 w-4" />
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
    </div>
  );
}
