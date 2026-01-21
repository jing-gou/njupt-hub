import React, { useState } from 'react';
import { GitPullRequest, FileUp, CheckCircle2, ShieldAlert, Search, Loader2, ChevronDown, X, AlertCircle, Upload as UploadIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function BatchUpload() {
  const { darkMode } = useTheme();
  const [files, setFiles] = useState([]); // 文件队列
  const [courseName, setCourseName] = useState('');
  const [category, setCategory] = useState('历年真题');
  const [allCourses, setAllCourses] = useState([]); 
  const [suggestions, setSuggestions] = useState([]); 
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  
  const categories = ['历年真题', '复习笔记', '实验报告', '课后答案', '模拟试题', '教学课件'];

  // 处理课程名称输入
  const handleCourseInputChange = (value) => {
    setCourseName(value);
    if (value.trim().length > 0) {
      const filtered = allCourses
        .filter(c => c.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 处理文件选择（支持多选）
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    addFilesToQueue(selectedFiles);
  };

  // 处理拖拽
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFilesToQueue(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 添加文件到队列
  const addFilesToQueue = (newFiles) => {
    const MAX_SIZE_MB = 4.5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_SIZE_BYTES) {
        alert(`${file.name} 文件过大（${(file.size / (1024 * 1024)).toFixed(2)}MB），最大支持 ${MAX_SIZE_MB}MB`);
        return false;
      }
      return true;
    });

    const filesWithMeta = validFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ""), // 默认文件名（不含扩展名）
      status: 'pending', // pending, uploading, success, error
      progress: 0,
      error: null
    }));

    setFiles(prev => [...prev, ...filesWithMeta]);
  };

  // 移除单个文件
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // 更新文件名
  const updateFileName = (id, newName) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, name: newName } : f
    ));
  };

  // 批量上传
  const handleBatchUpload = async () => {
    if (files.length === 0 || !courseName) return;

    setUploading(true);

    for (const fileItem of files) {
      if (fileItem.status === 'success') continue; // 跳过已成功的

      // 更新状态为上传中
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        await uploadSingleFile(fileItem);
        
        // 上传成功
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
        ));
      } catch (error) {
        // 上传失败
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }

    setUploading(false);
  };

  // 上传单个文件
  const uploadSingleFile = (fileItem) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileItem.file);
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 50; // 读取占50%
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, progress } : f
          ));
        }
      };

      reader.onload = async () => {
        const base64Content = reader.result.split(',')[1];
        const extension = fileItem.file.name.split('.').pop();
        const finalFileName = `${fileItem.name.trim()}.${extension}`;

        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: finalFileName,
              content: base64Content,
              course: courseName,
              category: category 
            })
          });

          // 模拟进度（上传占50%）
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, progress: 75 } : f
          ));

          if (response.ok) {
            setFiles(prev => prev.map(f => 
              f.id === fileItem.id ? { ...f, progress: 100 } : f
            ));
            resolve();
          } else {
            const errData = await response.json();
            reject(new Error(errData.error || '上传失败'));
          }
        } catch (err) {
          reject(new Error('网络请求失败'));
        }
      };

      reader.onerror = () => {
        reject(new Error('文件读取失败'));
      };
    });
  };

  // 清空已完成的文件
  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  // 统计信息
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === 'pending').length,
    uploading: files.filter(f => f.status === 'uploading').length,
    success: files.filter(f => f.status === 'success').length,
    error: files.filter(f => f.status === 'error').length
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
          <GitPullRequest size={24} />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>上传资料</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>一次选择一个或多个文件，高效管理上传队列</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-xl p-8 space-y-6 ${
        darkMode 
          ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/50' 
          : 'bg-white border-slate-100 shadow-slate-200/50'
      }`}>
        
        {/* 1. 文件拖拽区 */}
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center ${
            files.length > 0
              ? darkMode 
                ? 'border-blue-400 bg-blue-500/10' 
                : 'border-blue-500 bg-blue-50/30'
              : darkMode
                ? 'border-slate-700 hover:border-slate-600'
                : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <input 
            type="file" 
            multiple
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".pdf,.zip,.rar,.7z,.ppt,.pptx,.jpg,.png,.doc,.docx"
          />
          <FileUp className={`mx-auto mb-3 ${
            files.length > 0
              ? darkMode ? 'text-blue-400' : 'text-blue-500' 
              : darkMode ? 'text-slate-600' : 'text-slate-300'
          }`} size={32} />
          
          {files.length > 0 ? (
            <div className="space-y-1">
              <p className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                已选择 {files.length} 个文件
              </p>
              <p className={`text-xs ${darkMode ? 'text-blue-500' : 'text-blue-400'}`}>
                点击或拖拽添加更多文件
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                点击或拖拽多个 PDF/PNG/ZIP/DOC 文件
              </p>
              <p className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                单个文件最大支持 4.5MB
              </p>
            </div>
          )}
        </div>

        {/* 2. 课程信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 课程名称 */}
          <div className="space-y-1.5 relative">
            <label className={`text-xs font-bold uppercase ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>课程名称</label>
            <div className="relative group">
              <input 
                required 
                type="text" 
                value={courseName}
                onChange={(e) => handleCourseInputChange(e.target.value)}
                onFocus={() => courseName && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="如：信号与系统" 
                className={`w-full h-11 px-4 border rounded-lg focus:ring-2 outline-none transition-all text-sm pr-10 ${
                  darkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/20' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500/20'
                }`} 
              />
              <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <Search size={16} />
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {suggestions.map((s, i) => (
                    <div 
                      key={i}
                      onClick={() => { setCourseName(s); setShowSuggestions(false); }}
                      className={`h-11 px-4 text-sm cursor-pointer flex items-center justify-between group transition-colors ${
                        darkMode 
                          ? 'text-slate-300 hover:bg-slate-700' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{s}</span>
                      <Search size={14} className={`shrink-0 transition-colors ${
                        darkMode 
                          ? 'text-slate-600 group-hover:text-slate-400' 
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 资料分类 */}
          <div className="space-y-1.5">
            <label className={`text-xs font-bold uppercase ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>资料分类</label>
            <div className="relative">
              <div 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                tabIndex={0}
                className={`w-full h-11 px-4 border rounded-lg outline-none cursor-pointer focus:ring-2 transition-all text-sm leading-normal flex items-center justify-between ${
                  darkMode 
                    ? 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600 focus:ring-blue-500/20' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 focus:ring-blue-500/20'
                }`}
              >
                <span>{category}</span>
                <ChevronDown size={16} className={`transition-transform ${
                  showCategoryDropdown ? 'rotate-180' : ''
                } ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              </div>
              
              {showCategoryDropdown && (
                <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {categories.map((cat, i) => (
                    <div 
                      key={i}
                      onClick={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                      className={`h-11 px-4 text-sm cursor-pointer flex items-center justify-between group transition-colors ${
                        darkMode 
                          ? 'text-slate-300 hover:bg-slate-700' 
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat}</span>
                      {category === cat && (
                        <CheckCircle2 size={14} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. 文件列表 */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                上传队列 ({stats.total})
              </h3>
              {stats.success > 0 && (
                <button
                  onClick={clearCompleted}
                  className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' 
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  清空已完成 ({stats.success})
                </button>
              )}
            </div>

            <div className={`max-h-96 overflow-y-auto space-y-2 rounded-lg p-3 ${
              darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
            }`}>
              {files.map(fileItem => (
                <div 
                  key={fileItem.id}
                  className={`p-3 rounded-lg border transition-all ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 状态图标 */}
                    <div className="shrink-0 mt-1">
                      {fileItem.status === 'pending' && (
                        <div className={`w-5 h-5 rounded-full border-2 ${
                          darkMode ? 'border-slate-600' : 'border-slate-300'
                        }`} />
                      )}
                      {fileItem.status === 'uploading' && (
                        <Loader2 className={`w-5 h-5 animate-spin ${
                          darkMode ? 'text-blue-400' : 'text-blue-500'
                        }`} />
                      )}
                      {fileItem.status === 'success' && (
                        <CheckCircle2 className={`w-5 h-5 ${
                          darkMode ? 'text-green-400' : 'text-green-500'
                        }`} />
                      )}
                      {fileItem.status === 'error' && (
                        <AlertCircle className={`w-5 h-5 ${
                          darkMode ? 'text-red-400' : 'text-red-500'
                        }`} />
                      )}
                    </div>

                    {/* 文件信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={fileItem.name}
                          onChange={(e) => updateFileName(fileItem.id, e.target.value)}
                          disabled={fileItem.status !== 'pending'}
                          className={`flex-1 px-2 py-1 text-sm rounded border outline-none ${
                            fileItem.status !== 'pending'
                              ? darkMode 
                                ? 'bg-slate-700/50 border-slate-700 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                              : darkMode
                                ? 'bg-slate-700 border-slate-600 text-slate-200'
                                : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <span className={`text-xs px-2 py-1 rounded ${
                          darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}>
                          .{fileItem.file.name.split('.').pop()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                          {(fileItem.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        {fileItem.status === 'error' && (
                          <span className={darkMode ? 'text-red-400' : 'text-red-500'}>
                            {fileItem.error}
                          </span>
                        )}
                      </div>

                      {/* 进度条 */}
                      {(fileItem.status === 'uploading' || fileItem.status === 'success') && (
                        <div className={`mt-2 h-1.5 rounded-full overflow-hidden ${
                          darkMode ? 'bg-slate-700' : 'bg-slate-200'
                        }`}>
                          <div 
                            className={`h-full transition-all duration-300 ${
                              fileItem.status === 'success'
                                ? darkMode ? 'bg-green-400' : 'bg-green-500'
                                : darkMode ? 'bg-blue-400' : 'bg-blue-500'
                            }`}
                            style={{ width: `${fileItem.progress}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    {fileItem.status === 'pending' && (
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className={`shrink-0 p-1 rounded transition-colors ${
                          darkMode 
                            ? 'hover:bg-slate-700 text-slate-500 hover:text-slate-300' 
                            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 统计信息 */}
            <div className={`flex gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>待上传: {stats.pending}</span>
              <span>上传中: {stats.uploading}</span>
              <span className={darkMode ? 'text-green-400' : 'text-green-600'}>成功: {stats.success}</span>
              {stats.error > 0 && (
                <span className={darkMode ? 'text-red-400' : 'text-red-500'}>失败: {stats.error}</span>
              )}
            </div>
          </div>
        )}
        
        {/* 4. 安全提示 */}
        <div className={`flex gap-3 p-4 rounded-xl border ${
          darkMode 
            ? 'bg-amber-900/20 border-amber-800/50' 
            : 'bg-amber-50 border-amber-100'
        }`}>
          <ShieldAlert className={`shrink-0 ${
            darkMode ? 'text-amber-500' : 'text-amber-600'
          }`} size={20} />
          <p className={`text-xs leading-relaxed ${
            darkMode ? 'text-amber-400' : 'text-amber-800'
          }`}>
            <b>安全须知：</b> 资料将被上传至 GitHub。请确信文件中不包含个人学号、姓名等隐私信息。
          </p>
        </div>

        {/* 5. 上传按钮 */}
        <button 
          onClick={handleBatchUpload}
          disabled={uploading || files.length === 0 || !courseName || stats.pending === 0}
          className={`w-full py-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            darkMode 
              ? 'bg-slate-700 text-white hover:bg-blue-600' 
              : 'bg-slate-900 text-white hover:bg-blue-600'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              正在批量上传 ({stats.uploading}/{stats.pending + stats.uploading})
            </>
          ) : (
            <>
              <UploadIcon size={20} />
              开始批量上传 ({stats.pending} 个文件)
            </>
          )}
        </button>
      </div>
    </div>
  );
}