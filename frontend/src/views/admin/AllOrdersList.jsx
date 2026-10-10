import React, { useEffect, useState } from 'react';
import { Package } from '../../components/AnimatedIcon';
import { api, fmtDate } from '../../lib/api';
import { EmptyState, Loader, Notice, StatusPill } from '../../components/ui';

// Orders tab: APK + Website + Bot orders ek list me (read-only summary).
// APK orders ka full manage (rebuild, links, delete) APK pill par milta hai.
const KIND_LABEL = { apk: 'APK', site: 'Website', bot: 'Bot' };

export default function AllOrdersList({ type, status, query, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => { setPage(1); }, [type, status, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ type, status, search: query || '', page: String(page), limit: '20' });
    const timer = setTimeout(() => {
      api.get(`/api/admin/all-orders?${qs.toString()}`)
        .then((r) => {
          if (!active) return;
          setRows(r.orders || []);
          setPages(Math.max(1, r.pagination?.totalPages || 1));
        })
        .catch((e) => { if (active) setError(e.message || 'Orders load nahi hue.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [type, status, query, page, refreshKey]);

  if (loading) return <Loader />;
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!rows.length) return <EmptyState icon={Package} title="Koi order nahi" text="Is filter me abhi koi order nahi hai." />;

  return <>
    <div className="stack gap-10">
      {rows.map((r) => (
        <article key={`${r.kind}-${r.id}`} className="card card-pad stack gap-8">
          <div className="flex-row gap-10">
            <div className="row-main">
              <b>{r.title || '—'} · {KIND_LABEL[r.kind] || r.kind} #{r.id}</b>
              <div className="row-sub">{r.user_name || `User #${r.user_id}`} · {r.detail} · {fmtDate(r.created_at)}</div>
            </div>
            <span className="flex-row gap-6">
              <span className="chip">₹{Number(r.amount || 0).toLocaleString('en-IN')}</span>
              <StatusPill status={r.status} />
            </span>
          </div>
          {r.kind === 'apk' && r.has_apk ? (
            <div className="btn-group">
              <a className="btn btn-soft btn-xs" href={`/api/orders/${r.id}/download`}>Primary APK</a>
            </div>
          ) : null}
        </article>
      ))}
    </div>
    <div className="flex-row between" style={{ marginTop: 16 }}>
      <button className="btn btn-soft btn-xs" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page} / {pages}</span>
      <button className="btn btn-soft btn-xs" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  </>;
}
