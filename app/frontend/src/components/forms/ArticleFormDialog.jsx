import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ARTICLE_CATEGORIES } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';

const empty = { title: '', category: 'general', body: '', published: false };

export function ArticleFormDialog({ open, onOpenChange, article, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(article);

  useEffect(() => {
    if (!open) return;
    setForm(article ? { title: article.title, category: article.category, body: article.body, published: Boolean(article.published) } : empty);
  }, [open, article]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return toast.error('Title and body are required');
    setSaving(true);
    try {
      const saved = isEdit ? await api.put(`/articles/${article.id}`, form) : await api.post('/articles', form);
      toast.success(isEdit ? 'Article updated' : 'Article created');
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit article' : 'New article'}</DialogTitle>
          <DialogDescription>Supports simple formatting: <code className="font-mono">## Heading</code>, <code className="font-mono">- list</code>, <code className="font-mono">1. steps</code>, <code className="font-mono">**bold**</code>, <code className="font-mono">`code`</code>, <code className="font-mono">&gt; quote</code>.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ARTICLE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Body *</Label>
            <Textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={14} className="font-mono text-xs" required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: Boolean(v) }))} />
            Published (visible to customers)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create article'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
