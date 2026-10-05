import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers, Save, Trash2, RefreshCw, Plus, Upload, ImageIcon, X, Flame
} from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, EmptyState, Notice, Sheet } from '../../components/ui';
import { admin, fmtDate } from '../../lib/api';
import { getMediaUrl } from '../../utils/media';

const CATEGORIES = [
  { key: 'zayro', label: 'Standard (Zayro)' },
  { key: 'dhani', label: 'Dhani Win' },
  { key: 'premium', label: 'VIP / Premium' }
];

const BLANK_CREATE = {
  name: '', description: '', price_coins: '', original_price_coins: '',
  fake_price_coins: '5', category: 'zayro'
};

/** Templates — list, price/category edit, delete aur naya design create (popup HTML ke saath). */
export default function TemplatesTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(BLANK_CREATE);
  const [popupHtml, setPopupHtml] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.designs();
      const list = Array.isArray(data) ? data : (data?.designs || []);
      setRows(list);
      setDraft({});
    } catch (err) {
      addToast(err.message || 'Templates load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
    [rows]
  );

  const save = async (row) => {
    const patch = draft[row.id] || {};
    if (!Object.keys(patch).length) { addToast('Pehle kuch badlein', 'error'); return; }
    await act(async () => {
      await admin.updateDesign(row.id, patch);
      await load();
    }, `${row.name} update ho gaya`);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!create.name.trim() || !create.price_coins) { addToast('Name aur price zaroori hai', 'error'); return; }
    if (!popupHtml) { addToast('Popup HTML file zaroori hai (server isi se app banata hai)', 'error'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(create).forEach(([k, v]) => fd.append(k, String(v)));
      if (popupHtml) fd.append('popup_html', popupHtml);
      if (previewImage) fd.append('preview_image', previewImage);
      await admin.createDesign(fd);
      addToast('Naya template publish ho gaya', 'success');
      setCreate(BLANK_CREATE);
      setPopupHtml(null);
      setPreviewImage(null);
      setCreateOpen(false);
      await load();
    } catch (err) {
      addToast(err.message || 'Template create nahi hua', 'error');
    } finally { setBusy(false); }
  };

  if (loading) return <Loader label="Templates load ho rahe hain…" />;

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title">
          <Layers size={15} style={{ verticalAlign: -2 }} /> Templates ({rows.length})
        </div>
        <div className="flex-row gap-8">
          <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary btn-xs" onClick={() => setCreateOpen(true)}><Plus size={13} /> New template</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Layers} title="Koi template nahi" text="Naya template add karein — panel me turant live ho jaayega." />
      ) : (
        <div className="admin-table">
          {sorted.map((row) => {
            const d = draft[row.id] || {};
            return (
              <article className="card card-pad stack gap-10" key={row.id}>
                <div className="flex-row gap-10" style={{ alignItems: 'flex-start' }}>
                  <span className="row-ico" style={{ width: 46, height: 46, borderRadius: 14, overflow: 'hidden', padding: 0 }}>
                    {row.preview_image
                      ? <img src={getMediaUrl(row.preview_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Layers size={18} />}
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="flex-row gap-8 wrap">
                      <strong style={{ fontSize: 14, fontWeight: 800 }}>{row.name}</strong>
                      <span className="chip chip-brand">{CATEGORIES.find((c) => c.key === row.category)?.label || row.category || 'Standard'}</span>
                      {row.orders_count > 0 && <span className="chip chip-gold">{row.orders_count} builds</span>}
                    </div>
                    <div className="admin-row-meta" style={{ marginTop: 3 }}>
                      <span>#{row.id}</span>
                      <span>·</span>
                      <span>{row.price_coins} coins</span>
                      {row.original_price_coins > 0 && <><span>·</span><span>was {row.original_price_coins}</span></>}
                      <span>·</span>
                      <span>fake {row.fake_price_coins} coins</span>
                    </div>
                    {row.description && <div className="row-sub truncate" style={{ marginTop: 4 }}>{row.description}</div>}
                  </div>
                </div>

                <div className="flex-row gap-8 wrap">
                  <div className="field grow" style={{ minWidth: 96 }}>
                    <span className="label">Price</span>
                    <input
                      className="input" inputMode="numeric"
                      defaultValue={row.price_coins}
                      onChange={(e) => setDraft((p) => ({ ...p, [row.id]: { ...p[row.id], price_coins: parseInt(e.target.value, 10) || 0 } }))}
                    />
                  </div>
                  <div className="field grow" style={{ minWidth: 96 }}>
                    <span className="label">Old price</span>
                    <input
                      className="input" inputMode="numeric"
                      defaultValue={row.original_price_coins || 0}
                      onChange={(e) => setDraft((p) => ({ ...p, [row.id]: { ...p[row.id], original_price_coins: parseInt(e.target.value, 10) || 0 } }))}
                    />
                  </div>
                  <div className="field grow" style={{ minWidth: 96 }}>
                    <span className="label">Fake price</span>
                    <input
                      className="input" inputMode="numeric"
                      defaultValue={row.fake_price_coins || 0}
                      onChange={(e) => setDraft((p) => ({ ...p, [row.id]: { ...p[row.id], fake_price_coins: parseInt(e.target.value, 10) || 0 } }))}
                    />
                  </div>
                  <div className="field grow" style={{ minWidth: 140 }}>
                    <span className="label">Category</span>
                    <select
                      className="input"
                      defaultValue={row.category || 'zayro'}
                      onChange={(e) => setDraft((p) => ({ ...p, [row.id]: { ...p[row.id], category: e.target.value } }))}
                    >
                      {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="admin-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => save(row)} disabled={!d[row.id]}>
                    <Save size={13} /> Save
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => act(async () => {
                      await admin.deleteDesign(row.id);
                      await load();
                    }, `${row.name} delete ho gaya`)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Notice tone="warn">
        Category ka naam panel me card par nahi dikhta (sirf filter me aata hai). Discount tab dikhta hai
        jab Old price &gt; Price ho.
      </Notice>

      {/* ── Naya template ── */}
      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        icon={Plus}
        title="New template"
        subtitle="Popup HTML file server ke templates/ folder me chali jaati hai"
        wide
      >
        <form className="stack gap-12" onSubmit={submitCreate}>
          <div className="field">
            <span className="label">Name *</span>
            <input className="input" value={create.name} maxLength={40}
              onChange={(e) => setCreate((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. MAAN WIN APEX" />
          </div>
          <div className="field">
            <span className="label">Description</span>
            <input className="input" value={create.description} maxLength={120}
              onChange={(e) => setCreate((c) => ({ ...c, description: e.target.value }))} placeholder="Short line jo card par dikhegi" />
          </div>
          <div className="flex-row gap-8 wrap">
            <div className="field grow" style={{ minWidth: 100 }}>
              <span className="label">Price *</span>
              <input className="input" inputMode="numeric" value={create.price_coins}
                onChange={(e) => setCreate((c) => ({ ...c, price_coins: e.target.value }))} placeholder="120" />
            </div>
            <div className="field grow" style={{ minWidth: 100 }}>
              <span className="label">Old price</span>
              <input className="input" inputMode="numeric" value={create.original_price_coins}
                onChange={(e) => setCreate((c) => ({ ...c, original_price_coins: e.target.value }))} placeholder="200" />
            </div>
            <div className="field grow" style={{ minWidth: 100 }}>
              <span className="label">Fake price</span>
              <input className="input" inputMode="numeric" value={create.fake_price_coins}
                onChange={(e) => setCreate((c) => ({ ...c, fake_price_coins: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <span className="label">Category</span>
            <select className="input" value={create.category}
              onChange={(e) => setCreate((c) => ({ ...c, category: e.target.value }))}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex-row gap-10 wrap">
            <label className="icon-drop grow" style={{ minWidth: 150 }}>
              <input type="file" hidden accept=".html,.htm,text/html" onChange={(e) => setPopupHtml(e.target.files?.[0] || null)} />
              {popupHtml
                ? <><X size={16} /><b className="truncate">{popupHtml.name}</b><span>Popup HTML</span></>
                : <><Upload size={18} /><b>Popup HTML *</b><span>.html file</span></>}
            </label>
            <label className={`icon-drop grow${previewImage ? ' has-img' : ''}`} style={{ minWidth: 150 }}>
              <input type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => setPreviewImage(e.target.files?.[0] || null)} />
              {previewImage
                ? <img src={URL.createObjectURL(previewImage)} alt="" />
                : <><ImageIcon size={18} /><b>Preview image</b><span>PNG / JPG</span></>}
            </label>
          </div>
          <div className="sheet-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary grow" disabled={busy}>
              {busy ? 'Publishing…' : <><Flame size={14} /> Publish template</>}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
