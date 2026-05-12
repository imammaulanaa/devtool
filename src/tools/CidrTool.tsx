import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// IPv4 helpers — operate on 32-bit unsigned ints (fit in JS Number)
function parseIPv4(s: string): number {
  const parts = s.split('.');
  if (parts.length !== 4) throw new Error(`IPv4 must have 4 octets, got ${parts.length}`);
  let result = 0;
  for (let i = 0; i < 4; i++) {
    const p = parts[i];
    if (!/^\d{1,3}$/.test(p)) throw new Error(`Invalid octet: "${p}"`);
    const n = parseInt(p, 10);
    if (n < 0 || n > 255) throw new Error(`Octet out of range: ${n}`);
    result = result * 256 + n;
  }
  return result >>> 0;
}

function ipv4ToString(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

function ipv4ToBinary(n: number): string {
  const bits = (n >>> 0).toString(2).padStart(32, '0');
  return [bits.slice(0, 8), bits.slice(8, 16), bits.slice(16, 24), bits.slice(24, 32)].join('.');
}

function ipv4ToHex(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

interface CidrInfo {
  prefix: number;
  network: number;
  broadcast: number;
  mask: number;
  wildcard: number;
  firstHost: number;
  lastHost: number;
  totalIps: number;
  usableHosts: number;
  isPrivate: boolean;
  privateLabel?: string;
  cls: string;
}

function classifyIPv4(ip: number): string {
  const first = (ip >>> 24) & 0xff;
  if (first < 128) return 'A';
  if (first < 192) return 'B';
  if (first < 224) return 'C';
  if (first < 240) return 'D (multicast)';
  return 'E (reserved)';
}

function privateRange(ip: number): { isPrivate: boolean; label?: string } {
  if ((ip & 0xff000000) >>> 0 === 0x0a000000) return { isPrivate: true, label: 'RFC 1918 (10.0.0.0/8)' };
  if ((ip & 0xfff00000) >>> 0 === 0xac100000) return { isPrivate: true, label: 'RFC 1918 (172.16.0.0/12)' };
  if ((ip & 0xffff0000) >>> 0 === 0xc0a80000) return { isPrivate: true, label: 'RFC 1918 (192.168.0.0/16)' };
  if ((ip & 0xffc00000) >>> 0 === 0x64400000) return { isPrivate: true, label: 'RFC 6598 (CGNAT)' };
  if ((ip & 0xffff0000) >>> 0 === 0xa9fe0000) return { isPrivate: true, label: 'Link-local (169.254.0.0/16)' };
  if ((ip & 0xff000000) >>> 0 === 0x7f000000) return { isPrivate: true, label: 'Loopback (127.0.0.0/8)' };
  return { isPrivate: false };
}

function calcCIDR(input: string): CidrInfo {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Empty input');
  const m = trimmed.match(/^([\d.]+)(?:\/(\d+))?$/);
  if (!m) throw new Error('Invalid format (expected like 10.0.0.0/24)');
  const ip = parseIPv4(m[1]);
  const prefix = m[2] !== undefined ? parseInt(m[2], 10) : 32;
  if (prefix < 0 || prefix > 32) throw new Error(`Prefix out of range: ${prefix} (must be 0–32)`);

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalIps = prefix === 32 ? 1 : 2 ** (32 - prefix);

  let firstHost: number, lastHost: number, usableHosts: number;
  if (prefix === 32) {
    firstHost = network;
    lastHost = network;
    usableHosts = 1;
  } else if (prefix === 31) {
    // RFC 3021: /31 has 2 usable hosts (point-to-point links)
    firstHost = network;
    lastHost = broadcast;
    usableHosts = 2;
  } else {
    firstHost = network + 1;
    lastHost = broadcast - 1;
    usableHosts = totalIps - 2;
  }

  const { isPrivate, label } = privateRange(network);

  return {
    prefix,
    network,
    broadcast,
    mask,
    wildcard,
    firstHost,
    lastHost,
    totalIps,
    usableHosts,
    isPrivate,
    privateLabel: label,
    cls: classifyIPv4(network),
  };
}

function listSubnets(
  network: number,
  parentPrefix: number,
  childPrefix: number,
  limit = 64
): { subnets: string[]; total: number } {
  if (childPrefix < parentPrefix) throw new Error('Child prefix must be ≥ parent');
  if (childPrefix > 32) throw new Error('Child prefix must be ≤ 32');
  const totalCount = 2 ** (childPrefix - parentPrefix);
  const subnetSize = 2 ** (32 - childPrefix);
  const subnets: string[] = [];
  const count = Math.min(totalCount, limit);
  for (let i = 0; i < count; i++) {
    const subnet = (network + i * subnetSize) >>> 0;
    subnets.push(`${ipv4ToString(subnet)}/${childPrefix}`);
  }
  return { subnets, total: totalCount };
}

const PRESETS = [
  '10.0.0.0/16',
  '192.168.1.0/24',
  '172.16.0.0/12',
  '10.244.0.0/16',
  '10.96.0.0/12',
];

export default function CidrTool() {
  const [input, setInput] = useState('10.0.0.0/16');
  const [splitPrefix, setSplitPrefix] = useState<number | null>(null);

  const result = useMemo(() => {
    if (!input.trim()) return { type: 'empty' as const };
    try {
      return { type: 'success' as const, info: calcCIDR(input) };
    } catch (err: any) {
      return { type: 'error' as const, message: err.message || 'Invalid CIDR' };
    }
  }, [input]);

  const subnetsResult = useMemo(() => {
    if (result.type !== 'success' || splitPrefix === null) return null;
    try {
      return listSubnets(result.info.network, result.info.prefix, splitPrefix);
    } catch (err: any) {
      return { error: err.message } as const;
    }
  }, [result, splitPrefix]);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const splitOptions =
    result.type === 'success'
      ? [...new Set([
          Math.min(result.info.prefix + 1, 32),
          Math.min(result.info.prefix + 4, 32),
          Math.min(result.info.prefix + 8, 32),
          24,
          28,
        ])].filter((p) => p > result.info.prefix && p <= 32).sort((a, b) => a - b)
      : [];

  const formatRows =
    result.type === 'success'
      ? (() => {
          const i = result.info;
          return [
            { label: 'Network address', value: `${ipv4ToString(i.network)}/${i.prefix}` },
            { label: 'Broadcast address', value: ipv4ToString(i.broadcast) },
            { label: 'First usable host', value: ipv4ToString(i.firstHost) },
            { label: 'Last usable host', value: ipv4ToString(i.lastHost) },
            { label: 'Subnet mask', value: `${ipv4ToString(i.mask)} (/${i.prefix})` },
            { label: 'Wildcard mask', value: ipv4ToString(i.wildcard) },
            { label: 'Total IPs', value: i.totalIps.toLocaleString() },
            { label: 'Usable hosts', value: i.usableHosts.toLocaleString() },
            { label: 'Network (binary)', value: ipv4ToBinary(i.network) },
            { label: 'Network (hex)', value: ipv4ToHex(i.network) },
            { label: 'Class', value: i.cls },
            {
              label: 'Type',
              value: i.isPrivate ? `Private — ${i.privateLabel}` : 'Public',
            },
          ];
        })()
      : [];

  return (
    <div className="space-y-4">
      {/* Input row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="10.0.0.0/16"
          className="font-mono flex-1 min-w-[200px]"
          spellCheck={false}
        />
        <Button
          onClick={() => setInput('')}
          size="sm"
          variant="destructive"
          className="gap-2"
          disabled={!input}
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-[10px] text-muted-foreground mr-1">PRESETS:</span>
        {PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant="ghost"
            onClick={() => setInput(p)}
            className="h-6 px-2 text-xs font-mono"
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Error banner */}
      {result.type === 'error' && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{result.message}</p>
        </div>
      )}

      {/* Results */}
      {result.type === 'success' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Network Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-1">
                  {formatRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
                    >
                      <div className="w-32 sm:w-40 flex-shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">
                          {row.label}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <code className="font-mono text-sm break-all">{row.value}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 flex-shrink-0"
                        onClick={() => copy(row.value, row.label)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Subnet Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-3">
                <label className="text-xs font-medium text-muted-foreground">
                  Split <code className="font-mono">/{result.info.prefix}</code> into smaller
                  subnets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {splitOptions.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={splitPrefix === p ? 'default' : 'outline'}
                      onClick={() => setSplitPrefix(p === splitPrefix ? null : p)}
                      className="h-7 px-2 text-xs font-mono"
                    >
                      /{p}
                    </Button>
                  ))}
                  {splitPrefix !== null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSplitPrefix(null)}
                      className="h-7 px-2 text-xs"
                    >
                      Hide
                    </Button>
                  )}
                </div>
              </div>
              {subnetsResult ? (
                'error' in subnetsResult ? (
                  <div className="text-sm text-destructive">{subnetsResult.error}</div>
                ) : (
                  <ScrollArea className="h-[300px] pr-3">
                    <div className="mb-2 text-xs text-muted-foreground">
                      {subnetsResult.total > subnetsResult.subnets.length ? (
                        <>
                          Showing first {subnetsResult.subnets.length} of{' '}
                          {subnetsResult.total.toLocaleString()} subnets
                        </>
                      ) : (
                        <>
                          Total: {subnetsResult.total.toLocaleString()} subnet
                          {subnetsResult.total === 1 ? '' : 's'}
                        </>
                      )}
                    </div>
                    <div className="space-y-1">
                      {subnetsResult.subnets.map((s, i) => (
                        <div
                          key={i}
                          className="font-mono text-xs p-1.5 rounded hover:bg-muted/50 flex items-center justify-between"
                        >
                          <span>{s}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5"
                            onClick={() => copy(s, 'Subnet')}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Pick a smaller prefix above to see subnets
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {result.type === 'empty' && (
        <Card>
          <CardContent className="pt-6">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p className="text-sm">
                Enter a CIDR like <code className="font-mono">10.0.0.0/16</code> to begin
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}