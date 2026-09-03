import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Eye, EyeOff } from 'lucide-react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatDate } from '@/lib/format';
import { articleCategoryMeta } from '@/lib/constants';
import { renderArticle } from '@/lib/utils';
import { PageLoader } from '@/components/Spinner';
import { ArticleFormDialog } from '@/components/forms/ArticleFormDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';

export default function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(() => api.get(`/articles/${id}`).then(setArticle).catch((e) => { toast.error(e.message); navigate('/kb'); }), [id, navigate]);
  useEffect(() => { load(); }, [load]);
  useRealtime(['article.updated'], (msg) => { if (Number(msg.payload.id) === Number(id)) setArticle((a) => ({ ...a, ...msg.payload, views: a?.views ?? msg.payload.views })); });

  if (!article) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/kb" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Knowledge base</Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
      </div>

      <article className="rounded-lg border bg-card p-6 sm:p-10">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge className="bg-muted text-muted-foreground border-transparent">{articleCategoryMeta(article.category).label}</Badge>
          {article.published ? <span className="flex items-center gap-1 text-emerald-400"><Eye className="h-3 w-3" /> Published</span> : <span className="flex items-center gap-1 text-amber-300"><EyeOff className="h-3 w-3" /> Draft</span>}
          <span>· {article.views} views</span>
          <span>· updated {formatDate(article.updated_at)}</span>
          {article.author_name && <span>· by {article.author_name}</span>}
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{article.title}</h1>
        <div className="article-body mt-6 text-[15px] text-foreground/90" dangerouslySetInnerHTML={{ __html: renderArticle(article.body) }} />
      </article>

      <ArticleFormDialog open={editOpen} onOpenChange={setEditOpen} article={article} onSaved={load} />
    </div>
  );
}
