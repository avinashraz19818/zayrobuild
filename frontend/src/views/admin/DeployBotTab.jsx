import React, { useEffect, useState } from 'react';
import { Bot, Check, X, Trash2, RefreshCw, Clock, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, EmptyState, Notice } from '../../components/ui';
import { admin, fmtDate, displayName } from '../../lib/api';

const STATUS = {
  pending: { label: 'Pending', cls: 'warn' },
  active: { label: 'Live', cls: 'ok' },
  rejected: { label: 'Rejected', cls: 'danger' },
  failed: { label: 'Failed', cls: 'danger' }
};

/** Deploy Bot requests — admin yahan se live / reject karta hai. */
export default function DeployBotTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState({});
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.botDeploys();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast(err.message || 'Deploy requests load nahi hui', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const counts = {
    pending: rows.filter((r) => r.status === 'pending').length,
    active: rows.filter((r) => r.status === 'active').length
  };

  if (loading) return <Loader label="Deploy requests load ho rahi hain…" />;

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title">
          <Bot size={15} style={{ verticalAlign: -2 }} /> Deploy Bot requests
          <span className="chip chip-warn" style={{ marginLeft: 8 }}>{counts.pending} pending</span>
          <span className="chip chip-ok" style={{ marginLeft: 6 }}>{counts.active} live</span>
        </div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      <div className="admin-pill-grid">
        {['all', 'pending', 'active', 'rejected', 'failed'].map((f) => (
          <button key={f} className={`pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : STATUS[f]?.label || f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={Bot} title="Koi request nahi" text="Users jab panel se bot deploy request bhejenge, wo yahan dikhegi." />
      ) : (
        <div className="admin-table">
          {visible.map((r) => (
            <article key={r.id} className="card card-pad stack gap-10">
              <div className="flex-row gap-10" style={{ alignItems: 'flex-start' }}>
                <span className="row-ico info" style={{ width: 40, height: 40, borderRadius: 13 }}><Bot size={17} /></span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="flex-row gap-8 wrap" style={{ marginBottom: 3 }}>
                    <strong style={{ fontSize: 14, fontWeight: 800 }}>{r.bot_name}</strong>
                    <span className={`status ${STATUS[r.status]?.cls || 'warn'}`}>{STATUS[r.status]?.label || r.status}</span>
                  </div>
                  <div className="admin-row-meta">
                    <span>{r.plan_name} · ₹{r.price}</span>
                    <span>·</span>
                    <span>#{r.id}</span>
                    <span>·</span>
                    <span>{fmtDate(r.created_at)}</span>
                  </div>
                  <div className="admin-row-meta" style={{ marginTop: 3 }}>
                    <span>User: <b>{displayName(r)}</b>{r.tg_username ? ` (@${r.tg_username})` : ''}</span>
                    {r.telegram_id && <span>· TG <span className="admin-mini">{r.telegram_id}</span></span>}
                    {r.admin_tg_id && <span>· Admin ID <span className="admin-mini">{r.admin_tg_id}</span></span>}
                  </div>
                  <div className="admin-row-meta" style={{ marginTop: 3 }}>
                    <span>Token: <span className="admin-mini">{r.bot_token || '—'}</span></span>
                  </div>
                  {r.note && <div className="row-sub" style={{ marginTop: 5 }}>Note: {r.note}</div>}
                </div>
              </div>

              <div className="field" style={{ marginTop: 2 }}>
                <input
                  className="input"
                  placeholder="Note (optional — user ko Telegram par jaayega)"
                  value={note[r.id] || ''}
                  onChange={(e) => setNote((p) => ({ ...p, [r.id]: e.target.value }))}
                />
              </div>

              <div className="admin-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => act(async () => {
                    await admin.setBotDeployStatus(r.id, 'active', note[r.id] || '');
                    await load();
                  }, 'Bot live mark kar diya')}
                >
                  <Check size={14} /> Mark live
                </button>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => act(async () => {
                    await admin.setBotDeployStatus(r.id, 'pending', note[r.id] || '');
                    await load();
                  }, 'Pending me daal diya')}
                >
                  <Clock size={14} /> Pending
                </button>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => act(async () => {
                    await admin.setBotDeployStatus(r.id, 'rejected', note[r.id] || '');
                    await load();
                  }, 'Request reject kar di')}
                >
                  <X size={14} /> Reject
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => act(async () => {
                    await admin.deleteBotDeploy(r.id);
                    await load();
                  }, 'Request delete ho gayi')}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Notice tone="info">
        <ShieldCheck size={13} style={{ verticalAlign: -2 }} /> Status change hone par user ko Telegram par
        notice chala jaata hai (bot online hone par). Token browser me masked aata hai.
      </Notice>
    </>
  );
}
