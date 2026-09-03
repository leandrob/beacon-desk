import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Ticket, Users, BookOpen, Settings, Menu, X, LogOut, LifeBuoy, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket, useRealtime } from '@/hooks/useWebSocket';
import { AgentAvatar } from '@/components/AgentAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { TicketFormDialog } from '@/components/forms/TicketFormDialog';
import { toast } from '@/components/ui/sonner';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/kb', label: 'Knowledge base', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function NavItems({ onNavigate, vertical = false }) {
  return NAV.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-2 text-sm font-medium transition-colors',
          vertical ? 'rounded-md px-3 py-2' : 'h-14 px-3',
          isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          isActive && !vertical && 'after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary',
          isActive && vertical && 'bg-accent'
        )
      }
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </NavLink>
  ));
}

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Global toasts for things happening elsewhere (other agents / customers).
  useRealtime('ticket.created', (msg) => {
    toast(`New ticket ${msg.payload.ref}`, { description: msg.payload.subject, action: { label: 'Open', onClick: () => navigate(`/tickets/${msg.payload.id}`) } });
  });

  function submitSearch(e) {
    e.preventDefault();
    navigate(`/tickets${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <NavLink to="/" className="flex items-center gap-2">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LifeBuoy className="h-4.5 w-4.5" />
            </span>
            <span className="text-base font-extrabold tracking-tight">Beacon<span className="text-primary">Desk</span></span>
          </NavLink>

          <nav className="ml-4 hidden items-center lg:flex">
            <NavItems />
          </nav>

          <form onSubmit={submitSearch} className="relative ml-auto hidden w-64 md:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets, customers…" className="h-9 bg-card pl-9" />
          </form>

          <Button size="sm" onClick={() => setNewOpen(true)} className="ml-auto md:ml-0">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New ticket</span>
          </Button>

          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex" title={connected ? 'Realtime connected' : 'Reconnecting…'}>
            <span className="relative flex h-2 w-2">
              {connected && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-pulse-ring" />}
              <span className={cn('relative inline-flex h-2 w-2 rounded-full', connected ? 'bg-emerald-400' : 'bg-slate-500')} />
            </span>
            {connected ? 'Live' : 'Offline'}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <AgentAvatar name={user?.name} color={user?.color} size="md" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.name}</div>
                <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
                {user?.title && <div className="mt-1 text-xs font-normal text-primary">{user.title}</div>}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/tickets?assignee=me&view=open')}>
                <Ticket className="h-4 w-4" /> My queue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {mobileOpen && (
          <nav className="border-t bg-card p-2 lg:hidden">
            <NavItems vertical onNavigate={() => setMobileOpen(false)} />
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6 lg:p-8">{children}</main>

      <TicketFormDialog open={newOpen} onOpenChange={setNewOpen} onSaved={(t) => navigate(`/tickets/${t.id}`)} />
    </div>
  );
}
