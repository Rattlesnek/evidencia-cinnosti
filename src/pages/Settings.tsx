import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FolderOpen, RefreshCw, Folder } from 'lucide-react';
import { open as pickFolder } from '@tauri-apps/plugin-dialog';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { exists } from '@tauri-apps/plugin-fs';
import { join, appLocalDataDir } from '@tauri-apps/api/path';
import { getVersion } from '@tauri-apps/api/app';
import { ACTIVITY_TYPES, TEMPLATE_FILENAME } from '@/types/domain';
import { useSettingsStore } from '@/stores/settingsStore';

export default function Settings() {
  const settings = useSettingsStore(s => s.settings);
  const setTemplates = useSettingsStore(s => s.setTemplatesFolder);
  const setOutput = useSettingsStore(s => s.setOutputFolder);

  const [version, setVersion] = useState('');
  const [dataDir, setDataDir] = useState('');
  const [templateStatus, setTemplateStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setVersion(await getVersion());
      setDataDir(await appLocalDataDir());
    })();
  }, []);

  async function refreshTemplateStatus() {
    const next: Record<string, boolean> = {};
    for (const t of ACTIVITY_TYPES) {
      const p = await join(settings.templatesFolderPath, TEMPLATE_FILENAME[t]);
      next[t] = await exists(p);
    }
    setTemplateStatus(next);
  }
  useEffect(() => { if (settings.templatesFolderPath) void refreshTemplateStatus(); }, [settings.templatesFolderPath]);

  async function pick(kind: 'templates' | 'output') {
    const picked = await pickFolder({ directory: true, multiple: false });
    if (typeof picked !== 'string') return;
    if (kind === 'templates') await setTemplates(picked);
    else await setOutput(picked);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Nastavenia</h1>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm text-slate-500">Priečinok so šablónami</div>
            <div className="font-mono text-sm truncate">{settings.templatesFolderPath || '—'}</div>
          </div>
          <Button variant="outline" onClick={() => pick('templates')}><FolderOpen className="h-4 w-4 mr-1" />Vybrať</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm text-slate-500">Priečinok pre výstupné dokumenty</div>
            <div className="font-mono text-sm truncate">{settings.outputFolderPath || '—'}</div>
          </div>
          <Button variant="outline" onClick={() => pick('output')}><FolderOpen className="h-4 w-4 mr-1" />Vybrať</Button>
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stav šablón</h2>
          <Button variant="ghost" size="sm" onClick={refreshTemplateStatus}><RefreshCw className="h-4 w-4 mr-1" />Obnoviť</Button>
        </div>
        <div className="space-y-1">
          {ACTIVITY_TYPES.map(t => {
            const ok = templateStatus[t];
            return (
              <div key={t} className="flex items-center gap-3 text-sm">
                <Badge variant={ok ? 'default' : 'destructive'}>{ok ? '✓' : '✗'}</Badge>
                <span className="w-64">{t}</span>
                <span className="font-mono text-slate-600">{TEMPLATE_FILENAME[t]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <Separator />

      <section className="space-y-2 text-sm">
        <h2 className="text-lg font-semibold">O aplikácii</h2>
        <div>Verzia: <b>{version}</b></div>
        <div>Dátový priečinok: <span className="font-mono">{dataDir}</span></div>
        <Button variant="outline" size="sm" onClick={() => dataDir && shellOpen(dataDir)}>
          <Folder className="h-4 w-4 mr-1" />Otvoriť dátový priečinok
        </Button>
      </section>
    </div>
  );
}
