import {Layers, RefreshCw} from '../../components/AnimatedIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {Save, Trash2, Plus, Upload, ImageIcon, X, Flame, Pencil, Wrench, EyeOff, Eye, Video, Images, FileCode, CircleCheck, Hammer} from 'lucide-react';
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
  name: '', description: '', price_coins: '', original_price_coins: '', fake_price_coins: '5',
  category: 'zayro', active: true, maintenance: false
};

/** Store panel par kitne builds hue — chhota sa badge. */
function BuildsChip({ n }) {
  if (!Number(n)) return null;
  return <span className="chip chip-gold">{n} builds</span>;
}

/** Template ki live state: Active / Maintenance / Hidden. */
function StatusChips({ hidden, maintenance }) {
  return (
    <>
      {hidden && <span className="chip chip-danger"><EyeOff size={11} /> Hidden</span>}
      {maintenance && <span className="chip chip-warn"><Wrench size={11} /> Maintenance</span>}
      {!hidden && !maintenance && <span className="chip chip-ok"><CircleCheck size={11} /> Active</span>}
    </>
  );
}

/** Preview media (image / video / gallery count) ka chhota summary. */
function MediaChips({ row }) {
  return (
    <>
      {row.preview_video && <span className="tpl-file-chip"><Video size={12} /> Video</span>}
      {(row.preview_images || []).length > 0 && (
        <span className="tpl-file-chip"><Images size={12} /> {(row.preview_images || []).length} photos</span>
      )}
      {row.fake_popup_html_file && <span className="tpl-file-chip"><FileCode size={12} /> Fake HTML</span>}
      {row.popup_html_file && <span className="tpl-file-chip"><FileCode size={12} /> Popup HTML</span>}
    </>
  );
}

/** File picker — ek tap me file chuno, naam dikh jaata hai. `multiple` = kai photos. */
function FileDrop({ label, hint, accept, file, onPick, kind = 'image', multiple = false }) {
  const Icon = kind === 'video' ? Video : kind === 'images' ? Images : kind === 'code' ? FileCode : ImageIcon;
  const count = multiple && file ? file.length : 0;
  const name = multiple ? (count ? `${count} photos chuni gayi` : '') : (file?.name || '');
  return (
    <label className={`icon-drop grow${file && kind === 'image' && !multiple ? ' has-img' : ''}${file ? ' has-file' : ''}`} style={{ minWidth: 140 }}>
      <input
        type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => onPick(multiple ? Array.from(e.target.files || []) : (e.target.files?.[0] || null))}
      />
      {file && kind === 'image' && !multiple
        ? <img src={URL.createObjectURL(file)} alt="" />
        : file
          ? <><X size={15} /><b className="truncate">{name.slice(0, 26)}</b><span>{label}</span></>
          : <><Icon size={17} /><b>{label}</b>{hint && <span>{hint}</span>}</>}
    </label>
  );
}

/* ─────────────────────────────  Naya template sheet  ───────────────────────────── */

function CreateSheet({ open, onClose, onCreated }) {
  const { addToast } = useToast();
  const [create, setCreate] = useState(BLANK_CREATE);
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [existingHtml, setExistingHtml] = useState([]);
  const [pickExisting, setPickExisting] = useState('');

  const setFile = (key, file) => setFiles((f) => ({ ...f, [key]: file }));
  const set = (key, val) => setCreate((c) => ({ ...c, [key]: val }));

  // Purani popup HTML files bhi choose kar sako — naya template bina file upload kiye.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await admin.designs();
        const list = Array.isArray(data) ? data : (data?.designs || []);
        setExistingHtml([...new Set(list.map((d) => d.popup_html_file).filter(Boolean))]);
      } catch (_) { /* ignore — optional helper hai */ }
    })();
  }, [open]);

  const reset = () => {
    setCreate(BLANK_CREATE);
    setFiles({});
    setPickExisting('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!create.name.trim() || !create.price_coins) { addToast('Name aur price zaroori hai', 'error'); return; }
    if (!files.popup_html && !pickExisting) {
      addToast('Popup HTML chuno — file upload karein ya list se select karein', 'error'); return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', create.name.trim());
      fd.append('description', create.description || '');
      fd.append('price_coins', String(create.price_coins));
      fd.append('original_price_coins', String(create.original_price_coins || 0));
      fd.append('fake_price_coins', String(create.fake_price_coins || 5));
      fd.append('category', create.category);
      fd.append('active', create.active ? '1' : '0');
      fd.append('maintenance', create.maintenance ? '1' : '0');
      if (files.popup_html) fd.append('popup_html', files.popup_html);
      else fd.append('popup_html_file', pickExisting);
      if (files.fake_popup_html) fd.append('fake_popup_html', files.fake_popup_html);
      if (files.preview_image) fd.append('preview_image', files.preview_image);
      if (files.preview_video) fd.append('preview_video', files.preview_video);
      const gallery = files.preview_images;
      if (gallery) {
        const list = Array.from(gallery).slice(0, 12);
        for (const f of list) fd.append('preview_images', f);
      }
      await admin.createDesign(fd);
      addToast('Naya template publish ho gaya', 'success');
      reset();
      onCreated();
      onClose();
    } catch (err) {
      addToast(err.message || 'Template create nahi hua', 'error');
    } finally { setBusy(false); }
  };

  return (
    <Sheet
      open={open}
      onClose={() => { reset(); onClose(); }}
      icon={Plus}
      title="New template"
      subtitle="Popup HTML zaroori hai — fake HTML, preview image, video aur photos optional"
      wide
    >
      <form className="stack gap-12" onSubmit={submit}>
        <div className="field">
          <span className="label">Name *</span>
          <input className="input" value={create.name} maxLength={40}
            onChange={(e) => set('name', e.target.value)} placeholder="e.g. MAAN WIN APEX" />
        </div>
        <div className="field">
          <span className="label">Description</span>
          <input className="input" value={create.description} maxLength={120}
            onChange={(e) => set('description', e.target.value)} placeholder="Short line jo card par dikhegi" />
        </div>

        <div className="flex-row gap-8 wrap">
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Price *</span>
            <input className="input" inputMode="numeric" value={create.price_coins}
              onChange={(e) => set('price_coins', e.target.value)} placeholder="120" />
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Old price</span>
            <input className="input" inputMode="numeric" value={create.original_price_coins}
              onChange={(e) => set('original_price_coins', e.target.value)} placeholder="200" />
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Fake price</span>
            <input className="input" inputMode="numeric" value={create.fake_price_coins}
              onChange={(e) => set('fake_price_coins', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="label">Category</span>
          <select className="input" value={create.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {/* ── Popup HTML (asli + fake) ── */}
        <div className="stack gap-8">
          <span className="label" style={{ marginBottom: 0 }}>Popup HTML</span>
          <div className="flex-row gap-10 wrap">
            <FileDrop kind="code" label="Real popup HTML *" hint=".html file" accept=".html,.htm,text/html"
              file={files.popup_html} onPick={(f) => { setFile('popup_html', f); if (f) setPickExisting(''); }} />
            <FileDrop kind="code" label="Fake popup HTML" hint="fake APK ke liye (optional)" accept=".html,.htm,text/html"
              file={files.fake_popup_html} onPick={(f) => setFile('fake_popup_html', f)} />
          </div>
          {existingHtml.length > 0 && !files.popup_html && (
            <div className="field">
              <span className="label">…ya pehle se uploaded HTML use karein</span>
              <select className="input" value={pickExisting} onChange={(e) => setPickExisting(e.target.value)}>
                <option value="">— koi purani file nahi —</option>
                {existingHtml.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Preview media ── */}
        <div className="stack gap-8">
          <span className="label" style={{ marginBottom: 0 }}>Preview media</span>
          <div className="flex-row gap-10 wrap">
            <FileDrop kind="image" label="Cover image" hint="PNG / JPG" accept="image/png,image/jpeg,image/webp"
              file={files.preview_image} onPick={(f) => setFile('preview_image', f)} />
            <FileDrop kind="video" label="Preview video" hint="MP4 (optional)" accept="video/mp4,video/webm"
              file={files.preview_video} onPick={(f) => setFile('preview_video', f)} />
            <FileDrop kind="images" label="Photos" hint="ek saath kai chuno (max 12)" multiple accept="image/png,image/jpeg,image/webp"
              file={files.preview_images} onPick={(list) => setFile('preview_images', list)} />
          </div>
        </div>

        {/* ── Visibility ── */}
        <div className="admin-toggle-row">
          <button type="button" className={`admin-switch${create.active ? ' on' : ''}`} onClick={() => set('active', !create.active)}>
            <span className="knob" /> {create.active ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <div className="grow">
            <div className="row-title">{create.active ? 'Store par visible' : 'Hidden (store par nahi dikhega)'}</div>
            <div className="row-sub">Hidden template sirf admin list me rehta hai — users ko nahi dikhta.</div>
          </div>
        </div>

        <div className="admin-toggle-row">
          <button type="button" className={`admin-switch warn${create.maintenance ? ' on' : ''}`} onClick={() => set('maintenance', !create.maintenance)}>
            <span className="knob" /> <Wrench size={13} />
          </button>
          <div className="grow">
            <div className="row-title">{create.maintenance ? 'Maintenance me' : 'Maintenance nahi'}</div>
            <div className="row-sub">Maintenance me template store par dikhta hai par naya build block ho jaata hai.</div>
          </div>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={() => { reset(); onClose(); }}>Cancel</button>
          <button type="submit" className="btn btn-primary grow" disabled={busy}>
            {busy ? 'Publishing…' : <><Flame size={14} /> Publish template</>}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ─────────────────────────────  Edit sheet  ───────────────────────────── */

function EditSheet({ row, act, onClose, onSaved }) {
  const { addToast } = useToast();
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const initial = useRef(null);

  useEffect(() => {
    if (!row) { setForm(null); return; }
    const base = {
      name: row.name || '',
      description: row.description || '',
      price_coins: String(row.price_coins ?? ''),
      original_price_coins: String(row.original_price_coins ?? ''),
      fake_price_coins: String(row.fake_price_coins ?? 5),
      category: row.category || 'zayro',
      active: Number(row.active ?? 1) === 1,
      maintenance: Number(row.maintenance || 0) === 1
    };
    setForm(base);
    initial.current = base;
    setFiles({});
  }, [row]);

  if (!row || !form) return null;

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setFile = (key, file) => setFiles((f) => ({ ...f, [key]: file }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial.current) || Object.values(files).some(Boolean);

  const save = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) { addToast('Naam khali nahi ho sakta', 'error'); return; }
    setBusy(true);
    try {
      await act(async () => {
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('description', form.description || '');
        fd.append('price_coins', String(parseInt(form.price_coins, 10) || 0));
        fd.append('original_price_coins', String(parseInt(form.original_price_coins, 10) || 0));
        fd.append('fake_price_coins', String(parseInt(form.fake_price_coins, 10) || 0));
        fd.append('category', form.category);
        fd.append('hidden', form.active ? '0' : '1');
        fd.append('maintenance', form.maintenance ? '1' : '0');
        if (files.popup_html) fd.append('popup_html', files.popup_html);
        if (files.fake_popup_html) fd.append('fake_popup_html', files.fake_popup_html);
        if (files.preview_image) fd.append('preview_image', files.preview_image);
        if (files.preview_video) fd.append('preview_video', files.preview_video);
        if (files.preview_images?.length) {
          for (const f of Array.from(files.preview_images).slice(0, 12)) fd.append('preview_images', f);
        }
        await admin.saveDesign(row.id, fd);
        await onSaved();
      }, `${form.name} save ho gaya`);
      onClose();
    } catch (_) { /* act toast dikha deta hai */ }
    finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={onClose} icon={Pencil} title={`Edit · ${row.name}`} subtitle={`Template #${row.id}`} wide>
      <form className="stack gap-12" onSubmit={save}>
        <div className="field">
          <span className="label">Name *</span>
          <input className="input" value={form.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Description</span>
          <input className="input" value={form.description} maxLength={120} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="flex-row gap-8 wrap">
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Price</span>
            <input className="input" inputMode="numeric" value={form.price_coins} onChange={(e) => set('price_coins', e.target.value)} />
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Old price</span>
            <input className="input" inputMode="numeric" value={form.original_price_coins} onChange={(e) => set('original_price_coins', e.target.value)} />
          </div>
          <div className="field grow" style={{ minWidth: 96 }}>
            <span className="label">Fake price</span>
            <input className="input" inputMode="numeric" value={form.fake_price_coins} onChange={(e) => set('fake_price_coins', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="label">Category</span>
          <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <div className="admin-toggle-row">
          <button type="button" className={`admin-switch${form.active ? ' on' : ''}`} onClick={() => set('active', !form.active)}>
            <span className="knob" /> {form.active ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <div className="grow">
            <div className="row-title">{form.active ? 'Store par visible' : 'Hidden'}</div>
            <div className="row-sub">Hidden karne par users ko ye template dikhna band ho jaata hai.</div>
          </div>
        </div>

        <div className="admin-toggle-row">
          <button type="button" className={`admin-switch warn${form.maintenance ? ' on' : ''}`} onClick={() => set('maintenance', !form.maintenance)}>
            <span className="knob" /> <Wrench size={13} />
          </button>
          <div className="grow">
            <div className="row-title">{form.maintenance ? 'Maintenance me' : 'Maintenance nahi'}</div>
            <div className="row-sub">Maintenance me naya build block, par template store par dikhta rahega.</div>
          </div>
        </div>

        {/* ── Files (sirf tab badalte hain jab nayi file chuno) ── */}
        <div className="stack gap-8">
          <span className="label" style={{ marginBottom: 0 }}>Files badlein (optional)</span>
          <div className="flex-row gap-10 wrap">
            <FileDrop kind="code" label="Real popup HTML" hint="abhi: set hai" accept=".html,.htm,text/html"
              file={files.popup_html} onPick={(f) => setFile('popup_html', f)} />
            <FileDrop kind="code" label="Fake popup HTML" hint={row.fake_popup_html_file ? 'abhi: set hai' : 'abhi set nahi'} accept=".html,.htm,text/html"
              file={files.fake_popup_html} onPick={(f) => setFile('fake_popup_html', f)} />
          </div>
          <div className="flex-row gap-10 wrap">
            <FileDrop kind="image" label="Cover image" hint="PNG / JPG" accept="image/png,image/jpeg,image/webp"
              file={files.preview_image} onPick={(f) => setFile('preview_image', f)} />
            <FileDrop kind="video" label="Preview video" hint={row.preview_video ? 'abhi: set hai' : 'MP4'} accept="video/mp4,video/webm"
              file={files.preview_video} onPick={(f) => setFile('preview_video', f)} />
            <FileDrop kind="images" label="Photos badlein" hint="ek saath kai chuno" multiple accept="image/png,image/jpeg,image/webp"
              file={files.preview_images} onPick={(list) => setFile('preview_images', list)} />
          </div>
        </div>

        <div className="sheet-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary grow" disabled={busy || !dirty}>
            {busy ? 'Saving…' : <><Save size={14} /> Save changes</>}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/* ─────────────────────────────  Main tab  ───────────────────────────── */

/** Templates — list, Edit button (poora form), filters aur maintenance control. */
export default function TemplatesTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.designs();
      setRows(Array.isArray(data) ? data : (data?.designs || []));
    } catch (err) {
      addToast(err.message || 'Templates load nahi hue', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
    [rows]
  );

  const hiddenCount = rows.filter((r) => Number(r.active ?? 1) === 0).length;
  const maintCount = rows.filter((r) => Number(r.maintenance || 0) === 1).length;
  const activeCount = rows.length - hiddenCount - rows.filter((r) => Number(r.active ?? 1) === 1 && Number(r.maintenance || 0) === 1).length;

  const visible = useMemo(() => {
    let list = sorted;
    if (filter === 'active') list = list.filter((r) => Number(r.active ?? 1) === 1 && Number(r.maintenance || 0) === 0);
    else if (filter === 'maintenance') list = list.filter((r) => Number(r.maintenance || 0) === 1);
    else if (filter === 'hidden') list = list.filter((r) => Number(r.active ?? 1) === 0);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((r) => `${r.name} ${r.id} ${r.description || ''}`.toLowerCase().includes(q));
    return list;
  }, [sorted, filter, query]);

  const FILTERS = [
    { key: 'all', label: 'All', count: rows.length, icon: Layers },
    { key: 'active', label: 'Active', count: activeCount, icon: CircleCheck },
    { key: 'maintenance', label: 'Maintenance', count: maintCount, icon: Wrench },
    { key: 'hidden', label: 'Hidden', count: hiddenCount, icon: EyeOff }
  ];

  const quickMaintenance = (row) => act(async () => {
    const next = Number(row.maintenance || 0) === 1 ? 0 : 1;
    await admin.updateDesign(row.id, { maintenance: next });
    await load();
  }, Number(row.maintenance || 0) === 1 ? `${row.name} maintenance se hata` : `${row.name} maintenance me daal diya`);

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

      {/* Filters — All / Active / Maintenance / Hidden */}
      <div className="admin-pill-grid">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.key}
              className={`pill${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              <Icon size={12} /> {f.label} · {f.count}
            </button>
          );
        })}
      </div>

      <input
        className="input"
        placeholder="🔍 Template ka naam ya #id search karein"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={rows.length === 0 ? 'Koi template nahi' : 'Is filter me kuch nahi'}
          text={rows.length === 0 ? 'Naya template add karein — panel me turant live ho jaayega.' : 'Filter badal kar dekhein.'}
        />
      ) : (
        <div className="admin-table">
          {visible.map((row) => {
            const hidden = Number(row.active ?? 1) === 0;
            const maint = Number(row.maintenance || 0) === 1;
            return (
              <article className={`card card-pad stack gap-10${hidden ? ' is-hidden' : ''}`} key={row.id}>
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
                      <StatusChips hidden={hidden} maintenance={maint} />
                      <BuildsChip n={row.orders_count} />
                    </div>
                    <div className="admin-row-meta" style={{ marginTop: 3 }}>
                      <span>#{row.id}</span>
                      <span>·</span>
                      <span><b className="gold">₹{row.price_coins}</b></span>
                      {row.original_price_coins > 0 && <><span>·</span><span>was {row.original_price_coins}</span></>}
                      <span>·</span>
                      <span>fake ₹{row.fake_price_coins}</span>
                      <span>·</span>
                      <span>{fmtDate(row.created_at)}</span>
                    </div>
                    {row.description && <div className="row-sub truncate" style={{ marginTop: 4 }}>{row.description}</div>}
                    <div className="tpl-file-row"><MediaChips row={row} /></div>
                  </div>
                </div>

                {/* Poora detail edit sheet me — yahan sirf quick actions */}
                <div className="admin-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setEditing(row)}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    className={`btn btn-sm ${maint ? 'btn-soft' : 'btn-ghost'}`}
                    onClick={() => quickMaintenance(row)}
                    title={maint ? 'Maintenance se hatao' : 'Maintenance me daalo'}
                  >
                    <Wrench size={13} /> {maint ? 'Remove maintenance' : 'Maintenance'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => act(async () => {
                      await admin.updateDesign(row.id, { hidden: hidden ? 0 : 1 });
                      await load();
                    }, hidden ? `${row.name} ab store par dikhega` : `${row.name} hide ho gaya`)}
                  >
                    {hidden ? <><Eye size={13} /> Show</> : <><EyeOff size={13} /> Hide</>}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm danger"
                    onClick={() => {
                      if (!window.confirm(`${row.name} (template #${row.id}) delete karna hai? Ye wapas nahi aayega.`)) return;
                      act(async () => { await admin.deleteDesign(row.id); await load(); }, `${row.name} delete ho gaya`);
                    }}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Notice tone="info">
        <Hammer size={13} style={{ verticalAlign: -2 }} /> <b>Maintenance</b> me template store par dikhta hai par users naya
        build nahi kar sakte. <b>Hide</b> karne par store par dikhna hi band ho jaata hai.
      </Notice>

      {createOpen && (
        <CreateSheet open onClose={() => setCreateOpen(false)} onCreated={load} />
      )}

      {editing && (
        <EditSheet row={editing} act={act} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </>
  );
}
