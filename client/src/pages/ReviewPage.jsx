import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ReviewCard from '../components/ReviewCard';
import ReviewDetailPage from './ReviewDetailPage';
import { Users, Utensils, ShoppingBag, Loader2, Plus, X, Image as ImageIcon, Search, ChevronDown, SlidersHorizontal, ArrowUpDown, Flame, MapPin, School, Layers, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { compressImageForUpload } from '../utils/imageCompression';

const TABS = [
  { id: 'CANTEEN', label: '食堂档口', icon: Utensils },
  { id: 'TAKEOUT', label: '外卖店铺', icon: ShoppingBag },
  { id: 'MENTOR', label: '导师', icon: Users },
];

export default function ReviewPage() {
  const { darkMode } = useTheme();
  const { token, isAuthed } = useAuth();
  const [activeTab, setActiveTab] = useState('CANTEEN');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter / Sort States
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedCanteenArea, setSelectedCanteenArea] = useState('');
  const [selectedCanteenFloor, setSelectedCanteenFloor] = useState('');
  const [selectedMentorCollege, setSelectedMentorCollege] = useState('');
  const [sortKey, setSortKey] = useState('HEAT'); // 'RATING' | 'HEAT'
  const [sortOrder, setSortOrder] = useState('DESC'); // 'ASC' | 'DESC'

  const parseCanteenLocation = (location) => {
    if (!location) return { area: '', floor: '' };
    const m = String(location).trim().match(/^(.+?)\s*-\s*(\d+)\s*楼$/);
    if (m) return { area: m[1], floor: `${m[2]}楼` };
    // fallback: try split by '-' and keep raw
    const parts = String(location).split('-').map(s => s.trim()).filter(Boolean);
    return { area: parts[0] || '', floor: parts[1] || '' };
  };

  const heatScore = (item) => {
    const rating = Number(item.avgRating || 0);
    const count = Number(item.reviewCount || 0);
    // 综合：评分分值 × 评分数量（简单直观，可解释）
    return rating * count;
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const baseSearchedItems = items.filter((item) => {
    if (!normalizedQuery) return true;
    return (
      String(item.title || '').toLowerCase().includes(normalizedQuery) ||
      String(item.description || '').toLowerCase().includes(normalizedQuery)
    );
  });

  const filteredAndSortedItems = baseSearchedItems
    .filter((item) => {
      if (activeTab === 'CANTEEN') {
        const { area, floor } = parseCanteenLocation(item.location);
        if (selectedCanteenArea && area !== selectedCanteenArea) return false;
        if (selectedCanteenFloor && floor !== selectedCanteenFloor) return false;
      }
      if (activeTab === 'MENTOR') {
        if (selectedMentorCollege && String(item.college || '') !== selectedMentorCollege) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const dir = sortOrder === 'ASC' ? 1 : -1;
      if (sortKey === 'RATING') {
        return dir * (Number(a.avgRating || 0) - Number(b.avgRating || 0));
      }
      // HEAT
      return dir * (heatScore(a) - heatScore(b));
    });

  const canteenAreas = Array.from(
    new Set(
      items
        .filter((i) => i.type === 'CANTEEN')
        .map((i) => parseCanteenLocation(i.location).area)
        .filter(Boolean)
    )
  );
  const canteenFloors = Array.from(
    new Set(
      items
        .filter((i) => i.type === 'CANTEEN')
        .map((i) => parseCanteenLocation(i.location).floor)
        .filter(Boolean)
    )
  );
  const mentorColleges = Array.from(
    new Set(
      items
        .filter((i) => i.type === 'MENTOR')
        .map((i) => String(i.college || '').trim())
        .filter(Boolean)
    )
  );

  const resetFiltersForTab = (tab) => {
    if (tab === 'CANTEEN') {
      setSelectedCanteenArea('');
      setSelectedCanteenFloor('');
    } else if (tab === 'MENTOR') {
      setSelectedMentorCollege('');
    }
  };

  const Chip = ({ active, onClick, children, title }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] font-bold transition-all ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
          : darkMode
            ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
            : 'border-slate-200 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {active && <Check size={14} />}
      {children}
    </button>
  );

  // Add Item Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newLocationArea, setNewLocationArea] = useState('南一');
  const [newLocationFloor, setNewLocationFloor] = useState('1楼');
  const [newCollege, setNewCollege] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/items?type=${activeTab}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error('Review items data is not an array:', data);
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to fetch review items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAuthed || !token) {
      toast.error('请先登录后再上传图片');
      return;
    }
    if (!file.type?.startsWith('image/')) {
      toast.error('仅支持上传图片文件');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过 10MB');
      return;
    }

    setUploading(true);

    try {
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
      if (data.url) setNewImageUrl(data.url);
      else throw new Error('上传成功但未返回图片链接');
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error(err.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error('请输入名称');

    setIsSubmitting(true);
    const body = {
      title: newTitle,
      description: newDesc,
      imageUrl: newImageUrl,
      type: activeTab,
    };

    // 添加特定字段
    if (activeTab === 'CANTEEN') {
      body.location = `${newLocationArea} - ${newLocationFloor}`;
    } else if (activeTab === 'MENTOR') {
      body.college = newCollege;
    }

    try {
      const res = await fetch('/api/reviews/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewImageUrl('');
        toast.success('添加成功');
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.message || '添加失败');
      }
    } catch (err) {
      console.error('Add item failed:', err);
      toast.error('添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  // 切换 Tab 时关闭面板并清理不相关筛选，避免“筛不到东西”
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    setShowFilterPanel(false);
    resetFiltersForTab(activeTab);
  }, [activeTab]);

  if (selectedItemId) {
    return (
      <ReviewDetailPage
        itemId={selectedItemId}
        onBack={() => {
          setSelectedItemId(null);
          fetchItems(); // 返回时刷新列表以获取最新评分
        }}
      />
    );
  }

  return (
    <>
      {/* 搜索框遮罩 - 移到最外层以确保 fixed 覆盖全屏 */}
      <div 
        className={`fixed inset-0 z-[60] transition-all duration-300 ${isSearching ? 'backdrop-blur-md bg-black/40 visible opacity-100' : 'invisible opacity-0'}`} 
        onClick={() => setIsSearching(false)} 
      />

      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
        {/* Navigation & Search Container */}
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
        
        {/* Tabs Container - 移动端改为正常流布局，避免与搜索框重叠 */}
        <div className={`w-full md:w-auto z-10 transition-all duration-500 ease-in-out ${isSearching ? 'blur-sm opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <div
            className={`flex items-center justify-center p-1.5 rounded-2xl border backdrop-blur-md shadow-lg overflow-x-auto no-scrollbar ${
              darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-100'
            }`}
          >
            <div className="flex gap-1.5 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : `${
                            darkMode
                              ? 'text-slate-400 hover:bg-slate-700/50'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowFilterPanel(v => !v)}
                className={`md:hidden flex-1 flex items-center justify-center py-2 px-3 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                  showFilterPanel
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : `${
                        darkMode
                          ? 'text-slate-300 hover:bg-slate-700/50'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`
                }`}
                aria-label="筛选和排序"
                title="筛选和排序"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter / Sort Button */}
        <div className={`hidden md:block relative transition-all duration-500 ease-in-out ${
          isSearching ? 'blur-sm opacity-50 pointer-events-none' : 'opacity-100'
        } ${showFilterPanel ? 'z-[80]' : 'z-10'}`}>
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            aria-label="筛选和排序"
            title="筛选和排序"
            className={`w-11 h-11 inline-flex items-center justify-center rounded-2xl border backdrop-blur-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
              darkMode
                ? 'bg-slate-800/90 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>

          {showFilterPanel && (
            <div className={`absolute z-[90] mt-3 w-full md:w-[380px] right-0 rounded-2xl md:rounded-3xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden backdrop-blur-xl ${
              darkMode ? 'bg-slate-800/95 border-slate-700 shadow-blue-900/20' : 'bg-slate-100/95 border-slate-200 shadow-blue-500/10'
            }`}>
              {/* Header */}
              <div className={`px-4 md:px-5 py-3 border-b ${darkMode ? 'border-slate-700/60' : 'border-slate-200/60'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>筛选与排序</div>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    aria-label="关闭"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-4 md:px-5 py-4 space-y-5 max-h-[60vh] overflow-auto">
                {/* 筛选组 */}
                {(activeTab === 'CANTEEN' || activeTab === 'MENTOR') && (
                  <div className="space-y-3">
                    {activeTab === 'CANTEEN' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>食堂</label>
                          <select
                            value={selectedCanteenArea}
                            onChange={(e) => setSelectedCanteenArea(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                              darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                            }`}
                          >
                            <option value="">全部</option>
                            {canteenAreas.map(a => (
                              <option key={a} value={a}>{a}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>楼层</label>
                          <select
                            value={selectedCanteenFloor}
                            onChange={(e) => setSelectedCanteenFloor(e.target.value)}
                            className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                              darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                            }`}
                          >
                            <option value="">全部</option>
                            {canteenFloors.map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {activeTab === 'MENTOR' && (
                      <div className="space-y-1.5">
                        <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>学院</label>
                        <select
                          value={selectedMentorCollege}
                          onChange={(e) => setSelectedMentorCollege(e.target.value)}
                          className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                            darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                          }`}
                        >
                          <option value="">全部学院</option>
                          {mentorColleges.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* 排序组 */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        if (sortKey === 'RATING') {
                          setSortOrder((v) => (v === 'ASC' ? 'DESC' : 'ASC'));
                        } else {
                          setSortKey('RATING');
                          setSortOrder('DESC');
                        }
                      }}
                      className={`rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${
                        sortKey === 'RATING'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                          : darkMode
                            ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpDown size={14} />
                        <span className="text-xs font-bold">按评分</span>
                      </div>
                      <span className={`text-[10px] font-black ${sortKey === 'RATING' ? 'text-white/95' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {sortKey === 'RATING' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        if (sortKey === 'HEAT') {
                          setSortOrder((v) => (v === 'ASC' ? 'DESC' : 'ASC'));
                        } else {
                          setSortKey('HEAT');
                          setSortOrder('DESC');
                        }
                      }}
                      className={`rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${
                        sortKey === 'HEAT'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                          : darkMode
                            ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Flame size={14} />
                        <span className="text-xs font-bold">按热度</span>
                      </div>
                      <span className={`text-[10px] font-black ${sortKey === 'HEAT' ? 'text-white/95' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {sortKey === 'HEAT' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Mobile Filter Panel */}
        {showFilterPanel && (
          <div className={`md:hidden fixed inset-x-4 top-28 z-[90] rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden backdrop-blur-xl ${
            darkMode ? 'bg-slate-800/95 border-slate-700 shadow-blue-900/20' : 'bg-slate-100/95 border-slate-200 shadow-blue-500/10'
          }`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-slate-700/60' : 'border-slate-200/60'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>筛选与排序</div>
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className={`p-1.5 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                  aria-label="关闭"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-5 max-h-[60vh] overflow-auto">
              {(activeTab === 'CANTEEN' || activeTab === 'MENTOR') && (
                <div className="space-y-3">
                  {activeTab === 'CANTEEN' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>食堂</label>
                        <select
                          value={selectedCanteenArea}
                          onChange={(e) => setSelectedCanteenArea(e.target.value)}
                          className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                            darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                          }`}
                        >
                          <option value="">全部</option>
                          {canteenAreas.map(a => (
                            <option key={a} value={a}>{a}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>楼层</label>
                        <select
                          value={selectedCanteenFloor}
                          onChange={(e) => setSelectedCanteenFloor(e.target.value)}
                          className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                            darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                          }`}
                        >
                          <option value="">全部</option>
                          {canteenFloors.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'MENTOR' && (
                    <div className="space-y-1.5">
                      <label className={`text-[11px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>学院</label>
                      <select
                        value={selectedMentorCollege}
                        onChange={(e) => setSelectedMentorCollege(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl border outline-none text-xs font-bold transition-all ${
                          darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-slate-200/50 border-slate-200 text-slate-800 focus:border-blue-500'
                        }`}
                      >
                        <option value="">全部学院</option>
                        {mentorColleges.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (sortKey === 'RATING') {
                        setSortOrder((v) => (v === 'ASC' ? 'DESC' : 'ASC'));
                      } else {
                        setSortKey('RATING');
                        setSortOrder('DESC');
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${
                      sortKey === 'RATING'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : darkMode
                          ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpDown size={14} />
                      <span className="text-xs font-bold">按评分</span>
                    </div>
                    <span className={`text-[10px] font-black ${sortKey === 'RATING' ? 'text-white/95' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {sortKey === 'RATING' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (sortKey === 'HEAT') {
                        setSortOrder((v) => (v === 'ASC' ? 'DESC' : 'ASC'));
                      } else {
                        setSortKey('HEAT');
                        setSortOrder('DESC');
                      }
                    }}
                    className={`rounded-xl border px-3 py-2 flex items-center justify-between transition-all ${
                      sortKey === 'HEAT'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                        : darkMode
                          ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame size={14} />
                      <span className="text-xs font-bold">按热度</span>
                    </div>
                    <span className={`text-[10px] font-black ${sortKey === 'HEAT' ? 'text-white/95' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {sortKey === 'HEAT' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Box Wrapper - 处理位置和宽度 */}
        <div className={`transition-all duration-500 ease-in-out ${
          isSearching 
            ? 'fixed inset-x-0 top-[15vh] px-4 md:px-0 flex justify-center z-[70]' 
            : 'relative w-full md:w-auto md:ml-auto md:max-w-xs z-10'
        }`}>
          <div className={`w-full transition-all duration-500 ease-out ${
            isSearching ? 'md:max-w-2xl md:scale-110 scale-[1.02]' : 'scale-100'
          }`}>
            <div className={`relative group ${darkMode ? 'bg-slate-800/90' : 'bg-slate-100/90'} backdrop-blur-lg rounded-2xl shadow-xl border ${isSearching ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'} transition-all duration-300`}>
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isSearching ? 'text-blue-500' : 'text-slate-400'}`} size={20} />
              <input 
                type="text" 
                value={searchQuery} 
                onFocus={() => setIsSearching(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索项目名称或简介..."
                className={`w-full pl-12 pr-4 py-3 bg-transparent outline-none text-base ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
              />
              {isSearching && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsSearching(false); setSearchQuery(''); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* 实时搜索结果列表 (位于模糊蒙版之上) */}
            {isSearching && searchQuery && (
              <div className={`absolute top-full left-0 right-0 mt-6 max-h-[60vh] overflow-y-auto p-6 rounded-3xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                darkMode ? 'bg-slate-800/95 border-slate-700 shadow-blue-900/20' : 'bg-slate-100/95 border-slate-100 shadow-blue-500/10'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAndSortedItems.map((item) => (
                    <ReviewCard
                      key={item.id}
                      item={item}
                      darkMode={darkMode}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setIsSearching(false);
                      }}
                    />
                  ))}
                </div>
                {filteredAndSortedItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      没有找到与 "{searchQuery}" 相关的项目
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Content (原有的静态列表，搜索时会变模糊) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>正在加载...</p>
        </div>
      ) : (
        filteredAndSortedItems.length === 0 ? (
          <div className={`text-center py-20 transition-all duration-500 ${isSearching ? 'opacity-10 blur-md pointer-events-none' : 'opacity-100'}`}>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>暂无符合条件的项目</p>
          </div>
        ) : (
          <div className={`transition-all duration-500 ${
            isSearching ? 'opacity-10 blur-md pointer-events-none' : 'opacity-100'
          }`}>
            <div className="columns-1 md:columns-2 lg:columns-3 md:gap-6">
              {filteredAndSortedItems.map((item) => (
                <div key={item.id} className="mb-6 break-inside-avoid">
                  <ReviewCard
                    item={item}
                    darkMode={darkMode}
                    onClick={() => setSelectedItemId(item.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (!isAuthed) {
            toast.error('请先登录后再添加评价项');
            return;
          }
          setShowAddModal(true);
        }}
        className={`fixed bottom-24 md:bottom-8 right-6 md:right-8 p-4 rounded-full shadow-2xl transition-all transform hover:scale-110 active:scale-95 z-[60] ${
          darkMode 
            ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/40'
        }`}
      >
        <Plus size={28} />
      </button>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className={`relative w-full max-w-lg rounded-3xl shadow-2xl border p-8 animate-in zoom-in-95 duration-300 ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeTab === 'CANTEEN' && '添加食堂档口'}
                {activeTab === 'TAKEOUT' && '添加外卖店铺'}
                {activeTab === 'MENTOR' && '添加导师'}
              </h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-5">
              {/* 头图/头像 - 统一上传逻辑 */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {activeTab === 'MENTOR' ? '头像' : '头图 (可选)'}
                </label>
                <div className="flex gap-4 items-center">
                  <div className={`flex-1 relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all ${
                    newImageUrl 
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
                      ) : newImageUrl ? (
                        <div className="w-full px-4 text-center truncate text-blue-500 text-sm font-medium">点击更换图片</div>
                      ) : (
                        <>
                          <ImageIcon className="text-slate-400" size={24} />
                          <span className="text-xs text-slate-500">点击上传图片</span>
                        </>
                      )}
                    </div>
                  </div>
                  {newImageUrl && (
                    <div className={`w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 ${activeTab === 'MENTOR' ? 'rounded-full' : ''}`}>
                      <img src={newImageUrl} className="w-full h-full object-cover" 
                        crossOrigin="anonymous"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://placehold.co/100x100?text=Error';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 名称/姓名 */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  {activeTab === 'MENTOR' ? '姓名' : '店铺名'}
                </label>
                <input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`请输入${activeTab === 'MENTOR' ? '姓名' : '店铺名称'}`}
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* 食堂特定字段：位置 */}
              {activeTab === 'CANTEEN' && (
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>位置</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <select
                        value={newLocationArea}
                        onChange={(e) => setNewLocationArea(e.target.value)}
                        className={`appearance-none w-full px-4 py-3 rounded-xl border outline-none cursor-pointer transition-all ${
                          darkMode 
                            ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500 hover:bg-slate-800/60 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 shadow-sm'
                        }`}
                      >
                        <option value="南一">南一</option>
                        <option value="南二">南二</option>
                        <option value="南三">南三</option>
                      </select>
                      <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-40%] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>

                    <div className="relative group">
                      <select
                        value={newLocationFloor}
                        onChange={(e) => setNewLocationFloor(e.target.value)}
                        className={`appearance-none w-full px-4 py-3 rounded-xl border outline-none cursor-pointer transition-all ${
                          darkMode 
                            ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500 hover:bg-slate-800/60 focus:ring-2 focus:ring-blue-500/20' 
                            : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 shadow-sm'
                        }`}
                      >
                        <option value="1楼">1楼</option>
                        <option value="2楼">2楼</option>
                      </select>
                      <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform group-hover:translate-y-[-40%] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* 导师特定字段：学院 */}
              {activeTab === 'MENTOR' && (
                <div className="space-y-2">
                  <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>学院</label>
                  <input
                    required
                    value={newCollege}
                    onChange={(e) => setNewCollege(e.target.value)}
                    placeholder="请输入所属学院"
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                      darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                    }`}
                  />
                </div>
              )}

              {/* 简介 */}
              <div className="space-y-2">
                <label className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>简介 (可选)</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="请输入简介或备注信息..."
                  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all h-24 resize-none ${
                    darkMode ? 'bg-slate-900/40 border-slate-700 text-slate-200 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 ${
                    darkMode ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploading}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all transform hover:scale-105 active:scale-95 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 ${
                    (isSubmitting || uploading) ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? '提交中...' : '确认添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
