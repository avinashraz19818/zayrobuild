import React, { useEffect, useState } from 'react';
import { Server, Save, Upload, Trash2, Bot, QrCode, RefreshCw, Sparkles } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { Loader, Notice } from '../../components/ui';
import { admin, api } from '../../lib/api';

const FIELDS = [
  { key: 'site_name', label: 'Store name', hint: 'Header, loading screen aur page title me dikhta hai' },
  { key: 'site_url', label: 'Site URL', hint: 'Panel ka public link' },
  { key: 'upi_id', label: 'UPI ID', hint: 'Wallet deposit page par dikhta hai' },
  { key: 'coin_rate', label: 'Coin rate (₹ per coin)' },
  { key: 'addon_fake_price', label: 'Fake addon price (coins)' },
  { key: 'domain_change_price', label: 'Domain change price (coins)' },
  { key: 'invite_code_change_price', label: 'Invite change price (coins)' },
  { key: 'telegram_support_user', label: 'Support username', hint: '@ ke bina likhein' },
  { key: 'telegram_channel_url', label: 'Channel URL' },
  { key: 'telegram_admin_id', label: 'Admin Telegram ID' },
  { key: 'telegram_log_channel_id', label: 'Log channel ID' }
];

const BLANK_PLANS = [
  { key: 'starter', name: 'Starter Bot', price: 699, days: 30 },
  { key: 'pro', name: 'Pro Bot', price: 1299, days: 90 },
  { key: 'vip', name: 'VIP Bot', price: 1999, days: 365 }
];

/** Store settings — branding (logo), payments, prices aur Deploy Bot plans. */
export default function SettingsTab({ act }) {
  const { addToast } = useToast();
  const [values, setValues] = useState({});
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [qrFile, setQrFile] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const flat = (await admin.settings()) || {};
      setValues(flat);
      let parsed = [];
      try { parsed = JSON.parse(flat.deploy_bot_plans || '[]'); } catch (_) { parsed = []; }
      setPlans(Array.isArray(parsed) && parsed.length ? parsed : BLANK_PLANS);
    } catch (err) {
      addToast(err.message || 'Settings load nahi hui', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      FIELDS.forEach((f) => { if (values[f.key] !== undefined) fd.append(f.key, values[f.key]); });
      fd.append('deploy_bot_enabled', String(values.deploy_bot_enabled ?? '1') === '0' ? '0' : '1');
      fd.append('deploy_bot_plans', JSON.stringify(plans.filter((p) => p.name)));
      if (logoFile) fd.append('logo', logoFile);
      if (qrFile) fd.append('upi_qr_image', qrFile);
      await api.postForm('/api/admin/settings', fd);
      addToast('Settings save ho gayi — panel me turant live', 'success');
      setLogoFile(null);
      setQrFile(null);
      await load();
    } catch (err) {
      addToast(err.message || 'Save fail hua', 'error');
    } finally { setBusy(false); }
  };

  if (loading) return <Loader label="Settings load ho rahi hain…" />;

  const setPlan = (i, patch) => setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  return (
    <>
      <div className="card card-pad stack gap-12">
        <div className="flex-row gap-8">
          <Sparkles size={15} color="var(--brand-2)" />
          <span className="row-title">Branding</span>
        </div>
        <div className="flex-row gap-12 wrap" style={{ alignItems: 'center' }}>
          <span className="logo-preview">
            {logoFile
              ? <img src={URL.createObjectURL(logoFile)} alt="" />
              : values.logo_file
                ? <img src={`/api/files/${values.logo_file}`} alt="" />
                : <b>{(values.site_name || 'Z').trim().charAt(0).toUpperCase()}</b>}
          </span>
          <div className="stack gap-6 grow" style={{ minWidth: 180 }}>
            <label className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }}>
              <input
                type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              />
              <Upload size={13} /> {logoFile ? logoFile.name.slice(0, 20) : 'Upload logo'}
            </label>
            <span className="hint">Square PNG/SVG (512×512). Logo brand naam ke aage aur loading screen par dikhta hai.</span>
          </div>
          {values.logo_file && !logoFile && (
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => act(async () => {
                await api.post('/api/admin/settings', { remove_logo: '1' });
                await load();
              }, 'Logo hata diya')}
            >
              <Trash2 size={12} /> Remove logo
            </button>
          )}
        </div>
      </div>

      <div className="card card-pad stack gap-12">
        <div className="flex-row gap-8"><Server size={15} color="var(--info)" /><span className="row-title">Store & prices</span></div>
        <div className="flex-row gap-10 wrap">
          {FIELDS.map((f) => (
            <div className="field grow" key={f.key} style={{ minWidth: 150 }}>
              <span className="label">{f.label}</span>
              <input
                className="input"
                value={values[f.key] ?? ''}
                placeholder="not set"
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              {f.hint && <span className="hint">{f.hint}</span>}
            </div>
          ))}
        </div>

        <div className="flex-row gap-12 wrap" style={{ alignItems: 'center' }}>
          <span className="logo-preview" style={{ borderRadius: 12 }}>
            {qrFile
              ? <img src={URL.createObjectURL(qrFile)} alt="" />
              : values.upi_qr_image
                ? <img src={`/api/files/${values.upi_qr_image}`} alt="" />
                : <QrCode size={20} />}
          </span>
          <div className="stack gap-6 grow" style={{ minWidth: 180 }}>
            <label className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }}>
              <input type="file" hidden accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setQrFile(e.target.files?.[0] || null)} />
              <Upload size={13} /> {qrFile ? qrFile.name.slice(0, 20) : 'Upload UPI QR'}
            </label>
            <span className="hint">Wallet page ke "Scan & pay" card me ye QR dikhta hai.</span>
          </div>
        </div>
      </div>

      {/* Deploy Bot plans */}
      <div className="card card-pad stack gap-12">
        <div className="admin-card-head">
          <div className="flex-row gap-8"><Bot size={15} color="var(--brand-2)" /><span className="row-title">Deploy Bot plans</span></div>
          <label className="flex-row gap-8" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
            <input
              type="checkbox"
              checked={String(values.deploy_bot_enabled ?? '1') !== '0'}
              onChange={(e) => setValues((v) => ({ ...v, deploy_bot_enabled: e.target.checked ? '1' : '0' }))}
            />
            Service ON
          </label>
        </div>

        {plans.map((p, i) => (
          <div className="flex-row gap-8 wrap" key={p.key || i}>
            <div className="field grow" style={{ minWidth: 130 }}>
              <span className="label">Plan name</span>
              <input className="input" value={p.name || ''} onChange={(e) => setPlan(i, { name: e.target.value })} />
            </div>
            <div className="field" style={{ minWidth: 88 }}>
              <span className="label">Price ₹</span>
              <input className="input" inputMode="numeric" value={p.price ?? ''} onChange={(e) => setPlan(i, { price: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div className="field" style={{ minWidth: 88 }}>
              <span className="label">Days</span>
              <input className="input" inputMode="numeric" value={p.days ?? ''} onChange={(e) => setPlan(i, { days: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div className="field grow" style={{ minWidth: 170 }}>
              <span className="label">Perks (comma se alag)</span>
              <input
                className="input"
                value={(p.perks || []).join(', ')}
                onChange={(e) => setPlan(i, { perks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          </div>
        ))}
        <span className="hint">Plans Deploy Bot tab par isi order me dikhte hain. Service OFF karte hi users ko form band dikhta hai.</span>
      </div>

      <button className="btn btn-primary btn-block btn-lg" onClick={save} disabled={busy}>
        <Save size={15} /> {busy ? 'Saving…' : 'Save all settings'}
      </button>

      <Notice tone="info">
        <RefreshCw size={13} style={{ verticalAlign: -2 }} /> Bot token aur log channel purane admin dashboard se
        manage hote hain. Logo, QR, prices aur deploy plans yahin se.
      </Notice>
    </>
  );
}
