/** Catalog sorting/filters — Home aur Templates tab dono yahi use karte hain. */

export const SORTS = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
  { key: 'high', label: 'Price: High' },
  { key: 'low', label: 'Price: Low' }
];

export const CATEGORIES = [
  { key: 'all', label: 'All Templates' },
  { key: 'zayro', label: 'Zayro Core' },
  { key: 'dhani', label: 'Dhani Win' },
  { key: 'premium', label: 'VIP / Premium' }
];

const price = (d) => Number(d?.price_coins || 0);
const popularity = (d) => Number(d?.orders_count || 0);

export function sortDesigns(list, mode = 'latest') {
  const items = [...(list || [])];
  switch (mode) {
    case 'high': return items.sort((a, b) => price(b) - price(a));
    case 'low': return items.sort((a, b) => price(a) - price(b));
    case 'popular': return items.sort((a, b) => popularity(b) - popularity(a) || price(b) - price(a));
    case 'latest':
    default: return items.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }
}

export function filterDesigns(list, { category = 'all', search = '' } = {}) {
  const q = String(search || '').trim().toLowerCase();
  return (list || []).filter((d) => {
    const cat = String(d.category || 'zayro').toLowerCase();
    if (category !== 'all' && cat !== category) return false;
    if (!q) return true;
    return (
      String(d.name || '').toLowerCase().includes(q) ||
      String(d.description || '').toLowerCase().includes(q)
    );
  });
}

export function categoriesFrom(designs) {
  const present = new Set((designs || []).map((d) => String(d.category || 'zayro').toLowerCase()));
  return CATEGORIES.filter((c) => c.key === 'all' || present.has(c.key));
}
