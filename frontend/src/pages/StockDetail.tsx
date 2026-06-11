import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Star, Bell, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Globe, Coins, Building2, Activity, Layers, Clock, ShieldAlert, Sparkles, Zap, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { stocksApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, ScoreBar, PriceChange, LoadingSpinner, EmptyState, Skeleton, DataUnavailable, TermTooltip } from '../components/ui';
import { TrendStoryCard } from '../components/TrendStoryCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromContext = location.state?.from || 'direct';
  const { addToWatchlist, watchlist, runAnalysis, analyzing, user } = useAppStore();
  const [report, setReport] = useState<any>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [technicals, setTechnicals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'tactical' | 'insight'>('overview');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isWatchlisted = watchlist.some((w) => w.symbol === symbol);

  useEffect(() => {
    if (!symbol) return;
    loadData();
  }, [symbol]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportData, techData] = await Promise.allSettled([
        stocksApi.getLatestReport(symbol!),
        stocksApi.getTechnicals(symbol!),
      ]);

      let loadedReport = null;
      if (reportData.status === 'fulfilled') {
        loadedReport = reportData.value;
        setReport(loadedReport);
      }
      if (techData.status === 'fulfilled') {
        const td = techData.value as any;
        setTechnicals(td.indicators);
        setCandles(td.candles || []);
      }

    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      await runAnalysis(symbol!, true); // Force bypass cache for fresh analysis
      await loadData();
    } catch {}
  };

  const toggleSection = (key: string) => setExpanded((p) => ({ ...p, [key]: !p[key] }));

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const r = report?.reportJson as any;
  const price = r?.currentPrice || technicals?.vwap;
  const dataQualityRating = r?.dataQuality?.rating;
  const hasInsufficientData =
    dataQualityRating === 'INSUFFICIENT' ||
    (report && !r?.finalRating) ||
    (r && !r.currentPrice && !r.technicalScore && !r.fundamentalScore);

  return (
    <div className="p-6 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            {/* @ts-ignore */}
            <ViewTransition name={`stock-symbol-${fromContext}-${symbol}`} share="text-morph">
              <h1 className="text-3xl font-bold font-mono text-slate-100">{symbol}</h1>
            </ViewTransition>
            {r?.finalRating && <RatingBadge rating={r.finalRating} size="lg" />}
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Analyzing…' : 'Re-analyze'}
            </button>
          </div>
          {price && (
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-200">${price.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {user?.role === 'SUPERUSER' && (
            <>
              <button
                onClick={() => addToWatchlist(symbol!)}
                disabled={isWatchlisted}
                className={isWatchlisted ? 'btn-ghost text-brand-400' : 'btn-secondary'}
              >
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-brand-400' : ''}`} />
                {isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}
              </button>
              <button onClick={() => navigate('/alerts')} className="btn-secondary">
                <Bell className="w-4 h-4" />
                Alert
              </button>
            </>
          )}
        </div>
      </div>

      {!report && (
        <EmptyState
          icon="📊"
          title="No analysis yet"
          description="Run an analysis to see the full report"
          action={<button onClick={handleAnalyze} className="btn-primary">{analyzing ? 'Analyzing…' : 'Run Analysis'}</button>}
        />
      )}

      {hasInsufficientData ? (
        <div className="slide-up">
          <DataUnavailable onRetry={handleAnalyze} />
        </div>
      ) : report ? (
        r?.isFund === true ? (
          <div className="space-y-6 slide-up">
            {/* Fund Header Card */}
            <div className="card-glass p-6 border border-brand-500/10 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-brand-400 font-bold uppercase tracking-wider font-mono">
                    {r.issuer} · ETF / Mutual Fund Review
                  </span>
                  <h2 className="text-2xl font-bold text-slate-100 mt-1">{r.fundName}</h2>
                  <p className="text-xs text-slate-450 mt-1">
                    Benchmark: <span className="font-semibold text-slate-350">{r.benchmarkIndex}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">CONFIDENCE</span>
                    <span className="text-xl font-bold font-mono text-brand-400">{r.finalDecision?.confidenceScore}%</span>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-center">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">RATING</span>
                    <RatingBadge rating={r.finalDecision?.finalRating} size="lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fund Overview Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Expense Ratio', value: r.fundOverview?.expenseRatio, color: 'text-brand-400' },
                { label: 'Estimated AUM', value: r.fundOverview?.aum, color: 'text-indigo-400' },
                { label: 'Dividend Yield', value: r.fundOverview?.dividendYield, color: 'text-emerald-400' },
                { label: 'Inception Date', value: r.fundOverview?.inceptionDate, color: 'text-amber-400' },
              ].map((m) => (
                <div key={m.label} className="stat-card">
                  <div className="stat-label">{m.label}</div>
                  <div className={`stat-value text-lg sm:text-xl font-mono font-bold ${m.color}`}>
                    {m.value || 'N/A'}
                  </div>
                </div>
              ))}
            </div>

            {/* Objective & Decision Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-glass p-5 border border-slate-850 rounded-2xl bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Investment Objective</h3>
                <p className="text-sm text-slate-300 leading-relaxed font-sans">{r.fundOverview?.objective}</p>
              </div>
              <div className="card-glass p-5 border border-slate-850 rounded-2xl bg-slate-900/20">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">Best Action Now</h3>
                <p className="text-sm text-slate-350 leading-relaxed font-sans">{r.finalDecision?.bestActionNow}</p>
                <div className="mt-4 p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Executive Summary</span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{r.finalDecision?.decisionSummary}</p>
                </div>
              </div>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card-glass p-5 border border-emerald-500/10 rounded-2xl">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key Advantages (Pros)
                </h3>
                <ul className="space-y-2.5">
                  {r.pros?.map((pro: string, idx: number) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                      <span className="leading-relaxed">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-glass p-5 border border-red-500/10 rounded-2xl">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" /> Main Risks (Cons)
                </h3>
                <ul className="space-y-2.5">
                  {r.cons?.map((con: string, idx: number) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-2" />
                      <span className="leading-relaxed">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Allocation Breakdowns (Sectors & Holdings) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card p-5 border border-slate-800 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Top Sector Allocations</h3>
                <div className="space-y-3.5">
                  {r.topSectors?.map((sec: any, idx: number) => {
                    const pctFloat = parseFloat(sec.percentage?.replace(/[^0-9.]/g, '')) || 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-300">
                          <span>{sec.sector}</span>
                          <span className="font-mono text-slate-400">{sec.percentage}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-brand-500 rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(0, pctFloat))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(!r.topSectors || r.topSectors.length === 0) && (
                    <div className="text-xs text-slate-500 italic">No sector details provided.</div>
                  )}
                </div>
              </div>

              <div className="card p-5 border border-slate-800 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Top Holdings & Weightings</h3>
                <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto pr-1">
                  {r.topHoldings?.map((h: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 text-xs sm:text-sm text-slate-300">
                      <div>
                        <span className="font-mono font-bold text-brand-400 mr-2">{h.ticker}</span>
                        <span className="text-slate-450">{h.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-200">{h.percentage}</span>
                    </div>
                  ))}
                  {(!r.topHoldings || r.topHoldings.length === 0) && (
                    <div className="text-xs text-slate-500 italic">No holdings details provided.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Layman take and disclaimer */}
            <div className="card p-5 border border-slate-800 rounded-2xl bg-slate-950/25">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Layman's Analogy
              </h3>
              <p className="text-sm text-slate-300 italic leading-relaxed">
                "{r.laymanExplanation}"
              </p>
            </div>

            <div className="text-[11px] leading-relaxed text-slate-500 italic">
              Disclaimer: {r.disclaimer}
            </div>
          </div>
        ) : (
          <>
          {/* Scores Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Technical', value: r?.technicalScore, color: 'text-brand-400' },
              { label: 'Fundamental', value: r?.fundamentalScore, color: 'text-indigo-400' },
              { label: 'News Catalyst', value: r?.newsCatalystScore, color: 'text-amber-400' },
              { label: 'Inst. Flow Proxy', value: r?.institutionalFlowProxyScore, color: 'text-emerald-400' },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-label">{s.label}</div>
                <div className={`stat-value ${s.color}`}>
                  {s.value != null ? s.value.toFixed(0) : 'N/A'}
                  {s.value != null && <span className="text-sm text-slate-500">/100</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          {candles.length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Price Chart (Daily)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={candles.slice(-60)}>
                  <defs>
                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={9} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={55} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#14b8a6' }}
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Close']}
                  />
                  <Area type="monotone" dataKey="close" stroke="#14b8a6" strokeWidth={2} fill="url(#colorClose)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-slate-700/50 overflow-x-auto scrollbar-none">
            <div className="flex gap-1 min-w-max pb-px">
              {(['overview', 'technical', 'tactical', 'insight'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 shrink-0 ${
                    activeTab === tab
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab === 'tactical' 
                    ? 'Tactical Setup' 
                    : tab === 'insight' 
                      ? 'Ecosystem Insights' 
                      : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4 slide-up">
              {r?.trendStory && (
                <TrendStoryCard trendStory={r.trendStory} />
              )}

              <div className="card p-5 sm:p-6 bg-gradient-to-br from-slate-900/80 to-slate-950/80 border-brand-500/10">
                <h3 className="section-title text-slate-300 font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-brand-400" />
                  Executive Summary & Outlook
                </h3>
                <p className="text-[15px] text-slate-200 leading-relaxed sm:leading-loose whitespace-pre-line font-sans font-normal">
                  {r?.executiveSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="section-title mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                    Key Catalysts
                  </h3>
                  <ul className="space-y-3">
                    {(r?.keyCatalysts || []).map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-350">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-sans leading-relaxed">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="card p-5">
                  <h3 className="section-title mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 text-red-400" />
                    Key Risks
                  </h3>
                  <ul className="space-y-3">
                    {(r?.keyRisks || []).map((rk: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-355">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="font-sans leading-relaxed">{rk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card p-5 bg-gradient-to-br from-slate-900/60 to-slate-950/60">
                <h3 className="section-title mb-4 flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-amber-400" />
                  Multibagger Potential Assessment
                </h3>
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                  <div className="shrink-0">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Probability Rating</div>
                    <div className={`text-2xl font-black tracking-wide font-sans ${
                      r?.multibaggerProbability?.rating === 'VERY_HIGH' ? 'text-emerald-400' :
                      r?.multibaggerProbability?.rating === 'HIGH' ? 'text-brand-400' :
                      r?.multibaggerProbability?.rating === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {r?.multibaggerProbability?.rating?.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <p className="text-[14px] text-slate-200 leading-relaxed font-sans font-normal">{r?.multibaggerProbability?.reason}</p>
                    {r?.multibaggerProbability?.requiredConditions?.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-850">
                        <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block">Required Catalyst Conditions:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {r.multibaggerProbability.requiredConditions.map((cond: string, idx: number) => (
                            <div key={idx} className="text-xs text-slate-350 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850 flex items-start gap-2">
                              <span className="text-brand-500 font-mono mt-0.5">•</span>
                              <span>{cond}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Inst. Flow Proxy */}
              <div className="card border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Institutional Flow Proxy (NOT Official Data)</h3>
                </div>
                <p className="text-sm text-slate-300">{r?.institutionalFlowSummary}</p>
              </div>
            </div>
          )}


          {activeTab === 'technical' && technicals && (
            <div className="space-y-4 slide-up">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  {
                    label: 'RSI (14)',
                    value: technicals.rsi14 != null
                      ? `${technicals.rsi14.toFixed(1)}${
                          technicals.rsi14Prev != null
                            ? ` (${technicals.rsi14 > technicals.rsi14Prev ? '↗ reached from ' : technicals.rsi14 < technicals.rsi14Prev ? '↘ reached from ' : '→ flat '} ${technicals.rsi14Prev.toFixed(1)})`
                            : ''
                        }`
                      : '—',
                    alert: technicals.rsi14 < 30 ? 'Oversold' : technicals.rsi14 > 70 ? 'Overbought' : null
                  },
                  { label: 'MACD', value: technicals.macdLine?.toFixed(3) },
                  { label: 'EMA 20', value: technicals.ema20?.toFixed(2) },
                  { label: 'EMA 50', value: technicals.ema50?.toFixed(2) },
                  { label: 'EMA 200', value: technicals.ema200?.toFixed(2) },
                  { label: 'ATR (14)', value: technicals.atr14?.toFixed(2) },
                  { label: 'ADX (14)', value: technicals.adx14?.toFixed(1) },
                  { label: 'Rel. Volume', value: technicals.relVolume?.toFixed(2) + 'x' },
                  { label: 'VWAP', value: technicals.vwap ? '$' + technicals.vwap.toFixed(2) : null },
                ].map((ind) => (
                  <div key={ind.label} className="stat-card">
                    <div className="stat-label">{ind.label}</div>
                    <div className="stat-value text-slate-200 text-base">{ind.value || '—'}</div>
                    {ind.alert && <div className="text-xs text-amber-400">{ind.alert}</div>}
                  </div>
                ))}
              </div>

              <div className="card">
                <h3 className="section-title">
                  Technical Bias:{' '}
                  <TermTooltip term={technicals.overallBias}>
                    <span className={technicals.overallBias === 'BULLISH' ? 'text-emerald-400' : technicals.overallBias === 'BEARISH' ? 'text-red-400' : 'text-amber-400'}>
                      {technicals.overallBias}
                    </span>
                  </TermTooltip>
                </h3>
                 <div className="space-y-2 mt-3 bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                  {(technicals.signals || []).map((s: string, i: number) => {
                    const lowSig = s.toLowerCase();
                    const isBullishSignal = lowSig.includes('bullish') || lowSig.includes('buy') || lowSig.includes('above') || lowSig.includes('over') || lowSig.includes('crossover');
                    const isBearishSignal = lowSig.includes('bearish') || lowSig.includes('sell') || lowSig.includes('below') || lowSig.includes('under') || lowSig.includes('crossunder');
                    return (
                      <div key={i} className="text-sm text-slate-300 flex items-start gap-2.5 py-1 last:border-0 border-b border-slate-900/40">
                        {isBullishSignal ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : isBearishSignal ? (
                          <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <Activity className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                        )}
                        <span className="font-sans leading-relaxed">{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="section-title">Support Levels</h3>
                  {(technicals.supportLevels || []).map((l: number, i: number) => (
                    <div key={i} className="font-mono text-sm text-emerald-400">${l.toFixed(2)}</div>
                  ))}
                  {!technicals.supportLevels?.length && <div className="text-slate-500 text-sm">Insufficient data</div>}
                </div>
                <div className="card">
                  <h3 className="section-title">Resistance Levels</h3>
                  {(technicals.resistanceLevels || []).map((l: number, i: number) => (
                    <div key={i} className="font-mono text-sm text-red-400">${l.toFixed(2)}</div>
                  ))}
                  {!technicals.resistanceLevels?.length && <div className="text-slate-500 text-sm">Insufficient data</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tactical' && (
            <div className="space-y-4 slide-up">
              {/* Short Term */}
              <div className="card">
                <h3 className="section-title">Short-Term View ({r?.shortTermView?.horizon})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  {r?.shortTermView?.entryZone && (
                    <div>
                      <div className="label">Entry Zone</div>
                      <div className="font-mono text-brand-400 font-bold">
                        ${r.shortTermView.entryZone.low?.toFixed(2)} – ${r.shortTermView.entryZone.high?.toFixed(2)}
                      </div>
                      {r.shortTermView.entryZone.description && (
                        <div className="text-xs text-slate-500 mt-0.5">{r.shortTermView.entryZone.description}</div>
                      )}
                    </div>
                  )}
                  {r?.shortTermView?.stopLoss && (
                    <div>
                      <div className="label">Stop Loss</div>
                      <div className="font-mono text-red-400 font-bold">
                        ${(r.shortTermView.stopLoss.price || r.shortTermView.stopLoss.low)?.toFixed(2)}
                      </div>
                    </div>
                  )}
                  {r?.shortTermView?.targets?.[0] && (
                    <div>
                      <div className="label">Target</div>
                      <div className="font-mono text-emerald-400 font-bold">
                        ${r.shortTermView.targets[0].price?.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Swing Trade Setup */}
              {r?.tacticalHorizonView && (() => {
                const th = r.tacticalHorizonView;
                const hasDetailedTactical = !!th.dailyTrend;

                return (
                  <div className="space-y-4">
                    <div className="card border border-brand-500/20 bg-brand-500/5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-brand-400" />
                          <h3 className="section-title mb-0">Swing Trade Setup</h3>
                        </div>
                        <TermTooltip term={th.bias}>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            th.bias === 'BULLISH' ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/30' :
                            th.bias === 'BEARISH' ? 'bg-red-500/25 text-red-400 border border-red-500/30' :
                            th.bias === 'MIXED' ? 'bg-amber-500/25 text-amber-400 border border-amber-500/30' : 'bg-slate-500/25 text-slate-400 border border-slate-700/30'
                          }`}>
                            {th.bias} Bias
                          </span>
                        </TermTooltip>
                      </div>

                      {/* Entry/Exit/Stop Loss Suggestions */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 pb-4 border-b border-slate-700/50">
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/40">
                          <div className="label text-[10px] text-slate-500 uppercase tracking-wider">Current Price</div>
                          <div className="font-mono text-slate-200 font-bold text-lg">
                            {price ? `$${price.toFixed(2)}` : 'N/A'}
                          </div>
                        </div>
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/40">
                          <div className="label text-[10px] text-slate-500 uppercase tracking-wider">Entry / Accumulation</div>
                          <div className="font-mono text-indigo-400 font-bold text-lg">
                            {r.swingTradeView?.accumulationZone?.low != null && r.swingTradeView?.accumulationZone?.high != null
                              ? `$${r.swingTradeView.accumulationZone.low.toFixed(2)} – $${r.swingTradeView.accumulationZone.high.toFixed(2)}`
                              : th.suggestedEntryPrice
                                ? `$${th.suggestedEntryPrice.toFixed(2)}`
                                : 'N/A'}
                          </div>
                          {r.swingTradeView?.accumulationZone?.description && (
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">
                              {r.swingTradeView.accumulationZone.description}
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/40">
                          <div className="label text-[10px] text-slate-500 uppercase tracking-wider">Target Exit</div>
                          <div className="font-mono text-emerald-400 font-bold text-lg">
                            {th.suggestedExitPrice
                              ? `$${th.suggestedExitPrice.toFixed(2)}`
                              : r.swingTradeView?.targets?.[0]?.price
                                ? `$${r.swingTradeView.targets[0].price.toFixed(2)}`
                                : 'N/A'}
                          </div>
                        </div>
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/40">
                          <div className="label text-[10px] text-slate-500 uppercase tracking-wider">Stop Loss</div>
                          <div className="font-mono text-red-400 font-bold text-lg">
                            {th.stopLossPrice
                              ? `$${th.stopLossPrice.toFixed(2)}`
                              : r.swingTradeView?.stopLoss?.price
                                ? `$${r.swingTradeView.stopLoss.price.toFixed(2)}`
                                : r.swingTradeView?.stopLoss?.low
                                  ? `$${r.swingTradeView.stopLoss.low.toFixed(2)}`
                                  : 'N/A'}
                          </div>
                          {r.swingTradeView?.stopLoss?.description && (
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">
                              {r.swingTradeView.stopLoss.description}
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/40 col-span-2 md:col-span-1">
                          <div className="label text-[10px] text-slate-500 uppercase tracking-wider">Risk / Reward</div>
                          <div className="font-bold text-amber-400 text-lg">
                            {r.swingTradeView?.riskReward || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Fallback Banner for old reports */}
                      {!hasDetailedTactical && (
                        <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg text-center my-3">
                          <p className="text-xs text-slate-400 mb-2">
                            This report does not contain the latest detailed timeframe analysis, catalysts, or short squeeze filters.
                          </p>
                          <button onClick={handleAnalyze} disabled={analyzing} className="btn-secondary text-[11px] py-1 px-3">
                            {analyzing ? 'Analyzing…' : 'Generate Detailed Setup now'}
                          </button>
                        </div>
                      )}

                      {/* Timeframe Alignment & Sourcing Details (Only if available) */}
                      {hasDetailedTactical && (() => {
                        const isUpward = th.dailyTrend.trend.toUpperCase().includes('UP') || th.dailyTrend.trend.toUpperCase().includes('BULL');
                        const isDownward = th.dailyTrend.trend.toUpperCase().includes('DOWN') || th.dailyTrend.trend.toUpperCase().includes('BEAR');
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
                            <div className="bg-slate-900/35 p-3 rounded-lg border border-slate-800/60 hover:border-slate-700/40 transition-colors">
                              <div className="flex items-center justify-between gap-2 mb-2 text-slate-350">
                                <div className="flex items-center gap-2">
                                  <span className={`inline-flex items-center justify-center p-1.5 rounded-lg border ${
                                    isUpward
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : isDownward
                                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                        : 'bg-slate-500/20 text-slate-400 border-slate-700/30'
                                  }`}>
                                    {isDownward ? (
                                      <TrendingDown className="w-5 h-5" strokeWidth={3} />
                                    ) : (
                                      <TrendingUp className="w-5 h-5" strokeWidth={3} />
                                    )}
                                  </span>
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Daily Trend</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleSection('dailyTrend')}
                                  className="text-slate-450 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800/40"
                                >
                                  {expanded['dailyTrend'] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="text-xs font-semibold text-slate-200 mb-1">
                                Status: <span className={
                                  isDownward ? 'text-red-400' : isUpward ? 'text-emerald-400' : 'text-slate-400'
                                }>{th.dailyTrend.trend}</span> ({th.dailyTrend.barCount} daily bars)
                              </div>
                              {expanded['dailyTrend'] && (
                                <div className="mt-2 pt-2 border-t border-slate-800/60 space-y-1.5 animate-fade-in">
                                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans text-xs">
                                    <strong className="text-slate-300 font-semibold mr-1">Reasoning / Catalyst:</strong>
                                    {th.dailyTrend.analysis}
                                  </p>
                                  {th.dailyTrend.laymanExplanation && (
                                    <p className="text-[10px] text-slate-450 mt-1.5 pt-1.5 border-t border-slate-800/65 leading-relaxed font-sans italic">
                                      <strong className="text-slate-350 font-medium not-italic mr-1">Layman's Takeaway:</strong>
                                      {th.dailyTrend.laymanExplanation}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="bg-slate-900/35 p-3 rounded-lg border border-slate-800/60 hover:border-slate-700/40 transition-colors">
                              <div className="flex items-center gap-1.5 mb-1.5 text-slate-350">
                                <Activity className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Swing Setup</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-200 mb-1">
                                Pattern: <span className="text-indigo-400">{th.swingSetup.setup}</span> (1H / 4H bars)
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{th.swingSetup.analysis}</p>
                            </div>

                            <div className="bg-slate-900/35 p-3 rounded-lg border border-slate-800/60 hover:border-slate-700/40 transition-colors">
                              <div className="flex items-center gap-1.5 mb-1.5 text-slate-350">
                                <Clock className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Entry Timing</span>
                              </div>
                              <div className="text-xs font-semibold text-slate-200 mb-1">
                                Trigger: <span className="text-emerald-400">{th.entryTiming.trigger}</span> (15M & 5M bars)
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{th.entryTiming.analysis}</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Support / Resistance Levels side by side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Top 5 Support Levels</span>
                            <span className="text-[10px] text-slate-500 font-normal">Nearest first</span>
                          </div>
                          <div className="space-y-1.5 font-mono text-sm">
                            {th.supportLevels && th.supportLevels.length > 0 ? (
                              th.supportLevels.slice(0, 5).map((level: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-emerald-400/90 py-0.5 border-b border-slate-800/30 last:border-0">
                                  <span className="flex items-center gap-1.5">
                                    <span>S{i + 1}</span>
                                    {level.tests != null && (
                                      <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1 py-0.25 rounded font-sans">
                                        Tested {level.tests}x
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-bold">${level.price?.toFixed(2)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-500 text-xs">No levels provided</div>
                            )}
                          </div>
                        </div>

                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Top 5 Resistance Levels</span>
                            <span className="text-[10px] text-slate-500 font-normal">Nearest first</span>
                          </div>
                          <div className="space-y-1.5 font-mono text-sm">
                            {th.resistanceLevels && th.resistanceLevels.length > 0 ? (
                              th.resistanceLevels.slice(0, 5).map((level: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-red-400/90 py-0.5 border-b border-slate-800/30 last:border-0">
                                  <span className="flex items-center gap-1.5">
                                    <span>R{i + 1}</span>
                                    {level.tests != null && (
                                      <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1 py-0.25 rounded font-sans">
                                        Tested {level.tests}x
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-bold">${level.price?.toFixed(2)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-500 text-xs">No levels provided</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Detailed Risk Indicators Card (Only if available) */}
                      {hasDetailedTactical && th.riskMetrics && (
                        <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/70 mb-4 hover:border-slate-700/40 transition-colors">
                          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            Tactical Risk Controls (ATR, S/R, Volume, VWAP)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="text-xs space-y-0.5">
                              <span className="text-slate-500">Average True Range (ATR):</span>
                              <div className="font-mono text-slate-200 font-bold">
                                {th.riskMetrics.atr ? `$${th.riskMetrics.atr.toFixed(2)}` : 'N/A'}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{th.riskMetrics.atrAnalysis}</p>
                            </div>
                            <div className="text-xs space-y-0.5">
                              <span className="text-slate-500">VWAP Anchoring:</span>
                              <div className="font-mono text-slate-200 font-bold">
                                {th.riskMetrics.vwap ? `$${th.riskMetrics.vwap.toFixed(2)}` : 'N/A'}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{th.riskMetrics.vwapAnalysis}</p>
                            </div>
                            <div className="text-xs space-y-0.5">
                              <span className="text-slate-500">S/R & Volume Stability:</span>
                              <div className="font-semibold text-slate-200">
                                {th.riskMetrics.volumeStatus || 'Stable'}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">{th.riskMetrics.supportResistanceAnalysis}</p>
                            </div>
                          </div>
                          <div className="pt-2 border-t border-slate-800/40 text-[11px] text-slate-450 leading-relaxed font-sans">
                            <strong className="text-slate-350 font-semibold text-xs block mb-1">Risk Summary:</strong>
                            {th.riskMetrics.analysis}
                          </div>
                        </div>
                      )}

                      {/* Catalyst & Short Squeeze Filters (Only if available) */}
                      {hasDetailedTactical && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Catalyst Filters */}
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/70 hover:border-slate-700/40 transition-colors">
                            <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                              <Sparkles className="w-4 h-4 text-amber-400" />
                              Catalyst Filter Validation
                            </h4>
                            <div className="space-y-2.5">
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-400 block mb-0.5">News Catalyst Check</span>
                                <p className="text-slate-300 font-sans leading-relaxed">{th.catalysts.news}</p>
                              </div>
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-400 block mb-0.5">Earnings Catalyst Runway</span>
                                <p className="text-slate-300 font-sans leading-relaxed">{th.catalysts.earnings}</p>
                              </div>
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-400 block mb-0.5">SEC Filings & Capital Structure</span>
                                <p className="text-slate-300 font-sans leading-relaxed">{th.catalysts.secFilings}</p>
                              </div>
                            </div>
                          </div>

                          {/* Short / Squeeze Filters */}
                          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/70 hover:border-slate-700/40 transition-colors flex flex-col justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                                <ShieldAlert className="w-4 h-4 text-brand-400" />
                                Short-Selling & Squeeze Filters
                              </h4>
                              <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                                <div className="text-xs">
                                  <span className="text-slate-500">Borrow Fee / Availability:</span>
                                  <div className="font-semibold text-slate-200 mt-0.5">{th.shortFilter.borrowFee}</div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-slate-500">Short Interest (SI%):</span>
                                  <div className="font-semibold text-slate-200 mt-0.5">{th.shortFilter.shortInterest}</div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-slate-500">SSR Status:</span>
                                  <div className="font-semibold text-slate-200 mt-0.5">{th.shortFilter.ssrStatus}</div>
                                </div>
                                <div className="text-xs">
                                  <span className="text-slate-500">Squeeze Risk Grade:</span>
                                  <div className="mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                                      th.shortFilter.squeezeRisk === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/35 animate-pulse' :
                                      th.shortFilter.squeezeRisk === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/35' :
                                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                                    }`}>
                                      {th.shortFilter.squeezeRisk}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="bg-slate-950/40 p-2.5 rounded border border-slate-800/50 text-[10px] text-slate-450 leading-relaxed font-sans">
                              <span className="text-slate-400 font-bold block mb-0.5">Short Sale Regulation Warning:</span>
                              Squeeze risk estimates are evaluated via technical signals, relative volume surges, and estimated short parameters. SSR status restricts short entries on downtick sessions.
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Horizon Setup Details */}
                      {th.horizonDetails && (
                        <div className="mt-3 bg-slate-900/35 p-3 rounded border border-slate-800/60">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Horizon Setup Details</div>
                          <p className="text-sm text-slate-350 leading-relaxed font-sans">{th.horizonDetails}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Action Plan */}
              <div className="card relative overflow-hidden p-5 sm:p-6 bg-gradient-to-br from-slate-900/60 to-slate-950/60">
                <h3 className="section-title mb-5 flex items-center gap-2">
                  <Zap className="w-4.5 h-4.5 text-brand-400" />
                  Final Execution Timeline & Action Plan
                </h3>
                <div className="relative pl-6 sm:pl-8 space-y-6">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[11px] sm:left-[15px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-brand-500 via-indigo-500 to-slate-800" />
                  
                  {(r?.finalActionPlan || []).map((step: string, i: number) => (
                    <div key={i} className="relative flex gap-4 items-start group">
                      {/* Timeline Node */}
                      <div className="absolute -left-[27px] sm:-left-[31px] w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 border-2 border-brand-500 flex items-center justify-center text-xs font-bold text-brand-400 z-10 shadow-lg group-hover:scale-110 transition-transform duration-200">
                        {i + 1}
                      </div>
                      
                      {/* Step content card */}
                      <div className="flex-1 bg-slate-950/40 p-4 rounded-xl border border-slate-850 hover:border-brand-500/30 transition-all duration-200">
                        <div className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1">Step {i + 1}</div>
                        <p className="text-sm text-slate-200 leading-relaxed font-sans font-normal">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}



          {activeTab === 'insight' && (
            <div className="space-y-6 slide-up animate-fade-in">
              {/* Fallback Check */}
              {!r?.companyInsights ? (
                <div className="card border border-slate-800 bg-slate-900/40 p-8 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-550">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-200">Ecosystem Insights Unavailable</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      This report was generated using an older cache schema. Click the "Re-analyze" button in the top right to compile fresh, deep business ecosystem insights for {symbol}.
                    </p>
                  </div>
                  <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary text-xs">
                    <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                    {analyzing ? 'Analyzing…' : 'Generate Insights Now'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Strategic Ecosystem Outlook */}
                  {r.companyInsights.strategicOutlook && (
                    <div className="card-glass border border-brand-500/15 bg-brand-500/5 p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl" />
                      <h3 className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Strategic Ecosystem Outlook
                      </h3>
                      <p className="text-sm text-slate-350 leading-relaxed font-sans">{r.companyInsights.strategicOutlook}</p>
                    </div>
                  )}

                  {/* Invested Companies Grid */}
                  <div className="card">
                    <h3 className="section-title mb-4 flex items-center gap-2 text-slate-100">
                      <Coins className="w-4.5 h-4.5 text-brand-400" />
                      Strategic Investment Portfolio
                    </h3>
                    
                    {r.companyInsights.investedCompanies && r.companyInsights.investedCompanies.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {r.companyInsights.investedCompanies.map((company: any, idx: number) => (
                          <div key={idx} className="bg-slate-950/45 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700/60 transition-all flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-150 flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-brand-400" />
                                  {company.name}
                                </span>
                                {company.ownershipPct && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/15 border border-brand-500/25 text-brand-400 font-mono">
                                    Est. Ownership: {company.ownershipPct}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                <strong className="text-slate-300">Performance:</strong> {company.performance}
                              </p>
                              {company.upcomingEvents && company.upcomingEvents.length > 0 && (
                                <div className="text-[11px] text-slate-450 space-y-1">
                                  <span className="font-semibold text-slate-350">Upcoming Catalyst Events:</span>
                                  <ul className="list-disc pl-4 space-y-0.5">
                                    {company.upcomingEvents.map((evt: string, eIdx: number) => (
                                      <li key={eIdx}>{evt}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            {/* Impact analysis potential */}
                            <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2">
                              <Activity className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div className="text-xs text-slate-350 leading-relaxed">
                                <strong className="text-emerald-400 font-semibold">Stock Impact Channel:</strong>{' '}
                                {company.impactPotential}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/20 rounded-lg border border-slate-800/40">
                        No major strategic investment holdings reported.
                      </div>
                    )}
                  </div>

                  {/* Business Dependency Network */}
                  <div className="card">
                    <h3 className="section-title mb-4 flex items-center gap-2 text-slate-100">
                      <Layers className="w-4.5 h-4.5 text-indigo-400" />
                      Business Dependency Network (Supply Chain & Partners)
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {[
                        { title: 'Suppliers & Infrastructure', items: r.companyInsights.dependencies?.suppliers, color: 'text-indigo-400 border-indigo-500/10' },
                        { title: 'Consumer Base & Customers', items: r.companyInsights.dependencies?.customers, color: 'text-brand-400 border-brand-500/10' },
                        { title: 'Outsourcing & Support', items: r.companyInsights.dependencies?.outsourcePartners, color: 'text-amber-400 border-amber-500/10' },
                        { title: 'Marketing Channels & Partners', items: r.companyInsights.dependencies?.marketingPartners, color: 'text-emerald-400 border-emerald-500/10' },
                      ].map((group, idx) => (
                        <div key={idx} className={`bg-slate-950/30 p-4 rounded-xl border border-slate-800/80`}>
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 pb-2 border-b border-slate-800/60 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            {group.title}
                          </h4>
                          
                          {group.items && group.items.length > 0 ? (
                            <div className="space-y-3.5">
                              {group.items.map((partner: any, pIdx: number) => (
                                <div key={pIdx} className="space-y-1.5 text-xs">
                                  <div className="flex justify-between items-baseline font-sans">
                                    <span className="font-bold text-slate-200">{partner.name}</span>
                                    <span className="text-[10px] text-slate-500 italic">{partner.role}</span>
                                  </div>
                                  <p className="text-slate-400 font-sans">{partner.description}</p>
                                  {partner.riskExposure && (
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800/50 text-[11px] text-slate-350 leading-relaxed">
                                      <strong className="text-brand-400 font-semibold">External Risk exposure:</strong> {partner.riskExposure}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-slate-500 text-xs italic">
                              No major entries logged for this segment.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
        )
      ) : null}
    </div>
  );
};

export default StockDetail;
