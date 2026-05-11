import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Trash2, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import * as diff from 'diff';

// Diff Tool Component
export default function DiffTool() {
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