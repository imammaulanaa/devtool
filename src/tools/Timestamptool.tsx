import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ParseResult {
  date: Date;
  detected: string;
}

function parseTimestamp(input: string): ParseResult {
  const t = input.trim();
  if (!t) throw new Error('Empty input');

  // All-digits → Unix timestamp; pick unit by length
  if (/^-?\d+$/.test(t)) {
    const n = Number(t);
    if (!Number.isFinite(n)) throw new Error('Number too large');
    const len = t.replace('-', '').length;
    if (len <= 10) return { date: new Date(n * 1000), detected: 'Unix seconds' };
    if (len <= 13) return { date: new Date(n), detected: 'Unix milliseconds' };
    if (len <= 16) return { date: new Date(Math.round(n / 1000)), detected: 'Unix microseconds' };
    return { date: new Date(Math.round(n / 1_000_000)), detected: 'Unix nanoseconds' };
  }

  // Try ISO 8601 / RFC 2822 / native Date parser
  const date = new Date(t);
  if (isNaN(date.getTime())) {
    throw new Error(
      'Could not parse — try Unix epoch (e.g. 1700000000) or ISO 8601 (e.g. 2026-01-01T12:00:00Z)'
    );
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return { date, detected: 'ISO 8601' };
  return { date, detected: 'Date string' };
}

function formatRelative(date: Date, from: Date = new Date()): string {
  const diff = date.getTime() - from.getTime();
  const past = diff < 0;
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
  if (sec < 1) return 'now';
  if (sec < 60) return past ? `${sec}s ago` : `in ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return past ? `${min} minute${min === 1 ? '' : 's'} ago` : `in ${min} minute${min === 1 ? '' : 's'}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return past ? `${hr} hour${hr === 1 ? '' : 's'} ago` : `in ${hr} hour${hr === 1 ? '' : 's'}`;
  const day = Math.floor(hr / 24);
  if (day < 30) return past ? `${day} day${day === 1 ? '' : 's'} ago` : `in ${day} day${day === 1 ? '' : 's'}`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return past ? `${mo} month${mo === 1 ? '' : 's'} ago` : `in ${mo} month${mo === 1 ? '' : 's'}`;
  const yr = Math.floor(mo / 12);
  return past ? `${yr} year${yr === 1 ? '' : 's'} ago` : `in ${yr} year${yr === 1 ? '' : 's'}`;
}

export default function TimestampTool() {
  const [input, setInput] = useState('');
  const [now, setNow] = useState(new Date());

  // Tick the live clock every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const result = useMemo(() => {
    if (!input.trim()) return { type: 'empty' as const };
    try {
      const parsed = parseTimestamp(input);
      return { type: 'success' as const, ...parsed };
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Invalid input' };
    }
  }, [input]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // The "Relative" row depends on `now`, so re-derive on every render rather than memo
  const formats =
    result.type === 'success'
      ? (() => {
          const d = result.date;
          const ts = d.getTime();
          return [
            { label: 'Unix seconds', value: String(Math.floor(ts / 1000)) },
            { label: 'Unix milliseconds', value: String(ts) },
            { label: 'ISO 8601 (UTC)', value: d.toISOString() },
            { label: 'UTC', value: d.toUTCString() },
            { label: 'Local', value: d.toString() },
            {
              label: 'Local (long)',
              value: d.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }),
            },
            { label: 'Relative', value: formatRelative(d, now) },
          ];
        })()
      : [];

  return (
    <div className="space-y-4">
      {/* Live current-time bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-muted/50 border">
        <CalendarClock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-muted-foreground">Current time</div>
          <div className="font-mono text-sm break-all">
            {Math.floor(now.getTime() / 1000)}
            <span className="text-muted-foreground"> · </span>
            {now.toISOString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          <Button
            onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            Use Unix s
          </Button>
          <Button
            onClick={() => setInput(String(Date.now()))}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            Unix ms
          </Button>
          <Button
            onClick={() => setInput(new Date().toISOString())}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
          >
            ISO
          </Button>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter a Unix timestamp, ISO 8601, or any parseable date string..."
            className="font-mono"
            spellCheck={false}
          />
          <Button
            onClick={() => setInput('')}
            size="sm"
            variant="destructive"
            className="gap-2"
            disabled={!input}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
        {result.type === 'success' && (
          <Badge variant="outline" className="font-normal">
            Detected: {result.detected}
          </Badge>
        )}
      </div>

      {/* Output */}
      {result.type === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      {result.type === 'success' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {formats.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center gap-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="w-32 sm:w-40 flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <code className="font-mono text-sm break-all">{f.value}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 gap-1.5 flex-shrink-0"
                    onClick={() => copy(f.value, f.label)}
                  >
                    <Copy className="w-3 h-3" />
                    <span className="text-xs hidden sm:inline">Copy</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result.type === 'empty' && (
        <Card>
          <CardContent className="pt-6">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">Enter a timestamp or date to see all formats</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}