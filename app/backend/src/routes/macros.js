import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';

const router = Router();

router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM macros ORDER BY title').all()));

router.post('/', (req, res) => {
  const { title, shortcut, body } = req.body || {};
  if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Title and body are required' });
  const info = db.prepare('INSERT INTO macros (title, shortcut, body) VALUES (?, ?, ?)').run(title.trim(), shortcut?.trim() || null, body);
  const macro = db.prepare('SELECT * FROM macros WHERE id = ?').get(info.lastInsertRowid);
  broadcast('macro.created', macro);
  res.status(201).json(macro);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM macros WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Macro not found' });
  const { title, shortcut, body } = req.body || {};
  db.prepare("UPDATE macros SET title = ?, shortcut = ?, body = ?, updated_at = datetime('now') WHERE id = ?").run(
    title ?? existing.title,
    shortcut === undefined ? existing.shortcut : shortcut || null,
    body ?? existing.body,
    req.params.id
  );
  const macro = db.prepare('SELECT * FROM macros WHERE id = ?').get(req.params.id);
  broadcast('macro.updated', macro);
  res.json(macro);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM macros WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Macro not found' });
  db.prepare('DELETE FROM macros WHERE id = ?').run(req.params.id);
  broadcast('macro.deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
