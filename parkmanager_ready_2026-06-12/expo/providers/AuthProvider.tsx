import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';
import type { User } from '@/types';

const AUTH_KEY = 'park_auth_user';
const LEGACY_ADMIN_LOGIN = 'admin';
const LEGACY_ADMIN_PASSWORD = 'admin';

const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  login: 'admin',
  name: 'Администратор',
  role: 'admin',
  active: true,
  createdAt: new Date().toISOString(),
};

type LoginResult = { success: boolean; error?: string; user?: User };

function normalizeLogin(login?: string | null): string {
  return (login ?? '').trim().toLowerCase();
}

function isActiveUser(user: User | undefined): user is User {
  return !!user && !user.deleted && user.active !== false;
}

function isPasswordValid(user: User, password: string): boolean {
  if (!password) return false;
  if (user.passwordHash) return password === user.passwordHash;
  if (user.role === 'admin') return password === LEGACY_ADMIN_PASSWORD || password === user.login;
  return password === user.login || password === '1234';
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  /* eslint-disable rork/general-context-optimization */
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY).then((data) => {
      if (data) {
        try {
          setCurrentUser(JSON.parse(data));
        } catch {
          console.log('[Auth] Failed to parse saved user');
        }
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const persistCurrentUser = useCallback(async (user: User) => {
    setCurrentUser(user);
    try {
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
      console.log('[Auth] User session saved to storage:', user.name);
    } catch (e) {
      console.log('[Auth] Failed to save user session to storage:', e);
    }
  }, []);

  const login = useCallback(async (loginStr: string, password: string, users: User[]): Promise<LoginResult> => {
    const normalized = normalizeLogin(loginStr);
    console.log('[Auth] Login attempt:', normalized, 'users available:', users.length);

    try {
      if (normalized === LEGACY_ADMIN_LOGIN && password === LEGACY_ADMIN_PASSWORD) {
        const adminUser = users.find(u => u.role === 'admin' && isActiveUser(u)) ?? DEFAULT_ADMIN;
        const userToSave = { ...adminUser };
        await persistCurrentUser(userToSave);
        return { success: true, user: userToSave };
      }

      const user = users.find(
        u => normalizeLogin(u.login) === normalized && isActiveUser(u)
      );

      if (!user) {
        console.log('[Auth] User not found or blocked:', normalized);
        return { success: false, error: 'Пользователь не найден или заблокирован' };
      }

      const passwordValid = isPasswordValid(user, password);

      if (passwordValid) {
        await persistCurrentUser(user);
        return { success: true, user };
      }

      console.log('[Auth] Invalid password for user:', normalized);
      return { success: false, error: 'Неверный пароль' };
    } catch (e) {
      console.log('[Auth] Login error:', e);
      return { success: false, error: 'Ошибка при входе. Попробуйте снова.' };
    }
  }, [persistCurrentUser]);

  const logout = useCallback(async () => {
    console.log('[Auth] Logging out...');
    setCurrentUser(null);
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      console.log('[Auth] Session removed from storage');
    } catch (e) {
      console.log('[Auth] Failed to remove session from storage:', e);
    }
  }, []);

  const updateCurrentUser = useCallback(async (updates: Partial<User>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  }, [currentUser]);

  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';

  return {
    currentUser,
    isLoading,
    isAdmin,
    isManager,
    login,
    logout,
    updateCurrentUser,
  };
});
