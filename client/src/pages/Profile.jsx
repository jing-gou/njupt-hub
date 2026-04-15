import React, { useEffect, useMemo, useState } from 'react';
import { CircleUserRound, LogOut, RefreshCw, Mail, ShieldCheck, ChevronRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function Profile({ onGoLogin }) {
  const { darkMode } = useTheme();
  const { user, token, logout, isAuthed } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [receivedLikes, setReceivedLikes] = useState(0);
  const [activeSubPage, setActiveSubPage] = useState('home'); // 'home' | 'account'

  const statusOptions = useMemo(() => ['ALL', 'PENDING', 'APPROVED', 'REJECTED'], []);
  const statusLabels = {
    ALL: '全部',
    PENDING: '审核中',
    APPROVED: '已通过',
    REJECTED: '已驳回'
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reviews/user/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReceivedLikes(data.receivedLikes || 0);
    } catch (err) {
      console.error('Fetch stats error:', err);
    }
  };

  const fetchMyResources = async () => {
    if (!user?.id) return;
    setError('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({ uploaderId: String(user.id), pageSize: '50' });
      if (status !== 'ALL') qs.set('status', status);
      const res = await fetch(`/api/resources?${qs.toString()}`);

      let data = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        setError(data?.message || data?.error || `加载失败 (${res.status})`);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setError('网络请求失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyResources();
    fetchStats();
  }, [user?.id, status]);

  if (!isAuthed) {
    return (
      <div className="max-w-4xl mx-auto px-2 py-4 md:p-4 space-y-6 md:space-y-8 animate-in fade-in duration-700">
        <div
          className={`md:rounded-2xl md:border md:shadow-xl p-4 md:p-8 space-y-4 ${
            darkMode
              ? 'md:bg-slate-800/50 md:border-slate-700 md:shadow-slate-900/50'
              : 'md:bg-slate-100 md:border-slate-100 md:shadow-slate-200/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
              <CircleUserRound size={24} />
            </div>
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>个人中心</h2>
              <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>你还没有登录</p>
            </div>
          </div>

          <button
            onClick={() => onGoLogin?.()}
            className={`px-5 py-3 rounded-xl font-semibold transition-all ${
              darkMode ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            去登录
          </button>
        </div>
      </div>
    );
  }

  const profileCards = [
    {
      key: 'username',
      label: '用户名',
      value: user?.username || '-',
      tone: darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-slate-200'
    },
    {
      key: 'likes',
      label: '累计获赞',
      value: receivedLikes,
      tone: darkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-100 bg-blue-100',
      valueClass: darkMode ? 'text-blue-400' : 'text-blue-600',
      labelClass: darkMode ? 'text-blue-400' : 'text-blue-600'
    }
  ];

  const roleLabel = user?.role || '-';
  const emailLabel = user?.email || '-';

  return (
    <div className="max-w-4xl mx-auto px-2 py-4 md:p-4 space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div
        className={`md:rounded-2xl md:border md:shadow-xl p-4 md:p-8 space-y-6 ${
          darkMode
            ? 'md:bg-slate-800/50 md:border-slate-700 md:shadow-slate-900/50'
            : 'md:bg-slate-100 md:border-slate-100 md:shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
              <CircleUserRound size={24} />
            </div>
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>个人中心</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSubPage === 'account' && (
              <button
                onClick={() => setActiveSubPage('home')}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 ${
                  darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ArrowLeft size={16} /> 返回
              </button>
            )}
            <button
              onClick={logout}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 ${
                darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LogOut size={18} /> 退出
            </button>
          </div>
        </div>

        {activeSubPage === 'home' ? (
          <>
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {profileCards.map((card) => (
                <div key={card.key} className={`rounded-2xl p-4 border transition-all ${card.tone}`}>
                  <div className={`text-xs font-medium ${card.labelClass || (darkMode ? 'text-slate-500' : 'text-slate-500')}`}>{card.label}</div>
                  <div className={`font-bold text-lg ${card.valueClass || ''}`}>{card.value}</div>
                </div>
              ))}
              <button
                onClick={() => setActiveSubPage('account')}
                className={`rounded-2xl p-4 border text-left transition-all group ${
                  darkMode
                    ? 'border-slate-700 bg-slate-900/30 hover:bg-slate-800/70'
                    : 'border-slate-200 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>账号详情</div>
                    <div className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>查看邮箱与角色</div>
                  </div>
                  <ChevronRight size={18} className={`transition-transform group-hover:translate-x-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              </button>
            </div>

           
          </>
        ) : (
          <div className={`rounded-2xl border p-4 md:p-5 space-y-4 ${
            darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-white/70'
          }`}>
            <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>账号详情</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={`rounded-xl p-4 border ${
                darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>邮箱</div>
                <div className={`font-semibold break-all flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <Mail size={14} className="text-blue-500" />
                  {emailLabel}
                </div>
              </div>
              <div className={`rounded-xl p-4 border ${
                darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>角色</div>
                <div className={`font-semibold flex items-center gap-2 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                  <ShieldCheck size={14} className="text-blue-500" />
                  {roleLabel}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-start gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all transform hover:scale-105 active:scale-95 ${
                  status === s
                    ? darkMode
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          {/* 表头 - 仅在桌面端显示 */}
          <div className={`hidden md:grid grid-cols-12 px-4 py-3 text-xs font-semibold ${darkMode ? 'bg-slate-900/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <div className="col-span-5">标题</div>
            <div className="col-span-3">课程</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-2 text-right">下载</div>
          </div>

          {error && <div className="px-4 py-3 text-sm text-red-500">{error}</div>}
          {!error && items.length === 0 && (
            <div className={`px-4 py-8 text-sm text-center ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>暂无数据</div>
          )}
          
          {/* 列表内容 */}
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((r) => (
              <div key={r.id}>
                {/* 桌面端行布局 */}
                <div className={`hidden md:grid grid-cols-12 px-4 py-3 text-sm ${
                  darkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  <div className="col-span-5 truncate">{r.title}</div>
                  <div className="col-span-3 truncate">{r.course}</div>
                  <div className="col-span-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      r.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </div>
                  <div className="col-span-2 text-right font-mono text-slate-500">{r.downloadCount}</div>
                </div>

                {/* 移动端卡片布局 */}
                <div className={`md:hidden p-4 space-y-3 ${
                  darkMode ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-bold text-sm line-clamp-2">{r.title}</div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                      r.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                      'bg-amber-500/10 text-amber-500'
                    }`}>
                      {statusLabels[r.status] || r.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <div className="truncate flex-1 pr-4">{r.course}</div>
                    <div className="flex items-center gap-1">
                      <RefreshCw size={10} />
                      {r.downloadCount} 次下载
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

