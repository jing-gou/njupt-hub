import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import StarRating from '../components/StarRating';
import { 
  ChevronLeft, 
  Send, 
  User, 
  Calendar, 
  Loader2, 
  ThumbsUp, 
  MessageSquare, 
  AlertTriangle, 
  MapPin, 
  GraduationCap,
  Image as ImageIcon
} from 'lucide-react';

export default function ReviewDetailPage({ itemId, onBack }) {
  const { darkMode } = useTheme();
  const { token, user, isAuthed } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setLoadingSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // 新增状态：控制回复框显示
  const [activeReplyId, setActiveReplyId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  // 新增状态：举报相关
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportingLoading, setReportingLoading] = useState(false);

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
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/reviews/upload-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || '上传失败');
      }
      if (data.url) setImageUrl(data.url);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRating === 0) {
      setError('请先进行评分');
      return;
    }

    setLoadingSubmitting(true);
    setError('');
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
          imageUrl: isAuthed ? imageUrl : '' // 游客不发送图片
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '提交失败');
      }

      setComment('');
      setImageUrl('');
      setUserRating(0);
      fetchDetail(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSubmitting(false);
    }
  };

  // 处理点赞
  const handleToggleLike = async (reviewId) => {
    if (!isAuthed) return alert('请先登录');
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchDetail();
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 处理回复提交
  const handleReplySubmit = async (reviewId) => {
    if (!isAuthed) return alert('请先登录');
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
        fetchDetail();
      }
    } catch (err) {
      console.error('回复失败:', err);
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
        alert('举报已提交，我们会尽快处理');
        setReportingId(null);
        setReportReason('');
      }
    } catch (err) {
      console.error('举报失败:', err);
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
                <h1 className={`text-2xl md:text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {item.title}
                </h1>
                
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
      </div>

      {/* Write Review Section */}
      <div
        className={`rounded-2xl md:rounded-3xl border p-4 md:p-8 space-y-6 ${
          darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100 shadow-sm'
        }`}
      >
        <h2 className={`text-lg md:text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          发表评价
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                你的评分
              </label>
              {!isAuthed && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                }`}>
                  游客模式 (评分权重 0.2)
                </span>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 inline-block border border-slate-100 dark:border-slate-800">
              <StarRating
                rating={userRating}
                onRatingChange={setUserRating}
                interactive={true}
                size={32}
              />
            </div>
          </div>

          {isAuthed ? (
            <>
              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  文字评价
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="分享你的真实体验..."
                  className={`w-full p-4 rounded-2xl outline-none border transition-all h-32 resize-none ${
                    darkMode
                      ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 shadow-inner'
                  }`}
                />
              </div>

              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  图片评价 (可选)
                </label>
                <div className="flex gap-4 items-center">
                  <div className={`flex-1 relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all ${
                    imageUrl 
                      ? 'border-blue-500/50 bg-blue-500/5' 
                      : darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="py-6 flex flex-col items-center gap-2">
                      {uploading ? (
                        <Loader2 className="animate-spin text-blue-500" />
                      ) : imageUrl ? (
                        <div className="w-full px-4 text-center truncate text-blue-500 text-sm font-medium">点击更换图片</div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon className="text-slate-400" size={24} />
                          <span className="text-xs text-slate-500">点击上传图片</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {imageUrl && (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <img src={imageUrl} className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100?text=Error';
                        }}
                      />
                    </div>
                  )}
                </div>
                {/* 依然保留 URL 输入框，以防万一 */}
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="或输入图片 URL..."
                  className={`w-full p-3 rounded-xl text-xs outline-none border transition-all ${
                    darkMode
                      ? 'bg-slate-900/20 border-slate-700 text-slate-400 focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-500 focus:border-blue-500'
                  }`}
                />
              </div>
            </>
          ) : (
            <div className={`p-6 rounded-2xl border border-dashed text-center space-y-2 ${
              darkMode ? 'bg-slate-900/20 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                游客仅支持数值评分，登录后可发表文字评价与图片。
              </p>
              <button 
                type="button"
                onClick={() => onNavigate?.('login')}
                className="text-sm font-bold text-blue-500 hover:underline"
              >
                立即登录
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-red-500 font-medium">{error}</div>
            <button
              type="submit"
              disabled={submitting}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
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
                  <div className={`p-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    <User size={16} className={darkMode ? 'text-slate-300' : 'text-slate-500'} />
                  </div>
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
                <StarRating rating={review.rating} size={14} />
              </div>
              <p className={`leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {review.comment}
              </p>
              {review.imageUrl && (
                <div className="w-32 h-32 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
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
