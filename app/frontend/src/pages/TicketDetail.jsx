import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Send, Sparkles, Trash2, Plus, Mail, MessageCircle, Globe, Phone, History, User, Building2, Timer, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatDateTime, formatRelative, formatDue } from '@/lib/format';
import { STATUSES, PRIORITIES, CATEGORIES, statusMeta, priorityMeta, channelMeta, categoryMeta, slaMeta } from '@/lib/constants';
import { cn, fillTemplate } from '@/lib/utils';
import { PageLoader } from '@/components/Spinner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatusBadge, PriorityBadge, PlanBadge, TagChip, TicketRef } from '@/components/Badges';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

const NONE = '__none__';
const CHANNEL_ICONS = { email: Mail, chat: MessageCircle, web: Globe, phone: Phone };

function SlaRow({ label, state, due, doneAt }) {
  const meta = slaMeta(state);
  const showDue = due && ['ok', 'due_soon', 'breached'].includes(state);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-xs font-medium', meta.color)}>
        {showDue ? formatDue(due) : meta.label}
        {doneAt && state === 'met' && <span className="ml-1 text-muted-foreground">✓</span>}
      </span>
    </div>
  );
}

function EventLine({ e }) {
  const who = e.actor_name || 'System';
  const text = {
    created: 'opened the ticket',
    status: <>changed status <StatusBadge status={e.from_value} className="mx-1" /> → <StatusBadge status={e.to_value} className="ml-1" /></>,
    priority: <>changed priority <PriorityBadge priority={e.from_value} className="mx-1" /> → <PriorityBadge priority={e.to_value} className="ml-1" /></>,
    assignee: e.to_value ? <>assigned to <b>{e.to_value}</b>{e.from_value ? <span className="text-muted-foreground"> (was {e.from_value})</span> : ''}</> : <>unassigned <span className="text-muted-foreground">(was {e.from_value})</span></>,
    tag_added: <>added tag <span className="font-mono">#{e.to_value}</span></>,
    tag_removed: <>removed tag <span className="font-mono">#{e.from_value}</span></>,
  }[e.type] || e.type;
  return (
    <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
      <History className="h-3 w-3 shrink-0" />
      <span className="min-w-0 flex-1"><span className="font-medium text-foreground/80">{who}</span> {text}</span>
      <span className="shrink-0 font-mono">{formatDateTime(e.created_at)}</span>
    </div>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [tags, setTags] = useState([]);
  const [macros, setMacros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [nextStatus, setNextStatus] = useState('keep');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [subject, setSubject] = useState('');
  const [showEvents, setShowEvents] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const load = useCallback(() => api.get(`/tickets/${id}`).then(setTicket).catch((e) => { toast.error(e.message); navigate('/tickets'); }), [id, navigate]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
    api.get('/agents').then(setAgents).catch(() => {});
    api.get('/tags').then(setTags).catch(() => {});
    api.get('/macros').then(setMacros).catch(() => {});
  }, [load]);

  useRealtime(['ticket.updated', 'message.created', 'message.deleted', 'ticket.deleted'], (msg) => {
    const p = msg.payload;
    const targetId = p.ticket_id ?? p.id;
    if (Number(targetId) !== Number(id)) return;
    if (msg.type === 'ticket.deleted') { toast.error('This ticket was deleted'); navigate('/tickets'); return; }
    load();
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'nearest' }); }, [ticket?.messages?.length]);

  async function update(changes, successMsg) {
    try {
      const t = await api.put(`/tickets/${id}`, changes);
      setTicket((prev) => ({ ...prev, ...t }));
      if (successMsg) toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function send(e) {
    e?.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${id}/messages`, { body: body.trim(), is_internal: internal, next_status: nextStatus === 'keep' ? undefined : nextStatus });
      setBody('');
      setNextStatus('keep');
      toast.success(internal ? 'Note added' : 'Reply sent');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  async function simulateCustomerReply() {
    const text = window.prompt('Reply as the customer (demo helper):', 'Thanks — any update on this?');
    if (!text) return;
    try {
      await api.post(`/tickets/${id}/messages`, { body: text, as_customer: true });
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function insertMacro(m) {
    const text = fillTemplate(m.body, { customer: ticket.customer_name.split(' ')[0], agent: user.name.split(' ')[0] });
    setBody((b) => (b.trim() ? `${b}\n\n${text}` : text));
    setInternal(false);
    textareaRef.current?.focus();
  }

  async function deleteNote(mid) {
    try {
      await api.del(`/tickets/${id}/messages/${mid}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') send();
  }

  if (loading || !ticket) return <PageLoader />;

  const ChannelIcon = CHANNEL_ICONS[ticket.channel] || Mail;
  const isDone = ['resolved', 'closed'].includes(ticket.status);
  const tagIds = ticket.tags.map((t) => t.id);
  const availableTags = tags.filter((t) => !tagIds.includes(t.id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/tickets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tickets</Link>
        <div className="flex items-center gap-2">
          {!isDone && <Button size="sm" variant="outline" onClick={() => update({ status: 'resolved' }, 'Ticket resolved')}>Resolve</Button>}
          {isDone && <Button size="sm" variant="outline" onClick={() => update({ status: 'open' }, 'Ticket reopened')}>Reopen</Button>}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleting(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TicketRef number={ticket.number} className="text-sm" />
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><ChannelIcon className="h-3.5 w-3.5" /> {channelMeta(ticket.channel).label}</span>
          <span className="text-xs text-muted-foreground">· opened {formatRelative(ticket.created_at)}</span>
        </div>
        {editingSubject ? (
          <form onSubmit={(e) => { e.preventDefault(); update({ subject }, 'Subject updated'); setEditingSubject(false); }} className="flex gap-2">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus className="text-lg font-bold" />
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingSubject(false)}>Cancel</Button>
          </form>
        ) : (
          <h1 className="cursor-text text-2xl font-extrabold tracking-tight hover:text-primary/90" title="Click to edit" onClick={() => { setSubject(ticket.subject); setEditingSubject(true); }}>{ticket.subject}</h1>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <div className="space-y-4">
          <div className="space-y-3">
            {ticket.messages.map((m) => {
              const isAgent = m.author_type === 'agent';
              return (
                <div key={m.id} className={cn('flex gap-3', isAgent && 'flex-row-reverse')}>
                  {isAgent ? <AgentAvatar name={m.author_name} color={m.author_color} size="md" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground ring-1 ring-border">{(m.author_name || '?')[0]}</span>}
                  <div className={cn('group max-w-[85%] rounded-lg border px-4 py-3', m.is_internal ? 'border-amber-500/40 bg-amber-500/10' : isAgent ? 'border-primary/20 bg-card' : 'bg-muted/40')}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold">{m.author_name || (isAgent ? 'Agent' : 'Customer')}</span>
                      {m.is_internal ? <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"><Lock className="h-3 w-3" /> Internal note</span> : !isAgent && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Customer</span>}
                      <span className="text-muted-foreground" title={formatDateTime(m.created_at)}>{formatRelative(m.created_at)}</span>
                      {Boolean(m.is_internal) && <button onClick={() => deleteNote(m.id)} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive" aria-label="Delete note"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <form onSubmit={send} className={cn('rounded-lg border bg-card transition-colors', internal && 'border-amber-500/50 bg-amber-500/5')}>
            <div className="flex items-center gap-1 border-b px-2 py-1.5">
              <button type="button" onClick={() => setInternal(false)} className={cn('rounded-md px-3 py-1.5 text-xs font-medium', !internal ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>Reply to customer</button>
              <button type="button" onClick={() => setInternal(true)} className={cn('flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium', internal ? 'bg-amber-500/20 text-amber-300' : 'text-muted-foreground hover:text-foreground')}><Lock className="h-3 w-3" /> Internal note</button>
              <div className="ml-auto flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button type="button" variant="ghost" size="sm"><Sparkles className="h-4 w-4 text-primary" /> Macros <ChevronDown className="h-3 w-3" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Canned responses</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {macros.map((m) => (
                      <DropdownMenuItem key={m.id} onClick={() => insertMacro(m)} className="flex items-center justify-between">
                        <span className="truncate">{m.title}</span>
                        {m.shortcut && <span className="ml-2 font-mono text-[10px] text-muted-foreground">{m.shortcut}</span>}
                      </DropdownMenuItem>
                    ))}
                    {macros.length === 0 && <DropdownMenuItem disabled>No macros yet</DropdownMenuItem>}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <Textarea ref={textareaRef} value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={onKeyDown} rows={5} placeholder={internal ? 'Write a private note for your team… (not visible to the customer)' : `Reply to ${ticket.customer_name}…`} className="rounded-none border-0 bg-transparent focus-visible:ring-0" />
            <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
              {!internal && (
                <Select value={nextStatus} onValueChange={setNextStatus}>
                  <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Send · keep {statusMeta(ticket.status).label.toLowerCase()}</SelectItem>
                    <SelectItem value="pending">Send · set pending</SelectItem>
                    <SelectItem value="in_progress">Send · set in progress</SelectItem>
                    <SelectItem value="resolved">Send · resolve</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <span className="hidden text-[11px] text-muted-foreground sm:inline">⌘↵ to send</span>
              <button type="button" onClick={simulateCustomerReply} className="ml-auto text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Simulate customer reply</button>
              <Button type="submit" size="sm" disabled={sending || !body.trim()} variant={internal ? 'secondary' : 'default'}>
                {internal ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                {sending ? 'Sending…' : internal ? 'Add note' : 'Send reply'}
              </Button>
            </div>
          </form>

          {/* History */}
          <div className="rounded-lg border bg-card/60">
            <button onClick={() => setShowEvents((v) => !v)} className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>History · {ticket.events.length}</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showEvents && 'rotate-180')} />
            </button>
            {showEvents && <div className="divide-y px-4 pb-2">{ticket.events.map((e) => <EventLine key={e.id} e={e} />)}</div>}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
              <Select value={ticket.status} onValueChange={(v) => update({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
              <Select value={ticket.priority} onValueChange={(v) => update({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assignee</label>
              <Select value={ticket.assignee_id ? String(ticket.assignee_id) : NONE} onValueChange={(v) => update({ assignee_id: v === NONE ? null : Number(v) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}{a.id === user.id ? ' (me)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {ticket.assignee_id !== user.id && <button onClick={() => update({ assignee_id: user.id }, 'Assigned to you')} className="text-xs text-primary hover:underline">Assign to me</button>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
              <Select value={ticket.category || 'other'} onValueChange={(v) => update({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {ticket.tags.map((t) => <TagChip key={t.id} tag={t} onRemove={() => update({ tag_ids: tagIds.filter((x) => x !== t.id) })} />)}
                {availableTags.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="inline-flex items-center gap-1 rounded-md border border-dashed px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-primary hover:text-primary"><Plus className="h-3 w-3" /> add</button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {availableTags.map((t) => <DropdownMenuItem key={t.id} onClick={() => update({ tag_ids: [...tagIds, t.id] })}><span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}</DropdownMenuItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><Timer className="h-3.5 w-3.5" /> SLA</div>
            <SlaRow label="First response" state={ticket.sla.response} due={ticket.sla_response_due} doneAt={ticket.first_response_at} />
            <SlaRow label="Resolution" state={ticket.sla.resolution} due={ticket.sla_resolution_due} doneAt={ticket.resolved_at} />
            <p className="pt-1 text-[11px] text-muted-foreground">Targets follow the <Link to="/settings/sla" className="text-primary hover:underline">{priorityMeta(ticket.priority).label.toLowerCase()} policy</Link>. Resolution clock pauses while pending.</p>
          </div>

          <div className="space-y-2 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><User className="h-3.5 w-3.5" /> Customer</div>
            <Link to={`/customers/${ticket.customer_id}`} className="block font-semibold hover:text-primary">{ticket.customer_name}</Link>
            <div className="text-xs text-muted-foreground">{ticket.customer_email}</div>
            {ticket.customer_company && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Building2 className="h-3 w-3" /> {ticket.customer_company}</div>}
            <div className="pt-1"><PlanBadge plan={ticket.customer_plan} /></div>
          </div>

          <div className="space-y-1 rounded-lg border bg-card p-4 text-xs text-muted-foreground">
            <div className="flex justify-between"><span>Category</span><span className="text-foreground">{categoryMeta(ticket.category).label}</span></div>
            <div className="flex justify-between"><span>Created</span><span className="text-foreground">{formatDateTime(ticket.created_at)}</span></div>
            <div className="flex justify-between"><span>Updated</span><span className="text-foreground">{formatDateTime(ticket.updated_at)}</span></div>
            {ticket.resolved_at && <div className="flex justify-between"><span>Resolved</span><span className="text-foreground">{formatDateTime(ticket.resolved_at)}</span></div>}
          </div>
        </aside>
      </div>

      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={`Delete ${ticket.ref}?`} description="The whole conversation will be removed. This cannot be undone." onConfirm={async () => { try { await api.del(`/tickets/${id}`); toast.success('Ticket deleted'); navigate('/tickets'); } catch (err) { toast.error(err.message); } }} />
    </div>
  );
}
