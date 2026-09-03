import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AGENT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const empty = { name: '', email: '', password: '', role: 'agent', title: '', color: AGENT_COLORS[0] };

export function AgentFormDialog({ open, onOpenChange, agent, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(agent);

  useEffect(() => {
    if (open) setForm(agent ? { name: agent.name, email: agent.email, password: '', role: agent.role, title: agent.title || '', color: agent.color } : empty);
  }, [open, agent]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || (!isEdit && !form.password)) return toast.error('Name, email and password are required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      const saved = isEdit ? await api.put(`/agents/${agent.id}`, payload) : await api.post('/agents', payload);
      toast.success(isEdit ? 'Agent updated' : 'Agent invited');
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit agent' : 'Invite agent'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Leave the password blank to keep it unchanged.' : 'Create a login for a teammate.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={set('name')} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={set('email')} disabled={isEdit} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={set('title')} placeholder="Support Engineer" /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>{isEdit ? 'New password' : 'Password *'}</Label><Input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" /></div>
          <div className="space-y-2">
            <Label>Avatar color</Label>
            <div className="flex flex-wrap gap-2">
              {AGENT_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))} className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition-transform', form.color === c && 'scale-110 ring-2 ring-foreground')} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Invite'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
