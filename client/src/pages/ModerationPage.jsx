import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShieldCheck, 
  FileText, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function ModerationPage() {
  const { darkMode } = useTheme();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('RESOURCES'); // RESOURCES or REPORTS
  const [resources, setResources] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // 新增状态：控制确认弹窗
  const [confirmModal, setConfirmModal] = useState({ show: false, type: '', id: null, reviewId: null });

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources?status=PENDING&pageSize=50');
      const data = await res.json();
      setResources(data.items || []);
    } catch (err) {
      console.error('Fetch resources error:', err);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reviews/admin/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReports(data || []);
    } catch (err) {
      console.error('Fetch reports error:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'RESOURCES') await fetchResources();
    else await fetchReports();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleResourceAction = async (id, status) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/resources/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setResources(resources.filter(r => r.id !== id));
      }
    } catch (err) {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    setActionLoading(`review-${reviewId}`);
    try {
      const res = await fetch(`/api/reviews/admin/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(reports.filter(r => r.reviewId !== reviewId));
        setConfirmModal({ show: false, type: '', id: null, reviewId: null });
      }
    } catch (err) {
      alert('删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissReport = async (reportId) => {
    setActionLoading(`report-${reportId}`);
    try {
      const res = await fetch(`/api/reviews/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReports(reports.filter(r => r.id !== reportId));
      }
    } catch (err) {
      alert('忽略失败');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white'}`}>
          <ShieldCheck size={32} />
        </div>
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>内容审核中心</h1>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            当前身份: <span className="font-bold text-blue-500">{user?.role}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b dark:border-slate-700">
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 ${
            activeTab === 'RESOURCES'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          资料审核 ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 ${
            activeTab === 'REPORTS'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          举报处理 ({reports.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'RESOURCES' ? (
            resources.length === 0 ? (
              <div className="text-center py-20 text-slate-500">暂无待审核资料</div>
            ) : (
              <div className="grid gap-4">
                {resources.map(res => (
                  <div 
                    key={res.id}
                    className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-blue-500" />
                        <h3 className={`font-bold text-lg truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{res.title}</h3>
                      </div>
                      <div className={`text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <p className="truncate">课程: {res.course}</p>
                        <p className="truncate">上传者: {res.uploader?.username}</p>
                        <p>分类: {res.category || '未分类'}</p>
                        <p>时间: {new Date(res.createdAt).toLocaleString()}</p>
                      </div>
                      <a 
                        href={res.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                      >
                        查看文件 <ExternalLink size={12} />
                      </a>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleResourceAction(res.id, 'APPROVED')}
                        disabled={actionLoading === res.id}
                        className="flex-1 md:flex-none p-3 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all flex items-center justify-center gap-2"
                        title="通过"
                      >
                        {actionLoading === res.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        <span className="md:hidden font-bold">通过</span>
                      </button>
                      <button
                        onClick={() => handleResourceAction(res.id, 'REJECTED')}
                        disabled={actionLoading === res.id}
                        className="flex-1 md:flex-none p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                        title="拒绝"
                      >
                        {actionLoading === res.id ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
                        <span className="md:hidden font-bold">拒绝</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            reports.length === 0 ? (
              <div className="text-center py-20 text-slate-500">暂无待处理举报</div>
            ) : (
              <div className="grid gap-4">
                {reports.map(report => (
                  <div 
                    key={report.id}
                    className={`p-6 rounded-2xl border space-y-4 ${
                      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm">被举报原因: {report.reason}</span>
                      </div>
                      <span className="text-xs text-slate-500">举报人: {report.user?.username}</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-500">被举报评价 ({report.review?.item?.title})</span>
                        <span className="text-xs text-slate-500">作者: {report.review?.reviewer?.username}</span>
                      </div>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {report.review?.comment}
                      </p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleDismissReport(report.id)}
                        disabled={actionLoading === `report-${report.id}`}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        忽略举报
                      </button>
                      <button
                        onClick={() => setConfirmModal({ show: true, id: report.id })}
                        disabled={actionLoading === `review-${report.reviewId}`}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-2"
                      >
                        {actionLoading === `review-${report.reviewId}` ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        删除评价
                      </button>
                    </div>

                    {/* 内联确认面板 */}
                    {confirmModal.show && confirmModal.id === report.id && (
                      <div className={`mt-4 p-4 rounded-xl border animate-in zoom-in-95 duration-200 ${
                        darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex flex-col gap-3">
                          <p className={`text-sm font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                            确定要删除这条评价吗？这将同时移除所有相关的点赞、回复和举报记录。
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteReview(report.reviewId)}
                              className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all"
                            >
                              确认删除
                            </button>
                            <button
                              onClick={() => setConfirmModal({ show: false, id: null })}
                              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 border border-slate-200'
                              }`}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
