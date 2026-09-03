import db from './index.js';

// Default SLA targets (hours) used on fresh installs.
export const DEFAULT_SLA = [
  { priority: 'urgent', first_response_hours: 1, resolution_hours: 8 },
  { priority: 'high', first_response_hours: 4, resolution_hours: 24 },
  { priority: 'normal', first_response_hours: 8, resolution_hours: 72 },
  { priority: 'low', first_response_hours: 24, resolution_hours: 168 },
];

/**
 * Idempotent migration run at startup. Makes sure every priority has an SLA
 * policy so ticket due dates can always be computed.
 */
export function migrate() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO sla_policies (priority, first_response_hours, resolution_hours) VALUES (?, ?, ?)'
  );
  for (const p of DEFAULT_SLA) insert.run(p.priority, p.first_response_hours, p.resolution_hours);
}
