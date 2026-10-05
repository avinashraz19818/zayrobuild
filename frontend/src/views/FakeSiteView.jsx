import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Globe, Plus, ExternalLink, Copy, Check, Sparkles, Shield, RefreshCw, Zap, ArrowRight } from 'lucide-react';

export default function FakeSiteView() {
  const { user, openAuth } = useAuth();
  const { addToast } = useToast();

  const [copiedId, setCopiedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [siteTitle, setSiteTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('prediction');

  const templates = [
    {
      id: 'prediction',
      name: 'Universal Prediction & Radar Portal',
      desc: 'High-converting clone landing page with animated radar signal, live win ticker, and direct APK download button.',
      tag: 'HOT PRO',
      color: '#06b6d4',
      preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'
    },
    {
      id: 'aviator',
      name: 'Flight Signal AI Pro Landing Page',
      desc: 'Plane takeoff animation, multiplier coefficient predictions, and automatic registration link gating.',
      tag: 'VIP ACCESS',
      color: '#8b5cf6',
      preview: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&q=80'
    },
    {
      id: 'color',
      name: 'Quantum Color Matcher VIP',
      desc: 'Green/Violet/Red statistical trend charts, timer countdown, and text-to-speech sound effects.',
      tag: 'NEW 2.0',
      color: '#ec4899',
      preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80'
    },
    {
      id: 'casino',
      name: 'Dragon Tiger Live Matrix Hub',
      desc: 'Card flip simulation, road map trend analysis, and instant app install prompt.',
      tag: 'FEATURED',
      color: '#f59e0b',
      preview: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'
    }
  ];

  const [mySites, setMySites] = useState([
    {
      id: 1,
      title: 'Zayro VIP Prediction Hub',
      slug: 'zayro-live-radar',
      target: 'https://vip-play.site/register?ref=vip2026',
      visits: 1420,
      conversions: 384,
      status: 'active',
      created: '2026-10-04'
    }
  ]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('Site link copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCreateSite = (e) => {
    e.preventDefault();
    if (!siteTitle.trim() || !targetUrl.trim()) {
      addToast('Please enter both site title and destination URL', 'error');
      return;
    }

    const newSite = {
      id: Date.now(),
      title: siteTitle.trim(),
      slug: siteTitle.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 900 + 100),
      target: targetUrl.trim(),
      visits: 0,
      conversions: 0,
      status: 'active',
      created: new Date().toISOString().split('T')[0]
    };

    setMySites([newSite, ...mySites]);
    setSiteTitle('');
    setTargetUrl('');
    setModalOpen(false);
    addToast('Fake Website deployed successfully! Link is ready.', 'success');
  };

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Hero Header */}
      <div className="glass-panel" style={{
        padding: '28px 24px',
        marginBottom: 28,
        background: 'linear-gradient(135deg, rgba(16, 26, 52, 0.9) 0%, rgba(9, 14, 30, 0.96) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              color: 'var(--cyan-neon)',
              fontSize: 11,
              fontWeight: 700,
              marginBottom: 10
            }}>
              <Globe size={13} />
              <span>DYNAMIC LANDING PAGE ENGINE</span>
            </div>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #ffffff 40%, #7dd3fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Fake Website & Conversion Hub
            </h1>
            <p style={{ fontSize: 13, color: 'var(--dim)', lineHeight: 1.5 }}>
              Generate high-converting clone landing pages. Direct user traffic, bypass ad restrictions, and capture high-intent registrations with custom redirect routing.
            </p>
          </div>

          <button
            className="btn-primary"
            style={{
              padding: '12px 20px',
              fontSize: 14,
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #38bdf8 100%)',
              boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)'
            }}
            onClick={() => {
              if (!user) openAuth('login');
              else setModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Fake Website</span>
          </button>
        </div>
      </div>

      {/* Available Website Templates */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={17} color="var(--cyan-neon)" />
            <span>Available Clone Templates</span>
          </h2>
          <span style={{ fontSize: 12, color: 'var(--dim)' }}>
            4 Ready-to-Deploy Presets
          </span>
        </div>

        <div className="templates-grid">
          {templates.map(tpl => (
            <div key={tpl.id} className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 130, position: 'relative', overflow: 'hidden' }}>
                <img
                  src={tpl.preview}
                  alt={tpl.name}
                  className="card-media-zoom"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease' }}
                />
                <span className="badge-discount" style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: tpl.color,
                  boxShadow: `0 2px 10px ${tpl.color}88`,
                  fontSize: 10
                }}>
                  {tpl.tag}
                </span>
              </div>

              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                    {tpl.name}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--dim)', lineHeight: 1.4 }}>
                    {tpl.desc}
                  </p>
                </div>

                <button
                  className="btn-secondary"
                  style={{ width: '100%', padding: '8px', fontSize: 12, gap: 6 }}
                  onClick={() => {
                    setSelectedTemplate(tpl.id);
                    setSiteTitle(tpl.name);
                    if (!user) openAuth('login');
                    else setModalOpen(true);
                  }}
                >
                  <Zap size={13} color="var(--cyan-neon)" />
                  <span>Deploy This Template</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Deployed Sites List */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={17} color="var(--ok)" />
          <span>My Deployed Fake Websites</span>
        </h2>

        {mySites.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)' }}>
            No fake websites created yet. Tap "Create Fake Website" above to launch your first link!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mySites.map(site => {
              const fullUrl = `${window.location.origin}/fs/${site.slug}`;
              return (
                <div
                  key={site.id}
                  className="glass-panel"
                  style={{
                    padding: 16,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                        {site.title}
                      </h4>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--ok)',
                        fontSize: 10,
                        fontWeight: 700
                      }}>
                        ACTIVE 🟢
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4 }}>
                      Redirect: <code style={{ color: '#38bdf8' }}>{site.target}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--dim)' }}>
                    <div>
                      Visits: <strong style={{ color: '#fff' }}>{site.visits}</strong>
                    </div>
                    <div>
                      Conversions: <strong style={{ color: 'var(--ok)' }}>{site.conversions}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => handleCopy(fullUrl, site.id)}
                    >
                      {copiedId === site.id ? <Check size={13} color="var(--ok)" /> : <Copy size={13} />}
                      <span>{copiedId === site.id ? 'Copied' : 'Copy Link'}</span>
                    </button>

                    <a
                      href={site.target}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      <ExternalLink size={13} />
                      <span>Preview</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: 480, padding: 24, position: 'relative' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
              Deploy New Fake Website
            </h3>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 20 }}>
              Set your title and game target URL. The landing page will automatically sync and route clicks.
            </p>

            <form onSubmit={handleCreateSite} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                  Website Title / Brand
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Daman Prediction VIP Portal"
                  value={siteTitle}
                  onChange={e => setSiteTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--dim)', marginBottom: 6 }}>
                  Target Destination URL (Your Referral / Game Link)
                </label>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://yourgame.site/register?code=123"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #0284c7, #06b6d4)' }}
                >
                  Launch Live Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
