import bcrypt from 'bcryptjs';
import db, { initSchema } from './index.js';
import { migrate } from './migrate.js';
import { slaDueDates, sqlDate, ticketRef } from '../services/tickets.js';

/**
 * Seed the database with agents, customers, a knowledge base, macros and a
 * realistic backlog of tickets spread over the last ~30 days. Timestamps are
 * relative to "now" so SLA timers look alive in the demo.
 *
 * The data itself lives in ./seed-data/<profile>.js so several deployments of
 * the same build can show different content. Pick a profile with
 * SEED_PROFILE (default: "analytics").
 *
 * Safe to run multiple times: it only seeds when the database is empty.
 */
export const PROFILES = ['analytics', 'commerce'];

export async function seed({ force = false, profile = process.env.SEED_PROFILE || 'analytics' } = {}) {
  initSchema();
  migrate();

  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0 && !force) return { seeded: false };

  if (!PROFILES.includes(profile)) throw new Error(`Unknown SEED_PROFILE "${profile}". Valid: ${PROFILES.join(', ')}`);
  const data = await import(`./seed-data/${profile}.js`);

  if (force) {
    for (const t of ['activities', 'ticket_tags', 'ticket_events', 'ticket_messages', 'tickets', 'tags', 'macros', 'articles', 'customers', 'users']) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  }

  const now = Date.now();
  const ago = (hours) => sqlDate(new Date(now - hours * 3600 * 1000));

  // Passwords come from the environment so deployed instances can set them
  // as secrets instead of shipping them in source.
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const agentPassword = process.env.AGENT_PASSWORD || 'agent123';

  const tx = db.transaction(() => {
    // --- Agents -----------------------------------------------------------
    const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, title, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const agents = data.agents;
    const A = agents.map((a) =>
      insertUser.run(a[0], a[1], bcrypt.hashSync(a[3] === 'admin' ? adminPassword : agentPassword, 10), a[3], a[4], a[5], ago(24 * 90)).lastInsertRowid
    );

    // --- Customers --------------------------------------------------------
    const insertCustomer = db.prepare('INSERT INTO customers (name, email, company, plan, phone, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const customers = data.customers;
    const C = customers.map((c, i) => insertCustomer.run(...c, ago(24 * (60 - i * 3))).lastInsertRowid);

    // --- Tags -------------------------------------------------------------
    const insertTag = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
    const T = {};
    for (const [name, color] of data.tags) T[name] = insertTag.run(name, color).lastInsertRowid;

    // --- Macros -----------------------------------------------------------
    const insertMacro = db.prepare('INSERT INTO macros (title, shortcut, body) VALUES (?, ?, ?)');
    for (const m of data.macros) insertMacro.run(...m);

    // --- Knowledge base ---------------------------------------------------
    const insertArticle = db.prepare('INSERT INTO articles (title, slug, category, body, published, views, author_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    data.articles.forEach((a, i) => {
      const [title, slug, category, body, published, views, author] = a;
      insertArticle.run(title, slug, category, body, published, views, A[author], ago(24 * (45 - i * 4)), ago(24 * (20 - i * 2)));
    });

    // --- Tickets ----------------------------------------------------------
    const insertTicket = db.prepare(
      `INSERT INTO tickets (number, subject, status, priority, channel, category, customer_id, assignee_id, first_response_at, resolved_at, closed_at, sla_response_due, sla_resolution_due, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMessage = db.prepare('INSERT INTO ticket_messages (ticket_id, author_type, author_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insertEvent = db.prepare('INSERT INTO ticket_events (ticket_id, actor_id, type, from_value, to_value, created_at) VALUES (?, ?, ?, ?, ?, ?)');
    const insertTicketTag = db.prepare('INSERT OR IGNORE INTO ticket_tags (ticket_id, tag_id) VALUES (?, ?)');
    const insertActivity = db.prepare('INSERT INTO activities (type, message, entity_type, entity_id, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');

    let number = 1000;

    /**
     * Create a ticket with a conversation. `thread` entries are
     * { c: 'customer' | agentIndex, at: hoursAfterCreation, body, note?: true, status? }.
     */
    function ticket({ subject, customer, priority = 'normal', channel = 'email', category = 'other', status = 'open', assignee = null, createdAgo, tags = [], thread, resolvedAgo = null, closedAgo = null }) {
      number += 1;
      const createdAt = ago(createdAgo);
      const sla = slaDueDates(priority, createdAt);
      const customerId = C[customer];
      const assigneeId = assignee == null ? null : A[assignee];
      const opener = thread[0];
      const replies = thread.slice(1);

      const firstAgentReply = replies.find((m) => m.c !== 'customer' && !m.note);
      const firstResponseAt = firstAgentReply ? ago(createdAgo - firstAgentReply.at) : null;
      const resolvedAt = resolvedAgo != null ? ago(resolvedAgo) : closedAgo != null ? ago(closedAgo) : null;
      const closedAt = closedAgo != null ? ago(closedAgo) : null;
      const lastAt = replies.length ? ago(createdAgo - replies[replies.length - 1].at) : createdAt;
      const updatedAt = resolvedAt && resolvedAt > lastAt ? resolvedAt : lastAt;

      const id = insertTicket.run(number, subject, status, priority, channel, category, customerId, assigneeId, firstResponseAt, resolvedAt, closedAt, sla.sla_response_due, sla.sla_resolution_due, createdAt, updatedAt).lastInsertRowid;

      insertMessage.run(id, 'customer', customerId, opener.body, 0, createdAt);
      insertEvent.run(id, null, 'created', null, null, createdAt);
      insertActivity.run('ticket.created', `${ticketRef(number)} "${subject}" opened for ${customers[customer][0]}`, 'ticket', id, null, createdAt);
      if (assigneeId) insertEvent.run(id, A[0], 'assignee', null, agents[assignee][0], ago(createdAgo - 0.2));
      for (const t of tags) {
        if (!T[t]) throw new Error(`Seed profile references unknown tag "${t}"`);
        insertTicketTag.run(id, T[t]);
      }

      let currentStatus = 'open';
      for (const m of replies) {
        const at = ago(createdAgo - m.at);
        const isAgent = m.c !== 'customer';
        insertMessage.run(id, isAgent ? 'agent' : 'customer', isAgent ? A[m.c] : customerId, m.body, m.note ? 1 : 0, at);
        if (isAgent && !m.note) {
          insertActivity.run('ticket.replied', `${ticketRef(number)} replied by ${agents[m.c][0]}`, 'ticket', id, A[m.c], at);
          if (m.status && m.status !== currentStatus) {
            insertEvent.run(id, A[m.c], 'status', currentStatus, m.status, at);
            currentStatus = m.status;
          }
        } else if (!isAgent) {
          insertActivity.run('ticket.customer_replied', `${customers[customer][0]} replied on ${ticketRef(number)}`, 'ticket', id, null, at);
          if (currentStatus === 'pending') {
            insertEvent.run(id, null, 'status', 'pending', 'open', at);
            currentStatus = 'open';
          }
        }
      }
      if (status !== currentStatus) {
        const at = resolvedAt || updatedAt;
        insertEvent.run(id, assigneeId || A[0], 'status', currentStatus, status, at);
        if (status === 'resolved' || status === 'closed') {
          insertActivity.run('ticket.status', `${ticketRef(number)} moved to ${status}`, 'ticket', id, assigneeId || A[0], at);
        }
      }
      return id;
    }

    for (const t of data.tickets) ticket(t);

    // Extra volume to make the charts interesting -------------------------------
    data.filler.forEach((f, i) => {
      const [subject, category, priority, channel, tags] = f;
      const isResolved = i % 3 !== 0;
      // Resolved tickets are spread over ~28 days; still-open ones are recent
      // so only a handful of them are past their SLA.
      const createdAgo = isResolved ? 12 + i * 31 + (i % 3) * 7 : 2 + i * 2.5;
      const isClosed = isResolved && i % 2 === 0;
      const assignee = i % agents.length;
      const responseAt = priority === 'high' ? 1 + (i % 3) : 3 + (i % 6);
      const resolveAt = responseAt + 4 + (i % 5) * 9;
      const thread = [{ c: 'customer', body: `${data.openers[category] || ''}${subject.toLowerCase()}. Please advise.` }];
      if (isResolved || i % 2 === 0) {
        thread.push({ c: assignee, at: responseAt, body: `Hi, thanks for reaching out — I'm looking into "${subject.toLowerCase()}" now and will get back to you shortly.` });
      }
      if (isResolved) {
        thread.push({ c: 'customer', at: resolveAt - 1, body: 'Any update on this?' });
        thread.push({ c: assignee, at: resolveAt, body: data.resolvedReplies[i % data.resolvedReplies.length], status: 'resolved' });
      }
      ticket({
        subject, customer: (i * 5) % C.length, priority, channel, category,
        status: isClosed ? 'closed' : isResolved ? 'resolved' : i % 2 === 0 ? 'in_progress' : 'open',
        assignee: isResolved || i % 2 === 0 ? assignee : null,
        createdAgo, tags, thread,
        resolvedAgo: isResolved ? Math.max(createdAgo - resolveAt, 0.5) : null,
        closedAgo: isClosed ? Math.max(createdAgo - resolveAt - 24, 0.25) : null,
      });
    });
  });

  tx();
  console.log(`Seeded demo data (profile: ${profile}).`);
  return { seeded: true, profile };
}

// Allow running directly: `node src/db/seed.js [--force] [--profile analytics|commerce]`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const force = process.argv.includes('--force');
  const pi = process.argv.indexOf('--profile');
  const profile = pi > -1 ? process.argv[pi + 1] : undefined;
  seed({ force, profile }).then((result) => {
    console.log(result.seeded ? 'Database seeded.' : 'Database already has data. Use --force to re-seed.');
  });
}
