import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { WebSocketProvider } from '@/hooks/useWebSocket';
import { Layout } from '@/components/Layout';
import { PageLoader } from '@/components/Spinner';
import { Toaster } from '@/components/ui/sonner';

import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Tickets from '@/pages/Tickets';
import TicketDetail from '@/pages/TicketDetail';
import Customers from '@/pages/Customers';
import CustomerDetail from '@/pages/CustomerDetail';
import KnowledgeBase from '@/pages/KnowledgeBase';
import ArticleDetail from '@/pages/ArticleDetail';
import Settings from '@/pages/Settings';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster />
      </>
    );
  }

  return (
    <WebSocketProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/kb" element={<KnowledgeBase />} />
          <Route path="/kb/:id" element={<ArticleDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/:tab" element={<Settings />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <Toaster />
    </WebSocketProvider>
  );
}
