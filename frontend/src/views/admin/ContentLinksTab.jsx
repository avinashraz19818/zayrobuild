import React, { useEffect, useState } from 'react';
import { Link2, Copy, ExternalLink, RefreshCw, Check, Smartphone } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { EmptyState, Loader, StatusPill } from '../../components/ui';
import { admin } from '../../lib/api';

/**
 * Content links — har APK ke andar jo remote HTML load hoti hai (popup, loading,
 * fake popup) ke direct URLs. Copy karke browser me kholne par wahi encrypted
 * content milta hai jo app ke andar jaata hai.
 */
export default function ContentLinksTab({ act }) {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await admin.contentLinks();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { addToast(err.message || 'Content links load nahi hue', 'error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(''), 1600);
    } catch (_) { addToast('Copy fail — link manually select karein', 'error'); }
  };

  const term = query.trim().toLowerCase();
  const visible = term
    ? rows.filter((r) => `${r.id} ${r.app_name} ${r.username} ${r.path} ${r.fake_path}`.toLowerCase().includes(term))
    : rows;

  const LinkRow = ({ label, url, tone }) => (
    <div className="cl-link">
      <span className={`cl-tag ${tone || ''}`}>{label}</span>
      <code className="cl-url">{url}</code>
      <button className="btn btn-ghost btn-xs" onClick={() => copy(url)} title="Copy">
        {copied === url ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <a className="btn btn-ghost btn-xs" href={url} target="_blank" rel="noreferrer" title="Open">
        <ExternalLink size={12} />
      </a>
    </div>
  );

  return (
    <>
      <div className="admin-card-head">
        <div className="row-title"><Link2 size={15} style={{ verticalAlign: -2 }} /> Content links ({rows.length})</div>
        <button className="btn btn-soft btn-xs" onClick={load}><RefreshCw size={13} /> Refresh</button>
      </div>
      <div className="hint" style={{ marginBottom: 10 }}>
        Har APK ke andar yehi remote HTML load hoti hai (encrypted). Copy karke browser me kholo to wahi content milega.
      </div>

      <input
        className="input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Order ID, app, user ya path se search karein…"
        style={{ marginBottom: 12 }}
      />

      {loading ? <Loader label="Content links load ho rahe hain…" /> : visible.length === 0 ? (
        <EmptyState icon={Link2} title="Koi content link nahi" text="Pehla APK ban jaate hi uske content URLs yahan dikhenge." />
      ) : (
        <div className="stack gap-10">
          {visible.map((r) => (
            <div key={r.id} className="card card-pad stack gap-8">
              <div className="flex-row gap-8 wrap" style={{ alignItems: 'center' }}>
                <Smartphone size={14} color="var(--brand-2)" />
                <span className="row-title truncate grow">{r.app_name} <span className="muted">#{r.id}</span></span>
                <span className="chip chip-brand">@{r.username}</span>
                <StatusPill status={r.status} />
                {r.live_link_enabled === 1 && <span className="chip chip-ok">live</span>}
              </div>

              <div className="stack gap-4">
                <div className="cl-path">
                  <span className="hint" style={{ margin: 0 }}>path:</span>
                  <code className="mono">{r.path || '—'}</code>
                  {r.fake_path && <><span className="hint" style={{ margin: 0 }}>· fake:</span><code className="mono">{r.fake_path}</code></>}
                </div>

                {r.popup_url && <LinkRow label="popup" url={r.popup_url} />}
                {r.loading_url && <LinkRow label="loading" url={r.loading_url} tone="ok" />}
                {r.fake_popup_url && <LinkRow label="fake" url={r.fake_popup_url} tone="gold" />}
                {!r.popup_url && <span className="hint">Is order ka firebase path set nahi hai — build complete hone par links banengi.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
