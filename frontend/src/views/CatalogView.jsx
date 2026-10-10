import React, { useMemo, useState } from 'react';
import {Search, X} from 'lucide-react';
import {Sparkles, Layers} from '../components/AnimatedIcon';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loader, SectionHead } from '../components/ui';
import TemplateCard from '../components/TemplateCard';
import { SORTS, sortDesigns, filterDesigns, categoriesFrom } from '../lib/catalog';

export default function CatalogView({ onOpenDesign, onPreview, onNeedTelegram }) {
  const { designs, loading } = useStore();
  const { user } = useAuth();
  const [sort, setSort] = useState('latest');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => categoriesFrom(designs), [designs]);
  const visible = useMemo(
    () => sortDesigns(filterDesigns(designs, { category, search }), sort),
    [designs, category, search, sort]
  );

  // Telegram-only panel: bina Telegram account ke sirf "Open in Telegram" screen.
  const openDesign = (design) => {
    if (!user) { onNeedTelegram?.(); return; }
    onOpenDesign?.(design);
  };

  return (
    <>
      <SectionHead
        icon={Layers}
        title="Available Hacks"
        sub={`${designs.length} live hacks · image/video preview ke saath`}
      />

      <div className="search-wrap">
        <Search size={16} className="ico" />
        <input
          className="input"
          placeholder="Search hacks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="icon-btn"
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, background: 'transparent', boxShadow: 'none' }}
            onClick={() => setSearch('')}
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="pill-row">
        {categories.map((c) => (
          <button key={c.key} className={`pill ${category === c.key ? 'active' : ''}`} onClick={() => setCategory(c.key)}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="pill-row">
        {SORTS.map((s) => (
          <button key={s.key} className={`pill ${sort === s.key ? 'active' : ''}`} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loader label="Hacks load ho rahe hain…" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={search ? 'Kuch nahi mila' : 'Is category me hack nahi hai'}
          text={search ? `"${search}" se match karta hua koi hack nahi mila. Dusra keyword try karein.` : 'Doosri category select karein ya sab hacks dekhein.'}
          action={
            (search || category !== 'all') ? (
              <button className="btn btn-soft btn-sm" onClick={() => { setSearch(''); setCategory('all'); }}>
                Reset filters
              </button>
            ) : null
          }
        />
      ) : (
        <div className="tpl-grid">
          {visible.map((design, i) => (
            <TemplateCard key={design.id} design={design} index={i} onOpen={openDesign} onPreview={onPreview} />
          ))}
        </div>
      )}
    </>
  );
}
