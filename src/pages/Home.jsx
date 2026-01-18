import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Download, ChevronRight, Loader2, RefreshCw, Search, Filter, ChevronDown, FileImage, FileCode, FileSpreadsheet, FileVideo, FileAudio, Archive, File, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Home() {
  const { darkMode } = useTheme();
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortOrder, setSortOrder] = useState('default');
  
  // 搜索联动状态
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const categories = ['全部', '历年真题', '复习笔记', '实验报告', '课后答案'];

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      if (res.ok) {
        setResources(data);
        localStorage.setItem('course_list', JSON.stringify(Object.keys(data)));
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
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
  const FolderNode = ({ folderName, data, path, level = 0 }) => {
    const fullPath = path ? `${path}/${folderName}` : folderName;
    const isOpen = openFolders[fullPath];
    const indent = level * 4;
    const getFolderColor = () => {
      if (level === 0) return darkMode ? 'text-purple-400' : 'text-purple-500';
      if (level === 1) return darkMode ? 'text-blue-400' : 'text-blue-500';
      return darkMode ? 'text-cyan-400' : 'text-cyan-500';
    };
    const hasContent = data.files.length > 0 || Object.keys(data.folders).length > 0;
    
    return (
      <div>
        <button
          onClick={() => toggleFolder(fullPath)}
          className={`w-full flex items-center justify-between p-4 transition-all ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-white/50'}`}
          style={{ paddingLeft: `${3 + indent * 0.75}rem` }}
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
            {Object.entries(data.folders).map(([subFolderName, subData]) => (
              <FolderNode key={subFolderName} folderName={subFolderName} data={subData} path={fullPath} level={level + 1} />
            ))}
            {data.files.map((file) => (
              <div key={file.sha} className={`flex items-center justify-between p-4 transition-colors ${darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-white'}`} style={{ paddingLeft: `${4 + (level + 1) * 0.75}rem` }}>
                <div className="flex items-center gap-3 overflow-hidden">
                  {getFileIcon(file.fileName)}
                  <div className="truncate">
                    <p className={`text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{file.fileName}</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{file.size}</p>
                  </div>
                </div>
                <a href={file.path} target="_blank" rel="noopener noreferrer" className={`ml-4 p-2 rounded-lg transition-all ${darkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}>
                  <Download size={18} />
                </a>
              </div>
            ))}
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

  const filteredResources = (() => {
    let filtered = { ...resources };
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([course, files]) => [
          course,
          files.filter(f => course.toLowerCase().includes(query) || f.name.toLowerCase().includes(query))
        ]).filter(([_, files]) => files.length > 0)
      );
    }
    if (selectedCategory !== '全部') {
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([course, files]) => [
          course,
          files.filter(f => f.name.includes(selectedCategory))
        ]).filter(([_, files]) => files.length > 0)
      );
    }
    const entries = Object.entries(filtered);
    if (sortOrder === 'asc') entries.sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
    else if (sortOrder === 'desc') entries.sort(([a], [b]) => b.localeCompare(a, 'zh-CN'));
    return Object.fromEntries(entries);
  })();

  if (loading) return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <Loader2 className="animate-spin mb-4 text-blue-500" size={40} />
      <p>正在检索文件树...</p>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      
      {/* 遮罩层 */}
      <div className={`fixed inset-0 z-40 transition-all duration-500 ${isSearching ? 'backdrop-blur-md bg-black/30 visible opacity-100' : 'invisible opacity-0'}`} onClick={() => setIsSearching(false)} />

      <div className="relative overflow-hidden pb-12">
        <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-all duration-700 ${isSearching ? 'blur-2xl opacity-10' : ''}`}>
          <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${darkMode ? 'bg-blue-500/10' : 'bg-blue-400/20'}`}></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-8 text-center">
          <h1 className={`text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r transition-all duration-700 ${darkMode ? 'from-blue-400 to-pink-400' : 'from-blue-600 to-pink-600'} ${isSearching ? 'opacity-10 blur-md scale-90' : 'opacity-100'}`}>
            NJUPT Notes
          </h1>
        <p className={`text-lg md:text-xl mb-12 transition-all duration-500 ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
        } ${isSearching ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
            一站式资料整合网站
        </p>        
          {/* 搜索框上浮 */}
          <div className={`max-w-2xl mx-auto mb-8 transition-all duration-500 ${isSearching ? 'relative z-50 transform -translate-y-6 scale-105' : 'relative z-10'}`}>
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

          {/* 筛选按钮搜索时隐藏 */}
          <div className={`flex justify-center gap-3 mb-8 transition-all duration-500 ${isSearching ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative">
              <button onClick={() => setShowFilter(!showFilter)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium shadow-lg ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}`}>
                <Filter size={18} /> 筛选 <ChevronDown size={16} />
              </button>
              {showFilter && (
                <div className={`absolute top-full mt-2 left-0 w-64 p-4 rounded-xl shadow-2xl border z-50 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selectedCategory === cat ? 'bg-blue-500/20 text-blue-400' : ''}`}>{cat}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={fetchResources} className={`flex items-center gap-2 px-6 py-3 rounded-xl shadow-lg ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-white text-slate-700'}`}>
              <RefreshCw size={18} /> 刷新
            </button>
          </div>
        </div>
      </div>

      {/* 目录树同步上浮 */}
      <div className={`max-w-4xl mx-auto px-4 pb-16 transition-all duration-500 ${isSearching ? 'relative z-50 transform -translate-y-30' : 'relative z-10'}`}>
        {Object.keys(filteredResources).length === 0 ? (
          <div className="text-center py-20 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
            <p>没有找到匹配的资料</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredResources).map(([course, files]) => {
              const structure = parseFileStructure(files);
              return (
                <div key={course} className={`rounded-xl shadow-lg overflow-hidden border transition-all ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button onClick={() => toggleFolder(course)} className="w-full flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <Folder size={24} className={openFolders[course] ? 'text-blue-500' : 'text-slate-400'} />
                      <span className={`font-bold text-lg ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{course}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>{files.length}</span>
                    </div>
                    <ChevronRight className={`transition-transform ${openFolders[course] ? 'rotate-90' : ''}`} size={20} />
                  </button>
                  {openFolders[course] && (
                    <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      {Object.entries(structure).map(([folderName, data]) => (
                        <FolderNode key={folderName} folderName={folderName} data={data} path={course} level={0} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        
    </div>
    
  );

    {/* 页脚区域 */}
    <footer className={`mt-auto py-12 border-t transition-all duration-700 ${
    darkMode 
        ? 'bg-slate-900/50 border-slate-800 text-slate-500' 
        : 'bg-slate-50/50 border-slate-200 text-slate-400'
    } ${
    isSearching ? 'opacity-0 blur-lg pointer-events-none' : 'opacity-100'
    }`}>
    <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* 左侧：作者信息 */}
        <div className="text-center md:text-left">
            <p className="text-sm font-medium mb-1">
            Developed by <span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>Your Name / Team</span>
            </p>
            <p className="text-xs italic">
            © 2024 - 2026 NJUPT Notes. All rights reserved.
            </p>
        </div>

        {/* 右侧：免责声明简述 */}
        <div className="max-w-xs text-center md:text-right">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2">免责声明</h4>
            <p className="text-[10px] leading-relaxed">
            本站资料均来自互联网公开渠道或用户分享，仅供学习交流使用。
            如有侵权，请联系删除。请勿用于任何商业用途。
            </p>
        </div>
        
        </div>

        {/* 底部装饰线 */}
        <div className="mt-8 flex justify-center gap-4">
        <div className={`h-1 w-8 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}></div>
        </div>
    </div>
    </footer>


}