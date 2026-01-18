import React from 'react';

const Footer = ({ darkMode }) => {
  return (
    <footer className={`border-t py-12 transition-colors duration-500 ${
      darkMode 
        ? 'bg-slate-900 border-slate-800 text-slate-400' 
        : 'bg-white/50 border-slate-200 text-slate-500'
    } backdrop-blur-md`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* 左侧：作者与品牌 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                N
              </div>
              <span className={`text-xl font-bold tracking-tight ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                NJUPT Notes
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-sm">
              由 <span className="font-semibold text-blue-500">Sugar</span> 开发维护。
              本项目旨在整合校园优质资料，所有资源均免费提供给同学们学习参考。欢迎上传共享！
            </p>
            <p className="text-xs opacity-60 uppercase tracking-widest">
              © 2025 - 2026 NJUPT NOTES.
            </p>
            <p className="text-xs opacity-60 uppercase tracking-widest">
              Powered By Vercel.
            </p>
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
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;