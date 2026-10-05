import React, { useEffect, useState } from 'react';
import {
  Bot, Send, KeyRound, UserCog, BadgeCheck, Sparkles, ArrowRight, ShieldCheck,
  Clock, Rocket, Zap, RefreshCw
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { SectionHead, Notice, Spinner, EmptyState } from '../components/ui';
import { useToast } from '../components/Toast';
import { api, fmtDate, statusOf } from '../lib/api';

/**
 * Deploy Bot — home page ka welcome-message bot module.
 *
 * User apna bot token + admin telegram ID deta hai, request server par save hoti
 * hai (bot_deploy_requests) aur admin ko Telegram par notify hota hai. Deploy
 * hone par status yahin update dikhta hai.
 */
export default function DeployBotView({ setTab }) {
  const { config } = useStore();
  const { addToast } = useToast();

  const [plans, setPlans] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [adminId, setAdminId] = useState('');
  const [planKey, setPlanKey] = useState('');

  const loadPlans = async () => {
    try {
      const data = await api.get('/api/deploy-bot/plans');
      setPlans(Array.isArray(data?.plans) ? data.plans : []);
      setEnabled(data?.enabled !== false);
      setPlanKey((prev) => prev || data?.plans?.[0]?.key || '');
    } catch (_) { /* silent */ }
  };

  const loadRows = async () => {
    try {
      const data = await api.get('/api/me/bot-deploys');
      setRows(Array.isArray(data) ? data : []);
    } catch (_) { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { loadPlans(); loadRows(); }, []);

  const plan = plans.find((p) => p.key === planKey) || plans[0];

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { addToast('Client / bot name likhein', 'error'); return; }
    if (!token.trim()) { addToast('Bot token daalein (@BotFather se)', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/api/me/bot-deploys', {
        bot_name: name.trim(),
        bot_token: token.trim(),
        admin_tg_id: adminId.trim(),
        plan_key: plan?.key
      });
      addToast('Request bhej di — admin deploy karke aapko batayega', 'success');
      setName(''); setToken(''); setAdminId('');
      await loadRows();
    } catch (err) {
      addToast(err.message || 'Request nahi gayi — dobara try karein', 'error');
    } finally { setBusy(false); }
  };

  return (
    <>
      <SectionHead
        icon={Bot}
        title="Deploy Bot"
        sub="Apna welcome-message bot 24×7 live karwaein — bot token bhejein, baaki hum karte hain"
        action={
          <button className="btn btn-soft btn-xs" onClick={() => { setLoading(true); loadRows(); loadPlans(); }}>
            <RefreshCw size={13} /> Refresh
          </button>
        }
      />

      <section className="deploy-hero">
        <div className="deploy-hero-glow" aria-hidden="true" />
        <div className="deploy-hero-top">
          <span className="deploy-ico"><Bot size={22} /></span>
          <div>
            <div className="deploy-hero-title">Welcome Message Bot</div>
            <div className="deploy-hero-sub">Auto welcome · buttons · anti-spam · 24×7 uptime</div>
          </div>
        </div>
        <div className="deploy-points">
          <span><Zap size={13} /> 5 min deploy</span>
          <span><ShieldCheck size={13} /> Safe token handling</span>
          <span><Clock size={13} /> Round-the-clock uptime</span>
        </div>
      </section>

      {!enabled && (
        <Notice tone="warn">Deploy bot service filhal band hai.</Notice>
      )}

      {/* Plans */}
      <section className="section">
        <SectionHead icon={Sparkles} title="Choose plan" sub="Plan ke hisaab se bot features aur validity" />
        <div className="plan-grid">
          {plans.map((p, i) => (
            <button
              key={p.key}
              type="button"
              className={`plan-card rise-in ${plan?.key === p.key ? 'active' : ''}`}
              style={{ animationDelay: `${i * 55}ms` }}
              onClick={() => setPlanKey(p.key)}
            >
              {i === 1 && <span className="plan-flag">POPULAR</span>}
              <span className="plan-name">{p.name}</span>
              <span className="plan-price">₹{Number(p.price || 0).toLocaleString('en-IN')}</span>
              <span className="plan-days">{p.days} days validity</span>
              <ul className="plan-perks">
                {(p.perks || []).map((perk) => (
                  <li key={perk}><BadgeCheck size={12} /> {perk}</li>
                ))}
              </ul>
              <span className="plan-cta">
                {plan?.key === p.key ? 'Selected' : 'Select'}
                <ArrowRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Request form */}
      <section className="section">
        <SectionHead icon={KeyRound} title="Bot details" sub="Teeno details sahi honi chahiye warna bot start nahi hota" />
        <form className="card card-pad stack gap-12 deploy-form" onSubmit={submit}>
          <div className="field">
            <span className="label">Client / bot name *</span>
            <div className="search-wrap">
              <UserCog size={15} className="ico" />
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Store"
                maxLength={40}
              />
            </div>
            <span className="hint">Ye naam bot ke welcome message me dikhega.</span>
          </div>

          <div className="field">
            <span className="label">Bot token *</span>
            <div className="search-wrap">
              <KeyRound size={15} className="ico" />
              <input
                className="input mono"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:AA... (BotFather se)"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <span className="hint">@BotFather → /newbot → token copy karke yahan paste karein.</span>
          </div>

          <div className="field">
            <span className="label">Your Telegram ID (admin)</span>
            <div className="search-wrap">
              <Send size={15} className="ico" />
              <input
                className="input"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 8015937475"
                inputMode="numeric"
              />
            </div>
            <span className="hint">@userinfobot se apni numeric ID mil jaati hai — bot ke admin commands isi se chalte hain.</span>
          </div>

          <div className="deploy-summary">
            <span className="dim">Selected plan</span>
            <b>{plan ? `${plan.name} · ₹${plan.price}` : '—'}</b>
          </div>

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy || !enabled}>
            {busy ? <Spinner /> : <Rocket size={16} />}
            {busy ? 'Sending request…' : 'Request deploy'}
          </button>
          <span className="hint" style={{ textAlign: 'center' }}>
            Payment aur setup admin confirm karega — status niche dikh jaayega.
          </span>
        </form>
      </section>

      {/* My requests */}
      <section className="section">
        <SectionHead icon={Clock} title="My deploy requests" sub={`${rows.length} total`} />
        {loading ? (
          <div className="center-pad"><Spinner /> <span>Loading…</span></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Abhi koi request nahi"
            text="Upar form bhar kar apna pehla bot deploy karwaein — 5 minute me live." />
        ) : (
          <div className="stack gap-8">
            {rows.map((r) => {
              const st = r.status === 'active' || r.status === 'deployed'
                ? { label: 'Live', tone: 'ok' }
                : r.status === 'rejected' || r.status === 'failed'
                  ? { label: 'Rejected', tone: 'danger' }
                  : (statusOf(r.status) || { label: 'Pending', tone: 'warn' });
              return (
                <div className="row-item" key={r.id}>
                  <span className="row-ico info"><Bot size={16} /></span>
                  <span className="row-main">
                    <span className="row-title truncate">{r.bot_name}</span>
                    <span className="row-sub truncate">
                      {r.plan_name} · #{r.id} · {fmtDate(r.created_at)}
                    </span>
                  </span>
                  <span className={`status ${st.tone}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="trust-strip">
        <ShieldCheck size={15} color="var(--ok)" />
        <span>Token sirf deploy ke liye store hota hai aur kabhi public nahi hota.</span>
      </div>

      {config?.support_url && (
        <button className="btn btn-outline btn-block" onClick={() => setTab('account')}>
          <Send size={15} /> Support se baat karein
        </button>
      )}
    </>
  );
}
