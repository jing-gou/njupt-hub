import React from 'react';
import StarRating from './StarRating';
import { MessageSquare, MapPin, GraduationCap } from 'lucide-react';

export default function ReviewCard({ item, onClick, darkMode }) {
  const featuredReview = item.reviews?.[0];

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl border p-4 space-y-4 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
          : 'bg-white border-slate-100 hover:border-blue-100 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 ${item.type === 'MENTOR' ? 'rounded-full' : ''}`}>
            <img
              src={item.imageUrl || 'https://placehold.co/100x100?text=Item'}
              alt={item.title}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/100x100?text=Error';
              }}
            />
          </div>
          <div className="space-y-1">
            <h3 className={`font-bold text-lg ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {item.title}
            </h3>
            
            {/* 新增字段显示 */}
            {(item.location || item.college) && (
              <div className="flex flex-wrap gap-2 mb-1">
                {item.location && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    <MapPin size={10} />
                    {item.location}
                  </span>
                )}
                {item.college && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    darkMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-purple-50 text-purple-600 border border-purple-100'
                  }`}>
                    <GraduationCap size={10} />
                    {item.college}
                  </span>
                )}
              </div>
            )}

            <p className={`text-sm line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {item.description}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 pt-1">
          <StarRating rating={item.avgRating || 0} size={16} />
        </div>
      </div>

      {featuredReview && (
        <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-700' : 'border-slate-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1 rounded bg-blue-500/10 text-blue-500`}>
              <MessageSquare size={12} />
            </div>
            <span className={`text-xs font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              精选评价
            </span>
          </div>
          <p className={`text-xs italic line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            "{featuredReview.comment}"
            <span className="ml-1 opacity-60">— {featuredReview.reviewer?.username}</span>
          </p>
        </div>
      )}
    </div>
  );
}
