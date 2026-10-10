export function getMediaUrl(url) {
  if (!url) return '';
  const s = String(url).trim();
  if (!s) return '';
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
  if (s.startsWith('/api/files/')) return s;
  // Strip any leading slashes, "uploads/" or "api/files/" prefixes
  const cleaned = s.replace(/^\/?(uploads\/|api\/files\/)+/, '');
  return `/api/files/${encodeURIComponent(cleaned)}`;
}
