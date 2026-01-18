// App.jsx
import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Home from './pages/Home';
import Upload from './pages/Upload';
import { Sun, Moon, Search, Upload as UploadIcon } from 'lucide-react';
import Footer from './components/Footer';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const { darkMode, toggleTheme } = useTheme();

  return (
   <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* 顶部导航栏 */}
      <nav className={`sticky top-0 z-40 backdrop-blur-lg border-b transition-colors ${
        darkMode 
          ? 'bg-slate-900/80 border-slate-800' 
          : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
            darkMode 
              ? 'from-blue-400 to-purple-400' 
              : 'from-blue-600 to-purple-600'
          }`}>
            NJUPT Notes
          </div>

          {/* 导航按钮 */}
          <div className={`flex items-center gap-2 p-1 rounded-lg ${
            darkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <button
              onClick={() => setCurrentPage('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
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
              onClick={() => setCurrentPage('upload')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
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
          </div>

          {/* 主题切换按钮 */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-lg transition-all hover:scale-110 ${
              darkMode 
                ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' 
                : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>

      {/* 页面内容 */}
      <main className="min-h-[calc(100vh-73px)]">
        {currentPage === 'home' ? <Home /> : <Upload />}
      </main>
      <Footer darkMode={darkMode} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}