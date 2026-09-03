import { format, formatDistanceToNow, formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';

export function toDate(value) {
  if (!value) return null;
  // SQLite returns "YYYY-MM-DD HH:MM:SS" (UTC); normalize to ISO for parsing.
  const iso = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

/** e.g. "Jun 16, 2026". */
export function formatDate(value) {
  const d = toDate(value);
  return d ? format(d, 'MMM d, yyyy') : '—';
}

/** e.g. "Jun 16, 14:05". */
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? format(d, 'MMM d, HH:mm') : '—';
}

/** Relative time, e.g. "3 hours ago". */
export function formatRelative(value) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '';
}

/** Compact countdown/overdue text for SLA targets: "in 2h" / "3d overdue". */
export function formatDue(value) {
  const d = toDate(value);
  if (!d) return '';
  const past = d < new Date();
  const dist = formatDistanceToNowStrict(d);
  return past ? `${dist} overdue` : `in ${dist}`;
}

/** Hours → "2.5h" or "3d 4h". */
export function formatHours(hours) {
  if (hours == null) return '—';
  if (hours < 24) return `${Math.round(hours * 10) / 10}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Initials from a full name. */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}
