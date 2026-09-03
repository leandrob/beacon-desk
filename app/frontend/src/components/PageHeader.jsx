/** Consistent page title + subtitle + right-aligned actions. */
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">{eyebrow}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
