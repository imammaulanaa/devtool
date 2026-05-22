import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Unlock, Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PgpDecrypt() {
  const [ciphertext, setCiphertext] = useState('');
  const [privKeyInput, setPrivKeyInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const decrypt = async () => {
    setError(null);
    if (!ciphertext.trim()) {
      toast.error('Ciphertext is empty');
      return;
    }
    if (!privKeyInput.trim()) {
      toast.error('Private key is required');
      return;
    }

    setIsDecrypting(true);
    setPlaintext('');

    try {
      const openpgp = await import('openpgp');

      // Parse encrypted message
      let message;
      try {
        message = await openpgp.readMessage({
          armoredMessage: ciphertext.trim(),
        });
      } catch (e: any) {
        throw new Error(
          `Invalid encrypted message: ${e.message || 'parse failed'}`
        );
      }

      // Parse private key
      let privateKey;
      try {
        privateKey = await openpgp.readPrivateKey({
          armoredKey: privKeyInput.trim(),
        });
      } catch (e: any) {
        throw new Error(
          `Invalid private key: ${e.message || 'parse failed'}`
        );
      }

      // Unlock private key if passphrase given
      if (passphrase) {
        try {
          privateKey = await openpgp.decryptKey({
            privateKey,
            passphrase,
          });
        } catch (e: any) {
          const msg = (e.message || '').toLowerCase();
          if (msg.includes('passphrase') || msg.includes('incorrect')) {
            throw new Error('Incorrect passphrase');
          }
          // Key may already be unencrypted — continue and let decrypt() try
        }
      }

      // Decrypt
      let data: string;
      try {
        const result = await openpgp.decrypt({
          message,
          decryptionKeys: privateKey,
          // openpgp.decrypt returns { data: string | ReadableStream } depending on format
        });
        data = typeof result.data === 'string' ? result.data : '';
      } catch (e: any) {
        const msg = (e.message || '').toLowerCase();
        if (msg.includes('passphrase') || msg.includes('encrypted')) {
          throw new Error(
            'Private key needs to be unlocked — provide the passphrase'
          );
        }
        if (msg.includes('session key') || msg.includes('decryption')) {
          throw new Error(
            'This message was not encrypted for this key (no matching recipient)'
          );
        }
        throw new Error(`Decryption failed: ${e.message}`);
      }

      setPlaintext(data);
      toast.success('Decrypted!');
    } catch (err: any) {
      const msg = err?.message || 'Decryption failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsDecrypting(false);
    }
  };

  const copy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const clearAll = () => {
    setCiphertext('');
    setPrivKeyInput('');
    setPassphrase('');
    setPlaintext('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Encrypted Message
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={ciphertext}
                onChange={(e) => setCiphertext(e.target.value)}
                placeholder="-----BEGIN PGP MESSAGE-----..."
                className="font-mono text-[11px] min-h-[160px] resize-none"
                disabled={isDecrypting}
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Your Private Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={privKeyInput}
                onChange={(e) => setPrivKeyInput(e.target.value)}
                placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----..."
                className="font-mono text-[11px] min-h-[160px] resize-none"
                disabled={isDecrypting}
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Passphrase{' '}
              <span className="text-muted-foreground/70">
                (leave empty if key has none)
              </span>
            </label>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase that unlocks your private key"
              disabled={isDecrypting}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={decrypt} disabled={isDecrypting} className="gap-2">
              {isDecrypting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Decrypting...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  Decrypt
                </>
              )}
            </Button>
            <Button
              onClick={clearAll}
              variant="destructive"
              disabled={isDecrypting}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Output */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
              <span>Decrypted Plaintext</span>
              {plaintext && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(plaintext, 'Plaintext')}
                  className="h-7 px-2 gap-1.5"
                >
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Copy</span>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="h-[400px] flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm break-words">{error}</p>
              </div>
            ) : plaintext ? (
              <Textarea
                value={plaintext}
                readOnly
                className="font-mono text-xs min-h-[400px] resize-none bg-muted/50"
                spellCheck={false}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">Decrypted message will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}