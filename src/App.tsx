import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileJson,
  FileCode,
  GitCompare,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
  AlertCircle,
  Binary,
  ArrowRight,
  ArrowLeft,
  ArrowLeftRight,
  Link
} from 'lucide-react';
import { toast } from 'sonner';
import * as yaml from 'js-yaml';
import * as diff from 'diff';

// YAML Validator Component
function YamlValidator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ valid: boolean; message: string; parsed?: any } | null>(null);

  const validateYaml = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter YAML content');
      return;
    }
    try {
      const parsed = yaml.load(input);
      setResult({ valid: true, message: 'Valid YAML!', parsed });
      toast.success('YAML is valid!');
    } catch (error: any) {
      setResult({ valid: false, message: error.message });
      toast.error('Invalid YAML');
    }
  }, [input]);

  const formatYaml = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter YAML content');
      return;
    }
    try {
      const parsed = yaml.load(input);
      const formatted = yaml.dump(parsed, { indent: 2 });
      setInput(formatted);
      toast.success('YAML formatted!');
    } catch (error: any) {
      toast.error('Cannot format invalid YAML');
    }
  }, [input]);

  const convertToJson = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter YAML content');
      return;
    }
    try {
      const parsed = yaml.load(input);
      const json = JSON.stringify(parsed, null, 2);
      navigator.clipboard.writeText(json);
      toast.success('Converted to JSON and copied to clipboard!');
    } catch (error: any) {
      toast.error('Cannot convert invalid YAML');
    }
  }, [input]);

  const clearInput = () => {
    setInput('');
    setResult(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(input);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={validateYaml} size="sm" className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Validate
        </Button>
        <Button onClick={formatYaml} size="sm" variant="outline" className="gap-2">
          <FileCode className="w-4 h-4" />
          Format
        </Button>
        <Button onClick={convertToJson} size="sm" variant="outline" className="gap-2">
          <FileJson className="w-4 h-4" />
          To JSON
        </Button>
        <Button onClick={copyToClipboard} size="sm" variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </Button>
        <Button onClick={clearInput} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">YAML Input</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`# Enter your YAML here\nname: akbar\nage: 25\naddress:\n  city: Jakarta\n  country: Indonesia`}
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <Badge variant="default" className="gap-1 bg-green-500">
                      <CheckCircle2 className="w-3 h-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Invalid
                    </Badge>
                  )}
                </div>
                {result.valid ? (
                  <ScrollArea className="h-[400px]">
                    <pre className="font-mono text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(result.parsed, null, 2)}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2 min-h-[400px]">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{result.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Validation result will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// JSON Validator Component
function JsonValidator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ valid: boolean; message: string; parsed?: any } | null>(null);

  const validateJson = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter JSON content');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      setResult({ valid: true, message: 'Valid JSON!', parsed });
      toast.success('JSON is valid!');
    } catch (error: any) {
      setResult({ valid: false, message: error.message });
      toast.error('Invalid JSON');
    }
  }, [input]);

  const formatJson = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter JSON content');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      setInput(formatted);
      toast.success('JSON formatted!');
    } catch (error: any) {
      toast.error('Cannot format invalid JSON');
    }
  }, [input]);

  const minifyJson = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter JSON content');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setInput(minified);
      toast.success('JSON minified!');
    } catch (error: any) {
      toast.error('Cannot minify invalid JSON');
    }
  }, [input]);

  const convertToYaml = useCallback(() => {
    if (!input.trim()) {
      toast.error('Please enter JSON content');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const yamlContent = yaml.dump(parsed, { indent: 2 });
      navigator.clipboard.writeText(yamlContent);
      toast.success('Converted to YAML and copied to clipboard!');
    } catch (error: any) {
      toast.error('Cannot convert invalid JSON');
    }
  }, [input]);

  const clearInput = () => {
    setInput('');
    setResult(null);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(input);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={validateJson} size="sm" className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Validate
        </Button>
        <Button onClick={formatJson} size="sm" variant="outline" className="gap-2">
          <FileCode className="w-4 h-4" />
          Format
        </Button>
        <Button onClick={minifyJson} size="sm" variant="outline" className="gap-2">
          <FileJson className="w-4 h-4" />
          Minify
        </Button>
        <Button onClick={convertToYaml} size="sm" variant="outline" className="gap-2">
          <FileCode className="w-4 h-4" />
          To YAML
        </Button>
        <Button onClick={copyToClipboard} size="sm" variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy
        </Button>
        <Button onClick={clearInput} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">JSON Input</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`{\n  "name": "akbar",\n  "age": 25,\n  "address": {\n    "city": "Jakarta",\n    "country": "Indonesia"\n  }\n}`}
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.valid ? (
                    <Badge variant="default" className="gap-1 bg-green-500">
                      <CheckCircle2 className="w-3 h-3" />
                      Valid
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Invalid
                    </Badge>
                  )}
                </div>
                {result.valid ? (
                  <ScrollArea className="h-[400px]">
                    <pre className="font-mono text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(result.parsed, null, 2)}
                    </pre>
                  </ScrollArea>
                ) : (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2 min-h-[400px]">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{result.message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">Validation result will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Diff Tool Component
function DiffTool() {
  const [leftInput, setLeftInput] = useState('');
  const [rightInput, setRightInput] = useState('');
  const [diffResult, setDiffResult] = useState<diff.Change[] | null>(null);
  const [diffType, setDiffType] = useState<'lines' | 'words' | 'chars'>('lines');

  const compareDiff = useCallback(() => {
    if (!leftInput && !rightInput) {
      toast.error('Please enter content to compare');
      return;
    }

    let differences: diff.Change[] = [];

    switch (diffType) {
      case 'words':
        differences = diff.diffWords(leftInput, rightInput);
        break;
      case 'chars':
        differences = diff.diffChars(leftInput, rightInput);
        break;
      case 'lines':
      default:
        differences = diff.diffLines(leftInput, rightInput);
        break;
    }

    setDiffResult(differences);
    toast.success('Comparison complete!');
  }, [leftInput, rightInput, diffType]);

  const clearAll = () => {
    setLeftInput('');
    setRightInput('');
    setDiffResult(null);
  };

  const copyDiff = () => {
    if (!diffResult) return;
    const text = diffResult.map(part => part.value).join('');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStats = () => {
    if (!diffResult) return null;
    const added = diffResult.filter(p => p.added).reduce((acc, p) => acc + p.value.length, 0);
    const removed = diffResult.filter(p => p.removed).reduce((acc, p) => acc + p.value.length, 0);
    const unchanged = diffResult.filter(p => !p.added && !p.removed).reduce((acc, p) => acc + p.value.length, 0);
    return { added, removed, unchanged };
  };

  const stats = getStats();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button onClick={compareDiff} size="sm" className="gap-2">
          <GitCompare className="w-4 h-4" />
          Compare
        </Button>
        <select
          value={diffType}
          onChange={(e) => setDiffType(e.target.value as 'lines' | 'words' | 'chars')}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="lines">Compare by Lines</option>
          <option value="words">Compare by Words</option>
          <option value="chars">Compare by Characters</option>
        </select>
        <Button onClick={copyDiff} size="sm" variant="outline" className="gap-2">
          <Copy className="w-4 h-4" />
          Copy Result
        </Button>
        <Button onClick={clearAll} size="sm" variant="destructive" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Clear All
        </Button>
      </div>

      {stats && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Added: {stats.added} chars</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Removed: {stats.removed} chars</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-muted rounded"></div>
            <span>Unchanged: {stats.unchanged} chars</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Original Text</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={leftInput}
              onChange={(e) => setLeftInput(e.target.value)}
              placeholder="Enter original text here..."
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Modified Text</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={rightInput}
              onChange={(e) => setRightInput(e.target.value)}
              placeholder="Enter modified text here..."
              className="font-mono text-sm min-h-[400px] resize-none"
              spellCheck={false}
            />
          </CardContent>
        </Card>
      </div>

      {diffResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Diff Result</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="font-mono text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {diffResult.map((part, index) => {
                  if (part.added) {
                    return (
                      <span key={index} className="bg-green-500/30 text-green-900 dark:text-green-100">
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span key={index} className="bg-red-500/30 text-red-900 dark:text-red-100 line-through">
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={index}>{part.value}</span>;
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// URL Encoder/Decoder Component
function UrlTool() {
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

// Base64 Encoder/Decoder Component
function Base64Tool() {
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

// Main App Component
function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <FileCode className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">DevTools Hub</h1>
              <p className="text-sm text-muted-foreground">
                YAML • JSON • Diff • Base64 • URL Encoder
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="yaml" className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 mb-8">
            <TabsTrigger value="yaml" className="gap-2">
              <FileCode className="w-4 h-4" />
              YAML
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="diff" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Diff
            </TabsTrigger>
            <TabsTrigger value="base64" className="gap-2">
              <Binary className="w-4 h-4" />
              Base64
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="w-4 h-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yaml">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  YAML Validator
                </CardTitle>
                <CardDescription>
                  Validate, format, and convert YAML files. Check syntax errors and convert to JSON.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <YamlValidator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="json">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="w-5 h-5" />
                  JSON Validator
                </CardTitle>
                <CardDescription>
                  Validate, format, minify, and convert JSON files. Check syntax errors and convert to YAML.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JsonValidator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diff">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Diff Tool
                </CardTitle>
                <CardDescription>
                  Compare two texts and see the differences. Support line-by-line, word-by-word, and character-by-character comparison.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DiffTool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="base64">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Binary className="w-5 h-5" />
                  Base64 Encoder / Decoder
                </CardTitle>
                <CardDescription>
                  Encode text to Base64 or decode Base64 back to text. Supports UTF-8 (emoji & non-ASCII) and URL-safe encoding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Base64Tool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  URL Encoder / Decoder
                </CardTitle>
                <CardDescription>
                  Encode text for safe use in URLs, or decode percent-encoded URLs back to readable text. Supports component mode (default) and full URL mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UrlTool />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              DevTools Hub - Free online developer utilities
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;