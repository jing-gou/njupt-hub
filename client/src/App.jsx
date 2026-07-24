// App.jsx
import React, { useEffect, useRef, useState } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ReviewPage from './pages/ReviewPage';
import ModerationPage from './pages/ModerationPage';
import Leaderboard from './pages/Leaderboard';
import { Search, Upload as UploadIcon, LogIn, CircleUserRound, MessageSquareText, ShieldAlert, RefreshCw } from 'lucide-react';
import Footer from './components/Footer';
import Maintenance from './pages/Maintenance';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function UmamiAnalytics() {
  useEffect(() => {
    const scriptUrl = String(import.meta.env.VITE_UMAMI_SCRIPT_URL || '').trim();
    const websiteId = String(import.meta.env.VITE_UMAMI_WEBSITE_ID || '').trim();
    if (!scriptUrl || !websiteId) return;
    if (document.querySelector('script[data-umami="true"]')) return;

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.setAttribute('data-website-id', websiteId);
    script.setAttribute('data-umami', 'true');
    script.setAttribute('data-auto-track', 'true');
    document.head.appendChild(script);
  }, []);

  return null;
}

function trackUmamiPageView(url, title) {
  if (typeof window === 'undefined') return;
  const umami = window.umami;
  if (!umami || typeof umami.track !== 'function') return;
  umami.track(() => ({
    url,
    title,
    website: String(import.meta.env.VITE_UMAMI_WEBSITE_ID || '').trim(),
    hostname: window.location.hostname,
    language: navigator.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    referrer: document.referrer,
    tag: 'spa',
  }));
}







function AppContent() {
  const isUnderMaintenance = false;
  const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
  const [currentPage, setCurrentPage] = useState('home');
  const { darkMode } = useTheme();
  const { isAuthed, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'DEV';
  const [isMobileNavCollapsed, setIsMobileNavCollapsed] = useState(false);
  const lastScrollYRef = useRef(0);

  const normalizePageId = (value) => {
    const v = String(value || '').trim().toLowerCase();
    const allowed = new Set([
      'home',
      'reviews',
      'upload',
      'leaderboard',
      'moderation',
      'login',
      'register',
      'forgot-password',
      'profile',
    ]);
    return allowed.has(v) ? v : 'home';
  };

  const getPageFromHash = () => {
    const raw = String(window.location.hash || '');
    const cleaned = raw.replace(/^#\/?/, '').trim();
    if (!cleaned) return 'home';
    const page = cleaned.split('/')[0];
    return normalizePageId(page);
  };

  const navigate = (page, opts = {}) => {
    const next = normalizePageId(page);

    // 权限保护：非管理员访问 moderation 直接回到 home
    const finalPage = next === 'moderation' && !isAdmin ? 'home' : next;
    const nextHash = `#/${finalPage}`;

    if (opts?.replace) {
      window.history.replaceState(null, '', nextHash);
      setCurrentPage(finalPage);
      return;
    }

    // hash 变化会自动写入 history，Android 返回键可回退
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    } else {
      setCurrentPage(finalPage);
    }
  };

  // 初始化 + 监听 hash 变化，让 Android 返回键生效
  useEffect(() => {
    const init = () => {
      const page = getPageFromHash();
      if (!window.location.hash) {
        // 首次进入没有 hash：用 replace 避免额外 history 条目
        window.history.replaceState(null, '', `#/${page}`);
      }
      setCurrentPage(page);
    };

    const onHashChange = () => {
      const page = getPageFromHash();
      // 权限保护（从历史回退也要管）
      if (page === 'moderation' && !isAdmin) {
        navigate('home', { replace: true });
        return;
      }
      setCurrentPage(page);
    };

    init();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [isAdmin]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    const hashPath = window.location.hash || `#/${currentPage}`;
    const title = `NJUPT Hub - ${currentPage}`;
    const timer = window.setTimeout(() => trackUmamiPageView(hashPath, title), 300);
    return () => window.clearTimeout(timer);
  }, [currentPage]);

  // 移动端：向下滑动时收缩顶部 sticky bar，向上滑/回到顶部时展开
  useEffect(() => {
    const onScroll = () => {
      if (window.innerWidth >= 768) return; // md 及以上不处理

      const y = window.scrollY || 0;
      const lastY = lastScrollYRef.current || 0;
      const delta = y - lastY;

      // 顶部附近始终展开
      if (y < 24) {
        setIsMobileNavCollapsed(false);
        lastScrollYRef.current = y;
        return;
      }

      // 轻微抖动忽略
      if (Math.abs(delta) < 8) {
        lastScrollYRef.current = y;
        return;
      }

      // 下滑超过一定距离后收缩，上滑则展开
      if (delta > 0 && y > 80) setIsMobileNavCollapsed(true);
      if (delta < 0) setIsMobileNavCollapsed(false);

      lastScrollYRef.current = y;
    };

    lastScrollYRef.current = window.scrollY || 0;
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (isUnderMaintenance && !isMobile()) {
    return (
    <div className={`h-screen overflow-hidden flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] ${darkMode ? 'bg-blue-500/20' : 'bg-blue-400/30'}`}></div>
    </div>
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4">
        <Maintenance />
      </div>
      <Footer darkMode={darkMode} />
    </div>
    );
  }

if (isUnderMaintenance && isMobile()) {
    return (
      /* 1. 改为 min-h-dvh 允许高度扩展 */
      /* 2. 改为 overflow-y-auto 允许滚动 */
      <div className={`min-h-dvh w-full overflow-y-auto flex flex-col transition-colors duration-500 relative ${
        darkMode ? 'bg-slate-950 text-slate-200' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 text-slate-800'
      }`}>
        
        {/* 背景层 - 保持 absolute，它会随内容拉长而拉长 */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[60vh] rounded-[100%] blur-[120px] opacity-50 ${
            darkMode ? 'bg-blue-600/20' : 'bg-blue-300/40'
          }`}></div>
        </div>

        {/* 主内容区 - 去掉 flex-1 的约束，或者保持它以确保居中，但允许撑开 */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 z-10 relative">
          <div className="w-full max-w-sm py-10"> {/* 增加上下 padding 防止贴边 */}
            <Maintenance />
          </div>
        </main>

        {/* 底部 - 正常排列在内容下方 */}
        <footer className="z-10 pb-[env(safe-area-inset-bottom)]">
          <Footer darkMode={darkMode} />
        </footer>
      </div>
    );
  }

  return (
   <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300'
    }`}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: darkMode ? '#0f172a' : '#ffffff',
            color: darkMode ? '#e2e8f0' : '#0f172a',
            border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
          },
          success: {
            iconTheme: {
              primary: darkMode ? '#34d399' : '#10b981',
              secondary: darkMode ? '#0f172a' : '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: darkMode ? '#fb7185' : '#ef4444',
              secondary: darkMode ? '#0f172a' : '#ffffff',
            },
          },
        }}
      />
      {/* 顶部导航栏 */}
      <nav className={`fixed top-0 left-0 right-0 w-full z-40 backdrop-blur-lg border-b transition-colors ${
        darkMode 
          ? 'bg-slate-900/80 border-slate-800' 
          : 'bg-slate-100/85 border-slate-200'
      }`}>
        <div className={`max-w-6xl mx-auto px-4 flex items-center justify-between transition-all duration-300 ${
          isMobileNavCollapsed ? 'py-2' : 'py-4'
        }`}>
          {/* Logo */}
          <div className={`hidden md:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
            darkMode 
              ? 'from-blue-400 to-purple-400' 
              : 'from-blue-600 to-purple-600'
          }`}>
            NJUPT Hub
          </div>

          {/* 桌面端导航按钮 - 隐藏在小屏幕 */}
          <div className={`hidden md:flex items-center gap-2 p-1 rounded-lg ${
            darkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <button
              onClick={() => navigate('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all transform hover:scale-105 active:scale-95 ${
                currentPage === 'home'
                  ? darkMode
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search size={18} />
              查找
            </button>
            <button
              onClick={() => navigate('reviews')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all transform hover:scale-105 active:scale-95 ${
                currentPage === 'reviews'
                  ? darkMode
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquareText size={18} />
              评价
            </button>
            <button
              onClick={() => navigate('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all transform hover:scale-105 active:scale-95 ${
                currentPage === 'upload'
                  ? darkMode
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UploadIcon size={18} />
              上传
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('moderation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all transform hover:scale-105 active:scale-95 ${
                  currentPage === 'moderation'
                    ? darkMode
                      ? 'bg-slate-700 text-white'
                      : 'bg-white text-slate-900 shadow-sm'
                    : darkMode
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert size={18} className="text-blue-500" />
                审核
              </button>
            )}
            <button
              onClick={() => navigate(isAuthed ? 'profile' : 'login')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all transform hover:scale-105 active:scale-95 ${
                currentPage === 'login' || currentPage === 'profile' || currentPage === 'register' || currentPage === 'forgot-password'
                  ? darkMode
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isAuthed ? <CircleUserRound size={18} /> : <LogIn size={18} />}
              {isAuthed ? '我' : '登录'}
            </button>
          </div>

          {/* 移动端 Logo 居中对齐优化 */}
          <div className="md:hidden flex-1 flex justify-center">
            <div className={`text-lg font-black bg-clip-text text-transparent bg-gradient-to-r ${
              darkMode ? 'from-blue-400 to-purple-400' : 'from-blue-600 to-purple-600'
            }`}>
              NJUPT Hub
            </div>
          </div>

          
        </div>
      </nav>

      {/* 顶部导航栏占位，避免 fixed 覆盖页面内容 */}
      <div className={`${isMobileNavCollapsed ? 'h-14' : 'h-16'} md:h-20`} />

      {/* 页面内容 */}
      <main className="min-h-[calc(100vh-73px)] pb-0 md:pb-0">
        {currentPage === 'home' ? (
          <Home onNavigate={navigate} />
        ) : currentPage === 'reviews' ? (
          <ReviewPage />
        ) : currentPage === 'upload' ? (
          <Upload onNavigate={navigate} />
        ) : currentPage === 'leaderboard' ? (
          <Leaderboard onBack={() => window.history.back()} />
        ) : currentPage === 'moderation' && isAdmin ? (
          <ModerationPage />
        ) : currentPage === 'login' ? (
          <Login 
            onSuccess={() => navigate('profile', { replace: true })} 
            onGoRegister={() => navigate('register')} 
            onGoForgotPassword={() => navigate('forgot-password')}
          />
        ) : currentPage === 'register' ? (
          <Register onGoLogin={() => navigate('login')} onSuccess={() => navigate('profile', { replace: true })} />
        ) : currentPage === 'forgot-password' ? (
          <ForgotPassword onGoBack={() => window.history.back()} onSuccess={() => navigate('login', { replace: true })} />
        ) : (
          <Profile onGoLogin={() => navigate('login')} />
        )}
      </main>

      <Footer darkMode={darkMode} />

      {/* 移动端底部导航栏 */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t px-2 pb-safe transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]'
      }`}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {[
            { id: 'home', icon: Search, label: '查找' },
            { id: 'reviews', icon: MessageSquareText, label: '评价' },
            { id: 'upload', icon: UploadIcon, label: '上传' },
            ...(isAdmin ? [{ id: 'moderation', icon: ShieldAlert, label: '审核' }] : []),
            { id: isAuthed ? 'profile' : 'login', icon: CircleUserRound, label: isAuthed ? '我' : '登录' }
          ].map((item) => {
            const isHomeActive = item.id === 'home' && currentPage === 'home';
            const Icon = isHomeActive ? RefreshCw : item.icon;
            const label = isHomeActive ? '刷新' : item.label;
            const isActive = currentPage === item.id || 
                            (item.id === 'login' && (currentPage === 'register' || currentPage === 'forgot-password'));
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'home' && currentPage === 'home') {
                    window.dispatchEvent(new Event('njupt-hub:refresh-home-cache'));
                    return;
                  }
                  navigate(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-1 flex-1 transition-all transform active:scale-90 ${
                  isActive 
                    ? 'text-blue-500 scale-110 font-bold' 
                    : darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-500/10' : ''}`}>
                  <Icon size={22} className={isActive ? 'stroke-[2.5px]' : ''} />
                </div>
                <span className="text-[10px]">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
        <UmamiAnalytics />
      </AuthProvider>
    </ThemeProvider>
  );
}
