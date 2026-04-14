import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import ReviewCard from '../components/ReviewCard';
import ReviewDetailPage from './ReviewDetailPage';
import { Users, Utensils, ShoppingBag, Loader2, Plus, X, Image as ImageIcon, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  // 过滤后的列表
  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

    setUploading(true);
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
      if (data.url) setNewImageUrl(data.url);
    } catch (err) {
      console.error('Upload failed:', err);
      alert(err.message || '图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return alert('请输入名称');

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
        fetchItems();
      } else {
        const data = await res.json();
        alert(data.message || '添加失败');
      }
    } catch (err) {
      console.error('Add item failed:', err);
      alert('添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchItems();
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
        className={`fixed inset-0 z-[60] transition-all duration-500 ${isSearching ? 'backdrop-blur-md bg-black/30 visible opacity-100' : 'invisible opacity-0'}`} 
        onClick={() => setIsSearching(false)} 
      />

      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
        {/* Navigation & Search Container */}
      <div className="relative w-full min-h-[4.5rem] flex items-center">
        
        {/* Tabs Container - 固定在左侧，搜索时被遮罩盖住并模糊 */}
        <div className={`absolute left-0 z-10 transition-all duration-700 ease-in-out ${isSearching ? 'blur-sm opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
            </div>
          </div>
        </div>

        {/* 动态间隔容器 - 始终填充左侧，确保搜索框默认居右 */}
        <div className="flex-1 min-w-0" />

        {/* Search Box Wrapper - 处理位置和宽度 */}
        <div className={`transition-all duration-700 ease-in-out relative ${
          isSearching 
            ? 'w-full max-w-4xl mx-4 z-[70] transform -translate-y-2' 
            : 'w-full max-w-xs z-10'
        }`}>
          <div className={`relative group ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-lg rounded-2xl shadow-xl border ${isSearching ? 'border-blue-500 ring-4 ring-blue-500/10 scale-105' : 'border-slate-200'} transition-all duration-500`}>
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
              darkMode ? 'bg-slate-800/95 border-slate-700 shadow-blue-900/20' : 'bg-white/95 border-slate-100 shadow-blue-500/10'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
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
              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <p className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    没有找到与 "{searchQuery}" 相关的项目
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 动态间隔容器 - 搜索时从 0 增长到 flex-1，实现从右向中滑动的动画 */}
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isSearching ? 'flex-1' : 'w-0'}`} />
      </div>

      {/* Grid Content (原有的静态列表，搜索时会变模糊) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>正在加载...</p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${isSearching ? 'opacity-10 blur-md pointer-events-none' : 'opacity-100'}`}>
          {items.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              darkMode={darkMode}
              onClick={() => setSelectedItemId(item.id)}
            />
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-20">
              <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>暂无该分类的项目</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (!isAuthed) {
            alert('请先登录后再添加评价项');
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
