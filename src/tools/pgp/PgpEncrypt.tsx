import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Copy, Trash2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function PgpEncrypt() {
  const [plaintext, setPlaintext] = useState('');
  const [recipientKey, setRecipientKey] = useState('');
  const [ciphertext, setCiphertext] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const encrypt = async () => {
    setError(null);
    if (!plaintext.trim()) {
      toast.error('Plaintext is empty');
      return;
    }
    if (!recipientKey.trim()) {
      toast.error('Recipient public key is required');
      return;
    }

    setIsEncrypting(true);
    setCiphertext('');
    setRecipientInfo(null);

    try {
      const openpgp = await import('openpgp');

      // Parse recipient key
      let publicKey;
      try {
        publicKey = await openpgp.readKey({ armoredKey: recipientKey.trim() });
      } catch (e: any) {
        throw new Error(`Invalid public key: ${e.message || 'parse failed'}`);
      }

      // Capture recipient info for display
      const fp = publicKey.getFingerprint().toUpperCase();
      const fpFmt = (fp.match(/.{1,4}/g) || []).join(' ');
      const primaryUser = publicKey.users[0]?.userID?.userID || '(no user ID)';

      // Encrypt
      const message = await openpgp.createMessage({ text: plaintext });
      const armored = await openpgp.encrypt({
        message,
        encryptionKeys: publicKey,
      });

      setCiphertext(typeof armored === 'string' ? armored : '');
      setRecipientInfo(`Encrypted for: ${primaryUser}  ·  ${fpFmt}`);
      toast.success('Encrypted!');
    } catch (err: any) {
      const msg = err?.message || 'Encryption failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsEncrypting(false);
    }
  };

  const copy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const downloadCiphertext = () => {
    if (!ciphertext) return;
    const blob = new Blob([ciphertext], { type: 'application/pgp-encrypted' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'message.asc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded message.asc');
  };

  const clearAll = () => {
    setPlaintext('');
    setRecipientKey('');
    setCiphertext('');
    setRecipientInfo(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Plaintext</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
                placeholder="Message to encrypt..."
                className="font-mono text-xs min-h-[160px] resize-none"
                disabled={isEncrypting}
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Recipient Public Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={recipientKey}
                onChange={(e) => setRecipientKey(e.target.value)}
                placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
                className="font-mono text-[11px] min-h-[180px] resize-none"
                disabled={isEncrypting}
                spellCheck={false}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={encrypt} disabled={isEncrypting} className="gap-2">
              {isEncrypting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Encrypting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Encrypt
                </>
              )}
            </Button>
            <Button
              onClick={clearAll}
              variant="destructive"
              disabled={isEncrypting}
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
              <span>Ciphertext</span>
              {ciphertext && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(ciphertext, 'Ciphertext')}
                    className="h-7 px-2 gap-1.5"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="text-xs">Copy</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={downloadCiphertext}
                    className="h-7 px-2 gap-1.5"
                  >
                    <Download className="w-3 h-3" />
                    <span className="text-xs">Download</span>
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="h-[400px] flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm break-words">{error}</p>
              </div>
            ) : ciphertext ? (
              <div className="space-y-2">
                {recipientInfo && (
                  <div className="text-xs text-muted-foreground font-mono p-2 rounded bg-muted/50 break-all">
                    {recipientInfo}
                  </div>
                )}
                <Textarea
                  value={ciphertext}
                  readOnly
                  className="font-mono text-[11px] min-h-[400px] resize-none bg-muted/50"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
                <p className="text-sm">Encrypted message will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}