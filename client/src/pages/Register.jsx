import React, { useState, useEffect } from 'react';
import { UserPlus, User, Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function Register({ onGoLogin, onSuccess }) {
  const { darkMode } = useTheme();
  const { register, login, isAuthed, sendVerificationCode } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email) {
      setError('请先输入邮箱');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setSendingCode(true);
    setError('');
    try {
      await sendVerificationCode(email);
      setCountdown(60);
    } catch (err) {
      setError(err?.message || '验证码发送失败');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password || !code) {
      setError('请填写完整信息（包括验证码）');
      return;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    // 密码长度和类型验证
    // 至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('密码至少8位，且必须包含字母和数字');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      await register({ username, email, password, code });
      await login({ username, password });
      onSuccess?.();
    } catch (err) {
      setError(err?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-[calc(100vh-180px)] flex items-center justify-center p-4 transition-colors duration-500 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300'}`}>
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${darkMode ? 'opacity-30' : ''}`}>
        <div className={`absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-3xl ${darkMode ? 'bg-blue-500/20' : 'bg-blue-400/30'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-400/30'}`} />
      </div>

      <div className="relative w-full max-w-md px-2">
        <div
          className={`md:rounded-3xl md:border md:shadow-2xl p-6 md:p-8 space-y-7 backdrop-blur-xl ${
            darkMode
              ? 'md:bg-slate-800/70 md:border-slate-700/50 md:shadow-slate-900/50'
              : 'md:bg-white/70 md:border-white/50 md:shadow-blue-500/10'
          }`}
        >
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
              darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'
            } shadow-lg`}>
              <UserPlus size={28} className="text-white" />
            </div>
            <h2 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>创建账号</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAuthed ? '已登录，可直接前往个人中心' : '验证邮箱后即可完成注册'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  className={`w-full min-w-0 pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>邮箱</label>
              <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <Mail size={18} />
                </div>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  autoComplete="email"
                  className={`w-full min-w-0 pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>验证码</label>
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="relative group flex-1 min-w-0">
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6位验证码"
                    className={`w-full min-w-0 pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                      darkMode
                        ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0}
                  className={`w-full sm:w-auto sm:min-w-[120px] px-4 py-3.5 rounded-xl font-medium transition-all whitespace-nowrap ${
                    darkMode
                      ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  } ${(sendingCode || countdown > 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {countdown > 0 ? `${countdown}s` : sendingCode ? '发送中...' : '发送验证码'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>密码</label>
              <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <Lock size={18} />
                </div>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少8位，且包含字母和数字"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full min-w-0 pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>确认密码</label>
              <div className="relative group">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${darkMode ? 'text-slate-500 group-focus-within:text-blue-400' : 'text-slate-400 group-focus-within:text-blue-500'}`}>
                  <Lock size={18} />
                </div>
                <input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  type="password"
                  autoComplete="new-password"
                  className={`w-full min-w-0 pl-12 pr-4 py-3.5 rounded-xl outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900/50 border-slate-700 text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center break-words">
                {error}
              </div>
            )}

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
                  注册中...
                </span>
              ) : '注册并登录'}
            </button>
          </form>

          <div className={`text-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            已有账号？{' '}
            <button
              onClick={() => onGoLogin?.()}
              className={`font-semibold transition-colors ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              去登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

