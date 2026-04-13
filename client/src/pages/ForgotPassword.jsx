import React, { useState, useEffect } from 'react';
import { KeyRound, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPassword({ onGoBack, onSuccess }) {
  const { darkMode } = useTheme();
  const { sendResetPasswordCode, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: 输入邮箱并获取验证码, 2: 输入验证码和新密码

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
      setError('请输入邮箱');
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
      await sendResetPasswordCode(email);
      setCountdown(60);
      setStep(2);
    } catch (err) {
      setError(err?.message || '验证码发送失败，请检查邮箱是否正确');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!code || !newPassword || !confirmPassword) {
      setError('请填写完整信息');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('密码至少8位，且必须包含字母和数字');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ email, code, newPassword });
      onSuccess?.();
    } catch (err) {
      setError(err?.message || '重置密码失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div
        className={`rounded-2xl border shadow-xl p-8 space-y-6 ${
          darkMode
            ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/50'
            : 'bg-white border-slate-100 shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <KeyRound size={24} />
            </div>
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>找回密码</h2>
          </div>
          <button
            onClick={onGoBack}
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              请输入您的注册邮箱，我们将向您发送验证码以重置密码。
            </p>
            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>邮箱地址</div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-xl outline-none border transition-all ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <button
              onClick={handleSendCode}
              disabled={sendingCode}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              } ${sendingCode ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {sendingCode ? '发送中...' : '发送验证码'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>验证码</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6位验证码"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl outline-none border transition-all ${
                      darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendingCode}
                  className={`px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                    darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } ${countdown > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {countdown > 0 ? `${countdown}s` : '重新发送'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>新密码</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少8位字母+数字"
                className={`w-full px-4 py-3 rounded-xl outline-none border transition-all ${
                  darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                }`}
              />
            </div>

            <div className="space-y-2">
              <div className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>确认新密码</div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className={`w-full px-4 py-3 rounded-xl outline-none border transition-all ${
                  darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                }`}
              />
            </div>

            {error && <div className="text-sm text-red-500">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold transition-all ${
                darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {loading ? '重置中...' : '重置密码'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`w-full text-sm font-medium transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
            >
              返回修改邮箱
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
