import db from '../db/index.js';

export const STATUSES = ['open', 'pending', 'in_progress', 'resolved', 'closed'];
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
export const CHANNELS = ['email', 'chat', 'web', 'phone'];
export const CATEGORIES = ['billing', 'bug', 'how_to', 'feature', 'account', 'other'];

/** Format a ticket number for humans, e.g. 1042 -> "BD-1042". */
export function ticketRef(number) {
  return `BD-${number}`;
}

/** Next sequential ticket number (starts at 1001). */
export function nextTicketNumber() {
  const row = db.prepare('SELECT MAX(number) AS m FROM tickets').get();
  return (row.m || 1000) + 1;
}

/** SQLite-style "YYYY-MM-DD HH:MM:SS" timestamp (UTC). */
export function sqlDate(date = new Date()) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function parseSqlDate(value) {
  if (!value) return null;
  return new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
}

/** Compute SLA due timestamps for a ticket from its priority and creation time. */
export function slaDueDates(priority, createdAt) {
  const policy = db.prepare('SELECT * FROM sla_policies WHERE priority = ?').get(priority);
  if (!policy) return { sla_response_due: null, sla_resolution_due: null };
  const start = parseSqlDate(createdAt) || new Date();
  const plus = (hours) => sqlDate(new Date(start.getTime() + hours * 3600 * 1000));
  return {
    sla_response_due: plus(policy.first_response_hours),
    sla_resolution_due: plus(policy.resolution_hours),
  };
}

const LIST_SQL = `
  SELECT t.*,
         c.name  AS customer_name,
         c.email AS customer_email,
         c.company AS customer_company,
         c.plan  AS customer_plan,
         u.name  AS assignee_name,
         u.color AS assignee_color,
         (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id AND m.is_internal = 0) AS message_count,
         (SELECT MAX(created_at) FROM ticket_messages m WHERE m.ticket_id = t.id) AS last_message_at,
         (SELECT GROUP_CONCAT(tg.id || ':' || tg.name || ':' || tg.color, '|')
            FROM ticket_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.ticket_id = t.id) AS tags_raw
  FROM tickets t
  JOIN customers c ON c.id = t.customer_id
  LEFT JOIN users u ON u.id = t.assignee_id
`;

export { LIST_SQL };

/**
 * Add computed fields to a raw ticket row: formatted ref, parsed tags and the
 * SLA state for both first response and resolution.
 *   'met'      target was hit in time
 *   'breached' target missed (still open past due, or hit late)
 *   'due_soon' less than 25% of the window remains
 *   'ok'       on track
 *   'paused'   not applicable (pending on customer / closed with no target)
 */
export function decorate(row) {
  if (!row) return row;
  const now = new Date();
  const tags = row.tags_raw
    ? row.tags_raw.split('|').map((s) => {
        const [id, name, color] = s.split(':');
        return { id: Number(id), name, color };
      })
    : [];

  const slaState = (due, doneAt, paused) => {
    if (!due) return 'none';
    const dueDate = parseSqlDate(due);
    if (doneAt) return parseSqlDate(doneAt) <= dueDate ? 'met' : 'breached';
    if (paused) return 'paused';
    const created = parseSqlDate(row.created_at);
    if (now > dueDate) return 'breached';
    const total = dueDate - created;
    const remaining = dueDate - now;
    return remaining / total < 0.25 ? 'due_soon' : 'ok';
  };

  const finished = row.resolved_at || row.closed_at;
  const responseState = slaState(row.sla_response_due, row.first_response_at || (finished ? row.resolved_at || row.closed_at : null), false);
  const resolutionState = slaState(row.sla_resolution_due, finished, row.status === 'pending');

  const { tags_raw, ...rest } = row;
  return {
    ...rest,
    ref: ticketRef(row.number),
    tags,
    sla: { response: responseState, resolution: resolutionState },
  };
}

export function getTicket(id) {
  return decorate(db.prepare(`${LIST_SQL} WHERE t.id = ?`).get(id));
}

export function addEvent({ ticketId, actorId, type, from = null, to = null, createdAt = null }) {
  const sql = createdAt
    ? 'INSERT INTO ticket_events (ticket_id, actor_id, type, from_value, to_value, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    : 'INSERT INTO ticket_events (ticket_id, actor_id, type, from_value, to_value) VALUES (?, ?, ?, ?, ?)';
  const params = createdAt ? [ticketId, actorId, type, from, to, createdAt] : [ticketId, actorId, type, from, to];
  return db.prepare(sql).run(...params).lastInsertRowid;
}
