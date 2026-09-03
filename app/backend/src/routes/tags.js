import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';

const router = Router();

const SELECT = 'SELECT t.*, (SELECT COUNT(*) FROM ticket_tags tt WHERE tt.tag_id = t.id) AS usage_count FROM tags t';

router.get('/', (req, res) => res.json(db.prepare(`${SELECT} ORDER BY t.name`).all()));

router.post('/', (req, res) => {
  const { name, color } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Tag name is required' });
  if (db.prepare('SELECT id FROM tags WHERE name = ?').get(name.trim())) {
    return res.status(409).json({ error: 'That tag already exists' });
  }
  const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name.trim().toLowerCase(), color || '#64748b');
  const tag = db.prepare(`${SELECT} WHERE t.id = ?`).get(info.lastInsertRowid);
  broadcast('tag.created', tag);
  res.status(201).json(tag);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tag not found' });
  const { name, color } = req.body || {};
  db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run((name ?? existing.name).trim().toLowerCase(), color ?? existing.color, req.params.id);
  const tag = db.prepare(`${SELECT} WHERE t.id = ?`).get(req.params.id);
  broadcast('tag.updated', tag);
  res.json(tag);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tag not found' });
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  broadcast('tag.deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
