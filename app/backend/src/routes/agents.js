import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { broadcast } from '../websocket/hub.js';

const router = Router();

const SELECT = `
  SELECT u.id, u.name, u.email, u.role, u.title, u.color, u.created_at,
         (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.status NOT IN ('resolved','closed')) AS open_tickets,
         (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.status IN ('resolved','closed')) AS resolved_tickets
  FROM users u
`;

router.get('/', (req, res) => {
  res.json(db.prepare(`${SELECT} ORDER BY u.name`).all());
});

router.post('/', requireAdmin, (req, res) => {
  const { name, email, password, role, title, color } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'An agent with that email already exists' });
  }
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role, title, color) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 10), role === 'admin' ? 'admin' : 'agent', title || null, color || '#f59e0b');
  const agent = db.prepare(`${SELECT} WHERE u.id = ?`).get(info.lastInsertRowid);
  broadcast('agent.created', agent);
  res.status(201).json(agent);
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Agent not found' });
  const { name, role, title, color, password } = req.body || {};
  db.prepare(
    "UPDATE users SET name = ?, role = ?, title = ?, color = ?, password_hash = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    name ?? existing.name,
    role ?? existing.role,
    title === undefined ? existing.title : title,
    color ?? existing.color,
    password ? bcrypt.hashSync(password, 10) : existing.password_hash,
    req.params.id
  );
  const agent = db.prepare(`${SELECT} WHERE u.id = ?`).get(req.params.id);
  broadcast('agent.updated', agent);
  res.json(agent);
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Agent not found' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  broadcast('agent.deleted', { id: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
