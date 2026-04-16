import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const Footer = ({ darkMode }) => {
  const { themeMode, applyThemeMode } = useTheme();

  return (
    <footer className={`border-t pt-12 pb-24 md:pb-12 transition-colors duration-500 ${
      darkMode 
        ? 'bg-slate-900/80 border-slate-800 text-slate-400' 
        : 'bg-slate-100/80 border-slate-200 text-slate-500'
    } backdrop-blur-xl`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* 左侧：作者与品牌 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                H
              </div>
              <span className={`text-xl font-bold tracking-tight ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                NJUPT Hub
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              由 <span className="font-semibold text-blue-500">Sugar</span> 开发维护。
              本项目旨在整合校园优质资料，提供给同学们学习参考。欢迎上传共享！
            </p>



            <div className="text-xs opacity-60 uppercase tracking-widest flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>© 2025 - 2026 NJUPT HUB.</span>
              <span className="opacity-50">|</span>
              <span className="normal-case tracking-normal opacity-80">友情链接</span>
              <a
                href="https://github.com/NJUPTFreeExams"
                target="_blank"
                rel="noreferrer"
                className={`normal-case tracking-normal hover:underline underline-offset-4 transition-colors ${
                  darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                NJUPTFreeExams
              </a>
              <a
                href="https://njupt-navi.github.io/"
                target="_blank"
                rel="noreferrer"
                className={`normal-case tracking-normal hover:underline underline-offset-4 transition-colors ${
                  darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                NJUPT NAVI
              </a>
              
            </div>

            {/* Theme mode tabs */}
            <div className={`inline-flex items-center gap-1 p-1 rounded-2xl border ${
              darkMode ? 'border-slate-700 bg-slate-900/30' : 'border-slate-200 bg-white/60'
            }`}>
              <button
                type="button"
                onClick={() => applyThemeMode('light')}
                className={`p-2 rounded-xl transition-all ${
                  themeMode === 'light'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={themeMode === 'light'}
                title="浅色"
              >
                <Sun size={16} />
              </button>
              <button
                type="button"
                onClick={() => applyThemeMode('dark')}
                className={`p-2 rounded-xl transition-all ${
                  themeMode === 'dark'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={themeMode === 'dark'}
                title="深色"
              >
                <Moon size={16} />
              </button>
              <button
                type="button"
                onClick={() => applyThemeMode('system')}
                className={`p-2 rounded-xl transition-all ${
                  themeMode === 'system'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : darkMode ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-50'
                }`}
                aria-pressed={themeMode === 'system'}
                title="跟随系统"
              >
                <Monitor size={16} />
              </button>
            </div>            
          </div>


          {/* 右侧：免责声明 */}
          <div className={`p-5 rounded-2xl border ${
            darkMode ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className={`text-xs font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              免责声明 / Disclaimer
            </h4>
            <div className={`text-[11px] leading-6 text-justify space-y-2 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              <p>1. 本站资源均由用户分享或收集自网络，版权归原作者所有，仅供学习研究使用。</p>
              <p>2. 资料不代表本站观点，本站不保证内容的准确性及完整性，不承担任何法律责任。</p>
              <p>3. 严禁将本站资料用于任何形式的商业用途。若有侵权请联系作者删除。</p>
              <p>4. 本站使用 <a href="https://umami.is/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Umami</a> 进行网站统计。</p>‘
              <p>5. 本站与【南京邮电大学】及其下属组织无任何关联！</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;