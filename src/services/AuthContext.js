import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('aga_token');
    if (token) {
      authAPI.me()
        .then(r => setUser(r.data.data))
        .catch(() => {
          localStorage.removeItem('aga_token');
          localStorage.removeItem('aga_refresh');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const r = await authAPI.login({ email, password });
    const { token, refreshToken, user: userData } = r.data.data;
    localStorage.setItem('aga_token', token);
    if (refreshToken) localStorage.setItem('aga_refresh', refreshToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('aga_token');
    localStorage.removeItem('aga_refresh');
    setUser(null);
  };

  // ── Permission helpers ──────────────────────────────────────
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin      = user && ['SUPER_ADMIN','ADMIN'].includes(user.role);
  const isManager    = user && ['SUPER_ADMIN','ADMIN','MANAGER'].includes(user.role);
  const isStaff      = user && ['SUPER_ADMIN','ADMIN','MANAGER','EMPLOYEE'].includes(user.role);

  /**
   * Check if current user has a specific permission.
   * SUPER_ADMIN always returns true.
   * Permission string like "VIEW_LEADS", "EDIT_CUSTOMERS" etc.
   */
  const hasPermission = useCallback((perm) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = user.permissions || [];
    if (perms.includes('ALL')) return true;
    return perms.includes(perm);
  }, [user]);

  /**
   * Check if user can VIEW a section (includes admin/manager by default)
   */
  const canView = useCallback((section) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = user.permissions || [];
    if (perms.includes('ALL')) return true;
    return perms.includes(`VIEW_${section}`) || perms.includes(`EDIT_${section}`);
  }, [user]);

  /**
   * Check if user can EDIT/CREATE/DELETE in a section
   */
  const canEdit = useCallback((section) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = user.permissions || [];
    if (perms.includes('ALL')) return true;
    return perms.includes(`EDIT_${section}`);
  }, [user]);

  /**
   * Check if user can manage other users (create accounts, set permissions)
   */
  const canManageUsers = useCallback(() => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    const perms = user.permissions || [];
    return perms.includes('ALL') || perms.includes('MANAGE_USERS');
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout,
      isSuperAdmin, isAdmin, isManager, isStaff,
      hasPermission, canView, canEdit, canManageUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
