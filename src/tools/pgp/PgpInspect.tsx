import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SubkeyInfo {
  fingerprint: string;
  keyID: string;
  algorithm: string;
  created: string;
  expires: string;
}

interface KeyDetails {
  isPrivate: boolean;
  fingerprint: string;
  keyID: string;
  algorithm: string;
  created: string;
  expires: string;
  userIDs: string[];
  subkeys: SubkeyInfo[];
}

function formatAlgo(info: { algorithm?: string; bits?: number; curve?: string }): string {
  const algo = info.algorithm || 'unknown';
  if (algo.startsWith('rsa')) return `RSA ${info.bits || '?'}`;
  if (algo === 'eddsaLegacy' || algo === 'eddsa') return `EdDSA (${info.curve || 'ed25519'})`;
  if (algo === 'ecdh') return `ECDH (${info.curve || 'curve25519'})`;
  if (algo === 'ecdsa') return `ECDSA (${info.curve || 'unknown'})`;
  if (algo === 'dsa') return 'DSA';
  if (algo === 'elgamal') return 'ElGamal';
  return algo;
}

function formatFingerprint(hex: string): string {
  const up = hex.toUpperCase();
  return (up.match(/.{1,4}/g) || []).join(' ');
}

function formatExpiry(exp: Date | number | null | undefined): string {
  if (!exp) return 'Never';
  if (exp === Infinity) return 'Never';
  if (exp instanceof Date) {
    const now = Date.now();
    const t = exp.getTime();
    const past = t < now;
    return `${exp.toLocaleString()}${past ? ' (EXPIRED)' : ''}`;
  }
  return String(exp);
}

export default function PgpInspect() {
  const [keyInput, setKeyInput] = useState('');
  const [details, setDetails] = useState<KeyDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  const inspect = async () => {
    setError(null);
    setDetails(null);
    if (!keyInput.trim()) {
      toast.error('Key input is empty');
      return;
    }

    setIsInspecting(true);

    try {
      const openpgp = await import('openpgp');

      let key;
      try {
        key = await openpgp.readKey({ armoredKey: keyInput.trim() });
      } catch (e: any) {
        throw new Error(`Invalid PGP key: ${e.message || 'parse failed'}`);
      }

      const isPrivate = key.isPrivate();
      const fingerprint = formatFingerprint(key.getFingerprint());
      const keyID = key.getKeyID().toHex().toUpperCase();
      const created = key.getCreationTime().toLocaleString();

      let expires = 'Never';
      try {
        const exp = await key.getExpirationTime();
        expires = formatExpiry(exp as any);
      } catch {
        /* default */
      }

      const algorithm = formatAlgo(key.getAlgorithmInfo());

      // User IDs
      const userIDs = key.users
        .map((u: any) => u.userID?.userID)
        .filter((s: string | undefined): s is string => Boolean(s));

      // Subkeys
      const subkeys: SubkeyInfo[] = await Promise.all(
        key.subkeys.map(async (sub: any) => {
          let subExp = 'Never';
          try {
            const exp = await sub.getExpirationTime();
            subExp = formatExpiry(exp as any);
          } catch {
            /* default */
          }
          return {
            fingerprint: formatFingerprint(sub.getFingerprint()),
            keyID: sub.getKeyID().toHex().toUpperCase(),
            algorithm: formatAlgo(sub.getAlgorithmInfo()),
            created: sub.getCreationTime().toLocaleString(),
            expires: subExp,
          };
        })
      );

      setDetails({
        isPrivate,
        fingerprint,
        keyID,
        algorithm,
        created,
        expires,
        userIDs,
        subkeys,
      });
      toast.success('Key inspected');
    } catch (err: any) {
      const msg = err?.message || 'Inspection failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsInspecting(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const clearAll = () => {
    setKeyInput('');
    setDetails(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">PGP Key (public or private)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK----- or PRIVATE KEY BLOCK..."
            className="font-mono text-[11px] min-h-[200px] resize-none"
            disabled={isInspecting}
            spellCheck={false}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={inspect} disabled={isInspecting} className="gap-2">
          {isInspecting ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Inspecting...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Inspect
            </>
          )}
        </Button>
        <Button
          onClick={clearAll}
          variant="destructive"
          disabled={isInspecting}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm break-words">{error}</p>
        </div>
      )}

      {details && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span>Key Details</span>
              <Badge
                variant={details.isPrivate ? 'destructive' : 'secondary'}
                className="text-[10px] h-4 px-1.5"
              >
                {details.isPrivate ? 'PRIVATE' : 'PUBLIC'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[500px] pr-3">
              {/* Primary key info */}
              <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="font-medium text-muted-foreground">User IDs</dt>
                <dd className="space-y-1">
                  {details.userIDs.length === 0 ? (
                    <span className="text-muted-foreground italic text-xs">(none)</span>
                  ) : (
                    details.userIDs.map((u, i) => (
                      <div key={i} className="font-mono text-xs break-all flex items-center gap-2 group">
                        <span>{u}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          onClick={() => copy(u, 'User ID')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </dd>

                <dt className="font-medium text-muted-foreground">Fingerprint</dt>
                <dd className="font-mono text-xs break-all flex items-center gap-2 group">
                  <span>{details.fingerprint}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => copy(details.fingerprint.replace(/ /g, ''), 'Fingerprint')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </dd>

                <dt className="font-medium text-muted-foreground">Key ID</dt>
                <dd className="font-mono text-xs">{details.keyID}</dd>

                <dt className="font-medium text-muted-foreground">Algorithm</dt>
                <dd className="font-mono text-xs">{details.algorithm}</dd>

                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="font-mono text-xs">{details.created}</dd>

                <dt className="font-medium text-muted-foreground">Expires</dt>
                <dd className="font-mono text-xs">
                  {details.expires.includes('EXPIRED') ? (
                    <span className="text-destructive">{details.expires}</span>
                  ) : (
                    details.expires
                  )}
                </dd>
              </dl>

              {/* Subkeys */}
              {details.subkeys.length > 0 && (
                <div className="mt-6 pt-4 border-t">
                  <div className="text-xs font-medium text-muted-foreground mb-3">
                    SUBKEYS ({details.subkeys.length})
                  </div>
                  <div className="space-y-3">
                    {details.subkeys.map((sub, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-md border bg-muted/30 space-y-1.5"
                      >
                        <div className="font-mono text-xs break-all">
                          <span className="text-muted-foreground">FP:</span>{' '}
                          {sub.fingerprint}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>
                            <span className="text-muted-foreground">Algo:</span>{' '}
                            <span className="font-mono">{sub.algorithm}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID:</span>{' '}
                            <span className="font-mono">{sub.keyID}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span>{' '}
                            <span className="font-mono">{sub.created}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Expires:</span>{' '}
                            <span
                              className={`font-mono ${
                                sub.expires.includes('EXPIRED') ? 'text-destructive' : ''
                              }`}
                            >
                              {sub.expires}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}