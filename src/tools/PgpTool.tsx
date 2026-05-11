import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, Trash2, AlertCircle, Key, Download } from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// PGP Key Pair Generator (lazy-loads openpgp.js on demand)
// ============================================================
type PgpAlgorithm = 'ecc' | 'rsa2048' | 'rsa4096';
type PgpExpiry = 'never' | '1y' | '2y' | '5y';

interface PgpKeyInfo {
  fingerprint: string;
  keyID: string;
  algorithm: string;
  created: string;
  expires: string;
  userID: string;
}

export default function PgpTool() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [algorithm, setAlgorithm] = useState<PgpAlgorithm>('ecc');
  const [expiry, setExpiry] = useState<PgpExpiry>('never');
  const [isGenerating, setIsGenerating] = useState(false);

  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [keyInfo, setKeyInfo] = useState<PgpKeyInfo | null>(null);

  const algorithms: { value: PgpAlgorithm; label: string; subtitle: string }[] = [
    { value: 'ecc', label: 'Curve25519', subtitle: 'modern, fast' },
    { value: 'rsa2048', label: 'RSA 2048', subtitle: 'compatible' },
    { value: 'rsa4096', label: 'RSA 4096', subtitle: 'slow, strongest' },
  ];

  const expiries: { value: PgpExpiry; label: string }[] = [
    { value: 'never', label: 'Never' },
    { value: '1y', label: '1 year' },
    { value: '2y', label: '2 years' },
    { value: '5y', label: '5 years' },
  ];

  const expirySeconds = (e: PgpExpiry): number => {
    if (e === 'never') return 0;
    if (e === '1y') return 365 * 24 * 60 * 60;
    if (e === '2y') return 2 * 365 * 24 * 60 * 60;
    return 5 * 365 * 24 * 60 * 60;
  };

  const generate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Valid email is required');
      return;
    }

    setIsGenerating(true);
    setPublicKey('');
    setPrivateKey('');
    setKeyInfo(null);

    try {
      // Lazy-load openpgp only when generating to keep initial bundle small
      const openpgp = await import('openpgp');

      const userID: { name: string; email: string; comment?: string } = {
        name: name.trim(),
        email: trimmedEmail,
      };
      if (comment.trim()) userID.comment = comment.trim();

      const opts: any = {
        userIDs: [userID],
        passphrase: passphrase || undefined,
        keyExpirationTime: expirySeconds(expiry),
        format: 'armored',
      };

      if (algorithm === 'ecc') {
        opts.type = 'ecc';
        opts.curve = 'curve25519';
      } else {
        opts.type = 'rsa';
        opts.rsaBits = algorithm === 'rsa4096' ? 4096 : 2048;
      }

      const result = await openpgp.generateKey(opts);

      // Read the public key for metadata
      const pubKey = await openpgp.readKey({ armoredKey: result.publicKey });
      const fp = pubKey.getFingerprint().toUpperCase();
      const keyIDHex = pubKey.getKeyID().toHex().toUpperCase();
      const created = pubKey.getCreationTime();

      let expiresStr = 'Never';
      try {
        const exp = await pubKey.getExpirationTime();
        if (exp && exp !== Infinity && exp instanceof Date) {
          expiresStr = exp.toLocaleString();
        }
      } catch {
        /* never expires */
      }

      const fingerprintFmt = (fp.match(/.{1,4}/g) || []).join(' ');
      const userIDDisplay = comment.trim()
        ? `${name.trim()} (${comment.trim()}) <${trimmedEmail}>`
        : `${name.trim()} <${trimmedEmail}>`;

      setPublicKey(result.publicKey);
      setPrivateKey(result.privateKey);
      setKeyInfo({
        fingerprint: fingerprintFmt,
        keyID: keyIDHex,
        algorithm:
          algorithm === 'ecc'
            ? 'EdDSA + ECDH (Curve25519)'
            : `RSA ${algorithm.slice(3)}`,
        created: created.toLocaleString(),
        expires: expiresStr,
        userID: userIDDisplay,
      });

      toast.success('PGP key pair generated!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate key: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  const clearOutput = () => {
    setPublicKey('');
    setPrivateKey('');
    setKeyInfo(null);
  };

  const copyText = (text: string, label: string) => {
    if (!text) {
      toast.error(`No ${label} to copy`);
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const downloadText = (text: string, filename: string) => {
    if (!text) return;
    const blob = new Blob([text], { type: 'application/pgp-keys' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const safeName =
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'key';

  return (
    <div className="space-y-4">
      {/* Form fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Email <span className="text-destructive">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Comment <span className="text-muted-foreground/70">(optional)</span>
          </label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Personal"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Passphrase{' '}
            <span className="text-muted-foreground/70">(optional, recommended)</span>
          </label>
          <Input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Strong passphrase to encrypt private key"
            disabled={isGenerating}
          />
        </div>
      </div>

      {/* Algorithm + Expiry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Algorithm
          </label>
          <div className="flex flex-wrap gap-2">
            {algorithms.map((a) => (
              <Button
                key={a.value}
                size="sm"
                variant={algorithm === a.value ? 'default' : 'outline'}
                onClick={() => setAlgorithm(a.value)}
                disabled={isGenerating}
                className="h-auto py-1.5 px-3 flex flex-col gap-0 items-start"
              >
                <span className="text-xs">{a.label}</span>
                <span
                  className={`text-[10px] ${
                    algorithm === a.value
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}
                >
                  {a.subtitle}
                </span>
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Expires
          </label>
          <div className="flex flex-wrap gap-2">
            {expiries.map((e) => (
              <Button
                key={e.value}
                size="sm"
                variant={expiry === e.value ? 'default' : 'outline'}
                onClick={() => setExpiry(e.value)}
                disabled={isGenerating}
                className="text-xs h-7"
              >
                {e.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 items-center pt-1">
        <Button onClick={generate} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Key className="w-4 h-4" />
              Generate Key Pair
            </>
          )}
        </Button>
        <Button
          onClick={clearOutput}
          variant="outline"
          disabled={isGenerating || (!publicKey && !privateKey)}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Clear Output
        </Button>
        {isGenerating && algorithm.startsWith('rsa') && (
          <span className="text-xs text-muted-foreground">
            (RSA can take {algorithm === 'rsa4096' ? '10–30' : '2–5'} seconds)
          </span>
        )}
      </div>

      {/* Key info */}
      {keyInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
              Key Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="font-medium text-muted-foreground">User ID</dt>
              <dd className="font-mono text-xs break-all">{keyInfo.userID}</dd>
              <dt className="font-medium text-muted-foreground">Fingerprint</dt>
              <dd className="font-mono text-xs break-all">{keyInfo.fingerprint}</dd>
              <dt className="font-medium text-muted-foreground">Key ID</dt>
              <dd className="font-mono text-xs">{keyInfo.keyID}</dd>
              <dt className="font-medium text-muted-foreground">Algorithm</dt>
              <dd className="font-mono text-xs">{keyInfo.algorithm}</dd>
              <dt className="font-medium text-muted-foreground">Created</dt>
              <dd className="font-mono text-xs">{keyInfo.created}</dd>
              <dt className="font-medium text-muted-foreground">Expires</dt>
              <dd className="font-mono text-xs">{keyInfo.expires}</dd>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Private key warning */}
      {privateKey && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong>Keep your private key secret.</strong> Anyone with access to it
            can decrypt messages sent to you and sign as you. Save it to an
            encrypted location and never share it.
            {!passphrase && (
              <>
                {' '}
                You generated this key <strong>without a passphrase</strong> —
                consider regenerating with one for extra protection.
              </>
            )}
          </div>
        </div>
      )}

      {/* Public + Private key cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
              <span>Public Key (share freely)</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!publicKey}
                  onClick={() => copyText(publicKey, 'Public key')}
                  className="h-7 px-2 gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Copy</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!publicKey}
                  onClick={() => downloadText(publicKey, `${safeName}-public.asc`)}
                  className="h-7 px-2 gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Download</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {publicKey ? (
              <Textarea
                value={publicKey}
                readOnly
                className="font-mono text-[11px] min-h-[400px] resize-none bg-muted/50"
                spellCheck={false}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">Public key will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                Private Key
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  SECRET
                </Badge>
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!privateKey}
                  onClick={() => copyText(privateKey, 'Private key')}
                  className="h-7 px-2 gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Copy</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!privateKey}
                  onClick={() => downloadText(privateKey, `${safeName}-private.asc`)}
                  className="h-7 px-2 gap-1.5"
                >
                  <Download className="w-3 h-3" />
                  <span className="text-xs">Download</span>
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {privateKey ? (
              <Textarea
                value={privateKey}
                readOnly
                className="font-mono text-[11px] min-h-[400px] resize-none bg-muted/50"
                spellCheck={false}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">Private key will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}