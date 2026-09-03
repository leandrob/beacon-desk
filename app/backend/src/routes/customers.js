import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';
import { logActivity } from '../services/activity.js';
import { LIST_SQL, decorate } from '../services/tickets.js';

const router = Router();

const SELECT = `
  SELECT c.*,
         (SELECT COUNT(*) FROM tickets t WHERE t.customer_id = c.id) AS ticket_count,
         (SELECT COUNT(*) FROM tickets t WHERE t.customer_id = c.id AND t.status NOT IN ('resolved','closed')) AS open_count,
         (SELECT MAX(created_at) FROM tickets t WHERE t.customer_id = c.id) AS last_ticket_at
  FROM customers c
`;

router.get('/', (req, res) => {
  const { search = '', plan = '' } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    clauses.push('(c.name LIKE ? OR c.email LIKE ? OR c.company LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (plan) {
    clauses.push('c.plan = ?');
    params.push(plan);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  res.json(db.prepare(`${SELECT} ${where} ORDER BY c.name`).all(...params));
});

router.get('/:id', (req, res) => {
  const customer = db.prepare(`${SELECT} WHERE c.id = ?`).get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const tickets = db.prepare(`${LIST_SQL} WHERE t.customer_id = ? ORDER BY t.created_at DESC`).all(customer.id).map(decorate);
  res.json({ ...customer, tickets });
});

router.post('/', (req, res) => {
  const { name, email, company, plan, phone, notes } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  if (db.prepare('SELECT id FROM customers WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'A customer with that email already exists' });
  }
  const info = db
    .prepare('INSERT INTO customers (name, email, company, plan, phone, notes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, email, company || null, plan || 'free', phone || null, notes || null);
  const customer = db.prepare(`${SELECT} WHERE c.id = ?`).get(info.lastInsertRowid);
  broadcast('customer.created', customer);
  logActivity({ type: 'customer.created', message: `Customer "${name}" was added`, entityType: 'customer', entityId: customer.id, actorId: req.user.id });
  res.status(201).json(customer);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  const { name, email, company, plan, phone, notes } = req.body || {};
  db.prepare(
    "UPDATE customers SET name = ?, email = ?, company = ?, plan = ?, phone = ?, notes = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(
    name ?? existing.name,
    email ?? existing.email,
    company === undefined ? existing.company : company || null,
    plan ?? existing.plan,
    phone === undefined ? existing.phone : phone || null,
    notes === undefined ? existing.notes : notes || null,
    req.params.id
  );
  const customer = db.prepare(`${SELECT} WHERE c.id = ?`).get(req.params.id);
  broadcast('customer.updated', customer);
  res.json(customer);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  broadcast('customer.deleted', { id: Number(req.params.id) });
  logActivity({ type: 'customer.deleted', message: `Customer "${existing.name}" was removed`, entityType: 'customer', entityId: existing.id, actorId: req.user.id });
  res.json({ ok: true });
});

export default router;
