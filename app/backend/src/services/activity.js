import db from '../db/index.js';
import { broadcast } from '../websocket/hub.js';

/** Record an activity row and broadcast it to all clients in real time. */
export function logActivity({ type, message, entityType = null, entityId = null, actorId = null }) {
  const info = db
    .prepare('INSERT INTO activities (type, message, entity_type, entity_id, actor_id) VALUES (?, ?, ?, ?, ?)')
    .run(type, message, entityType, entityId, actorId);

  const activity = db
    .prepare('SELECT a.*, u.name AS actor_name FROM activities a LEFT JOIN users u ON u.id = a.actor_id WHERE a.id = ?')
    .get(info.lastInsertRowid);
  broadcast('activity.created', activity);
  return activity;
}
