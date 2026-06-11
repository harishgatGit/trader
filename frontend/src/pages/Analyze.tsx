import React, { useState, useEffect } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Loader, Clock, AlertCircle, SkipForward, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Layers, Activity } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, ScoreBar, DataUnavailable, TermTooltip } from '../components/ui';
import { TrendStoryCard } from '../components/TrendStoryCard';
import { STOCK_DICTIONARY } from '../utils/stockDictionary';
import { stocksApi } from '../services/api';

const POPULAR = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'SPY', 'QQQ', 'AMD', 'META', 'GOOGL', 'AMZN'];

const statusIcon = (status: string) => {
  switch (status) {
    case 'done': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-400" />;
    case 'running': return <Loader className="w-4 h-4 text-brand-400 animate-spin" />;
    case 'skipped': return <SkipForward className="w-4 h-4 text-slate-500" />;
    default: return <Clock className="w-4 h-4 text-slate-600" />;
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  priceTrendAlignment: 'Price Trend Alignment',
  volumeConfirmation: 'Volume Confirmation',
  momentumIndicators: 'Momentum Indicators',
  movingAverageStructure: 'Moving Average Structure',
  vwapPosition: 'VWAP Position',
  supportResistanceRiskReward: 'Support/Resistance Risk-Reward',
  sectorIndexAlignment: 'Sector/Index Alignment',
  shortInterestContext: 'Short Interest Context',
  newsCatalystConfirmation: 'News/Catalyst Confirmation',
  institutionalFlowProxy: 'Institutional Flow Proxy',
};

const AnalyzePage: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showFundModal, setShowFundModal] = useState(false);
  const [errorModalDismissed, setErrorModalDismissed] = useState(false);
  const [dailyTrendExpanded, setDailyTrendExpanded] = useState(false);
  const [signalCorrelationExpanded, setSignalCorrelationExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { analyzing, analysisProgress, currentAnalysis, runAnalysis } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    const query = symbol.trim();
    if (!query) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await stocksApi.searchStocks(query);
        setSuggestions(results || []);
      } catch (err) {
        console.error('Failed to fetch autocomplete suggestions:', err);
        const localResults = STOCK_DICTIONARY.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);
        setSuggestions(localResults);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [symbol]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isFundDetected = (() => {
    if (!symbol.trim()) return false;
    const clean = symbol.toUpperCase().trim();
    
    // 1. Check known fund symbols
    const fundSymbols = ['SPY', 'QQQ', 'DIA', 'IWM', 'VOO', 'VTI', 'TLT', 'GLD', 'USO', 'XLF', 'XLK', 'XLE', 'XLV', 'XLY', 'XLP', 'XLI', 'IVV'];
    if (fundSymbols.includes(clean)) return true;

    // 2. Check text keywords
    if (clean.includes('FUND') || clean.includes('ETF') || clean.includes('TRUST') || clean.includes('INDEX') || clean.includes('MUTUAL')) {
      return true;
    }

    // 3. Check if matching suggestion has fund sector
    const queryLower = symbol.trim().toLowerCase();
    const suggestions = STOCK_DICTIONARY.filter(
      (s) =>
        s.symbol.toLowerCase() === queryLower ||
        s.name.toLowerCase() === queryLower
    );
    if (suggestions.some(s => s.sector === 'Exchange Traded Funds' || s.name.toUpperCase().includes('ETF') || s.name.toUpperCase().includes('FUND'))) {
      return true;
    }

    return false;
  })();

  const triggerAnalysis = async (sym: string) => {
    if (!sym.trim()) return;

    const cleanSym = sym.toUpperCase().trim();
    const queryLower = sym.trim().toLowerCase();
    setShowSuggestions(false);
    setErrorModalDismissed(false);
    document.getElementById('symbol-input')?.blur();
    try {
      await runAnalysis(cleanSym);
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerAnalysis(symbol);
  };

  const handleSelectSuggestion = (sym: string) => {
    setSymbol(sym);
    triggerAnalysis(sym);
  };

  const handleQuick = (sym: string) => {
    setSymbol(sym);
    triggerAnalysis(sym);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = suggestions[activeSuggestion];
      if (selected) {
        handleSelectSuggestion(selected.symbol);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const report = currentAnalysis?.report;

  // Detect data quality failure
  const dataQualityRating = report?.dataQuality?.rating;
  const hasInsufficientData =
    !report?.isFund && (
      dataQualityRating === 'INSUFFICIENT' ||
      (!report?.finalRating && !analyzing && analysisProgress.some(s => s.status === 'error')) ||
      (report && !report.currentPrice && !report.technicalScore && !report.fundamentalScore)
    );

  const retryAnalysis = () => {
    const sym = (report?.symbol || currentAnalysis?.symbol || symbol).toUpperCase().trim();
    if (sym) runAnalysis(sym);
  };
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">AI Stock Analysis</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">Enter a ticker to run a full AI-powered analyst report</p>
      </div>

      {/* Search Form */}
      <div className="card-glass p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              id="symbol-input"
              type="text"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setShowSuggestions(true);
                setActiveSuggestion(0);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Short timeout to let the list click trigger
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter ticker or company name…"
              className="input pl-10 py-3 text-base sm:text-lg font-bold"
              maxLength={40}
              disabled={analyzing}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && !isMobile && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-800/40 max-h-60 overflow-y-auto animate-fade-in">
                {suggestions.map((item, idx) => {
                  const isActive = activeSuggestion === idx;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${
                        isActive ? 'bg-brand-500/10 text-brand-400 font-bold' : 'hover:bg-slate-800/50 text-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-xs tracking-wider">
                          {item.symbol}
                        </span>
                        <span className="text-xs font-semibold font-sans">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-550 uppercase font-bold font-sans tracking-wide">
                        {item.exchange || item.sector || ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={analyzing || !symbol.trim()}
            className="btn-primary py-3 px-6 shrink-0 sm:w-auto w-full text-base font-bold"
          >
            {analyzing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {/* Quick picks */}
        <div className="flex flex-wrap gap-2.5 mt-3.5">
          <span className="text-xs text-slate-500 self-center font-semibold">Popular:</span>
          {POPULAR.map((s) => (
            <button
              key={s}
              onClick={() => handleQuick(s)}
              disabled={analyzing}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors font-mono font-semibold"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {analyzing && analysisProgress.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Analysis Progress</h2>
          {analysisProgress.map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-1.5 border-b border-slate-800/50 last:border-0">
              <div className="mt-0.5">{statusIcon(step.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${step.status === 'running' ? 'text-brand-400' : step.status === 'done' ? 'text-slate-200' : step.status === 'error' ? 'text-red-400' : 'text-slate-500'}`}>
                    {step.step}
                  </span>
                  <span className={`text-xs capitalize px-1.5 py-0.5 rounded ${
                    step.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' :
                    step.status === 'error' ? 'bg-red-500/10 text-red-400' :
                    step.status === 'running' ? 'bg-brand-500/10 text-brand-400' :
                    step.status === 'skipped' ? 'bg-slate-700/50 text-slate-500' :
                    'bg-slate-800 text-slate-600'
                  }`}>
                    {step.status}
                  </span>
                </div>
                {step.message && (
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{step.message}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Preview */}
      {report && !analyzing && !hasInsufficientData ? (
        <div className="space-y-4 slide-up">
          {/* Cache Metadata Info */}
          {(currentAnalysis as any)?.cache && (
            <div className="card-glass py-3 px-4 border border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <Clock className="w-4 h-4 text-brand-400" />
                <span>
                  This report was generated{' '}
                  <strong className="text-slate-200">
                    {(currentAnalysis as any).cache.generatedXMinutesAgo === 0
                      ? 'just now'
                      : `${(currentAnalysis as any).cache.generatedXMinutesAgo} min${(currentAnalysis as any).cache.generatedXMinutesAgo !== 1 ? 's' : ''} ago`}
                  </strong>
                  . It will regenerate in{' '}
                  <strong className="text-slate-200">
                    {(currentAnalysis as any).cache.regenerateInYMinutes} min{(currentAnalysis as any).cache.regenerateInYMinutes !== 1 ? 's' : ''}
                  </strong>
                  .
                </span>
              </div>
              {(currentAnalysis as any).cache.cached && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20 text-brand-400 uppercase tracking-wider font-mono">
                  Cached
                </span>
              )}
            </div>
          )}

          {report.isFund ? (
            <div className="card-glass border-2 border-brand-700/40 glow-brand p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* @ts-ignore */}
                    <ViewTransition name={`stock-symbol-analyze-${report.symbol}`} share="text-morph" default="none">
                      <span className="text-2xl font-bold font-mono text-slate-100">{report.symbol}</span>
                    </ViewTransition>
                    <RatingBadge rating={report.finalDecision?.finalRating} size="lg" />
                  </div>
                  <h2 className="text-base font-semibold text-slate-200 mt-1">{report.fundName}</h2>
                  <span className="text-xs text-brand-400 font-bold uppercase tracking-wider font-mono">
                    {report.issuer} · ETF / Mutual Fund Review
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    Benchmark: <span className="font-semibold text-slate-350">{report.benchmarkIndex}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">CONFIDENCE</span>
                    <span className="text-lg font-bold font-mono text-brand-400">{report.finalDecision?.confidenceScore}%</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-brand-500/5 border border-brand-500/10 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Decision Summary</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {report.finalDecision?.decisionSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-450 block text-[9px] uppercase font-bold">Expense Ratio</span>
                  <span className="font-mono text-slate-200 font-bold block mt-0.5">{report.fundOverview?.expenseRatio}</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-450 block text-[9px] uppercase font-bold">Estimated AUM</span>
                  <span className="font-mono text-slate-200 font-bold block mt-0.5">{report.fundOverview?.aum}</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-450 block text-[9px] uppercase font-bold">Dividend Yield</span>
                  <span className="font-mono text-slate-200 font-bold block mt-0.5">{report.fundOverview?.dividendYield}</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850">
                  <span className="text-slate-450 block text-[9px] uppercase font-bold">Inception Date</span>
                  <span className="font-mono text-slate-200 font-bold block mt-0.5">{report.fundOverview?.inceptionDate}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate(`/stocks/${report.symbol || currentAnalysis.symbol}`, { state: { from: 'analyze' } })}
                  className="btn-primary flex-1 py-2.5 font-bold"
                >
                  View Full Fund Review
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Rating Card */}
              <div className="card-glass border-2 border-brand-700/40 glow-brand p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-analyze-${report.symbol || currentAnalysis.symbol}`} share="text-morph" default="none">
                        <span className="text-2xl font-bold font-mono text-slate-100">{report.symbol || currentAnalysis.symbol}</span>
                      </ViewTransition>
                      <RatingBadge rating={report.finalRating} size="lg" />
                    </div>
                    <p className="text-[14px] sm:text-[15px] text-slate-300 leading-relaxed font-sans font-normal max-w-2xl">
                      {report.executiveSummary?.substring(0, 300)}…
                    </p>
                  </div>
                </div>

                {/* Scores */}
                <div className="mt-4 space-y-2 border-t border-slate-700/50 pt-4">
                  <ScoreBar label="Technical Score" value={report.technicalScore} />
                  <ScoreBar label="Fundamental Score" value={report.fundamentalScore} />
                  <ScoreBar label="News Catalyst Score" value={report.newsCatalystScore} />
                  <ScoreBar label="Inst. Flow Proxy" value={report.institutionalFlowProxyScore} color="bg-brand-500" />
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => navigate(`/stocks/${report.symbol || currentAnalysis.symbol}`, { state: { from: 'analyze' } })}
                    className="btn-primary flex-1 py-2.5"
                  >
                    View Full Report
                  </button>
                </div>
              </div>

              {/* Why the Stock Moved Today (TrendStoryAgent) */}
              {report.trendStory && (
                <TrendStoryCard trendStory={report.trendStory} />
              )}

              {/* Signal Correlation Section */}
              {report.signalCorrelation && (() => {
                const sc = report.signalCorrelation;
                const isGreen = sc.finalZone === 'GREEN_ZONE';
                const isRed = sc.finalZone === 'RED_ZONE';
                
                let zoneColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                let glowColor = 'border-amber-500/20';
                if (isGreen) {
                  zoneColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  glowColor = 'border-emerald-500/20 glow-green';
                } else if (isRed) {
                  zoneColor = 'text-red-400 bg-red-500/10 border-red-500/20';
                  glowColor = 'border-red-500/20 glow-red';
                }

                return (
                  <div className={`card border p-5 sm:p-6 space-y-5 transition-all ${glowColor}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-brand-400" />
                          <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                            {sc.correlationName || 'Signal Correlation'}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Analyzed on {sc.analysisDate} · Confidence: <span className="font-semibold text-slate-300">{sc.confidenceLevel}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-550 font-bold uppercase block">SCORE</span>
                          <span className="text-xl font-bold font-mono text-slate-200">
                            {sc.correlationScore}
                            <span className="text-xs text-slate-550">/100</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Gradient Bar Visual */}
                    {sc.uiRecommendation?.showGradientBar && (
                      <div className="space-y-4 pb-12 relative px-1">
                        <div className="relative h-3 w-full rounded-full border border-slate-800 p-0.5 bg-slate-955/40">
                          <div 
                            className="h-full rounded-full" 
                            style={{ 
                              background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 50%, #10B981 100%)',
                              width: '100%'
                            }} 
                          />
                          {/* Upward pointing needle pointer badge below the track */}
                          <div 
                            className="absolute top-2.5 transition-all duration-700 ease-out z-10"
                            style={{ 
                              left: `calc(${sc.correlationScore ?? 50}% - 20px)`,
                            }}
                          >
                            <svg width="40" height="42" viewBox="0 0 40 42" className="text-sky-400 fill-current">
                              {/* Needle path pointing UP to (20, 0) */}
                              <path d="M20 0 L23.5 16 L16.5 16 Z" />
                              {/* Circular badge */}
                              <circle cx="20" cy="29" r="12" className="fill-slate-900 stroke-sky-400 stroke-2" />
                              <text x="20" y="33" textAnchor="middle" fontSize="10" fontWeight="bold" className="fill-sky-400 font-mono">
                                {sc.correlationScore}%
                              </text>
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Layman Summary Callout */}
                    <div className="px-1 py-1">
                      <p className="text-xs text-slate-350 leading-relaxed font-sans font-normal">
                        {sc.laymanSummary}
                      </p>
                    </div>

                    {/* Support & Resistance context */}
                    {sc.supportResistanceContext && (
                      <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">
                            Support & Resistance Context
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            sc.supportResistanceContext.riskRewardView === 'FAVORABLE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            sc.supportResistanceContext.riskRewardView === 'UNFAVORABLE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-slate-800 text-slate-450 border-slate-700/30'
                          }`}>
                            R/R: {sc.supportResistanceContext.riskRewardView.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="bg-slate-950/20 p-2.5 rounded border border-slate-850">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Nearest Support</span>
                            <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                              {sc.supportResistanceContext.nearestSupport ? `$${sc.supportResistanceContext.nearestSupport.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                          <div className="bg-slate-950/20 p-2.5 rounded border border-slate-850">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Distance to Support</span>
                            <span className="text-xs font-mono font-bold text-emerald-400 block mt-0.5">
                              {sc.supportResistanceContext.distanceToSupportPercent != null ? `${sc.supportResistanceContext.distanceToSupportPercent.toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="bg-slate-950/20 p-2.5 rounded border border-slate-850">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Nearest Resistance</span>
                            <span className="text-xs font-mono font-bold text-slate-300 block mt-0.5">
                              {sc.supportResistanceContext.nearestResistance ? `$${sc.supportResistanceContext.nearestResistance.toFixed(2)}` : 'N/A'}
                            </span>
                          </div>
                          <div className="bg-slate-950/20 p-2.5 rounded border border-slate-850">
                            <span className="text-[9px] text-slate-500 uppercase font-bold block">Distance to Resistance</span>
                            <span className="text-xs font-mono font-bold text-red-400 block mt-0.5">
                              {sc.supportResistanceContext.distanceToResistancePercent != null ? `${sc.supportResistanceContext.distanceToResistancePercent.toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          {sc.supportResistanceContext.explanation}
                        </p>
                      </div>
                    )}

                    {/* Accordion Toggle */}
                    <div className="flex justify-between items-center border-t border-slate-800/80 pt-4">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4.5 h-4.5 text-brand-400" />
                        <span className="text-xs font-bold text-slate-300">
                          Weighted Category Scores & Signals
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSignalCorrelationExpanded(!signalCorrelationExpanded)}
                        className="text-brand-400 hover:text-brand-300 transition flex items-center gap-1 text-xs font-bold"
                      >
                        {signalCorrelationExpanded ? (
                          <>
                            <span>Hide Details</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>View Details</span>
                            <ChevronDown className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {signalCorrelationExpanded && (
                      <div className="space-y-4 pt-1 animate-fade-in">
                        {/* Evidence breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20 p-4 rounded-xl border border-slate-850">
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                              Strongest Positive Driver
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {sc.correlationEvidence?.strongestPositiveEvidence || 'No dominant positive driver.'}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">
                              Strongest Negative Risk
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {sc.correlationEvidence?.strongestNegativeEvidence || 'No dominant negative risk.'}
                            </p>
                          </div>
                          {sc.correlationEvidence?.mixedSignalExplanation && (
                            <div className="col-span-1 md:col-span-2 pt-2.5 border-t border-slate-800/60">
                              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider block">
                                Mixed Signals Explanation
                              </span>
                              <p className="text-xs text-slate-400 leading-relaxed italic mt-0.5 font-sans">
                                {sc.correlationEvidence.mixedSignalExplanation}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 10 Category scores grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.entries(sc.signalScores).map(([key, val]: any) => (
                            <div key={key} className="bg-slate-900/40 p-3.5 rounded-xl border border-slate-850 hover:border-slate-800/80 transition-colors">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <span className="text-xs font-bold text-slate-300 leading-tight block">
                                    {CATEGORY_LABELS[key] || key}
                                  </span>
                                  <span className={`inline-flex px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                    val.status === 'POSITIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    val.status === 'NEGATIVE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    val.status === 'MIXED' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
                                    'bg-slate-800 text-slate-500 border-slate-700/30'
                                  }`}>
                                    {val.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="text-right shrink-0 font-mono">
                                  <span className="text-xs font-bold text-slate-200 font-mono">
                                    {val.score}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    /{val.maxScore}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10.5px] text-slate-400 mt-2 font-sans leading-relaxed">
                                {val.evidence}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Confirmations Needed block */}
                        {sc.confirmationNeeded && (
                          <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">
                                To Confirm Green Setup
                              </span>
                              {sc.confirmationNeeded.forGreenZone?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-350 font-sans">
                                  {sc.confirmationNeeded.forGreenZone.map((item: string, idx: number) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic font-sans">No confirmation conditions.</span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-brand-400 font-bold uppercase tracking-wider block">
                                To Upgrade to Green
                              </span>
                              {sc.confirmationNeeded.forYellowToGreenUpgrade?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-350 font-sans">
                                  {sc.confirmationNeeded.forYellowToGreenUpgrade.map((item: string, idx: number) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic font-sans">No upgrade triggers.</span>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider block">
                                Downside Warning Triggers
                              </span>
                              {sc.confirmationNeeded.forRedZoneWarning?.length > 0 ? (
                                <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-350 font-sans">
                                  {sc.confirmationNeeded.forRedZoneWarning.map((item: string, idx: number) => (
                                    <li key={idx} className="leading-relaxed">{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic font-sans">No warning conditions.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Daily Trend Catalyst Section */}
              {report.tacticalHorizonView?.dailyTrend && (() => {
                const dt = report.tacticalHorizonView.dailyTrend;
                const isUpward = dt.trend.toUpperCase().includes('UP') || dt.trend.toUpperCase().includes('BULL');
                const isDownward = dt.trend.toUpperCase().includes('DOWN') || dt.trend.toUpperCase().includes('BEAR');
                return (
                  <div className="card border border-brand-500/10 bg-brand-500/5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center justify-center p-2.5 rounded-xl border ${
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
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Trend</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isUpward
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isDownward
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-700/30'
                            }`}>
                              {dt.trend} ({dt.barCount} Bars)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDailyTrendExpanded(!dailyTrendExpanded)}
                            className="text-slate-450 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800/40 flex items-center gap-1 text-[11px] font-semibold"
                          >
                            {dailyTrendExpanded ? (
                              <>
                                <span>Hide details</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>View reasoning</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                        {dailyTrendExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-850 space-y-2 animate-fade-in">
                            <p className="text-xs text-slate-350 leading-relaxed font-sans">
                              <strong className="text-slate-450 font-bold mr-1">Reasoning / Catalyst:</strong>
                              {dt.analysis}
                            </p>
                            {dt.laymanExplanation && (
                              <p className="text-[11px] text-slate-450 pt-1.5 border-t border-slate-850 leading-relaxed font-sans italic">
                                <strong className="text-slate-350 font-medium not-italic mr-1">Layman's Takeaway:</strong>
                                {dt.laymanExplanation}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}



              {/* Price, Trend & Volume Analysis */}
              {report.technicalAnalysis && (() => {
                const tech = report.technicals?.primary;
                const curPrice = report.currentPrice || report.marketData?.price;
                return (
                  <div className="card space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
                      <h3 className="section-title mb-0">Price, Trend & Volume Analysis</h3>
                      <div className="flex gap-2">
                        <TermTooltip term={report.technicalAnalysis.overallBias}>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            report.technicalAnalysis.overallBias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-400' :
                            report.technicalAnalysis.overallBias === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                            report.technicalAnalysis.overallBias === 'MIXED' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            Bias: {report.technicalAnalysis.overallBias}
                          </span>
                        </TermTooltip>
                        {report.technicalAnalysis.trendStage && (
                          <TermTooltip term={report.technicalAnalysis.trendStage}>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-300">
                              Stage: {report.technicalAnalysis.trendStage.replace('_', ' ')}
                            </span>
                          </TermTooltip>
                        )}
                      </div>
                    </div>

                    {/* Market Cycle Stage Graphical Timeline */}
                    {report.technicalAnalysis.trendStage && (() => {
                      const currentStage = report.technicalAnalysis.trendStage.toUpperCase();
                      const stages = [
                        { id: 'ACCUMULATION', label: 'Accumulation', stage: 'Stage 1', icon: Layers, desc: 'Base building, smart money buying', color: 'indigo' },
                        { id: 'MARKUP', label: 'Markup', stage: 'Stage 2', icon: TrendingUp, desc: 'Uptrend advance, markup breakout', color: 'emerald' },
                        { id: 'DISTRIBUTION', label: 'Distribution', stage: 'Stage 3', icon: Activity, desc: 'Top distribution, institutional selling', color: 'amber' },
                        { id: 'MARKDOWN', label: 'Markdown', stage: 'Stage 4', icon: TrendingDown, desc: 'Downtrend decline, markup invalidation', color: 'red' },
                      ];

                      const isSideways = currentStage === 'SIDEWAYS';
                      
                      return (
                        <div className="bg-slate-950/20 p-4 rounded-xl border border-slate-850 space-y-3.5 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Market Cycle Phase</span>
                            {isSideways ? (
                              <span className="px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                                Current Stage: Sideways Range
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase bg-brand-500/10 text-brand-400 border-brand-500/25">
                                Current Stage: {currentStage}
                              </span>
                            )}
                          </div>

                          {/* Graphical Steps */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                            {/* Connecting Line (for desktop) */}
                            <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-800 hidden sm:block z-0" />

                            {stages.map((st) => {
                              const isActive = currentStage === st.id;
                              const isHighlightedSideways = isSideways && (st.id === 'ACCUMULATION' || st.id === 'DISTRIBUTION');
                              const Icon = st.icon;

                              // Colors configuration mapping
                              const borderCls = isActive 
                                ? st.id === 'ACCUMULATION' ? 'border-indigo-500 bg-indigo-500/5 glow-indigo' :
                                  st.id === 'MARKUP' ? 'border-emerald-500 bg-emerald-500/5 glow-emerald' :
                                  st.id === 'DISTRIBUTION' ? 'border-amber-500 bg-amber-500/5 glow-amber' :
                                  'border-red-500 bg-red-500/5 glow-red'
                                : isHighlightedSideways
                                  ? 'border-amber-500/30 border-dashed text-slate-450 bg-amber-500/5 animate-pulse'
                                  : 'border-slate-850 bg-slate-950/20 text-slate-600';

                              const iconBgCls = isActive
                                ? st.id === 'ACCUMULATION' ? 'bg-indigo-500 text-slate-100 shadow-md shadow-indigo-950/40' :
                                  st.id === 'MARKUP' ? 'bg-emerald-500 text-slate-100 shadow-md shadow-emerald-950/40' :
                                  st.id === 'DISTRIBUTION' ? 'bg-amber-500 text-slate-100 shadow-md shadow-amber-950/40' :
                                  'bg-red-500 text-slate-100 shadow-md shadow-red-950/40'
                                : isHighlightedSideways
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-900 text-slate-750 border border-slate-850';

                              return (
                                <div 
                                  key={st.id} 
                                  className={`relative z-10 flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-300 ${borderCls}`}
                                >
                                  {/* Pulse effect for active node */}
                                  {isActive && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                        st.id === 'ACCUMULATION' ? 'bg-indigo-400' :
                                        st.id === 'MARKUP' ? 'bg-emerald-400' :
                                        st.id === 'DISTRIBUTION' ? 'bg-amber-400' :
                                        'bg-red-400'
                                      }`}></span>
                                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                                        st.id === 'ACCUMULATION' ? 'bg-indigo-500' :
                                        st.id === 'MARKUP' ? 'bg-emerald-500' :
                                        st.id === 'DISTRIBUTION' ? 'bg-amber-500' :
                                        'bg-red-500'
                                      }`}></span>
                                    </span>
                                  )}

                                  {/* Stage Number / Label */}
                                  <span className={`text-[8px] font-bold uppercase tracking-wider block mb-1.5 ${
                                    isActive ? 'text-slate-200' : 'text-slate-650'
                                  }`}>
                                    {st.stage}
                                  </span>

                                  {/* Icon container */}
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 mb-2 ${iconBgCls}`}>
                                    <Icon className="w-4.5 h-4.5" strokeWidth={isActive ? 2.5 : 2} />
                                  </div>

                                  <span className={`text-xs font-bold font-sans ${isActive ? 'text-slate-100' : 'text-slate-450'}`}>
                                    {st.label}
                                  </span>
                                  <span className="text-[9px] text-slate-500 mt-1 leading-normal font-sans hidden sm:block max-w-[125px]">
                                    {st.desc}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Sideways / Unknown notice */}
                          {isSideways && (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-300/80">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>The stock is currently consolidating sideways within a range, indicating a consolidation base (Accumulation) or top (Distribution) before transitioning to the next major markup/markdown phase.</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Price & Moving Averages */}
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Trend & Price Action</div>
                        
                        {/* Moving Averages Grid (Visual Numbers) */}
                        {tech && (
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            {[
                              { label: 'EMA 20', val: tech.ema20 },
                              { label: 'EMA 50', val: tech.ema50 },
                              { label: 'EMA 200', val: tech.ema200 },
                            ].map((ma) => {
                              const isAbove = curPrice && ma.val && curPrice > ma.val;
                              return (
                                <div key={ma.label} className="bg-slate-900/50 p-2 rounded border border-slate-800/80 text-center">
                                  <span className="text-slate-450 block mb-0.5">{ma.label}</span>
                                  <span className="font-mono text-slate-200 font-bold block mb-1">
                                    {ma.val ? `$${ma.val.toFixed(2)}` : 'N/A'}
                                  </span>
                                  {ma.val && curPrice ? (
                                    <span className={`inline-block px-1.5 py-0.25 rounded-[3px] text-[8px] font-semibold ${
                                      isAbove ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                      {isAbove ? 'Price Above' : 'Price Below'}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* RSI Visual Gauge */}
                        {tech?.rsi14 != null && (
                          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 text-xs">
                            <div className="flex justify-between items-center text-slate-400 mb-1.5">
                              <span>Relative Strength Index (RSI)</span>
                              <span className={`font-bold font-mono ${
                                tech.rsi14 < 30 ? 'text-emerald-400' :
                                tech.rsi14 > 70 ? 'text-red-400' : 'text-slate-200'
                              }`}>
                                {tech.rsi14.toFixed(1)}
                                {tech.rsi14Prev != null && (
                                  <span className="text-[10px] font-normal opacity-85 ml-1.5 font-sans">
                                    ({tech.rsi14 > tech.rsi14Prev ? '↗ reached from ' : tech.rsi14 < tech.rsi14Prev ? '↘ reached from ' : '→ flat from '}
                                    {tech.rsi14Prev.toFixed(1)})
                                  </span>
                                )}{' '}
                                — {tech.rsi14 < 30 ? 'Oversold' : tech.rsi14 > 70 ? 'Overbought' : 'Neutral'}
                              </span>
                            </div>
                            <div className="relative h-2 bg-slate-800 rounded overflow-hidden">
                              <div className="absolute left-[30%] right-[30%] top-0 bottom-0 bg-slate-700/30 border-l border-r border-slate-700/50" />
                              <div 
                                className={`absolute top-0 bottom-0 w-1.5 -ml-0.75 rounded-full ${
                                  tech.rsi14 < 30 ? 'bg-emerald-400' :
                                  tech.rsi14 > 70 ? 'bg-red-400' : 'bg-brand-400'
                                }`}
                                style={{ left: `${Math.min(Math.max(tech.rsi14, 0), 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-1 font-mono">
                              <span>0 (Oversold)</span>
                              <span>30</span>
                              <span>70</span>
                              <span>100 (Overbought)</span>
                            </div>
                          </div>
                        )}

                        {report.technicalAnalysis.movingAverageAnalysis && (
                          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 text-xs">
                            <div className="font-semibold text-slate-300 mb-1">Moving Averages Commentary</div>
                            <p className="text-slate-400 leading-relaxed font-sans">{report.technicalAnalysis.movingAverageAnalysis}</p>
                          </div>
                        )}

                        {report.technicalAnalysis.vwapAnalysis && (
                          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 text-xs">
                            <div className="font-semibold text-slate-300 mb-1">VWAP Context</div>
                            <p className="text-slate-400 leading-relaxed font-sans">{report.technicalAnalysis.vwapAnalysis}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: Volume Analysis */}
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                          <span>Volume Analysis</span>
                          {report.technicalAnalysis.volumeTrendStatus && (
                            <span className={`px-1.5 py-0.25 rounded text-[9px] font-semibold uppercase tracking-wider ${
                              report.technicalAnalysis.volumeTrendStatus === 'GROWING_STRONGER' ? 'bg-emerald-500/20 text-emerald-400' :
                              report.technicalAnalysis.volumeTrendStatus === 'FADING' ? 'bg-red-500/20 text-red-400' :
                              report.technicalAnalysis.volumeTrendStatus === 'UNUSUAL_SPIKE' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {report.technicalAnalysis.volumeTrendStatus.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        {/* RelVolume Visual Gauge */}
                        {tech?.relVolume != null && (
                          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 text-xs">
                            <div className="flex justify-between items-center text-slate-400 mb-1.5">
                              <span>Relative Volume (vs 20d Avg)</span>
                              <span className={`font-bold font-mono ${
                                tech.relVolume > 1.5 ? 'text-emerald-400' :
                                tech.relVolume < 0.7 ? 'text-amber-500' : 'text-slate-200'
                              }`}>
                                {tech.relVolume.toFixed(2)}x
                              </span>
                            </div>
                            <div className="relative h-2 bg-slate-800 rounded overflow-hidden">
                              <div 
                                className={`h-full rounded-l ${
                                  tech.relVolume > 1.5 ? 'bg-emerald-500' :
                                  tech.relVolume < 0.7 ? 'bg-amber-500' : 'bg-brand-500'
                                }`}
                                style={{ width: `${Math.min(tech.relVolume * 50, 100)}%` }}
                              />
                              <div className="absolute left-[50%] top-0 bottom-0 w-0.5 bg-slate-400/50" />
                            </div>
                            <div className="flex justify-between text-[8px] text-slate-500 mt-1 font-mono">
                              <span>0x</span>
                              <span>1.0x (Average)</span>
                              <span>2.0x+ (High Volume)</span>
                            </div>
                          </div>
                        )}

                        <div className="bg-slate-900/40 p-2.5 rounded border border-slate-850 text-xs">
                          <div className="font-semibold text-slate-305 mb-1">Volume Sentiment</div>
                          <p className="text-slate-400 leading-relaxed font-sans">{report.technicalAnalysis.volumeAnalysis || 'No volume analysis description available.'}</p>
                        </div>

                        {report.technicalAnalysis.volumeTrendStatus && (
                          <div className="bg-slate-900/25 p-2.5 rounded border border-slate-800/50 text-[10px] text-slate-500">
                            {report.technicalAnalysis.volumeTrendStatus === 'GROWING_STRONGER' && (
                              <span className="font-sans text-emerald-400/90 font-semibold">Interpretation: Strong rising volume validates buying interest and trend stability.</span>
                            )}
                            {report.technicalAnalysis.volumeTrendStatus === 'FADING' && (
                              <span className="font-sans text-red-400/90 font-semibold">Interpretation: Decreasing volume indicates lack of momentum or consolidation phase.</span>
                            )}
                            {report.technicalAnalysis.volumeTrendStatus === 'UNUSUAL_SPIKE' && (
                              <span className="font-sans text-amber-400/90 font-semibold">Interpretation: Sudden spike signals institutional intervention or climax exhaustion.</span>
                            )}
                            {report.technicalAnalysis.volumeTrendStatus === 'STABLE' && (
                              <span className="font-sans text-slate-400 font-semibold">Interpretation: Stable average volume indicates balanced retail/institutional activity.</span>
                            )}
                            {report.technicalAnalysis.volumeTrendStatus === 'INSUFFICIENT_DATA' && (
                              <span className="font-sans text-slate-500 font-semibold">Interpretation: Average or limited activity without a clear bias.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="section-title mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    Key Catalysts
                  </h3>
                  <ul className="space-y-3">
                    {(report.keyCatalysts || []).slice(0, 4).map((c: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
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
                    {(report.keyRisks || []).slice(0, 4).map((rk: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span className="font-sans leading-relaxed">{rk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}


          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/70">{report.disclaimer}</p>
          </div>
        </div>
      ) : null}

      {/* Modals/Popups */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md card-glass border border-slate-700/50 p-6 flex flex-col gap-4 text-center slide-up shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">Fund Analysis Unavailable</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                We are not working on funds now. In the future we can work on it.
              </p>
            </div>
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowFundModal(false)}
                className="btn-primary px-6 py-2.5 w-full sm:w-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {hasInsufficientData && !errorModalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg card-glass border border-slate-700/50 p-6 flex flex-col slide-up shadow-2xl">
            {/* Close button in top-right */}
            <button
              onClick={() => setErrorModalDismissed(true)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-700/40"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <DataUnavailable 
              onRetry={() => {
                setErrorModalDismissed(false);
                retryAnalysis();
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzePage;
