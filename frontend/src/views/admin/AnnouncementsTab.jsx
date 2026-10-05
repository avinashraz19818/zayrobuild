import React, { useEffect, useState } from 'react';
import { Megaphone, Send, Trash2, Check, RefreshCw, Plus } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, EmptyState, Notice } from '../../components/ui';
import { admin, fmtDate } from '../../lib/api';

const BLANK = { title: 'UPDATE', message: '', button_text: '', button_url: '', active: true };

/** Announcements — home page ka "Bot message" card yahi se control hota hai. */
export default function AnnouncementsTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(BLANK);
  const [broadcast, setBroadcast] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.announcements();
      setRows(Array.isArray(data) ? data : (data?.announcements || []));
    } catch (err) {
      addToast(err.message || 'Announcements load nahi hui', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.title.trim() || !draft.message.trim()) {
      addToast('Title aur message dono chahiye', 'error');
      return;
    }
    setBusy(true);
    try {
      await admin.createAnnouncement({ ...draft, broadcast_now: broadcast });
      addToast(broadcast ? 'Announcement publish + broadcast ho gaya' : 'Announcement publish ho gaya', 'success');
      setDraft(BLANK);
      setBroadcast(false);
      await load();
    } catch (err) {
      addToast(err.message || 'Publish fail hua', 'error');
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><Megaphone size={15} style={{ verticalAlign: -2 }} /> Announcements</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>

      <form className="card card-pad stack gap-12" onSubmit={submit}>
        <div className="flex-row gap-8">
          <Plus size={14} color="var(--brand-2)" />
          <span className="row-title">Naya announcement</span>
        </div>
        <div className="flex-row gap-10 wrap">
          <div className="field grow" style={{ minWidth: 160 }}>
            <span className="label">Title</span>
            <input className="input" value={draft.title} maxLength={40}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="UPDATE" />
          </div>
          <div className="field grow" style={{ minWidth: 160 }}>
            <span className="label">Button text (optional)</span>
            <input className="input" value={draft.button_text} maxLength={24}
              onChange={(e) => setDraft((d) => ({ ...d, button_text: e.target.value }))} placeholder="Open now" />
          </div>
        </div>
        <div className="field">
          <span className="label">Message</span>
          <textarea className="input" rows={3} value={draft.message} maxLength={400}
            onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))}
            placeholder="Naya template live hai — abhi build karein." />
          <span className="hint">{draft.message.length}/400 · ye home page ke "Bot message" card par dikhta hai.</span>
        </div>
        <div className="field">
          <span className="label">Button URL (optional)</span>
          <input className="input" value={draft.button_url}
            onChange={(e) => setDraft((d) => ({ ...d, button_url: e.target.value }))} placeholder="https://t.me/yourchannel" />
        </div>
        <label className="flex-row gap-8" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
          <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
          <Send size={13} /> Saare bot users ko broadcast bhi bhejein
        </label>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Publishing…' : 'Publish announcement'}
        </button>
      </form>

      <div className="admin-card-head">
        <div className="row-title">Published ({rows.length})</div>
      </div>

      {loading ? (
        <Loader label="Load ho raha hai…" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Megaphone} title="Koi announcement nahi" text="Upar se pehla announcement publish karein — home page par turant dikhega." />
      ) : (
        <div className="admin-table">
          {rows.map((a) => (
            <div className="card card-pad stack gap-8" key={a.id}>
              <div className="flex-row between gap-8 wrap">
                <div className="flex-row gap-8">
                  <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{a.title}</strong>
                  <span className={`status ${a.active ? 'ok' : 'warn'}`}>{a.active ? 'Active' : 'Hidden'}</span>
                </div>
                <span className="row-sub">{fmtDate(a.created_at)}</span>
              </div>
              <p className="row-sub" style={{ lineHeight: 1.55 }}>{a.message}</p>
              {a.button_text && a.button_url && (
                <span className="chip chip-info" style={{ alignSelf: 'flex-start' }}>{a.button_text} → {a.button_url}</span>
              )}
              <div className="admin-actions">
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => act(async () => {
                    await admin.updateAnnouncement(a.id, { active: a.active ? 0 : 1 });
                    await load();
                  }, a.active ? 'Announcement hide kar diya' : 'Announcement active kar diya')}
                >
                  {a.active
                    ? <><Trash2 size={13} /> Hide</>
                    : <><Check size={13} /> Activate</>}
                </button>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => act(async () => {
                    await admin.broadcastAnnouncement(a.id);
                  }, 'Broadcast bhej diya')}
                >
                  <Send size={13} /> Broadcast
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => act(async () => {
                    await admin.deleteAnnouncement(a.id);
                    await load();
                  }, 'Announcement delete ho gaya')}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Notice tone="info">Sabse naya active announcement home page par sabse pehle dikhta hai.</Notice>
    </>
  );
}
