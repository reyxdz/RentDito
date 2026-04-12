/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import type { User, Tenancy } from '../../domain/entities/User';
import type { RegisterPayload, AuthResponse } from '../../domain/repositories/AuthRepository';
import { authService } from '../../infrastructure/services/AuthService';

// ─── Token helpers ───────────────────────────────────────────
const TOKEN_KEYS = {
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
} as const;

const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
};

const getRefreshToken = (): string | null =>
  localStorage.getItem(TOKEN_KEYS.REFRESH);

// ─── Context types ───────────────────────────────────────────

/** Extended user object that includes the activeTenancy field */
export interface AuthUser extends User {
  activeTenancy: Tenancy | null;
}

export interface AuthContextType {
  /** Current authenticated user (null when logged out or hydrating) */
  user: AuthUser | null;

  /** True when the initial session hydration is in progress */
  isLoading: boolean;

  /** Convenience boolean derived from `user` */
  isAuthenticated: boolean;

  /** Authenticate with email + password. Returns the user on success. */
  login: (email: string, password: string) => Promise<AuthUser>;

  /** Register a new user account. Returns the user on success. */
  register: (payload: RegisterPayload) => Promise<AuthUser>;

  /** Log out, clear tokens, and reset state. */
  logout: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Normalize the user object returned by the API to include `activeTenancy`.
 * The backend may or may not populate it — we default to `null`.
 */
const toAuthUser = (user: User): AuthUser => ({
  ...user,
  activeTenancy: user.activeTenancy ?? null,
});

// ─── Provider ────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hydrationAttempted = useRef(false);

  // ── Session hydration on mount ───────────────────────────
  // On initial render, try to validate the stored refresh token
  // by calling POST /api/auth/refresh. If successful, the user
  // is re-authenticated silently. If it fails (expired/invalid),
  // we clear stored tokens and show the guest state.
  useEffect(() => {
    if (hydrationAttempted.current) return;
    hydrationAttempted.current = true;

    const hydrate = async () => {
      const storedRefresh = getRefreshToken();
      if (!storedRefresh) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await authService.refresh(storedRefresh);
        // Persist rotated tokens
        setTokens(result.accessToken, result.refreshToken ?? storedRefresh);

        // The refresh endpoint returns the user object for hydration
        const userFromRefresh = (result as AuthResponse).user;
        if (userFromRefresh) {
          setUser(toAuthUser(userFromRefresh));
        }
      } catch {
        // Refresh token invalid/expired → clean slate
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    hydrate();
  }, []);

  // ── Login ────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const { user: apiUser, accessToken, refreshToken } = await authService.login(email, password);
    setTokens(accessToken, refreshToken);
    const authUser = toAuthUser(apiUser);
    setUser(authUser);
    return authUser;
  }, []);

  // ── Register ─────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload): Promise<AuthUser> => {
    const { user: apiUser, accessToken, refreshToken } = await authService.register(payload);
    setTokens(accessToken, refreshToken);
    const authUser = toAuthUser(apiUser);
    setUser(authUser);
    return authUser;
  }, []);

  // ── Logout ───────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, we still clear local state
    }
    clearTokens();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
