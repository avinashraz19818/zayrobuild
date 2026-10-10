import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Users, IndianRupee as Coins, Plus, Trash2, Settings, RotateCcw, Search} from 'lucide-react';
import {Package, RefreshCw} from '../../components/AnimatedIcon';
import { admin, displayName, fmtDate } from '../../lib/api';
import { EmptyState, Loader, Notice, Sheet, Stat, StatusPill } from '../../components/ui';
import { useToast } from '../../components/Toast';
import AllOrdersList from './AllOrdersList';

const active = o => ['pending', 'building'].includes(o.status) || o.fake_sites?.some(f => ['pending', 'building'].includes(f.status));
const toggle = (ids, id) => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id].slice(0, 100);

function BulkBar({ rows, selected, setSelected, onDelete, busy, label }) {
  const eligible = rows.filter(o => !active(o)).map(o => o.id).slice(0, 100);
  const all = eligible.length > 0 && eligible.every(id => selected.includes(id));
  return <div className="flex-row wrap gap-10" style={{ margin: '12px 0' }}>
    <label className="flex-row gap-8"><input type="checkbox" checked={all} disabled={busy || !eligible.length}
      onChange={() => setSelected(all ? selected.filter(id => !eligible.includes(id)) : [...new Set([...selected, ...eligible])].slice(0, 100))} /> Select visible (max 100)</label>
    <span className="hint">{selected.length} selected</span>
    <button className="btn btn-soft btn-xs danger" disabled={busy || !selected.length} onClick={onDelete}>
      <Trash2 size={13} /> Delete selected {label}
    </button>
    {selected.length > 0 && <button className="btn btn-ghost btn-xs" onClick={() => setSelected([])}>Clear</button>}
  </div>;
}

function CoinEditor({ user, onClose, onSaved }) {
  const { addToast } = useToast();
  const [action, setAction] = useState('add');
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault();
    const n = Number(amount);
    if (amount === '' || !Number.isSafeInteger(n) || n < 0 || (action !== 'set' && n === 0)) return addToast('Whole rupee amount daalein (₹).', 'error');
    if (!window.confirm(`${action.toUpperCase()} ₹${n} · ${displayName(user)} (#${user.id})?`)) return;
    setBusy(true);
    try { await admin.setCoins(user.id, action, n); await onSaved(); onClose(); addToast('Wallet updated', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return <Sheet open onClose={onClose} icon={Coins} title="Adjust wallet" subtitle={`${displayName(user)} · ₹${user.coins}`}>
    <form onSubmit={submit} className="stack gap-12">
      <label className="field"><span className="label">Action</span><select className="input" value={action} onChange={e => setAction(e.target.value)} disabled={busy}>
        <option value="add">Add funds (+)</option><option value="subtract">Subtract funds (−)</option><option value="set">Set exact balance</option>
      </select></label>
      <label className="field"><span className="label">Amount (₹)</span><input className="input" type="number" min={action === 'set' ? 0 : 1} step="1" required value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /></label>
      <Notice tone="info">Subtract wallet balance se zyada nahi ho sakta. Har adjustment ka record save hota hai.</Notice>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Confirm adjustment'}</button>
    </form>
  </Sheet>;
}

function OrderManager({ order, onClose }) {
  const { addToast } = useToast();
  const [variant, setVariant] = useState('real');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [changeType, setChangeType] = useState('invite');
  const [minDeposit, setMinDeposit] = useState('');
  const [depositCondition, setDepositCondition] = useState(false);
  const [registerCondition, setRegisterCondition] = useState(false);
  const [userKey, setUserKey] = useState('');
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true); setError(''); setData(null);
    try {
      const next = await admin.firebase(order.id, variant);
      if (request !== sequence.current) return;
      setData(next); setUrl(next.config?.registerUrl || next.register_url || '');
      setMinDeposit(next.config?.minDeposit ?? '');
      setDepositCondition(!!next.config?.depositCondition); setRegisterCondition(!!next.config?.registerCondition);
    } catch (e) { if (request === sequence.current) setError(e.message); }
    finally { if (request === sequence.current) setLoading(false); }
  }, [order.id, variant]);
  useEffect(() => { load(); return () => { sequence.current++; }; }, [load]);
  const mutate = async (fn, message) => {
    setBusy(true);
    try { await fn(); await load(); addToast(message, 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  const sites = data?.order?.fake_sites || order.fake_sites || [];
  return <Sheet open onClose={onClose} icon={Settings} title={`Manage APK · #${order.id}`} subtitle={order.app_name} wide>
    <div className="stack gap-12">
      <label className="field"><span className="label">Target APK — changes apply only to this variant</span>
        <select className="input" value={variant} disabled={busy} onChange={e => setVariant(e.target.value)}>
          <option value="real">{order.design_variant === 'fake' ? 'Primary / Fake APK' : 'Primary / Real APK'}</option>
          {(order.fake_register_url || data?.order?.has_fake) && <option value="fake">Fake 1</option>}
          {sites.map((s, i) => <option key={s.id} value={`fs${s.id}`}>Fake {s.fake_number || i + 2}</option>)}
        </select>
      </label>
      {loading ? <Loader label="Firebase state load ho raha hai…" /> : error ? <><Notice tone="error">{error}</Notice><button className="btn btn-soft" onClick={load}>Retry</button></> : data && <>
        <div className="card card-pad"><span className="label">Firebase path</span><div className="mono" style={{ overflowWrap: 'anywhere' }}>{data.firebase_path}</div></div>
        <form className="card card-pad stack gap-10" onSubmit={e => {
          e.preventDefault();
          if (!window.confirm(`Update ${variant} link for order #${order.id}? Installed apps may use it immediately.`)) return;
          mutate(() => admin.firebaseLink(order.id, { variant, change_type: changeType, new_register_url: url.trim() }), 'Link updated');
        }}>
          <b>Update link</b>
          {data.order?.live_link_enabled === false && <Notice tone="info">This order is not marked live-link enabled. Older APKs may need a rebuild to use updated links.</Notice>}
          <select className="input" aria-label="Link update type" value={changeType} onChange={e => setChangeType(e.target.value)} disabled={busy}>
            <option value="invite">Replace full registration / invite URL</option><option value="domain">Change domain only (keep existing path/query)</option>
          </select>
          <input className="input" aria-label="Registration URL" type="url" required value={url} onChange={e => setUrl(e.target.value)} disabled={busy} />
          <button className="btn btn-primary btn-sm" disabled={busy}>Save link</button>
        </form>
        <form className="card card-pad stack gap-10" onSubmit={e => {
          e.preventDefault();
          mutate(() => admin.firebaseConfig(order.id, { variant, min_deposit: Number(minDeposit), deposit_condition: depositCondition, register_condition: registerCondition }), 'Configuration saved');
        }}>
          <b>App configuration</b>
          <label className="field"><span className="label">Minimum deposit</span><input className="input" type="number" min="0" required value={minDeposit} onChange={e => setMinDeposit(e.target.value)} disabled={busy} /></label>
          <label><input type="checkbox" checked={depositCondition} onChange={e => setDepositCondition(e.target.checked)} disabled={busy} /> Deposit condition</label>
          <label><input type="checkbox" checked={registerCondition} onChange={e => setRegisterCondition(e.target.checked)} disabled={busy} /> Registration condition</label>
          <button className="btn btn-soft btn-sm" disabled={busy}>Save configuration</button>
        </form>
        <div className="card card-pad stack gap-10">
          <b>Demo accounts / Firebase users</b>
          {data.users_error && <Notice tone="error">{data.users_error}</Notice>}
          <form className="flex-row wrap gap-8" onSubmit={e => {
            e.preventDefault();
            mutate(async () => { await admin.addDemo(order.id, { variant, user_key: userKey.trim() }); setUserKey(''); }, 'Demo account added');
          }}>
            <input className="input" aria-label="Demo account key" placeholder="User key / phone number" required value={userKey} onChange={e => setUserKey(e.target.value)} disabled={busy} />
            <button className="btn btn-primary btn-sm" disabled={busy || !userKey.trim()}>Add demo</button>
          </form>
          {(data.users || []).map(u => <div className="row-item" key={u.key}>
            <span className="row-main"><span className="row-title">{u.key}</span><span className="row-sub">{u.value?.isDemo ? 'Demo account' : 'Registered user'}</span></span>
            <button className="btn btn-ghost btn-xs danger" disabled={busy} onClick={() => {
              if (window.confirm(`Remove ${u.key} from ${variant}?`)) mutate(() => admin.removeDemo(order.id, variant, u.key), 'Account removed');
            }}>Remove</button>
          </div>)}
          {!data.users_error && !data.users?.length && <span className="hint">No accounts in this variant.</span>}
        </div>
      </>}
    </div>
  </Sheet>;
}

function OrderRows({ rows, selected, setSelected, onManage, onDelete, onRebuild, busy }) {
  return <div className="stack gap-10">{rows.map(o => <article key={o.id} className="card card-pad stack gap-10">
    <div className="flex-row gap-10">
      <input type="checkbox" aria-label={`Select order ${o.id}`} disabled={busy || active(o)} checked={selected.includes(o.id)} onChange={() => setSelected(toggle(selected, o.id))} />
      <div className="row-main"><b>{o.app_name} · #{o.id}</b><div className="row-sub">{o.username || o.user_name || ''} · {o.design_name} · {fmtDate(o.created_at)}</div><div className="row-sub">{o.package_name}</div></div>
      <StatusPill status={o.status} />
    </div>
    <div className="btn-group">
      {o.apk_file && <a className="btn btn-soft btn-xs" href={`/api/orders/${o.id}/download`}>Primary APK</a>}
      {o.fake_apk_file && <a className="btn btn-soft btn-xs" href={`/api/orders/${o.id}/download-fake`}>Fake 1 APK</a>}
      {o.fake_sites?.filter(f => f.apk_file).map((f, i) => <a className="btn btn-soft btn-xs" key={f.id} href={`/api/admin/orders/${o.id}/fake-sites/${f.id}/download`}>Fake {f.fake_number || i + 2} APK</a>)}
      <button className="btn btn-primary btn-xs" onClick={() => onManage(o)}><Settings size={13} /> Manage links & demo</button>
      <button className="btn btn-soft btn-xs" disabled={busy} onClick={() => onRebuild(o)}><RotateCcw size={13} /> Rebuild</button>
      <button className="btn btn-ghost btn-xs danger" disabled={busy} onClick={() => onDelete([o.id])}><Trash2 size={13} /> Delete</button>
    </div>
    <details><summary className="hint">Admin build diagnostics</summary><pre className="console" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{o.build_log || 'No build output.'}</pre></details>
  </article>)}</div>;
}

function useOrderActions(reload) {
  const { addToast } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async ids => {
    if (!window.confirm(`Permanently delete ${ids.length} order(s) and their local APK files? No automatic refund. Remote Firebase data is not erased.`)) return;
    setBusy(true);
    try { await admin.deleteOrders(ids); await reload(); addToast('Orders deleted', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  const rebuild = async o => {
    if (!window.confirm(`Rebuild order #${o.id}?`)) return;
    setBusy(true);
    try { await admin.rebuild(o.id); await reload(); addToast('Rebuild queued', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return { busy, remove, rebuild };
}

export function OrdersTab({ onCreate }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState([]);
  const [manage, setManage] = useState(null);
  const [type, setType] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const token = ++seq.current;
    setLoading(true);
    try {
      const data = await admin.orders({ limit: 40, page, status: filter, search: query });
      if (token !== seq.current) return;
      const lastPage = Math.max(1, data.pagination?.totalPages || 1);
      setRows(data.orders || []); setPages(lastPage); setSelected([]);
      if (page > lastPage) setPage(lastPage);
    } catch (e) { if (token === seq.current) addToast(e.message, 'error'); }
    finally { if (token === seq.current) setLoading(false); }
  }, [page, query, filter, addToast]);
  useEffect(() => { if (type !== 'apk') return undefined; const timer = setTimeout(load, 200); return () => { clearTimeout(timer); seq.current++; }; }, [load, type]);
  const actions = useOrderActions(load);
  return <>
    <div className="admin-card-head"><b>Orders</b><div className="btn-group"><button className="btn btn-soft btn-xs" disabled={actions.busy} onClick={() => { if (type === 'apk') load(); setRefreshKey(k => k + 1); }}><RefreshCw size={13} /> Refresh</button><button className="btn btn-primary btn-xs" onClick={onCreate}><Plus size={13} /> Create order</button></div></div>
    <div className="search-wrap"><Search size={15} className="ico" /><input className="input" aria-label="Search orders" placeholder="Order, app, user or template…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} /></div>
    <div className="pill-row">{[['all', 'Sab'], ['apk', 'APK'], ['site', 'Website'], ['bot', 'Bot']].map(([k, l]) => <button key={k} className={`pill ${type === k ? 'active' : ''}`} onClick={() => { setType(k); setPage(1); }}>{l}</button>)}</div>
    <div className="pill-row">{['all', 'done', 'building', 'pending', 'failed'].map(s => <button key={s} className={`pill ${filter === s ? 'active' : ''}`} onClick={() => { setFilter(s); setPage(1); }}>{s === 'done' ? 'Ready' : s}</button>)}</div>
    {type !== 'apk' ? <AllOrdersList type={type} status={filter} query={query} refreshKey={refreshKey} /> : <>
    <BulkBar rows={rows} selected={selected} setSelected={setSelected} onDelete={() => actions.remove(selected)} busy={actions.busy || loading} label="orders" />
    {loading ? <Loader /> : !rows.length ? <EmptyState icon={Package} title="No orders" /> : <OrderRows rows={rows} selected={selected} setSelected={setSelected} onManage={setManage} onDelete={actions.remove} onRebuild={actions.rebuild} busy={actions.busy} />}
    <div className="flex-row between" style={{ marginTop: 16 }}><button className="btn btn-soft btn-xs" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} / {pages}</span><button className="btn btn-soft btn-xs" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</button></div>
    </>}
    {manage && <OrderManager key={manage.id} order={manage} onClose={() => setManage(null)} />}
  </>;
}

function UserProfile({ userId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [manage, setManage] = useState(null);
  const [coins, setCoins] = useState(false);
  const seq = useRef(0);
  const load = useCallback(async () => {
    const token = ++seq.current;
    try { const next = await admin.userOrders(userId); if (token === seq.current) { setData(next); setSelected([]); setError(''); } }
    catch (e) { if (token === seq.current) setError(e.message); }
  }, [userId]);
  useEffect(() => { load(); return () => { seq.current++; }; }, [load]);
  const actions = useOrderActions(async () => { await load(); await onChanged(); });
  return <>
    <Sheet open={!coins && !manage} onClose={onClose} icon={Users} title={data ? `${displayName(data.user)} · #${userId}` : `User #${userId}`} subtitle="User profile & APK management" wide>
      {error && <Notice tone="error">{error}</Notice>}
      {!data ? <><Loader /><button className="btn btn-soft" onClick={load}>Retry</button></> : <div className="stack gap-12">
        <div className="card card-pad stack gap-8">
          <b>{displayName(data.user)}</b><span className="row-sub">Telegram: {data.user.telegram_id || 'Not linked'} · @{data.user.tg_username || data.user.username || '—'}</span>
          <span className="row-sub">Email: {data.user.email || '—'} · Joined {fmtDate(data.user.created_at)}</span>
          <div className="btn-group"><button className="btn btn-primary btn-xs" onClick={() => setCoins(true)}><Coins size={13} /> Add / subtract balance</button><button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh profile</button></div>
        </div>
        <div className="admin-kpi"><Stat value={data.user.coins} label="Wallet" /><Stat value={data.stats.total} label="Orders" /><Stat value={data.stats.completed} label="Ready orders" /><Stat value={data.stats.apk_count} label="Available APK files" /><Stat value={data.stats.pending + data.stats.building} label="In queue" /><Stat value={data.stats.failed} label="Failed" /><Stat value={data.stats.coins_spent} label="Order amount (₹)" /></div>
        <BulkBar rows={data.orders} selected={selected} setSelected={setSelected} onDelete={() => actions.remove(selected)} busy={actions.busy} label="orders" />
        {!data.orders.length ? <Notice tone="info">No APK orders yet.</Notice> : <OrderRows rows={data.orders} selected={selected} setSelected={setSelected} onManage={setManage} onDelete={actions.remove} onRebuild={actions.rebuild} busy={actions.busy} />}
        <details><summary>Recent wallet adjustments</summary>{data.coin_history?.length ? data.coin_history.map((h, i) => <div className="row-item" key={i}>{h.action} {h.amount} · {h.balance_before} → {h.balance_after} · {fmtDate(h.created_at)}</div>) : <p className="hint">No recorded adjustments since this feature was enabled.</p>}</details>
      </div>}
    </Sheet>
    {coins && data && <CoinEditor user={data.user} onClose={() => setCoins(false)} onSaved={async () => { await load(); await onChanged(); }} />}
    {manage && <OrderManager key={manage.id} order={manage} onClose={() => setManage(null)} />}
  </>;
}

export function UsersTab() {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [profile, setProfile] = useState(null);
  const [coinUser, setCoinUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tgUser, setTgUser] = useState(null);
  const [tgValue, setTgValue] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { const next = await admin.users(); setRows(Array.isArray(next) ? next : []); setSelected([]); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [addToast]);
  useEffect(() => { load(); }, [load]);
  const term = query.toLowerCase().trim();
  const visible = rows.filter(u => `${u.id} ${u.username || ''} ${u.first_name || ''} ${u.email || ''} ${u.telegram_id || ''} ${u.tg_username || ''}`.toLowerCase().includes(term));
  const remove = async ids => {
    if (!window.confirm(`Permanently delete ${ids.length} user(s), their orders, local APK files and related records? No automatic refund. Remote Firebase data is not erased.`)) return;
    setBusy(true);
    try { await admin.deleteUsers(ids); await load(); addToast('Users deleted', 'success'); }
    catch (e) { addToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  return <>
    <div className="admin-card-head"><b>Users · {rows.length}</b><button className="btn btn-soft btn-xs" disabled={busy} onClick={load}><RefreshCw size={13} /> Refresh</button></div>
    <div className="search-wrap"><Search size={15} className="ico" /><input className="input" aria-label="Search users" placeholder="Name, ID, Telegram or email…" value={query} onChange={e => setQuery(e.target.value)} /></div>
    <BulkBar rows={visible} selected={selected} setSelected={setSelected} onDelete={() => remove(selected)} busy={busy || loading} label="users" />
    {loading ? <Loader /> : !visible.length ? <EmptyState icon={Users} title="No users found" /> : <div className="stack gap-10">{visible.map(u => <article className="card card-pad stack gap-10" key={u.id}>
      <div className="flex-row gap-10"><input type="checkbox" aria-label={`Select user ${u.id}`} checked={selected.includes(u.id)} disabled={busy} onChange={() => setSelected(toggle(selected, u.id))} /><div className="row-main"><b>{displayName(u)} · #{u.id}</b><div className="row-sub">{u.telegram_id ? `TG ${u.telegram_id}` : u.email || 'No contact'} · {fmtDate(u.created_at)}</div></div><span className="chip chip-gold">₹{u.coins}</span></div>
      <div className="btn-group"><button className="btn btn-primary btn-xs" onClick={() => setProfile(u.id)}>Full profile & APKs</button><button className="btn btn-soft btn-xs" onClick={() => setCoinUser(u)}>+ / − Wallet</button><button className="btn btn-soft btn-xs" onClick={() => { setTgUser(u); setTgValue(String(u.telegram_id || '')); }}>Telegram ID</button><button className="btn btn-ghost btn-xs danger" disabled={busy} onClick={() => remove([u.id])}><Trash2 size={13} /> Delete user</button></div>
    </article>)}</div>}
    {profile && <UserProfile key={profile} userId={profile} onClose={() => setProfile(null)} onChanged={load} />}
    {coinUser && <CoinEditor user={coinUser} onClose={() => setCoinUser(null)} onSaved={load} />}
    {tgUser && <Sheet open onClose={() => setTgUser(null)} icon={Users} title={`Telegram ID · ${displayName(tgUser)}`}><form className="stack gap-12" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await admin.setTelegram(tgUser.id, tgValue.trim()); await load(); setTgUser(null); addToast('Telegram ID updated', 'success'); }
      catch (err) { addToast(err.message, 'error'); } finally { setBusy(false); }
    }}><Notice tone="info">Changing this transfers Telegram login and delivery access. Empty value removes the link.</Notice><input className="input" aria-label="Telegram ID" inputMode="numeric" value={tgValue} onChange={e => setTgValue(e.target.value)} /><button className="btn btn-primary" disabled={busy}>Save Telegram ID</button></form></Sheet>}
  </>;
}
