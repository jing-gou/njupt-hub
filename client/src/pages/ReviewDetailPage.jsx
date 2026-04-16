import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import StarRating from '../components/StarRating';
import toast from 'react-hot-toast';
import { compressImageForUpload } from '../utils/imageCompression';
import { getAvatarFallbackUrl } from '../utils/avatar';
import { 
  ChevronLeft, 
  Send, 
  Calendar, 
  Loader2, 
  ThumbsUp, 
  MessageSquare, 
  AlertTriangle, 
  MapPin, 
  GraduationCap,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X
} from 'lucide-react';

export default function ReviewDetailPage({ itemId, onBack, onNavigate }) {
  const { darkMode } = useTheme();
  const { token, user, isAuthed } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEV';
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setLoadingSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrls, setImageUrls] = useState([]);
  const [uploading, setUploading] = useState(false);

  // 新增状态：控制回复框显示
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // 新增状态：举报相关
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportingLoading, setReportingLoading] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [editingItem, setEditingItem] = useState(false);
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemEditTitle, setItemEditTitle] = useState('');
  const [itemEditDescription, setItemEditDescription] = useState('');
  const [itemEditLocation, setItemEditLocation] = useState('');
  const [itemEditCollege, setItemEditCollege] = useState('');
  const [itemUploading, setItemUploading] = useState(false);

  const fetchDetail = async () => {
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/reviews/items/${itemId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '获取详情失败');
      setItem(data);
    } catch (err) {
      console.error('获取详情失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [itemId, token]);

  const handleImageUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;
    if (imageUrls.length >= 5) {
      toast.error('最多上传 5 张图片');
      return;
    }
    if (!isAuthed || !token) {
      toast.error('请先登录后再上传图片');
      return;
    }
    const remainSlots = Math.max(0, 5 - imageUrls.length);
    const files = selectedFiles.slice(0, remainSlots);
    if (selectedFiles.length > remainSlots) {
      toast.error('最多上传 5 张图片，超出部分已忽略');
    }

    setUploading(true);

    try {
      const uploadedUrls = [];
      for (const file of files) {
        if (!file.type?.startsWith('image/')) {
          toast.error(`已忽略非图片文件：${file.name}`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`图片大小不能超过 10MB：${file.name}`);
          continue;
        }

        const compressedFile = await compressImageForUpload(file);
        const formData = new FormData();
        formData.append('image', compressedFile);
        const res = await fetch('/api/reviews/upload-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
        const contentType = res.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
          ? await res.json()
          : { message: await res.text() };
        if (!res.ok) {
          throw new Error(data.message || data.error || `上传失败 (${res.status})`);
        }
        if (data.url) uploadedUrls.push(data.url);
      }
      if (uploadedUrls.length === 0) {
        throw new Error('没有图片上传成功');
      }
      setImageUrls((prev) => [...prev, ...uploadedUrls].slice(0, 5));
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || '图片上传失败');
    } finally {
      setUploading(false);
      if (e?.target) e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRating === 0) {
      toast.error('请先进行评分');
      return;
    }

    setLoadingSubmitting(true);
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          itemId,
          rating: userRating,
          comment: isAuthed ? comment : '', // 游客不发送评论
          imageUrl: isAuthed ? (imageUrls[0] || '') : '' // 后端当前为单图字段
        })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || '提交失败');
      }
      setComment('');
      setImageUrls([]);
      setUserRating(0);
      toast.success(data?.message || '发布成功');
      fetchDetail(); 
    } catch (err) {
      toast.error(err.message || '提交失败');
    } finally {
      setLoadingSubmitting(false);
    }
  };

  const beginEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditRating(Number(review.rating || 0));
    setEditComment(review.comment || '');
    setEditImageUrl(review.imageUrl || '');
  };

  const beginEditItem = () => {
    if (!item) return;
    setEditingItem(true);
    setItemEditTitle(item.title || '');
    setItemEditDescription(item.description || '');
    setItemEditLocation(item.location || '');
    setItemEditCollege(item.college || '');
  };

  const cancelEditItem = () => {
    setEditingItem(false);
    setItemEditTitle('');
    setItemEditDescription('');
    setItemEditLocation('');
    setItemEditCollege('');
  };

  const handleItemImageUploadByAdmin = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAuthed || !token) return toast.error('请先登录');
    if (!isAdmin) return toast.error('无权限');
    if (!file.type?.startsWith('image/')) return toast.error('仅支持上传图片文件');
    if (file.size > 10 * 1024 * 1024) return toast.error('图片大小不能超过 10MB');

    setItemUploading(true);
    try {
      const compressedFile = await compressImageForUpload(file);
      const formData = new FormData();
      formData.append('image', compressedFile);
      const res = await fetch(`/api/reviews/admin/items/${itemId}/image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { message: await res.text() };
      if (!res.ok) throw new Error(data?.message || data?.error || `上传失败 (${res.status})`);
      toast.success('图片已更新');
      // 上传即覆盖：直接刷新详情，让头图立刻变更
      fetchDetail();
    } catch (err) {
      toast.error(err.message || '上传失败');
    } finally {
      setItemUploading(false);
      // 允许重复选择同一文件触发 change
      if (e?.target) e.target.value = '';
    }
  };

  const handleUpdateItemByAdmin = async () => {
    if (!isAuthed || !token) return toast.error('请先登录');
    if (!isAdmin) return toast.error('无权限');
    const nextTitle = String(itemEditTitle || '').trim();
    if (!nextTitle) return toast.error('标题不能为空');

    setItemSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/admin/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: nextTitle,
          description: itemEditDescription,
          location: itemEditLocation,
          college: itemEditCollege,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '修改失败');
      toast.success('项目已更新');
      cancelEditItem();
      fetchDetail();
    } catch (err) {
      toast.error(err.message || '修改失败');
    } finally {
      setItemSubmitting(false);
    }
  };

  const handleDeleteItemByAdmin = async () => {
    if (!isAuthed || !token) return toast.error('请先登录');
    if (!isAdmin) return toast.error('无权限');
    const confirmed = window.confirm('确认删除该评价项目吗？这将删除该项目下所有评价、回复、点赞与举报记录，且不可撤销。');
    if (!confirmed) return;

    setItemSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/admin/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '删除失败');
      toast.success('项目已删除');
      onBack?.();
    } catch (err) {
      toast.error(err.message || '删除失败');
    } finally {
      setItemSubmitting(false);
    }
  };

  const cancelEditReview = () => {
    setEditingReviewId(null);
    setEditRating(0);
    setEditComment('');
    setEditImageUrl('');
  };

  const handleUpdateReview = async () => {
    if (!editingReviewId) return;
    if (editRating <= 0) return toast.error('评分必须大于 0');
    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${editingReviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment,
          imageUrl: editImageUrl,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '修改失败');
      toast.success(data?.message || '修改成功');
      cancelEditReview();
      fetchDetail();
    } catch (err) {
      toast.error(err.message || '修改失败');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteReview = async (review) => {
    if (!isAuthed || !token) return toast.error('请先登录');
    const canAdminDelete = user?.role === 'ADMIN' || user?.role === 'DEV';
    const isOwner = user?.id === review.reviewerId;
    if (!isOwner && !canAdminDelete) return toast.error('无权删除');

    const confirmed = window.confirm('确认删除该评价吗？此操作不可撤销。');
    if (!confirmed) return;

    try {
      const endpoint = canAdminDelete && !isOwner
        ? `/api/reviews/admin/reviews/${review.id}`
        : `/api/reviews/${review.id}`;
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || data?.error || '删除失败');
      toast.success('删除成功');
      if (editingReviewId === review.id) cancelEditReview();
      fetchDetail();
    } catch (err) {
      toast.error(err.message || '删除失败');
    }
  };

  // 处理点赞
  const handleToggleLike = async (reviewId) => {
    if (!isAuthed) return toast.error('请先登录');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchDetail();
    } catch (err) {
      console.error('点赞失败:', err);
      toast.error('点赞失败');
    }
  };

  // 处理回复提交
  const handleReplySubmit = async (reviewId) => {
    if (!isAuthed) return toast.error('请先登录');
    if (!replyContent.trim()) return;

    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: replyContent })
      });
      if (res.ok) {
        setReplyContent('');
        setActiveReplyId(null);
        toast.success('回复成功');
        fetchDetail();
      }
    } catch (err) {
      console.error('回复失败:', err);
      toast.error('回复失败');
    }
  };

  // 处理举报
  const handleReportSubmit = async () => {
    if (!isAuthed) return;
    if (!reportReason.trim()) return;

    setReportingLoading(true);
    try {
      const res = await fetch(`/api/reviews/${reportingId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reportReason })
      });
      if (res.ok) {
        toast.success('举报已提交，我们会尽快处理');
        setReportingId(null);
        setReportReason('');
      }
    } catch (err) {
      console.error('举报失败:', err);
      toast.error('举报失败');
    } finally {
      setReportingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in slide-in-from-bottom duration-500">
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
          darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
        }`}
      >
        <ChevronLeft size={20} />
        <span>返回列表</span>
      </button>

      {/* Header Card */}
      <div
        className={`rounded-2xl md:rounded-3xl border p-4 md:p-8 space-y-6 ${
          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
          <div className={`w-24 h-24 md:w-48 md:h-48 rounded-xl md:rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 ${item.type === 'MENTOR' ? 'rounded-full' : ''}`}>
            <img
              src={item.imageUrl || 'https://placehold.co/200x200?text=Item'}
              alt={item.title}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/200x200?text=Error';
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {item.title}
                  </h1>
                  {isAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={beginEditItem}
                        disabled={itemSubmitting}
                        className={`p-2 rounded-xl border transition-all ${
                          darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800/60' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        } ${itemSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title="编辑项目"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteItemByAdmin}
                        disabled={itemSubmitting}
                        className={`p-2 rounded-xl border transition-all ${
                          darkMode ? 'border-red-500/30 text-red-300 hover:bg-red-500/10' : 'border-red-200 text-red-600 hover:bg-red-50'
                        } ${itemSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title="删除项目"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 新增字段显示 */}
                {(item.location || item.college) && (
                  <div className="flex flex-wrap gap-3 mt-2">
                    {item.location && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        <MapPin size={14} />
                        {item.location}
                      </span>
                    )}
                    {item.college && (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        darkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        <GraduationCap size={14} />
                        {item.college}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <p className={`text-base md:text-lg leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {item.description}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className={`text-xs md:text-sm font-medium ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                当前综合评分
              </span>
              <div className="flex items-center gap-3">
                <span className={`text-3xl md:text-4xl font-black ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`}>
                  {(item.avgRating || 0).toFixed(1)}
                </span>
                <StarRating rating={item.avgRating || 0} size={20} />
              </div>
            </div>
          </div>
        </div>

        {editingItem && isAdmin && (
          <div className={`mt-2 rounded-2xl border p-4 md:p-5 space-y-3 animate-in fade-in duration-200 ${
            darkMode ? 'bg-slate-900/30 border-slate-700' : 'bg-slate-50/60 border-slate-200'
          }`}>
            <div className="text-sm font-bold text-blue-500">编辑项目</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>标题</div>
                <input
                  value={itemEditTitle}
                  onChange={(e) => setItemEditTitle(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-sm ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>图片（上传覆盖）</div>
                <div className="flex items-center gap-3">
                  <div className={`w-16 h-16 rounded-xl overflow-hidden border ${
                    darkMode ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white'
                  } ${item.type === 'MENTOR' ? 'rounded-full' : ''}`}>
                    <img
                      src={item.imageUrl || 'https://placehold.co/200x200?text=Item'}
                      alt="Item"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://placehold.co/200x200?text=Error';
                      }}
                    />
                  </div>
                  <label className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    darkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                  } ${itemUploading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {itemUploading ? '上传中...' : '选择图片'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={itemUploading}
                      onChange={handleItemImageUploadByAdmin}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>地点（可选）</div>
                <input
                  value={itemEditLocation}
                  onChange={(e) => setItemEditLocation(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-sm ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>学院（可选）</div>
                <input
                  value={itemEditCollege}
                  onChange={(e) => setItemEditCollege(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border outline-none text-sm ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>简介（可选）</div>
              <textarea
                value={itemEditDescription}
                onChange={(e) => setItemEditDescription(e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 rounded-xl border outline-none text-sm ${
                  darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpdateItemByAdmin}
                disabled={itemSubmitting || itemUploading}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                保存项目
              </button>
              <button
                type="button"
                onClick={cancelEditItem}
                disabled={itemSubmitting || itemUploading}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${
                  darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-60`}
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Write Review Section */}
      <div
        className={`rounded-2xl border p-4 md:p-5 space-y-4 ${
          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
        }`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className={`text-base md:text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              发表评价
            </h2>
            {!isAuthed && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`}>
                游客模式 (评分权重 0.2)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              你的评分
            </span>
            <StarRating
              rating={userRating}
              onRatingChange={setUserRating}
              interactive={true}
              size={26}
            />
          </div>

          {isAuthed ? (
            <>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
                    darkMode ? 'border-slate-700 hover:border-slate-600 bg-slate-900/30' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                  } ${(uploading || imageUrls.length >= 5) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploading || imageUrls.length >= 5}
                      className="hidden"
                    />
                    {uploading ? (
                      <Loader2 className="animate-spin text-blue-500" size={16} />
                    ) : (
                      <ImageIcon className={darkMode ? 'text-slate-400' : 'text-slate-500'} size={18} />
                    )}
                  </label>
                  {imageUrls.map((url, idx) => (
                    <div key={`${url}-${idx}`} className={`relative w-16 h-16 rounded-lg overflow-hidden border ${
                      darkMode ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <img src={url} className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100?text=Error';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  最多添加 5 张图片（当前 {imageUrls.length}/5）
                </div>
              </div>

              <div className="space-y-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="分享你的真实体验..."
                  className={`w-full p-3 rounded-xl outline-none border transition-all h-24 resize-none text-sm ${
                    darkMode
                      ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 shadow-inner'
                  }`}
                />
              </div>
            </>
          ) : (
            <div className={`p-4 rounded-xl border border-dashed text-center space-y-1.5 ${
              darkMode ? 'bg-slate-900/20 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                游客仅支持数值评分，登录后可发表文字评价与图片。
              </p>
              <button 
                type="button"
                onClick={() => onNavigate?.('login')}
                className="text-xs font-bold text-blue-500 hover:underline"
              >
                立即登录
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                darkMode
                  ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
              } ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {submitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              <span>发布评价</span>
            </button>
          </div>
        </form>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        <h2 className={`text-xl font-bold px-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          全部评价 ({item.reviews?.length || 0})
        </h2>
        <div className="space-y-4">
          {item.reviews?.map((review) => (
            <div
              key={review.id}
              className={`rounded-2xl border p-6 space-y-4 ${
                darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={review.reviewer?.avatarUrl || getAvatarFallbackUrl(review.reviewer?.username, 40)}
                    alt={review.reviewer?.username || '用户'}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getAvatarFallbackUrl(review.reviewer?.username, 40);
                    }}
                  />
                  <div>
                    <div className={`font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {review.reviewer?.username}
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <Calendar size={12} />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {review.status === 'PENDING' && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                    }`}>
                      待审核
                    </span>
                  )}
                  {review.status === 'REJECTED' && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      darkMode ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      已驳回
                    </span>
                  )}
                  <StarRating rating={review.rating} size={14} />
                </div>
              </div>
              {editingReviewId === review.id ? (
                <div className="space-y-3">
                  <StarRating
                    rating={editRating}
                    onRatingChange={setEditRating}
                    interactive={true}
                    size={22}
                  />
                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    className={`w-full p-3 rounded-xl border outline-none ${
                      darkMode ? 'bg-slate-900/50 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                    rows={3}
                  />
                  <input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="图片 URL（可选）"
                    className={`w-full p-2 rounded-xl text-xs border outline-none ${
                      darkMode ? 'bg-slate-900/30 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateReview}
                      disabled={editSubmitting}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      保存修改
                    </button>
                    <button
                      onClick={cancelEditReview}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {review.comment}
                </p>
              )}
              {review.imageUrl && (
                <div className={`w-32 h-32 rounded-xl overflow-hidden border ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <img src={review.imageUrl} alt="Review" className="w-full h-full object-cover" 
                    crossOrigin="anonymous"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/100x100?text=Error';
                    }}
                  />
                </div>
              )}

              {/* 点赞、回复、举报操作栏 */}
              <div className="flex items-center gap-6 pt-2">
                <button
                  onClick={() => handleToggleLike(review.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                    review.isLiked
                      ? 'text-blue-500 scale-110'
                      : darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ThumbsUp size={14} className={review.isLiked ? 'fill-blue-500' : ''} />
                  <span>{review.likesCount || 0}</span>
                </button>
                <button
                  onClick={() => setActiveReplyId(activeReplyId === review.id ? null : review.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                    darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <MessageSquare size={14} />
                  <span>{review.replies?.length || 0} 回复</span>
                </button>
                <button
                  onClick={() => setReportingId(reportingId === review.id ? null : review.id)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                    reportingId === review.id
                      ? 'text-red-500 scale-110'
                      : darkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'
                  }`}
                >
                  <AlertTriangle size={14} />
                  <span>举报</span>
                </button>
                {isAuthed && user?.id === review.reviewerId && (
                  <button
                    onClick={() => beginEditReview(review)}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-all ${
                      darkMode ? 'text-slate-500 hover:text-blue-300' : 'text-slate-400 hover:text-blue-600'
                    }`}
                  >
                    <Pencil size={14} />
                    <span>编辑</span>
                  </button>
                )}
                {isAuthed && (user?.id === review.reviewerId || user?.role === 'ADMIN' || user?.role === 'DEV') && (
                  <button
                    onClick={() => handleDeleteReview(review)}
                    className="flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={14} />
                    <span>删除</span>
                  </button>
                )}
              </div>

              {/* 举报输入框 */}
              {reportingId === review.id && (
                <div className={`mt-4 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${
                  darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'
                }`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                        举报该评价
                      </span>
                      <button 
                        onClick={() => setReportingId(null)}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        取消
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        placeholder="请输入举报原因（如：广告、人身攻击等）"
                        className={`flex-1 px-4 py-2 text-sm rounded-xl border outline-none transition-all ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-red-500'
                            : 'bg-white border-slate-200 text-slate-800 focus:border-red-500'
                        }`}
                        autoFocus
                      />
                      <button
                        onClick={handleReportSubmit}
                        disabled={reportingLoading || !reportReason.trim()}
                        className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                          reportingLoading || !reportReason.trim()
                            ? 'opacity-50 cursor-not-allowed bg-slate-400'
                            : 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20'
                        }`}
                      >
                        {reportingLoading ? <Loader2 className="animate-spin" size={16} /> : '提交'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 回复列表 */}
              {review.replies && review.replies.length > 0 && (
                <div className={`mt-4 p-4 rounded-xl space-y-3 ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  {review.replies.map((reply) => (
                    <div key={reply.id} className="text-sm">
                      <span className={`font-bold mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {reply.user?.username}:
                      </span>
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{reply.content}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 发表回复框 */}
              {activeReplyId === review.id && (
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="写下你的回复..."
                    className={`flex-1 px-4 py-2 text-sm rounded-xl border outline-none transition-all ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-blue-500'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                    }`}
                  />
                  <button
                    onClick={() => handleReplySubmit(review.id)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all"
                  >
                    发送
                  </button>
                </div>
              )}
            </div>
          ))}
          {(!item.reviews || item.reviews.length === 0) && (
            <div className="text-center py-12">
              <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>暂无评价，快来抢沙发吧！</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
