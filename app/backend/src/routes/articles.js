import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';
import { logActivity } from '../services/activity.js';

const router = Router();

const SELECT = 'SELECT a.*, u.name AS author_name FROM articles a LEFT JOIN users u ON u.id = a.author_id';

function slugify(str) {
  return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function uniqueSlug(base, excludeId = null) {
  let slug = base || 'article';
  let i = 2;
  while (db.prepare('SELECT id FROM articles WHERE slug = ? AND id IS NOT ?').get(slug, excludeId)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

router.get('/', (req, res) => {
  const { search = '', category = '', published = '' } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(a.title LIKE ? OR a.body LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    clauses.push('a.category = ?');
    params.push(category);
  }
  if (published !== '') {
    clauses.push('a.published = ?');
    params.push(published === 'true' ? 1 : 0);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  res.json(db.prepare(`${SELECT} ${where} ORDER BY a.updated_at DESC`).all(...params));
});

router.get('/:id', (req, res) => {
  const article = db.prepare(`${SELECT} WHERE a.id = ? OR a.slug = ?`).get(req.params.id, req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  // Count a view (demo-friendly, no dedupe).
  db.prepare('UPDATE articles SET views = views + 1 WHERE id = ?').run(article.id);
  res.json({ ...article, views: article.views + 1 });
});

router.post('/', (req, res) => {
  const { title, body, category, published } = req.body || {};
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body are required' });
  const slug = uniqueSlug(slugify(title));
  const info = db
    .prepare('INSERT INTO articles (title, slug, category, body, published, author_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title.trim(), slug, category || 'general', body, published ? 1 : 0, req.user.id);
  const article = db.prepare(`${SELECT} WHERE a.id = ?`).get(info.lastInsertRowid);
  broadcast('article.created', article);
  logActivity({ type: 'article.created', message: `Article "${article.title}" was created`, entityType: 'article', entityId: article.id, actorId: req.user.id });
  res.status(201).json(article);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  const { title, body, category, published } = req.body || {};
  const newTitle = title ?? existing.title;
  const slug = title && title !== existing.title ? uniqueSlug(slugify(title), existing.id) : existing.slug;
  db.prepare(
    "UPDATE articles SET title = ?, slug = ?, category = ?, body = ?, published = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newTitle, slug, category ?? existing.category, body ?? existing.body, published === undefined ? existing.published : published ? 1 : 0, req.params.id);
  const article = db.prepare(`${SELECT} WHERE a.id = ?`).get(req.params.id);
  broadcast('article.updated', article);
  if (published !== undefined && Boolean(published) !== Boolean(existing.published)) {
    logActivity({
      type: published ? 'article.published' : 'article.unpublished',
      message: `Article "${article.title}" was ${published ? 'published' : 'unpublished'}`,
      entityType: 'article',
      entityId: article.id,
      actorId: req.user.id,
    });
  }
  res.json(article);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  broadcast('article.deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
