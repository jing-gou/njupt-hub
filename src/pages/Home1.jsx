import React, { useState, useEffect } from 'react';
import { Folder, FileText, Download, ChevronRight, Loader2, RefreshCw, Search, Filter, ChevronDown, FileImage, FileCode, FileSpreadsheet, FileVideo, FileAudio, Archive, File } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext'; // 导入主题钩子

export default function Home() {
  const { darkMode } = useTheme(); // 使用全局主题状态
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortOrder, setSortOrder] = useState('default');

  const categories = ['全部', '历年真题', '复习笔记', '实验报告', '课后答案'];

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources");
      const data = await res.json();
      if (res.ok) {
        setResources(data);
        localStorage.setItem('course_list', JSON.stringify(Object.keys(data)));
      } else {
        console.error(data.error);
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
    setOpenFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // 递归渲染文件夹组件
  const FolderNode = ({ folderName, data, path, level = 0 }) => {
    const fullPath = path ? `${path}/${folderName}` : folderName;
    const isOpen = openFolders[fullPath];
    
    // 计算左边距（每层缩进4个单位）
    const indent = level * 4;
    
    // 根据层级选择颜色
    const getFolderColor = () => {
      if (level === 0) return darkMode ? 'text-purple-400' : 'text-purple-500';
      if (level === 1) return darkMode ? 'text-blue-400' : 'text-blue-500';
      return darkMode ? 'text-cyan-400' : 'text-cyan-500';
    };
    
    const hasContent = data.files.length > 0 || Object.keys(data.folders).length > 0;
    
    return (
      <div>
        {/* 文件夹标题 */}
        <button
          onClick={() => toggleFolder(fullPath)}
          className={`w-full flex items-center justify-between p-4 transition-all ${
            darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-white/50'
          }`}
          style={{ paddingLeft: `${3 + indent * 0.75}rem` }}
        >
          <div className="flex items-center gap-3">
            <Folder 
              size={20 - level} 
              className={`${isOpen ? `${getFolderColor()} fill-current opacity-20` : darkMode ? 'text-slate-600' : 'text-slate-400'}`} 
            />
            <span className={`font-semibold ${level === 0 ? 'text-base' : 'text-sm'} ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              {folderName}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              darkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-600'
            }`}>
              {data.files.length + Object.keys(data.folders).length}
            </span>
          </div>
          {hasContent && (
            <ChevronRight 
              className={`transition-transform ${isOpen ? 'rotate-90' : ''} ${
                darkMode ? 'text-slate-600' : 'text-slate-400'
              }`} 
              size={18} 
            />
          )}
        </button>

        {/* 展开内容 */}
        {isOpen && hasContent && (
          <div className={`${level === 0 ? `border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}` : ''}`}>
            {/* 子文件夹 */}
            {Object.entries(data.folders).map(([subFolderName, subData]) => (
              <FolderNode
                key={subFolderName}
                folderName={subFolderName}
                data={subData}
                path={fullPath}
                level={level + 1}
              />
            ))}
            
            {/* 文件列表 */}
            {data.files.length > 0 && (
              <div className={`divide-y ${darkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                {data.files.map((file) => (
                  <div 
                    key={file.sha} 
                    className={`flex items-center justify-between p-4 transition-colors ${
                      darkMode ? 'hover:bg-slate-800/30' : 'hover:bg-white'
                    }`}
                    style={{ paddingLeft: `${4 + (level + 1) * 0.75}rem` }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {getFileIcon(file.fileName)}
                      <div className="truncate">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {file.fileName}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{file.size}</p>
                      </div>
                    </div>
                    <a 
                      href={file.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`ml-4 p-2 rounded-lg transition-all ${
                        darkMode 
                          ? 'text-blue-400 hover:bg-blue-500/10' 
                          : 'text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconProps = { size: 18, className: darkMode ? 'text-slate-600' : 'text-slate-400' };
    
    // 图片文件
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      return <FileImage {...iconProps} className={darkMode ? 'text-green-400' : 'text-green-500'} />;
    }
    // 文档文件
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText {...iconProps} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />;
    }
    // 代码文件
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json'].includes(ext)) {
      return <FileCode {...iconProps} className={darkMode ? 'text-purple-400' : 'text-purple-500'} />;
    }
    // 表格文件
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet {...iconProps} className={darkMode ? 'text-emerald-400' : 'text-emerald-500'} />;
    }
    // 演示文稿
    if (['ppt', 'pptx'].includes(ext)) {
      return <FileText {...iconProps} className={darkMode ? 'text-orange-400' : 'text-orange-500'} />;
    }
    // 压缩文件
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive {...iconProps} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />;
    }
    // 视频文件
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
      return <FileVideo {...iconProps} className={darkMode ? 'text-pink-400' : 'text-pink-500'} />;
    }
    // 音频文件
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
      return <FileAudio {...iconProps} className={darkMode ? 'text-cyan-400' : 'text-cyan-500'} />;
    }
    // 默认文件图标
    return <File {...iconProps} />;
  };

  // 解析文件路径为树形结构（支持无限层级）
  const parseFileStructure = (files) => {
    const structure = {};
    
    files.forEach(file => {
      const parts = file.name.split(' / ');
      
      if (parts.length === 1) {
        // 直接在课程根目录下的文件
        if (!structure['根目录']) {
          structure['根目录'] = { files: [], folders: {} };
        }
        structure['根目录'].files.push({ ...file, fileName: file.name });
      } else {
        // 递归构建树形结构
        let current = structure;
        
        // 遍历除了最后一个元素（文件名）之外的所有部分
        for (let i = 0; i < parts.length - 1; i++) {
          const folderName = parts[i];
          
          if (!current[folderName]) {
            current[folderName] = { files: [], folders: {} };
          }
          current = current[folderName].folders;
        }
        
        // 将文件添加到最后一级文件夹
        const lastFolder = parts[parts.length - 2];
        if (!structure[parts[0]]) {
          structure[parts[0]] = { files: [], folders: {} };
        }
        
        // 重新定位到正确的位置
        current = structure;
        for (let i = 0; i < parts.length - 1; i++) {
          if (i === 0) {
            if (!current[parts[i]]) {
              current[parts[i]] = { files: [], folders: {} };
            }
            current = current[parts[i]];
          } else {
            if (!current.folders[parts[i]]) {
              current.folders[parts[i]] = { files: [], folders: {} };
            }
            current = current.folders[parts[i]];
          }
        }
        
        current.files.push({ ...file, fileName: parts[parts.length - 1] });
      }
    });
    
    return structure;
  };

  // 搜索过滤
  const filterResources = () => {
    let filtered = { ...resources };

    // 按搜索关键词过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([course, files]) => [
          course,
          files.filter(f => 
            course.toLowerCase().includes(query) || 
            f.name.toLowerCase().includes(query)
          )
        ]).filter(([_, files]) => files.length > 0)
      );
    }

    // 按类别过滤
    if (selectedCategory !== '全部') {
      filtered = Object.fromEntries(
        Object.entries(filtered).map(([course, files]) => [
          course,
          files.filter(f => f.name.includes(selectedCategory))
        ]).filter(([_, files]) => files.length > 0)
      );
    }

    // 排序
    const entries = Object.entries(filtered);
    if (sortOrder === 'asc') {
      entries.sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
    } else if (sortOrder === 'desc') {
      entries.sort(([a], [b]) => b.localeCompare(a, 'zh-CN'));
    }

    return Object.fromEntries(entries);
  };

  const filteredResources = filterResources();

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
        <Loader2 className={`animate-spin mb-4 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} size={40} />
        <p className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>正在检索深层文件树...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'}`}>
      {/* Hero 区域 */}
      <div className="relative overflow-hidden pb-12">
        {/* 动态光晕背景 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-blue-500/10' : 'bg-blue-400/20'
          }`} style={{ animationDuration: '4s' }}></div>
          <div className={`absolute top-20 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${
            darkMode ? 'bg-purple-500/10' : 'bg-purple-400/20'
          }`} style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
        </div>

        {/* 标题区 */}
        <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-8 text-center">
          <h1 className={`text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r ${
            darkMode 
              ? 'from-blue-400 via-purple-400 to-pink-400' 
              : 'from-blue-600 via-purple-600 to-pink-600'
          } animate-in fade-in zoom-in duration-1000`}>
            NJUPT Notes
          </h1>
          <p className={`text-lg md:text-xl mb-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-200 ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            一站式资料整合网站
          </p>

          {/* 搜索框 */}
          <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
            <div className={`relative group ${darkMode ? 'bg-slate-800/50' : 'bg-white/80'} backdrop-blur-lg rounded-2xl shadow-xl border ${
              darkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`} size={22} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索课程或文件名..."
                className={`w-full pl-14 pr-4 py-5 bg-transparent outline-none text-lg ${
                  darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* 筛选按钮 */}
          <div className="flex justify-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom duration-1000 delay-400">
            <div className="relative">
              <button 
                onClick={() => setShowFilter(!showFilter)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  darkMode 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-white text-slate-700 hover:bg-slate-50'
                } shadow-lg`}
              >
                <Filter size={18} />
                筛选
                <ChevronDown size={16} className={`transition-transform ${showFilter ? 'rotate-180' : ''}`} />
              </button>

              {showFilter && (
                <div className={`absolute top-full mt-2 left-0 w-64 p-4 rounded-xl shadow-2xl border z-50 animate-in fade-in zoom-in-95 duration-200 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700' 
                    : 'bg-white border-slate-200'
                }`}>
                  <div className="space-y-4">
                    <div>
                      <p className={`text-xs font-bold uppercase mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>类别</p>
                      <div className="space-y-1">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedCategory === cat
                                ? darkMode 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'bg-blue-50 text-blue-600'
                                : darkMode
                                  ? 'text-slate-300 hover:bg-slate-700'
                                  : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className={`text-xs font-bold uppercase mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>排序</p>
                      <div className="space-y-1">
                        {[
                          { value: 'default', label: '默认' },
                          { value: 'asc', label: 'A-Z 升序' },
                          { value: 'desc', label: 'Z-A 降序' }
                        ].map(sort => (
                          <button
                            key={sort.value}
                            onClick={() => setSortOrder(sort.value)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              sortOrder === sort.value
                                ? darkMode 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : 'bg-purple-50 text-purple-600'
                                : darkMode
                                  ? 'text-slate-300 hover:bg-slate-700'
                                  : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sort.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={fetchResources}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-lg ${
                darkMode 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RefreshCw size={18} />
              刷新
            </button>
          </div>
        </div>

        {/* 引导下滑提示 */}
        {Object.keys(filteredResources).length > 0 && (
          <div className="text-center animate-bounce">
            <ChevronDown className={`mx-auto ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} size={24} />
          </div>
        )}
      </div>

      {/* 资料目录 */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        {Object.keys(filteredResources).length === 0 ? (
          <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${
            darkMode 
              ? 'bg-slate-800/30 border-slate-700 text-slate-500' 
              : 'bg-white/50 border-slate-200 text-slate-400'
          }`}>
            <p>{searchQuery || selectedCategory !== '全部' ? '没有找到匹配的资料' : '仓库空空如也，快去上传第一份资料吧！'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredResources).map(([course, files]) => {
              const structure = parseFileStructure(files);
              
              return (
                <div key={course} className={`rounded-xl shadow-lg overflow-hidden border transition-all ${
                  darkMode 
                    ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800/70' 
                    : 'bg-white/80 border-slate-200 hover:shadow-xl'
                }`}>
                  {/* 一级目录 - 课程名 */}
                  <button 
                    onClick={() => toggleFolder(course)}
                    className={`w-full flex items-center justify-between p-5 transition-all ${
                      darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Folder size={24} className={`${
                        openFolders[course] 
                          ? darkMode ? 'text-blue-400 fill-blue-400/20' : 'text-blue-500 fill-blue-50' 
                          : darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`} />
                      <span className={`font-bold text-lg ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{course}</span>
                      <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                        darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                      }`}>{files.length}</span>
                    </div>
                    <ChevronRight className={`transition-transform ${
                      openFolders[course] ? 'rotate-90' : ''
                    } ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} size={20} />
                  </button>
                  
                  {/* 二级和多级目录 - 使用递归组件 */}
                  {openFolders[course] && (
                    <div className={`border-t ${darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-100 bg-slate-50/50'}`}>
                      {Object.entries(structure).map(([folderName, data]) => (
                        <FolderNode
                          key={folderName}
                          folderName={folderName}
                          data={data}
                          path={course}
                          level={0}
                        />
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
}