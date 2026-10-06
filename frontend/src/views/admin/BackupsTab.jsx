import React, { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { EmptyState, Loader } from '../../components/ui';
import { admin } from '../../lib/api';

const kb = (n) => `${Math.max(1, Math.round(Number(n || 0) / 1024))} KB`;

/**
 * Database backups — server startup par aur manually banayi gayi safety copies.
 * Yahan se list dekh kar koi bhi backup download kar sakte hain.
 */
export default function BackupsTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.backups();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { addToast(err.message || 'Backups load nahi hue', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const create = () => act(async () => {
    setBusy(true);
    try { await admin.createBackup(); await load(); }
    finally { setBusy(false); }
  }, 'Naya backup ban gaya');

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><DatabaseBackup size={15} style={{ verticalAlign: -2 }} /> Backups ({rows.length})</div>
        <div className="flex-row gap-6">
          <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
          <button className="btn btn-primary btn-xs" onClick={create} disabled={busy}>
            <Plus size={13} /> {busy ? 'Ban raha hai…' : 'Backup banayein'}
          </button>
        </div>
      </div>

      <div className="trust-strip">
        <ShieldCheck size={14} color="var(--ok)" />
        <span>Server start hote waqt apne aap backup banta hai. Koi backup download karke safe rakh sakte hain.</span>
      </div>

      {loading ? <Loader label="Backups load ho rahe hain…" /> : rows.length === 0 ? (
        <EmptyState icon={DatabaseBackup} title="Koi backup nahi" text="Upar 'Backup banayein' dabate hi pehla backup ban jaayega." />
      ) : (
        <div className="admin-table">
          {rows.map((b) => (
            <div key={b.file} className="row-item">
              <span className="row-ico"><DatabaseBackup size={15} /></span>
              <span className="row-main">
                <span className="row-title truncate mono" style={{ fontSize: 12 }}>{b.file}</span>
                <span className="row-sub">{kb(b.size)} · {new Date(b.created_at).toLocaleString('en-IN')}</span>
              </span>
              <a className="btn btn-soft btn-xs" href={`/api/admin/backups/${encodeURIComponent(b.file)}/download`}>
                <Download size={12} /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
