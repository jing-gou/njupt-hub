import React from 'react';
import { Construction, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
// 假设你的页脚组件叫 Footer，导航栏叫 Navbar
// import Footer from '../components/Footer'; 

export default function Maintenance() {
  const { darkMode } = useTheme();

  return (
    /* 1. 修改：去掉了 bg-slate-900 / bg-slate-50，使其背景透明 */
    /* 2. 修改：保留 transition-all 用于图标和文字颜色的平滑切换 */
    <div className={`flex flex-col transition-all duration-500`}>
      
      {/* 3. 修改：去掉了父组件可能传递的 overflow-hidden，允许内容撑开 */}
      {/* 4. 修改：去掉了可能存在的 relative/z-index 冲突，让父组件统一管理 */}
      <main className="flex-1 flex flex-col items-center justify-center">
        
        {/* 5. 修改：调整 px-4 为 p-6，给内部组件留出更多空间 */}
        <div className="relative z-10 text-center p-6 w-full max-w-md">
          {/* 维护图标 */}
          {/* 6. 修改：稍微调整了 darkMode 下的背景，使其在透明背景上更突出 */}
          <div className={`inline-flex p-4 rounded-2xl mb-8 ${
            darkMode ? 'bg-slate-800/80 text-blue-400' : 'bg-white/90 text-blue-600 shadow-xl'
          }`}>
            <Construction size={48} className="animate-pulse" />
          </div>

          <h1 className={`text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r ${
            darkMode ? 'from-blue-400 to-pink-400' : 'from-blue-600 to-pink-600'
          }`}>
            NJUPT Hub 
          </h1>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-widest mb-10 bg-clip-text text-transparent bg-gradient-to-r ${
            darkMode ? 'from-blue-400 to-pink-400' : 'from-blue-600 to-pink-600'
          }`}>
            正在维护
          </h1>

          <p className={`mx-auto text-lg mb-10 ${
            darkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            为了给你带来更好的体验，我们正在对后台进行技术维护。
          </p>

          <button 
            onClick={() => window.location.reload()}
            className={`flex items-center gap-2 mx-auto px-8 py-3 rounded-xl font-medium shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              darkMode ? 'bg-blue-500 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            <RefreshCw size={18} />
            刷新
          </button>
        </div>
      </main>

      {/* 2. 直接复用你的页脚组件 */}
      
    </div>
  );
}