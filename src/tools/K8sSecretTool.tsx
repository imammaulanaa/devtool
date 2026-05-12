import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as yaml from 'js-yaml';

type Mode = 'decode' | 'encode';

interface DecodedEntry {
  key: string;
  value: string;
  source: 'data' | 'stringData';
  binary?: boolean;
}

interface DecodedManifest {
  kind: 'Secret' | 'ConfigMap';
  name: string | undefined;
  namespace: string | undefined;
  type: string | undefined;
  entries: DecodedEntry[];
  warnings: string[];
}

function decodeBase64Utf8(b64: string): { text: string; binary: boolean; bytes: number } {
  let s = b64.replace(/\s+/g, '');
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, binary: false, bytes: bytes.length };
  } catch {
    return { text: '', binary: true, bytes: bytes.length };
  }
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function decodeManifest(input: string): DecodedManifest {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Empty input');

  let doc: any;
  try {
    // Support multi-document YAML — pick the first Secret/ConfigMap
    const docs = yaml.loadAll(trimmed);
    doc = docs.find(
      (d: any) => d && typeof d === 'object' && (d.kind === 'Secret' || d.kind === 'ConfigMap')
    ) ?? docs[0];
  } catch (e: any) {
    throw new Error(`YAML parse error: ${e.message}`);
  }
  if (!doc || typeof doc !== 'object') throw new Error('YAML did not parse to an object');

  const kind = doc.kind;
  if (kind !== 'Secret' && kind !== 'ConfigMap') {
    throw new Error(`Expected kind: Secret or ConfigMap, got "${kind ?? 'undefined'}"`);
  }

  const metadata = doc.metadata || {};
  const data = doc.data || {};
  const stringData = doc.stringData || {};
  const warnings: string[] = [];
  const entries: DecodedEntry[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== 'string') {
      warnings.push(`data.${k} is not a string, skipped`);
      continue;
    }
    if (kind === 'Secret') {
      try {
        const { text, binary, bytes } = decodeBase64Utf8(v);
        entries.push({
          key: k,
          value: binary ? `<binary, ${bytes} bytes>` : text,
          source: 'data',
          binary,
        });
      } catch {
        entries.push({ key: k, value: '<invalid base64>', source: 'data' });
        warnings.push(`data.${k} is not valid Base64`);
      }
    } else {
      // ConfigMap data is plain text
      entries.push({ key: k, value: v, source: 'data' });
    }
  }

  for (const [k, v] of Object.entries(stringData)) {
    if (typeof v !== 'string') {
      warnings.push(`stringData.${k} is not a string, skipped`);
      continue;
    }
    if (kind === 'ConfigMap') {
      warnings.push('stringData is not a valid field for ConfigMap');
    }
    entries.push({ key: k, value: v, source: 'stringData' });
  }

  return {
    kind,
    name: metadata.name,
    namespace: metadata.namespace,
    type: doc.type,
    entries,
    warnings,
  };
}

function parseKVLines(text: string): Array<{ key: string; value: string }> {
  const lines = text.split('\n');
  const result: Array<{ key: string; value: string }> = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) {
      throw new Error(`Line missing '=': "${line}"`);
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);
    // Strip optional surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) throw new Error(`Empty key in line: "${line}"`);
    result.push({ key, value });
  }
  return result;
}

interface EncodeOptions {
  kind: 'Secret' | 'ConfigMap';
  name: string;
  namespace: string;
  type: string;
  useStringData: boolean;
}

function encodeManifest(
  values: Array<{ key: string; value: string }>,
  opts: EncodeOptions
): string {
  const obj: any = {
    apiVersion: 'v1',
    kind: opts.kind,
    metadata: {
      name: opts.name.trim() || 'my-secret',
      ...(opts.namespace.trim() ? { namespace: opts.namespace.trim() } : {}),
    },
  };
  if (opts.kind === 'Secret') {
    obj.type = opts.type.trim() || 'Opaque';
    if (opts.useStringData) {
      obj.stringData = Object.fromEntries(values.map((v) => [v.key, v.value]));
    } else {
      obj.data = Object.fromEntries(
        values.map((v) => [v.key, encodeBase64Utf8(v.value)])
      );
    }
  } else {
    obj.data = Object.fromEntries(values.map((v) => [v.key, v.value]));
  }
  return yaml.dump(obj, { indent: 2, lineWidth: -1, noRefs: true });
}

const SAMPLE_SECRET = `apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
data:
  username: cG9zdGdyZXM=
  password: c2VjcmV0LXBhc3M=
stringData:
  DATABASE_URL: postgres://postgres:secret-pass@db.svc:5432/myapp
`;

const SAMPLE_KV = `username=postgres
password=secret-pass
DATABASE_URL=postgres://postgres:secret-pass@db.svc:5432/myapp`;

export default function K8sSecretTool() {
  const [mode, setMode] = useState<Mode>('decode');

  const [yamlInput, setYamlInput] = useState('');
  const [kvInput, setKvInput] = useState('');

  const [encName, setEncName] = useState('my-secret');
  const [encNamespace, setEncNamespace] = useState('');
  const [encKind, setEncKind] = useState<'Secret' | 'ConfigMap'>('Secret');
  const [encType, setEncType] = useState('Opaque');
  const [useStringData, setUseStringData] = useState(false);

  const decoded = useMemo(() => {
    if (mode !== 'decode' || !yamlInput.trim()) return { type: 'empty' as const };
    try {
      return { type: 'success' as const, manifest: decodeManifest(yamlInput) };
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Decode failed' };
    }
  }, [mode, yamlInput]);

  const encoded = useMemo(() => {
    if (mode !== 'encode' || !kvInput.trim()) return { type: 'empty' as const };
    try {
      const values = parseKVLines(kvInput);
      if (values.length === 0) return { type: 'empty' as const };
      const yamlText = encodeManifest(values, {
        kind: encKind,
        name: encName,
        namespace: encNamespace,
        type: encType,
        useStringData,
      });
      return { type: 'success' as const, yaml: yamlText, count: values.length };
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Encode failed' };
    }
  }, [mode, kvInput, encName, encNamespace, encKind, encType, useStringData]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const loadSample = () => {
    if (mode === 'decode') setYamlInput(SAMPLE_SECRET);
    else setKvInput(SAMPLE_KV);
  };

  const clearAll = () => {
    if (mode === 'decode') setYamlInput('');
    else setKvInput('');
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          variant={mode === 'decode' ? 'default' : 'outline'}
          onClick={() => setMode('decode')}
        >
          Decode YAML
        </Button>
        <Button
          size="sm"
          variant={mode === 'encode' ? 'default' : 'outline'}
          onClick={() => setMode('encode')}
        >
          Encode to YAML
        </Button>
        <div className="flex-1" />
        <Button onClick={loadSample} size="sm" variant="outline">
          Load sample
        </Button>
        <Button onClick={clearAll} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Encode-mode metadata form */}
      {mode === 'encode' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kind</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant={encKind === 'Secret' ? 'default' : 'outline'}
                onClick={() => setEncKind('Secret')}
                className="flex-1 h-8 text-xs"
              >
                Secret
              </Button>
              <Button
                size="sm"
                variant={encKind === 'ConfigMap' ? 'default' : 'outline'}
                onClick={() => setEncKind('ConfigMap')}
                className="flex-1 h-8 text-xs"
              >
                ConfigMap
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Name</label>
            <Input
              value={encName}
              onChange={(e) => setEncName(e.target.value)}
              placeholder="my-secret"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Namespace <span className="text-muted-foreground/70">(optional)</span>
            </label>
            <Input
              value={encNamespace}
              onChange={(e) => setEncNamespace(e.target.value)}
              placeholder="default"
              className="h-8 text-sm"
            />
          </div>
          {encKind === 'Secret' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <Input
                value={encType}
                onChange={(e) => setEncType(e.target.value)}
                placeholder="Opaque"
                className="h-8 text-sm"
              />
            </div>
          )}
          {encKind === 'Secret' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none sm:col-span-2 lg:col-span-4">
              <input
                type="checkbox"
                checked={useStringData}
                onChange={(e) => setUseStringData(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>
                Use <code className="font-mono text-xs">stringData</code> instead of{' '}
                <code className="font-mono text-xs">data</code>
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                (values stay plain — Kubernetes encodes them server-side)
              </span>
            </label>
          )}
        </div>
      )}

      {/* Two-column input/output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mode === 'decode' ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Manifest YAML</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={yamlInput}
                  onChange={(e) => setYamlInput(e.target.value)}
                  placeholder="Paste a Secret or ConfigMap YAML manifest..."
                  className="font-mono text-xs min-h-[400px] resize-none"
                  spellCheck={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Decoded Values</span>
                  {decoded.type === 'success' && (
                    <Badge variant="outline" className="font-normal">
                      {decoded.manifest.entries.length} keys
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {decoded.type === 'success' ? (
                  <ScrollArea className="h-[400px] pr-3">
                    <div className="mb-3 p-3 rounded-md bg-muted/50 border text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Kind:</span>{' '}
                        <Badge variant="secondary" className="font-mono">
                          {decoded.manifest.kind}
                        </Badge>
                      </div>
                      {decoded.manifest.name && (
                        <div>
                          <span className="text-muted-foreground">Name:</span>{' '}
                          <code className="font-mono">{decoded.manifest.name}</code>
                        </div>
                      )}
                      {decoded.manifest.namespace && (
                        <div>
                          <span className="text-muted-foreground">Namespace:</span>{' '}
                          <code className="font-mono">{decoded.manifest.namespace}</code>
                        </div>
                      )}
                      {decoded.manifest.type && (
                        <div>
                          <span className="text-muted-foreground">Type:</span>{' '}
                          <code className="font-mono">{decoded.manifest.type}</code>
                        </div>
                      )}
                    </div>

                    {decoded.manifest.warnings.length > 0 && (
                      <div className="mb-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs space-y-1">
                        {decoded.manifest.warnings.map((w, i) => (
                          <div key={i} className="text-amber-900 dark:text-amber-200">
                            ⚠ {w}
                          </div>
                        ))}
                      </div>
                    )}

                    {decoded.manifest.entries.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No data or stringData fields found
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {decoded.manifest.entries.map((e, i) => (
                          <div key={i} className="p-2.5 rounded-md border bg-card">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <code className="font-mono font-semibold text-xs">{e.key}</code>
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1 font-normal"
                              >
                                {e.source}
                              </Badge>
                              {e.binary && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4 px-1 font-normal"
                                >
                                  binary
                                </Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 ml-auto gap-1.5"
                                onClick={() => copy(e.value, e.key)}
                                disabled={e.binary}
                              >
                                <Copy className="w-3 h-3" />
                                <span className="text-xs">Copy</span>
                              </Button>
                            </div>
                            <pre className="font-mono text-xs whitespace-pre-wrap break-all bg-muted/50 p-2 rounded border">
                              {e.value}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                ) : decoded.type === 'error' ? (
                  <div className="h-[400px] flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{decoded.message}</p>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                    <p className="text-sm">Paste a manifest to see decoded values</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Key/Value Pairs</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={kvInput}
                  onChange={(e) => setKvInput(e.target.value)}
                  placeholder={
                    'KEY1=value1\nKEY2=value2\n# comments are ok\nDATABASE_URL=postgres://...'
                  }
                  className="font-mono text-xs min-h-[400px] resize-none"
                  spellCheck={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Generated YAML</span>
                  {encoded.type === 'success' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 gap-1.5"
                      onClick={() => copy(encoded.yaml, 'YAML')}
                    >
                      <Copy className="w-3 h-3" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {encoded.type === 'success' ? (
                  <Textarea
                    value={encoded.yaml}
                    readOnly
                    className="font-mono text-xs min-h-[400px] resize-none bg-muted/50"
                    spellCheck={false}
                  />
                ) : encoded.type === 'error' ? (
                  <div className="h-[400px] flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{encoded.message}</p>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                    <p className="text-sm">Enter key=value pairs to generate manifest</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}