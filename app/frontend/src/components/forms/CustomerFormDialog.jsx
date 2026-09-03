import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { PLANS } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const empty = { name: '', email: '', company: '', plan: 'free', phone: '', notes: '' };

export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(customer);

  useEffect(() => {
    if (!open) return;
    setForm(customer ? { name: customer.name || '', email: customer.email || '', company: customer.company || '', plan: customer.plan || 'free', phone: customer.phone || '', notes: customer.notes || '' } : empty);
  }, [open, customer]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email are required');
    setSaving(true);
    try {
      const saved = isEdit ? await api.put(`/customers/${customer.id}`, form) : await api.post('/customers', form);
      toast.success(isEdit ? 'Customer updated' : 'Customer added');
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
          <DialogTitle>{isEdit ? 'Edit customer' : 'New customer'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Update contact details.' : 'Add a customer who can open tickets.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={set('name')} required /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={set('email')} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={set('company')} /></div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={set('phone')} /></div>
          <div className="space-y-2"><Label>Internal notes</Label><Textarea value={form.notes} onChange={set('notes')} rows={3} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add customer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
