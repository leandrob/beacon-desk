import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { statusMeta, priorityMeta, planMeta, slaMeta } from '@/lib/constants';
import { formatDue } from '@/lib/format';
import { cn } from '@/lib/utils';

export function StatusBadge({ status, className }) {
  const meta = statusMeta(status);
  return (
    <Badge className={cn('gap-1.5 whitespace-nowrap', meta.color, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} />
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  const meta = priorityMeta(priority);
  return <Badge className={cn('whitespace-nowrap uppercase tracking-wide text-[10px]', meta.color, className)}>{meta.label}</Badge>;
}

export function PlanBadge({ plan }) {
  const meta = planMeta(plan);
  return <Badge className={meta.color}>{meta.label}</Badge>;
}

/** SLA indicator: colored state + due countdown. */
export function SlaBadge({ state, due, label }) {
  const meta = slaMeta(state);
  const showDue = due && (state === 'ok' || state === 'due_soon' || state === 'breached');
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium', meta.bg, meta.color)}>
      {label && <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>}
      {showDue ? formatDue(due) : meta.label}
    </span>
  );
}

/** Colored tag chip. Pass `onRemove` to render a remove button. */
export function TagChip({ tag, onRemove, onClick, active }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] leading-4',
        onClick && 'cursor-pointer hover:brightness-125',
        active && 'ring-1 ring-primary'
      )}
      style={{ borderColor: `${tag.color}55`, background: `${tag.color}1a`, color: tag.color }}
    >
      #{tag.name}
      {onRemove && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(tag); }} className="ml-0.5 opacity-70 hover:opacity-100" aria-label={`Remove ${tag.name}`}>
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/** Monospace ticket reference, e.g. BD-1042. */
export function TicketRef({ number, className }) {
  return <span className={cn('whitespace-nowrap font-mono text-xs font-semibold tracking-wide text-primary', className)}>BD-{number}</span>;
}
