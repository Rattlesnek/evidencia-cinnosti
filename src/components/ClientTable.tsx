import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { formatSk } from '@/services/dateUtils';
import type { Client } from '@/types/domain';
import { ClientDialog } from './ClientDialog';

type Props = {
  clients: Client[];
  onEdit: (id: string, data: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onAskDelete: (c: Client) => void;
};

export function ClientTable({ clients, onEdit, onAskDelete }: Props) {
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Priezvisko</TableHead><TableHead>Meno</TableHead>
        <TableHead>Dátum nar.</TableHead><TableHead>Škola</TableHead>
        <TableHead>Bydlisko</TableHead><TableHead>Poznámka</TableHead>
        <TableHead className="text-right">Akcie</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {clients.map(c => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">{c.lastName}</TableCell>
            <TableCell>{c.firstName}</TableCell>
            <TableCell>{formatSk(c.birthDate)}</TableCell>
            <TableCell>{c.school}</TableCell>
            <TableCell>{c.address}</TableCell>
            <TableCell className="max-w-xs truncate">{c.note}</TableCell>
            <TableCell className="text-right">
              <ClientDialog
                trigger={<Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>}
                initial={c}
                onSubmit={(data) => onEdit(c.id, data)}
              />
              <Button variant="ghost" size="icon" onClick={() => onAskDelete(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
