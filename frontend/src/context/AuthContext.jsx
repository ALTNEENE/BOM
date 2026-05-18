import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, login as loginApi, logout as logoutApi, register as registerApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore session
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      getMe()
        .then(({ data }) => setUser(data.data?.user || data.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await loginApi(credentials);
    const payload = data.data;
    if (payload?.accessToken) localStorage.setItem('accessToken', payload.accessToken);
    if (payload?.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken);
    setUser(payload?.user);
    return payload;
  }, []);

  const register = useCallback(async (credentials) => {
    const { data } = await registerApi(credentials);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await logoutApi(); } catch (_) {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
