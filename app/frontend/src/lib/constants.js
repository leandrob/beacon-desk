// Shared option lists and display metadata used across the app.

export const STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30', dot: '#38bdf8' },
  { value: 'pending', label: 'Pending', color: 'bg-violet-500/15 text-violet-300 border-violet-500/30', dot: '#a78bfa' },
  { value: 'in_progress', label: 'In progress', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: '#f5a524' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: '#34d399' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: '#64748b' },
];

export const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30', stripe: 'bg-slate-500', hex: '#64748b' },
  { value: 'normal', label: 'Normal', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30', stripe: 'bg-sky-400', hex: '#38bdf8' },
  { value: 'high', label: 'High', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', stripe: 'bg-orange-400', hex: '#fb923c' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30', stripe: 'bg-rose-500', hex: '#f43f5e' },
];

export const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Chat' },
  { value: 'web', label: 'Web form' },
  { value: 'phone', label: 'Phone' },
];

export const CATEGORIES = [
  { value: 'billing', label: 'Billing' },
  { value: 'bug', label: 'Bug' },
  { value: 'how_to', label: 'How-to' },
  { value: 'feature', label: 'Feature request' },
  { value: 'account', label: 'Account' },
  { value: 'other', label: 'Other' },
];

export const PLANS = [
  { value: 'free', label: 'Free', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { value: 'pro', label: 'Pro', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { value: 'enterprise', label: 'Enterprise', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
];

export const ARTICLE_CATEGORIES = [
  { value: 'getting_started', label: 'Getting started' },
  { value: 'how_to', label: 'How-to' },
  { value: 'account', label: 'Account & security' },
  { value: 'billing', label: 'Billing' },
  { value: 'api', label: 'API & developers' },
  { value: 'troubleshooting', label: 'Troubleshooting' },
  { value: 'general', label: 'General' },
];

export const SLA_STATES = {
  ok: { label: 'On track', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  due_soon: { label: 'Due soon', color: 'text-amber-300', bg: 'bg-amber-500/15 border-amber-500/30' },
  breached: { label: 'Breached', color: 'text-rose-300', bg: 'bg-rose-500/15 border-rose-500/30' },
  met: { label: 'Met', color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  paused: { label: 'Paused', color: 'text-slate-400', bg: 'bg-slate-500/15 border-slate-500/30' },
  none: { label: '—', color: 'text-slate-500', bg: 'bg-slate-500/10 border-slate-500/20' },
};

export const AGENT_COLORS = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#fb7185', '#fb923c', '#22d3ee', '#818cf8'];

const find = (list, value, fallback = 0) => list.find((x) => x.value === value) || list[fallback];
export const statusMeta = (v) => find(STATUSES, v);
export const priorityMeta = (v) => find(PRIORITIES, v, 1);
export const channelMeta = (v) => find(CHANNELS, v);
export const categoryMeta = (v) => find(CATEGORIES, v, 5);
export const planMeta = (v) => find(PLANS, v);
export const articleCategoryMeta = (v) => find(ARTICLE_CATEGORIES, v, 6);
export const slaMeta = (v) => SLA_STATES[v] || SLA_STATES.none;
