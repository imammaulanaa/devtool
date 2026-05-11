import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// Cron Expression Helper (crontab.guru-like)
// ============================================================
const CRON_MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};
const CRON_DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};
const DOW_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const CRON_SHORTCUTS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

interface CronFieldParsed {
  raw: string;
  values: number[];
  isAll: boolean;
}

interface CronParsed {
  raw: string;
  expanded: string;
  fields: { minF: string; hourF: string; domF: string; monF: string; dowF: string };
  parts: {
    minute: CronFieldParsed;
    hour: CronFieldParsed;
    dayOfMonth: CronFieldParsed;
    month: CronFieldParsed;
    dayOfWeek: CronFieldParsed;
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function resolveCronToken(str: string, names?: Record<string, number>): number {
  const cleaned = str.trim().toUpperCase();
  if (names && names[cleaned] !== undefined) return names[cleaned];
  if (!/^\d+$/.test(cleaned)) throw new Error(`invalid token "${str}"`);
  return parseInt(cleaned, 10);
}

function expandCronField(field: string, min: number, max: number, names?: Record<string, number>): number[] {
  if (field === '') throw new Error('empty field');
  // List
  if (field.includes(',')) {
    const set = new Set<number>();
    for (const part of field.split(',')) {
      expandCronField(part, min, max, names).forEach((v) => set.add(v));
    }
    return Array.from(set).sort((a, b) => a - b);
  }
  // Step
  if (field.includes('/')) {
    const idx = field.indexOf('/');
    const rangeStr = field.slice(0, idx);
    const stepStr = field.slice(idx + 1);
    const step = parseInt(stepStr, 10);
    if (isNaN(step) || step <= 0) throw new Error(`invalid step "${stepStr}"`);
    let rs = min;
    let re = max;
    if (rangeStr === '*' || rangeStr === '') {
      // */n → full range
    } else if (rangeStr.includes('-')) {
      const [a, b] = rangeStr.split('-');
      rs = resolveCronToken(a, names);
      re = resolveCronToken(b, names);
      if (rs < min || re > max || rs > re) throw new Error(`invalid range "${rangeStr}"`);
    } else {
      // n/step → from n to max
      rs = resolveCronToken(rangeStr, names);
      if (rs < min || rs > max) throw new Error(`value ${rs} out of range ${min}-${max}`);
    }
    const result: number[] = [];
    for (let i = rs; i <= re; i += step) result.push(i);
    return result;
  }
  // Range
  if (field.includes('-')) {
    const [a, b] = field.split('-');
    const start = resolveCronToken(a, names);
    const end = resolveCronToken(b, names);
    if (start < min || start > max) throw new Error(`range start ${start} out of ${min}-${max}`);
    if (end < min || end > max) throw new Error(`range end ${end} out of ${min}-${max}`);
    if (start > end) throw new Error(`range start ${start} > end ${end}`);
    const result: number[] = [];
    for (let i = start; i <= end; i++) result.push(i);
    return result;
  }
  // Wildcard
  if (field === '*' || field === '?') {
    const result: number[] = [];
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }
  // Single value
  const v = resolveCronToken(field, names);
  if (v < min || v > max) throw new Error(`${v} out of range ${min}-${max}`);
  return [v];
}

function parseCronField(field: string, min: number, max: number, names: Record<string, number> | undefined, label: string): CronFieldParsed {
  const isAll = field === '*' || field === '?';
  let values: number[];
  try {
    values = expandCronField(field, min, max, names);
  } catch (e: any) {
    throw new Error(`${label}: ${e.message}`);
  }
  if (values.length === 0) throw new Error(`${label}: no values matched`);
  return { raw: field, values, isAll };
}

function parseCronExpression(input: string): CronParsed {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Empty expression');
  const lower = trimmed.toLowerCase();
  const expanded = CRON_SHORTCUTS[lower] ?? trimmed;
  const fields = expanded.split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Expected 5 fields (min hour day-of-month month day-of-week), got ${fields.length}`);
  }
  const [minF, hourF, domF, monF, dowF] = fields;
  // Cron treats both 0 and 7 as Sunday — normalize.
  const dowNorm = dowF.replace(/\b7\b/g, '0');
  return {
    raw: trimmed,
    expanded,
    fields: { minF, hourF, domF, monF, dowF },
    parts: {
      minute: parseCronField(minF, 0, 59, undefined, 'minute'),
      hour: parseCronField(hourF, 0, 23, undefined, 'hour'),
      dayOfMonth: parseCronField(domF, 1, 31, undefined, 'day-of-month'),
      month: parseCronField(monF, 1, 12, CRON_MONTH_NAMES, 'month'),
      dayOfWeek: parseCronField(dowNorm, 0, 6, CRON_DOW_NAMES, 'day-of-week'),
    },
  };
}

function isContiguous(arr: number[]): boolean {
  if (arr.length === 0) return false;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] !== arr[i - 1] + 1) return false;
  }
  return true;
}

function describeCron(p: CronParsed): string {
  const { minute, hour, dayOfMonth, month, dayOfWeek } = p.parts;
  const m1 = minute.values.length === 1;
  const h1 = hour.values.length === 1;

  // ---- Time part ----
  let time: string;
  if (minute.isAll && hour.isAll) {
    time = 'Every minute';
  } else if (hour.isAll && minute.raw.startsWith('*/')) {
    time = `Every ${minute.raw.slice(2)} minutes`;
  } else if (m1 && minute.values[0] === 0 && hour.isAll) {
    time = 'Every hour';
  } else if (m1 && minute.values[0] === 0 && hour.raw.startsWith('*/')) {
    time = `Every ${hour.raw.slice(2)} hours`;
  } else if (m1 && h1) {
    time = `At ${pad2(hour.values[0])}:${pad2(minute.values[0])}`;
  } else if (m1 && hour.values.length <= 4) {
    time = `At ${hour.values.map((h) => `${pad2(h)}:${pad2(minute.values[0])}`).join(', ')}`;
  } else {
    return 'Custom schedule (see breakdown below)';
  }

  // ---- Day part ----
  if (dayOfMonth.isAll && month.isAll && dayOfWeek.isAll) return time;

  if (dayOfMonth.isAll && month.isAll && !dayOfWeek.isAll) {
    const dows = dayOfWeek.values;
    const key = dows.join(',');
    if (key === '1,2,3,4,5') return `${time}, Monday through Friday`;
    if (key === '0,6') return `${time}, on weekends`;
    if (dows.length === 1) return `${time}, only on ${DOW_FULL[dows[0]]}`;
    if (isContiguous(dows)) return `${time}, ${DOW_FULL[dows[0]]} through ${DOW_FULL[dows[dows.length - 1]]}`;
    return `${time}, on ${dows.map((d) => DOW_SHORT[d]).join(', ')}`;
  }

  if (!dayOfMonth.isAll && month.isAll && dayOfWeek.isAll) {
    const doms = dayOfMonth.values;
    if (doms.length === 1) return `${time}, on day ${doms[0]} of every month`;
    return `${time}, on days ${doms.join(', ')} of every month`;
  }

  if (!dayOfMonth.isAll && !month.isAll && dayOfWeek.isAll && dayOfMonth.values.length === 1 && month.values.length === 1) {
    return `${time}, on ${MONTH_FULL[month.values[0] - 1]} ${dayOfMonth.values[0]}`;
  }

  return `${time} (custom day pattern)`;
}

function describeCronField(field: string, values: number[], isAll: boolean, label: string): string {
  if (isAll) return `every ${label}`;
  if (field.startsWith('*/')) {
    const n = field.slice(2);
    return `every ${n} ${label}${n === '1' ? '' : 's'}`;
  }
  if (values.length === 1) return `at ${label} ${values[0]}`;
  if (isContiguous(values)) return `${label} ${values[0]} through ${values[values.length - 1]}`;
  if (values.length <= 6) return values.join(', ');
  return `${values.slice(0, 5).join(', ')}, … (${values.length} values)`;
}

function dayMatchesCron(date: Date, p: CronParsed): boolean {
  const dom = p.parts.dayOfMonth;
  const dow = p.parts.dayOfWeek;
  const domMatch = dom.values.includes(date.getDate());
  const dowMatch = dow.values.includes(date.getDay());
  // POSIX semantics: if both restricted, OR them; if either is *, only the other applies.
  if (dom.isAll && dow.isAll) return true;
  if (dom.isAll) return dowMatch;
  if (dow.isAll) return domMatch;
  return domMatch || dowMatch;
}

function getNextCronExecutions(p: CronParsed, count: number, from: Date = new Date()): Date[] {
  const results: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMilliseconds(0);
  cursor.setMinutes(cursor.getMinutes() + 1); // start from next minute

  const startTs = Date.now();
  const TIMEOUT_MS = 1500;
  const maxYear = from.getFullYear() + 10;

  while (results.length < count) {
    if (Date.now() - startTs > TIMEOUT_MS) break;
    if (cursor.getFullYear() > maxYear) break;

    // Smart skip: jump whole month if month doesn't match
    if (!p.parts.month.values.includes(cursor.getMonth() + 1)) {
      cursor.setDate(1);
      cursor.setHours(0, 0, 0, 0);
      cursor.setMonth(cursor.getMonth() + 1);
      continue;
    }
    // Skip whole day if day-of-month/week doesn't match
    if (!dayMatchesCron(cursor, p)) {
      cursor.setHours(0, 0, 0, 0);
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    // Skip whole hour if hour doesn't match
    if (!p.parts.hour.values.includes(cursor.getHours())) {
      cursor.setMinutes(0, 0, 0);
      cursor.setHours(cursor.getHours() + 1);
      continue;
    }
    // Minute check
    if (!p.parts.minute.values.includes(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1);
      continue;
    }

    results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

function formatCronDateTime(d: Date): string {
  return `${DOW_SHORT[d.getDay()]} ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatCronRelative(d: Date, from: Date = new Date()): string {
  const diff = d.getTime() - from.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min === 1) return 'in 1 minute';
  if (min < 60) return `in ${min} minutes`;
  const hr = Math.round(min / 60);
  if (hr === 1) return 'in 1 hour';
  if (hr < 24) return `in ${hr} hours`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'in 1 day';
  if (day < 30) return `in ${day} days`;
  const mo = Math.round(day / 30);
  if (mo === 1) return 'in 1 month';
  if (mo < 12) return `in ${mo} months`;
  const yr = Math.round(mo / 12);
  return `in ${yr} year${yr === 1 ? '' : 's'}`;
}

export default function CronTool() {
  const [input, setInput] = useState('*/5 * * * *');

  const parsed = useMemo(() => {
    if (!input.trim()) return { error: 'Enter a cron expression to begin' };
    try {
      return parseCronExpression(input);
    } catch (err: any) {
      return { error: err.message || 'Invalid cron expression' };
    }
  }, [input]);

  const isValid = !('error' in parsed);
  const description = isValid ? describeCron(parsed as CronParsed) : '';

  const nextRuns = useMemo(() => {
    if (!isValid) return [];
    return getNextCronExecutions(parsed as CronParsed, 8);
  }, [parsed, isValid]);

  const presets = [
    { label: 'Every minute', expr: '* * * * *' },
    { label: 'Every 5 min', expr: '*/5 * * * *' },
    { label: 'Every 15 min', expr: '*/15 * * * *' },
    { label: 'Hourly', expr: '0 * * * *' },
    { label: 'Daily 9 AM', expr: '0 9 * * *' },
    { label: 'Weekdays 9 AM', expr: '0 9 * * 1-5' },
    { label: 'Sunday 00:00', expr: '0 0 * * 0' },
    { label: 'Monthly 1st', expr: '0 0 1 * *' },
    { label: 'Yearly Jan 1', expr: '0 0 1 1 *' },
  ];

  const copyExpr = () => {
    if (!input) {
      toast.error('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(input);
    toast.success('Copied!');
  };

  const fieldRows = isValid
    ? (() => {
        const cp = parsed as CronParsed;
        return [
          { label: 'Minute', range: '0–59', field: cp.fields.minF, parts: cp.parts.minute, descLabel: 'minute' },
          { label: 'Hour', range: '0–23', field: cp.fields.hourF, parts: cp.parts.hour, descLabel: 'hour' },
          { label: 'Day of Month', range: '1–31', field: cp.fields.domF, parts: cp.parts.dayOfMonth, descLabel: 'day' },
          { label: 'Month', range: '1–12', field: cp.fields.monF, parts: cp.parts.month, descLabel: 'month' },
          { label: 'Day of Week', range: '0–6 (Sun–Sat)', field: cp.fields.dowF, parts: cp.parts.dayOfWeek, descLabel: 'weekday' },
        ];
      })()
    : [];

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="* * * * *  (or @daily, @hourly, JAN, MON, etc.)"
          className="font-mono text-base flex-1"
          spellCheck={false}
        />
        <Button onClick={copyExpr} size="sm" variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </Button>
        <Button onClick={() => setInput('')} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Button
            key={p.expr}
            onClick={() => setInput(p.expr)}
            size="sm"
            variant={input.trim() === p.expr ? 'default' : 'outline'}
            className="text-xs h-7"
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Status + description */}
      {isValid ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{description}</p>
            {(parsed as CronParsed).expanded !== (parsed as CronParsed).raw && (
              <p className="text-xs text-muted-foreground mt-1">
                Expanded:{' '}
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded">
                  {(parsed as CronParsed).expanded}
                </code>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{(parsed as { error: string }).error}</p>
        </div>
      )}

      {/* Two-column results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Field Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isValid ? (
              <ScrollArea className="h-[400px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Field</th>
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground text-xs">Value</th>
                      <th className="text-left py-2 font-medium text-muted-foreground text-xs">Meaning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fieldRows.map((row) => (
                      <tr key={row.label} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-3">
                          <div className="font-medium text-xs">{row.label}</div>
                          <div className="text-[10px] text-muted-foreground">{row.range}</div>
                        </td>
                        <td className="py-2 pr-3">
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{row.field}</code>
                        </td>
                        <td className="py-2 text-xs">
                          <div>{describeCronField(row.field, row.parts.values, row.parts.isAll, row.descLabel)}</div>
                          <div className="text-muted-foreground mt-1 font-mono text-[10px] break-all">
                            {row.parts.isAll
                              ? `[${row.parts.values[0]}…${row.parts.values[row.parts.values.length - 1]}]`
                              : row.parts.values.length <= 12
                                ? `[${row.parts.values.join(', ')}]`
                                : `[${row.parts.values.slice(0, 8).join(', ')}, … +${row.parts.values.length - 8}]`}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Field breakdown will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Next Executions</span>
              {isValid && nextRuns.length > 0 && (
                <Badge variant="outline" className="font-normal">
                  {nextRuns.length} runs
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isValid && nextRuns.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <ol className="space-y-1.5">
                  {nextRuns.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <Badge
                        variant="secondary"
                        className="font-mono w-7 justify-center flex-shrink-0"
                      >
                        {i + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm">{formatCronDateTime(d)}</div>
                        <div className="text-xs text-muted-foreground">{formatCronRelative(d)}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">
                  {isValid ? 'No upcoming executions found' : 'Next executions will appear here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}