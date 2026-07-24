import React, { useEffect, useMemo, useState } from 'react';
import { GitPullRequest, FileUp, CheckCircle2, ShieldAlert, Search, Loader2, X, AlertCircle, Upload as UploadIcon, FileImage, FileCode, FileSpreadsheet, FileVideo, FileAudio, Archive, FileText, File as FileIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function BatchUpload({ onNavigate }) {
  const { darkMode } = useTheme();
  const { token, isAuthed, refreshMe } = useAuth();

  const [files, setFiles] = useState([]); // 文件队列
  const [uploadMode, setUploadMode] = useState('BY_CATEGORY'); // BY_CATEGORY | BY_FILE
  const [courseName, setCourseName] = useState('');
  const [pathInput, setPathInput] = useState('');
  const [pathSegments, setPathSegments] = useState([]);
  const [category] = useState('历年真题');
  const [allCourses, setAllCourses] = useState(() => {
    try {
      const cachedCourses = localStorage.getItem('course_list');
      const parsed = cachedCourses ? JSON.parse(cachedCourses) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [courseTreeMap, setCourseTreeMap] = useState(() => {
    try {
      const raw = localStorage.getItem('njupt_hub:file_tree_cache:v1');
      const parsed = raw ? JSON.parse(raw) : null;
      const folders = parsed?.folders;
      return folders && typeof folders === 'object' ? folders : {};
    } catch {
      return {};
    }
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDirSuggestions, setShowDirSuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isWeChatWebView = /MicroMessenger/i.test(navigator.userAgent || '');
  const allowedExtensions = new Set(['pdf', 'zip', 'rar', '7z', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'doc', 'docx']);
  const fileInputAccept = isWeChatWebView ? '*/*' : '.pdf,.zip,.rar,.7z,.ppt,.pptx,.jpg,.png,.doc,.docx';
  
  useEffect(() => {
    if (allCourses.length > 0 && Object.keys(courseTreeMap).length > 0) return;
    let aborted = false;

    const fetchCourseTree = async () => {
      try {
        const res = await fetch('/api/resources?status=APPROVED&page=1&pageSize=300');
        if (!res.ok) return;
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const root = {};
        for (const item of items) {
          const course = normalizeSegment(item?.course);
          if (!course) continue;
          if (!root[course]) root[course] = { folders: {} };
          const rawRelative = String(item?.fileName || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
          const relativeParts = rawRelative.split('/').filter(Boolean);
          const trimmedParts =
            relativeParts.length > 1 && normalizeSegment(relativeParts[0]) === course
              ? relativeParts.slice(1)
              : relativeParts;
          const parts = trimmedParts.slice(0, -1);
          let node = root[course];
          for (const part of parts) {
            if (!node.folders[part]) node.folders[part] = { folders: {} };
            node = node.folders[part];
          }
        }

        if (aborted) return;
        const courses = Object.keys(root);
        if (courses.length > 0) {
          setAllCourses(courses);
          setCourseTreeMap(root);
          localStorage.setItem('course_list', JSON.stringify(courses));
          localStorage.setItem(
            'njupt_hub:file_tree_cache:v1',
            JSON.stringify({ cachedAt: Date.now(), folders: root }),
          );
        }
      } catch {
        // ignore fallback errors
      }
    };

    fetchCourseTree();
    return () => { aborted = true; };
  }, [allCourses.length, courseTreeMap]);

  useEffect(() => {
    if (uploadMode !== 'BY_CATEGORY') return;
    // 按类型上传时只使用全局目录，关闭逐文件路径编辑状态
    setFiles(prev => prev.map(f => ({
      ...f,
      showCourseSuggestions: false,
      showDirSuggestions: false,
    })));
  }, [uploadMode]);

  // 处理课程名称输入
  const handleCourseInputChange = (value) => {
    setCourseName(value);
    setPathInput('');
    setPathSegments([]);
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

  const normalizeSegment = (value) => String(value || '').replace(/\//g, '').trim();
  const normalizeSegments = (segments) => segments
    .map(normalizeSegment)
    .filter(Boolean);

  const getCourseTreeNode = (course, segments) => {
    let node = courseTreeMap?.[course];
    if (!node || typeof node !== 'object') return null;
    for (const seg of segments) {
      const next = node?.folders?.[seg];
      if (!next || typeof next !== 'object') return null;
      node = next;
    }
    return node;
  };

  const getDirCandidates = (courseValue, segments, keyword = '') => {
    const normalizedCourse = normalizeSegment(courseValue);
    if (!normalizedCourse) return [];
    const node = getCourseTreeNode(normalizedCourse, segments);
    const names = node?.folders ? Object.keys(node.folders) : [];
    if (!String(keyword).trim()) return names.slice(0, 8);
    const key = String(keyword).trim().toLowerCase();
    return names.filter(name => name.toLowerCase().includes(key)).slice(0, 8);
  };

  const getFileIcon = (fileName) => {
    const ext = String(fileName || '').split('.').pop()?.toLowerCase();
    const iconProps = { size: 18, className: darkMode ? 'text-slate-600' : 'text-slate-400' };

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      return <FileImage {...iconProps} className={darkMode ? 'text-green-400' : 'text-green-500'} />;
    }
    if (['doc', 'docx', 'txt', 'md'].includes(ext)) {
      return <FileText {...iconProps} className={darkMode ? 'text-blue-400' : 'text-blue-500'} />;
    }
    if (['pdf'].includes(ext)) {
      return <FileText {...iconProps} className={darkMode ? 'text-red-400' : 'text-red-500'} />;
    }
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json'].includes(ext)) {
      return <FileCode {...iconProps} className={darkMode ? 'text-purple-400' : 'text-purple-500'} />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet {...iconProps} className={darkMode ? 'text-emerald-400' : 'text-emerald-500'} />;
    }
    if (['ppt', 'pptx'].includes(ext)) {
      return <FileText {...iconProps} className={darkMode ? 'text-orange-400' : 'text-orange-500'} />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive {...iconProps} className={darkMode ? 'text-yellow-400' : 'text-yellow-600'} />;
    }
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) {
      return <FileVideo {...iconProps} className={darkMode ? 'text-pink-400' : 'text-pink-500'} />;
    }
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
      return <FileAudio {...iconProps} className={darkMode ? 'text-cyan-400' : 'text-cyan-500'} />;
    }
    return <FileIcon {...iconProps} />;
  };

  const currentDirCandidates = useMemo(
    () => getDirCandidates(courseName, pathSegments, pathInput),
    [courseName, courseTreeMap, pathInput, pathSegments],
  );

  const applyPathInput = (rawValue) => {
    const normalized = String(rawValue || '').replace(/\\/g, '/');
    const parts = normalized.split('/');
    const endsWithSlash = normalized.endsWith('/');
    const committed = normalizeSegments(parts.slice(0, endsWithSlash ? parts.length : parts.length - 1));
    const tail = endsWithSlash ? '' : normalizeSegment(parts[parts.length - 1]);
    if (committed.length > 0) {
      setPathSegments(prev => [...prev, ...committed]);
    }
    setPathInput(tail);
  };

  const commitCurrentInputSegment = () => {
    const next = normalizeSegment(pathInput);
    if (!next) return;
    setPathSegments(prev => [...prev, next]);
    setPathInput('');
  };

  const handleDirectoryInputChange = (value) => {
    if (value.includes('/')) {
      applyPathInput(value);
    } else {
      setPathInput(value);
    }
    const base = value.includes('/') ? '' : value;
    if (courseName.trim() && (base.trim() || currentDirCandidates.length > 0)) {
      setShowDirSuggestions(true);
    } else {
      setShowDirSuggestions(false);
    }
  };

  const selectDirectorySegment = (segment) => {
    const normalized = normalizeSegment(segment);
    if (!normalized) return;
    setPathSegments(prev => [...prev, normalized]);
    setPathInput('');
    setShowDirSuggestions(true);
  };

  const removePathSegment = (index) => {
    setPathSegments(prev => prev.filter((_, i) => i !== index));
  };

  const getEffectiveSubPathSegments = () => {
    const manualSegments = normalizeSegments(pathInput.replace(/\\/g, '/').split('/'));
    return [...pathSegments, ...manualSegments];
  };

  const updateFilePathMeta = (id, updater) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== id) return f;
      return updater(f);
    }));
  };

  const handleSingleFileCourseChange = (id, value) => {
    updateFilePathMeta(id, (f) => {
      const filtered = value.trim()
        ? allCourses.filter(c => c.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
        : [];
      return {
        ...f,
        individualCourse: value,
        individualPathInput: '',
        individualPathSegments: [],
        courseSuggestions: filtered,
        showCourseSuggestions: filtered.length > 0,
      };
    });
  };

  const handleSingleFileDirInput = (id, value) => {
    updateFilePathMeta(id, (f) => {
      const next = { ...f };
      const normalized = String(value || '').replace(/\\/g, '/');
      if (normalized.includes('/')) {
        const parts = normalized.split('/');
        const endsWithSlash = normalized.endsWith('/');
        const committed = normalizeSegments(parts.slice(0, endsWithSlash ? parts.length : parts.length - 1));
        const tail = endsWithSlash ? '' : normalizeSegment(parts[parts.length - 1]);
        next.individualPathSegments = [...(next.individualPathSegments || []), ...committed];
        next.individualPathInput = tail;
      } else {
        next.individualPathInput = value;
      }
      const dirCandidates = getDirCandidates(
        next.individualCourse,
        next.individualPathSegments || [],
        next.individualPathInput || '',
      );
      next.showDirSuggestions = Boolean(normalizeSegment(next.individualCourse)) && dirCandidates.length > 0;
      return next;
    });
  };

  // 处理文件选择（支持多选）
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files).filter((file) => {
      const ext = String(file?.name || '').split('.').pop()?.toLowerCase();
      return ext && allowedExtensions.has(ext);
    });
    const originalCount = Array.from(e.target.files || []).length;
    if (selectedFiles.length < originalCount) {
      toast.error('部分文件格式不支持，已自动忽略');
    }
    addFilesToQueue(selectedFiles);
  };

  // 处理拖拽
  const handleDrop = (e) => {
    e.preventDefault();
    const allDropped = Array.from(e.dataTransfer.files || []);
    const droppedFiles = allDropped.filter((file) => {
      const ext = String(file?.name || '').split('.').pop()?.toLowerCase();
      return ext && allowedExtensions.has(ext);
    });
    if (droppedFiles.length < allDropped.length) {
      toast.error('部分文件格式不支持，已自动忽略');
    }
    addFilesToQueue(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 添加文件到队列
  const addFilesToQueue = (newFiles) => {
    const filesWithMeta = newFiles.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ""), // 默认文件名（不含扩展名）
      individualCourse: '',
      individualPathInput: '',
      individualPathSegments: [],
      showCourseSuggestions: false,
      showDirSuggestions: false,
      courseSuggestions: [],
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

    let anySuccess = false;
    let failedCount = 0;
    const uploadedResources = [];
    for (const fileItem of files) {
      if (fileItem.status === 'success') continue; // 跳过已成功的

      // 更新状态为上传中
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        const createdItems = await uploadSingleFile(fileItem);
        uploadedResources.push(...createdItems);
        anySuccess = true;
        
        // 上传成功
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
        ));
      } catch (error) {
        failedCount += 1;
        // 上传失败
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f
        ));
      }
    }

    setUploading(false);

    if (isAuthed && anySuccess) {
      try {
        await refreshMe();
      } catch (e) {
        // ignore
      }
    }

    if (isAuthed && uploadedResources.length > 0) {
      const resourceIds = uploadedResources.map((resource) => resource.id).filter(Boolean);
      fetch('/api/resources/upload/thank-you', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resourceIds }),
      }).then(async (response) => {
        if (response.ok) return;
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || `感谢邮件发送失败 (${response.status})`);
      }).catch((error) => {
        console.warn('Upload thank-you email request failed:', error);
      });
    }

    if (failedCount > 0) {
      toast.error(`部分文件上传失败 (${failedCount} 个)`);
    } else if (uploadedResources.length > 0) {
      toast.success('全部上传成功，请等待审核');
    }
  };

  // 上传单个文件
  const uploadSingleFile = (fileItem) => {
    return new Promise((resolve, reject) => {
      const extension = fileItem.file.name.split('.').pop();
      const finalFileName = `${fileItem.name.trim()}.${extension}`;
      const renamedFile = new File([fileItem.file], finalFileName, { type: fileItem.file.type });
      const finalCourse = uploadMode === 'BY_FILE'
        ? normalizeSegment(fileItem.individualCourse)
        : normalizeSegment(courseName);
      const fileModeSegments = [
        ...(fileItem.individualPathSegments || []),
        ...normalizeSegments(String(fileItem.individualPathInput || '').replace(/\\/g, '/').split('/')),
      ];
      const finalSubPathSegments = uploadMode === 'BY_FILE' ? fileModeSegments : getEffectiveSubPathSegments();
      const finalSegments = [...finalSubPathSegments, finalFileName]
        .filter(Boolean)
        .join('/');

      const form = new FormData();
      form.append('course', finalCourse);
      form.append('category', category);
      form.append('titles', fileItem.name.trim());
      form.append('paths', finalSegments);
      form.append('files', renamedFile);

      setFiles(prev => prev.map(f => (f.id === fileItem.id ? { ...f, progress: 30 } : f)));

      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      fetch('/api/resources/upload', {
        method: 'POST',
        headers: headers,
        body: form,
      })
        .then(async (response) => {
          setFiles(prev => prev.map(f => (f.id === fileItem.id ? { ...f, progress: 80 } : f)));

          let data = {};
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            data = await response.json();
          }

          if (!response.ok) {
            throw new Error(data?.message || data?.error || `上传失败 (${response.status})`);
          }
          setFiles(prev => prev.map(f => (f.id === fileItem.id ? { ...f, progress: 100 } : f)));
          resolve(Array.isArray(data?.items) ? data.items : []);
        })
        .catch((err) => {
          reject(err instanceof Error ? err : new Error('网络请求失败'));
        });
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
    <div className="max-w-4xl mx-auto px-2 py-4 md:p-4 space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between gap-3 px-2 md:px-0">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>
            <GitPullRequest size={24} />
          </div>
          <div>
            <h2 className={`text-xl md:text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>上传资料</h2>
            <p className={`text-xs md:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>一次选择一个或多个文件，高效管理上传队列</p>
          </div>
        </div>

        <div className={`inline-flex p-1 rounded-lg border shrink-0 ${
          darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setUploadMode('BY_CATEGORY')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              uploadMode === 'BY_CATEGORY'
                ? darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
                : darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            按类型上传
          </button>
          <button
            onClick={() => setUploadMode('BY_FILE')}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              uploadMode === 'BY_FILE'
                ? darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
                : darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            按文件上传
          </button>
        </div>
      </div>

      <div className={`md:rounded-2xl md:border md:shadow-xl p-4 md:p-8 space-y-6 ${
        darkMode 
          ? 'md:bg-slate-800/50 md:border-slate-700 md:shadow-slate-900/50' 
          : 'md:bg-slate-100 md:border-slate-100 md:shadow-slate-200/50'
      }`}>
        
        {/* 1. 上传队列 + 嵌入式上传引导 */}
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

          <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`relative border-2 border-dashed rounded-xl p-6 transition-all text-center ${
              files.length > 0
                ? darkMode ? 'border-blue-400 bg-blue-500/10' : 'border-blue-500 bg-blue-50/30'
                : darkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-400'
            }`}
          >
            <input 
              type="file" 
              multiple
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept={fileInputAccept}
            />
            <FileUp className={`mx-auto mb-2 ${
              files.length > 0
                ? darkMode ? 'text-blue-400' : 'text-blue-500'
                : darkMode ? 'text-slate-600' : 'text-slate-300'
            }`} size={26} />
            <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              点击或拖拽文件到上传队列
            </p>
            <p className={`text-[11px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              支持多文件上传，大小上限由服务器配置
            </p>
          </div>

          {uploadMode === 'BY_CATEGORY' && (
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold uppercase ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>保存目录</label>
                {!isAuthed && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                  }`}>
                    游客模式 (上传将署名为“游客”)
                  </span>
                )}
              </div>

              <div className="flex items-start gap-2">
                <div className="w-[34%] min-w-[120px] relative">
                  <input
                    required
                    type="text"
                    value={courseName}
                    onChange={(e) => handleCourseInputChange(e.target.value)}
                    onFocus={() => courseName && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="课程名"
                    className={`w-full h-11 px-3 border rounded-lg focus:ring-2 outline-none transition-all text-sm pr-8 ${
                      darkMode
                        ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500 focus:ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-blue-500/20'
                    }`}
                  />
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    <Search size={14} />
                  </div>

                  {showSuggestions && suggestions.length > 0 && (
                    <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow-xl overflow-hidden ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          onClick={() => { handleCourseInputChange(s); setShowSuggestions(false); }}
                          className={`h-10 px-3 text-sm cursor-pointer flex items-center transition-colors ${
                            darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`pt-2 text-lg ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</div>

                <div className="flex-1 relative">
                  <div className={`min-h-11 px-3 py-2 border rounded-lg flex flex-wrap items-center gap-2 focus-within:ring-2 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-slate-200 focus-within:ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus-within:ring-blue-500/20'
                  }`}>
                    {pathSegments.map((seg, idx) => (
                      <span
                        key={`${seg}-${idx}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                          darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {seg}/
                        <button
                          type="button"
                          onClick={() => removePathSegment(idx)}
                          className={`${darkMode ? 'text-blue-200 hover:text-white' : 'text-blue-500 hover:text-blue-700'}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={pathInput}
                      onChange={(e) => handleDirectoryInputChange(e.target.value)}
                      onFocus={() => setShowDirSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowDirSuggestions(false), 200)}
                      onKeyDown={(e) => {
                        if (e.key === '/') {
                          e.preventDefault();
                          commitCurrentInputSegment();
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitCurrentInputSegment();
                        }
                        if (e.key === 'Backspace' && !pathInput && pathSegments.length > 0) {
                          setPathSegments(prev => prev.slice(0, -1));
                        }
                      }}
                      placeholder="可选子目录，如 章节1/重点"
                      className={`flex-1 min-w-[140px] h-7 bg-transparent outline-none text-sm ${
                        darkMode ? 'placeholder-slate-500' : 'placeholder-slate-400'
                      }`}
                    />
                  </div>

                  {showDirSuggestions && currentDirCandidates.length > 0 && (
                    <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow-xl overflow-hidden ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      {currentDirCandidates.map((dir, i) => (
                        <div
                          key={`${dir}-${i}`}
                          onClick={() => selectDirectorySegment(dir)}
                          className={`h-10 px-3 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                            darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{dir}/</span>
                          <Search size={13} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={`max-h-96 overflow-y-auto space-y-2 rounded-lg p-3 ${
            darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
          }`}>
            {files.length === 0 && (
              <div className={`text-xs text-center py-6 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                队列为空，先添加文件再设置保存路径
              </div>
            )}
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
                      <div className="shrink-0">
                        {getFileIcon(fileItem.file.name)}
                      </div>
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

                    {uploadMode === 'BY_FILE' && fileItem.status === 'pending' && (
                        <div className="space-y-2 mb-2">
                          <div className="flex items-start gap-2">
                            <div className="w-[34%] min-w-[110px] relative">
                              <input
                                type="text"
                                value={fileItem.individualCourse || ''}
                                onChange={(e) => handleSingleFileCourseChange(fileItem.id, e.target.value)}
                                onFocus={() => updateFilePathMeta(fileItem.id, (f) => ({ ...f, showCourseSuggestions: true }))}
                                onBlur={() => setTimeout(() => updateFilePathMeta(fileItem.id, (f) => ({ ...f, showCourseSuggestions: false })), 200)}
                                placeholder="课程名"
                                className={`w-full h-9 px-2 text-xs border rounded-lg outline-none ${
                                  darkMode ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                                }`}
                              />
                              {fileItem.showCourseSuggestions && (fileItem.courseSuggestions || []).length > 0 && (
                                <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow overflow-hidden ${
                                  darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                  {fileItem.courseSuggestions.map((s, i) => (
                                    <div
                                      key={`${s}-${i}`}
                                      onClick={() => handleSingleFileCourseChange(fileItem.id, s)}
                                      className={`h-8 px-2 text-xs cursor-pointer flex items-center ${
                                        darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span className="truncate">{s}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className={`pt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</div>

                            <div className="flex-1 relative">
                              <div className={`min-h-9 px-2 py-1 border rounded-lg flex flex-wrap items-center gap-1 ${
                                darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
                              }`}>
                                {(fileItem.individualPathSegments || []).map((seg, idx) => (
                                  <span
                                    key={`${seg}-${idx}`}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${
                                      darkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                                    }`}
                                  >
                                    {seg}/
                                    <button type="button" onClick={() => updateFilePathMeta(fileItem.id, (f) => ({
                                      ...f,
                                      individualPathSegments: (f.individualPathSegments || []).filter((_, i) => i !== idx),
                                    }))}>
                                      <X size={10} />
                                    </button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  value={fileItem.individualPathInput || ''}
                                  onChange={(e) => handleSingleFileDirInput(fileItem.id, e.target.value)}
                                  onFocus={() => updateFilePathMeta(fileItem.id, (f) => ({ ...f, showDirSuggestions: true }))}
                                  onBlur={() => setTimeout(() => updateFilePathMeta(fileItem.id, (f) => ({ ...f, showDirSuggestions: false })), 200)}
                                  onKeyDown={(e) => {
                                    if (e.key === '/' || e.key === 'Enter') {
                                      e.preventDefault();
                                      updateFilePathMeta(fileItem.id, (f) => {
                                        const next = normalizeSegment(f.individualPathInput);
                                        if (!next) return f;
                                        return {
                                          ...f,
                                          individualPathSegments: [...(f.individualPathSegments || []), next],
                                          individualPathInput: '',
                                        };
                                      });
                                    }
                                  }}
                                  placeholder="该文件子目录（可空）"
                                  className={`flex-1 min-w-[120px] h-6 bg-transparent outline-none text-xs ${
                                    darkMode ? 'text-slate-200 placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'
                                  }`}
                                />
                              </div>

                              {fileItem.showDirSuggestions && (() => {
                                const dirCandidates = getDirCandidates(
                                  fileItem.individualCourse,
                                  fileItem.individualPathSegments || [],
                                  fileItem.individualPathInput || '',
                                );
                                if (dirCandidates.length === 0) return null;
                                return (
                                  <div className={`absolute z-20 w-full mt-1 border rounded-lg shadow overflow-hidden ${
                                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                                  }`}>
                                    {dirCandidates.map((dir, i) => (
                                      <div
                                        key={`${dir}-${i}`}
                                        onClick={() => updateFilePathMeta(fileItem.id, (f) => ({
                                          ...f,
                                          individualPathSegments: [...(f.individualPathSegments || []), dir],
                                          individualPathInput: '',
                                          showDirSuggestions: true,
                                        }))}
                                        className={`h-8 px-2 text-xs cursor-pointer flex items-center ${
                                          darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        <span className="truncate">{dir}/</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

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

          <div className={`flex gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>待上传: {stats.pending}</span>
            <span>上传中: {stats.uploading}</span>
            <span className={darkMode ? 'text-green-400' : 'text-green-600'}>成功: {stats.success}</span>
            {stats.error > 0 && (
              <span className={darkMode ? 'text-red-400' : 'text-red-500'}>失败: {stats.error}</span>
            )}
          </div>
        </div>
        
        {/* 5. 安全提示 */}
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
            <b>安全须知：</b> 资料将被公开。请确信文件中不包含个人学号、姓名等隐私信息。
          </p>
        </div>

        {/* 6. 上传按钮 */}
        <button 
          onClick={handleBatchUpload}
          disabled={
            uploading
            || files.length === 0
            || stats.pending === 0
            || (uploadMode === 'BY_CATEGORY' && !courseName)
            || (uploadMode === 'BY_FILE' && files.some(f => f.status === 'pending' && !normalizeSegment(f.individualCourse)))
          }
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
