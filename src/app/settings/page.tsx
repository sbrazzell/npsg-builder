import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Settings, Sparkles, Users, Database, Info } from 'lucide-react'

export default function SettingsPage() {
  const narrativeProvider = process.env.NARRATIVE_PROVIDER || 'template'
  const analyzerProvider = process.env.ANALYZER_PROVIDER || 'rules'
  const allowedEmails = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Configure NSGP Builder application settings."
      />

      {/* Team Access */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 border p-4 text-sm space-y-3">
            <p className="font-medium text-gray-800">How to add team members</p>
            <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
              <li>Open the <code className="font-mono text-xs bg-white border px-1 py-0.5 rounded">.env</code> file in the project root</li>
              <li>
                Find <code className="font-mono text-xs bg-white border px-1 py-0.5 rounded">ALLOWED_EMAILS</code> and add each team member&apos;s Google account email, separated by commas:
                <pre className="mt-1.5 text-xs bg-white border rounded p-2 overflow-x-auto">
{`ALLOWED_EMAILS="you@example.com,colleague@example.com,analyst@example.com"`}
                </pre>
              </li>
              <li>Restart the server for the change to take effect</li>
              <li>Team members sign in at <code className="font-mono text-xs bg-white border px-1 py-0.5 rounded">/login</code> using their Google account</li>
            </ol>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                If <code className="font-mono">ALLOWED_EMAILS</code> is empty or not set, <strong>any</strong> Google account can sign in.
                Set it before sharing the URL with your team.
              </span>
            </div>
          </div>

          {allowedEmails.length > 0 ? (
            <div>
              <p className="text-sm font-medium mb-2">Currently authorized accounts</p>
              <div className="flex flex-wrap gap-2">
                {allowedEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="font-mono text-xs">{email}</Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                <strong>No email allowlist set.</strong> Any Google account can currently sign in.
                Add <code className="font-mono">ALLOWED_EMAILS</code> to your <code className="font-mono">.env</code> to restrict access.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Narrative Provider */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Narrative Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Provider</p>
              <p className="text-xs text-muted-foreground">Controls how narrative drafts are generated</p>
            </div>
            <Badge variant="secondary" className="capitalize">{narrativeProvider}</Badge>
          </div>

          <div className="rounded-lg bg-slate-50 border p-4 text-sm space-y-2">
            <p className="font-medium">Available Providers</p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">template</Badge>
                <span>Template-based generation (default, no API key needed)</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">anthropic</Badge>
                <span>Anthropic Claude (requires ANTHROPIC_API_KEY in .env) — <strong>recommended</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">openai</Badge>
                <span>OpenAI GPT (requires OPENAI_API_KEY in .env)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            To change: edit <code className="font-mono">.env</code> and set{' '}
            <code className="font-mono">NARRATIVE_PROVIDER=anthropic</code>, then restart the server.
          </div>
        </CardContent>
      </Card>

      {/* Analyzer Provider */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Grant Analyzer Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Provider</p>
              <p className="text-xs text-muted-foreground">Controls how grant strength analysis is run</p>
            </div>
            <Badge variant="secondary" className="capitalize">{analyzerProvider}</Badge>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            To change: edit <code className="font-mono">.env</code> and set{' '}
            <code className="font-mono">ANALYZER_PROVIDER=anthropic</code>, then restart the server.
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary">Turso / libSQL</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Local fallback</span>
            <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">prisma/dev.db</code>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Production data is stored in Turso. The local SQLite file is used for development and migration generation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
