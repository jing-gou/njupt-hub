import React, { useState, useEffect } from 'react';
import { GitPullRequest, FileUp, CheckCircle2, ShieldAlert, Search, Loader2, ChevronDown } from 'lucide-react';

export default function Upload() {
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

  // 1. 初始化读取缓存
  useEffect(() => {
    const cached = localStorage.getItem('course_list');
    if (cached) {
      try {
        setAllCourses(JSON.parse(cached));
      } catch (e) {
        console.error("解析缓存失败", e);
      }
    }
  }, []);

  // 2. 处理课程名称输入（搜索建议逻辑放在这里）
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

  // 3. 提交处理
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
      <div className="max-w-md mx-auto py-16 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Pull Request 已发起！</h2>
        <p className="text-slate-500 mt-3">您的贡献已提交至 GitHub 审核队列。<br />管理员合并后，资料将自动同步。</p>
        <button onClick={() => setStatus('idle')} className="mt-8 px-6 py-2 bg-slate-900 text-white rounded-lg font-medium">
          继续贡献资料
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-900 text-white rounded-lg">
          <GitPullRequest size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">贡献学术资料</h2>
          <p className="text-sm text-slate-500">基于 GitHub 的半自动审核系统</p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-6">
        
        {/* 1. 文件拖拽区 */}
        <div className={`relative border-2 border-dashed rounded-xl p-10 transition-all text-center ${file ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 hover:border-slate-400'}`}>
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
            accept=".pdf,.zip,.rar,.7z,.ppt,.pptx,.jpg,.png,.doc,.docx"
          />
          <FileUp className={`mx-auto mb-3 ${file ? 'text-blue-500' : 'text-slate-300'}`} size={32} />
          {file ? (
            <div className="space-y-1">
              <p className="text-blue-600 font-medium truncate max-w-xs mx-auto">{file.name}</p>
              <p className="text-xs text-blue-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-slate-500 text-sm">点击或拖拽 PDF/PNG/ZIP/DOC 文件</p>
              <p className="text-[10px] text-slate-400">最大支持 4.5MB</p>
            </div>
          )}
        </div>

        {/* 2. 表单字段区 */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-bold text-slate-500 uppercase">
            重命名文件 (可选)
          </label>
          
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="输入新文件名" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition-all pr-16" 
            />
            
            {file && (
              <div className="absolute right-3 px-2 py-1 bg-slate-200/50 text-slate-500 text-xs font-medium rounded md:block hidden">
                .{file.name.split('.').pop()}
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-slate-400 mt-1 pl-1">
            系统将自动保留原文件扩展名
          </p>
        </div>     

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. 课程名称 */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-slate-500 uppercase">课程名称</label>
            <div className="relative group">
              <input 
                required 
                type="text" 
                value={courseName}
                onChange={(e) => handleCourseInputChange(e.target.value)}
                onFocus={() => courseName && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="如：信号与系统" 
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm pr-10" 
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {suggestions.map((s, i) => (
                    <div 
                      key={i}
                      onClick={() => { setCourseName(s); setShowSuggestions(false); }}
                      className="h-11 px-4 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <span className="truncate">{s}</span>
                      <Search size={14} className="text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. 资料分类 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">资料分类</label>
            <div className="relative">
              <div 
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                tabIndex={0}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer hover:bg-slate-100 focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 text-sm leading-normal flex items-center justify-between"
              >
                <span>{category}</span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
              </div>
              
              {showCategoryDropdown && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {categories.map((cat, i) => (
                    <div 
                      key={i}
                      onClick={() => { setCategory(cat); setShowCategoryDropdown(false); }}
                      className="h-11 px-4 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                      <span>{cat}</span>
                      {category === cat && (
                        <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 3. 安全提示 */}
        <div className="flex gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <ShieldAlert className="text-amber-600 shrink-0" size={20} />
          <p className="text-xs text-amber-800 leading-relaxed">
            <b>安全须知：</b> 资料将被上传至 GitHub。请确信文件中不包含个人学号、姓名等隐私信息。
          </p>
        </div>

        <button 
          type="submit"
          disabled={status === 'processing' || !file || !courseName}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
      </form>
    </div>
  );
}