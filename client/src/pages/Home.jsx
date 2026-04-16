import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Folder, Eye, FileText, Download, ChevronRight, Loader2, Trophy, Search, Github, Filter, ChevronDown, FileImage, FileCode, FileSpreadsheet, FileVideo, FileAudio, Archive, File, X, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SiGithub } from '@icons-pack/react-simple-icons';

const base64EncodeUnicode = (str) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
};

export default function Home({ onNavigate }) {
  const { darkMode } = useTheme();
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortOrder, setSortOrder] = useState('default');
  const isImage = (fileName) => /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPDF = (fileName) => /\.pdf$/i.test(fileName);
  const [activePreview, setActivePreview] = useState(null);
  const isPreviewAllowed = false;

  const FILE_TREE_CACHE_KEY = 'njupt_hub:file_tree_cache:v1';
  const FILE_TREE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟

  
  // 搜索联动状态
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const categories = ['全部', '历年真题', '复习笔记', '实验报告', '课后答案'];

  const extractFileNameFromUrl = (url) => {
    try {
      const u = new URL(url);
      const name = u.pathname.split('/').pop();
      return name || url;
    } catch {
      const name = String(url).split('/').pop();
      return name || String(url);
    }
  };

  const normalizeRelativePath = (value) => String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const decodeMojibake = (value) => {
    const raw = String(value || '');
    try {
      // 常见：UTF-8 字节被当 latin1 展示，尝试还原
      return decodeURIComponent(escape(raw));
    } catch {
      return raw;
    }
  };

  const hashFolderKey = (value) => {
    // FNV-1a 32-bit, base36 输出，足够短且稳定
    const str = String(value ?? '');
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const pageSize = 100;
      const allItems = [];
      let page = 1;
      let total = Infinity;
      let hasMore = true;

      while (hasMore && allItems.length < total) {
        const res = await fetch(`/api/resources?status=APPROVED&page=${page}&pageSize=${pageSize}`);
        if (!res.ok) {
          console.error("Fetch failed with status:", res.status, "page:", page);
          return;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Expected JSON but got:", contentType, "page:", page);
          return;
        }

        const data = await res.json();
        const pageItems = Array.isArray(data?.items) ? data.items : [];
        const totalFromApi = Number(data?.total);
        if (Number.isFinite(totalFromApi) && totalFromApi >= 0) {
          total = totalFromApi;
        }

        allItems.push(...pageItems);
        hasMore = pageItems.length === pageSize;
        page += 1;

        // 防止异常分页导致死循环
        if (page > 1000) {
          console.warn("Resource pagination exceeded safety limit.");
          break;
        }
      }

      const items = allItems;
      
      // 构建嵌套目录树结构
      const root = { files: [], folders: {} };
      
      for (const r of items) {
        const coursePath = normalizeRelativePath(decodeMojibake(r.course || '未分类'));
        const courseParts = coursePath.split('/').filter(Boolean);
        const firstCoursePart = courseParts[0] || '未分类';
        // 优先使用数据库里的 fileName 作为“相对路径”（含子目录），这样目录划分和后端存储一致
        const relativePath = normalizeRelativePath(decodeMojibake(r.fileName || extractFileNameFromUrl(r.fileUrl)));
        const relativeParts = relativePath.split('/').filter(Boolean);
        const normalizedRelativeParts =
          relativeParts.length > 1 && relativeParts[0] === firstCoursePart
            ? relativeParts.slice(1)
            : relativeParts;
        const subFolders = normalizedRelativeParts.slice(0, -1);
        const leafFileName = normalizedRelativeParts.at(-1) || extractFileNameFromUrl(r.fileUrl);
        const pathParts = [...courseParts, ...subFolders];
        
        let current = root;
        for (const part of pathParts) {
          if (!current.folders[part]) {
            current.folders[part] = { files: [], folders: {} };
          }
          current = current.folders[part];
        }
        
        current.files.push({
          id: r.id,
          sha: String(r.id),
          name: r.title,
          fileName: leafFileName,
          path: r.fileUrl,
          size: r.fileSize ? `${(r.fileSize / 1024 / 1024).toFixed(2)} MB` : '未知',
          updatedAt: new Date(r.updatedAt).toLocaleDateString(),
          downloadCount: r.downloadCount ?? 0,
        });
      }

      setResources(root.folders);
      localStorage.setItem('course_list', JSON.stringify(Object.keys(root.folders)));

      try {
        localStorage.setItem(
          FILE_TREE_CACHE_KEY,
          JSON.stringify({
            cachedAt: Date.now(),
            folders: root.folders,
          }),
        );
      } catch (e) {
        // localStorage 可能满了；忽略缓存写入
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCache = () => {
    try {
      localStorage.removeItem(FILE_TREE_CACHE_KEY);
    } catch (e) {
      // ignore
    }
    fetchResources();
  };

  useEffect(() => {
    const onRefresh = () => handleRefreshCache();
    window.addEventListener('njupt-hub:refresh-home-cache', onRefresh);
    return () => window.removeEventListener('njupt-hub:refresh-home-cache', onRefresh);
  }, []);

  const handlePreview = async (file) => {
    try {
      if (!file?.id) return;
      
      // 对于私有空间，预览也必须先获取带签名的 URL
      const res = await fetch(`/api/resources/${file.id}/download-url`);
      const data = await res.json();
      
      if (data.downloadUrl) {
        setActivePreview({ ...file, path: data.downloadUrl });
      } else {
        setActivePreview(file);
      }
    } catch (err) {
      console.error("Preview preparation failed:", err);
      setActivePreview(file);
    }
  };

  const handleDownload = async (file) => {
    try {
      if (!file?.id) return;
      
      // 获取下载链接 (支持 OSS 签名)
      const res = await fetch(`/api/resources/${file.id}/download-url`);
      const data = await res.json();
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        // 降级方案
        window.open(file.path, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.error("Download failed:", err);
      // 降级方案
      window.open(file.path, '_blank', 'noopener,noreferrer');
    }
  };

  const getOfficePreviewUrl = (fileUrl) => {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
};

  useEffect(() => {
    let usedCache = false;
    try {
      const raw = localStorage.getItem(FILE_TREE_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cachedAt = Number(parsed?.cachedAt);
        const folders = parsed?.folders;
        const isFresh = Number.isFinite(cachedAt) && (Date.now() - cachedAt) < FILE_TREE_CACHE_TTL_MS;
        if (folders && typeof folders === 'object') {
          setResources(folders);
          usedCache = true;
          setLoading(false);
          if (!isFresh) {
            // 缓存过期：后台刷新一次
            fetchResources();
          }
        }
      }
    } catch {
      // ignore broken cache
    }

    if (!usedCache) fetchResources();
  }, []);

  const toggleFolder = (path) => {
    setOpenFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // --- 原始图标逻辑 ---
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconProps = { size: 18, className: darkMode ? 'text-slate-600' : 'text-slate-400' };
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return <FileImage {...iconProps} className={darkMode ? 'text-green-400' : 'text-green-500'} />;
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) return <FileText {...iconProps} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />;
    if (['pdf'].includes(ext)) return <FileText {...iconProps} className={darkMode ? 'text-red-400' : 'text-red-500'} />;
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json'].includes(ext)) return <FileCode {...iconProps} className={darkMode ? 'text-purple-400' : 'text-purple-500'} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet {...iconProps} className={darkMode ? 'text-emerald-400' : 'text-emerald-500'} />;
    if (['ppt', 'pptx'].includes(ext)) return <FileText {...iconProps} className={darkMode ? 'text-orange-400' : 'text-orange-500'} />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive {...iconProps} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />;
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) return <FileVideo {...iconProps} className={darkMode ? 'text-pink-400' : 'text-pink-500'} />;
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return <FileAudio {...iconProps} className={darkMode ? 'text-cyan-400' : 'text-cyan-500'} />;
    return <File {...iconProps} />;
  };

  // --- 递归文件夹组件 ---
  const FolderNode = ({ folderName, data, path, level = 0, isLastOfParent = false }) => {
    const fullPath = path ? `${path}/${folderName}` : folderName;
    const folderKey = hashFolderKey(fullPath);
    const isOpen = openFolders[folderKey];
    const indent = level; // 进一步减小移动端缩进
    const getFolderColor = () => {
      if (level === 0) return darkMode ? 'text-purple-400' : 'text-purple-500';
      if (level === 1) return darkMode ? 'text-blue-400' : 'text-blue-500';
      return darkMode ? 'text-cyan-400' : 'text-cyan-500';
    };
    const hasContent = data.files.length > 0 || Object.keys(data.folders).length > 0;
    
    const getBgColor = () => {
      if (darkMode) return 'bg-transparent hover:bg-slate-800/30';
      if (level === 0) return 'bg-transparent hover:bg-slate-50';
      return 'bg-slate-200/40 hover:bg-slate-200/60';
    };
    
    return (
      <div className={`transition-all duration-300 ${
        level === 0 
          ? `mb-4 rounded-xl border backdrop-blur-md ${
              darkMode
                ? 'border-slate-800 bg-slate-900/40 shadow-lg shadow-black/20'
                : 'border-slate-200 bg-white/70 shadow-md hover:shadow-lg'
            }` 
          : (darkMode ? 'bg-slate-800/10' : 'bg-slate-50/50')
      } ${isLastOfParent ? 'md:rounded-b-xl' : ''}`}>
        <button
          onClick={() => toggleFolder(folderKey)}
          className={`w-full flex items-center justify-between p-4 transition-all transform active:scale-[0.99] ${level === 0 ? 'md:rounded-t-xl' : ''} ${getBgColor()}`}
          style={{ paddingLeft: `${window.innerWidth < 768 ? 0.75 + indent * 0.4 : 3 + indent * 0.75}rem` }}
        >
          <div className="flex items-center gap-3">
            <Folder size={20 - level} className={`${isOpen ? `${getFolderColor()} fill-current opacity-20` : darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <span className={`font-semibold ${level === 0 ? 'text-base' : 'text-sm'} ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{folderName}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-600'}`}>
              {data.files.length + Object.keys(data.folders).length}
            </span>
          </div>
          {hasContent && <ChevronRight className={`transition-transform ${isOpen ? 'rotate-90' : ''} ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} size={18} />}
        </button>
        {isOpen && hasContent && (
          <div className={`${level === 0 ? `border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}` : ''}`}>
            {Object.entries(data.folders).map(([subFolderName, subData], index) => {
              const isLast = index === Object.keys(data.folders).length - 1 && data.files.length === 0;
              return (
                <FolderNode 
                  key={subFolderName} 
                  folderName={subFolderName} 
                  data={subData} 
                  path={fullPath} 
                  level={level + 1} 
                  isLastOfParent={isLast && level === 0}
                />
              );
            })}
            <div className={level === 0 ? '' : 'divide-y divide-slate-100 dark:divide-slate-700'}>
              {data.files.map((file, index) => {
                const isPreviewable = /\.(pdf|doc|docx|jpg|jpeg|png|gif|webp|ppt|pptx|xlsx)$/i.test(file.fileName);
                const isLast = index === data.files.length - 1;

                return (
                  <div 
                    key={file.sha} 
                    className={`grid grid-cols-12 items-center p-4 transition-colors ${getBgColor()} ${isLast && level === 0 ? 'md:rounded-b-xl' : ''}`} 
                    style={{ paddingLeft: `${window.innerWidth < 768 ? 0.75 + indent * 0.4 : 3 + indent * 0.75}rem` }}
                  >
                    {/* 名称列 */}
                    <div className="flex items-center gap-3 overflow-hidden col-span-10 md:col-span-5 group/name">
                      {getFileIcon(file.fileName)}
                      <div className="flex-1 min-w-0 overflow-hidden relative" title={file.fileName}>
                        <div className="scroll-wrapper custom-scrollbar-hidden">
                          <p className={`text-sm font-medium scroll-content pr-12 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {file.fileName}
                          </p>
                        </div>
                        <div className="md:hidden flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>{file.size}</span>
                          <span>•</span>
                          <span>{file.downloadCount} 次下载</span>
                        </div>
                        {/* 渐变遮罩：给长文件名边缘一点淡出效果 */}
                        <div className={`absolute top-0 right-0 h-6 w-12 pointer-events-none bg-gradient-to-l ${darkMode ? 'from-slate-900' : 'from-white'} to-transparent z-10`} />
                      </div>
                    </div>
                    
                    {/* 修改时间 - 仅桌面端 */}
                    <div className="hidden md:block col-span-3 text-center text-xs text-slate-500">
                      {file.updatedAt}
                    </div>

                    {/* 大小 - 仅桌面端 */}
                    <div className="hidden md:block col-span-2 text-center text-xs text-slate-500">
                      {file.size}
                    </div>

                    {/* 操作列 */}
                    <div className="col-span-2 flex items-center gap-1 md:gap-2 justify-end">
                      {isPreviewAllowed && isPreviewable && (
                        <button 
                          onClick={() => handlePreview(file)}
                          className={`p-1.5 md:p-2 rounded-lg transition-all transform hover:scale-110 active:scale-90 ${darkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                          title="预览"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleDownload(file)} 
                        className={`p-1.5 md:p-2 rounded-lg transition-all transform hover:scale-110 active:scale-90 ${darkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
                        title="下载"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const parseFileStructure = (files) => {
    const structure = {};
    files.forEach(file => {
      const parts = file.name.split(' / ');
      let current = structure;
      if (parts.length === 1) {
        if (!structure['根目录']) structure['根目录'] = { files: [], folders: {} };
        structure['根目录'].files.push({ ...file, fileName: file.name });
      } else {
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          if (i === 0) {
            if (!current[folderName]) current[folderName] = { files: [], folders: {} };
            current = current[folderName];
          } else {
            if (!current.folders[folderName]) current.folders[folderName] = { files: [], folders: {} };
            current = current.folders[folderName];
          }
        }
        current.files.push({ ...file, fileName: parts[parts.length - 1] });
      }
    });
    return structure;
  };

  const filteredResources = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    // 递归过滤函数
    const filterTree = (folders) => {
      const result = {};
      
      for (const [name, data] of Object.entries(folders)) {
        // 1. 过滤当前层级的文件夹名或文件名
        const matchedFiles = data.files.filter(f => {
          const nameMatch = !query || f.name.toLowerCase().includes(query) || name.toLowerCase().includes(query);
          const categoryMatch = selectedCategory === '全部' || f.name.includes(selectedCategory);
          return nameMatch && categoryMatch;
        });
        
        // 2. 递归过滤子文件夹
        const matchedSubFolders = filterTree(data.folders);
        
        // 3. 如果当前层级有匹配的文件或子文件夹，则保留该目录
        if (matchedFiles.length > 0 || Object.keys(matchedSubFolders).length > 0) {
          result[name] = {
            files: matchedFiles,
            folders: matchedSubFolders
          };
        }
      }
      return result;
    };

    let filtered = filterTree(resources);
    
    // 排序逻辑
    const entries = Object.entries(filtered);
    if (sortOrder === 'asc') entries.sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
    else if (sortOrder === 'desc') entries.sort(([a], [b]) => b.localeCompare(a, 'zh-CN'));
    
    return Object.fromEntries(entries);
  }, [resources, searchQuery, selectedCategory, sortOrder]);

  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <Loader2 className="animate-spin mb-4 text-blue-500" size={40} />
      <p>正在检索文件树...</p>
    </div>
  );
  
  return (
    <>
      {/* 遮罩层 - 独立于主容器以确保 fixed 覆盖全屏 */}
      <div
        className={`fixed inset-0 z-[60] transition-all duration-500 ${isSearching ? 'backdrop-blur-md bg-black/30 visible opacity-100' : 'invisible opacity-0 pointer-events-none'}`}
        onClick={() => setIsSearching(false)}
      />

        <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
        {/* 主内容区 */}
        <div className={`relative ${isSearching ? 'z-[70]' : 'z-10'}`} onClick={() => isSearching && setIsSearching(false)}>
          <div className="relative pb-2">
            <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${isSearching ? 'blur-2xl opacity-10' : ''}`}>
              <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[100px] ${darkMode ? 'bg-blue-500/10' : 'bg-blue-400/20'}`}></div>
            </div>

            <div className={`relative max-w-4xl mx-auto px-4 pt-12 pb-4 text-center ${showFilter ? 'z-[100]' : ''}`}>
              <h1 className={`text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r transition-all duration-900 hover:scale-105 active:scale-95 ${darkMode ? 'from-blue-400 to-pink-400' : 'from-blue-600 to-pink-600'} ${isSearching ? 'opacity-10 blur-md scale-90' : 'opacity-100'}`}>
                NJUPT Hub
              </h1>
              <p className={`text-lg md:text-xl mb-8 transition-all duration-500 ${darkMode ? 'text-slate-400' : 'text-slate-600'} ${isSearching ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                一站式资料整合网站
              </p>
              {/* 搜索框上浮 */}
              <div onClick={(e) => e.stopPropagation()} className={`max-w-2xl mx-auto mb-6 transition-all duration-500 ${isSearching ? 'relative z-[80] transform -translate-y-6 md:scale-105 scale-[1.02]' : 'relative z-10'}`}>
                <div className={`relative group ${darkMode ? 'bg-slate-800/90' : 'bg-white/90'} backdrop-blur-lg rounded-2xl shadow-xl border ${isSearching ? 'border-blue-500' : 'border-slate-200'}`}>
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                  <input
                    type="text" value={searchQuery} onFocus={() => setIsSearching(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索课程或文件名..."
                    className={`w-full pl-14 pr-4 py-5 bg-transparent outline-none text-lg ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                  />
                </div>
              </div>

              <div className={`flex flex-wrap justify-center gap-3 mb-4 transition-all duration-500 relative z-20 ${isSearching ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="relative z-[90]">
                  <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-medium border transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'}`}>
                    <Filter size={18} /> 筛选
                  </button>
                  {showFilter && (
                    <div className={`absolute top-full mt-2 left-0 w-64 p-4 rounded-xl shadow-2xl border z-[90] ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedCategory === cat ? 'bg-blue-500/20 text-blue-400' : ''}`}>{cat}</button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRefreshCache}
                  className={`hidden md:flex items-center gap-2 px-6 py-3 rounded-xl border transform transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md ${
                    darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                  title="清空缓存并重新拉取"
                >
                  <RefreshCw size={18} />
                  <span>刷新</span>
                </button>
                
                <button
                  onClick={() => onNavigate?.('leaderboard')}
                  className={`flex items-center gap-2 px-3 md:px-6 py-3 rounded-xl border transform transition-all duration-300 hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  <Trophy size={18} /> 排行榜
                </button>
                
                <a
                  href="https://github.com/jing-gou/njupt-notes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 md:px-6 py-3 rounded-xl font-medium border transition-all duration-300 transform hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm hover:shadow-md ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'}`}
                >
                  <Github size={18} />
                  <span>GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 目录树同步上浮 */}
        <div className={`max-w-4xl mx-auto px-4 pb-24 transition-all duration-500 ${isSearching ? 'relative z-[70] transform -translate-y-12 md:-translate-y-24' : showFilter ? 'relative z-0' : 'relative z-10'}`}>
          {Object.keys(filteredResources).length === 0 ? (
            <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 relative z-0">
              <p>没有找到匹配的资料</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 表头 - 仅在桌面端显示 */}
              <div className={`hidden md:grid grid-cols-12 px-4 py-2 mt-4 text-xs font-semibold bg-transparent transition-colors duration-500 ${
                isSearching 
                  ? 'text-white' 
                  : darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <div className="col-span-5">名称</div>
                <div className="col-span-3 text-center">修改时间</div>
                <div className="col-span-2 text-center">大小</div>
                <div className="col-span-2 text-right">操作</div>
              </div>

              <div className="grid grid-cols-1">
                {Object.entries(filteredResources).map(([courseName, folderData]) => (
                  <FolderNode
                    key={courseName}
                    folderName={courseName}
                    data={folderData}
                    path=""
                    level={0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 预览弹窗 */}
      {activePreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className={`relative w-full max-w-5xl h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
            {/* 弹窗头部 */}
            <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                {getFileIcon(activePreview.fileName)}
                <span className={`text-sm font-bold truncate max-w-xs md:max-w-xl ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  预览: {activePreview.fileName}
                </span>
              </div>
              <button onClick={() => setActivePreview(null)} className="p-2 hover:bg-red-500/10 rounded-full group transition-colors">
                <X size={20} className="text-slate-500 group-hover:text-red-500" />
              </button>
            </div>

            {/* 弹窗内容区 */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden animate-modal">
              {/\.(doc|docx|ppt|pptx|xlsx|pdf|jpg|jpeg|png|gif|webp)$/i.test(activePreview.fileName) ? (
                (() => {
                  const safeUrl = encodeURI(activePreview.path);
                  const base64Path = base64EncodeUnicode(safeUrl);
                  const previewUrl = `http://68.64.183.101:8012/onlinePreview?url=${encodeURIComponent(base64Path)}`;
                  return (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-none"
                      title="Document Preview"
                    />
                  );
                })()
              ) : (
                <div className="text-center text-slate-500">
                  <p>暂不支持此文件类型的弹窗预览</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
