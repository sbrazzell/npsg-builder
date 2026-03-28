import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Settings, Sparkles } from 'lucide-react'

export default function SettingsPage() {
  const narrativeProvider = process.env.NARRATIVE_PROVIDER || 'template'

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Configure NSGP Builder application settings."
      />

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
                <Badge variant="outline" className="text-xs">openai</Badge>
                <span>OpenAI GPT (requires OPENAI_API_KEY in .env)</span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">anthropic</Badge>
                <span>Anthropic Claude (requires ANTHROPIC_API_KEY in .env)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            To change the narrative provider, edit <code className="font-mono">.env</code> and set{' '}
            <code className="font-mono">NARRATIVE_PROVIDER=openai</code> or{' '}
            <code className="font-mono">NARRATIVE_PROVIDER=anthropic</code>, then restart the server.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Database
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Type</span>
            <Badge variant="secondary">SQLite (local)</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Location</span>
            <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">prisma/dev.db</code>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            All data is stored locally on this machine. No data is sent to external servers.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
