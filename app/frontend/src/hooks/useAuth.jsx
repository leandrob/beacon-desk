import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import Faustine from '@faustine-ai/web-agent';
import { api, getToken, setToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        const { user } = await api.get('/auth/me');
        if (active) setUser(user);
      } catch {
        setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('desk:unauthorized', onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('desk:unauthorized', onUnauthorized);
    };
  }, []);

  // Only start the Faustine web agent once the user is authenticated, and only
  // when an agent id is configured for this deployment.
  const faustineStarted = useRef(false);
  useEffect(() => {
    const agentId = import.meta.env.VITE_FAUSTINE_AGENT_ID;
    if (user && agentId && !faustineStarted.current) {
      faustineStarted.current = true;
      Faustine.init({ agentId });
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
