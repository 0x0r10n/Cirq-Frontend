import { useEffect, useMemo, useState } from 'react';
import { Link, Route, Switch, useLocation } from 'wouter';
import { Activity, ArrowUpRight, Bot, ChevronRight, Circle as CircleHelp, Eye, LockKeyhole, LogOut, MessageCircle, Search, Settings2, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';

type Opportunity = {
  name: string;
  protocol: string;
  asset: string;
  apy: string;
  tvl: string;
  score: number;
  verified: boolean;
  risk: string;
};

type Position = {
  name: string;
  protocol: string;
  asset: string;
  value: string;
  pnl: string;
  health: number;
  kind: 'green' | 'amber';
};

const opportunities: Opportunity[] = [
  { name: 'Stable Loop', protocol: 'Aave · Ethereum', asset: 'USDC', apy: '5.84%', tvl: '$184.2m', score: 96, verified: true, risk: 'Low risk' },
  { name: 'Delta Neutral', protocol: 'Mellow · Arbitrum', asset: 'USDC / ETH', apy: '8.17%', tvl: '$62.7m', score: 91, verified: true, risk: 'Measured' },
  { name: 'Basis Vault', protocol: 'Morpho · Base', asset: 'USDC', apy: '7.42%', tvl: '$38.1m', score: 88, verified: true, risk: 'Moderate' },
  { name: 'Rollover Market', protocol: 'Euler · Ethereum', asset: 'USDT', apy: '6.91%', tvl: '$24.8m', score: 72, verified: false, risk: 'Unverified' },
];

const positions: Position[] = [
  { name: 'Stable Loop', protocol: 'Aave · Ethereum', asset: 'USDC', value: '$12,480.00', pnl: '+$284.31', health: 94, kind: 'green' },
  { name: 'Delta Neutral', protocol: 'Mellow · Arbitrum', asset: 'USDC / ETH', value: '$7,219.64', pnl: '+$108.18', health: 87, kind: 'green' },
  { name: 'Basis Vault', protocol: 'Morpho · Base', asset: 'USDC', value: '$3,806.20', pnl: '-$26.44', health: 68, kind: 'amber' },
];

const shortAddress = '0x8F3c…91aD';
const landingMessages = [
  "Every action is simulated before it's signed. Cirq shows you the outcome first — never the other way around.",
  'The agent proposes. You dispose. Cirq can prepare a move. Only your wallet can send it.',
  'Not every market is real. Cirq filters out the noise before it ever reaches you.',
  'Prices come from Chainlink, not a rumor in a pool. Every risk number traces back to a source you can check.',
  'Revoke access in one tap, any time. Your permissions are yours to end whenever you choose.',
];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <img className="brand-mark" src="/assets/cirq-mark.png" alt="Cirq" />
      {!compact && <img className="brand-wordmark" src="/assets/cirq-wordmark.png" alt="Cirq" />}
    </div>
  );
}

function Navigation({ connected, onDisconnect }: { connected: boolean; onDisconnect: () => void }) {
  const [location] = useLocation();
  const links = [
    { href: '/', label: 'Agent chat', icon: MessageCircle },
    { href: '/scanner', label: 'Opportunity scanner', icon: Search },
    { href: '/positions', label: 'Positions', icon: Activity },
    { href: '/settings', label: 'Settings', icon: Settings2 },
  ];
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">Workspace</p>
        <nav className="nav-stack" aria-label="Primary navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-item ${location === href ? 'active' : ''}`}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="agent-status">
          <div className="agent-status-row"><span className="status-dot" /><span>Agent is monitoring</span></div>
          <p>Signals are checked every 15 minutes. Nothing moves without your approval.</p>
          <button className="wallet-mini" onClick={onDisconnect}><Wallet size={13} /> {shortAddress}</button>
        </div>
        <div className="sidebar-footer"><span>Cirq beta</span><CircleHelp size={14} /></div>
      </aside>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={location === href ? 'active' : ''}><Icon aria-hidden="true" /><span>{label.split(' ')[0]}</span></Link>
        ))}
      </nav>
    </>
  );
}

function Topbar({ onDisconnect }: { onDisconnect: () => void }) {
  const [location] = useLocation();
  const current = location === '/' ? 'Agent chat' : location === '/scanner' ? 'Opportunity scanner' : location === '/positions' ? 'Positions' : 'Settings';
  return (
    <header className="topbar">
      <div className="crumb">Workspace <ChevronRight size={13} style={{ verticalAlign: 'middle', margin: '0 4px' }} /> <strong>{current}</strong></div>
      <div className="top-actions">
        <div className="network-pill"><i /> Ethereum mainnet</div>
        <button className="wallet-pill" onClick={onDisconnect} aria-label="Disconnect wallet"><span className="wallet-avatar" />{shortAddress}<X size={12} /></button>
      </div>
    </header>
  );
}

function Layout({ children, onDisconnect }: { children: React.ReactNode; onDisconnect: () => void }) {
  return <div className="app-shell"><Navigation connected onDisconnect={onDisconnect} /><main className="main-shell"><Topbar onDisconnect={onDisconnect} />{children}</main></div>;
}

function LoopVisual() {
  return (
    <div className="loop-visual" aria-label="Cirq agent loop: scan, assess, prepare">
      <div className="loop-label label-top">Scan</div><div className="loop-label label-right">Assess</div><div className="loop-label label-bottom">Prepare</div>
      <div className="orbit"><span className="orbit-node node-a" /><span className="orbit-node node-b" /><span className="orbit-node node-c" /><div className="orbit-core"><img src="/assets/cirq-mark.png" alt="" /></div></div>
    </div>
  );
}

function AgentChat() {
  const [text, setText] = useState('');
  const [messages, setMessages] = useState([
    { body: 'I found 3 opportunities worth your attention.', user: false, time: 'now' },
  ]);
  const [preview, setPreview] = useState(false);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { body: trimmed, user: true, time: 'now' }]);
    setText('');
    if (/deposit|move|prepare|stable|yield/i.test(trimmed)) setPreview(true);
  };

  const choosePrompt = (prompt: string) => {
    setText(prompt);
    window.setTimeout(() => document.querySelector<HTMLInputElement>('.agent-composer input')?.focus(), 0);
  };

  return (
    <div className="agent-home">
      <header className="agent-home-header">
        <img src="/assets/cirq-wordmark.png" alt="Cirq" />
        <div className="agent-header-orb"><img src="/assets/cirq-mark.png" alt="" /></div>
      </header>

      <section className="agent-welcome">
        <p className="eyebrow">Your on-chain co-pilot</p>
        <h1>Good evening.</h1>
        <p>What are we doing today?</p>
      </section>

      <section className="agent-actions" aria-label="Quick actions">
        {[
          { label: 'Find yield', prompt: 'Find me the safest yield opportunity', icon: Sparkles },
          { label: 'Explore loops', prompt: 'Explore the best loop strategies', icon: Activity },
          { label: 'Scan markets', prompt: 'Scan the markets for measured opportunities', icon: Search },
        ].map(({ label, prompt, icon: Icon }) => (
          <button key={label} className="agent-action" onClick={() => choosePrompt(prompt)}>
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </section>

      <section className="agent-thread" aria-label="Cirq recommendations">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`agent-message ${message.user ? 'user' : ''}`}>{message.body}</div>
        ))}
      </section>

      <section className="agent-opportunities" aria-label="Recommended opportunities">
        {opportunities.slice(0, 3).map((item) => (
          <button key={item.name} className="agent-opportunity" onClick={() => choosePrompt(`Tell me more about ${item.name}`)}>
            <div className={`agent-token agent-token-${item.name.toLowerCase().replaceAll(' ', '-')}`}>{item.name.slice(0, 1)}</div>
            <div className="agent-opportunity-copy"><strong>{item.asset === 'USDC / ETH' ? 'NVDA / USDG' : `${item.name === 'Stable Loop' ? 'AAPL' : 'TSLA'} / USDG`}</strong><span>{item.protocol}</span></div>
            <div className="agent-opportunity-metrics"><strong>{item.apy}</strong><span className={item.risk === 'Moderate' ? 'medium' : ''}>{item.risk === 'Moderate' ? 'Medium' : 'Low Risk'}</span></div>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        ))}
      </section>

      {preview && <div className="agent-preview" role="status">
        <div><ShieldCheck size={15} /><strong>Transaction preview ready</strong></div>
        <span>Review the route before anything reaches your wallet.</span>
        <button onClick={() => setPreview(false)} aria-label="Dismiss transaction preview"><X size={15} /></button>
      </div>}

      <form className="agent-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <Sparkles size={16} aria-hidden="true" />
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask Cirq anything..." aria-label="Ask Cirq anything" />
        <button type="submit" aria-label="Send message"><ArrowUpRight size={17} /></button>
      </form>
    </div>
  );
}

function Scanner() {
  const [query, setQuery] = useState('');
  const [showUnverified, setShowUnverified] = useState(false);
  const filtered = useMemo(() => opportunities.filter((item) => (showUnverified || item.verified) && `${item.name} ${item.protocol} ${item.asset}`.toLowerCase().includes(query.toLowerCase())), [query, showUnverified]);
  return (
    <div className="page">
      <div className="page-header"><div><p className="eyebrow">Curated surface</p><h1>Opportunity scanner</h1><p className="subtle">A short list of places worth your attention, ranked by legitimacy before yield.</p></div><button className="secondary-button" onClick={() => setQuery('')}>Refresh signals <Sparkles size={14} style={{ verticalAlign: 'middle', marginLeft: 5 }} /></button></div>
      <div className="filter-bar">
        <div className="search-wrap"><Search aria-hidden="true" /><input className="filter-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search protocols or assets" aria-label="Search opportunities" /></div>
        <label className="toggle"><input type="checkbox" checked={showUnverified} onChange={(event) => setShowUnverified(event.target.checked)} /> Show unverified</label>
      </div>
      <div className="scanner-grid">
        {filtered.map((item) => <article className="glass-card opportunity" key={item.name}>
          <div className="protocol-title"><div className="protocol-icon">{item.name.slice(0, 1)}</div><div><strong>{item.name}</strong><small>{item.protocol}</small></div></div>
          <div><span className="data-label">Asset</span><span className="data-value">{item.asset}</span></div>
          <div><span className="data-label">Current APY</span><span className="data-value">{item.apy}</span></div>
          <div><span className="data-label">Cirq score</span><span className="score"><i />{item.score} / 100</span></div>
          <button className="secondary-button" onClick={() => setQuery(item.name)}>Review <ChevronRight size={13} style={{ verticalAlign: 'middle' }} /></button>
        </article>)}
        {!filtered.length && <div className="glass-card card-pad"><h3>No matches in the curated set</h3><p className="subtle">Try another asset or include unverified opportunities.</p></div>}
      </div>
    </div>
  );
}

function Positions() {
  const [selected, setSelected] = useState(positions[0]);
  return (
    <div className="page">
      <div className="page-header"><div><p className="eyebrow">Your capital, in context</p><h1>Positions</h1><p className="subtle">Health checks, exposure, and the reasons behind each signal.</p></div><div className="badge"><Activity size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Monitoring 3 positions</div></div>
      <div className="positions-layout">
        <section className="position-list">
          {positions.map((position) => <button key={position.name} className="glass-card position-row" onClick={() => setSelected(position)} style={{ textAlign: 'left', border: selected.name === position.name ? '1px solid hsl(81 57% 49%)' : undefined }}>
            <div className="position-main"><div className="protocol-icon">{position.name.slice(0, 1)}</div><div><h3>{position.name}</h3><p className="subtle">{position.protocol} · {position.asset}</p></div></div>
            <div className="position-value"><strong className="data-value">{position.value}</strong><div className={position.kind === 'green' ? 'positive' : 'negative'} style={{ fontSize: 11, marginTop: 5 }}>{position.pnl} <span style={{ color: 'hsl(var(--muted-foreground))' }}>30d</span></div></div>
          </button>)}
        </section>
        <section className="glass-card card-pad">
          <p className="eyebrow">Position health</p><h2>{selected.name}</h2><p className="subtle">{selected.protocol} is within your monitored guardrails.</p>
          <div className="health-meter"><span style={{ width: `${selected.health}%` }} /></div><div className="health-row"><span>Health score</span><strong>{selected.health} / 100</strong></div>
          <div style={{ marginTop: 27, display: 'grid', gap: 15 }}><div><span className="data-label">Exposure</span><span className="data-value">{selected.asset}</span></div><div><span className="data-label">Last review</span><span className="data-value">Today, 09:38</span></div><div><span className="data-label">Cirq note</span><p className="subtle" style={{ margin: 0 }}>{selected.health > 80 ? 'Liquidity and protocol signals remain comfortably inside your preference.' : 'Cirq is watching utilization closely. No action is required yet.'}</p></div></div>
        </section>
      </div>
    </div>
  );
}

function Settings() {
  const [permissions, setPermissions] = useState({ scan: true, prepare: true, notify: true });
  const [revoked, setRevoked] = useState(false);
  const toggle = (key: keyof typeof permissions) => setPermissions((current) => ({ ...current, [key]: !current[key] }));
  return (
    <div className="page">
      <div className="page-header"><div><p className="eyebrow">Guardrails first</p><h1>Settings</h1><p className="subtle">Decide what Cirq can observe, prepare, and bring to your attention.</p></div></div>
      <div className="settings-stack">
        <section className="glass-card setting-card"><header><div><h2>Agent permissions</h2><p className="subtle">Cirq never signs or submits a transaction for you.</p></div><LockKeyhole size={19} /></header>
          {[
            { key: 'scan' as const, title: 'Scan curated opportunities', copy: 'Review protocol health, liquidity, and legitimacy signals.' },
            { key: 'prepare' as const, title: 'Prepare transaction previews', copy: 'Build a clear, reviewable route when you ask for a strategy.' },
            { key: 'notify' as const, title: 'Send position alerts', copy: 'Tell you when a monitored position moves outside its guardrails.' },
          ].map((item) => <div className="permission-row" key={item.key}><div className="permission-copy"><strong>{item.title}</strong><span>{item.copy}</span></div><button className={`switch ${permissions[item.key] ? 'on' : ''}`} onClick={() => toggle(item.key)} aria-label={`${item.title}: ${permissions[item.key] ? 'on' : 'off'}`} aria-pressed={permissions[item.key]}><span /></button></div>)}
        </section>
        <section className="glass-card setting-card"><header><div><h2>Connected wallet</h2><p className="subtle">The wallet used for simulations and transaction previews.</p></div><Wallet size={19} /></header><div className="permission-row"><div className="permission-copy"><strong>{shortAddress}</strong><span>Ethereum mainnet · Connected just now</span></div><button className="secondary-button" onClick={() => setRevoked(true)}><LogOut size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Revoke access</button></div>{revoked && <div className="revoked-note" role="status">Wallet access revoked for this session. Reconnect from the Cirq landing state to continue.</div>}</section>
        <section className="glass-card setting-card"><header><div><h2>Privacy</h2><p className="subtle">Your preferences stay in this browser for this preview.</p></div><Eye size={19} /></header><p className="subtle" style={{ marginBottom: 0 }}>Cirq uses your connected address only to display positions and build reviewable previews. It does not request a private key.</p></section>
      </div>
    </div>
  );
}

function TypewriterFootnote() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visibleText, setVisibleText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const message = landingMessages[messageIndex];
    const finishedTyping = !deleting && visibleText === message;
    const finishedDeleting = deleting && visibleText.length === 0;
    const timeout = window.setTimeout(() => {
      if (finishedDeleting) {
        setDeleting(false);
        setMessageIndex((current) => (current + 1) % landingMessages.length);
      } else if (deleting) {
        setVisibleText(message.slice(0, visibleText.length - 1));
      } else if (finishedTyping) {
        setDeleting(true);
      } else {
        setVisibleText(message.slice(0, visibleText.length + 1));
      }
    }, finishedTyping ? 3200 : deleting ? 48 : 72);

    return () => window.clearTimeout(timeout);
  }, [deleting, messageIndex, visibleText]);

  return (
    <p className="connect-footnote" aria-live="polite">
      <span className="typewriter-copy">{visibleText}</span>
      <span className="typewriter-caret" aria-hidden="true" />
    </p>
  );
}

function Connect({ onConnect }: { onConnect: () => void }) {
  return <main className="connect-screen"><div className="connect-frame"><section className="connect-copy"><div className="connect-brand" aria-label="Cirq"><img src="/assets/cirq-mark.png" alt="" /><img src="/assets/cirq-wordmark.png" alt="Cirq" /></div><div className="connect-content"><img className="connect-hero-wordmark" src="/assets/cirq-wordmark.png" alt="Cirq" /><h1>Save. Earn.<br />Win Real Stocks.</h1><p className="connect-description">AI-managed yield, liquidity pathfinding &amp; loop design on Robinhood Chain.</p><button className="primary-button connect-button" onClick={onConnect}><Wallet size={15} /> Connect Wallet <ArrowUpRight size={17} /></button></div><TypewriterFootnote /></section><section className="connect-visual" aria-label="Cirq intelligence visual"><img src="/assets/cirq-eye.png" alt="A luminous green robotic eye" /></section></div></main>;
}

function App() {
  const [connected, setConnected] = useState(true);
  const [location, setLocation] = useLocation();
  const connect = () => { setConnected(true); setLocation('/'); };
  if (!connected) return <Connect onConnect={connect} />;
  return <Layout onDisconnect={() => setConnected(false)}><Switch><Route path="/" component={AgentChat} /><Route path="/scanner" component={Scanner} /><Route path="/positions" component={Positions} /><Route path="/settings" component={Settings} /><Route><AgentChat /></Route></Switch></Layout>;
}

export default App;