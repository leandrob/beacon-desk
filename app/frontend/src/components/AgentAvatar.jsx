import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Small colored circle with initials. Renders a dashed placeholder when unassigned. */
export function AgentAvatar({ name, color, size = 'sm', className, title }) {
  const sizes = { xs: 'h-5 w-5 text-[9px]', sm: 'h-7 w-7 text-[11px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-sm' };
  if (!name) {
    return (
      <span title={title || 'Unassigned'} className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 text-muted-foreground', sizes[size], className)}>
        ?
      </span>
    );
  }
  return (
    <span
      title={title || name}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-slate-950 ring-2 ring-background', sizes[size], className)}
      style={{ background: color || '#f59e0b' }}
    >
      {initials(name)}
    </span>
  );
}
