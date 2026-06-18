import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, BarChart2, Play, CheckCircle, ChevronRight,
  Brain, Video, Eye, Target, Shield, Users, Zap, Volume2,
  ArrowUpRight, Menu, X
} from 'lucide-react';

// YouTube icon (not in lucide-react)
const YouTubeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Fake stock chart SVG ──────────────────────────────────────────────────────
const StockChartSVG = () => (
  <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d="M0,90 C30,85 50,70 80,65 C110,60 130,72 160,58 C190,44 210,30 240,22 C270,14 290,28 320,18 C350,8 370,12 400,5" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
    <path d="M0,90 C30,85 50,70 80,65 C110,60 130,72 160,58 C190,44 210,30 240,22 C270,14 290,28 320,18 C350,8 370,12 400,5 L400,120 L0,120Z" fill="url(#chartGrad)" />
    {/* Candlesticks on right side */}
    {[310,325,340,355,370,385].map((x, i) => (
      <g key={x}>
        <rect x={x-3} y={[15,20,12,18,10,8][i]} width="6" height={[18,14,22,16,24,28][i]} fill={i % 2 === 0 ? '#22c55e' : '#ef4444'} rx="1" />
        <line x1={x} y1={[12,17,8,14,6,4][i]} x2={x} y2={[38,38,38,38,38,38][i]} stroke={i % 2 === 0 ? '#22c55e' : '#ef4444'} strokeWidth="1" />
      </g>
    ))}
    {/* Annotation bubbles */}
    <g>
      <rect x="50" y="54" width="90" height="20" rx="10" fill="#1e40af" opacity="0.9"/>
      <text x="95" y="68" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">Strong Support</text>
    </g>
    <g>
      <rect x="185" y="18" width="85" height="20" rx="10" fill="#059669" opacity="0.9"/>
      <text x="227" y="32" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">Breakout ✓</text>
    </g>
    <g>
      <rect x="295" y="6" width="80" height="20" rx="10" fill="#7c3aed" opacity="0.9"/>
      <text x="335" y="20" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">Uptrend 🚀</text>
    </g>
  </svg>
);

// ── Main landing page ─────────────────────────────────────────────────────────
const LandingPage: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/brand/icon_256.png" alt="InvestingAtti" className="w-9 h-9 object-contain" />
            <span className="text-xl font-bold tracking-tight">
              <span className="text-slate-900">Investing</span>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Atti</span>
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#video-reports" className="hover:text-blue-600 transition-colors">Video Reports</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a
              href="https://www.youtube.com/@InvestingAtti"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-semibold transition-colors"
            >
              <YouTubeIcon className="w-4 h-4" />
              YouTube
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link to="/register" className="text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/20">
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileMenuOpen(v => !v)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 flex flex-col gap-4">
            <a href="#features" className="text-sm font-medium text-slate-600">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600">How It Works</a>
            <a href="#video-reports" className="text-sm font-medium text-slate-600">Video Reports</a>
            <a
              href="https://www.youtube.com/@InvestingAtti"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-red-600 flex items-center gap-2"
            >
              <YouTubeIcon className="w-4 h-4" />
              Watch on YouTube
            </a>
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
              <Link to="/login" className="text-sm font-semibold text-center py-2.5 border border-slate-200 rounded-xl">Sign In</Link>
              <Link to="/register" className="text-sm font-bold text-center text-white bg-gradient-to-r from-blue-600 to-blue-500 py-2.5 rounded-xl">Get Started Free</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-8 min-h-screen flex items-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 40%, #ecfeff 100%)' }}>
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-blue-300/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left content */}
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-full mb-6 shadow-sm">
                <Zap className="w-3.5 h-3.5" />
                AI-Powered Stock Research Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight text-slate-900 mb-4">
                AI Stock Research<br />
                <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">Made Simple.</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-lg">
                InvestingAtti explains the <strong className="text-slate-800">U.S. stock market</strong> in simple language so beginner and intermediate investors can invest with <strong className="text-blue-600">clarity</strong> and <strong className="text-blue-600">confidence</strong>.
              </p>

              {/* Feature pills */}
              <div className="flex flex-col gap-3 mb-10">
                {[
                  { icon: Brain, text: 'AI-Powered Analysis', sub: 'Smart insights in seconds' },
                  { icon: Eye, text: 'Easy to Understand', sub: 'Simple language, clear actions' },
                  { icon: Shield, text: 'Built for Investors', sub: 'Beginner-friendly, always' },
                ].map(({ icon: Icon, text, sub }) => (
                  <div key={text} className="flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl px-4 py-3 shadow-sm w-fit">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-4.5 h-4.5 text-blue-600" style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{text}</p>
                      <p className="text-xs text-slate-500">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <Link to="/register"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:scale-105 text-sm">
                  Get Started Free
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link to="/login"
                  className="inline-flex items-center gap-2 text-slate-700 font-semibold hover:text-blue-600 transition-colors text-sm">
                  Sign In
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>

              <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                Research. Learn to Grow. — Free to get started, no credit card required.
              </p>
            </div>

            {/* Right — App mockup card */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-lg">
                {/* Main app mockup card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                  {/* App header */}
                  <div className="bg-slate-900 px-4 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="bg-slate-700 rounded-md px-3 py-1 text-[10px] text-slate-400 flex items-center gap-1.5">
                        <img src="/brand/icon_256.png" alt="" className="w-3 h-3" />
                        InvestingAtti
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {/* Stock header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">AAPL · Apple Inc. · NASDAQ</p>
                        <p className="text-3xl font-black text-slate-900 mt-0.5">$193.42</p>
                        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          +2.31 (+1.21%) Today
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Bullish Trend
                        </div>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="h-28 bg-slate-50 rounded-2xl p-2 mb-4 overflow-hidden">
                      <StockChartSVG />
                    </div>

                    {/* Key levels grid */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Entry Zone', value: '$192.50–$194.50', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Exit Target', value: '$198.50–$203', color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Stop-Loss', value: '$189.00', color: 'text-red-500', bg: 'bg-red-50' },
                      ].map(({ label, value, color, bg }) => (
                        <div key={label} className={`${bg} rounded-xl p-2.5 text-center`}>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                          <p className={`text-[11px] font-black ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* AI Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center">
                          <Brain className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700">AI Summary</span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        AAPL shows <strong>strong bullish momentum</strong> with breakout above $192.50. Upside potential toward $198.50–$203.00 with a favorable risk-reward setup.
                      </p>
                    </div>

                    {/* Confidence gauge */}
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Signal</p>
                        <div className="mt-1.5 w-48 h-2 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)' }}>
                          <div className="w-1/3 h-full flex justify-end pr-0.5 pt-0.5">
                            <div className="w-2 h-2 rounded-full bg-white border-2 border-slate-400 -mt-0.5" />
                          </div>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 w-48">
                          <span>Low Risk</span><span>Moderate</span><span>High Risk</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="w-14 h-14 rounded-full border-4 border-emerald-400 flex items-center justify-center bg-emerald-50">
                          <div className="text-center">
                            <p className="text-base font-black text-emerald-600 leading-none">72%</p>
                            <p className="text-[8px] font-bold text-emerald-500">Good</p>
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">Confidence</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-lg rotate-3">
                  AI-Powered ✨
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="bg-slate-900 py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 120, suffix: '+', label: 'Early Investors' },
            { value: 50, suffix: '+', label: 'Stocks Analyzed Daily' },
            { value: 94, suffix: '%', label: 'Accuracy Rate' },
            { value: 500, suffix: '+', label: 'Reports Generated' },
          ].map(({ value, suffix, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-black text-white mb-1">
                <Counter end={value} suffix={suffix} />
              </p>
              <p className="text-sm text-slate-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem Section ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — problem */}
            <div>
              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-bold px-4 py-2 rounded-full mb-6">
                The Problem
              </div>
              <h2 className="text-4xl lg:text-5xl font-black leading-tight text-slate-900 mb-4">
                Too Much Noise.<br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Not Enough Clarity.</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-8">
                New investors are overwhelmed by complex charts, confusing terms, and scattered information. <strong className="text-blue-600">Where to enter? When to exit? What's next?</strong>
              </p>
              {/* Noise grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Multiple Charts', icon: '📊', items: ['RSI', 'MACD', 'EMA', 'VWAP', 'Bollinger'] },
                  { label: 'News Everywhere', icon: '📰', items: ['Fed Rate Fears', 'Inflation Data', 'Earnings Reports', 'Geopolitical Risk'] },
                  { label: 'Confusing Terms', icon: '❓', items: ['Bull Trap', 'Head & Shoulders', 'Support', 'Resistance', 'Breakout'] },
                  { label: 'Too Many Opinions', icon: '💬', items: ['Buy AAPL at $200?', 'Wait for $190...', 'Dead cat bounce!'] },
                ].map(({ label, icon, items }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
                    <div className="absolute top-2 right-2 text-slate-200 text-2xl font-black">?</div>
                    <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">{icon} {label}</p>
                    <div className="flex flex-wrap gap-1">
                      {items.map(item => (
                        <span key={item} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — solution */}
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
                The InvestingAtti Solution ✓
              </div>
              <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                {/* Card header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold text-sm">Today's U.S. Stock Market Report</p>
                    <span className="bg-white/20 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" /> Updated Today
                    </span>
                  </div>
                  <p className="text-blue-100 text-xs">Apple Inc. (AAPL) – NASDAQ · Clear insights. Simple actions. Confident decisions.</p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Market outlook row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Market Outlook</p>
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">● Bullish</span>
                      <p className="text-[9px] text-slate-500 mt-1.5">Momentum positive across U.S. equities.</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key Levels</p>
                      <p className="text-[9px] text-slate-600"><span className="text-red-500 font-bold">Resist.</span> $198.50–$203</p>
                      <p className="text-[9px] text-slate-600"><span className="text-blue-600 font-bold">Entry</span> $192.50–$194.50</p>
                      <p className="text-[9px] text-slate-600"><span className="text-emerald-600 font-bold">Support</span> $189–$190.60</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Confidence</p>
                      <div className="w-10 h-10 mx-auto rounded-full border-3 border-emerald-400 bg-emerald-50 flex items-center justify-center" style={{ borderWidth: 3 }}>
                        <p className="text-xs font-black text-emerald-600">72%</p>
                      </div>
                      <p className="text-[9px] text-emerald-600 font-bold mt-1">High</p>
                    </div>
                  </div>
                  {/* What to do */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">What to Do</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-1 mb-1"><TrendingUp className="w-3 h-3 text-emerald-600" /><span className="text-[9px] font-bold text-emerald-700">Entry Zone</span></div>
                        <p className="text-[10px] font-black text-emerald-700">$192.50–$194.50</p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Consider buying in this range.</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-1 mb-1"><Target className="w-3 h-3 text-blue-600" /><span className="text-[9px] font-bold text-blue-700">Target</span></div>
                        <p className="text-[10px] font-black text-blue-700">$198.50–$203.00</p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Potential upside based on analysis.</p>
                      </div>
                      <div className="bg-red-50 border border-red-100 rounded-xl p-2.5">
                        <div className="flex items-center gap-1 mb-1"><Shield className="w-3 h-3 text-red-500" /><span className="text-[9px] font-bold text-red-600">Stop Loss</span></div>
                        <p className="text-[10px] font-black text-red-600">$187.30</p>
                        <p className="text-[8px] text-slate-500 mt-0.5">Manage risk and protect capital.</p>
                      </div>
                    </div>
                  </div>
                  {/* Why it matters */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 mb-2">Why This Matters</p>
                    {['Strong earnings momentum', 'Favorable risk-reward setup', 'Key levels aligned with structure'].map(item => (
                      <div key={item} className="flex items-center gap-2 text-[11px] text-slate-600 py-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom feature strip for problem section ────────────────────────── */}
      <div className="bg-white border-y border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Target, label: 'Clear Entry & Exit', sub: 'Know exactly what to do.', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: BarChart2, label: 'Simplified Insights', sub: 'No jargon. Just clarity.', color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: Brain, label: 'AI-Powered Analysis', sub: 'Data-driven. Bias-free.', color: 'text-cyan-600', bg: 'bg-cyan-50' },
            { icon: Users, label: 'Built for New Investors', sub: 'Learn. Grow. Succeed.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIDEO REPORTS SECTION ────────────────────────────────────────────── */}
      <section id="video-reports" className="py-24" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 50%, #ecfeff 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold px-4 py-2 rounded-full mb-6">
                <Video className="w-3.5 h-3.5" />
                AI Video Reports
              </div>
              <h2 className="text-4xl lg:text-5xl font-black leading-tight text-slate-900 mb-4">
                AI Video Reports<br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">That Explain the Story.</span>
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-10">
                Get AI-powered stock video reports that break down market moves, trends, and insights in simple visual stories.
              </p>

              <div className="space-y-4">
                {[
                  { icon: Volume2, label: 'AI Narrated Insights', color: 'bg-purple-500', desc: 'Every report is narrated in plain English' },
                  { icon: TrendingUp, label: 'Trend Analysis', color: 'bg-blue-500', desc: 'Automated technical pattern recognition' },
                  { icon: Eye, label: 'Clear Visuals', color: 'bg-amber-500', desc: 'Charts, annotations, and key levels highlighted' },
                  { icon: Target, label: 'Actionable Takeaways', color: 'bg-cyan-500', desc: 'Know exactly what to watch and when to act' },
                ].map(({ icon: Icon, label, color, desc }) => (
                  <div key={label} className="flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Video report mockup */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
                {/* Video report header */}
                <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    <Zap className="w-3 h-3" />
                    AI VIDEO REPORT
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    Powered by
                    <img src="/brand/icon_256.png" alt="" className="w-4 h-4" />
                    <span className="font-bold text-slate-700">InvestingAtti AI</span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Stock info */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-lg font-black text-slate-900">AAPL MARKET UPDATE</p>
                      <p className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        1.30% ($2.49)
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex justify-end"><span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">Bullish Trend</span></div>
                      {[['PRICE', '$193.42', 'text-slate-700'], ['CHANGE', '+1.30%', 'text-emerald-600'], ['VOLUME', '78.4M', 'text-slate-700'], ['TREND', 'Bullish', 'text-emerald-600']].map(([k, v, c]) => (
                        <div key={k} className="text-right">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">{k}</p>
                          <p className={`text-xs font-black ${c}`}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-32 bg-slate-50 rounded-2xl p-2 mb-4 overflow-hidden">
                    <StockChartSVG />
                    {/* X-axis labels */}
                    <div className="flex justify-between text-[9px] text-slate-400 px-1 mt-1">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map(m => <span key={m}>{m}</span>)}
                    </div>
                  </div>

                  {/* AI Narration */}
                  <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">AI NARRATION</p>
                    {/* Waveform */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                      </div>
                      <div className="flex-1 flex items-center gap-0.5 h-6">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div key={i} className="flex-1 rounded-full bg-blue-400"
                            style={{ height: `${20 + Math.sin(i * 0.8) * 12 + Math.random() * 8}%`, opacity: i < 25 ? 1 : 0.4 }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Apple (AAPL) continues its bullish momentum with strong breakout above key resistance levels. The trend remains positive as long as it holds above <strong>$189.00</strong>. Watch for further upside towards <strong>$198.50 to $203.00.</strong>
                    </p>
                  </div>

                  {/* Video player bar */}
                  <div className="bg-slate-900 rounded-xl px-4 py-2.5 flex items-center gap-3">
                    <Play className="w-4 h-4 text-white shrink-0" fill="white" />
                    <span className="text-[10px] text-slate-400 shrink-0">01:24 / 04:36</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: '32%' }} />
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-3 -left-3 bg-white border border-slate-100 shadow-xl rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Video className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-800">New report ready</p>
                  <p className="text-[9px] text-slate-500">AAPL · Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom feature strip for video section ──────────────────────────── */}
      <div className="bg-white border-y border-slate-100 py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: Video, label: 'AI Video Reports', sub: 'Daily market stories, explained visually', color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: Brain, label: 'Smart Narration', sub: 'AI voices complex data in simple words', color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: TrendingUp, label: 'Visual Insights', sub: 'Charts, trends & signals made easy', color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: Users, label: 'Investor Focused', sub: 'Clear takeaways to make better decisions', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold px-4 py-2 rounded-full mb-4">
              Everything You Need
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Built for Every Investor</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">From complete beginners to active traders — InvestingAtti gives you the tools to invest with confidence.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Brain, title: 'AI-Powered', desc: 'Advanced models analyze thousands of data points to surface actionable insights.', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
              { icon: CheckCircle, title: 'Clear & Simple', desc: 'No jargon. Plain language explanations that anyone can act on immediately.', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
              { icon: Shield, title: 'Trusted Insights', desc: 'Data-driven analysis with transparent confidence scores and risk signals.', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
              { icon: Users, title: 'For Every Investor', desc: 'From beginner to intermediate — always accessible, always actionable.', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className={`${bg} rounded-3xl p-6 border border-white shadow-sm hover:shadow-md transition-all hover:-translate-y-1`}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-slate-900 text-base mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/5 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white/5 rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full mb-6">
            🎉 Free to Get Started
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
            Start Investing with<br />Clarity Today
          </h2>
          <p className="text-blue-100 text-lg mb-10 leading-relaxed">
            Join thousands of investors who use InvestingAtti to cut through the noise and make confident, data-driven decisions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mb-8">
            <Link to="/register"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-sm">
              Create Free Account
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/30 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/20 transition-all text-sm">
              Sign In
            </Link>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-blue-100 text-xs font-medium">
            {['No credit card required', 'Free AI stock analysis', 'Cancel anytime'].map(item => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img src="/brand/icon_256.png" alt="InvestingAtti" className="w-8 h-8 object-contain" />
              <div>
                <p className="text-white font-bold text-sm">
                  Investing<span className="text-blue-400">Atti</span>
                </p>
                <p className="text-xs text-slate-500">Research. Learn to Grow.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-white transition-colors">Get Started</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#video-reports" className="hover:text-white transition-colors">Video Reports</a>
            </div>
            {/* YouTube CTA */}
            <a
              href="https://www.youtube.com/@InvestingAtti"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-red-900/30"
            >
              <YouTubeIcon className="w-4 h-4" />
              Watch on YouTube
            </a>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} InvestingAtti. All rights reserved.</p>
            <a
              href="https://www.youtube.com/@InvestingAtti"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-500 hover:text-red-400 transition-colors flex items-center gap-1.5"
            >
              <YouTubeIcon className="w-3 h-3" />
              youtube.com/@InvestingAtti
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
