export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Settings, Sparkles, Database } from 'lucide-react'
import { TeamAccessPanel } from './team-access-panel'

export default async function SettingsPage() {
  const narrativeProvider = process.env.NARRATIVE_PROVIDER || 'template'
  const analyzerProvider  = process.env.ANALYZER_PROVIDER  || 'rules'

  const session = await getServerSession(authOptions)
  const currentEmail = session?.user?.email?.toLowerCase() ?? ''

  // Load all allowed users + determine current user's role
  const users = await prisma.allowedUser.findMany({
    orderBy: [{ role: 'asc' }, { addedAt: 'asc' }],
  })
  const currentUserRole = users.find(u => u.email === currentEmail)?.role ?? 'member'
  const isAdmin = currentUserRole === 'admin'

  return (
    <div className="p-8 max-w-2xl">
      <PageHeader
        title="Settings"
        description="Configure NSGP Builder application settings."
      />

      {/* Team Access — live DB-backed */}
      <TeamAccessPanel
        users={users}
        currentEmail={currentEmail}
        isAdmin={isAdmin}
      />

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
                <span>Anthropic Claude (requires ANTHROPIC_API_KEY) — <strong>recommended</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">openai</Badge>
                <span>OpenAI GPT (requires OPENAI_API_KEY)</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            To change: set <code className="font-mono">NARRATIVE_PROVIDER=anthropic</code> in Vercel environment variables.
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
            To change: set <code className="font-mono">ANALYZER_PROVIDER=anthropic</code> in Vercel environment variables.
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
            <span className="text-muted-foreground">Encryption</span>
            <Badge variant="secondary" className={process.env.FIELD_ENCRYPTION_KEY ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
              {process.env.FIELD_ENCRYPTION_KEY ? 'AES-256-GCM active' : 'Not configured'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Local fallback</span>
            <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">prisma/dev.db</code>
          </div>
          {!process.env.FIELD_ENCRYPTION_KEY && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mt-2">
              <strong>Field encryption is not active.</strong> Sensitive fields (EIN, law enforcement findings,
              threat notes, application snapshots) are stored in plaintext. Add{' '}
              <code className="font-mono">FIELD_ENCRYPTION_KEY</code> to your Vercel environment variables to enable it.
              Generate a key with: <code className="font-mono">openssl rand -hex 32</code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
