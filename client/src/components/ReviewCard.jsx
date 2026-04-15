import React from 'react';
import StarRating from './StarRating';
import { MessageSquare, MapPin, School } from 'lucide-react';
import { getAvatarFallbackUrl } from '../utils/avatar';

export default function ReviewCard({ item, onClick, darkMode }) {
  const featuredReview = item.reviews?.[0];
  const isMentor = item.type === 'MENTOR';

  const formatStallLocation = (location) => {
    if (!location) return '';
    // e.g. "南一 - 1楼" -> "南一-1F"
    const m = String(location).trim().match(/^(.+?)\s*-\s*(\d+)\s*楼$/);
    if (m) return `${m[1]}-${m[2]}F`;
    return String(location).replace(/\s*-\s*/g, '-');
  };

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl border p-4 space-y-4 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg ${
        darkMode
          ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
          : 'bg-slate-100 border-slate-100 hover:border-blue-100 shadow-sm'
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

            {/* 标题下方信息行：档口显示地址，导师显示学院 */}
            {!isMentor && item.location && (
              <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <MapPin size={14} className={`${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                <span className="truncate">{formatStallLocation(item.location)}</span>
              </div>
            )}
            {isMentor && item.college && (
              <div className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <School size={14} className={`${darkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.college}</span>
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
          </p>
          <div className="mt-2 flex items-center gap-2">
            <img
              src={featuredReview.reviewer?.avatarUrl || getAvatarFallbackUrl(featuredReview.reviewer?.username, 24)}
              alt={featuredReview.reviewer?.username || '用户'}
              className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getAvatarFallbackUrl(featuredReview.reviewer?.username, 24);
              }}
            />
            <span className="text-[11px] opacity-70">— {featuredReview.reviewer?.username}</span>
          </div>
        </div>
      )}
    </div>
  );
}
