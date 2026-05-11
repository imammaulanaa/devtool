import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, AlertCircle, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

// URL Encoder/Decoder Component
export default function UrlTool() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fullUrlMode, setFullUrlMode] = useState(false);

  const encode = useCallback(() => {
    if (!input) {
      toast.error('Please enter content to encode');
      return;
    }
    try {
      // encodeURIComponent: encodes everything including reserved chars (/, ?, #, &, =)
      // encodeURI: preserves URL structural characters — useful for whole URLs
      const encoded = fullUrlMode ? encodeURI(input) : encodeURIComponent(input);
      setOutput(encoded);
      setError(null);
      toast.success('Encoded!');
    } catch (err: any) {
      setError(err.message || 'Failed to encode');
      setOutput('');
      toast.error('Failed to encode');
    }
  }, [input, fullUrlMode]);

  const decode = useCallback(() => {
    if (!input) {
      toast.error('Please enter content to decode');
      return;
    }
    try {
      const decoded = fullUrlMode ? decodeURI(input) : decodeURIComponent(input);
      setOutput(decoded);
      setError(null);
      toast.success('Decoded!');
    } catch (err: any) {
      // decodeURIComponent throws URIError on malformed % sequences (e.g. lone "%" or "%G1")
      setError('Invalid URL-encoded input. Check for malformed % sequences (e.g. lone "%" or non-hex digits).');
      setOutput('');
      toast.error('Invalid URL-encoded input');
    }
  }, [input, fullUrlMode]);

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
            checked={fullUrlMode}
            onChange={(e) => setFullUrlMode(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Full URL mode
          <span className="text-muted-foreground text-xs">
            (preserves /, ?, #, &amp;)
          </span>
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
              placeholder={`Enter text to encode, or URL-encoded string to decode...\n\nComponent mode example:\n  in:  hello world & friends?\n  out: hello%20world%20%26%20friends%3F\n\nFull URL mode example:\n  in:  https://example.com/path?q=hello world\n  out: https://example.com/path?q=hello%20world`}
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