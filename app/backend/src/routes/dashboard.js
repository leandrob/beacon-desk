import { Router } from 'express';
import db from '../db/index.js';
import { LIST_SQL, decorate } from '../services/tickets.js';

const router = Router();

router.get('/', (req, res) => {
  const count = (where = '1=1', ...params) => db.prepare(`SELECT COUNT(*) AS c FROM tickets t WHERE ${where}`).get(...params).c;

  const openWhere = "t.status NOT IN ('resolved','closed')";
  const byStatus = {};
  for (const s of ['open', 'pending', 'in_progress', 'resolved', 'closed']) byStatus[s] = count('t.status = ?', s);

  const byPriority = {};
  for (const p of ['urgent', 'high', 'normal', 'low']) byPriority[p] = count(`${openWhere} AND t.priority = ?`, p);

  const totalOpen = count(openWhere);
  const unassigned = count(`${openWhere} AND t.assignee_id IS NULL`);
  const mine = count(`${openWhere} AND t.assignee_id = ?`, req.user.id);
  const breached = count(
    `${openWhere} AND ((t.sla_resolution_due < datetime('now') AND t.status != 'pending') OR (t.first_response_at IS NULL AND t.sla_response_due < datetime('now')))`
  );
  const awaitingFirstResponse = count(`${openWhere} AND t.first_response_at IS NULL`);
  const resolvedToday = count("t.resolved_at >= date('now')");
  const createdToday = count("t.created_at >= date('now')");

  // Averages over the last 30 days, in hours.
  const avg = (expr, where) =>
    db.prepare(`SELECT AVG((julianday(${expr}) - julianday(t.created_at)) * 24) AS h FROM tickets t WHERE ${where}`).get().h;
  const avgFirstResponseHours = avg('t.first_response_at', "t.first_response_at IS NOT NULL AND t.created_at >= datetime('now','-30 days')");
  const avgResolutionHours = avg('t.resolved_at', "t.resolved_at IS NOT NULL AND t.created_at >= datetime('now','-30 days')");

  // SLA attainment (resolved in the last 30 days, resolved before target).
  const slaRow = db
    .prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN t.resolved_at <= t.sla_resolution_due THEN 1 ELSE 0 END) AS met
       FROM tickets t WHERE t.resolved_at IS NOT NULL AND t.created_at >= datetime('now','-30 days')`
    )
    .get();
  const slaAttainment = slaRow.total ? Math.round((slaRow.met / slaRow.total) * 100) : null;

  // Daily volume for the last 14 days: created vs resolved.
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const createdRows = db.prepare("SELECT date(created_at) AS d, COUNT(*) AS c FROM tickets WHERE created_at >= date('now','-13 days') GROUP BY d").all();
  const resolvedRows = db.prepare("SELECT date(resolved_at) AS d, COUNT(*) AS c FROM tickets WHERE resolved_at >= date('now','-13 days') GROUP BY d").all();
  const cMap = Object.fromEntries(createdRows.map((r) => [r.d, r.c]));
  const rMap = Object.fromEntries(resolvedRows.map((r) => [r.d, r.c]));
  const volume = days.map((d) => ({ date: d, created: cMap[d] || 0, resolved: rMap[d] || 0 }));

  // Category breakdown of open tickets.
  const byCategory = db
    .prepare(`SELECT COALESCE(t.category,'other') AS category, COUNT(*) AS count FROM tickets t WHERE ${openWhere} GROUP BY category ORDER BY count DESC`)
    .all();

  // Agent workload.
  const agents = db
    .prepare(
      `SELECT u.id, u.name, u.color,
              (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.status NOT IN ('resolved','closed')) AS open,
              (SELECT COUNT(*) FROM tickets t WHERE t.assignee_id = u.id AND t.resolved_at >= datetime('now','-7 days')) AS resolved_week
       FROM users u ORDER BY open DESC, u.name`
    )
    .all();

  // Tickets that need attention: breaching or urgent, oldest first.
  const attention = db
    .prepare(
      `${LIST_SQL} WHERE ${openWhere} AND (t.priority = 'urgent'
         OR (t.sla_resolution_due < datetime('now') AND t.status != 'pending')
         OR (t.first_response_at IS NULL AND t.sla_response_due < datetime('now')))
       ORDER BY t.sla_resolution_due ASC LIMIT 8`
    )
    .all()
    .map(decorate);

  res.json({
    totalOpen, unassigned, mine, breached, awaitingFirstResponse, resolvedToday, createdToday,
    byStatus, byPriority, byCategory, volume, agents, attention,
    avgFirstResponseHours: avgFirstResponseHours == null ? null : Math.round(avgFirstResponseHours * 10) / 10,
    avgResolutionHours: avgResolutionHours == null ? null : Math.round(avgResolutionHours * 10) / 10,
    slaAttainment,
    totalCustomers: db.prepare('SELECT COUNT(*) AS c FROM customers').get().c,
    publishedArticles: db.prepare('SELECT COUNT(*) AS c FROM articles WHERE published = 1').get().c,
  });
});

export default router;
