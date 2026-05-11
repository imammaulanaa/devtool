import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileCode, FileJson, CheckCircle2, XCircle, Copy, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as yaml from 'js-yaml';

// JSON Validator Component
export default function JsonValidator() {
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