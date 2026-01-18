import React, { useState, useEffect } from 'react';
import { GitPullRequest, FileUp, CheckCircle2, ShieldAlert, Search, Loader2, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Upload() {
  const { darkMode } = useTheme();
  const [status, setStatus] = useState('idle'); 
  const [file, setFile] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [category, setCategory] = useState('历年真题');
  const [allCourses, setAllCourses] = useState([]); 
  const [suggestions, setSuggestions] = useState([]); 
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [newName, setNewName] = useState("");
  
  const categories = ['历年真题', '复习笔记', '实验报告', '课后答案'];
  // 当页面加载时，从本地存储中提取课程列表
  useEffect(() => {
    const cachedCourses = localStorage.getItem('course_list');
    if (cachedCourses) {
      try {
        // 解析并存入 allCourses 状态
        const parsed = JSON.parse(cachedCourses);
        // 如果数据是对象（来自 Home 页面的 Object.keys），它应该直接是数组
        setAllCourses(parsed);
      } catch (e) {
        console.error("解析课程缓存失败", e);
      }
    }
  }, []); // 空数组表示仅在挂载时运行一次
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

  // 当文件被选中时，默认把原文件名（不含后缀）填入输入框
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const fileNameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, "");
      setNewName(fileNameWithoutExtension);
    }
  };

  // 提交处理
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !courseName) return;

    const MAX_SIZE_MB = 4.5; 
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
      alert(`文件太大了！目前免费版最大支持 ${MAX_SIZE_MB}MB，当前文件 ${(file.size / (1024 * 1024)).toFixed(2)}MB。\n\n如有大文件需求可发送至：sugar.pub@outlook.com`);
      return;
    }

    setStatus('processing');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Content = reader.result.split(',')[1];
      const extension = file.name.split('.').pop();
      const finalFileName = `${newName.trim()}.${extension}`;
      
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

        if (response.ok) {
          setStatus('success');
          setFile(null);
        } else {
          const errData = await response.json();
          setStatus('error');
          alert(`上传失败: ${errData.error}`);
        }
      } catch (err) {
        setStatus('error');
        alert("网络请求失败，请稍后重试");
      }
    };
  };

  // 成功后的界面展示
  if (status === 'success') {
    return (
      <div className={`max-w-md mx-auto py-16 text-center animate-in fade-in zoom-in duration-500 ${
        darkMode ? 'text-slate-200' : ''
      }`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ${
          darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600'
        }`}>
          <CheckCircle2 size={40} />
        </div>
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
          Pull Request 已发起！
        </h2>
        <p className={`mt-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          您的贡献已提交至 GitHub 审核队列。<br />管理员合并后，资料将自动同步。
        </p>
        <button 
          onClick={() => setStatus('idle')} 
          className={`mt-8 px-6 py-2 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-slate-700 text-white hover:bg-slate-600' 
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          继续贡献资料
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
          <GitPullRequest size={24} />
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>贡献学术资料</h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>基于 GitHub 的半自动审核系统</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-xl p-8 space-y-6 ${
        darkMode 
          ? 'bg-slate-800/50 border-slate-700 shadow-slate-900/50' 
          : 'bg-white border-slate-100 shadow-slate-200/50'
      }`}>
        
        {/* 1. 文件拖拽区 */}
        <div className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center ${
          file 
            ? darkMode 
              ? 'border-blue-400 bg-blue-500/10' 
              : 'border-blue-500 bg-blue-50/30'
            : darkMode
              ? 'border-slate-700 hover:border-slate-600'
              : 'border-slate-200 hover:border-slate-400'
        }`}>
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".pdf,.zip,.rar,.7z,.ppt,.pptx,.jpg,.png,.doc,.docx"
          />
          <FileUp className={`mx-auto mb-3 ${
            file 
              ? darkMode ? 'text-blue-400' : 'text-blue-500' 
              : darkMode ? 'text-slate-600' : 'text-slate-300'
          }`} size={32} />
          {file ? (
            <div className="space-y-1">
              <p className={`font-medium truncate max-w-xs mx-auto ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>{file.name}</p>
              <p className={`text-xs ${darkMode ? 'text-blue-500' : 'text-blue-400'}`}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                点击或拖拽 PDF/PNG/ZIP/DOC 文件
              </p>
              <p className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                最大支持 4.5MB
              </p>
            </div>
          )}
        </div>

        {/* 2. 表单字段区 */}
        <div className="space-y-1.5 relative">
          <label className={`text-xs font-bold uppercase ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            重命名文件 (可选)
          </label>
          
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入新文件名" 
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all pr-16 ${
                darkMode 
                  ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/20' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500/20'
              }`} 
            />
            
            {file && (
              <div className={`absolute right-3 px-2 py-1 text-xs font-medium rounded md:block hidden ${
                darkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-200/50 text-slate-500'
              }`}>
                .{file.name.split('.').pop()}
              </div>
            )}
          </div>
          
          <p className={`text-[10px] mt-1 pl-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            系统将自动保留原文件扩展名
          </p>
        </div>     

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. 课程名称 */}
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

          {/* 2. 资料分类 */}
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
        
        {/* 3. 安全提示 */}
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

        <button 
          onClick={handleUpload}
          disabled={status === 'processing' || !file || !courseName}
          className={`w-full py-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
            darkMode 
              ? 'bg-slate-700 text-white hover:bg-blue-600' 
              : 'bg-slate-900 text-white hover:bg-blue-600'
          }`}
        >
          {status === 'processing' ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              正在同步至 GitHub...
            </>
          ) : (
            '提交至 GitHub 审核'
          )}
        </button>
      </div>
    </div>
  );
}