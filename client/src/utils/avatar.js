export const getAvatarInitial = (username) => {
  const text = String(username || '').trim();
  if (!text) return 'U';
  return Array.from(text)[0].toUpperCase();
};

const palette = [
  ['#2563EB', '#3B82F6'],
  ['#7C3AED', '#A855F7'],
  ['#0EA5E9', '#06B6D4'],
  ['#059669', '#10B981'],
  ['#D97706', '#F59E0B'],
  ['#DC2626', '#EF4444'],
];

const pickGradient = (seedText) => {
  const chars = Array.from(String(seedText || 'U'));
  const hash = chars.reduce((sum, ch) => sum + ch.codePointAt(0), 0);
  return palette[hash % palette.length];
};

export const getAvatarFallbackUrl = (username, size = 64) => {
  const initial = getAvatarInitial(username);
  const [startColor, endColor] = pickGradient(initial);
  const fontSize = Math.round(size * 0.45);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${startColor}" />
      <stop offset="100%" stop-color="${endColor}" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size / 2)}" fill="url(#g)" />
  <text x="50%" y="50%" dy=".1em" text-anchor="middle" dominant-baseline="middle"
        fill="#FFFFFF" font-family="system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei, sans-serif"
        font-size="${fontSize}" font-weight="700">${initial}</text>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

