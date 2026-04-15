import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  AlertTriangle,
  Loader2,
  ExternalLink,
  FolderOpen,
  Search,
  MessageSquare
} from 'lucide-react';

export default function ModerationPage() {
  const { darkMode } = useTheme();
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('RESOURCES'); // RESOURCES or REPORTS
  const [resources, setResources] = useState([]);
  const [reports, setReports] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [fileManagerItems, setFileManagerItems] = useState([]);
  const [fileManagerStatus, setFileManagerStatus] = useState('ACTIVE');
  const [fileManagerQuery, setFileManagerQuery] = useState('');
  const [selectedFileManagerIds, setSelectedFileManagerIds] = useState([]);
  const [selectedPendingReviewIds, setSelectedPendingReviewIds] = useState([]);

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

  const fetchPendingReviews = async () => {
    try {
      const res = await fetch('/api/reviews/admin/pending-reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPendingReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fetch pending reviews error:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    if (activeTab === 'RESOURCES') {
      await fetchResources();
    } else if (activeTab === 'REPORTS') {
      await fetchReports();
    } else if (activeTab === 'PENDING_REVIEWS') {
      await fetchPendingReviews();
    } else {
      await fetchFileManagerItems();
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    setSelectedResourceIds([]);
    setSelectedReportIds([]);
    setSelectedFileManagerIds([]);
    setSelectedPendingReviewIds([]);
  }, [activeTab]);

  useEffect(() => {
    setSelectedResourceIds((prev) => prev.filter((id) => resources.some((r) => r.id === id)));
  }, [resources]);

  useEffect(() => {
    setSelectedReportIds((prev) => prev.filter((id) => reports.some((r) => r.id === id)));
  }, [reports]);

  useEffect(() => {
    setSelectedFileManagerIds((prev) => prev.filter((id) => fileManagerItems.some((r) => r.id === id)));
  }, [fileManagerItems]);

  useEffect(() => {
    setSelectedPendingReviewIds((prev) => prev.filter((id) => pendingReviews.some((r) => r.id === id)));
  }, [pendingReviews]);

  const handlePendingReviewStatus = async (reviewId, status) => {
    setActionLoading(`pending-${reviewId}-${status}`);
    try {
      const res = await fetch(`/api/reviews/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '操作失败');
      setPendingReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setSelectedPendingReviewIds((prev) => prev.filter((id) => id !== reviewId));
      toast.success('操作成功');
    } catch (err) {
      toast.error(err.message || '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePendingReviewSelection = (id) => {
    setSelectedPendingReviewIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAllPendingReviews = () => {
    if (selectedPendingReviewIds.length === pendingReviews.length) {
      setSelectedPendingReviewIds([]);
    } else {
      setSelectedPendingReviewIds(pendingReviews.map((r) => r.id));
    }
  };

  const handleBatchPendingReviewAction = async (status) => {
    if (selectedPendingReviewIds.length === 0) return;
    setActionLoading(`batch-pending-${status}`);
    try {
      const tasks = selectedPendingReviewIds.map((id) =>
        fetch(`/api/reviews/admin/reviews/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(tasks);
      const successIds = selectedPendingReviewIds.filter((_, idx) => results[idx].ok);
      setPendingReviews((prev) => prev.filter((r) => !successIds.includes(r.id)));
      setSelectedPendingReviewIds([]);
      toast.success(`批量处理完成：成功 ${successIds.length} / ${results.length}`);
    } catch (err) {
      toast.error('批量处理失败');
    } finally {
      setActionLoading(null);
    }
  };

  const fetchFileManagerItems = async () => {
    try {
      const qs = new URLSearchParams({ pageSize: '100' });
      if (fileManagerStatus === 'APPROVED' || fileManagerStatus === 'PENDING' || fileManagerStatus === 'REJECTED') {
        qs.set('status', fileManagerStatus);
      }
      if (fileManagerQuery.trim()) qs.set('q', fileManagerQuery.trim());
      const res = await fetch(`/api/resources?${qs.toString()}`);
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setFileManagerItems(
        fileManagerStatus === 'ACTIVE'
          ? items.filter((item) => item.status !== 'REJECTED')
          : items
      );
    } catch (err) {
      console.error('Fetch file manager resources error:', err);
    }
  };

  useEffect(() => {
    if (activeTab !== 'FILES') return;
    fetchFileManagerItems();
  }, [activeTab, fileManagerStatus]);

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
        setFileManagerItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        toast.success('操作成功');
      }
    } catch (err) {
      toast.error('操作失败');
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
        toast.success('删除成功');
      }
    } catch (err) {
      toast.error('删除失败');
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
        toast.success('已忽略');
      }
    } catch (err) {
      toast.error('忽略失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenameResource = async (item) => {
    const nextTitle = window.prompt('请输入新的文件标题', item.title || '');
    if (nextTitle == null) return;
    const trimmed = nextTitle.trim();
    if (!trimmed) return toast.error('标题不能为空');

    setActionLoading(`rename-${item.id}`);
    try {
      const res = await fetch(`/api/resources/${item.id}/meta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '重命名失败');
      setFileManagerItems((prev) => prev.map((v) => (v.id === item.id ? { ...v, title: trimmed } : v)));
      setResources((prev) => prev.map((v) => (v.id === item.id ? { ...v, title: trimmed } : v)));
      toast.success('重命名成功');
    } catch (err) {
      toast.error(err.message || '重命名失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteResource = async (item) => {
    const confirmed = window.confirm(`确认删除文件「${item.title}」吗？将同时删除云端文件和数据库记录。`);
    if (!confirmed) return;

    setActionLoading(`delete-${item.id}`);
    try {
      const res = await fetch(`/api/resources/${item.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '删除失败');
      setFileManagerItems((prev) => prev.filter((v) => v.id !== item.id));
      setResources((prev) => prev.filter((v) => v.id !== item.id));
      toast.success('删除成功');
    } catch (err) {
      toast.error(err.message || '删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFileManagerSelection = (id) => {
    setSelectedFileManagerIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFileManager = () => {
    if (selectedFileManagerIds.length === fileManagerItems.length) {
      setSelectedFileManagerIds([]);
    } else {
      setSelectedFileManagerIds(fileManagerItems.map((r) => r.id));
    }
  };

  const handleBatchFileManagerStatus = async (status) => {
    if (selectedFileManagerIds.length === 0) return;
    setActionLoading(`bulk-file-status-${status}`);
    try {
      const tasks = selectedFileManagerIds.map((id) =>
        fetch(`/api/resources/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(tasks);
      const successIds = selectedFileManagerIds.filter((_, idx) => results[idx].ok);
      setFileManagerItems((prev) =>
        prev.map((item) => (successIds.includes(item.id) ? { ...item, status } : item))
      );
      setResources((prev) =>
        prev.map((item) => (successIds.includes(item.id) ? { ...item, status } : item))
      );
      setSelectedFileManagerIds([]);
      toast.success(`批量操作完成：成功 ${successIds.length} / ${results.length}`);
    } catch (err) {
      toast.error('批量操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDeleteResources = async () => {
    if (selectedFileManagerIds.length === 0) return;
    const confirmed = window.confirm(`确认删除 ${selectedFileManagerIds.length} 个文件吗？将同时删除云端文件和数据库记录。`);
    if (!confirmed) return;

    setActionLoading('bulk-file-delete');
    try {
      const tasks = selectedFileManagerIds.map((id) =>
        fetch(`/api/resources/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        })
      );
      const results = await Promise.all(tasks);
      const successIds = selectedFileManagerIds.filter((_, idx) => results[idx].ok);
      setFileManagerItems((prev) => prev.filter((item) => !successIds.includes(item.id)));
      setResources((prev) => prev.filter((item) => !successIds.includes(item.id)));
      setSelectedFileManagerIds([]);
      toast.success(`批量删除完成：成功 ${successIds.length} / ${results.length}`);
    } catch (err) {
      toast.error('批量删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleResourceSelection = (id) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleReportSelection = (id) => {
    setSelectedReportIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectAllResources = () => {
    if (selectedResourceIds.length === resources.length) {
      setSelectedResourceIds([]);
    } else {
      setSelectedResourceIds(resources.map((r) => r.id));
    }
  };

  const toggleSelectAllReports = () => {
    if (selectedReportIds.length === reports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(reports.map((r) => r.id));
    }
  };

  const handleBatchResourceAction = async (status) => {
    if (selectedResourceIds.length === 0) return;
    setActionLoading(`bulk-resource-${status}`);
    try {
      const tasks = selectedResourceIds.map((id) =>
        fetch(`/api/resources/${id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        })
      );
      const results = await Promise.all(tasks);
      const successCount = results.filter((r) => r.ok).length;
      setResources((prev) => prev.filter((r) => !selectedResourceIds.includes(r.id)));
      setSelectedResourceIds([]);
      toast.success(`批量操作完成：成功 ${successCount} / ${results.length}`);
    } catch (err) {
      toast.error('批量操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDismissReports = async () => {
    if (selectedReportIds.length === 0) return;
    setActionLoading('bulk-report-dismiss');
    try {
      const tasks = selectedReportIds.map((id) =>
        fetch(`/api/reviews/admin/reports/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        })
      );
      const results = await Promise.all(tasks);
      const successIds = selectedReportIds.filter((_, idx) => results[idx].ok);
      setReports((prev) => prev.filter((r) => !successIds.includes(r.id)));
      setSelectedReportIds([]);
      toast.success(`批量忽略完成：成功 ${successIds.length} / ${results.length}`);
    } catch (err) {
      toast.error('批量忽略失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchDeleteReportedReviews = async () => {
    if (selectedReportIds.length === 0) return;
    const targetReports = reports.filter((r) => selectedReportIds.includes(r.id));
    const reviewIds = Array.from(new Set(targetReports.map((r) => r.reviewId).filter(Boolean)));
    if (reviewIds.length === 0) {
      toast.error('未找到可删除的评价');
      return;
    }
    const confirmed = window.confirm(`确认删除 ${reviewIds.length} 条被举报评价吗？该操作不可撤销。`);
    if (!confirmed) return;

    setActionLoading('bulk-report-delete-review');
    try {
      const tasks = reviewIds.map((reviewId) =>
        fetch(`/api/reviews/admin/reviews/${reviewId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        })
      );
      const results = await Promise.all(tasks);
      const successReviewIds = reviewIds.filter((_, idx) => results[idx].ok);
      setReports((prev) => prev.filter((r) => !successReviewIds.includes(r.reviewId)));
      setSelectedReportIds([]);
      toast.success(`批量删除完成：成功 ${successReviewIds.length} / ${reviewIds.length}`);
    } catch (err) {
      toast.error('批量删除失败');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-2 py-4 md:p-6 space-y-6 animate-in fade-in duration-700">
      <div className="flex items-center gap-3 px-2 md:px-0">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>内容管理</h2>
          <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>审核资源上传与用户举报</p>
        </div>
      </div>

      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-slate-800 px-2 md:px-0">
        <button
          onClick={() => setActiveTab('RESOURCES')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 text-sm md:text-base whitespace-nowrap shrink-0 ${
            activeTab === 'RESOURCES'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          待审资料 ({resources.length})
        </button>
        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 text-sm md:text-base whitespace-nowrap shrink-0 ${
            activeTab === 'REPORTS'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          举报处理 ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('FILES')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 text-sm md:text-base whitespace-nowrap shrink-0 ${
            activeTab === 'FILES'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          文件管理 ({fileManagerItems.length})
        </button>
        <button
          onClick={() => setActiveTab('PENDING_REVIEWS')}
          className={`pb-4 px-4 font-bold transition-all border-b-2 text-sm md:text-base whitespace-nowrap shrink-0 ${
            activeTab === 'PENDING_REVIEWS'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          待审评论 ({pendingReviews.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      ) : (
        <div className="space-y-4 px-2 md:px-0">
          {activeTab === 'RESOURCES' ? (
            resources.length === 0 ? (
              <div className="text-center py-20 text-slate-500">暂无待审核资料</div>
            ) : (
              <div className="grid gap-4">
                <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllResources}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedResourceIds.length === resources.length ? '取消全选' : '全选'}
                    </button>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      已选 {selectedResourceIds.length} / {resources.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchResourceAction('APPROVED')}
                      disabled={selectedResourceIds.length === 0 || actionLoading === 'bulk-resource-APPROVED'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      批量通过
                    </button>
                    <button
                      onClick={() => handleBatchResourceAction('REJECTED')}
                      disabled={selectedResourceIds.length === 0 || actionLoading === 'bulk-resource-REJECTED'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      批量拒绝
                    </button>
                  </div>
                </div>
                {resources.map(res => (
                  <div 
                    key={res.id}
                    className={`p-4 md:p-6 md:rounded-2xl md:border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                    } ${window.innerWidth < 768 ? 'rounded-xl border' : ''}`}
                  >
                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedResourceIds.includes(res.id)}
                          onChange={() => toggleResourceSelection(res.id)}
                          className="w-4 h-4 accent-blue-500"
                        />
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
          ) : activeTab === 'REPORTS' ? (
            reports.length === 0 ? (
              <div className="text-center py-20 text-slate-500">暂无待处理举报</div>
            ) : (
              <div className="grid gap-4">
                <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllReports}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedReportIds.length === reports.length ? '取消全选' : '全选'}
                    </button>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      已选 {selectedReportIds.length} / {reports.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchDismissReports}
                      disabled={selectedReportIds.length === 0 || actionLoading === 'bulk-report-dismiss'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      批量忽略
                    </button>
                    <button
                      onClick={handleBatchDeleteReportedReviews}
                      disabled={selectedReportIds.length === 0 || actionLoading === 'bulk-report-delete-review'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      批量删评
                    </button>
                  </div>
                </div>
                {reports.map(report => (
                  <div 
                    key={report.id}
                    className={`p-6 rounded-2xl border space-y-4 ${
                      darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-amber-500">
                        <input
                          type="checkbox"
                          checked={selectedReportIds.includes(report.id)}
                          onChange={() => toggleReportSelection(report.id)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm break-words">被举报原因: {report.reason}</span>
                      </div>
                      <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">举报人: {report.user?.username}</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-blue-500">被举报评价 ({report.review?.item?.title})</span>
                        <span className="text-xs text-slate-500">作者: {report.review?.reviewer?.username}</span>
                      </div>
                      <p className={`text-sm break-words ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
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
          ) : activeTab === 'FILES' ? (
            <div className="space-y-4">
              <div className={`p-3 rounded-xl border flex flex-wrap items-center gap-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={fileManagerQuery}
                    onChange={(e) => setFileManagerQuery(e.target.value)}
                    placeholder="按标题或描述搜索..."
                    className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none ${
                      darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  />
                </div>
                <select
                  value={fileManagerStatus}
                  onChange={(e) => setFileManagerStatus(e.target.value)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    darkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="ACTIVE">默认（不含已驳回）</option>
                  <option value="ALL">全部状态</option>
                  <option value="PENDING">审核中</option>
                  <option value="APPROVED">已通过</option>
                  <option value="REJECTED">已驳回</option>
                </select>
                <button
                  onClick={fetchFileManagerItems}
                  className={`px-3 py-2 rounded-lg text-sm font-bold ${
                    darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  刷新
                </button>
              </div>

              {fileManagerItems.length > 0 && (
                <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllFileManager}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedFileManagerIds.length === fileManagerItems.length ? '取消全选' : '全选'}
                    </button>
                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      已选 {selectedFileManagerIds.length} / {fileManagerItems.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchFileManagerStatus('APPROVED')}
                      disabled={selectedFileManagerIds.length === 0 || actionLoading === 'bulk-file-status-APPROVED'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                    >
                      批量设为可见
                    </button>
                    <button
                      onClick={() => handleBatchFileManagerStatus('REJECTED')}
                      disabled={selectedFileManagerIds.length === 0 || actionLoading === 'bulk-file-status-REJECTED'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      批量设为隐藏
                    </button>
                    <button
                      onClick={handleBatchDeleteResources}
                      disabled={selectedFileManagerIds.length === 0 || actionLoading === 'bulk-file-delete'}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      批量删除
                    </button>
                  </div>
                </div>
              )}

              {fileManagerItems.length === 0 ? (
                <div className="text-center py-20 text-slate-500">暂无文件</div>
              ) : (
                <div className="grid gap-4">
                  {fileManagerItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 md:p-5 rounded-2xl border space-y-3 ${
                        darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedFileManagerIds.includes(item.id)}
                              onChange={() => toggleFileManagerSelection(item.id)}
                              className="w-4 h-4 accent-blue-500"
                            />
                            <FolderOpen size={16} className="text-blue-500" />
                            <h3 className={`font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{item.title}</h3>
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            课程: {item.course} · 文件: {item.fileName || '-'}
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            上传者: {item.uploader?.username || '-'} · 下载: {item.downloadCount ?? 0}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                          item.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 inline-flex items-center gap-1"
                        >
                          查看文件 <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => handleResourceAction(item.id, 'APPROVED')}
                          disabled={actionLoading === item.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                        >
                          设为可见
                        </button>
                        <button
                          onClick={() => handleResourceAction(item.id, 'REJECTED')}
                          disabled={actionLoading === item.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          设为隐藏
                        </button>
                        <button
                          onClick={() => handleRenameResource(item)}
                          disabled={actionLoading === `rename-${item.id}`}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          } disabled:opacity-50`}
                        >
                          重命名
                        </button>
                        <button
                          onClick={() => handleDeleteResource(item)}
                          disabled={actionLoading === `delete-${item.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          删除文件
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : pendingReviews.length === 0 ? (
            <div className="text-center py-20 text-slate-500">暂无待审核评论</div>
          ) : (
            <div className="grid gap-4">
              <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAllPendingReviews}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      darkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {selectedPendingReviewIds.length === pendingReviews.length ? '取消全选' : '全选'}
                  </button>
                  <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    已选 {selectedPendingReviewIds.length} / {pendingReviews.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBatchPendingReviewAction('APPROVED')}
                    disabled={selectedPendingReviewIds.length === 0 || actionLoading === 'batch-pending-APPROVED'}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                  >
                    批量通过
                  </button>
                  <button
                    onClick={() => handleBatchPendingReviewAction('REJECTED')}
                    disabled={selectedPendingReviewIds.length === 0 || actionLoading === 'batch-pending-REJECTED'}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    批量驳回
                  </button>
                </div>
              </div>

              {pendingReviews.map((review) => (
                <div
                  key={review.id}
                  className={`p-4 md:p-5 rounded-2xl border space-y-3 ${
                    darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPendingReviewIds.includes(review.id)}
                          onChange={() => togglePendingReviewSelection(review.id)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <MessageSquare size={16} className="text-blue-500" />
                        <span className={`font-bold truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {review.item?.title}
                        </span>
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        作者: {review.reviewer?.username || '-'} · 评分: {Number(review.rating || 0).toFixed(1)}
                      </div>
                      <p className={`text-sm break-words ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {review.comment || '（无文字内容）'}
                      </p>
                      {review.imageUrl && (
                        <a
                          href={review.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                        >
                          查看评论图片 <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handlePendingReviewStatus(review.id, 'APPROVED')}
                        disabled={Boolean(actionLoading)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                      >
                        通过
                      </button>
                      <button
                        onClick={() => handlePendingReviewStatus(review.id, 'REJECTED')}
                        disabled={Boolean(actionLoading)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        驳回
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
