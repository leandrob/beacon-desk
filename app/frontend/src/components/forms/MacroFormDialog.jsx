import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';

const empty = { title: '', shortcut: '', body: '' };

export function MacroFormDialog({ open, onOpenChange, macro, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(macro);

  useEffect(() => {
    if (open) setForm(macro ? { title: macro.title, shortcut: macro.shortcut || '', body: macro.body } : empty);
  }, [open, macro]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error('Title and body are required');
    setSaving(true);
    try {
      const saved = isEdit ? await api.put(`/macros/${macro.id}`, form) : await api.post('/macros', form);
      toast.success(isEdit ? 'Macro updated' : 'Macro created');
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit macro' : 'New macro'}</DialogTitle>
          <DialogDescription>Canned replies. Use <code className="font-mono">{'{{customer}}'}</code> and <code className="font-mono">{'{{agent}}'}</code> as placeholders.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={set('title')} required /></div>
            <div className="space-y-2"><Label>Shortcut</Label><Input value={form.shortcut} onChange={set('shortcut')} placeholder="/refund" className="font-mono" /></div>
          </div>
          <div className="space-y-2"><Label>Body *</Label><Textarea value={form.body} onChange={set('body')} rows={8} required /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create macro'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
