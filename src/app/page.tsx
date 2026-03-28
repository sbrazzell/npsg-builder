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

  const totalBudget = projects.reduce((sum, p) => {
    return sum + p.budgetItems.reduce((s, b) => s + b.totalCost, 0);
  }, 0);

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

  return activity.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5);
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
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Facilities",
      value: facilityCount,
      icon: MapPin,
      href: "/facilities",
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "Open Proposals",
      value: openProposals,
      icon: FileText,
      href: "/facilities",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Total Budget",
      value: formatCurrency(totalBudget),
      icon: DollarSign,
      href: "/facilities",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "High-Risk Threats",
      value: highRiskThreats,
      icon: AlertTriangle,
      href: "/facilities",
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const typeColors: Record<string, string> = {
    facility: "bg-violet-100 text-violet-700",
    threat: "bg-red-100 text-red-700",
    project: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">NSGP Builder</h1>
            <p className="text-sm text-muted-foreground">Nonprofit Security Grant Program Planner</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className={`inline-flex p-2 rounded-lg ${stat.bg} mb-3`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No activity yet. Start by adding an organization.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentActivity.map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 text-sm hover:bg-slate-50 rounded-md px-2 py-1.5 -mx-2 transition-colors"
                    >
                      <Badge
                        variant="outline"
                        className={`text-xs capitalize flex-shrink-0 ${typeColors[item.type]}`}
                      >
                        {item.type}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/organizations/new">
                  <Plus className="h-4 w-4" />
                  Add Organization
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/facilities/new">
                  <Plus className="h-4 w-4" />
                  Add Facility
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/organizations">
                  <Building2 className="h-4 w-4" />
                  View All Organizations
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start gap-2">
                <Link href="/facilities">
                  <MapPin className="h-4 w-4" />
                  View All Facilities
                </Link>
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Getting started:</strong> Add an organization, then add facilities. For each
                facility, document threats, existing security measures, project proposals, and
                narratives before exporting your application packet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
