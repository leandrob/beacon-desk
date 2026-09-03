import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Search, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatRelative } from '@/lib/format';
import { ARTICLE_CATEGORIES, articleCategoryMeta } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ArticleFormDialog } from '@/components/forms/ArticleFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api.get(`/articles${api.qs({ search, category })}`).then(setArticles).catch((e) => toast.error(e.message)), [search, category]);
  useEffect(() => {
    const t = setTimeout(() => load().finally(() => setLoading(false)), 200);
    return () => clearTimeout(t);
  }, [load]);
  useRealtime(['article.created', 'article.updated', 'article.deleted'], load);

  const counts = articles.reduce((acc, a) => ((acc[a.category] = (acc[a.category] || 0) + 1), acc), {});

  async function togglePublish(a) {
    try {
      await api.put(`/articles/${a.id}`, { published: !a.published });
      toast.success(a.published ? 'Article unpublished' : 'Article published');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function confirmDelete() {
    try {
      await api.del(`/articles/${deleting.id}`);
      toast.success('Article deleted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Self-service" title="Knowledge base" description="Help articles customers can read before they open a ticket.">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New article</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1">
          <button onClick={() => setCategory('')} className={cn('flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm', !category ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground')}>All articles <span className="font-mono text-xs">{articles.length}</span></button>
          {ARTICLE_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setCategory(c.value)} className={cn('flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm', category === c.value ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground')}>
              {c.label} {!category && counts[c.value] ? <span className="font-mono text-xs">{counts[c.value]}</span> : null}
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles" className="bg-card pl-9" />
          </div>

          {loading ? (
            <PageLoader />
          ) : articles.length === 0 ? (
            <EmptyState icon={BookOpen} title="No articles" description="Write the first help article for this category." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {articles.map((a) => (
                <div key={a.id} className="group relative flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <Badge className="bg-muted text-muted-foreground border-transparent">{articleCategoryMeta(a.category).label}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(a); setFormOpen(true); }}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(a)}>{a.published ? <><EyeOff className="h-4 w-4" /> Unpublish</> : <><Eye className="h-4 w-4" /> Publish</>}</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(a)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link to={`/kb/${a.id}`} className="mt-2 text-base font-semibold leading-snug hover:text-primary">{a.title}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.body.replace(/[#>*`-]/g, '').slice(0, 160)}</p>
                  <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                    {a.published ? <span className="flex items-center gap-1 text-emerald-400"><Eye className="h-3 w-3" /> Published</span> : <span className="flex items-center gap-1 text-amber-300"><EyeOff className="h-3 w-3" /> Draft</span>}
                    <span className="font-mono">{a.views} views</span>
                    <span className="ml-auto">{formatRelative(a.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ArticleFormDialog open={formOpen} onOpenChange={setFormOpen} article={editing} onSaved={load} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)} title="Delete article?" description={deleting ? `"${deleting.title}" will be permanently removed.` : ''} onConfirm={confirmDelete} />
    </div>
  );
}
