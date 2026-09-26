import { useEffect, useState, type ReactNode } from 'react';
import api from '../utils/api';
import type { AuthUser } from '../types';
import { AuthContext } from './authContextDefinition';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  adminCode: string;
}

const persistSession = (data: AuthUser & { token: string }) => {
  const { token, ...user } = data;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  return { token, user: user as AuthUser };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUserState(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/users/login', { email, password });
    const session = persistSession(data);
    setToken(session.token);
    setUserState(session.user);
  };

  const register = async (payload: RegisterPayload) => {
    const { data } = await api.post('/users/register', payload);
    const session = persistSession(data);
    setToken(session.token);
    setUserState(session.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUserState(null);
  };

  const setUser = (updated: AuthUser) => {
    localStorage.setItem('user', JSON.stringify(updated));
    setUserState(updated);
  };

  const refreshSession = (data: AuthUser & { token: string }) => {
    const session = persistSession(data);
    setToken(session.token);
    setUserState(session.user);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
