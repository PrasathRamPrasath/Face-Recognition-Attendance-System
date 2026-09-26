import { createContext } from 'react';
import type { AuthUser } from '../types';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  adminCode: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  refreshSession: (data: AuthUser & { token: string }) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
