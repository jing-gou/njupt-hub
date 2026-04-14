import React, { useState } from 'react';
import { LogIn, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ onSuccess, onGoRegister, onGoForgotPassword }) {
  const { darkMode } = useTheme();
  const { isAuthed, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请填写用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await login({ username, password });
      onSuccess?.();
    } catch (err) {
      setError(err?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-180px)] flex items-center justify-center p-4 transition-colors duration-500 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${darkMode ? 'opacity-30' : ''}`}>
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-400/30'}`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-400/30'}`}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div
          className={`rounded-3xl border shadow-2xl p-8 space-y-8 backdrop-blur-xl ${
            darkMode
              ? 'bg-slate-800/70 border-slate-700/50 shadow-slate-900/50'
              : 'bg-white/70 border-white/50 shadow-blue-500/10'
          }`}
        >
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
              darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'
            } shadow-lg`}>
              <LogIn size={28} className="text-white" />
            </div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>欢迎回来</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAuthed ? '已登录，可前往个人中心' : '登录后可提交资源、查看个人信息'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>用户名</label>
              <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <User size={18} />
                </div>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode 
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>密码</label>
                <button
                  type="button"
                  onClick={() => onGoForgotPassword?.()}
                  className={`text-xs font-medium transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                >
                  忘记密码？
                </button>
              </div>
              <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <Lock size={18} />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full pl-12 pr-12 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode 
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20' 
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                  darkMode 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 shadow-lg shadow-blue-500/25' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/30'
                } ${loading ? 'opacity-60 cursor-not-allowed transform-none' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    登录中...
                  </span>
                ) : '登录'}
              </button>
            </div>
          </form>

          <div className={`text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            还没有账号？{' '}
            <button
              onClick={() => onGoRegister?.()}
              className={`font-semibold transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              去注册
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}