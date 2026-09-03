import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AGENT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

const COLORS = [...AGENT_COLORS, '#f43f5e', '#e11d48', '#facc15', '#64748b', '#ef4444'];

export function TagFormDialog({ open, onOpenChange, tag, onSaved }) {
  const [form, setForm] = useState({ name: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(tag);

  useEffect(() => {
    if (open) setForm(tag ? { name: tag.name, color: tag.color } : { name: '', color: COLORS[0] });
  }, [open, tag]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Tag name is required');
    setSaving(true);
    try {
      const saved = isEdit ? await api.put(`/tags/${tag.id}`, form) : await api.post('/tags', form);
      toast.success(isEdit ? 'Tag updated' : 'Tag created');
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tag' : 'New tag'}</DialogTitle>
          <DialogDescription>Tags help triage and filter tickets.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="font-mono" required /></div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, color: c }))} className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition-transform', form.color === c && 'scale-110 ring-2 ring-foreground')} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Create tag'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
