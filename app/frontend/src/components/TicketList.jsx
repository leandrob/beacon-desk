import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/lib/format';
import { priorityMeta } from '@/lib/constants';
import { StatusBadge, PriorityBadge, SlaBadge, TagChip, TicketRef } from '@/components/Badges';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Dense ticket list. Each row links to the ticket detail. When `selectable`
 * is set, rows show a checkbox and `selected` (Set of ids) drives state.
 */
export function TicketList({ tickets, selectable = false, selected, onToggle, onToggleAll, compact = false }) {
  const allSelected = selectable && tickets.length > 0 && tickets.every((t) => selected?.has(t.id));
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {selectable && (
        <div className="flex items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
          <span>{selected?.size ? `${selected.size} selected` : `${tickets.length} tickets`}</span>
        </div>
      )}
      <ul className="divide-y">
        {tickets.map((t) => {
          const isSelected = selected?.has(t.id);
          const slaState = t.status === 'resolved' || t.status === 'closed' ? t.sla.resolution : t.first_response_at ? t.sla.resolution : t.sla.response;
          const slaDue = t.first_response_at ? t.sla_resolution_due : t.sla_response_due;
          return (
            <li key={t.id} className={cn('relative flex items-center gap-3 pr-4 transition-colors hover:bg-accent/40', isSelected && 'bg-primary/5')}>
              <span className={cn('absolute inset-y-0 left-0 w-[3px]', priorityMeta(t.priority).stripe)} />
              {selectable && (
                <div className="pl-4">
                  <Checkbox checked={Boolean(isSelected)} onCheckedChange={() => onToggle(t.id)} aria-label={`Select BD-${t.number}`} />
                </div>
              )}
              <Link to={`/tickets/${t.id}`} className={cn('flex min-w-0 flex-1 items-center gap-4 py-3', !selectable && 'pl-5')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TicketRef number={t.number} />
                    <span className="truncate font-medium text-foreground">{t.subject}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="truncate">{t.customer_name}{t.customer_company ? ` · ${t.customer_company}` : ''}</span>
                    {!compact && t.tags?.map((tag) => <TagChip key={tag.id} tag={tag} />)}
                  </div>
                </div>
                <div className="hidden items-center gap-3 md:flex">
                  {!compact && <SlaBadge state={slaState} due={slaDue} />}
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
                <div className="hidden w-16 items-center justify-end gap-1 text-xs text-muted-foreground lg:flex">
                  <MessageSquare className="h-3.5 w-3.5" /> {t.message_count}
                </div>
                <div className="hidden w-24 text-right text-xs text-muted-foreground lg:block">{formatRelative(t.updated_at)}</div>
                <AgentAvatar name={t.assignee_name} color={t.assignee_color} />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
