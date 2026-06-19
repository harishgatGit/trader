import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  RefreshCw, Star, Bell, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp,
  Globe, Coins, Building2, Activity, Layers, Clock, ShieldAlert, Sparkles, Zap,
  CheckCircle2, Loader2, ShieldCheck, HelpCircle, Target, ArrowRight, BookOpen, Compass,
  Info, AlertTriangle
} from 'lucide-react';
import { stocksApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import {
  RatingBadge, ScoreBar, PriceChange, LoadingSpinner, EmptyState, Skeleton,
  DataUnavailable, TermTooltip, StatusBadge, PageContainer
} from '../components/ui';
import { useSEO } from '../utils/useSEO';
import { StructuredData } from '../components/StructuredData';
import { Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

const StockDetail: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromContext = location.state?.from || 'direct';
  const { addToWatchlist, watchlist, runAnalysis, analyzing, user } = useAppStore();

  const ticker = symbol?.toUpperCase() || 'Stock';

  useSEO({
    title: `${ticker} Stock Analysis | Investing Atti`,
    description: `Full AI research deck and technical analysis report for ${ticker}. View support & resistance zones, indicators, and catalysts.`,
    robots: 'index, follow',
  });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://investingatti.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Stock Research",
        "item": "https://investingatti.com/analyze"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": ticker,
        "item": `https://investingatti.com/stocks/${ticker}`
      }
    ]
  };
  
  const [report, setReport] = useState<any>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [technicals, setTechnicals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fundamentals' | 'news' | 'analysts' | 'ecosystem'>('fundamentals');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [actionTab, setActionTab] = useState<'swing' | 'short' | 'long'>('swing');
  const [activeSection, setActiveSection] = useState('summary');

  const isWatchlisted = watchlist.some((w) => w.symbol === symbol);

  useEffect(() => {
    if (!symbol) return;
    loadData();
  }, [symbol]);

  useEffect(() => {
    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    const handleScroll = () => {
      if (mainContainer.scrollTop > 180) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    mainContainer.addEventListener('scroll', handleScroll);
    return () => mainContainer.removeEventListener('scroll', handleScroll);
  }, [loading]);

  useEffect(() => {
    if (loading || !report) return;

    const sectionIds = ['summary', 'action', 'story', 'trend', 'levels', 'signals', 'risks', 'details'];
    
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const mainContainer = document.querySelector('main');
    if (!mainContainer) return;

    const observer = new IntersectionObserver(observerCallback, {
      root: mainContainer,
      rootMargin: '-80px 0px -60% 0px',
      threshold: 0,
    });

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [loading, report]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportData, techData] = await Promise.allSettled([
        stocksApi.getLatestReport(symbol!),
        stocksApi.getTechnicals(symbol!),
      ]);

      if (reportData.status === 'fulfilled') {
        setReport(reportData.value);
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const mainContainer = document.querySelector('main');
    if (element && mainContainer) {
      const containerRect = mainContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = 60; // offset for the tabs bar
      const targetScrollTop = mainContainer.scrollTop + (elementRect.top - containerRect.top) - offset;
      
      mainContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    } else if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <PageContainer className="py-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-850">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-60" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const r = report?.reportJson as any;
  const price = r?.currentPrice || technicals?.vwap;
  const dataQualityRating = r?.dataQuality?.rating;
  const hasInsufficientData =
    dataQualityRating === 'INSUFFICIENT' ||
    (report && !r?.finalRating) ||
    (r && !r.currentPrice && !r.technicalScore && !r.fundamentalScore);

  const statusColor = (apiHealth: string) => apiHealth === 'ok' ? 'bg-emerald-500' : apiHealth === 'degraded' ? 'bg-amber-500' : 'bg-slate-500';

  // Fallback structures for safety
  const ts = r?.trendStory;
  const th = r?.tacticalHorizonView;
  const swing = ts?.swing_trade_view || r?.swingTradeView;
  const short = ts?.short_trade_view || r?.shortTermView;
  const layman = ts?.story_for_layman || r?.laymanExplanation;
  const finalSummary = ts?.final_summary;

  const bias = r?.finalRating || finalSummary?.trade_bias || th?.bias || technicals?.overallBias || 'HOLD';
  const confidence = r?.finalDecision?.confidenceScore || finalSummary?.confidence || 50;

  // Derive Support & Resistance probability estimates
  const getProbabilities = () => {
    let hold = 50;
    let breakProb = 30;
    let reversal = 40;
    let sideways = 30;

    if (technicals) {
      const rsi = technicals.rsi14 || 50;
      const currentBias = (technicals.overallBias || bias || '').toUpperCase();
      
      if (currentBias.includes('BULL')) {
        hold = 75;
        breakProb = 15;
        reversal = 60;
        sideways = 15;
      } else if (currentBias.includes('BEAR')) {
        hold = 35;
        breakProb = 60;
        reversal = 25;
        sideways = 15;
      }

      if (rsi < 35) {
        reversal += 15;
        hold += 10;
        breakProb -= 15;
      } else if (rsi > 65) {
        reversal -= 10;
        breakProb += 15;
        hold -= 5;
      }
    }

    return {
      hold: Math.min(85, Math.max(15, hold)),
      breakProb: Math.min(85, Math.max(15, breakProb)),
      reversal: Math.min(85, Math.max(15, reversal)),
      sideways: Math.min(80, Math.max(15, sideways))
    };
  };

  const probabilities = getProbabilities();

  const summaryText = r?.executiveSummary?.summary || 
                      (typeof r?.executiveSummary === 'string' ? r.executiveSummary : '') || 
                      r?.finalDecision?.decisionSummary || 
                      finalSummary?.one_line_story || 
                      '';

  let laymanTakeawayText = '';
  let analyticalSummaryText = summaryText;

  if (summaryText) {
    const marker = "LAYMAN'S TAKEAWAY:";
    const index = summaryText.toUpperCase().indexOf(marker.toUpperCase());
    
    if (index !== -1) {
      const beforeText = summaryText.substring(0, index).trim();
      const afterText = summaryText.substring(index + marker.length).trim();
      
      if (index === 0) {
        // New format: Layman's Takeaway is at the start
        const parts = afterText.split(/\n+/);
        laymanTakeawayText = parts[0]?.trim() || '';
        analyticalSummaryText = parts.slice(1).join('\n\n').trim() || '';
      } else {
        // Old format: Layman's Takeaway is at the end
        laymanTakeawayText = afterText;
        analyticalSummaryText = beforeText;
      }
    }
  }

  const renderExecutiveSummary = () => {
    if (!analyticalSummaryText) return null;
    
    return (
      <p className="text-sm text-slate-200 leading-relaxed font-sans bg-brand-500/5 p-4 rounded-xl border border-brand-500/10 whitespace-pre-line">
        {analyticalSummaryText}
      </p>
    );
  };

  // Decision meter options
  const meterOptions = [
    { label: 'Strong Risk', color: 'bg-rose-500 border-rose-500/25 text-rose-500' },
    { label: 'Caution', color: 'bg-red-500 border-red-500/25 text-red-500' },
    { label: 'Wait', color: 'bg-amber-500 border-amber-500/25 text-amber-500' },
    { label: 'Watch', color: 'bg-indigo-500 border-indigo-500/25 text-indigo-500' },
    { label: 'Entry Zone', color: 'bg-teal-500 border-teal-500/25 text-teal-500' },
    { label: 'Strong Setup', color: 'bg-emerald-500 border-emerald-500/25 text-emerald-500' }
  ];

  const getMeterIndex = (rating: string) => {
    const rate = rating?.toUpperCase() || '';
    if (rate.includes('SELL')) return 0;
    if (rate.includes('AVOID') || rate.includes('HIGH')) return 1;
    if (rate.includes('WAIT') || rate.includes('HOLD')) return 2;
    if (rate.includes('WATCH')) return 3;
    if (rate.includes('ENTRY')) return 4;
    if (rate.includes('BUY') || rate.includes('STRONG')) return 5;
    return 2; // Default Wait
  };

  const getVolumeTrend = () => {
    if (candles.length < 21) return 'Normal';
    const lookback = 20;
    
    // Recent relative volume
    const recentVol = candles[candles.length - 1].volume;
    const avgVolRecent = candles.slice(candles.length - 1 - lookback, candles.length - 1).reduce((sum, c) => sum + c.volume, 0) / lookback;
    const relVolumeRecent = avgVolRecent > 0 ? recentVol / avgVolRecent : 1.0;
    
    // Previous relative volume
    const prevVol = candles[candles.length - 2].volume;
    const avgVolPrev = candles.slice(candles.length - 2 - lookback, candles.length - 2).reduce((sum, c) => sum + c.volume, 0) / lookback;
    const relVolumePrev = avgVolPrev > 0 ? prevVol / avgVolPrev : 1.0;
    
    if (relVolumeRecent > relVolumePrev) {
      return 'Rising';
    } else {
      return 'Fading';
    }
  };

  const formatPercent = (val: any) => {
    if (val == null) return '0.00';
    const parsed = parseFloat(val.toString());
    return isNaN(parsed) ? '0.00' : parsed.toFixed(2);
  };

  const getPercentSign = (val: any) => {
    if (val == null) return '';
    const parsed = parseFloat(val.toString());
    return isNaN(parsed) || parsed < 0 ? '' : '+';
  };

  const meterIndex = getMeterIndex(bias);

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 transition-colors duration-200">
      
      {/* Scroll-sticky mini summary bar */}
      <div 
        className={`fixed top-0 inset-x-0 bg-surface-900 border-b border-slate-850 px-4 md:px-8 py-3 flex items-center justify-between z-40 transition-all duration-300 ${
          showStickyBar ? 'translate-y-0 opacity-100 shadow-md' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-xl font-black font-mono text-slate-100">{symbol}</span>
          <div className="h-4 w-px bg-slate-800" />
          <span className="font-mono font-bold text-slate-200">${price?.toFixed(2)}</span>
          {ts?.price_summary?.day_change_percent != null && (
            <PriceChange value={ts.price_summary.day_change_percent} />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-450 font-semibold  hidden md:inline">Outlook:</span>
          <StatusBadge status={bias} size="sm" />
          <button 
            onClick={() => scrollToSection('action')}
            className="btn-primary text-xs py-1.5 px-3 rounded-lg"
          >
            View Entry Plan
          </button>
        </div>
      </div>

      <PageContainer className="pt-6 pb-28 md:py-8 space-y-6">
        <StructuredData data={breadcrumbSchema} />
        
        {/* Header Title Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850 pb-5">
          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-3">
              {/* @ts-ignore */}
              <ViewTransition name={`stock-symbol-${fromContext}-${symbol}`} share="text-morph">
                <h1 className="text-3xl md:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">{symbol}</h1>
              </ViewTransition>
              <StatusBadge status={bias} />
              <div className="flex items-center gap-1.5 text-xs text-slate-450 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                <span>AI Confidence: <strong className="text-slate-200">{confidence}%</strong></span>
              </div>
            </div>
            {r?.fundName && <p className="text-slate-400 text-sm font-medium">{r.fundName} · ETF Review</p>}
            {!r?.fundName && price && (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black font-mono text-slate-200">${price.toFixed(2)}</span>
                {ts?.price_summary?.day_change_percent != null && (
                  <PriceChange value={ts.price_summary.day_change_percent} />
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
              {analyzing ? 'Running AI Agent…' : 'Re-analyze Stock'}
            </button>
            {user?.role === 'SUPERUSER' && (
              <button
                onClick={() => addToWatchlist(symbol!)}
                disabled={isWatchlisted}
                className={`btn px-4 py-2 rounded-xl text-xs ${isWatchlisted ? 'btn-ghost text-brand-400' : 'btn-secondary'}`}
              >
                <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-brand-400 text-brand-400' : ''}`} />
                {isWatchlisted ? 'Watchlisted' : 'Add Watchlist'}
              </button>
            )}
          </div>
        </div>

        {!report && (
          <EmptyState
            icon="📊"
            title="No Analysis Report Available"
            description="Our smart analyst hasn't generated a deck for this stock yet. Click compile to trigger the research pipeline."
            action={
              <button onClick={handleAnalyze} className="btn-primary">
                {analyzing ? 'Analyzing…' : 'Analyze Symbol'}
              </button>
            }
          />
        )}

        {hasInsufficientData ? (
          <div className="slide-up">
            <DataUnavailable symbol={symbol} onRetry={handleAnalyze} />
          </div>
        ) : report ? (
          r?.isFund === true ? (
            /* ETF / Fund View (styled to matching style) */
            <div className="space-y-6 slide-up">
              <div className="card border border-brand-500/10 relative overflow-hidden p-6 rounded-2xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-brand-400 font-bold  tracking-wider font-mono">
                      {r.issuer} · Mutual Fund & Index Review
                    </span>
                    <h2 className="text-2xl font-bold text-slate-100 mt-1">{r.fundName}</h2>
                    <p className="text-xs text-slate-450 mt-1">
                      Benchmark Index: <span className="font-semibold text-slate-350">{r.benchmarkIndex}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-bold block">Confidence</span>
                      <span className="text-xl font-bold font-mono text-brand-400">{r.finalDecision?.confidenceScore}%</span>
                    </div>
                    <div className="h-8 w-px bg-slate-800" />
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 font-bold block">Rating</span>
                      <RatingBadge rating={r.finalDecision?.finalRating} size="lg" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fund overview widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Expense Ratio', value: r.fundOverview?.expenseRatio, color: 'text-brand-400' },
                  { label: 'Asset Size (AUM)', value: r.fundOverview?.aum, color: 'text-indigo-400' },
                  { label: 'Dividend Yield', value: r.fundOverview?.dividendYield, color: 'text-emerald-400' },
                  { label: 'Inception Date', value: r.fundOverview?.inceptionDate, color: 'text-amber-400' },
                ].map((m) => (
                  <div key={m.label} className="card p-4 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-450  font-bold tracking-wider">{m.label}</span>
                    <span className={`text-lg sm:text-xl font-mono font-bold ${m.color}`}>
                      {m.value || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300  tracking-wider">Investment Strategy</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">{r.fundOverview?.objective}</p>
                </div>
                <div className="card p-5 space-y-3">
                  <h3 className="text-xs font-bold text-slate-300  tracking-wider">Analyst Assessment</h3>
                  <p className="text-sm text-slate-350 leading-relaxed">{r.finalDecision?.bestActionNow}</p>
                  <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                    <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Decision Summary</span>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{r.finalDecision?.decisionSummary}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5 border-emerald-500/10">
                  <h3 className="text-sm font-bold text-emerald-400  tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key Pros / Advantages
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

                <div className="card p-5 border-red-500/10">
                  <h3 className="text-sm font-bold text-red-400  tracking-wider mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> Potential Drawbacks / Risks
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-5">
                  <h3 className="text-xs font-bold text-slate-300  tracking-wider mb-4">Sector Exposure</h3>
                  <div className="space-y-3.5">
                    {r.topSectors?.map((sec: any, idx: number) => {
                      const pctFloat = parseFloat(sec.percentage?.replace(/[^0-9.]/g, '')) || 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold text-slate-350">
                            <span>{sec.sector}</span>
                            <span className="font-mono text-slate-200">{sec.percentage}</span>
                          </div>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill bg-brand-500" 
                              style={{ width: `${Math.min(100, Math.max(0, pctFloat))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="card p-5">
                  <h3 className="text-xs font-bold text-slate-300  tracking-wider mb-4">Top Holding Weightings</h3>
                  <div className="divide-y divide-slate-850 max-h-72 overflow-y-auto pr-1">
                    {r.topHoldings?.map((h: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2.5 text-xs sm:text-sm">
                        <div>
                          <span className="font-mono font-bold text-brand-400 mr-2">{h.ticker}</span>
                          <span className="text-slate-400">{h.name}</span>
                        </div>
                        <span className="font-mono font-bold text-slate-200">{h.percentage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card p-5 bg-slate-950/20">
                <h3 className="text-xs font-bold text-slate-450  tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> Analogy Explanation
                </h3>
                <p className="text-sm text-slate-300 italic leading-relaxed">"{r.laymanExplanation}"</p>
              </div>

            </div>
          ) : (
            /* Stock Overhaul Layout: 2-Column Split + Sticky Sidebar */
            <div className="space-y-6">
              
              {/* Section Anchor navigation */}
              <div className="md:sticky static md:top-0 bg-surface-950/90 backdrop-blur border-b border-slate-850/60 pb-2 z-30 flex items-center gap-1 overflow-x-auto scrollbar-none py-2 md:py-2.5">
                {[
                  { id: 'summary', label: 'Summary' },
                  { id: 'action', label: 'Action Plan' },
                  { id: 'story', label: 'Story' },
                  { id: 'trend', label: 'Trend Health' },
                  { id: 'levels', label: 'Probability' },
                  { id: 'signals', label: 'Signals' },
                  { id: 'risks', label: 'Risks' },
                  { id: 'details', label: 'Details' }
                ].map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`px-3 py-1.5 text-xs font-bold transition whitespace-nowrap relative ${
                        isActive
                          ? 'text-brand-500 dark:text-brand-400'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sec.label}
                      {isActive && (
                        <span className="absolute bottom-0 inset-x-3 h-0.5 bg-brand-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                
                {/* Left Main Story Panel */}
                <div className="lg:col-span-8 space-y-6 md:space-y-8">
                  
                  {/* Layman's Takeaway above Executive Summary */}
                  {laymanTakeawayText && (
                    <div className="text-base md:text-lg italic font-medium text-slate-200 pl-5 border-l-4 border-l-brand-400 py-2 leading-relaxed">
                      “{laymanTakeawayText}”
                    </div>
                  )}
                  
                  {/* SECTION 1: EXECUTIVE SUMMARY */}
                  <section id="summary" className="card relative flex flex-col gap-5 border-l-4 border-l-brand-500">
                    <div className="flex items-center justify-between border-b border-slate-850/50 pb-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-100">Executive Summary</h2>
                        <p className="text-xs text-slate-450 mt-0.5">Is the stock moving up, down, or sideways?</p>
                      </div>
                      <RatingBadge rating={bias} size="md" />
                    </div>

                    {/* Row 1: Chart Strength & AI Confidence circular gauges side-by-side */}
                    <div className="flex justify-around items-center bg-slate-950/35 p-6 rounded-2xl">
                      
                      {/* Chart Strength Gauge */}
                      <TermTooltip term="technicalscore">
                        <div className="flex flex-col items-center gap-2 cursor-help group">
                          <span className="text-[10px] text-slate-500 font-bold block tracking-wider underline decoration-dotted group-hover:text-slate-350 transition-colors ">
                            Chart Strength
                          </span>
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="28"
                                className="fill-transparent stroke-slate-850"
                                strokeWidth="5"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="28"
                                className="fill-transparent stroke-brand-500 transition-all duration-700 ease-out"
                                strokeWidth="5"
                                strokeDasharray={175.93}
                                strokeDashoffset={175.93 - (Math.min(100, Math.max(0, r?.technicalScore || 0)) / 100) * 175.93}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-black font-mono text-slate-100">
                                {r?.technicalScore != null ? r.technicalScore.toFixed(0) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TermTooltip>
                      
                      {/* AI Confidence Gauge */}
                      <TermTooltip term="confidencescore">
                        <div className="flex flex-col items-center gap-2 cursor-help group">
                          <span className="text-[10px] text-slate-500 font-bold block tracking-wider underline decoration-dotted group-hover:text-slate-350 transition-colors ">
                            AI Confidence
                          </span>
                          <div className="relative w-20 h-20 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="28"
                                className="fill-transparent stroke-slate-850"
                                strokeWidth="5"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="28"
                                className="fill-transparent stroke-emerald-500 transition-all duration-700 ease-out"
                                strokeWidth="5"
                                strokeDasharray={175.93}
                                strokeDashoffset={175.93 - (Math.min(100, Math.max(0, confidence)) / 100) * 175.93}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-mono">
                              <span className="text-xl font-black text-emerald-400">
                                {confidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </TermTooltip>

                    </div>

                    {/* Row 2: Suggested Action taking full width */}
                    <div className="bg-slate-950/35 p-4 rounded-2xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block tracking-wider ">Suggested Action</span>
                      <p className="text-sm font-bold text-brand-400 leading-relaxed font-sans">
                        {r?.finalDecision?.bestActionNow || swing?.trade_bias || 'Watch'}
                      </p>
                    </div>

                    {/* Guide to Metrics */}
                    <div className="bg-slate-950/25 border border-slate-850/60 rounded-xl text-xs overflow-hidden">
                      <button
                        onClick={() => toggleSection('guideToMetrics')}
                        className="w-full flex items-center justify-between p-3.5 text-left text-slate-300 hover:text-slate-200 focus:outline-none transition-colors"
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-brand-400" />
                          <span>Guide to Metrics</span>
                        </div>
                        {expanded['guideToMetrics'] ? (
                          <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {expanded['guideToMetrics'] && (
                        <div className="p-3.5 pt-0 border-t border-slate-850/60 space-y-3.5 animate-fade-in">
                          {/* Chart Strength and AI Confidence as Titles */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-300">Chart Strength (0-100)</h4>
                              <p className="text-slate-400 leading-relaxed font-sans">
                                Shows how strong the stock's trend is. Above 70 means a strong upward trend, while below 40 means a weak or declining trend.
                              </p>
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-300">AI Confidence</h4>
                              <p className="text-slate-400 leading-relaxed font-sans">
                                How well all chart, news, and market signals agree. A higher percentage means stronger alignment.
                              </p>
                            </div>
                          </div>
                          
                          {/* Suggested Action written below both */}
                          <div className="pt-3 border-t border-slate-900 space-y-1">
                            <h4 className="font-bold text-slate-300">Suggested Action</h4>
                            <p className="text-slate-400 leading-relaxed font-sans">
                              The AI's tactical advice right now—whether to buy immediately, wait for a pull-back to support, or hold.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Decision Meter */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-450 px-1">
                        <span>Current Outlook Zone</span>
                        <span className="text-slate-200">Marker: {meterOptions[meterIndex].label}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-1 h-3 rounded-full overflow-hidden bg-slate-900 border border-slate-800">
                        {meterOptions.map((opt, i) => (
                          <div
                            key={i}
                            className={`h-full transition-all duration-300 relative ${
                              i === meterIndex ? `${opt.color.split(' ')[0]} opacity-100 ring-2 ring-slate-100` : 'bg-slate-800/40 opacity-40'
                            }`}
                          >
                            {i === meterIndex && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-slate-100 rounded-full shadow-sm" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 px-1 font-mono ">
                        <span>Risk</span>
                        <span>Consolidation</span>
                        <span>Setup</span>
                      </div>
                    </div>

                    {renderExecutiveSummary()}
                  </section>

                  {/* SECTION 2: ACTION PLAN */}
                  <section id="action" className="card flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Trade Action Plan</h2>
                      <p className="text-xs text-slate-450 mt-0.5">Execution zones, exit targets, and timing parameters</p>
                    </div>

                    <div className="flex border-b border-slate-850 overflow-x-auto scrollbar-none">
                      <button
                        onClick={() => setActionTab('swing')}
                        className={`px-4 py-2.5 text-xs font-bold  tracking-wider border-b-2 transition ${
                          actionTab === 'swing' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                        }`}
                      >
                        Swing Setup
                      </button>
                      <button
                        onClick={() => setActionTab('short')}
                        className={`px-4 py-2.5 text-xs font-bold  tracking-wider border-b-2 transition ${
                          actionTab === 'short' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                        }`}
                      >
                        Short View
                      </button>
                      <button
                        onClick={() => setActionTab('long')}
                        className={`px-4 py-2.5 text-xs font-bold  tracking-wider border-b-2 transition ${
                          actionTab === 'long' ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                        }`}
                      >
                        Long-Term Valuation
                      </button>
                    </div>

                    {actionTab === 'swing' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Accumulation Zone</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-indigo-400 mt-1 block">
                              {swing?.entry_zone ? `$${swing.entry_zone.low?.toFixed(2)} – $${swing.entry_zone.high?.toFixed(2)}` : th?.suggestedEntryPrice ? `$${th.suggestedEntryPrice.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Where buying may make sense</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Targets</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400 mt-1 block">
                              {swing?.target_1 ? `$${swing.target_1?.toFixed(2)} / $${swing.target_2?.toFixed(2)}` : th?.suggestedExitPrice ? `$${th.suggestedExitPrice.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Possible profit zones</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Stop Loss</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-rose-400 mt-1 block">
                              {swing?.stop_loss ? `$${swing.stop_loss?.toFixed(2)}` : th?.stopLossPrice ? `$${th.stopLossPrice.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Where this idea becomes wrong</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Risk / Reward</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-slate-100 mt-1 block">
                              {swing?.risk_reward || r?.swingTradeView?.riskReward || 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Estimated trade metric</span>
                          </div>
                        </div>

                        {swing?.wait_for_confirmation && (
                          <div className="p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl text-xs flex items-start gap-2">
                            <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-indigo-300 font-bold  text-[10px] tracking-wider block mb-0.5">What must happen first</strong>
                              <span className="text-slate-300 leading-relaxed font-sans">{swing.wait_for_confirmation}</span>
                            </div>
                          </div>
                        )}
                        {swing?.entry_reason && (
                          <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-slate-400 font-semibold  text-[10px] tracking-wider block mb-0.5">Confirmation Summary</strong>
                              <span className="text-slate-300 font-sans">{swing.entry_reason}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {actionTab === 'short' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Short Trigger</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-purple-400 mt-1 block">
                              {short?.short_entry_trigger ? `$${short.short_entry_trigger.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Breakdown Entry Point</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Short Targets</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-400 mt-1 block">
                              {short?.short_target_1 ? `$${short.short_target_1.toFixed(2)} / $${short.short_target_2.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Downward profit zones</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Short Stop Loss</span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-rose-400 mt-1 block">
                              {short?.short_stop_loss ? `$${short.short_stop_loss.toFixed(2)}` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Exit if buyers push back</span>
                          </div>
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/60 hover:border-slate-800 transition-colors">
                            <span className="text-[10px] text-slate-500 font-bold  block tracking-wider">Squeeze Risk</span>
                            <span className="mt-1 block">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold  font-mono border ${
                                ts?.evidence?.short_context?.short_squeeze_risk === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              }`}>
                                {ts?.evidence?.short_context?.short_squeeze_risk || 'LOW'}
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans block mt-1">Short covering potential</span>
                          </div>
                        </div>

                        {ts?.evidence?.short_context?.summary && (
                          <div className="p-3 bg-red-500/5 border border-red-500/15 rounded-xl text-xs flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-red-300 font-bold  text-[10px] tracking-wider block mb-0.5">Short Warning Context</strong>
                              <span className="text-slate-300 leading-relaxed font-sans">{ts.evidence.short_context.summary}</span>
                            </div>
                          </div>
                        )}
                        {short?.reason && (
                          <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs flex items-start gap-2">
                            <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <strong className="text-slate-400 font-semibold  text-[10px] tracking-wider block mb-0.5">Tactical Setup commentary</strong>
                              <span className="text-slate-300 font-sans">{short.reason}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {actionTab === 'long' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400  tracking-wider">Multibagger Potential Assessment</span>
                            {r?.multibaggerProbability?.rating && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                r.multibaggerProbability.rating === 'VERY_HIGH' || r.multibaggerProbability.rating === 'HIGH' ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}>
                                Rating: {r.multibaggerProbability.rating.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-300 leading-relaxed font-sans">
                            {r?.multibaggerProbability?.reason || 'Long term valuation logic requires fundamentals validation.'}
                          </p>

                          {r?.multibaggerProbability?.requiredConditions?.length > 0 && (
                            <div className="pt-3 border-t border-slate-850 space-y-2">
                              <span className="text-[10px] font-bold text-slate-500  tracking-wider block">Required Catalyst Conditions:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {r.multibaggerProbability.requiredConditions.map((cond: string, idx: number) => (
                                  <div key={idx} className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 flex items-start gap-1.5">
                                    <span className="text-brand-500 font-mono font-bold">•</span>
                                    <span>{cond}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* SECTION 3: WHY THE STOCK MOVED TODAY */}
                  <section id="story" className="card flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-850/50 pb-3">
                      <div>
                        <h2 className="text-lg font-bold text-slate-100">Why the stock moved today</h2>
                        <p className="text-xs text-slate-450 mt-0.5">Analyses on recent events, earnings, and news catalysts</p>
                      </div>
                      {ts?.classification?.primary_reason && (
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold font-sans ">
                          {ts.classification.primary_reason.replace('-', ' ')}
                        </span>
                      )}
                    </div>

                    {layman ? (
                      <div className="space-y-4 font-sans leading-relaxed text-sm">
                        <div className="p-4 bg-slate-950/45 border border-slate-850 rounded-2xl">
                          <h4 className="text-sm font-extrabold text-slate-200 mb-1.5">{layman.headline}</h4>
                          <p className="text-slate-300 font-normal leading-relaxed whitespace-pre-line font-sans">{layman.simple_explanation}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-bold  tracking-wider block">Sustainability</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.25 rounded text-[9px] font-bold  ${
                                layman.is_move_sustainable === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              }`}>
                                Sustainable: {layman.is_move_sustainable}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 font-sans mt-2">{layman.sustainability_reason}</p>
                          </div>

                          <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-bold  tracking-wider block">Participation / Driver</span>
                            <div className="text-xs font-semibold text-slate-200 capitalize">{layman.who_may_be_buying_or_selling} participation</div>
                            <p className="text-xs text-slate-400 font-sans mt-2">
                              {layman.who_may_be_buying_or_selling === 'institution' && 'Unusually high volume indicates institutional position scaling.'}
                              {layman.who_may_be_buying_or_selling === 'retail' && 'Heavy retail discussion and news ticker speculation drives this move.'}
                              {layman.who_may_be_buying_or_selling === 'shorts covering' && 'Spike driven by short sellers closing borrows rapidly.'}
                              {layman.who_may_be_buying_or_selling === 'mixed' && 'Balanced participation on tape between retail accounts and institutional desks.'}
                              {(!layman.who_may_be_buying_or_selling || layman.who_may_be_buying_or_selling === 'unknown') && 'Ticker liquidity tracking makes buyer proxy unclear.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No story data logged for this period.</p>
                    )}
                  </section>

                  {/* SECTION 4: CURRENT TREND HEALTH */}
                  <section id="trend" className="card flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Current Trend Health</h2>
                      <p className="text-xs font-semibold text-slate-350 mt-0.5">Analyzing prices, volumes, and directional indices</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Price Trend lane */}
                      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                          <span className="text-xs font-extrabold text-slate-350  tracking-wider">1. Price Trend</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded font-extrabold  font-mono ${
                            (th?.dailyTrend?.trend || '').toUpperCase().includes('BULL') || (th?.dailyTrend?.trend || '').toUpperCase().includes('UP') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {th?.dailyTrend?.trend || ts?.evidence?.technical_context?.trend || 'Mixed'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-300 font-sans leading-relaxed">{th?.dailyTrend?.analysis || 'Price position relative to key EMA(20) and EMA(50) lines indicates current bias.'}</p>
                      </div>

                      {/* Volume Strength lane */}
                      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                          <span className="text-xs font-extrabold text-slate-350  tracking-wider">2. Volume Strength</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-extrabold  font-mono flex items-center gap-1">
                            {ts?.price_summary?.relative_volume ? `${ts.price_summary.relative_volume.toFixed(1)}x Vol` : 'Normal'}
                            {candles.length >= 21 && (
                              <span className="text-[10px] font-bold">
                                ({getVolumeTrend() === 'Rising' ? 'Rising ▲' : 'Fading ▼'})
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-300 font-sans leading-relaxed">
                          {ts?.evidence?.volume_context?.summary || 'Relative daily volume compares current activity against the 30-day average.'}
                        </p>
                      </div>

                      {/* Momentum lane */}
                      <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-900/60 pb-2">
                          <span className="text-xs font-extrabold text-slate-355  tracking-wider">3. Momentum Lane</span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-extrabold  font-mono flex items-center gap-1">
                            RSI(14) {technicals?.rsi14?.toFixed(0) || 'N/A'}
                            {technicals?.rsi14Prev != null && technicals?.rsi14 != null && (
                              <span className="text-[10px] font-bold">
                                ({technicals.rsi14 > technicals.rsi14Prev ? 'Rising ▲' : 'Fading ▼'})
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-300 font-sans leading-relaxed">
                          {technicals?.rsi14Prev ? `RSI(14) momentum is ${technicals.rsi14 > technicals.rsi14Prev ? 'improving' : 'cooling'} (previously ${technicals.rsi14Prev.toFixed(0)}).` : 'MACD lines and RSI(14) readings reflect underlying directional velocity.'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* SECTION 5: SUPPORT, RESISTANCE & SCENARIO PROBABILITY */}
                  <section id="levels" className="card flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Support, Resistance & Scenario Probability</h2>
                      <p className="text-xs text-slate-450 mt-0.5">Model-estimated scenario probability based on current signals. Not a guarantee.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Scenario A */}
                      <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/8 transition-colors flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300  tracking-wider">A: Holds Support</span>
                            <span className="text-lg font-extrabold text-emerald-400 font-mono">{probabilities.hold}%</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">Trigger: Defends S1 level (${th?.supportLevels?.[0]?.price?.toFixed(2) || 'Nearest Support'})</span>
                          <p className="text-xs text-slate-350 font-sans mt-2">Buyers step in near primary support, generating an accumulation base to reverse control.</p>
                        </div>
                        <div className="pt-2.5 border-t border-emerald-500/15 text-[10px] text-slate-400 font-sans font-semibold">
                          Action: Buy entry on S1 bounce with stop loss intact
                        </div>
                      </div>

                      {/* Scenario B */}
                      <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/8 transition-colors flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300  tracking-wider">B: Support Breaks</span>
                            <span className="text-lg font-extrabold text-red-400 font-mono">{probabilities.breakProb}%</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">Trigger: Drops below Stop Loss (${th?.stopLossPrice?.toFixed(2) || 'Stop Price'})</span>
                          <p className="text-xs text-slate-350 font-sans mt-2">Sellers dominate, forcing a break of S1 levels. High volume confirms breakdown continuation.</p>
                        </div>
                        <div className="pt-2.5 border-t border-red-500/15 text-[10px] text-slate-400 font-sans font-semibold">
                          Action: Exit long holdings; watch for short entry trigger
                        </div>
                      </div>

                      {/* Scenario C */}
                      <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 hover:bg-indigo-500/8 transition-colors flex flex-col justify-between space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-300  tracking-wider">C: Sideways</span>
                            <span className="text-lg font-extrabold text-indigo-400 font-mono">{probabilities.sideways}%</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">Trigger: Stays in S1-R1 Range</span>
                          <p className="text-xs text-slate-350 font-sans mt-2">Low volume consolidation between support and resistance lines with no clear direction.</p>
                        </div>
                        <div className="pt-2.5 border-t border-indigo-500/15 text-[10px] text-slate-400 font-sans font-semibold">
                          Action: Wait for breakout confirmation; write premium/straddle
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-[11px] text-slate-450 leading-relaxed font-sans">
                      <strong className="text-slate-350 font-semibold">Risk Probability Commentary:</strong>{' '}
                      {th?.riskMetrics?.analysis || 'Trend structure is evaluated dynamically based on relative distance to key pivot targets.'}
                    </div>
                  </section>

                  {/* SECTION 6: SIGNAL CORRELATION EXPLANATION */}
                  <section id="signals" className="card flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Signal Correlation & Score Explanation</h2>
                      <p className="text-xs text-slate-450 mt-0.5">Why the score is bullish, bearish, or mixed</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-5 items-start justify-between bg-slate-950/40 p-4 rounded-2xl border border-slate-850/60">
                      <div className="space-y-2 max-w-sm">
                        <h4 className="text-sm font-extrabold text-slate-200">
                          Why is the outlook{' '}
                          <span className={bias === 'BULLISH' ? 'text-emerald-400' : bias === 'BEARISH' ? 'text-red-400' : 'text-amber-400'}>
                            {bias}
                          </span>?
                        </h4>
                        <p className="text-xs text-slate-400 font-sans leading-relaxed">
                          {bias === 'BULLISH' && 'The daily trend is positive, price is holding above the EMA(20), and relative volume/momentum confirms buying interest.'}
                          {bias === 'BEARISH' && 'Sellers have control. Price trades below key EMA(20) and EMA(50) lines, and MACD/RSI(14) structures indicate continuing selling pressure.'}
                          {bias === 'HOLD' && 'Signals are mixed. The stock is near major support levels, but volume and momentum have not confirmed a bounce yet.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold block">Confidence</span>
                          <span className="text-lg font-extrabold text-brand-400 font-mono block leading-tight">{confidence}%</span>
                        </div>
                        <div className="h-8 w-px bg-slate-800" />
                        <div>
                          <span className="text-[10px] text-slate-500 font-bold block">Signal Status</span>
                          <span className={`text-lg font-extrabold font-mono block leading-tight ${
                            bias === 'BUY' || bias === 'BULLISH' ? 'text-emerald-400' :
                            bias === 'SELL' || bias === 'BEARISH' ? 'text-red-400' :
                            bias === 'WATCHLIST' ? 'text-indigo-400' :
                            bias === 'HOLD' ? 'text-amber-400' :
                            bias === 'AVOID' ? 'text-slate-400' :
                            'text-slate-400'
                          }`}>
                            {bias}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown of Bullish / Bearish evidence list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-350  tracking-wider">Active Signals Correlation</h4>
                      <div className="space-y-2 bg-slate-950/20 p-3.5 rounded-xl border border-slate-850">
                        {technicals?.signals && technicals.signals.length > 0 ? (
                          technicals.signals.map((sig: string, idx: number) => {
                            const lowSig = sig.toLowerCase();
                            const isBullish = lowSig.includes('bullish') || lowSig.includes('buy') || lowSig.includes('above') || lowSig.includes('crossover');
                            const isBearish = lowSig.includes('bearish') || lowSig.includes('sell') || lowSig.includes('below') || lowSig.includes('under');
                            return (
                              <div key={idx} className="flex gap-2.5 items-start py-1.5 border-b border-slate-900 last:border-0 text-xs">
                                {isBullish ? (
                                  <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                ) : isBearish ? (
                                  <TrendingDown className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                ) : (
                                  <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                )}
                                <span className="text-slate-300 font-sans leading-relaxed">{sig}</span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-xs text-slate-500 italic">No signals analyzed.</div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* SECTION 7: CATALYSTS AND RISKS */}
                  <section id="risks" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Catalyst card */}
                    <div className="card border border-emerald-500/10 flex flex-col gap-3.5">
                      <h3 className="text-sm font-bold text-emerald-400  tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" /> What can push the stock up?
                      </h3>
                      <ul className="space-y-3">
                        {r?.keyCatalysts && r.keyCatalysts.length > 0 ? (
                          r.keyCatalysts.map((c: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                              <span className="font-sans leading-relaxed">{c}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-500 italic">No positive catalysts logged.</li>
                        )}
                      </ul>
                    </div>

                    {/* Risks card */}
                    <div className="card border border-red-500/10 flex flex-col gap-3.5">
                      <h3 className="text-sm font-bold text-red-400  tracking-wider flex items-center gap-2">
                        <AlertCircle className="w-4.5 h-4.5 text-red-400" /> What can push the stock down?
                      </h3>
                      <ul className="space-y-3">
                        {r?.keyRisks && r.keyRisks.length > 0 ? (
                          r.keyRisks.map((c: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                              <span className="font-sans leading-relaxed">{c}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-slate-500 italic">No negative risks logged.</li>
                        )}
                      </ul>
                    </div>
                  </section>

                  {/* SECTION 8: TECHNICAL EVIDENCE */}
                  <section id="details" className="card border border-slate-850">
                    <button
                      onClick={() => toggleSection('technicalDetails')}
                      className="w-full flex items-center justify-between text-left focus:outline-none"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-slate-100">Advanced Technical Evidence</h2>
                        <p className="text-xs text-slate-450 mt-0.5">Underlying mathematical indicators for expert review</p>
                      </div>
                      {expanded['technicalDetails'] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {expanded['technicalDetails'] && (
                      <div className="mt-5 space-y-6 animate-fade-in border-t border-slate-850 pt-5">
                        
                        {/* Price Area Chart */}
                        {candles.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-450  tracking-wider font-mono">Price History (60 Days)</h4>
                            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                              <ResponsiveContainer width="100%" height={220}>
                                <AreaChart data={candles.slice(-60)}>
                                  <defs>
                                    <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval={9} />
                                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} width={45} />
                                  <RechartsTooltip
                                    contentStyle={{ background: '#172033', border: '1px solid #334155', borderRadius: 12, fontSize: 11 }}
                                    labelStyle={{ color: '#94a3b8' }}
                                    itemStyle={{ color: '#0d9488' }}
                                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, 'Close']}
                                  />
                                  <Area type="monotone" dataKey="close" stroke="#0f766e" strokeWidth={2.5} fill="url(#colorClose)" dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
                          {[
                            { 
                              name: 'RSI (14)', 
                              value: technicals?.rsi14 ? `${technicals.rsi14.toFixed(1)}${technicals.rsi14Prev != null ? ` (${technicals.rsi14 > technicals.rsi14Prev ? 'Rising ▲' : 'Fading ▼'})` : ''}` : 'N/A', 
                              term: 'rsi',
                              meaning: technicals?.rsi14 < 30 ? 'Oversold / Rebound candidate' : technicals?.rsi14 > 70 ? 'Overbought / Cooldown candidate' : 'Neutral range' 
                            },
                            { 
                              name: 'MACD Line', 
                              value: technicals?.macdLine ? technicals.macdLine.toFixed(3) : 'N/A', 
                              term: 'macd',
                              meaning: technicals?.macdLine > 0 ? 'Bullish crossover trend' : 'Bearish momentum structure' 
                            },
                            { 
                              name: 'Average Volume', 
                              value: ts?.price_summary?.average_volume ? ts.price_summary.average_volume.toLocaleString() : 'N/A', 
                              term: 'volume',
                              meaning: '30-day liquidity baseline' 
                            },
                            { 
                              name: 'Average Range (ATR)', 
                              value: technicals?.atr14 ? `$${technicals.atr14.toFixed(2)}` : 'N/A', 
                              term: 'atr',
                              meaning: 'Average daily dollar fluctuation' 
                            },
                            { 
                              name: 'Trend Strength (ADX)', 
                              value: technicals?.adx14 ? technicals.adx14.toFixed(1) : 'N/A', 
                              term: 'adx',
                              meaning: technicals?.adx14 > 25 ? 'Strong active trend' : 'Consolidating / rangebound' 
                            },
                            { 
                              name: 'VWAP Position', 
                              value: technicals?.vwap ? `$${technicals.vwap.toFixed(2)}` : 'N/A', 
                              term: 'vwap',
                              meaning: 'Institution average price weight' 
                            },
                            { 
                              name: 'Short Interest', 
                              value: ts?.evidence?.short_context?.short_interest_percent != null ? `${parseFloat(ts.evidence.short_context.short_interest_percent).toFixed(1)}%` : 'N/A', 
                              term: 'shortinterest',
                              meaning: ts?.evidence?.short_context?.summary || 'Percentage of float shares shorted'
                            },
                            { 
                              name: 'Days to Cover', 
                              value: ts?.evidence?.short_context?.days_to_cover != null ? `${parseFloat(ts.evidence.short_context.days_to_cover).toFixed(1)} days` : 'N/A', 
                              term: 'daystocover',
                              meaning: 'Time required for shorts to cover' 
                            },
                            { 
                              name: 'Short Squeeze Risk', 
                              value: ts?.evidence?.short_context?.short_squeeze_risk ? ts.evidence.short_context.short_squeeze_risk.toUpperCase() : 'N/A', 
                              term: 'squeezerisk',
                              meaning: 'Potential for fast short covering spike' 
                            },
                            { 
                              name: 'Sector Change', 
                              value: ts?.evidence?.sector_context?.sector_name ? `${ts.evidence.sector_context.sector_name} (${getPercentSign(ts.evidence.sector_context.sector_change_percent)}${formatPercent(ts.evidence.sector_context.sector_change_percent)}%)` : 'N/A', 
                              term: 'sector',
                              meaning: 'Daily sector average return' 
                            },
                            { 
                              name: 'Index Change', 
                              value: ts?.evidence?.sector_context?.index_change_percent != null ? `${getPercentSign(ts.evidence.sector_context.index_change_percent)}${formatPercent(ts.evidence.sector_context.index_change_percent)}%` : 'N/A', 
                              term: 'index',
                              meaning: 'Benchmark index daily return' 
                            }
                          ].map((ind) => (
                            <TermTooltip key={ind.name} term={ind.term}>
                              <div className="p-3.5 bg-slate-950/45 border border-slate-850 hover:border-slate-800 rounded-xl space-y-1.5 transition-colors">
                                <span className="text-xs text-slate-400 font-extrabold  tracking-wider block">{ind.name}</span>
                                <span className="text-base font-black text-slate-100 font-mono block">{ind.value}</span>
                                <span className="text-xs font-semibold text-slate-300 block leading-tight">{ind.meaning}</span>
                              </div>
                            </TermTooltip>
                          ))}
                        </div>

                        {/* Support & Resistance pivot details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                            <span className="text-xs font-bold text-emerald-400  tracking-wider block mb-2">Support Levels (S1 - S3)</span>
                            <div className="space-y-1.5 font-mono text-xs">
                              {technicals?.supportLevels?.length > 0 ? (
                                technicals.supportLevels.slice(0, 3).map((lvl: number, i: number) => (
                                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-900/60 last:border-0">
                                    <span>Support Level {i + 1}</span>
                                    <span className="font-bold text-emerald-400">${lvl.toFixed(2)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500 italic block">No support pivots resolved.</span>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850/50">
                            <span className="text-xs font-bold text-red-400  tracking-wider block mb-2">Resistance Levels (R1 - R3)</span>
                            <div className="space-y-1.5 font-mono text-xs">
                              {technicals?.resistanceLevels?.length > 0 ? (
                                technicals.resistanceLevels.slice(0, 3).map((lvl: number, i: number) => (
                                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-900/60 last:border-0">
                                    <span>Resistance Level {i + 1}</span>
                                    <span className="font-bold text-red-400">${lvl.toFixed(2)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-500 italic block">No resistance pivots resolved.</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </section>

                  {/* SECTION 9: FUNDAMENTAL / NEWS / INSTITUTIONAL CONTEXT */}
                  <section className="card flex flex-col gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">Fundamental & News Context</h2>
                      <p className="text-xs text-slate-450 mt-0.5">Corporate health, analyst consensus, and supply chain network</p>
                    </div>

                    <div className="flex border-b border-slate-850 overflow-x-auto scrollbar-none gap-1">
                      {[
                        { id: 'fundamentals', label: 'Score Cards' },
                        { id: 'news', label: 'Catalyst News' },
                        { id: 'analysts', label: 'Analyst Sentiment' },
                        { id: 'ecosystem', label: 'Ecosystem Insights' }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-4 py-2.5 text-xs font-bold  tracking-wider border-b-2 transition shrink-0 ${
                            activeTab === tab.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      {activeTab === 'fundamentals' && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
                              <span className="text-[10px] text-slate-500 font-bold  block tracking-wider mb-2">Fundamental Rating</span>
                              <ScoreBar label="Corporate Score" value={r?.fundamentalScore} />
                            </div>
                            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
                              <span className="text-[10px] text-slate-500 font-bold  block tracking-wider mb-2">News Rating</span>
                              <ScoreBar label="News Sentiment" value={r?.newsCatalystScore} />
                            </div>
                          </div>
                          {th?.shortFilter && (
                            <div className="p-4 bg-slate-950/20 border border-slate-850 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-slate-300  tracking-wider">Short Selling parameters</h4>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-slate-500 block">Short Interest:</span>
                                  <span className="text-slate-200 font-bold">{th.shortFilter.shortInterest || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Borrow Fee:</span>
                                  <span className="text-slate-200 font-bold">{th.shortFilter.borrowFee || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">SSR Status:</span>
                                  <span className="text-slate-200 font-bold">{th.shortFilter.ssrStatus || 'Inactive'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'news' && (
                        <div className="space-y-3.5 animate-fade-in">
                          {ts?.evidence?.news_catalysts?.length > 0 ? (
                            ts.evidence.news_catalysts.map((news: any, idx: number) => (
                              <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[10px] text-slate-550">
                                  <span>{news.source} · {new Date(news.published_at).toLocaleDateString()}</span>
                                  <span className={`px-1.5 py-0.25 rounded  font-bold text-[9px] ${
                                    news.impact === 'positive' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'
                                  }`}>
                                    {news.impact}
                                  </span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-200 leading-snug">{news.headline}</h4>
                                <p className="text-xs text-slate-400 font-sans leading-relaxed">{news.summary}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic py-4">No recent news catalyst logs resolved.</p>
                          )}
                        </div>
                      )}

                      {activeTab === 'analysts' && (
                        <div className="space-y-3 animate-fade-in">
                          {ts?.evidence?.analyst_actions?.length > 0 ? (
                            ts.evidence.analyst_actions.map((act: any, idx: number) => (
                              <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl flex items-start justify-between gap-4 text-xs font-sans">
                                <div className="space-y-1">
                                  <strong className="text-slate-200 block">{act.firm}</strong>
                                  <p className="text-slate-400 font-normal leading-relaxed">{act.summary}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold  ${
                                    act.action === 'upgrade' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {act.action}
                                  </span>
                                  {act.new_target && <span className="font-mono text-slate-400 block mt-1">${act.new_target} target</span>}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-500 italic py-4">No analyst coverage upgrades logged today.</p>
                          )}
                        </div>
                      )}

                      {activeTab === 'ecosystem' && (
                        <div className="space-y-4 animate-fade-in">
                          {!r?.companyInsights ? (
                            <div className="p-6 bg-slate-950/20 border border-slate-850 rounded-xl text-center space-y-3">
                              <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto" />
                              <h4 className="text-sm font-bold text-slate-350">Ecosystem Insights Unavailable</h4>
                              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                                This report is missing strategic business network analysis. Please trigger a re-analysis of the stock to compile fresh ecosystem insights.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Strategic Outlook */}
                              {r.companyInsights.strategicOutlook && (
                                <div className="p-4 rounded-xl border border-brand-500/10 bg-brand-500/5 hover:border-brand-500/20 transition-all space-y-2">
                                  <div className="flex items-center gap-2 border-b border-brand-500/10 pb-2">
                                    <Globe className="w-4 h-4 text-brand-400 shrink-0" />
                                    <h4 className="text-xs font-bold text-brand-400  tracking-wider">Strategic Ecosystem Outlook</h4>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed whitespace-pre-line">
                                    {r.companyInsights.strategicOutlook}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* Strategic Investment Portfolio */}
                                <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3 flex flex-col justify-start">
                                  <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                                    <Coins className="w-4 h-4 text-slate-400" />
                                    <h4 className="text-xs font-bold text-slate-350  tracking-wider">Strategic Investment Portfolio</h4>
                                  </div>
                                  {r.companyInsights.investedCompanies && r.companyInsights.investedCompanies.length > 0 ? (
                                    <div className="space-y-3">
                                      {r.companyInsights.investedCompanies.map((company: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-slate-950/45 border border-slate-850 rounded-lg space-y-2 text-xs">
                                          <div className="flex justify-between items-center">
                                            <strong className="text-slate-200 text-sm font-sans">{company.name}</strong>
                                            {company.ownershipPct && (
                                              <span className="px-2 py-0.5 rounded bg-brand-500/15 text-brand-400 font-mono text-[10px] font-bold">
                                                {company.ownershipPct} Own
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-slate-400 font-sans"><strong className="text-slate-350">Performance:</strong> {company.performance}</p>
                                          {company.upcomingEvents && company.upcomingEvents.length > 0 && (
                                            <div className="space-y-1 pl-2 border-l border-slate-850">
                                              <span className="text-[10px] font-bold text-slate-500  tracking-wider block">Upcoming Events:</span>
                                              {company.upcomingEvents.map((evt: string, eIdx: number) => (
                                                <span key={eIdx} className="text-slate-400 text-[11px] block">• {evt}</span>
                                              ))}
                                            </div>
                                          )}
                                          <p className="text-slate-455 font-sans"><strong className="text-brand-500/80">Impact Channel:</strong> {company.impactPotential}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic py-4">No major strategic investment portfolio reported.</p>
                                  )}
                                </div>

                                {/* Business Dependency Network */}
                                <div className="space-y-4">
                                  {[
                                    { title: 'Suppliers & Infrastructure', items: r.companyInsights.dependencies?.suppliers },
                                    { title: 'Target Customers', items: r.companyInsights.dependencies?.customers },
                                    { title: 'Support & Outsourcing Partners', items: r.companyInsights.dependencies?.outsourcePartners },
                                    { title: 'Marketing Channels & Partners', items: r.companyInsights.dependencies?.marketingPartners }
                                  ].map((group, idx) => {
                                    if (!group.items || group.items.length === 0) return null;
                                    return (
                                      <div key={idx} className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl space-y-3">
                                        <h4 className="text-xs font-bold text-slate-350  tracking-wider border-b border-slate-900 pb-1.5">{group.title}</h4>
                                        <div className="space-y-3 font-sans text-xs">
                                          {group.items.map((partner: any, pIdx: number) => (
                                            <div key={pIdx} className="space-y-1">
                                              <div className="flex justify-between font-bold text-slate-200">
                                                <span>{partner.name}</span>
                                                <span className="text-[10px] text-slate-550 font-normal italic">{partner.role}</span>
                                              </div>
                                              <p className="text-slate-400 leading-normal">{partner.description}</p>
                                              {partner.riskExposure && (
                                                <p className="text-[11px] text-amber-500/80 leading-normal flex items-start gap-1">
                                                  <span className="shrink-0 mt-0.5">⚠️</span>
                                                  <span>Risk: {partner.riskExposure}</span>
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {/* If all dependencies lists are empty */}
                                  {(!r.companyInsights.dependencies || 
                                    (!r.companyInsights.dependencies.suppliers?.length && 
                                     !r.companyInsights.dependencies.customers?.length && 
                                     !r.companyInsights.dependencies.outsourcePartners?.length && 
                                     !r.companyInsights.dependencies.marketingPartners?.length)) && (
                                    <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-center py-6 text-slate-500 italic text-xs">
                                      No supply chain dependencies reported.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* SECTION 10: FINAL ANALYST VIEW */}
                  <section className="card border border-brand-500/15 bg-brand-500/5 p-5 md:p-6 space-y-3.5">
                    <h3 className="text-sm font-bold text-brand-400  tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-brand-400" />
                      Final Analyst View
                    </h3>
                    
                    <div className="space-y-3 font-sans leading-relaxed text-sm">
                      <div className="text-slate-200 italic">
                        "{finalSummary?.one_line_story || r?.executiveSummary || 'Research results are aggregated and structured for safe study.'}"
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-850/60 text-xs">
                        <div className="space-y-1">
                          <strong className="text-slate-350  tracking-wider text-[10px] block">Best-Case Scenario</strong>
                          <span className="text-slate-300 leading-normal block">Defends key support pivot, holds S1 levels, and rallies on volume breakout confirmation to Target 1.</span>
                        </div>
                        <div className="space-y-1">
                          <strong className="text-slate-350  tracking-wider text-[10px] block">Worst-Case / Breakdown Risk</strong>
                          <span className="text-rose-400/90 leading-normal block">{finalSummary?.risk_warning || 'Breaks below Stop Loss, invalidating trade setup. Keep stops tight.'}</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs space-y-1 font-sans">
                        <strong className="text-slate-300 font-bold block mb-0.5">Safer Action Suggestion</strong>
                        <p className="text-slate-350">{swing?.wait_for_confirmation ? `Wait for confirmation: ${swing.wait_for_confirmation}` : 'Wait for volume breakout before entering positions near the accumulation zone.'}</p>
                      </div>
                    </div>
                  </section>


                </div>

                {/* Right Sticky Summary panel (Desktop) */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 hidden lg:block">
                  <div className="card border-slate-850 space-y-4">
                    <div className="border-b border-slate-850/50 pb-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500  font-black tracking-wider">Quick Action Plan</span>
                      <StatusBadge status={bias} size="sm" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Current Price</span>
                        <span className="font-mono font-bold text-slate-200">${price?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Accumulation / Entry</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {swing?.entry_zone ? `$${swing.entry_zone.low?.toFixed(2)} - $${swing.entry_zone.high?.toFixed(2)}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Targets</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {swing?.target_1 ? `$${swing.target_1?.toFixed(2)} / $${swing.target_2?.toFixed(2)}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450">Stop Loss</span>
                        <span className="font-mono font-bold text-rose-400">
                          {swing?.stop_loss ? `$${swing.stop_loss?.toFixed(2)}` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-850/50 pt-3 space-y-2.5">
                      <span className="text-[10px] text-slate-500  font-bold tracking-wider block">Estimated Scenarios</span>
                      <div className="space-y-1.5 text-xs font-semibold">
                        <div className="flex justify-between text-emerald-400">
                          <span>Support Holds Probability</span>
                          <span>{probabilities.hold}%</span>
                        </div>
                        <div className="flex justify-between text-rose-400">
                          <span>Support Breaks Probability</span>
                          <span>{probabilities.breakProb}%</span>
                        </div>
                        <div className="flex justify-between text-indigo-400">
                          <span>Sideways Consolidation</span>
                          <span>{probabilities.sideways}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-850/50 pt-3 text-[10px] text-slate-450 leading-relaxed font-sans">
                      <strong className="text-slate-350 font-bold block mb-0.5">Confirmation Trigger:</strong>
                      {swing?.wait_for_confirmation || 'Wait for buyers to defend S1 pivot before scaling entry.'}
                    </div>
                  </div>
                </div>

              </div>

              {/* Mobile sticky bottom action bar */}
              <div className="lg:hidden fixed bottom-0 inset-x-0 bg-surface-900 border-t border-slate-850 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] flex items-center justify-between z-40 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 font-bold tracking-wider">Bias Suggestion</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RatingBadge rating={bias} size="sm" />
                    <span className="text-xs font-mono font-bold text-slate-300">Confidence: {confidence}%</span>
                  </div>
                </div>
                <button
                  onClick={() => scrollToSection('action')}
                  className="btn-primary text-xs py-2 px-4 rounded-xl"
                >
                  View Entry Plan
                </button>
              </div>

            </div>
          )
        ) : null}
      </PageContainer>
    </div>
  );
};

export default StockDetail;
