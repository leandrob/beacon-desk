import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, Pencil, Plus, Ticket } from 'lucide-react';
import { api } from '@/lib/api';
import { useRealtime } from '@/hooks/useWebSocket';
import { formatDate } from '@/lib/format';
import { PageLoader } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { PlanBadge } from '@/components/Badges';
import { TicketList } from '@/components/TicketList';
import { CustomerFormDialog } from '@/components/forms/CustomerFormDialog';
import { TicketFormDialog } from '@/components/forms/TicketFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);

  const load = useCallback(() => api.get(`/customers/${id}`).then(setCustomer).catch((e) => { toast.error(e.message); navigate('/customers'); }), [id, navigate]);
  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  useRealtime(['customer.updated', 'ticket.created', 'ticket.updated', 'ticket.deleted', 'message.created'], load);

  if (loading || !customer) return <PageLoader />;

  const open = customer.tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
  const done = customer.tickets.filter((t) => ['resolved', 'closed'].includes(t.status));

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Customers</Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-xl font-bold text-primary ring-1 ring-primary/30">{customer.name[0]}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{customer.name}</h1>
              <PlanBadge plan={customer.plan} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {customer.email}</span>
              {customer.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {customer.phone}</span>}
              {customer.company && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {customer.company}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button onClick={() => setTicketOpen(true)}><Plus className="h-4 w-4" /> New ticket</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Open tickets · {open.length}</h2>
            {open.length ? <TicketList tickets={open} /> : <EmptyState icon={Ticket} title="No open tickets" description="Everything from this customer has been resolved." className="py-10" />}
          </section>
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">History · {done.length}</h2>
              <TicketList tickets={done} compact />
            </section>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer since</span><span>{formatDate(customer.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total tickets</span><span className="font-mono">{customer.ticket_count}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Open</span><span className="font-mono">{customer.open_count}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Internal notes</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {customer.notes ? <p className="whitespace-pre-wrap">{customer.notes}</p> : <p className="text-muted-foreground">No notes yet. Add context for other agents via Edit.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} onSaved={load} />
      <TicketFormDialog open={ticketOpen} onOpenChange={setTicketOpen} customerId={customer.id} onSaved={(t) => navigate(`/tickets/${t.id}`)} />
    </div>
  );
}
