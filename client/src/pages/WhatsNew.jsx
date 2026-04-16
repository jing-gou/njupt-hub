import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, History, ExternalLink, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN', { hour12: false });
};

const getShortSha = (sha) => String(sha || '').slice(0, 7);

export default function WhatsNew() {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [items, setItems] = useState([]);

  const fetchCommits = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/meta/commits?limit=30');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '加载失败');
      }
      setRepo(String(data?.repo || ''));
      setBranch(String(data?.branch || ''));
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || '加载更新日志失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommits();
  }, []);

  const timelineItems = useMemo(() => {
    return items.map((item) => {
      const lines = String(item?.message || '').split('\n').filter(Boolean);
      return {
        ...item,
        title: lines[0] || '(no message)',
        body: lines.slice(1).join(' '),
      };
    });
  }, [items]);

  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute -top-10 left-1/4 w-96 h-96 rounded-full blur-[110px] ${darkMode ? 'bg-blue-500/20' : 'bg-blue-400/30'}`} />
          <div className={`absolute top-24 right-1/4 w-80 h-80 rounded-full blur-[110px] ${darkMode ? 'bg-purple-500/15' : 'bg-purple-400/25'}`} />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-10 md:py-14">
          <div className="mb-8 md:mb-10 text-left">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-5 ${
              darkMode ? 'bg-slate-800/80 text-blue-400' : 'bg-white/90 text-blue-600 shadow-xl'
            }`}>
              <Sparkles size={18} className="animate-pulse" />
              <span className="text-sm font-semibold tracking-wide">Update</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <History className={darkMode ? 'text-blue-400' : 'text-blue-600'} size={30} />
              <h1 className={`text-4xl md:text-5xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r ${
                darkMode ? 'from-blue-400 to-pink-400' : 'from-blue-600 to-pink-600'
              }`}>
                更新日志
              </h1>
            </div>

            <div className={`mt-4 flex flex-wrap items-center gap-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>自动同步 GitHub Commit 时间线</span>
              {repo ? <span className="font-medium">{repo}</span> : null}
              {branch ? <span className="px-2 py-0.5 rounded-full bg-slate-500/10">#{branch}</span> : null}
            </div>
          </div>

          <div className="mb-5">
            <button
              type="button"
              onClick={fetchCommits}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              <RefreshCw size={16} />
              刷新日志
            </button>
          </div>

          {loading ? (
            <div className={`rounded-2xl p-10 flex items-center justify-center border ${
              darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'
            }`}>
              <Loader2 className="animate-spin mr-2" size={20} />
              正在同步 GitHub 提交...
            </div>
          ) : error ? (
            <div className={`rounded-2xl p-6 border ${
              darkMode ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {error}
            </div>
          ) : timelineItems.length === 0 ? (
            <div className={`rounded-2xl p-8 border ${
              darkMode ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
            }`}>
              暂无提交记录
            </div>
          ) : (
            <div className="space-y-0">
              {timelineItems.map((item, idx) => (
                <div key={item.sha} className="grid grid-cols-[26px_1fr] gap-4 md:gap-5">
                  <div className="relative flex justify-center">
                    <div className={`mt-2.5 h-2.5 w-2.5 rounded-full ${darkMode ? 'bg-blue-300' : 'bg-blue-600'}`} />
                    {idx !== timelineItems.length - 1 && (
                      <div className={`absolute top-5 bottom-0 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                    )}
                  </div>

                  <div className={`mb-4 rounded-2xl border p-4 md:p-5 transition-all ${
                    darkMode
                      ? 'bg-slate-900/40 border-slate-800 shadow-lg shadow-black/20'
                      : 'bg-white/70 border-slate-200 shadow-md hover:shadow-lg'
                  }`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                        {item.title}
                      </h3>
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDate(item.date)}
                      </span>
                    </div>

                    {item.body ? (
                      <p className={`mt-2 text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {item.body}
                      </p>
                    ) : null}

                    <div className={`mt-3 flex flex-wrap items-center gap-3 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span className="inline-flex items-center gap-1">
                        <GitCommitHorizontal size={14} />
                        {getShortSha(item.sha)}
                      </span>
                      <span>{item.author || 'Unknown'}</span>
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 hover:underline ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}
                        >
                          查看提交
                          <ExternalLink size={13} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
