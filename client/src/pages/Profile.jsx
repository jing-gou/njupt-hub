import React, { useEffect, useMemo, useState } from 'react';
import { CircleUserRound, LogOut, RefreshCw, Mail, ShieldCheck, ArrowLeft, HelpCircle, UploadCloud, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { getAvatarFallbackUrl } from '../utils/avatar';

export default function Profile({ onGoLogin }) {
  const { darkMode } = useTheme();
  const { user, token, logout, isAuthed, updateProfile, changePassword, uploadAvatar, refreshMe } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('ALL');
  const [receivedLikes, setReceivedLikes] = useState(0);
  const [activeSubPage, setActiveSubPage] = useState('home'); // 'home' | 'account'
  const [newUsername, setNewUsername] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showExpRuleTip, setShowExpRuleTip] = useState(false);
  const [expRefreshing, setExpRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

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

  useEffect(() => {
    setCurrentPage(1);
  }, [status, items.length]);

  useEffect(() => {
    setNewUsername(user?.username || '');
  }, [user?.username]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) return toast.error('用户名不能为空');
    setProfileSubmitting(true);
    try {
      await updateProfile({ username });
      toast.success('用户名已更新');
    } catch (err) {
      toast.error(err.message || '更新失败');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error('请填写完整密码信息');
    setPasswordSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('密码修改成功');
    } catch (err) {
      toast.error(err.message || '修改失败');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith('image/')) return toast.error('仅支持图片文件');
    if (file.size > 5 * 1024 * 1024) return toast.error('头像不能超过 5MB');
    setAvatarUploading(true);
    try {
      await uploadAvatar(file);
      toast.success('头像更新成功');
    } catch (err) {
      toast.error(err.message || '头像上传失败');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleRefreshExp = async () => {
    if (!token) return;
    setExpRefreshing(true);
    try {
      await refreshMe();
      toast.success('经验已刷新');
    } catch (err) {
      toast.error(err.message || '刷新失败');
    } finally {
      setExpRefreshing(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('退出登录成功');
    onGoLogin?.();
  };

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

  const roleLabel = user?.role || '-';
  const emailLabel = user?.email || '-';
  const level = Number(user?.level || 1);
  const experience = Number(user?.experience || 0);
  const levelProgress = Number(user?.levelProgress || 0);
  const levelProgressTotal = Number(user?.levelProgressTotal || 100);
  const nextLevelExp = Number(user?.nextLevelExp || 100);
  const progressPercent = Math.min(100, Math.max(0, (levelProgress / levelProgressTotal) * 100));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="max-w-4xl mx-auto px-2 py-4 md:p-4 space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div
        className={`md:rounded-2xl md:border md:shadow-xl p-4 md:p-8 space-y-6 ${
          darkMode
            ? 'md:bg-slate-800/50 md:border-slate-700 md:shadow-slate-900/50'
            : 'md:bg-slate-100 md:border-slate-100 md:shadow-slate-200/50'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user?.avatarUrl || getAvatarFallbackUrl(user?.username, 80)}
                alt={user?.username || '用户'}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-blue-400/40"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getAvatarFallbackUrl(user?.username, 80);
                }}
              />
              <label className={`absolute -bottom-1 -right-1 p-1.5 rounded-full cursor-pointer ${
                darkMode ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-600 shadow'
              }`}>
                {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <div>
              <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>个人中心</h2>
              <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                @{user?.username}
              </p>
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
              onClick={handleLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95 ${
                darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LogOut size={18} /> 退出
            </button>
          </div>
        </div>

        {activeSubPage === 'home' ? (
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 border ${darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`text-xs mb-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>当前等级</div>
                  <div className={`text-2xl font-black ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>Lv.{level}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{experience} EXP</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRefreshExp}
                    disabled={expRefreshing}
                    className={`p-1.5 rounded-full transition-colors ${
                      darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    } ${expRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                    aria-label="刷新经验"
                    title="刷新经验"
                  >
                    <RefreshCw size={16} className={expRefreshing ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExpRuleTip((v) => !v)}
                    onMouseEnter={() => setShowExpRuleTip(true)}
                    onMouseLeave={() => setShowExpRuleTip(false)}
                    className={`relative p-1.5 rounded-full ${
                      darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    aria-label="查看升级规则"
                    title="查看升级规则"
                  >
                    <HelpCircle size={16} />
                    {showExpRuleTip && (
                      <div className={`absolute right-0 top-8 w-56 text-left text-xs p-3 rounded-xl border z-20 ${
                        darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700 shadow-lg'
                      }`}>
                        <p className="font-semibold mb-1">等级升级机制</p>
                        <p>每 100 EXP 升 1 级。</p>
                        <p>上传资料：+10 EXP/文件（通过审核后结算）。</p>
                        <p>新建评分：+5 EXP/次（游客不计入）。</p>
                        <p>获赞：+2 EXP（取消赞会扣回）。</p>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              <div className={`mt-3 h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className={`mt-1 text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                距离下一级还需 {Math.max(0, nextLevelExp - experience)} EXP
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              <button
                onClick={() => setActiveSubPage('account')}
                className={`rounded-2xl p-4 border text-left transition-all ${darkMode ? 'border-slate-700 bg-slate-900/30 hover:bg-slate-900/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="text-xs text-slate-500">账号设置</div>
                <div className="font-bold text-lg">修改用户名、密码</div>
              </button>
              <div className={`rounded-2xl p-4 border transition-all ${darkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-100 bg-blue-100'}`}>
                <div className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>累计获赞</div>
                <div className={`font-bold text-lg ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>{receivedLikes}</div>
              </div>
            </div>
          </div>
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
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>修改用户名</div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="请输入新用户名"
                  className={`flex-1 px-3 py-2 rounded-xl text-sm border outline-none ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  保存用户名
                </button>
              </div>
            </form>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>修改密码</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="当前密码"
                  className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="新密码（至少8位且含字母数字）"
                  className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={passwordSubmitting}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                保存新密码
              </button>
            </form>
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
            {pagedItems.map((r) => (
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
        {!error && items.length > 0 && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              上一页
            </button>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

