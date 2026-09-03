import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const rows = db
    .prepare('SELECT a.*, u.name AS actor_name FROM activities a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC, a.id DESC LIMIT ?')
    .all(limit);
  res.json(rows);
});

export default router;
