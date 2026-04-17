export const dynamic = 'force-dynamic'

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateRiskScore, getRiskLevel, formatCurrency } from "@/lib/scoring";
import {
  Building2,
  MapPin,
  FileText,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Shield,
  Plus,
  ChevronRight,
} from "lucide-react";

async function getDashboardData() {
  const [orgCount, facilityCount, threats, projects] = await Promise.all([
    prisma.organization.count(),
    prisma.facility.count(),
    prisma.threatAssessment.findMany({
      select: { likelihood: true, impact: true },
    }),
    prisma.projectProposal.findMany({
      include: { budgetItems: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const highRiskThreats = threats.filter((t) => {
    const score = calculateRiskScore(t.likelihood, t.impact);
    const level = getRiskLevel(score);
    return level === "high" || level === "critical";
  }).length;

  const openProposals = projects.filter((p) => p.status !== "submitted").length;

  let totalBudget = 0
  for (const p of projects) {
    for (const b of p.budgetItems) { totalBudget += b.totalCost }
  }

  return { orgCount, facilityCount, highRiskThreats, openProposals, totalBudget, projects };
}

async function getRecentActivity() {
  const [facilities, threats, projects] = await Promise.all([
    prisma.facility.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      include: { organization: true },
    }),
    prisma.threatAssessment.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      include: { facility: true },
    }),
    prisma.projectProposal.findMany({
      take: 3,
      orderBy: { updatedAt: "desc" },
      include: { facility: true },
    }),
  ]);

  type ActivityItem = {
    type: string;
    label: string;
    sub: string;
    href: string;
    time: Date;
  };

  const activity: ActivityItem[] = [
    ...facilities.map((f) => ({
      type: "facility",
      label: f.facilityName,
      sub: f.organization.name,
      href: `/facilities/${f.id}`,
      time: f.updatedAt,
    })),
    ...threats.map((t) => ({
      type: "threat",
      label: t.threatType,
      sub: t.facility.facilityName,
      href: `/facilities/${t.facilityId}/threats`,
      time: t.updatedAt,
    })),
    ...projects.map((p) => ({
      type: "project",
      label: p.title,
      sub: p.facility.facilityName,
      href: `/facilities/${p.facilityId}/projects/${p.id}`,
      time: p.updatedAt,
    })),
  ];

  return activity.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 6);
}

export default async function DashboardPage() {
  const { orgCount, facilityCount, highRiskThreats, openProposals, totalBudget } =
    await getDashboardData();
  const recentActivity = await getRecentActivity();

  const stats = [
    {
      label: "Organizations",
      value: orgCount,
      icon: Building2,
      href: "/organizations",
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-50",
      accent: "border-indigo-100",
    },
    {
      label: "Facilities",
      value: facilityCount,
      icon: MapPin,
      href: "/facilities",
      iconColor: "text-violet-500",
      iconBg: "bg-violet-50",
      accent: "border-violet-100",
    },
    {
      label: "Open Proposals",
      value: openProposals,
      icon: FileText,
      href: "/facilities",
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
      accent: "border-amber-100",
    },
    {
      label: "Total Budget",
      value: formatCurrency(totalBudget),
      icon: DollarSign,
      href: "/facilities",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
      accent: "border-emerald-100",
    },
    {
      label: "High-Risk Threats",
      value: highRiskThreats,
      icon: AlertTriangle,
      href: "/facilities",
      iconColor: "text-red-500",
      iconBg: "bg-red-50",
      accent: "border-red-100",
    },
  ];

  const typeConfig: Record<string, { label: string; cls: string }> = {
    facility: { label: "Facility", cls: "bg-violet-50 text-violet-700 border-violet-200" },
    threat: { label: "Threat", cls: "bg-red-50 text-red-700 border-red-200" },
    project: { label: "Project", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Welcome hero */}
      <div
        className="rounded-2xl p-6 text-white mb-7 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, oklch(0.45 0.18 264) 0%, oklch(0.35 0.15 280) 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'oklch(0.85 0.15 264)' }} />
        <div className="absolute right-16 -bottom-12 w-56 h-56 rounded-full opacity-8"
          style={{ background: 'oklch(0.85 0.15 264)' }} />

        <div className="relative flex items-center gap-4">
          <div className="rounded-xl p-2.5 flex-shrink-0"
            style={{ background: 'oklch(1 0 0 / 0.15)' }}>
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-tight">NSGP Grant Builder</h1>
            <p className="text-sm mt-0.5" style={{ color: 'oklch(0.85 0.06 264)' }}>
              Nonprofit Security Grant Program · Manage facilities, threats, and proposals for your application.
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-7">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className={`bg-white border shadow-sm rounded-xl card-lift ${stat.accent}`}>
              <CardContent className="pt-5 pb-5 px-5">
                <div className={`inline-flex p-2 rounded-lg ${stat.iconBg} mb-3`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1.5 font-medium">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">No activity yet. Start by adding an organization.</p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {recentActivity.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 text-sm hover:bg-slate-50 rounded-lg px-2 py-2 -mx-2 transition-colors group"
                    >
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize flex-shrink-0 ${typeConfig[item.type]?.cls}`}
                      >
                        {typeConfig[item.type]?.label ?? item.type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate leading-snug">{item.label}</p>
                        <p className="text-xs text-slate-400 truncate">{item.sub}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              <Button asChild variant="outline" className="justify-start gap-2.5 h-9 text-sm font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                <Link href="/organizations/new">
                  <Plus className="h-3.5 w-3.5" />
                  Add Organization
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 h-9 text-sm font-medium hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors">
                <Link href="/facilities/new">
                  <Plus className="h-3.5 w-3.5" />
                  Add Facility
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 h-9 text-sm font-medium hover:bg-slate-50 transition-colors">
                <Link href="/organizations">
                  <Building2 className="h-3.5 w-3.5" />
                  View All Organizations
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2.5 h-9 text-sm font-medium hover:bg-slate-50 transition-colors">
                <Link href="/facilities">
                  <MapPin className="h-3.5 w-3.5" />
                  View All Facilities
                </Link>
              </Button>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-500">Getting started:</span> Add an organization, then add facilities. For each
                facility, document threats, security measures, and project proposals before exporting your application packet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
