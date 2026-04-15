export const getAvatarInitial = (username) => {
  const text = String(username || '').trim();
  if (!text) return 'U';
  return text[0].toUpperCase();
};

export const getAvatarFallbackUrl = (username, size = 64) => {
  const initial = getAvatarInitial(username);
  return `https://placehold.co/${size}x${size}?text=${encodeURIComponent(initial)}`;
};

