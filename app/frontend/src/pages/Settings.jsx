import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Save, Timer, Sparkles, Tag, Users, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useWebSocket';
import { PRIORITIES, priorityMeta } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PriorityBadge, TagChip } from '@/components/Badges';
import { AgentAvatar } from '@/components/AgentAvatar';
import { MacroFormDialog } from '@/components/forms/MacroFormDialog';
import { TagFormDialog } from '@/components/forms/TagFormDialog';
import { AgentFormDialog } from '@/components/forms/AgentFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { toast } from '@/components/ui/sonner';

function SlaTab({ isAdmin }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/sla').then(setRows).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useRealtime('sla.updated', load);

  const set = (priority, key, value) => setRows((r) => r.map((p) => (p.priority === priority ? { ...p, [key]: value } : p)));

  async function save() {
    setSaving(true);
    try {
      await api.put('/sla', rows.map((r) => ({ ...r, first_response_hours: Number(r.first_response_hours), resolution_hours: Number(r.resolution_hours) })));
      toast.success('SLA policies saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Targets in hours from ticket creation. Changing a policy affects new tickets and tickets whose priority is changed afterwards.</p>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>First response (h)</TableHead><TableHead>Resolution (h)</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.priority}>
                <TableCell><PriorityBadge priority={r.priority} /></TableCell>
                <TableCell><Input type="number" min="0.25" step="0.25" value={r.first_response_hours} onChange={(e) => set(r.priority, 'first_response_hours', e.target.value)} disabled={!isAdmin} className="w-32 font-mono" /></TableCell>
                <TableCell><Input type="number" min="0.5" step="0.5" value={r.resolution_hours} onChange={(e) => set(r.priority, 'resolution_hours', e.target.value)} disabled={!isAdmin} className="w-32 font-mono" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {isAdmin ? <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save policies'}</Button> : <p className="text-xs text-muted-foreground">Only admins can edit SLA policies.</p>}
    </div>
  );
}

function MacrosTab() {
  const [macros, setMacros] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(() => api.get('/macros').then(setMacros).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useRealtime(['macro.created', 'macro.updated', 'macro.deleted'], load);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Canned responses agents can drop into a reply from the composer.</p>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New macro</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {macros.map((m) => (
          <div key={m.id} className="group rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{m.title}</span>
              {m.shortcut && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-primary">{m.shortcut}</span>}
              <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(m); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">{m.body}</p>
          </div>
        ))}
      </div>
      <MacroFormDialog open={formOpen} onOpenChange={setFormOpen} macro={editing} onSaved={load} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)} title="Delete macro?" description={deleting ? `"${deleting.title}" will be removed.` : ''} onConfirm={async () => { await api.del(`/macros/${deleting.id}`); toast.success('Macro deleted'); load(); }} />
    </div>
  );
}

function TagsTab() {
  const [tags, setTags] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(() => api.get('/tags').then(setTags).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useRealtime(['tag.created', 'tag.updated', 'tag.deleted', 'ticket.updated'], load);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Tags are shared across all tickets. Deleting a tag removes it from every ticket.</p>
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New tag</Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Tag</TableHead><TableHead className="text-right">Tickets</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
          <TableBody>
            {tags.map((t) => (
              <TableRow key={t.id}>
                <TableCell><TagChip tag={t} /></TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{t.usage_count}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(t); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TagFormDialog open={formOpen} onOpenChange={setFormOpen} tag={editing} onSaved={load} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)} title="Delete tag?" description={deleting ? `#${deleting.name} is used on ${deleting.usage_count} tickets.` : ''} onConfirm={async () => { await api.del(`/tags/${deleting.id}`); toast.success('Tag deleted'); load(); }} />
    </div>
  );
}

function TeamTab({ isAdmin, me }) {
  const [agents, setAgents] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(() => api.get('/agents').then(setAgents).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);
  useRealtime(['agent.created', 'agent.updated', 'agent.deleted', 'ticket.updated', 'ticket.created'], load);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Agents who can sign in to the console.</p>
        {isAdmin && <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Invite agent</Button>}
      </div>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Agent</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Open</TableHead><TableHead className="text-right">Resolved</TableHead>{isAdmin && <TableHead className="w-24" />}</TableRow></TableHeader>
          <TableBody>
            {agents.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <AgentAvatar name={a.name} color={a.color} size="md" />
                    <div><div className="font-medium">{a.name}{a.id === me.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</div><div className="text-xs text-muted-foreground">{a.email}{a.title ? ` · ${a.title}` : ''}</div></div>
                  </div>
                </TableCell>
                <TableCell>{a.role === 'admin' ? <span className="flex items-center gap-1 text-xs text-primary"><Shield className="h-3.5 w-3.5" /> Admin</span> : <span className="text-xs text-muted-foreground">Agent</span>}</TableCell>
                <TableCell className="text-right font-mono">{a.open_tickets}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{a.resolved_tickets}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(a); setFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    {a.id !== me.id && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleting(a)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AgentFormDialog open={formOpen} onOpenChange={setFormOpen} agent={editing} onSaved={load} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)} title="Remove agent?" description={deleting ? `${deleting.name} will lose access. Their tickets become unassigned.` : ''} confirmText="Remove" onConfirm={async () => { try { await api.del(`/agents/${deleting.id}`); toast.success('Agent removed'); load(); } catch (err) { toast.error(err.message); } }} />
    </div>
  );
}

export default function Settings() {
  const { tab = 'sla' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Workspace" title="Settings" description="SLA targets, canned responses, tags and your team." />
      <Tabs value={tab} onValueChange={(v) => navigate(`/settings/${v}`)}>
        <TabsList>
          <TabsTrigger value="sla"><Timer className="mr-1.5 h-4 w-4" /> SLA policies</TabsTrigger>
          <TabsTrigger value="macros"><Sparkles className="mr-1.5 h-4 w-4" /> Macros</TabsTrigger>
          <TabsTrigger value="tags"><Tag className="mr-1.5 h-4 w-4" /> Tags</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-1.5 h-4 w-4" /> Team</TabsTrigger>
        </TabsList>
        <TabsContent value="sla" className="mt-5"><SlaTab isAdmin={isAdmin} /></TabsContent>
        <TabsContent value="macros" className="mt-5"><MacrosTab /></TabsContent>
        <TabsContent value="tags" className="mt-5"><TagsTab /></TabsContent>
        <TabsContent value="team" className="mt-5"><TeamTab isAdmin={isAdmin} me={user} /></TabsContent>
      </Tabs>
    </div>
  );
}
