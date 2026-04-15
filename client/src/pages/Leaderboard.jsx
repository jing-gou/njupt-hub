import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Award, Loader2, ChevronLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { getAvatarFallbackUrl } from '../utils/avatar';

const roleLabel = {
  USER: '用户',
  ADMIN: '管理员',
  DEV: '开发者',
};

export default function Leaderboard({ onBack }) {
  const { darkMode } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/leaderboard');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || data?.error || '加载失败');
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (error) {
        console.error('Fetch leaderboard error:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const renderRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={18} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={18} className="text-slate-400" />;
    if (rank === 3) return <Award size={18} className="text-amber-600" />;
    return <span className="text-xs font-black w-5 text-center">{rank}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto px-2 py-4 md:p-4 space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
            darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ChevronLeft size={16} />
          返回
        </button>
      </div>

      <div className={`rounded-2xl border p-4 md:p-6 space-y-4 ${
        darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          经验排行榜 TOP 20
        </h2>
        <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          通过上传资料与发表评分获取经验，游客不参与经验结算。
        </p>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-500">暂无数据</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border px-3 py-3 md:px-4 md:py-3 flex items-center justify-between ${
                  darkMode ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-6 flex items-center justify-center">
                    {renderRankIcon(item.rank)}
                  </div>
                  <img
                    src={item.avatarUrl || getAvatarFallbackUrl(item.username, 40)}
                    alt={item.username}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getAvatarFallbackUrl(item.username, 40);
                    }}
                  />
                  <div className="min-w-0">
                    <div className={`font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {item.username}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {roleLabel[item.role] || item.role}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Lv.{item.level}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.experience} EXP
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

