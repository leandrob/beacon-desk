import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LifeBuoy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/ui/sonner';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="bg-grid absolute inset-0" />
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/50 md:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary/20 via-card to-card p-10 md:flex">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><LifeBuoy className="h-5 w-5" /></span>
            <span className="text-lg font-extrabold tracking-tight">Beacon<span className="text-primary">Desk</span></span>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Support operations</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight">Every ticket, every SLA, one console.</h2>
            <p className="mt-3 text-sm text-muted-foreground">Triage incoming requests, keep response times on target and give customers answers faster — with your whole team on the same page in real time.</p>
          </div>
          <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
            <li>▸ SLA timers per priority</li>
            <li>▸ Internal notes &amp; canned replies</li>
            <li>▸ Live updates across agents</li>
          </ul>
        </div>

        <div className="p-8 sm:p-10">
          <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Agent access to the support console.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Spinner className="h-4 w-4 text-primary-foreground" /> : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
