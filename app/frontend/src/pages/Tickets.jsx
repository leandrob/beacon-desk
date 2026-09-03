import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Ticket, Search, X, UserCheck, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useWebSocket';
import { STATUSES, PRIORITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { TicketList } from '@/components/TicketList';
import { TicketFormDialog } from '@/components/forms/TicketFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const ALL = '__all__';
const VIEWS = [
  { id: 'open', label: 'All open', params: { view: 'open' } },
  { id: 'mine', label: 'My queue', params: { view: 'open', assignee: 'me' } },
  { id: 'unassigned', label: 'Unassigned', params: { view: 'open', assignee: 'unassigned' } },
  { id: 'breaching', label: 'Breaching SLA', params: { view: 'breaching', sort: 'sla' } },
  { id: 'pending', label: 'Pending', params: { status: 'pending' } },
  { id: 'done', label: 'Resolved', params: { status: 'resolved,closed' } },
  { id: 'all', label: 'Everything', params: {} },
];
const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Priority' },
  { value: 'sla', label: 'SLA due' },
  { value: 'oldest', label: 'Oldest' },
];

export default function Tickets() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [searchInput, setSearchInput] = useState(params.get('search') || '');

  const query = useMemo(() => Object.fromEntries(params.entries()), [params]);
  const activeView = VIEWS.find((v) => Object.entries(v.params).every(([k, val]) => query[k] === val) && Object.keys(query).filter((k) => !['search', 'priority', 'tag', 'sort', 'category'].includes(k)).every((k) => v.params[k] !== undefined))?.id;

  const setQuery = (changes) => {
    const next = { ...query, ...changes };
    for (const k of Object.keys(next)) if (next[k] == null || next[k] === '' || next[k] === ALL) delete next[k];
    setParams(next);
  };
  const setView = (v) => {
    const keep = { search: query.search, priority: query.priority, tag: query.tag, sort: query.sort };
    setParams(Object.fromEntries(Object.entries({ ...keep, ...v.params }).filter(([, val]) => val)));
  };

  useEffect(() => {
    if (!params.toString()) setParams({ view: 'open' }, { replace: true });
  }, []);
  useEffect(() => setSearchInput(query.search || ''), [query.search]);

  const load = useCallback(() => api.get(`/tickets${api.qs(query)}`).then(setTickets).catch((e) => toast.error(e.message)), [params]);

  useEffect(() => {
    setLoading(true);
    setSelected(new Set());
    load().finally(() => setLoading(false));
  }, [load]);
  useEffect(() => {
    api.get('/agents').then(setAgents).catch(() => {});
    api.get('/tags').then(setTags).catch(() => {});
  }, []);

  useRealtime(['ticket.created', 'ticket.updated', 'ticket.deleted', 'message.created'], load);

  function submitSearch(e) {
    e.preventDefault();
    setQuery({ search: searchInput.trim() });
  }

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => (s.size === tickets.length ? new Set() : new Set(tickets.map((t) => t.id))));

  async function bulk(changes, label) {
    try {
      const rows = await api.post('/tickets/bulk', { ids: [...selected], ...changes });
      toast.success(`${rows.length} tickets ${label}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const activeFilters = ['priority', 'tag', 'category', 'search'].filter((k) => query[k]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Queue" title="Tickets" description={`${tickets.length} ${activeView ? VIEWS.find((v) => v.id === activeView).label.toLowerCase() : 'matching'} tickets`}>
        <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New ticket</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-1 border-b">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => setView(v)} className={cn('relative -mb-px px-3 py-2 text-sm font-medium transition-colors', activeView === v.id ? 'text-foreground after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={submitSearch} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search subject, customer or BD-####" className="bg-card pl-9" />
        </form>
        <Select value={query.priority || ALL} onValueChange={(v) => setQuery({ priority: v })}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Any priority</SelectItem>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={query.status && !activeView ? query.status : query.status || ALL} onValueChange={(v) => setQuery({ status: v, view: undefined })}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Any status</SelectItem>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={query.assignee || ALL} onValueChange={(v) => setQuery({ assignee: v })}>
          <SelectTrigger className="w-44 bg-card"><SelectValue placeholder="Assignee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any assignee</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={query.tag || ALL} onValueChange={(v) => setQuery({ tag: v })}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>Any tag</SelectItem>{tags.map((t) => <SelectItem key={t.id} value={t.name}>#{t.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={query.sort || 'newest'} onValueChange={(v) => setQuery({ sort: v })}>
            <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setQuery({ priority: undefined, tag: undefined, category: undefined, search: undefined })}><X className="h-4 w-4" /> Clear</Button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">·</span>
          <Button size="sm" variant="outline" onClick={() => bulk({ assignee_id: user.id }, 'assigned to you')}><UserCheck className="h-4 w-4" /> Assign to me</Button>
          <Select onValueChange={(v) => bulk({ assignee_id: v === 'none' ? null : Number(v) }, 'reassigned')}>
            <SelectTrigger className="h-8 w-40 bg-card text-xs"><SelectValue placeholder="Assign to…" /></SelectTrigger>
            <SelectContent><SelectItem value="none">Unassign</SelectItem>{agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={(v) => bulk({ status: v }, `set to ${v.replace('_', ' ')}`)}>
            <SelectTrigger className="h-8 w-36 bg-card text-xs"><SelectValue placeholder="Set status…" /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select onValueChange={(v) => bulk({ priority: v }, `set to ${v}`)}>
            <SelectTrigger className="h-8 w-36 bg-card text-xs"><SelectValue placeholder="Set priority…" /></SelectTrigger>
            <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : tickets.length === 0 ? (
        <EmptyState icon={Ticket} title="No tickets match" description="Try another view or clear the filters." action={<Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> New ticket</Button>} />
      ) : (
        <TicketList tickets={tickets} selectable selected={selected} onToggle={toggle} onToggleAll={toggleAll} />
      )}

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={load} />
    </div>
  );
}
