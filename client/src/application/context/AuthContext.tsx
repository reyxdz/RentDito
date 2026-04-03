/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext } from 'react';
import type { User } from '../../domain/entities/User';
import { authService } from '../../infrastructure/services/MockAuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check local storage for existing session explicitly mock
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('mockUserSession');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const isAuthenticated = !!user;

  const login = async (email: string, password: string) => {
    const domainUser = await authService.login(email, password);
    setUser(domainUser);
    localStorage.setItem('mockUserSession', JSON.stringify(domainUser));
    return domainUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockUserSession');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
