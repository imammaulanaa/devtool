import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileJson,
  FileCode,
  GitCompare,
  Binary,
  Link,
  Clock,
  Key,
  ShieldCheck,
  CalendarClock,
  Regex,
} from 'lucide-react';

import YamlValidator from '@/tools/YamlValidator';
import JsonValidator from '@/tools/JsonValidator';
import DiffTool from '@/tools/DiffTool';
import Base64Tool from '@/tools/Base64Tool';
import UrlTool from '@/tools/UrlTool';
import CronTool from '@/tools/CronTool';
import TimestampTool from '@/tools/TimestampTool';
import PgpTool from '@/tools/PgpTool';
import JwtTool from '@/tools/JwtTool';
import RegexTool from '@/tools/RegexTool';
import ThemeToggle from '@/components/ui/ThemeToggle';

function App() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <FileCode className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">DevTools Hub</h1>
                <p className="text-sm text-muted-foreground">
                  YAML • JSON • Diff • Base64 • URL • Cron • Time • PGP • JWT • Regex
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="yaml" className="w-full">
          <TabsList className="grid w-full max-w-6xl grid-cols-5 lg:grid-cols-10 h-auto mb-8">
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
            <TabsTrigger value="cron" className="gap-2">
              <Clock className="w-4 h-4" />
              Cron
            </TabsTrigger>
            <TabsTrigger value="timestamp" className="gap-2">
              <CalendarClock className="w-4 h-4" />
              Time
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

          <TabsContent value="url">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  URL Encoder / Decoder
                </CardTitle>
                <CardDescription>
                  Encode text for safe use in URLs, or decode percent-encoded URLs
                  back to readable text. Supports component mode (default) and
                  full URL mode.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UrlTool />
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

          <TabsContent value="timestamp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="w-5 h-5" />
                  Timestamp Converter
                </CardTitle>
                <CardDescription>
                  Convert between Unix epoch (seconds, milliseconds, micro-, nano-) and human
                  date formats. Auto-detects the input format and shows ISO 8601, UTC, local
                  time, and relative time side-by-side.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimestampTool />
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
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-muted-foreground">
            DevTools Hub - Free online developer utilities
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;