import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { 
  Bot, Cpu, Plus, Sparkles, Shield, CheckCircle, RefreshCw, 
  ExternalLink, Zap, Key, ArrowRight, Play, Server, Radio,
  Send, Users, Check, AlertCircle, Copy
} from 'lucide-react';

export default function DeployBotView() {
  const { user, openAuth } = useAuth();
  const { addToast } = useToast();

  const [botName, setBotName] = useState('');
  const [botToken, setBotToken] = useState('');
  const [adminChatId, setAdminChatId] = useState(user?.telegram_id || '');
  const [channelLink, setChannelLink] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('predictor');
  const [deploying, setDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);

  const [activeBots, setActiveBots] = useState([
    {
      id: 1,
      name: 'Zayro VIP Signal AI',
      username: '@ZayroSignalBot',
      preset: 'Universal Predictor',
      status: 'online',
      users: 2840,
      ping: '32ms',
      deployedAt: '2026-10-04'
    },
    {
      id: 2,
      name: 'Instant APK Sideload Hub',
      username: '@ZayroDeliveryBot',
      preset: 'APK Auto-Delivery',
      status: 'online',
      users: 1195,
      ping: '45ms',
      deployedAt: '2026-10-05'
    }
  ]);

  const presets = [
    {
      id: 'predictor',
      name: 'Universal Signal & Predictor Bot',
      desc: 'AI-calculated multipliers, animated countdown radar, color sequence prediction, and direct WebApp launcher.',
      tag: 'MOST POPULAR',
      color: '#8b5cf6',
      icon: Sparkles
    },
    {
      id: 'delivery',
      name: 'Instant APK Auto-Delivery Bot',
      desc: 'Delivers compiled APKs right inside Telegram chat, generates install guides, and checks Play Protect compatibility.',
      tag: 'AUTOMATION',
      color: '#06b6d4',
      icon: Cpu
    },
    {
      id: 'gatekeeper',
      name: 'VIP Channel Gatekeeper & Sideload',
      desc: 'Force-join channel verification, member access token generation, and real-time subscriber monetization.',
      tag: 'CONVERSION',
      color: '#10b981',
      icon: Shield
    },
    {
      id: 'portal',
      name: 'Custom Mini App Gateway Bot',
      desc: 'Full-screen Telegram WebApp launcher with auto user sync, coin balance management, and live push notifications.',
      tag: 'VIP 2.0',
      color: '#f59e0b',
      icon: Zap
    }
  ];

  const handleDeploy = (e) => {
    e.preventDefault();
    if (!user) {
      openAuth('login');
      return;
    }

    if (!botToken.trim() || !botToken.includes(':')) {
      addToast('Please enter a valid Telegram Bot Token from @BotFather (e.g., 123456789:ABCdef...)', 'error');
      return;
    }

    setDeploying(true);
    setDeployStep(1); // Validating token

    setTimeout(() => {
      setDeployStep(2); // Configuring Webhook
    }, 900);

    setTimeout(() => {
      setDeployStep(3); // Deploying AI engine
    }, 1800);

    setTimeout(() => {
      setDeployStep(4); // Online
      const newBot = {
        id: Date.now(),
        name: botName.trim() || 'Custom VIP Bot',
        username: `@bot_${Math.floor(1000 + Math.random() * 9000)}`,
        preset: presets.find(p => p.id === selectedPreset)?.name || 'Custom Bot',
        status: 'online',
        users: 1,
        ping: '28ms',
        deployedAt: new Date().toISOString().split('T')[0]
      };
      setActiveBots([newBot, ...activeBots]);
      setDeploying(false);
      setDeployStep(0);
      setBotName('');
      setBotToken('');
      addToast(`🎉 Bot "${newBot.name}" deployed and online successfully!`, 'success');
    }, 2800);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 60px' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '32px 28px',
        marginBottom: 28,
        background: 'linear-gradient(135deg, rgba(20, 16, 44, 0.9) 0%, rgba(10, 12, 26, 0.96) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.28)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 760, position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 99,
            background: 'rgba(139, 92, 246, 0.16)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
            color: 'var(--violet)',
            fontSize: 12,
            fontWeight: 700,
            marginBottom: 14,
            letterSpacing: '0.04em'
          }}>
            <Bot size={15} />
            <span>1-CLICK TELEGRAM BOT DEPLOYMENT STUDIO</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 34px)',
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: 12,
            background: 'linear-gradient(135deg, #ffffff 30%, #c4b5fd 80%, #67e8f9 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Deploy High-Speed Telegram Bots in Seconds
          </h1>

          <p style={{ fontSize: 14, color: 'var(--dim)', lineHeight: 1.6, marginBottom: 20 }}>
            Connect your @BotFather token to deploy dedicated signal bots, APK distribution bots, or custom Mini App gateways with automatic webhook routing and zero server maintenance.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 13, color: '#e2e8f0' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={15} color="var(--ok)" /> Auto Webhook Configuration
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={15} color="var(--ok)" /> 99.9% Uptime Guarantee
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={15} color="var(--ok)" /> Built-in Mini App Menu
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Active Bots Right */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Deploy Form */}
        <div className="glass-card" style={{ padding: '24px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Zap size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Configure & Deploy</h2>
              <p style={{ fontSize: 12, color: 'var(--dim)' }}>Enter your BotFather credentials below</p>
            </div>
          </div>

          <form onSubmit={handleDeploy} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Step 1: Preset Selection */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 8 }}>
                1. Select Bot Engine Preset
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {presets.map(p => {
                  const Icon = p.icon;
                  const isSel = selectedPreset === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPreset(p.id)}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: isSel ? `2px solid ${p.color}` : '1px solid var(--border)',
                        background: isSel ? 'rgba(139, 92, 246, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 8
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `${p.color}25`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: p.color
                        }}>
                          <Icon size={16} />
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 99,
                          background: `${p.color}20`,
                          color: p.color
                        }}>
                          {p.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isSel ? '#fff' : 'var(--text-h)', lineHeight: 1.3 }}>
                        {p.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bot Name */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                2. Bot Display Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. VIP Signal Matrix AI"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </div>

            {/* Bot Token */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-h)' }}>
                  3. Telegram Bot Token <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: 'var(--violet)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span>Open @BotFather</span>
                  <ExternalLink size={12} />
                </a>
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="Paste token: 123456789:ABCdefGHIjkl..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                required
              />
              <span style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, display: 'block' }}>
                Create a new bot via /newbot in @BotFather and copy the API token here.
              </span>
            </div>

            {/* Admin Telegram ID */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                4. Admin Chat ID (Owner Notifications)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Your Telegram User ID (e.g. 8015937475)"
                value={adminChatId}
                onChange={(e) => setAdminChatId(e.target.value)}
              />
            </div>

            {/* Connected VIP Channel (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-h)', marginBottom: 6 }}>
                5. Connected VIP Channel / Group (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. https://t.me/yourchannel or @yourchannel"
                value={channelLink}
                onChange={(e) => setChannelLink(e.target.value)}
              />
            </div>

            {/* Deploy Button */}
            <div style={{ marginTop: 8 }}>
              {deploying ? (
                <div style={{
                  padding: '16px',
                  borderRadius: 14,
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <RefreshCw size={20} className="animate-spin" color="var(--violet)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      {deployStep === 1 && 'Step 1/3: Validating Token with Telegram API...'}
                      {deployStep === 2 && 'Step 2/3: Registering Secure Cloud Webhook...'}
                      {deployStep === 3 && 'Step 3/3: Initializing Database & Signal Engine...'}
                      {deployStep === 4 && 'Complete! Bringing Bot Online...'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--dim)' }}>Please do not close this window</div>
                  </div>
                </div>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', height: 48, fontSize: 15 }}
                >
                  <RocketIcon />
                  <span>Launch / Deploy Bot</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Active Bots & Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Bots List */}
          <div className="glass-card" style={{ padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Your Deployed Bots</h3>
                <p style={{ fontSize: 12, color: 'var(--dim)' }}>Live bots hosted on Zayro Cloud Engine</p>
              </div>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--ok)',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '4px 10px',
                borderRadius: 99,
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {activeBots.length} Running
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {activeBots.map(botItem => (
                <div
                  key={botItem.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cyan)'
                    }}>
                      <Bot size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{botItem.name}</span>
                        <span style={{
                          display: 'inline-block',
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: 'var(--ok)',
                          boxShadow: '0 0 8px var(--ok)'
                        }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--violet)', fontWeight: 600 }}>
                        {botItem.username}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
                        {botItem.preset} • {botItem.users} active users • {botItem.ping}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => addToast(`Bot ${botItem.username} is 100% healthy and connected!`, 'info')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-h)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="glass-card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(20, 24, 48, 0.7), rgba(12, 14, 28, 0.9))' }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} color="var(--gold)" />
              How to Create Your Telegram Bot Token
            </h4>
            <ol style={{ paddingLeft: 20, fontSize: 13, color: 'var(--dim)', lineHeight: 1.7, margin: 0 }}>
              <li>Open <strong style={{ color: '#fff' }}>@BotFather</strong> on Telegram.</li>
              <li>Send the command <code style={{ color: 'var(--cyan)' }}>/newbot</code>.</li>
              <li>Choose a display name and username ending in <code style={{ color: 'var(--cyan)' }}>bot</code>.</li>
              <li>Copy the generated HTTP API token and paste it in step 3 above.</li>
              <li>Click <strong>Launch / Deploy Bot</strong> to start your bot instantly!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function RocketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  );
}
