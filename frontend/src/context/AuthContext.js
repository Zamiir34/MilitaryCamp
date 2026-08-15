import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });

      // If server requires email verification first
      if (data.requireVerification) {
        return {
          success: false,
          requireVerification: true,
          userId: data.userId,
          email: data.email,
        };
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyEmail = useCallback(async (userId, code) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { userId, code });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Invalid verification code' };
    } finally {
      setLoading(false);
    }
  }, []);

  const resendVerification = useCallback(async (userId) => {
    try {
      await api.post('/auth/resend-verification', { userId });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to resend code' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call backend to log the LOGOUT audit event
      await api.post('/auth/logout');
    } catch (_) {
      // Even if request fails, proceed with local logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const canAccess = useCallback((roles) => {
    if (!user) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.role);
  }, [user]);

  const toggleDuty = useCallback(async () => {
    try {
      const { data } = await api.put('/auth/duty');
      const updatedUser = { ...user, isOnDuty: data.isOnDuty };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: 'Failed to update duty status' };
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canAccess, toggleDuty, verifyEmail, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
