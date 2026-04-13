import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';

export default function StarRating({ rating, onRatingChange, interactive = false, size = 20 }) {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = hoverRating || rating;

  const handleClick = (e, index) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    const newRating = index + (isHalf ? 0.5 : 1);
    onRatingChange?.(newRating);
  };

  const handleMouseMove = (e, index) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isHalf = x < rect.width / 2;
    setHoverRating(index + (isHalf ? 0.5 : 1));
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  return (
    <div className="flex items-center" onMouseLeave={handleMouseLeave}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fullStar = displayRating >= index + 1;
        const halfStar = !fullStar && displayRating >= index + 0.5;

        return (
          <div
            key={index}
            className={`relative cursor-${interactive ? 'pointer' : 'default'}`}
            onClick={(e) => handleClick(e, index)}
            onMouseMove={(e) => handleMouseMove(e, index)}
          >
            <Star
              size={size}
              className={`${
                fullStar ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'
              } transition-colors`}
            />
            {halfStar && (
              <div className="absolute inset-0 overflow-hidden w-[50%]">
                <StarHalf size={size} className="fill-yellow-400 text-yellow-400" />
              </div>
            )}
          </div>
        );
      })}
      {interactive && displayRating > 0 && (
        <span className="ml-2 text-sm font-medium text-slate-500">{displayRating.toFixed(1)}</span>
      )}
    </div>
  );
}
