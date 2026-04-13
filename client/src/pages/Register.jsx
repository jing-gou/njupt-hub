import React, { useState, useEffect } from 'react';
import { UserPlus, Mail } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      <div
        className={`rounded-2xl border shadow-xl p-8 space-y-6 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/50'
            : 'bg-white border-slate-100 shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>注册</h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAuthed ? '已登录，可直接前往个人中心' : '验证邮箱后注册'}
              </p>
            </div>
          </div>

          <button
            onClick={() => onGoLogin?.()}
            className={`px-4 py-2 rounded-xl font-medium transition-all ${
              darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            去登录
          </button>
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
            <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>邮箱</div>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                autoComplete="email"
                className={`flex-1 px-4 py-3 rounded-xl outline-none border ${
                  darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>验证码</div>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6位验证码"
                className={`flex-1 px-4 py-3 rounded-xl outline-none border ${
                  darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
                className={`px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
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
            <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>密码</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              type="password"
              autoComplete="new-password"
              className={`w-full px-4 py-3 rounded-xl outline-none border ${
                darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="space-y-2">
            <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>确认密码</div>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              type="password"
              autoComplete="new-password"
              className={`w-full px-4 py-3 rounded-xl outline-none border ${
                darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div className="text-sm text-red-500">{error}</div>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                darkMode ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? '注册中...' : '注册并登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

