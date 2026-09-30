import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: UserRole) => Promise<void>;
  can: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('astryx_user');
    const token = localStorage.getItem('astryx_auth_token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        api.auth.logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    setUser(res.user);
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const switchDemoUser = async (role: UserRole) => {
    const credentials: Record<UserRole, { email: string; pass: string }> = {
      admin: { email: 'admin@example.com', pass: 'admin123' },
      manager: { email: 'manager@example.com', pass: 'manager123' },
      staff: { email: 'staff@example.com', pass: 'staff123' },
    };

    const { email, pass } = credentials[role];
    await login(email, pass);
  };

  const can = (action: string): boolean => {
    if (!user) return false;
    const { role } = user;

    if (role === 'admin') return true;

    if (role === 'manager') {
      if (action === 'manage_users') return false;
      return true;
    }

    if (role === 'staff') {
      const allowedForStaff = [
        'view_inventory',
        'view_products',
        'view_transactions',
        'view_dashboard',
        'stock_in',
        'stock_out',
      ];
      return allowedForStaff.includes(action);
    }

    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchDemoUser,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
