import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Key, Lock, Unlock, Eye } from 'lucide-react';
import PgpGenerate from './pgp/PgpGenerate';
import PgpEncrypt from './pgp/PgpEncrypt';
import PgpDecrypt from './pgp/PgpDecrypt';
import PgpInspect from './pgp/PgpInspect';

type Mode = 'generate' | 'encrypt' | 'decrypt' | 'inspect';

interface ModeDef {
  value: Mode;
  label: string;
  icon: typeof Key;
}

const MODES: ModeDef[] = [
  { value: 'generate', label: 'Generate', icon: Key },
  { value: 'encrypt', label: 'Encrypt', icon: Lock },
  { value: 'decrypt', label: 'Decrypt', icon: Unlock },
  { value: 'inspect', label: 'Inspect', icon: Eye },
];

export default function PgpTool() {
  const [mode, setMode] = useState<Mode>('generate');

  return (
    <div className="space-y-4">
      {/* Mode pills */}
      <div className="flex flex-wrap gap-2 pb-2 border-b">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <Button
              key={m.value}
              size="sm"
              variant={active ? 'default' : 'outline'}
              onClick={() => setMode(m.value)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {m.label}
            </Button>
          );
        })}
      </div>

      {/* Active mode content */}
      {mode === 'generate' && <PgpGenerate />}
      {mode === 'encrypt' && <PgpEncrypt />}
      {mode === 'decrypt' && <PgpDecrypt />}
      {mode === 'inspect' && <PgpInspect />}
    </div>
  );
}