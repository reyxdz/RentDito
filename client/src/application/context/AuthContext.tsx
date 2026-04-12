/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User } from '../../domain/entities/User';
import { authService } from '../../infrastructure/services/AuthService';
import type { RegisterPayload } from '../../domain/repositories/AuthRepository';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // ─── Session Hydration ──────────────────────────────────────
  // On mount, attempt to validate the existing session by calling
  // refresh (to rotate the token pair) and then getMe to load the user.
  useEffect(() => {
    const hydrateSession = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        // Validate session by refreshing the token pair
        const refreshResponse = await authService.refresh(storedRefreshToken);
        localStorage.setItem('accessToken', refreshResponse.accessToken);
        if (refreshResponse.refreshToken) {
          localStorage.setItem('refreshToken', refreshResponse.refreshToken);
        }

        // Fetch the full user profile (includes activeTenancy)
        const currentUser = await authService.getMe();
        setUser(currentUser);
      } catch {
        // Session is invalid — clear tokens silently
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    hydrateSession();
  }, []);

  // ─── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const response = await authService.login(email, password);

    // Persist tokens
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    setUser(response.user);
    return response.user;
  }, []);

  // ─── Register ───────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload): Promise<User> => {
    const response = await authService.register(payload);

    // Persist tokens
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);

    setUser(response.user);
    return response.user;
  }, []);

  // ─── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Server logout may fail if the token is already expired — that's fine
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
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
