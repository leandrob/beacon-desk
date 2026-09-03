import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, Building2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatRelative } from '@/lib/format';
import { PLANS } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PlanBadge } from '@/components/Badges';
import { CustomerFormDialog } from '@/components/forms/CustomerFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

const ALL = '__all__';

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api.get(`/customers${api.qs({ search, plan: plan === ALL ? '' : plan })}`).then(setRows).catch((e) => toast.error(e.message)), [search, plan]);

  useEffect(() => {
    const t = setTimeout(() => load().finally(() => setLoading(false)), 200);
    return () => clearTimeout(t);
  }, [load]);
  useRealtime(['customer.created', 'customer.updated', 'customer.deleted', 'ticket.created', 'ticket.updated'], load);

  async function confirmDelete() {
    try {
      await api.del(`/customers/${deleting.id}`);
      toast.success('Customer removed');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Directory" title="Customers" description="Everyone who has opened a ticket, and the plan they are on.">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> New customer</Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, company" className="bg-card pl-9" />
        </div>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-40 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All plans</SelectItem>{PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {loading ? (
        <PageLoader />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="Adjust your search or add a new customer." />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Total</TableHead>
                <TableHead className="hidden lg:table-cell">Last ticket</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link to={`/customers/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.company ? <span className="flex items-center gap-1.5 text-sm"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {c.company}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><PlanBadge plan={c.plan} /></TableCell>
                  <TableCell className="text-right font-mono">{c.open_count ? <span className="text-primary">{c.open_count}</span> : <span className="text-muted-foreground">0</span>}</TableCell>
                  <TableCell className="hidden text-right font-mono text-muted-foreground sm:table-cell">{c.ticket_count}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{c.last_ticket_at ? formatRelative(c.last_ticket_at) : '—'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditing(c); setFormOpen(true); }}><Pencil className="h-4 w-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(c)}><Trash2 className="h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerFormDialog open={formOpen} onOpenChange={setFormOpen} customer={editing} onSaved={load} />
      <ConfirmDialog open={Boolean(deleting)} onOpenChange={(v) => !v && setDeleting(null)} title="Delete customer?" description={deleting ? `This removes "${deleting.name}" and all of their tickets.` : ''} onConfirm={confirmDelete} />
    </div>
  );
}
