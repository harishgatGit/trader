import React, { useState, useEffect } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Loader, Clock, AlertCircle, SkipForward, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Layers, Activity, Sparkles, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, ScoreBar, DataUnavailable, TermTooltip, StatusBadge, PageContainer, PageHeader, MetricCard } from '../components/ui';
import { TrendStoryCard } from '../components/TrendStoryCard';
import { STOCK_DICTIONARY } from '../utils/stockDictionary';
import { stocksApi } from '../services/api';

const POPULAR = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'SPY', 'QQQ', 'AMD', 'META', 'GOOGL', 'AMZN'];

const statusIcon = (status: string) => {
  switch (status) {
    case 'done': return <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />;
    case 'error': return <XCircle className="w-4.5 h-4.5 text-rose-500" />;
    case 'running': return <Loader className="w-4.5 h-4.5 text-brand-500 animate-spin" />;
    case 'skipped': return <SkipForward className="w-4.5 h-4.5 text-slate-500" />;
    default: return <Clock className="w-4.5 h-4.5 text-slate-500" />;
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

  const triggerAnalysis = async (sym: string) => {
    if (!sym.trim()) return;

    const cleanSym = sym.toUpperCase().trim();
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

  const getPreviewSummary = () => {
    if (!report) return '';
    const text = report.executiveSummary?.summary || 
                 (typeof report.executiveSummary === 'string' ? report.executiveSummary : '') || 
                 report.finalDecision?.decisionSummary || 
                 '';
                 
    if (!text) return '';
    
    const marker = "LAYMAN'S TAKEAWAY:";
    const index = text.toUpperCase().indexOf(marker.toUpperCase());
    if (index !== -1) {
      const afterText = text.substring(index + marker.length).trim();
      if (index === 0) {
        return afterText.split(/\n+/)[0]?.trim() || '';
      } else {
        return afterText;
      }
    }
    return text.length > 260 ? `${text.substring(0, 260)}…` : text;
  };

  return (
    <PageContainer className="max-w-3xl py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Run Your Analysis</h1>
        <p className="text-slate-450 text-sm max-w-md mx-auto leading-relaxed">
          Input any ticker symbol. We compile real-time order books, indicators, and catalysts.
        </p>
      </div>

      {/* Large Search Bar - Center aligned */}
      <div className="card shadow-md flex flex-col gap-4 p-5 md:p-6 bg-surface-900 border-slate-850">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
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
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter ticker (e.g. AAPL, NVDA)…"
              className="input pl-11 py-3.5 text-base md:text-lg font-bold w-full"
              maxLength={40}
              disabled={analyzing}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
            />

            {/* Suggestions Panel */}
            {showSuggestions && suggestions.length > 0 && !isMobile && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-surface-900 border border-slate-850 rounded-xl overflow-hidden shadow-2xl z-50 divide-y divide-slate-850 max-h-60 overflow-y-auto animate-fade-in">
                {suggestions.map((item, idx) => {
                  const isActive = activeSuggestion === idx;
                  return (
                    <div
                      key={item.symbol}
                      onClick={() => handleSelectSuggestion(item.symbol)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition ${
                        isActive ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400 font-bold' : 'hover:bg-slate-850/50 text-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-xs tracking-wider">
                          {item.symbol}
                        </span>
                        <span className="text-xs font-semibold font-sans">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500  font-bold font-sans tracking-wide">
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
            className="btn btn-primary py-3.5 px-6 shrink-0 sm:w-auto w-full text-base font-bold rounded-xl"
          >
            {analyzing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Analyzing…
              </>
            ) : (
              'Analyze'
            )}
          </button>
        </form>

        {/* Popular chips */}
        <div className="flex flex-wrap gap-2.5 items-center mt-1 border-t border-slate-850/60 pt-4">
          <span className="text-xs text-slate-500 font-bold  tracking-wider">Quick Picks:</span>
          {POPULAR.map((s) => (
            <button
              key={s}
              onClick={() => handleQuick(s)}
              disabled={analyzing}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 hover:bg-slate-850/50 text-slate-400 hover:text-slate-200 transition-all font-mono font-bold"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Progress logs */}
      {analyzing && analysisProgress.length > 0 && (
        <div className="card space-y-4 animate-pulse-slow">
          <h2 className="text-sm font-bold text-slate-200  tracking-wider">Research Pipeline Status</h2>
          <div className="divide-y divide-slate-850">
            {analysisProgress.map((step, i) => (
              <div key={i} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0">
                <div className="mt-0.5">{statusIcon(step.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm font-semibold ${step.status === 'running' ? 'text-brand-500 font-bold' : step.status === 'done' ? 'text-slate-200' : step.status === 'error' ? 'text-rose-500' : 'text-slate-500'}`}>
                      {step.step}
                    </span>
                    <span className={`text-[10px]  font-bold px-2 py-0.5 rounded-lg border ${
                      step.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      step.status === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      step.status === 'running' ? 'bg-brand-500/10 text-brand-500 border-brand-500/20' :
                      step.status === 'skipped' ? 'bg-slate-850 text-slate-500 border-slate-800' :
                      'bg-slate-900 text-slate-600 border-slate-850'
                    }`}>
                      {step.status}
                    </span>
                  </div>
                  {step.message && (
                    <div className="text-xs text-slate-500 mt-1 leading-normal font-sans">{step.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Preview Panel */}
      {report && !analyzing && !hasInsufficientData && (
        <div className="space-y-6 slide-up">
          
          {/* Cache timing alert */}
          {(currentAnalysis as any)?.cache && (
            <div className="card py-3 px-4 border border-slate-850 bg-slate-950/40 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-slate-450">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>
                  Report compiled{' '}
                  <strong className="text-slate-300">
                    {(currentAnalysis as any).cache.generatedXMinutesAgo === 0
                      ? 'just now'
                      : `${(currentAnalysis as any).cache.generatedXMinutesAgo} min${(currentAnalysis as any).cache.generatedXMinutesAgo !== 1 ? 's' : ''} ago`}
                  </strong>
                  . Next scheduled run in{' '}
                  <strong className="text-slate-300">
                    {(currentAnalysis as any).cache.regenerateInYMinutes} min{(currentAnalysis as any).cache.regenerateInYMinutes !== 1 ? 's' : ''}
                  </strong>
                  .
                </span>
              </div>
              {(currentAnalysis as any).cache.cached && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400  tracking-wider font-mono">
                  Cached
                </span>
              )}
            </div>
          )}

          {report.isFund ? (
            <div className="card border-brand-500/15 bg-brand-500/5 p-5 md:p-6 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    {/* @ts-ignore */}
                    <ViewTransition name={`stock-symbol-analyze-${report.symbol}`} share="text-morph" default="none">
                      <span className="text-2xl font-black font-mono text-slate-100">{report.symbol}</span>
                    </ViewTransition>
                    <RatingBadge rating={report.finalDecision?.finalRating} size="md" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-300 mt-1">{report.fundName}</h2>
                  <span className="text-[10px] text-brand-400 font-bold  tracking-wider font-mono block">
                    {report.issuer} · ETF Overview
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0 text-center">
                  <span className="text-[9px] text-slate-500 font-bold block ">CONFIDENCE</span>
                  <span className="text-base font-bold font-mono text-brand-400">{report.finalDecision?.confidenceScore}%</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                {report.finalDecision?.decisionSummary}
              </p>

              <button
                onClick={() => navigate(`/stocks/${report.symbol || currentAnalysis.symbol}`, { state: { from: 'analyze' } })}
                className="btn btn-primary w-full py-2.5 font-bold"
              >
                Open ETF Dashboard
              </button>
            </div>
          ) : (
            <div className="card border-brand-500/15 bg-brand-500/5 p-5 md:p-6 space-y-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* @ts-ignore */}
                    <ViewTransition name={`stock-symbol-analyze-${report.symbol || currentAnalysis.symbol}`} share="text-morph" default="none">
                      <span className="text-2xl font-black font-mono text-slate-100">{report.symbol || currentAnalysis.symbol}</span>
                    </ViewTransition>
                    <RatingBadge rating={report.finalRating} size="md" />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-2xl">
                    {getPreviewSummary()}
                  </p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-850/60 pt-4">
                <ScoreBar label="Technical Score" value={report.technicalScore} />
                <ScoreBar label="Fundamental Score" value={report.fundamentalScore} />
                <ScoreBar label="News Catalyst Score" value={report.newsCatalystScore} />
                <ScoreBar label="Institutional Flow Proxy" value={report.institutionalFlowProxyScore} color="bg-brand-500" />
              </div>

              <button
                onClick={() => navigate(`/stocks/${report.symbol || currentAnalysis.symbol}`, { state: { from: 'analyze' } })}
                className="btn btn-primary w-full py-2.5 font-bold"
              >
                Open Research Deck
              </button>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-[10px] leading-relaxed text-slate-500 font-mono">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>{report.disclaimer || 'Educational purposes only.'}</span>
          </div>
        </div>
      )}

      {/* Fund analysis notice modal */}
      {showFundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md card-glass border border-slate-850 p-6 flex flex-col gap-4 text-center slide-up shadow-2xl">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">Fund Analysis Unavailable</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                We are currently optimizing index fund tracking engines. Check back shortly for mutual fund reviews.
              </p>
            </div>
            <button
              onClick={() => setShowFundModal(false)}
              className="btn btn-primary w-full py-2.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {hasInsufficientData && !errorModalDismissed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg card p-6 flex flex-col slide-up shadow-2xl border-slate-850">
            <button
              onClick={() => setErrorModalDismissed(true)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition p-1.5 rounded-lg hover:bg-slate-850/50"
              aria-label="Close dialog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
    </PageContainer>
  );
};

export default AnalyzePage;
