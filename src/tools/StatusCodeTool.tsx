import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Search } from 'lucide-react';
import { toast } from 'sonner';

interface CodeEntry {
  code: string;
  name: string;
  category: string;
  description: string;
}

const HTTP_CODES: CodeEntry[] = [
  // 1xx
  { code: '100', name: 'Continue', category: '1xx Informational', description: 'Server received headers; client should send the body.' },
  { code: '101', name: 'Switching Protocols', category: '1xx Informational', description: 'Server agreeing to switch protocols (e.g., to WebSocket).' },
  { code: '102', name: 'Processing', category: '1xx Informational', description: 'WebDAV: server is processing, no response yet.' },
  { code: '103', name: 'Early Hints', category: '1xx Informational', description: 'Lets server send headers (like Link preload) before final response.' },
  // 2xx
  { code: '200', name: 'OK', category: '2xx Success', description: 'Request succeeded.' },
  { code: '201', name: 'Created', category: '2xx Success', description: 'Request fulfilled and a new resource was created.' },
  { code: '202', name: 'Accepted', category: '2xx Success', description: 'Accepted but not yet processed (async / queued).' },
  { code: '203', name: 'Non-Authoritative Information', category: '2xx Success', description: 'Returning a modified version of the origin response.' },
  { code: '204', name: 'No Content', category: '2xx Success', description: 'Success with no body to return (e.g., DELETE).' },
  { code: '205', name: 'Reset Content', category: '2xx Success', description: 'Success; client should reset the document view.' },
  { code: '206', name: 'Partial Content', category: '2xx Success', description: 'Range request fulfilled (e.g., resumable downloads).' },
  { code: '207', name: 'Multi-Status', category: '2xx Success', description: 'WebDAV: multiple statuses in body.' },
  // 3xx
  { code: '300', name: 'Multiple Choices', category: '3xx Redirection', description: 'Multiple representations available for the resource.' },
  { code: '301', name: 'Moved Permanently', category: '3xx Redirection', description: 'Resource moved permanently to a new URL.' },
  { code: '302', name: 'Found', category: '3xx Redirection', description: 'Temporary redirect (most clients change method to GET).' },
  { code: '303', name: 'See Other', category: '3xx Redirection', description: 'Redirect with method change to GET.' },
  { code: '304', name: 'Not Modified', category: '3xx Redirection', description: 'Cached version is still valid.' },
  { code: '307', name: 'Temporary Redirect', category: '3xx Redirection', description: 'Temporary redirect; method MUST NOT change.' },
  { code: '308', name: 'Permanent Redirect', category: '3xx Redirection', description: 'Permanent redirect; method MUST NOT change.' },
  // 4xx
  { code: '400', name: 'Bad Request', category: '4xx Client Error', description: 'Malformed syntax or invalid request.' },
  { code: '401', name: 'Unauthorized', category: '4xx Client Error', description: 'Authentication required (or failed).' },
  { code: '402', name: 'Payment Required', category: '4xx Client Error', description: 'Reserved; rarely used in practice.' },
  { code: '403', name: 'Forbidden', category: '4xx Client Error', description: 'Authenticated but not authorized.' },
  { code: '404', name: 'Not Found', category: '4xx Client Error', description: 'Resource does not exist (or is hidden).' },
  { code: '405', name: 'Method Not Allowed', category: '4xx Client Error', description: 'HTTP method not supported on this resource.' },
  { code: '406', name: 'Not Acceptable', category: '4xx Client Error', description: 'Cannot produce a response matching Accept headers.' },
  { code: '407', name: 'Proxy Authentication Required', category: '4xx Client Error', description: 'Must authenticate with the proxy first.' },
  { code: '408', name: 'Request Timeout', category: '4xx Client Error', description: 'Server timed out waiting for the request.' },
  { code: '409', name: 'Conflict', category: '4xx Client Error', description: 'Conflict with current state (e.g., concurrent edits).' },
  { code: '410', name: 'Gone', category: '4xx Client Error', description: 'Resource permanently removed.' },
  { code: '411', name: 'Length Required', category: '4xx Client Error', description: 'Content-Length header is required.' },
  { code: '412', name: 'Precondition Failed', category: '4xx Client Error', description: 'Precondition (e.g., If-Match) failed.' },
  { code: '413', name: 'Payload Too Large', category: '4xx Client Error', description: 'Request body larger than server accepts.' },
  { code: '414', name: 'URI Too Long', category: '4xx Client Error', description: 'URI longer than server can interpret.' },
  { code: '415', name: 'Unsupported Media Type', category: '4xx Client Error', description: 'Request body has unsupported Content-Type.' },
  { code: '416', name: 'Range Not Satisfiable', category: '4xx Client Error', description: 'Requested range not available.' },
  { code: '418', name: "I'm a teapot", category: '4xx Client Error', description: "April Fools 1998. Some sites use it for 'blocked'." },
  { code: '421', name: 'Misdirected Request', category: '4xx Client Error', description: 'Request sent to wrong server.' },
  { code: '422', name: 'Unprocessable Entity', category: '4xx Client Error', description: 'Syntactically valid but semantically wrong (common in JSON APIs).' },
  { code: '425', name: 'Too Early', category: '4xx Client Error', description: 'Server unwilling to process replayed request.' },
  { code: '426', name: 'Upgrade Required', category: '4xx Client Error', description: 'Client must upgrade to a different protocol.' },
  { code: '428', name: 'Precondition Required', category: '4xx Client Error', description: 'Origin requires conditional request (lost-update prevention).' },
  { code: '429', name: 'Too Many Requests', category: '4xx Client Error', description: 'Rate limited.' },
  { code: '431', name: 'Request Header Fields Too Large', category: '4xx Client Error', description: 'Headers too long.' },
  { code: '444', name: 'No Response', category: '4xx (nginx)', description: 'nginx-specific: server closed connection without responding.' },
  { code: '451', name: 'Unavailable For Legal Reasons', category: '4xx Client Error', description: 'Blocked due to legal reasons (DMCA, censorship, etc.).' },
  { code: '499', name: 'Client Closed Request', category: '4xx (nginx)', description: 'nginx-specific: client closed the connection before response.' },
  // 5xx
  { code: '500', name: 'Internal Server Error', category: '5xx Server Error', description: 'Generic server error; check server logs.' },
  { code: '501', name: 'Not Implemented', category: '5xx Server Error', description: 'Method not supported by the server.' },
  { code: '502', name: 'Bad Gateway', category: '5xx Server Error', description: 'Upstream returned an invalid response.' },
  { code: '503', name: 'Service Unavailable', category: '5xx Server Error', description: 'Server overloaded or down for maintenance.' },
  { code: '504', name: 'Gateway Timeout', category: '5xx Server Error', description: 'Upstream timed out.' },
  { code: '505', name: 'HTTP Version Not Supported', category: '5xx Server Error', description: 'HTTP version not supported.' },
  { code: '507', name: 'Insufficient Storage', category: '5xx Server Error', description: 'WebDAV: not enough storage to fulfill request.' },
  { code: '508', name: 'Loop Detected', category: '5xx Server Error', description: 'WebDAV: infinite loop while processing.' },
  { code: '511', name: 'Network Authentication Required', category: '5xx Server Error', description: 'Captive portal: authenticate with the network first.' },
  { code: '599', name: 'Network Connect Timeout Error', category: '5xx (non-standard)', description: 'Used by some proxies for network timeouts.' },
];

const GRPC_CODES: CodeEntry[] = [
  { code: '0', name: 'OK', category: 'gRPC', description: 'Not an error; returned on success.' },
  { code: '1', name: 'CANCELLED', category: 'gRPC', description: 'Operation cancelled, typically by the caller.' },
  { code: '2', name: 'UNKNOWN', category: 'gRPC', description: 'Unknown error (e.g., status from another address space).' },
  { code: '3', name: 'INVALID_ARGUMENT', category: 'gRPC', description: 'Client specified invalid argument (e.g., malformed name).' },
  { code: '4', name: 'DEADLINE_EXCEEDED', category: 'gRPC', description: 'Deadline expired before operation completed.' },
  { code: '5', name: 'NOT_FOUND', category: 'gRPC', description: 'Requested entity (e.g., file) not found.' },
  { code: '6', name: 'ALREADY_EXISTS', category: 'gRPC', description: 'Entity that the client tried to create already exists.' },
  { code: '7', name: 'PERMISSION_DENIED', category: 'gRPC', description: "Caller doesn't have permission. Different from UNAUTHENTICATED." },
  { code: '8', name: 'RESOURCE_EXHAUSTED', category: 'gRPC', description: 'Quota or filesystem out of space.' },
  { code: '9', name: 'FAILED_PRECONDITION', category: 'gRPC', description: 'System not in required state to execute (e.g., directory not empty).' },
  { code: '10', name: 'ABORTED', category: 'gRPC', description: 'Aborted, typically due to concurrency issue (e.g., transaction abort).' },
  { code: '11', name: 'OUT_OF_RANGE', category: 'gRPC', description: 'Operation tried past valid range (e.g., seeking past EOF).' },
  { code: '12', name: 'UNIMPLEMENTED', category: 'gRPC', description: 'Operation not implemented or not supported.' },
  { code: '13', name: 'INTERNAL', category: 'gRPC', description: 'Internal errors. Some invariants broken.' },
  { code: '14', name: 'UNAVAILABLE', category: 'gRPC', description: 'Service is currently unavailable. Retry with backoff.' },
  { code: '15', name: 'DATA_LOSS', category: 'gRPC', description: 'Unrecoverable data loss or corruption.' },
  { code: '16', name: 'UNAUTHENTICATED', category: 'gRPC', description: 'Request lacks valid authentication credentials.' },
];

const LINUX_CODES: CodeEntry[] = [
  { code: '0', name: 'Success', category: 'Linux exit', description: 'Successful execution.' },
  { code: '1', name: 'General error', category: 'Linux exit', description: 'Catchall for general errors.' },
  { code: '2', name: 'Misuse of shell builtin', category: 'Linux exit', description: 'Bash: shell builtin used incorrectly.' },
  { code: '126', name: 'Permission denied', category: 'Linux exit', description: 'Command found but cannot execute (e.g., not executable).' },
  { code: '127', name: 'Command not found', category: 'Linux exit', description: 'Command not found in PATH.' },
  { code: '128', name: 'Invalid exit argument', category: 'Linux exit', description: 'exit() called with invalid argument.' },
  { code: '128+N', name: 'Killed by signal N', category: 'Linux exit', description: 'Process killed by signal N. Exit code = 128 + signal number.' },
  { code: '130', name: 'Killed by SIGINT (Ctrl+C)', category: 'Linux signal', description: '128+2: User pressed Ctrl+C.' },
  { code: '131', name: 'Killed by SIGQUIT', category: 'Linux signal', description: '128+3: Quit signal (Ctrl+\\). Often produces a core dump.' },
  { code: '134', name: 'Killed by SIGABRT', category: 'Linux signal', description: '128+6: abort() called or assertion failed.' },
  { code: '137', name: 'Killed by SIGKILL', category: 'Linux signal', description: '128+9: Process killed forcefully — often OOM kill in containers.' },
  { code: '139', name: 'Killed by SIGSEGV', category: 'Linux signal', description: '128+11: Segmentation fault — invalid memory access.' },
  { code: '141', name: 'Killed by SIGPIPE', category: 'Linux signal', description: '128+13: Wrote to a pipe with no reader (broken pipe).' },
  { code: '143', name: 'Killed by SIGTERM', category: 'Linux signal', description: '128+15: Polite termination request (e.g., docker stop, k8s pod delete).' },
  { code: '255', name: 'Exit out of range', category: 'Linux exit', description: 'Exit code outside the 0–255 range.' },
];

const ALL_CODES = [...HTTP_CODES, ...GRPC_CODES, ...LINUX_CODES];

type Filter = 'all' | 'http' | 'grpc' | 'linux';

export default function StatusCodeTool() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    let pool: CodeEntry[];
    if (filter === 'http') pool = HTTP_CODES;
    else if (filter === 'grpc') pool = GRPC_CODES;
    else if (filter === 'linux') pool = LINUX_CODES;
    else pool = ALL_CODES;

    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [query, filter]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, name, or description..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {([
            { value: 'all', label: `All (${ALL_CODES.length})` },
            { value: 'http', label: `HTTP (${HTTP_CODES.length})` },
            { value: 'grpc', label: `gRPC (${GRPC_CODES.length})` },
            { value: 'linux', label: `Linux (${LINUX_CODES.length})` },
          ] as { value: Filter; label: string }[]).map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className="h-7 text-xs"
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>Reference</span>
            <Badge variant="outline" className="font-normal">
              {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No matches</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-3">
              <div className="space-y-1.5">
                {filtered.map((c, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="font-mono text-sm font-bold flex-shrink-0"
                      >
                        {c.code}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-sm">{c.name}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 font-normal"
                          >
                            {c.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 flex-shrink-0"
                        onClick={() => copy(`${c.code} ${c.name}`)}
                        title="Copy code + name"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}