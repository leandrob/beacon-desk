import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TONES = {
  default: 'text-foreground',
  primary: 'text-primary',
  danger: 'text-rose-400',
  success: 'text-emerald-400',
  info: 'text-sky-400',
  warn: 'text-amber-300',
};

/** Compact KPI tile used on the dashboard. */
export function StatTile({ icon: Icon, label, value, sub, to, tone = 'default', className }) {
  const body = (
    <div className={cn('group relative overflow-hidden rounded-lg border bg-card p-4 transition-colors hover:border-primary/40', className)}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {Icon && <Icon className="h-4 w-4 opacity-60 transition-opacity group-hover:opacity-100" />}
      </div>
      <div className={cn('mt-2 font-mono text-3xl font-semibold tracking-tight', TONES[tone])}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}
