import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertCircle, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Standard JWT claim names → human label
const KNOWN_CLAIMS: Record<string, string> = {
  iss: 'Issuer',
  sub: 'Subject',
  aud: 'Audience',
  exp: 'Expiration time',
  nbf: 'Not before',
  iat: 'Issued at',
  jti: 'JWT ID',
  alg: 'Algorithm',
  typ: 'Token type',
  kid: 'Key ID',
  cty: 'Content type',
};

const TIME_CLAIMS = new Set(['exp', 'iat', 'nbf']);

// Sample HS256-signed JWT used by jwt.io as the canonical example
const SAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

interface DecodedJwt {
  header: any;
  payload: any;
  signature: string;
}

function base64UrlDecode(b64: string): string {
  let s = b64.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4 !== 0) s += '=';
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim().replace(/\s+/g, '');
  if (!trimmed) throw new Error('Empty input');
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    throw new Error(`A JWT must have exactly 3 parts separated by dots; got ${parts.length}`);
  }
  let header: any;
  let payload: any;
  try {
    header = JSON.parse(base64UrlDecode(parts[0]));
  } catch (e: any) {
    throw new Error(`Header is not valid JSON: ${e.message}`);
  }
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch (e: any) {
    throw new Error(`Payload is not valid JSON: ${e.message}`);
  }
  return { header, payload, signature: parts[2] };
}

function formatRelative(date: Date, from: Date = new Date()): string {
  const diff = date.getTime() - from.getTime();
  const past = diff < 0;
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
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

function ClaimsTable({ data }: { data: any }) {
  if (typeof data !== 'object' || data === null) {
    return (
      <pre className="font-mono text-xs whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([key, value]) => {
        const label = KNOWN_CLAIMS[key];
        const isTime = TIME_CLAIMS.has(key) && typeof value === 'number';
        const valStr = JSON.stringify(value);
        return (
          <div key={key} className="font-mono text-xs">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-purple-700 dark:text-purple-300 font-semibold">"{key}"</span>
              <span className="text-muted-foreground">:</span>
              <span className="break-all">{valStr}</span>
              {label && (
                <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal">
                  {label}
                </Badge>
              )}
            </div>
            {isTime && (
              <div className="text-muted-foreground text-[10px] ml-2 mt-0.5">
                → {new Date((value as number) * 1000).toLocaleString()} (
                {formatRelative(new Date((value as number) * 1000))})
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function JwtTool() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) return { type: 'empty' as const };
    try {
      return { type: 'success' as const, decoded: decodeJwt(input) };
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Invalid JWT' };
    }
  }, [input]);

  const validity = useMemo(() => {
    if (result.type !== 'success') return null;
    const now = new Date();
    const { exp, nbf } = result.decoded.payload;
    if (typeof exp === 'number') {
      const d = new Date(exp * 1000);
      if (d < now) {
        return {
          kind: 'expired' as const,
          message: `Expired ${formatRelative(d)} (${d.toLocaleString()})`,
        };
      }
    }
    if (typeof nbf === 'number') {
      const d = new Date(nbf * 1000);
      if (d > now) {
        return {
          kind: 'not-yet' as const,
          message: `Not valid until ${d.toLocaleString()} (${formatRelative(d)})`,
        };
      }
    }
    if (typeof exp === 'number') {
      const d = new Date(exp * 1000);
      return {
        kind: 'valid' as const,
        message: `Valid until ${d.toLocaleString()} (${formatRelative(d)})`,
      };
    }
    return { kind: 'valid' as const, message: 'Decoded successfully (no expiration set)' };
  }, [result]);

  const algoWarning =
    result.type === 'success' && /^none$/i.test(result.decoded.header?.alg ?? '');

  const copyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setInput(SAMPLE_JWT)} size="sm" variant="outline">
          Load sample JWT
        </Button>
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

      {/* Status banner */}
      {result.type === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{result.message}</p>
        </div>
      )}
      {validity && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border ${
            validity.kind === 'valid'
              ? 'bg-muted/50'
              : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
          }`}
        >
          {validity.kind === 'valid' ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0 text-sm">
            <span className="font-medium">{validity.message}</span>
            {algoWarning && (
              <div className="mt-1 text-xs">
                ⚠ Header uses <code className="font-mono">alg: none</code> — this token has no
                signature and cannot be trusted.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input + decoded output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Encoded JWT</span>
              <Badge variant="outline" className="font-normal">
                {input.length} chars
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste a JWT here (header.payload.signature)..."
              className="font-mono text-xs min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Decoded</CardTitle>
          </CardHeader>
          <CardContent>
            {result.type === 'success' ? (
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                        Header
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 gap-1.5"
                        onClick={() =>
                          copyText(JSON.stringify(result.decoded.header, null, 2), 'Header')
                        }
                      >
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">JSON</span>
                      </Button>
                    </div>
                    <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                      <ClaimsTable data={result.decoded.header} />
                    </div>
                  </div>

                  {/* Payload */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Payload
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 gap-1.5"
                        onClick={() =>
                          copyText(JSON.stringify(result.decoded.payload, null, 2), 'Payload')
                        }
                      >
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">JSON</span>
                      </Button>
                    </div>
                    <div className="p-3 rounded-md bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/50">
                      <ClaimsTable data={result.decoded.payload} />
                    </div>
                  </div>

                  {/* Signature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Signature
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 gap-1.5"
                        onClick={() => copyText(result.decoded.signature, 'Signature')}
                      >
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">Copy</span>
                      </Button>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50 border">
                      <p className="font-mono text-xs break-all">{result.decoded.signature}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Signature can only be verified with the secret/key used to sign the token.
                        This tool only decodes — it does not verify.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">
                  {result.type === 'error' ? 'Fix errors above to see decoded output' : 'Paste a JWT to decode it'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}