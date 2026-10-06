import React, { useEffect, useMemo, useState } from 'react';
import { Package, Search, Sparkles, Globe, Layers, User as UserIcon, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Sheet, Spinner } from '../../components/ui';
import { admin, displayName } from '../../lib/api';

/**
 * Create Order (FREE) — admin kisi bhi user ke liye order bana sakta hai,
 * uske coins nahi kat-te (0 coins). Fields user panel ke build form jaise hi hain.
 */
export default function CreateOrderModal({ isOpen, onClose, onDone }) {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');

  const [userId, setUserId] = useState('');
  const [designId, setDesignId] = useState('');
  const [appName, setAppName] = useState('');
  const [registerUrl, setRegisterUrl] = useState('');
  const [minDeposit, setMinDeposit] = useState('300');
  const [fakeOn, setFakeOn] = useState(false);
  const [fakeUrl, setFakeUrl] = useState('');
  const [extraFakes, setExtraFakes] = useState([]);
  const [iconFile, setIconFile] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [u, d] = await Promise.all([admin.users(), admin.designs()]);
        if (!alive) return;
        setUsers(Array.isArray(u) ? u : (u?.users || []));
        setDesigns(Array.isArray(d) ? d : (d?.designs || []));
      } catch (err) {
        addToast(err.message || 'Users/designs load nahi hue', 'error');
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    /* eslint-disable-next-line */
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setUserId(''); setDesignId(''); setAppName(''); setRegisterUrl('');
    setMinDeposit('300'); setFakeOn(false); setFakeUrl(''); setExtraFakes([]);
    setIconFile(null); setSearch('');
  }, [isOpen]);

  const visibleUsers = useMemo(() => {
    const t = search.trim().toLowerCase();
    const list = t
      ? users.filter((u) => `${u.id} ${u.username} ${u.first_name} ${u.tg_username} ${u.telegram_id} ${u.email}`.toLowerCase().includes(t))
      : users;
    return list.slice(0, 60);
  }, [users, search]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId || !designId || !appName.trim() || !registerUrl.trim()) {
      addToast('User, design, app name aur register URL zaroori hain', 'error');
      return;
    }
    if (fakeOn && !fakeUrl.trim()) {
      addToast('Fake site ka register URL daalein ya fake addon band karein', 'error');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('design_id', designId);
      fd.append('app_name', appName.trim());
      fd.append('register_url', registerUrl.trim());
      fd.append('min_deposit', String(parseInt(minDeposit, 10) || 300));
      fd.append('brand_title', appName.trim());
      if (iconFile) fd.append('icon', iconFile);
      if (fakeOn) {
        fd.append('fake_addon', 'true');
        fd.append('fake_register_url', fakeUrl.trim());
      }
      const extras = extraFakes.map((u) => u.trim()).filter(Boolean);
      if (extras.length) fd.append('fake_sites', JSON.stringify(extras));
      await admin.createOrder(fd);
      addToast('Order ban gaya — build queue me daal diya (0 coins)', 'success');
      onDone?.();
      onClose?.();
    } catch (err) {
      addToast(err.message || 'Order create nahi hua', 'error');
    } finally { setBusy(false); }
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onClose={onClose} icon={Package} title="Create Order" subtitle="Admin ke liye FREE · 0 coins">
      {loading ? (
        <div className="center-pad"><span className="spinner" /><span>Users aur designs aa rahe hain…</span></div>
      ) : (
        <form className="stack gap-14" onSubmit={submit}>
          <span className="chip chip-ok" style={{ alignSelf: 'flex-start' }}><Sparkles size={11} /> User ke coins nahi kat-te</span>

          {/* 1 · User */}
          <div className="stack gap-8">
            <div className="row-title"><UserIcon size={14} style={{ verticalAlign: -2 }} /> 1 · User</div>
            <div className="search-wrap">
              <Search size={15} className="ico" />
              <input className="input" value={search} onChange={(e) => setSearch(e.target.value)}
                     placeholder="Search: ID, username, naam, email, Telegram…" />
            </div>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Select user…</option>
              {visibleUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.id} · {displayName(u)} {u.telegram_id ? `· TG ${u.telegram_id}` : ''} · {u.coins} coins
                </option>
              ))}
            </select>
            {visibleUsers.length === 0 && <span className="hint">Is search par koi user nahi mila.</span>}
          </div>

          <div className="divider" />

          {/* 2 · App */}
          <div className="stack gap-8">
            <div className="row-title"><Package size={14} style={{ verticalAlign: -2 }} /> 2 · App</div>
            <div className="field">
              <span className="label">App name *</span>
              <input className="input" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="e.g. VIP PANEL" />
              <span className="hint">Home screen ka naam — pakage identifier khud ban jaata hai.</span>
            </div>
            <div className="field">
              <span className="label">App icon (PNG, 512×512)</span>
              <input className="input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
            </div>
            <div className="field">
              <span className="label">Design / template *</span>
              <select className="input" value={designId} onChange={(e) => setDesignId(e.target.value)}>
                <option value="">Select design…</option>
                {designs.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} · {d.price_coins} coins</option>
                ))}
              </select>
              <span className="hint">Hidden/under-maintenance design bhi yahan se use ho sakta hai (test build).</span>
            </div>
          </div>

          <div className="divider" />

          {/* 3 · Site */}
          <div className="stack gap-8">
            <div className="row-title"><Globe size={14} style={{ verticalAlign: -2 }} /> 3 · Site & deposit</div>
            <div className="field">
              <span className="label">Register URL *</span>
              <input className="input" value={registerUrl} onChange={(e) => setRegisterUrl(e.target.value)}
                     placeholder="https://example.com/#/register?invitationCode=…" inputMode="url" />
              <span className="hint">Deposit aur Wingo URLs isi domain se apne aap banti hain.</span>
            </div>
            <div className="field">
              <span className="label">Minimum deposit (₹)</span>
              <input className="input" type="number" min="1" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} />
            </div>
          </div>

          <div className="divider" />

          {/* 4 · Fake site addon */}
          <div className="stack gap-8">
            <div className="row-title"><Layers size={14} style={{ verticalAlign: -2 }} /> 4 · Fake site APKs (optional)</div>
            <label className="flex-row gap-8" style={{ alignItems: 'center', cursor: 'pointer', fontWeight: 700, color: 'var(--gold)' }}>
              <input type="checkbox" checked={fakeOn} onChange={(e) => setFakeOn(e.target.checked)} />
              Fake site APK add karein
            </label>
            <span className="hint">Same design, alag URL — 2 APKs milenge (real + fake). Real APK ke alawa har extra fake ka bhi alag APK banega.</span>
            {fakeOn && (
              <div className="field">
                <span className="label">Fake site register URL</span>
                <input className="input" value={fakeUrl} onChange={(e) => setFakeUrl(e.target.value)}
                       placeholder="https://fakesite.com/#/register?…" inputMode="url" />
              </div>
            )}
            <div className="stack gap-6">
              {extraFakes.map((v, i) => (
                <div className="flex-row gap-8" key={i}>
                  <input className="input grow" value={v} inputMode="url" placeholder="Extra fake site URL"
                         onChange={(e) => setExtraFakes((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtraFakes((arr) => arr.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button type="button" className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }}
                      onClick={() => setExtraFakes((arr) => [...arr, ''])}>+ Extra fake site</button>
            </div>
          </div>

          <div className="trust-strip">
            <AlertTriangle size={14} color="var(--warn)" />
            <span>Cost: <b>0 coins</b> — admin order hai, user ke balance se kuch nahi katta.</span>
          </div>

          <div className="sheet-foot" style={{ padding: 0 }}>
            <button type="button" className="btn btn-soft" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary grow" disabled={busy}>
              {busy ? <Spinner /> : <Package size={15} />} {busy ? 'Order ban raha hai…' : 'Order banayein · FREE'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
