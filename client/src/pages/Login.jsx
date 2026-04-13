import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function Login({ onSuccess, onGoRegister, onGoForgotPassword }) {
  const { darkMode } = useTheme();
  const { isAuthed, login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      <div
        className={`rounded-2xl border shadow-xl p-8 space-y-6 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/50'
            : 'bg-white border-slate-100 shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
            <LogIn size={24} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>登录</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAuthed ? '已登录，可前往个人中心' : '登录后可提交资源、查看个人信息'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>用户名</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              className={`w-full px-4 py-3 rounded-xl outline-none border ${
                darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>密码</div>
              <button
                type="button"
                onClick={() => onGoForgotPassword?.()}
                className={`text-xs font-medium transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                忘记密码？
              </button>
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              type="password"
              autoComplete="current-password"
              className={`w-full px-4 py-3 rounded-xl outline-none border ${
                darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div className="text-sm text-red-500">{error}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGoRegister?.()}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                去注册
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                  darkMode ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-600 text-white hover:bg-blue-700'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
