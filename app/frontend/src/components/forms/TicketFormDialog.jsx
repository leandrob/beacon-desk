import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PRIORITIES, CHANNELS, CATEGORIES } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TagChip } from '@/components/Badges';
import { toast } from '@/components/ui/sonner';

const NONE = '__none__';
const empty = { subject: '', body: '', customer_id: '', priority: 'normal', channel: 'email', category: 'other', assignee_id: NONE, tag_ids: [] };

/** Create a ticket on behalf of a customer (e.g. logged from a phone call). */
export function TicketFormDialog({ open, onOpenChange, customerId, onSaved }) {
  const [form, setForm] = useState(empty);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...empty, customer_id: customerId ? String(customerId) : '' });
    Promise.all([api.get('/customers'), api.get('/agents'), api.get('/tags')])
      .then(([c, a, t]) => { setCustomers(c); setAgents(a); setTags(t); })
      .catch((e) => toast.error(e.message));
  }, [open, customerId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setVal = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));
  const toggleTag = (id) => setForm((f) => ({ ...f, tag_ids: f.tag_ids.includes(id) ? f.tag_ids.filter((x) => x !== id) : [...f.tag_ids, id] }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.body.trim() || !form.customer_id) {
      toast.error('Customer, subject and message are required');
      return;
    }
    setSaving(true);
    try {
      const saved = await api.post('/tickets', {
        ...form,
        customer_id: Number(form.customer_id),
        assignee_id: form.assignee_id === NONE ? null : Number(form.assignee_id),
      });
      toast.success(`${saved.ref} created`);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New ticket</DialogTitle>
          <DialogDescription>Log a request on behalf of a customer. SLA timers start immediately.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={form.customer_id} onValueChange={setVal('customer_id')}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` · ${c.company}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={form.assignee_id} onValueChange={setVal('assignee_id')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {agents.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input value={form.subject} onChange={set('subject')} placeholder="Short summary of the issue" required />
          </div>
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea value={form.body} onChange={set('body')} rows={5} placeholder="What did the customer report?" required />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={setVal('priority')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={setVal('channel')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={setVal('category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => <TagChip key={t.id} tag={t} active={form.tag_ids.includes(t.id)} onClick={() => toggleTag(t.id)} />)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create ticket'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
