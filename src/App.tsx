import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileJson,
  FileCode,
  GitCompare,
  Binary,
  Clock,
  Key,
  ShieldCheck,
  Regex,
  Lock,
  Network,
} from 'lucide-react';

import YamlValidator from '@/tools/YamlValidator';
import JsonValidator from '@/tools/JsonValidator';
import K8sSecretTool from '@/tools/K8sSecretTool';
import DiffTool from '@/tools/DiffTool';
import Base64Tool from '@/tools/Base64Tool';
import CronTool from '@/tools/CronTool';
import CidrTool from '@/tools/CidrTool';
import PgpTool from '@/tools/PgpTool';
import JwtTool from '@/tools/JwtTool';
import RegexTool from '@/tools/RegexTool';
import ThemeToggle from '@/components/ThemeToggle';

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 py-3 sm:px-4 sm:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-primary rounded-lg shrink-0">
                <FileCode className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold leading-tight">DevTools Hub</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block leading-snug">
                  YAML • JSON • K8s • Diff • Base64 • Cron • CIDR • PGP • JWT • Regex
                </p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  10 developer utilities
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
        <Tabs defaultValue="yaml" className="w-full">
          <TabsList className="grid w-full max-w-6xl grid-cols-5 lg:grid-cols-10 h-auto mb-4 sm:mb-8">
            <TabsTrigger value="yaml" className="gap-2">
              <FileCode className="w-4 h-4" />
              YAML
            </TabsTrigger>
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="w-4 h-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="k8s" className="gap-2">
              <Lock className="w-4 h-4" />
              K8s
            </TabsTrigger>
            <TabsTrigger value="diff" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Diff
            </TabsTrigger>
            <TabsTrigger value="base64" className="gap-2">
              <Binary className="w-4 h-4" />
              Base64
            </TabsTrigger>
            <TabsTrigger value="cron" className="gap-2">
              <Clock className="w-4 h-4" />
              Cron
            </TabsTrigger>
            <TabsTrigger value="cidr" className="gap-2">
              <Network className="w-4 h-4" />
              CIDR
            </TabsTrigger>
            <TabsTrigger value="pgp" className="gap-2">
              <Key className="w-4 h-4" />
              PGP
            </TabsTrigger>
            <TabsTrigger value="jwt" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              JWT
            </TabsTrigger>
            <TabsTrigger value="regex" className="gap-2">
              <Regex className="w-4 h-4" />
              Regex
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
                  Validate, format, and convert YAML to JSON. Supports complex YAML
                  structures with proper error reporting.
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
                  Validate, format, minify, and convert JSON to YAML. Get detailed
                  error messages and statistics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JsonValidator />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="k8s">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Kubernetes Secret / ConfigMap
                </CardTitle>
                <CardDescription>
                  Decode <code className="font-mono text-xs">data:</code> Base64 values from a
                  Secret or ConfigMap manifest in one go, or generate a manifest from{' '}
                  <code className="font-mono text-xs">key=value</code> pairs. Supports{' '}
                  <code className="font-mono text-xs">stringData</code>, multi-document YAML,
                  and detects binary values automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <K8sSecretTool />
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
                  Compare two pieces of text and see the differences. Compare by
                  lines, words, or characters with color-coded results.
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
                  Encode text to Base64 or decode Base64 back to text. Supports
                  UTF-8 (emoji & non-ASCII) and URL-safe encoding.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Base64Tool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cron">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Cron Expression Helper
                </CardTitle>
                <CardDescription>
                  Decode cron expressions into plain English, see the next
                  execution times, and break down each field. Supports{' '}
                  <code className="font-mono text-xs">@daily</code>,{' '}
                  <code className="font-mono text-xs">@hourly</code>, named
                  months (<code className="font-mono text-xs">JAN</code>) and
                  weekdays (<code className="font-mono text-xs">MON</code>).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CronTool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cidr">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  CIDR Calculator
                </CardTitle>
                <CardDescription>
                  Calculate network details for IPv4 CIDR notation: network and broadcast
                  addresses, masks, host counts, binary/hex representation, and detection of
                  RFC 1918 private ranges, CGNAT, link-local, and loopback. Plus subnet split
                  into smaller blocks.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CidrTool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pgp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  PGP Key Pair Generator
                </CardTitle>
                <CardDescription>
                  Generate an OpenPGP key pair entirely in your browser. Keys are
                  produced locally — nothing is sent to any server. Powered by{' '}
                  <code className="font-mono text-xs">openpgp.js</code>{' '}
                  (lazy-loaded on first generation to keep the app lightweight).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PgpTool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jwt">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  JWT Decoder
                </CardTitle>
                <CardDescription>
                  Decode a JSON Web Token into its header, payload, and signature. Annotates
                  standard claims (<code className="font-mono text-xs">iss</code>,{' '}
                  <code className="font-mono text-xs">sub</code>,{' '}
                  <code className="font-mono text-xs">exp</code>, etc.) and warns if the token
                  is expired or uses <code className="font-mono text-xs">alg: none</code>. This
                  tool decodes only — it does not verify signatures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JwtTool />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regex">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Regex className="w-5 h-5" />
                  Regex Tester
                </CardTitle>
                <CardDescription>
                  Test JavaScript-flavor regular expressions against a string. Toggle flags,
                  pick from common presets (email, URL, IPv4, …), and inspect each match with
                  its index, capture groups, and named groups. Matches are highlighted in the
                  preview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RegexTool />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t mt-8 sm:mt-16">
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            DevTools Hub - Free online developer utilities
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;