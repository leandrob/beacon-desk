import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, UserX, AlertTriangle, Timer, CheckCircle2, Activity, Gauge, Clock, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, CartesianGrid } from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatRelative, formatHours } from '@/lib/format';
import { STATUSES, PRIORITIES, categoryMeta } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/Spinner';
import { StatTile } from '@/components/StatTile';
import { TicketList } from '@/components/TicketList';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tooltipStyle = { background: 'hsl(228 24% 9%)', border: '1px solid hsl(228 18% 20%)', borderRadius: 8, fontSize: 12, color: '#e8e6e1' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => api.get('/dashboard').then(setStats).catch(() => {}), []);
  const loadActivities = useCallback(() => api.get('/activities?limit=14').then(setActivities).catch(() => {}), []);

  useEffect(() => {
    Promise.all([loadStats(), loadActivities()]).finally(() => setLoading(false));
  }, [loadStats, loadActivities]);

  useRealtime(['ticket.created', 'ticket.updated', 'ticket.deleted', 'message.created', 'customer.created', 'article.updated'], loadStats);
  useRealtime('activity.created', (msg) => setActivities((prev) => [msg.payload, ...prev].slice(0, 14)));

  // Re-render every minute so relative times and SLA countdowns stay fresh.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  if (loading || !stats) return <PageLoader />;

  const volume = stats.volume.map((v) => ({ ...v, label: v.date.slice(5).replace('-', '/') }));
  const byStatus = STATUSES.map((s) => ({ name: s.label, value: stats.byStatus[s.value] || 0, fill: s.dot }));
  const byPriority = PRIORITIES.slice().reverse().map((p) => ({ name: p.label, value: stats.byPriority[p.value] || 0, fill: p.hex }));
  const maxAgentOpen = Math.max(1, ...stats.agents.map((a) => a.open));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Overview" title={`${greeting}, ${user.name.split(' ')[0]}`} description="Here is what the queue looks like right now.">
        <Button asChild variant="outline"><Link to="/tickets?assignee=me&view=open">My queue <ArrowRight className="h-4 w-4" /></Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatTile icon={Inbox} label="Open" value={stats.totalOpen} sub={`${stats.createdToday} new today`} to="/tickets?view=open" />
        <StatTile icon={UserX} label="Unassigned" value={stats.unassigned} to="/tickets?view=open&assignee=unassigned" tone={stats.unassigned ? 'warn' : 'default'} />
        <StatTile icon={AlertTriangle} label="SLA breached" value={stats.breached} to="/tickets?view=breaching&sort=sla" tone={stats.breached ? 'danger' : 'success'} />
        <StatTile icon={Timer} label="Awaiting reply" value={stats.awaitingFirstResponse} sub="no first response yet" to="/tickets?view=open&sort=sla" tone="info" />
        <StatTile icon={CheckCircle2} label="Resolved today" value={stats.resolvedToday} tone="success" />
        <StatTile icon={Clock} label="Avg 1st response" value={formatHours(stats.avgFirstResponseHours)} sub="last 30 days" />
        <StatTile icon={Gauge} label="SLA attainment" value={stats.slaAttainment == null ? '—' : `${stats.slaAttainment}%`} sub={`avg resolution ${formatHours(stats.avgResolutionHours)}`} tone={stats.slaAttainment >= 90 ? 'success' : 'warn'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Volume · last 14 days</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volume} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5a524" stopOpacity={0.5} /><stop offset="100%" stopColor="#f5a524" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.4} /><stop offset="100%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(228 18% 17%)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8b90a5' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8b90a5' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area isAnimationActive={false} type="monotone" dataKey="created" name="Created" stroke="#f5a524" strokeWidth={2} fill="url(#gCreated)" />
                <Area isAnimationActive={false} type="monotone" dataKey="resolved" name="Resolved" stroke="#34d399" strokeWidth={2} fill="url(#gResolved)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Open by priority</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byPriority} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={56} tick={{ fontSize: 11, fill: '#8b90a5' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} />
                <Bar isAnimationActive={false} dataKey="value" name="Tickets" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: 'right', fill: '#e8e6e1', fontSize: 11 }}>
                  {byPriority.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-4 w-4 text-rose-400" /> Needs attention</h2>
            <Link to="/tickets?view=breaching&sort=sla" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {stats.attention.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card/40 p-8 text-center text-sm text-muted-foreground">Nothing urgent or overdue. Nice work.</div>
          ) : (
            <TicketList tickets={stats.attention} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">By status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byStatus.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 text-sm">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.fill }} />
                    <span className="flex-1 text-muted-foreground">{s.name}</span>
                    <span className="font-mono">{s.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Open by category</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {stats.byCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-muted-foreground">{categoryMeta(c.category).label}</span>
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${(c.count / Math.max(1, stats.totalOpen)) * 100}%` }} /></div>
                    <span className="w-6 text-right font-mono">{c.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Team load</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {stats.agents.map((a) => (
                <Link to={`/tickets?assignee=${a.id}&view=open`} key={a.id} className="flex items-center gap-3 text-sm">
                  <AgentAvatar name={a.name} color={a.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between"><span className="truncate">{a.name}</span><span className="font-mono text-xs text-muted-foreground">{a.open} open · {a.resolved_week} solved/7d</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(a.open / maxAgentOpen) * 100}%`, background: a.color }} /></div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"><Activity className="h-4 w-4 text-primary" /> Activity</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="leading-snug">{a.entity_type === 'ticket' && a.entity_id ? <Link to={`/tickets/${a.entity_id}`} className="hover:text-primary">{a.message}</Link> : a.message}</p>
                      <p className="text-xs text-muted-foreground">{formatRelative(a.created_at)}{a.actor_name ? ` · ${a.actor_name}` : ''}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
