import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Trash2 } from 'lucide-react';

const FLAGS = [
  { char: 'g', label: 'global', desc: 'find all matches' },
  { char: 'i', label: 'ignore case', desc: 'case-insensitive matching' },
  { char: 'm', label: 'multiline', desc: '^ and $ match line breaks' },
  { char: 's', label: 'dotall', desc: '. matches newlines too' },
  { char: 'u', label: 'unicode', desc: 'full unicode support' },
  { char: 'y', label: 'sticky', desc: 'match from lastIndex only' },
];

const PRESETS = [
  { label: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g' },
  { label: 'URL', pattern: 'https?:\\/\\/[^\\s]+', flags: 'g' },
  { label: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
  { label: 'Hex color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'g' },
  {
    label: 'UUID',
    pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}',
    flags: 'gi',
  },
  { label: 'ISO date', pattern: '\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z?)?', flags: 'g' },
];

interface MatchInfo {
  index: number;
  match: string;
  groups: (string | undefined)[];
  namedGroups: Record<string, string> | null;
}

const SAMPLE_TEXT = `Contact: alice@example.com or bob@dev.io
Visit https://example.com or http://test.org
Servers: 10.0.0.1, 192.168.1.42, 8.8.8.8
Color: #ff5733 or #fa3
ID: 550e8400-e29b-41d4-a716-446655440000`;

export default function RegexTool() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState('g');
  const [testString, setTestString] = useState(SAMPLE_TEXT);

  const result = useMemo(() => {
    if (!pattern) return { type: 'empty' as const };
    let re: RegExp;
    try {
      re = new RegExp(pattern, flags);
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Invalid regex' };
    }

    const matches: MatchInfo[] = [];
    if (testString) {
      // Always iterate with /g/ semantics for collecting matches; if the user didn't set 'g',
      // we'll just stop after the first one.
      const iterRe = flags.includes('g') ? re : new RegExp(pattern, flags + 'g');
      iterRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      let safety = 0;
      while ((m = iterRe.exec(testString)) !== null) {
        matches.push({
          index: m.index,
          match: m[0],
          groups: m.slice(1) as (string | undefined)[],
          namedGroups: m.groups ? { ...m.groups } : null,
        });
        // Avoid infinite loop on zero-width matches
        if (m.index === iterRe.lastIndex) iterRe.lastIndex++;
        if (++safety > 10000) break;
        if (!flags.includes('g')) break;
      }
    }

    return { type: 'success' as const, matches };
  }, [pattern, flags, testString]);

  const highlightedElements = useMemo(() => {
    if (result.type !== 'success' || !testString) return null;
    if (result.matches.length === 0) return [testString];
    const parts: ReactNode[] = [];
    let cursor = 0;
    result.matches.forEach((m, i) => {
      if (m.index > cursor) parts.push(testString.slice(cursor, m.index));
      if (m.match.length > 0) {
        parts.push(
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/40 rounded px-0.5 text-foreground"
          >
            {m.match}
          </mark>
        );
      }
      cursor = Math.max(cursor, m.index + m.match.length);
    });
    if (cursor < testString.length) parts.push(testString.slice(cursor));
    return parts;
  }, [result, testString]);

  const toggleFlag = (f: string) => {
    setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f));
  };

  const loadPreset = (p: (typeof PRESETS)[number]) => {
    setPattern(p.pattern);
    setFlags(p.flags);
  };

  const clearAll = () => {
    setPattern('');
    setFlags('g');
    setTestString('');
  };

  return (
    <div className="space-y-4">
      {/* Pattern row */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Pattern</label>
        <div className="flex flex-wrap gap-2 items-stretch">
          <div className="flex-1 flex items-stretch min-w-[200px]">
            <span className="px-3 flex items-center bg-muted text-muted-foreground rounded-l-md border border-r-0 border-input font-mono text-sm">
              /
            </span>
            <Input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              className="font-mono rounded-none border-x-0 flex-1"
              spellCheck={false}
            />
            <span className="px-3 flex items-center bg-muted text-muted-foreground border border-l-0 border-input font-mono text-sm">
              /
            </span>
            <Input
              value={flags}
              onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ''))}
              placeholder="flags"
              className="font-mono rounded-l-none w-20 border-l-0"
              spellCheck={false}
              maxLength={6}
            />
          </div>
          <Button onClick={clearAll} size="sm" variant="destructive" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>

        {/* Flag toggles */}
        <div className="flex flex-wrap gap-1.5">
          {FLAGS.map((f) => (
            <Button
              key={f.char}
              size="sm"
              variant={flags.includes(f.char) ? 'default' : 'outline'}
              onClick={() => toggleFlag(f.char)}
              className="h-7 text-xs px-2.5"
              title={f.desc}
            >
              <span className="font-mono font-semibold">{f.char}</span>
              <span className="ml-1 opacity-70 hidden sm:inline">{f.label}</span>
            </Button>
          ))}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[10px] text-muted-foreground mr-1">PRESETS:</span>
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="ghost"
              onClick={() => loadPreset(p)}
              className="h-6 px-2 text-xs"
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {result.type === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-mono">{result.message}</p>
        </div>
      )}

      {/* Test string + matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Test String</span>
              <Badge variant="outline" className="font-normal">
                {testString.length} chars
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter text to test against the regex..."
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Matches</span>
              {result.type === 'success' && (
                <Badge variant="outline" className="font-normal">
                  {result.matches.length} found
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.type === 'success' ? (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-3">
                  {/* Highlighted preview */}
                  {testString && highlightedElements && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        Preview
                      </div>
                      <pre className="font-mono text-xs whitespace-pre-wrap break-all p-3 rounded-md bg-muted/50 border">
                        {highlightedElements}
                      </pre>
                    </div>
                  )}

                  {/* Match details */}
                  {result.matches.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        Match details
                      </div>
                      <ol className="space-y-2">
                        {result.matches.map((m, i) => (
                          <li key={i} className="p-2 rounded-md border bg-card">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <Badge variant="secondary" className="font-mono">
                                #{i + 1}
                              </Badge>
                              <span className="text-muted-foreground">
                                index {m.index}–{m.index + m.match.length}
                              </span>
                            </div>
                            <div className="font-mono text-xs mt-1 break-all">
                              <span className="text-muted-foreground">match: </span>
                              <mark className="bg-yellow-200 dark:bg-yellow-500/40 rounded px-0.5 text-foreground">
                                {m.match || '∅ (empty)'}
                              </mark>
                            </div>
                            {m.groups.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {m.groups.map((g, gi) => (
                                  <div key={gi} className="font-mono text-[11px]">
                                    <span className="text-muted-foreground">
                                      group {gi + 1}:{' '}
                                    </span>
                                    {g === undefined ? (
                                      <em className="text-muted-foreground">undefined</em>
                                    ) : (
                                      <code className="bg-muted px-1 rounded">{g}</code>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {m.namedGroups && Object.keys(m.namedGroups).length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {Object.entries(m.namedGroups).map(([n, v]) => (
                                  <div key={n} className="font-mono text-[11px]">
                                    <span className="text-muted-foreground">{n}: </span>
                                    <code className="bg-muted px-1 rounded">{v}</code>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {result.matches.length === 0 && testString && (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      No matches found
                    </div>
                  )}

                  {!testString && (
                    <div className="text-center text-sm text-muted-foreground py-12">
                      Enter a test string to see matches
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">
                  {result.type === 'error' ? 'Fix regex error above' : 'Enter a pattern to start'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}