import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ACTIVITY_TYPES, type ActivityType } from '@/types/domain';

type Props = { value: ActivityType | ''; onChange: (v: ActivityType) => void };

export function ActivitySelect({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ActivityType)}>
      <SelectTrigger className="w-72"><SelectValue placeholder="Typ činnosti…" /></SelectTrigger>
      <SelectContent>
        {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
