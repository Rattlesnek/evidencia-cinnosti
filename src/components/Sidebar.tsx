import { NavLink } from 'react-router-dom';
import { Users, Calendar, History, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/clients',  label: 'Klienti',  icon: Users },
  { to: '/logs',     label: 'Denník',   icon: Calendar },
  { to: '/history',  label: 'História', icon: History },
  { to: '/settings', label: 'Nastavenia', icon: SettingsIcon },
];

export function Sidebar() {
  return (
    <nav className="w-56 shrink-0 border-r bg-slate-50 p-3 flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) => cn(
            'flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-200',
            isActive && 'bg-slate-200 font-medium',
          )}>
          <Icon className="h-4 w-4" /> {label}
        </NavLink>
      ))}
    </nav>
  );
}
