import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import * as yaml from 'js-yaml';

// ─── Types ────────────────────────────────────────────────────────────────
type PullPolicy = 'IfNotPresent' | 'Always' | 'Never';
type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer';
type PathType = 'Prefix' | 'Exact' | 'ImplementationSpecific';

interface ChartConfig {
  name: string;
  description: string;
  appVersion: string;
  // image
  imageRepo: string;
  imageTag: string;
  pullPolicy: PullPolicy;
  containerPort: number;
  // deployment
  replicas: number;
  reqCpu: string;
  reqMem: string;
  limCpu: string;
  limMem: string;
  envText: string; // KEY=VALUE per line
  // service
  serviceEnabled: boolean;
  serviceType: ServiceType;
  servicePort: number;
  // ingress
  ingressEnabled: boolean;
  ingressClass: string;
  ingressHost: string;
  ingressPath: string;
  ingressPathType: PathType;
  ingressTlsEnabled: boolean;
  ingressTlsSecret: string;
}

const DEFAULT_CONFIG: ChartConfig = {
  name: 'myapp',
  description: '',
  appVersion: '1.0.0',
  imageRepo: 'nginx',
  imageTag: '1.25',
  pullPolicy: 'IfNotPresent',
  containerPort: 80,
  replicas: 1,
  reqCpu: '100m',
  reqMem: '128Mi',
  limCpu: '500m',
  limMem: '512Mi',
  envText: '',
  serviceEnabled: true,
  serviceType: 'ClusterIP',
  servicePort: 80,
  ingressEnabled: false,
  ingressClass: 'nginx',
  ingressHost: 'myapp.example.com',
  ingressPath: '/',
  ingressPathType: 'Prefix',
  ingressTlsEnabled: false,
  ingressTlsSecret: 'myapp-tls',
};

// ─── Helpers ──────────────────────────────────────────────────────────────
function parseEnvVars(text: string): Array<{ name: string; value: string }> {
  const result: Array<{ name: string; value: string }> = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (name) result.push({ name, value });
  }
  return result;
}

function validateName(name: string): string | null {
  if (!name) return 'Chart name is required';
  if (name.length > 53) return 'Chart name must be ≤ 53 characters';
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
    return 'Chart name must be lowercase alphanumeric or hyphens (DNS-1123)';
  }
  return null;
}

// ─── Template Generators ──────────────────────────────────────────────────
function genChartYaml(c: ChartConfig): string {
  const desc = c.description.trim() || `A Helm chart for ${c.name}`;
  return `apiVersion: v2
name: ${c.name}
description: ${desc}
type: application
version: 0.1.0
appVersion: ${JSON.stringify(c.appVersion)}
`;
}

function genValuesYaml(c: ChartConfig): string {
  const env = parseEnvVars(c.envText);
  const values: any = {
    replicaCount: c.replicas,
    image: {
      repository: c.imageRepo,
      tag: c.imageTag,
      pullPolicy: c.pullPolicy,
    },
    containerPort: c.containerPort,
    resources: {
      requests: { cpu: c.reqCpu, memory: c.reqMem },
      limits: { cpu: c.limCpu, memory: c.limMem },
    },
    env,
    service: {
      enabled: c.serviceEnabled,
      type: c.serviceType,
      port: c.servicePort,
    },
    ingress: {
      enabled: c.ingressEnabled,
      className: c.ingressClass,
      host: c.ingressHost,
      path: c.ingressPath,
      pathType: c.ingressPathType,
      tls: {
        enabled: c.ingressTlsEnabled,
        secretName: c.ingressTlsSecret,
      },
    },
  };
  return yaml.dump(values, { indent: 2, lineWidth: -1, noRefs: true });
}

function genHelpers(c: ChartConfig): string {
  const n = c.name;
  return `{{/*
Expand the name of the chart.
*/}}
{{- define "${n}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
Truncated at 63 chars because some Kubernetes name fields are limited to this.
*/}}
{{- define "${n}.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "${n}.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "${n}.labels" -}}
helm.sh/chart: {{ include "${n}.chart" . }}
{{ include "${n}.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "${n}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${n}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
`;
}

function genDeployment(c: ChartConfig): string {
  const n = c.name;
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${n}.fullname" . }}
  labels:
    {{- include "${n}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${n}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${n}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.containerPort }}
              protocol: TCP
          {{- with .Values.env }}
          env:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            tcpSocket:
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            tcpSocket:
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
`;
}

function genService(c: ChartConfig): string {
  const n = c.name;
  return `{{- if .Values.service.enabled -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "${n}.fullname" . }}
  labels:
    {{- include "${n}.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "${n}.selectorLabels" . | nindent 4 }}
{{- end }}
`;
}

function genIngress(c: ChartConfig): string {
  const n = c.name;
  return `{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "${n}.fullname" . }}
  labels:
    {{- include "${n}.labels" . | nindent 4 }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls.enabled }}
  tls:
    - hosts:
        - {{ .Values.ingress.host | quote }}
      secretName: {{ .Values.ingress.tls.secretName }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.host | quote }}
      http:
        paths:
          - path: {{ .Values.ingress.path }}
            pathType: {{ .Values.ingress.pathType }}
            backend:
              service:
                name: {{ include "${n}.fullname" . }}
                port:
                  number: {{ .Values.service.port }}
{{- end }}
`;
}

function genNotes(c: ChartConfig): string {
  const n = c.name;
  return `1. Get the application URL by running:
{{- if .Values.ingress.enabled }}
{{- range $host := list .Values.ingress.host }}
  http{{ if $.Values.ingress.tls.enabled }}s{{ end }}://{{ $host }}{{ $.Values.ingress.path }}
{{- end }}
{{- else if contains "NodePort" .Values.service.type }}
  export NODE_PORT=$(kubectl get --namespace {{ .Release.Namespace }} -o jsonpath="{.spec.ports[0].nodePort}" services {{ include "${n}.fullname" . }})
  export NODE_IP=$(kubectl get nodes --namespace {{ .Release.Namespace }} -o jsonpath="{.items[0].status.addresses[0].address}")
  echo http://$NODE_IP:$NODE_PORT
{{- else if contains "LoadBalancer" .Values.service.type }}
     NOTE: It may take a few minutes for the LoadBalancer IP to be available.
           Watch its status by running 'kubectl get --namespace {{ .Release.Namespace }} svc -w {{ include "${n}.fullname" . }}'
  export SERVICE_IP=$(kubectl get svc --namespace {{ .Release.Namespace }} {{ include "${n}.fullname" . }} --template "{{ "{{ range (index .status.loadBalancer.ingress 0) }}{{.}}{{ end }}" }}")
  echo http://$SERVICE_IP:{{ .Values.service.port }}
{{- else }}
  export POD_NAME=$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app.kubernetes.io/name={{ include "${n}.name" . }},app.kubernetes.io/instance={{ .Release.Name }}" -o jsonpath="{.items[0].metadata.name}")
  echo "Visit http://127.0.0.1:8080 to use your application"
  kubectl --namespace {{ .Release.Namespace }} port-forward $POD_NAME 8080:{{ .Values.containerPort }}
{{- end }}
`;
}

const HELMIGNORE = `# Patterns to ignore when building Helm packages.
.DS_Store
.git/
.gitignore
.bzr/
.bzrignore
.hg/
.hgignore
.svn/
*.swp
*.bak
*.tmp
*.orig
*~
.project
.idea/
*.tmproj
.vscode/
`;

interface ChartFile {
  path: string;
  content: string;
}

function generateChart(c: ChartConfig): ChartFile[] {
  const files: ChartFile[] = [
    { path: `${c.name}/Chart.yaml`, content: genChartYaml(c) },
    { path: `${c.name}/values.yaml`, content: genValuesYaml(c) },
    { path: `${c.name}/.helmignore`, content: HELMIGNORE },
    { path: `${c.name}/templates/_helpers.tpl`, content: genHelpers(c) },
    { path: `${c.name}/templates/deployment.yaml`, content: genDeployment(c) },
  ];
  if (c.serviceEnabled) {
    files.push({
      path: `${c.name}/templates/service.yaml`,
      content: genService(c),
    });
  }
  if (c.ingressEnabled) {
    files.push({
      path: `${c.name}/templates/ingress.yaml`,
      content: genIngress(c),
    });
  }
  files.push({
    path: `${c.name}/templates/NOTES.txt`,
    content: genNotes(c),
  });
  return files;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function HelmChartTool() {
  const [c, setC] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const set = <K extends keyof ChartConfig>(key: K, value: ChartConfig[K]) =>
    setC((prev) => ({ ...prev, [key]: value }));

  const nameError = validateName(c.name);

  const files = useMemo(() => {
    if (nameError) return [];
    try {
      return generateChart(c);
    } catch {
      return [];
    }
  }, [c, nameError]);

  // Clamp selected index when file list changes
  const safeIdx = files.length > 0 ? Math.min(selectedIdx, files.length - 1) : 0;
  const selectedFile = files[safeIdx];

  const copy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const downloadZip = async () => {
    if (!files.length) return;
    setIsDownloading(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      for (const f of files) {
        zip.file(f.path, f.content);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${c.name}-chart.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${c.name}-chart.zip`);
    } catch (err: any) {
      toast.error(
        'ZIP download failed: ' +
          (err?.message || 'jszip not installed. Run: npm i jszip')
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const pullPolicies: PullPolicy[] = ['IfNotPresent', 'Always', 'Never'];
  const serviceTypes: ServiceType[] = ['ClusterIP', 'NodePort', 'LoadBalancer'];
  const pathTypes: PathType[] = ['Prefix', 'Exact', 'ImplementationSpecific'];

  return (
    <div className="space-y-4">
      {/* ─── Form ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Chart Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Chart name <span className="text-destructive">*</span>
              </label>
              <Input
                value={c.name}
                onChange={(e) => set('name', e.target.value.toLowerCase())}
                placeholder="myapp"
                className={nameError ? 'border-destructive' : ''}
              />
              {nameError && (
                <p className="text-xs text-destructive mt-1">{nameError}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Description
              </label>
              <Input
                value={c.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder={`A Helm chart for ${c.name || 'myapp'}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                App version
              </label>
              <Input
                value={c.appVersion}
                onChange={(e) => set('appVersion', e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Image */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Container Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Repository
                </label>
                <Input
                  value={c.imageRepo}
                  onChange={(e) => set('imageRepo', e.target.value)}
                  placeholder="nginx"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Tag
                </label>
                <Input
                  value={c.imageTag}
                  onChange={(e) => set('imageTag', e.target.value)}
                  placeholder="1.25"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Pull policy
              </label>
              <div className="flex gap-1">
                {pullPolicies.map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={c.pullPolicy === p ? 'default' : 'outline'}
                    onClick={() => set('pullPolicy', p)}
                    className="flex-1 h-8 text-xs"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Container port
              </label>
              <Input
                type="number"
                value={c.containerPort}
                onChange={(e) =>
                  set('containerPort', parseInt(e.target.value) || 80)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Deployment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Deployment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Replicas
              </label>
              <Input
                type="number"
                min={0}
                value={c.replicas}
                onChange={(e) => set('replicas', parseInt(e.target.value) || 1)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Resources
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={c.reqCpu}
                  onChange={(e) => set('reqCpu', e.target.value)}
                  placeholder="Req CPU (100m)"
                />
                <Input
                  value={c.reqMem}
                  onChange={(e) => set('reqMem', e.target.value)}
                  placeholder="Req Mem (128Mi)"
                />
                <Input
                  value={c.limCpu}
                  onChange={(e) => set('limCpu', e.target.value)}
                  placeholder="Lim CPU (500m)"
                />
                <Input
                  value={c.limMem}
                  onChange={(e) => set('limMem', e.target.value)}
                  placeholder="Lim Mem (512Mi)"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Env vars <span className="text-muted-foreground/70">(KEY=value per line)</span>
              </label>
              <Textarea
                value={c.envText}
                onChange={(e) => set('envText', e.target.value)}
                placeholder={'LOG_LEVEL=info\nDATABASE_HOST=db.svc'}
                className="font-mono text-xs min-h-[80px] resize-none"
                spellCheck={false}
              />
            </div>
          </CardContent>
        </Card>

        {/* Service */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Service</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={c.serviceEnabled}
                  onChange={(e) => set('serviceEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Enable
              </label>
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`space-y-3 transition-opacity ${c.serviceEnabled ? '' : 'opacity-40 pointer-events-none'}`}
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Type
              </label>
              <div className="flex gap-1">
                {serviceTypes.map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={c.serviceType === t ? 'default' : 'outline'}
                    onClick={() => set('serviceType', t)}
                    className="flex-1 h-8 text-xs"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Service port
              </label>
              <Input
                type="number"
                value={c.servicePort}
                onChange={(e) =>
                  set('servicePort', parseInt(e.target.value) || 80)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Ingress */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Ingress</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={c.ingressEnabled}
                  onChange={(e) => set('ingressEnabled', e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Enable
              </label>
            </CardTitle>
          </CardHeader>
          <CardContent
            className={`transition-opacity ${c.ingressEnabled ? '' : 'opacity-40 pointer-events-none'}`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Class name
                </label>
                <Input
                  value={c.ingressClass}
                  onChange={(e) => set('ingressClass', e.target.value)}
                  placeholder="nginx"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Host
                </label>
                <Input
                  value={c.ingressHost}
                  onChange={(e) => set('ingressHost', e.target.value)}
                  placeholder="myapp.example.com"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Path
                </label>
                <Input
                  value={c.ingressPath}
                  onChange={(e) => set('ingressPath', e.target.value)}
                  placeholder="/"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Path type
                </label>
                <div className="flex gap-1">
                  {pathTypes.map((t) => (
                    <Button
                      key={t}
                      size="sm"
                      variant={c.ingressPathType === t ? 'default' : 'outline'}
                      onClick={() => set('ingressPathType', t)}
                      className="flex-1 h-8 text-[10px]"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 pt-2 border-t">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none mb-2">
                  <input
                    type="checkbox"
                    checked={c.ingressTlsEnabled}
                    onChange={(e) => set('ingressTlsEnabled', e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Enable TLS (HTTPS)
                </label>
                {c.ingressTlsEnabled && (
                  <Input
                    value={c.ingressTlsSecret}
                    onChange={(e) => set('ingressTlsSecret', e.target.value)}
                    placeholder="TLS secret name (e.g., myapp-tls)"
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Output ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              <span>Generated Helm Chart</span>
              <Badge variant="outline" className="font-normal">
                {files.length} files
              </Badge>
            </div>
            <Button
              size="sm"
              onClick={downloadZip}
              disabled={!files.length || isDownloading}
              className="gap-2"
            >
              {isDownloading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Building ZIP...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download chart.zip
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!files.length ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
              <p className="text-sm">
                {nameError ? 'Fix the form errors to generate chart' : 'No files generated'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
              {/* File list */}
              <div className="space-y-0.5 max-h-[500px] overflow-y-auto pr-1 border-b md:border-b-0 md:border-r pb-3 md:pb-0 md:pr-3">
                {files.map((f, i) => (
                  <button
                    key={f.path}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono break-all transition-colors ${
                      i === safeIdx
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {f.path.replace(`${c.name}/`, '')}
                  </button>
                ))}
              </div>

              {/* Selected file content */}
              <div className="min-w-0">
                {selectedFile && (
                  <>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <code className="text-xs text-muted-foreground font-mono truncate">
                        {selectedFile.path}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          copy(selectedFile.content, selectedFile.path)
                        }
                        className="h-7 px-2 gap-1.5 shrink-0"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="text-xs">Copy</span>
                      </Button>
                    </div>
                    <Textarea
                      value={selectedFile.content}
                      readOnly
                      className="font-mono text-[11px] min-h-[460px] resize-none bg-muted/50"
                      spellCheck={false}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}