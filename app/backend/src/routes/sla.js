import { Router } from 'express';
import db from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { broadcast } from '../websocket/hub.js';
import { PRIORITIES } from '../services/tickets.js';

const router = Router();

const ORDER = "CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END";

router.get('/', (req, res) => res.json(db.prepare(`SELECT * FROM sla_policies ORDER BY ${ORDER}`).all()));

// Replace all policies at once. Due dates on existing tickets are not
// rewritten; new/re-prioritized tickets pick up the new targets.
router.put('/', requireAdmin, (req, res) => {
  const policies = Array.isArray(req.body) ? req.body : [];
  const update = db.prepare('UPDATE sla_policies SET first_response_hours = ?, resolution_hours = ? WHERE priority = ?');
  const tx = db.transaction(() => {
    for (const p of policies) {
      if (!PRIORITIES.includes(p.priority)) continue;
      const fr = Number(p.first_response_hours);
      const rs = Number(p.resolution_hours);
      if (!(fr > 0) || !(rs > 0)) throw new Error('SLA hours must be positive numbers');
      update.run(fr, rs, p.priority);
    }
  });
  try {
    tx();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  const rows = db.prepare(`SELECT * FROM sla_policies ORDER BY ${ORDER}`).all();
  broadcast('sla.updated', rows);
  res.json(rows);
});

export default router;
