import { Router } from 'express';
import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';
import { logActivity } from '../services/activity.js';
import {
  LIST_SQL, STATUSES, PRIORITIES, CHANNELS, CATEGORIES,
  decorate, getTicket, nextTicketNumber, slaDueDates, sqlDate, ticketRef, addEvent,
} from '../services/tickets.js';

const router = Router();

const PRIORITY_ORDER = "CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END";
const SORTS = {
  newest: 't.created_at DESC',
  oldest: 't.created_at ASC',
  updated: 't.updated_at DESC',
  priority: `${PRIORITY_ORDER}, t.created_at DESC`,
  sla: 't.sla_resolution_due ASC',
};

function agentName(id) {
  return id ? db.prepare('SELECT name FROM users WHERE id = ?').get(id)?.name || null : null;
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { status = '', priority = '', assignee = '', search = '', tag = '', customer_id = '', category = '', view = '', sort = 'newest' } = req.query;
  const clauses = [];
  const params = [];

  if (status) {
    const list = status.split(',').filter((s) => STATUSES.includes(s));
    if (list.length) {
      clauses.push(`t.status IN (${list.map(() => '?').join(',')})`);
      params.push(...list);
    }
  }
  if (priority) {
    clauses.push('t.priority = ?');
    params.push(priority);
  }
  if (category) {
    clauses.push('t.category = ?');
    params.push(category);
  }
  if (assignee === 'me') {
    clauses.push('t.assignee_id = ?');
    params.push(req.user.id);
  } else if (assignee === 'unassigned') {
    clauses.push('t.assignee_id IS NULL');
  } else if (assignee) {
    clauses.push('t.assignee_id = ?');
    params.push(Number(assignee));
  }
  if (customer_id) {
    clauses.push('t.customer_id = ?');
    params.push(Number(customer_id));
  }
  if (tag) {
    clauses.push('EXISTS (SELECT 1 FROM ticket_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.ticket_id = t.id AND tg.name = ?)');
    params.push(tag);
  }
  if (search) {
    const like = `%${search}%`;
    const asNumber = search.replace(/^bd-?/i, '');
    clauses.push('(t.subject LIKE ? OR c.name LIKE ? OR c.email LIKE ? OR CAST(t.number AS TEXT) LIKE ?)');
    params.push(like, like, like, `%${asNumber}%`);
  }
  if (view === 'open') clauses.push("t.status NOT IN ('resolved','closed')");
  if (view === 'breaching') {
    // Open tickets whose resolution target is past, or first response is past and none given.
    clauses.push(
      "t.status NOT IN ('resolved','closed') AND ((t.sla_resolution_due < datetime('now') AND t.status != 'pending') OR (t.first_response_at IS NULL AND t.sla_response_due < datetime('now')))"
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const order = SORTS[sort] || SORTS.newest;
  const rows = db.prepare(`${LIST_SQL} ${where} ORDER BY ${order}`).all(...params);
  res.json(rows.map(decorate));
});

// ---------------------------------------------------------------------------
// Detail: ticket + conversation + events
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const messages = db
    .prepare(
      `SELECT m.*,
              CASE m.author_type WHEN 'agent' THEN u.name ELSE c.name END AS author_name,
              CASE m.author_type WHEN 'agent' THEN u.color ELSE NULL END AS author_color
       FROM ticket_messages m
       LEFT JOIN users u ON m.author_type = 'agent' AND u.id = m.author_id
       LEFT JOIN customers c ON m.author_type = 'customer' AND c.id = m.author_id
       WHERE m.ticket_id = ? ORDER BY m.created_at ASC, m.id ASC`
    )
    .all(ticket.id);

  const events = db
    .prepare('SELECT e.*, u.name AS actor_name FROM ticket_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.ticket_id = ? ORDER BY e.created_at ASC, e.id ASC')
    .all(ticket.id);

  res.json({ ...ticket, messages, events });
});

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const { subject, body, customer_id, priority = 'normal', channel = 'email', category = 'other', assignee_id = null, tag_ids = [] } = req.body || {};
  if (!subject?.trim() || !body?.trim() || !customer_id) {
    return res.status(400).json({ error: 'subject, body and customer_id are required' });
  }
  if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' });
  if (!CHANNELS.includes(channel)) return res.status(400).json({ error: 'Invalid channel' });
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const id = db.transaction(() => {
    const now = sqlDate();
    const sla = slaDueDates(priority, now);
    const number = nextTicketNumber();
    const info = db
      .prepare(
        `INSERT INTO tickets (number, subject, status, priority, channel, category, customer_id, assignee_id, sla_response_due, sla_resolution_due, created_at, updated_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(number, subject.trim(), priority, channel, category || null, customer.id, assignee_id || null, sla.sla_response_due, sla.sla_resolution_due, now, now);
    const ticketId = info.lastInsertRowid;
    // The opening message is authored by the customer.
    db.prepare("INSERT INTO ticket_messages (ticket_id, author_type, author_id, body, is_internal, created_at) VALUES (?, 'customer', ?, ?, 0, ?)")
      .run(ticketId, customer.id, body.trim(), now);
    addEvent({ ticketId, actorId: req.user.id, type: 'created', createdAt: now });
    if (assignee_id) addEvent({ ticketId, actorId: req.user.id, type: 'assignee', to: agentName(assignee_id), createdAt: now });
    const addTag = db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
    for (const tagId of tag_ids) addTag.run(ticketId, tagId);
    return ticketId;
  })();

  const ticket = getTicket(id);
  broadcast('ticket.created', ticket);
  logActivity({ type: 'ticket.created', message: `${ticket.ref} "${ticket.subject}" opened for ${customer.name}`, entityType: 'ticket', entityId: ticket.id, actorId: req.user.id });
  res.status(201).json(ticket);
});

// ---------------------------------------------------------------------------
// Update fields (status / priority / assignee / subject / category / tags)
// Shared by PUT /:id and the bulk endpoint.
// ---------------------------------------------------------------------------
function applyChanges(existing, changes, actorId) {
  const now = sqlDate();
  const sets = [];
  const params = [];
  const logs = [];

  if (changes.subject !== undefined && changes.subject.trim() && changes.subject !== existing.subject) {
    sets.push('subject = ?');
    params.push(changes.subject.trim());
  }
  if (changes.category !== undefined && changes.category !== existing.category) {
    sets.push('category = ?');
    params.push(changes.category || null);
  }
  if (changes.channel !== undefined && CHANNELS.includes(changes.channel) && changes.channel !== existing.channel) {
    sets.push('channel = ?');
    params.push(changes.channel);
  }

  if (changes.status !== undefined && changes.status !== existing.status) {
    if (!STATUSES.includes(changes.status)) throw new Error('Invalid status');
    sets.push('status = ?');
    params.push(changes.status);
    if (changes.status === 'resolved') {
      sets.push('resolved_at = ?');
      params.push(now);
    }
    if (changes.status === 'closed') {
      sets.push('closed_at = ?');
      params.push(now);
      if (!existing.resolved_at) {
        sets.push('resolved_at = ?');
        params.push(now);
      }
    }
    if (['open', 'pending', 'in_progress'].includes(changes.status) && (existing.resolved_at || existing.closed_at)) {
      // Reopened: clear completion timestamps.
      sets.push('resolved_at = NULL', 'closed_at = NULL');
    }
    addEvent({ ticketId: existing.id, actorId, type: 'status', from: existing.status, to: changes.status, createdAt: now });
    logs.push({ type: 'ticket.status', message: `${ticketRef(existing.number)} moved to ${changes.status.replace('_', ' ')}` });
  }

  if (changes.priority !== undefined && changes.priority !== existing.priority) {
    if (!PRIORITIES.includes(changes.priority)) throw new Error('Invalid priority');
    const sla = slaDueDates(changes.priority, existing.created_at);
    sets.push('priority = ?', 'sla_response_due = ?', 'sla_resolution_due = ?');
    params.push(changes.priority, sla.sla_response_due, sla.sla_resolution_due);
    addEvent({ ticketId: existing.id, actorId, type: 'priority', from: existing.priority, to: changes.priority, createdAt: now });
    logs.push({ type: 'ticket.priority', message: `${ticketRef(existing.number)} priority set to ${changes.priority}` });
  }

  if (changes.assignee_id !== undefined) {
    const newId = changes.assignee_id ? Number(changes.assignee_id) : null;
    if ((existing.assignee_id || null) !== newId) {
      sets.push('assignee_id = ?');
      params.push(newId);
      const toName = agentName(newId);
      addEvent({ ticketId: existing.id, actorId, type: 'assignee', from: agentName(existing.assignee_id), to: toName, createdAt: now });
      logs.push({ type: 'ticket.assigned', message: toName ? `${ticketRef(existing.number)} assigned to ${toName}` : `${ticketRef(existing.number)} was unassigned` });
    }
  }

  if (Array.isArray(changes.tag_ids)) {
    const current = db.prepare('SELECT tag_id FROM ticket_tags WHERE ticket_id = ?').all(existing.id).map((r) => r.tag_id);
    const wanted = changes.tag_ids.map(Number);
    const tagName = (id) => db.prepare('SELECT name FROM tags WHERE id = ?').get(id)?.name;
    for (const id of wanted.filter((id) => !current.includes(id))) {
      db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)').run(existing.id, id);
      addEvent({ ticketId: existing.id, actorId, type: 'tag_added', to: tagName(id), createdAt: now });
    }
    for (const id of current.filter((id) => !wanted.includes(id))) {
      db.prepare('DELETE FROM ticket_tags WHERE ticket_id = ? AND tag_id = ?').run(existing.id, id);
      addEvent({ ticketId: existing.id, actorId, type: 'tag_removed', from: tagName(id), createdAt: now });
    }
    if (!sets.length) sets.push('updated_at = updated_at'); // still bump below
  }

  if (sets.length) {
    sets.push('updated_at = ?');
    params.push(now, existing.id);
    db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
  return logs;
}

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });
  let logs;
  try {
    logs = db.transaction(() => applyChanges(existing, req.body || {}, req.user.id))();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const ticket = getTicket(existing.id);
  broadcast('ticket.updated', ticket);
  for (const l of logs) logActivity({ ...l, entityType: 'ticket', entityId: ticket.id, actorId: req.user.id });
  res.json(ticket);
});

// Bulk: apply the same status/priority/assignee change to many tickets.
router.post('/bulk', (req, res) => {
  const { ids = [], status, priority, assignee_id } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids are required' });
  const changes = {};
  if (status !== undefined) changes.status = status;
  if (priority !== undefined) changes.priority = priority;
  if (assignee_id !== undefined) changes.assignee_id = assignee_id;

  const updated = [];
  try {
    db.transaction(() => {
      for (const id of ids) {
        const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
        if (!existing) continue;
        applyChanges(existing, changes, req.user.id);
        updated.push(getTicket(id));
      }
    })();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  for (const t of updated) broadcast('ticket.updated', t);
  const what = [status && `status → ${status}`, priority && `priority → ${priority}`, assignee_id !== undefined && (assignee_id ? `assigned to ${agentName(assignee_id)}` : 'unassigned')].filter(Boolean).join(', ');
  logActivity({ type: 'ticket.bulk', message: `${updated.length} tickets updated (${what})`, actorId: req.user.id });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });
  db.prepare('DELETE FROM tickets WHERE id = ?').run(existing.id);
  broadcast('ticket.deleted', { id: existing.id });
  logActivity({ type: 'ticket.deleted', message: `${ticketRef(existing.number)} "${existing.subject}" was deleted`, entityType: 'ticket', entityId: existing.id, actorId: req.user.id });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------
router.post('/:id/messages', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });
  const { body, is_internal = false, as_customer = false, next_status } = req.body || {};
  if (!body?.trim()) return res.status(400).json({ error: 'Message body is required' });

  const now = sqlDate();
  const internal = is_internal && !as_customer ? 1 : 0;
  const authorType = as_customer ? 'customer' : 'agent';
  const authorId = as_customer ? existing.customer_id : req.user.id;

  const logs = [];
  const messageId = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO ticket_messages (ticket_id, author_type, author_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(existing.id, authorType, authorId, body.trim(), internal, now);

    const sets = ['updated_at = ?'];
    const params = [now];
    // First public agent reply stops the first-response SLA clock.
    if (authorType === 'agent' && !internal && !existing.first_response_at) {
      sets.push('first_response_at = ?');
      params.push(now);
    }
    // A customer reply on a pending ticket reopens it.
    if (authorType === 'customer' && existing.status === 'pending') {
      sets.push('status = ?');
      params.push('open');
      addEvent({ ticketId: existing.id, actorId: null, type: 'status', from: 'pending', to: 'open', createdAt: now });
    }
    params.push(existing.id);
    db.prepare(`UPDATE tickets SET ${sets.join(', ')} WHERE id = ?`).run(...params);

    if (next_status && next_status !== existing.status && authorType === 'agent' && !internal) {
      const fresh = db.prepare('SELECT * FROM tickets WHERE id = ?').get(existing.id);
      logs.push(...applyChanges(fresh, { status: next_status }, req.user.id));
    }
    return info.lastInsertRowid;
  })();

  const message = db
    .prepare(
      `SELECT m.*, CASE m.author_type WHEN 'agent' THEN u.name ELSE c.name END AS author_name,
              CASE m.author_type WHEN 'agent' THEN u.color ELSE NULL END AS author_color
       FROM ticket_messages m
       LEFT JOIN users u ON m.author_type = 'agent' AND u.id = m.author_id
       LEFT JOIN customers c ON m.author_type = 'customer' AND c.id = m.author_id
       WHERE m.id = ?`
    )
    .get(messageId);
  const ticket = getTicket(existing.id);

  broadcast('message.created', { ...message, ticket_number: ticket.number });
  broadcast('ticket.updated', ticket);
  if (!internal) {
    logActivity({
      type: authorType === 'agent' ? 'ticket.replied' : 'ticket.customer_replied',
      message: authorType === 'agent' ? `${ticket.ref} replied by ${req.user.name}` : `${ticket.customer_name} replied on ${ticket.ref}`,
      entityType: 'ticket',
      entityId: ticket.id,
      actorId: authorType === 'agent' ? req.user.id : null,
    });
  }
  for (const l of logs) logActivity({ ...l, entityType: 'ticket', entityId: ticket.id, actorId: req.user.id });
  res.status(201).json({ message, ticket });
});

router.delete('/:id/messages/:messageId', (req, res) => {
  const msg = db.prepare('SELECT * FROM ticket_messages WHERE id = ? AND ticket_id = ?').get(req.params.messageId, req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  if (!msg.is_internal) return res.status(400).json({ error: 'Only internal notes can be deleted' });
  db.prepare('DELETE FROM ticket_messages WHERE id = ?').run(msg.id);
  broadcast('message.deleted', { id: msg.id, ticket_id: msg.ticket_id });
  res.json({ ok: true });
});

export default router;
