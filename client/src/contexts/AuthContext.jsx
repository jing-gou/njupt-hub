import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  try {
    const token = localStorage.getItem('auth_token') || '';
    const userRaw = localStorage.getItem('auth_user') || '';
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
  } catch {
    return { token: '', user: null };
  }
};

export const AuthProvider = ({ children }) => {
  const stored = readStoredAuth();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);

  const setAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem('auth_token', nextToken);
    else localStorage.removeItem('auth_token');
    if (nextUser) localStorage.setItem('auth_user', JSON.stringify(nextUser));
    else localStorage.removeItem('auth_user');
  };

  const login = useCallback(async ({ username, password }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `登录失败 (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    setAuth(data.token, data.user);
    return data;
  }, []);

  const register = useCallback(async ({ username, email, password, code }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, code }),
    });

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `注册失败 (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  }, []);

  const sendVerificationCode = useCallback(async (email) => {
    const res = await fetch('/api/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `发送验证码失败 (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  }, []);

  const sendResetPasswordCode = useCallback(async (email) => {
    const res = await fetch('/api/auth/send-reset-password-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `发送验证码失败 (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  }, []);

  const resetPassword = useCallback(async ({ email, code, newPassword }) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });

    let data = {};
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `重置密码失败 (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  }, []);

  const updateProfile = useCallback(async ({ username }) => {
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `修改资料失败 (${res.status})`);
    }
    if (data?.token && data?.user) setAuth(data.token, data.user);
    return data;
  }, [token]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    const res = await fetch('/api/auth/password', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `修改密码失败 (${res.status})`);
    }
    return data;
  }, [token]);

  const refreshMe = useCallback(async () => {
    if (!token) return null;
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `获取用户信息失败 (${res.status})`);
    }
    if (data?.user) setAuth(token, data.user);
    return data;
  }, [token]);

  const uploadAvatar = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch('/api/auth/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `上传头像失败 (${res.status})`);
    }
    if (data?.user) setAuth(token, data.user);
    return data;
  }, [token]);

  const logout = useCallback(() => setAuth('', null), []);

  const value = useMemo(
    () => ({ 
      token, 
      user, 
      isAuthed: Boolean(token), 
      login, 
      register, 
      logout, 
      setAuth, 
      sendVerificationCode,
      sendResetPasswordCode,
      resetPassword,
      updateProfile,
      changePassword,
      uploadAvatar,
      refreshMe
    }),
    [token, user, login, register, logout, sendVerificationCode, sendResetPasswordCode, resetPassword, updateProfile, changePassword, uploadAvatar, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('AuthProvider 缺失，请检查组件树中是否包含 AuthProvider');
  return ctx;
};
