import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, AlertCircle, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

// Base64 Encoder/Decoder Component
export default function Base64Tool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [urlSafe, setUrlSafe] = useState(false);

  const encode = useCallback(() => {
    if (!input) {
      toast.error('Please enter content to encode');
      return;
    }
    try {
      // UTF-8 safe encoding (handles emoji & non-ASCII characters correctly)
      const bytes = new TextEncoder().encode(input);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      let b64 = btoa(binary);
      if (urlSafe) {
        b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      }
      setOutput(b64);
      setError(null);
      toast.success('Encoded to Base64!');
    } catch (err: any) {
      setError(err.message || 'Failed to encode');
      setOutput('');
      toast.error('Failed to encode');
    }
  }, [input, urlSafe]);

  const decode = useCallback(() => {
    if (!input) {
      toast.error('Please enter content to decode');
      return;
    }
    try {
      // Strip whitespace and normalize URL-safe characters automatically
      let s = input.trim().replace(/\s+/g, '');
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      // Pad to multiple of 4
      while (s.length % 4 !== 0) {
        s += '=';
      }
      const binary = atob(s);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      // fatal: true so invalid UTF-8 sequences throw instead of silently producing garbage
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      setOutput(text);
      setError(null);
      toast.success('Decoded from Base64!');
    } catch (err: any) {
      setError('Invalid Base64 input. Please check your data.');
      setOutput('');
      toast.error('Invalid Base64 input');
    }
  }, [input]);

  const swap = () => {
    if (!input && !output) {
      toast.error('Nothing to swap');
      return;
    }
    setInput(output);
    setOutput(input);
    setError(null);
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  const copyOutput = () => {
    if (!output) {
      toast.error('No output to copy');
      return;
    }
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={encode} size="sm" className="gap-2">
          <ArrowRight className="w-4 h-4" />
          Encode
        </Button>
        <Button onClick={decode} size="sm" variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Decode
        </Button>
        <Button onClick={swap} size="sm" variant="outline" className="gap-2">
          <ArrowLeftRight className="w-4 h-4" />
          Swap
        </Button>
        <Button onClick={copyOutput} size="sm" variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy Output
        </Button>
        <Button onClick={clearAll} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
        <label className="flex items-center gap-2 text-sm ml-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={urlSafe}
            onChange={(e) => setUrlSafe(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          URL-safe encoding
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Input</span>
              <Badge variant="outline" className="font-normal">
                {input.length} chars
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Enter text to encode, or Base64 to decode...\n\nExample text:    Hello, World! 🌍\nExample base64:  SGVsbG8sIFdvcmxkISDwn4yN`}
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Output</span>
              <Badge variant="outline" className="font-normal">
                {output.length} chars
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2 min-h-[400px]">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            ) : (
              <Textarea
                value={output}
                readOnly
                placeholder="Result will appear here..."
                className="font-mono text-sm min-h-[400px] resize-none bg-muted/50"
                spellCheck={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}