import React, { useEffect, useState } from 'react';
import { Server, Save, Upload, Trash2, QrCode, RefreshCw, Sparkles, FileCode, CheckCircle2 } from 'lucide-react';
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

// Ye settings FormData me alag se jaate hain (input field nahi, selection hai).
const EXTRA_SAVE_KEYS = ['loading_html_file'];

/** Store settings — branding (logo), payments aur prices. */
export default function SettingsTab({ act }) {
  const { addToast } = useToast();
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [qrFile, setQrFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const flat = (await admin.settings()) || {};
      setValues(flat);
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
      EXTRA_SAVE_KEYS.forEach((k) => { if (values[k] !== undefined) fd.append(k, values[k]); });
      if (logoFile) fd.append('logo', logoFile);
      if (qrFile) fd.append('upi_qr_image', qrFile);
      if (loadingFile) fd.append('loading_html', loadingFile);
      await api.postForm('/api/admin/settings', fd);
      addToast('Settings save ho gayi — panel me turant live', 'success');
      setLogoFile(null);
      setQrFile(null);
      setLoadingFile(null);
      await load();
    } catch (err) {
      addToast(err.message || 'Save fail hua', 'error');
    } finally { setBusy(false); }
  };

  if (loading) return <Loader label="Settings load ho rahi hain…" />;


  return (
    <>
      <div className="card card-pad stack gap-12">
        <div className="flex-row gap-8">
          <Sparkles size={15} color="var(--brand-2)" />
          <span className="row-title">Branding</span>
        </div>

        <div className="brand-upload">
          <span className="logo-preview brand-upload-preview">
            {logoFile
              ? <img src={URL.createObjectURL(logoFile)} alt="" />
              : values.logo_file
                ? <img src={`/api/files/${values.logo_file}`} alt="" />
                : <b>{(values.site_name || 'Z').trim().charAt(0).toUpperCase()}</b>}
          </span>

          <div className="brand-upload-info">
            <div className="brand-upload-title">Brand logo</div>
            <div className="brand-upload-status">
              {logoFile
                ? `${logoFile.name.slice(0, 24)} — save karte hi live ho jaayega`
                : values.logo_file
                  ? 'Logo set hai — header aur loading screen par dikh raha hai'
                  : 'Abhi koi logo nahi hai — neeche se upload karein'}
            </div>
            <div className="flex-row gap-8 wrap" style={{ marginTop: 6 }}>
              <label className="btn btn-soft btn-sm">
                <input
                  type="file" hidden accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                />
                <Upload size={13} /> {logoFile ? 'Change file' : 'Upload logo'}
              </label>
              {values.logo_file && !logoFile && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => act(async () => {
                    await api.post('/api/admin/settings', { remove_logo: '1' });
                    await load();
                  }, 'Logo hata diya')}
                >
                  <Trash2 size={12} /> Remove
                </button>
              )}
            </div>
            <span className="hint">Square PNG / SVG (512×512 best). Logo brand naam ke aage aur loading screen par dikhta hai.</span>
          </div>
        </div>
      </div>

      {/* ── Loading screen — har APK ke start hone par ye HTML dikhta hai ── */}
      <div className="card card-pad stack gap-12">
        <div className="flex-row gap-8">
          <FileCode size={15} color="var(--ok)" />
          <span className="row-title">Loading screen (APK)</span>
        </div>

        <div className="brand-upload">
          <span className="logo-preview brand-upload-preview" style={{ fontSize: 22 }}>
            <FileCode size={24} />
          </span>

          <div className="brand-upload-info">
            <div className="brand-upload-title">Loading HTML file</div>
            <div className="brand-upload-status">
              {loadingFile
                ? `${loadingFile.name.slice(0, 26)} — save karte hi naye builds me lag jaayega`
                : values.loading_html_file
                  ? `Set hai: ${values.loading_html_file} — har naye APK me yahi loading screen lagti hai`
                  : 'Set nahi hai — built-in default loading screen use hogi'}
            </div>

            <div className="flex-row gap-8 wrap" style={{ marginTop: 6 }}>
              <label className="btn btn-soft btn-sm">
                <input
                  type="file" hidden accept=".html,.htm,text/html"
                  onChange={(e) => setLoadingFile(e.target.files?.[0] || null)}
                />
                <Upload size={13} /> {loadingFile ? 'Change file' : 'Upload loading HTML'}
              </label>
            </div>

            {(values.loading_html_files || []).length > 0 && (
              <div className="stack gap-4" style={{ marginTop: 8 }}>
                <span className="hint">Server par maujood loading files (koi ek chun lein):</span>
                <div className="flex-row gap-6 wrap">
                  {(values.loading_html_files || []).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`chip ${values.loading_html_file === f ? 'chip-ok' : 'chip-brand'}`}
                      style={{ cursor: 'pointer', border: 0 }}
                      onClick={() => setValues((v) => ({ ...v, loading_html_file: f }))}
                    >
                      {values.loading_html_file === f && <CheckCircle2 size={11} />} {f}
                    </button>
                  ))}
                </div>
                <span className="hint">Ye selection Save karte hi live ho jaati hai (upload kiye bina bhi).</span>
              </div>
            )}

            <span className="hint">
              Har APK isi file ko loading screen ki tarah dikhata hai. File delete/missing ho jaaye to
              build fail nahi hoti — built-in default loading screen lag jaati hai.
            </span>
          </div>
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

      <button className="btn btn-primary btn-block btn-lg" onClick={save} disabled={busy}>
        <Save size={15} /> {busy ? 'Saving…' : 'Save all settings'}
      </button>

      <Notice tone="info">
        <RefreshCw size={13} style={{ verticalAlign: -2 }} /> Changes save karte hi store panel par live ho jaate hain.
      </Notice>
    </>
  );
}
