import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { FinalRating } from '../types';

interface RatingBadgeProps {
  rating: FinalRating | string;
  size?: 'sm' | 'md' | 'lg';
}

const ratingConfig: Record<string, { label: string; className: string; dot: string }> = {
  BUY: { label: 'BUY', className: 'badge-buy', dot: 'bg-emerald-400' },
  SELL: { label: 'SELL', className: 'badge-sell', dot: 'bg-red-400' },
  HOLD: { label: 'HOLD', className: 'badge-hold', dot: 'bg-amber-400' },
  WATCHLIST: { label: 'WATCHLIST', className: 'badge-watchlist', dot: 'bg-indigo-400' },
  AVOID: { label: 'AVOID', className: 'badge-avoid', dot: 'bg-slate-400' },
};

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, size = 'md' }) => {
  const config = ratingConfig[rating] || { label: rating, className: 'badge-avoid', dot: 'bg-slate-400' };
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5';

  return (
    <span className={`${config.className} ${sizeClass} inline-flex items-center gap-1.5 font-bold tracking-wider`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse-slow`} />
      {config.label}
    </span>
  );
};

interface ScoreBarProps {
  label: string;
  value: number | null;
  max?: number;
  color?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ label, value, max = 100, color }) => {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-36 shrink-0">{label}</span>
        <span className="text-xs text-slate-600">N/A</span>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color ||
    (pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500');

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-36 shrink-0">{label}</span>
      <div className="flex-1 progress-bar">
        <div
          className={`progress-fill ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-slate-200 w-8 text-right">
        {value.toFixed(0)}
      </span>
    </div>
  );
};

interface PriceChangeProps {
  value: number | null;
  showArrow?: boolean;
  className?: string;
}

export const PriceChange: React.FC<PriceChangeProps> = ({ value, showArrow = true, className = '' }) => {
  if (value === null || value === undefined) return <span className="text-slate-500">—</span>;

  const isUp = value >= 0;
  const color = isUp ? 'text-price-up' : 'text-price-down';
  const arrow = isUp ? '▲' : '▼';

  return (
    <span className={`${color} font-mono text-sm ${className}`}>
      {showArrow && <span className="text-xs mr-0.5">{arrow}</span>}
      {isUp ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  return (
    <div className={`${sizeClass} ${className} border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin`} />
  );
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {icon && <div className="text-slate-600 mb-4 text-4xl">{icon}</div>}
    <h3 className="text-slate-300 font-semibold mb-2">{title}</h3>
    {description && <p className="text-slate-500 text-sm max-w-sm mb-4">{description}</p>}
    {action}
  </div>
);

interface ToastProps {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  onDismiss: () => void;
}

const TOAST_CONFIG = {
  success: {
    icon: '✓',
    iconBg: 'bg-emerald-700',
    border: 'border-slate-200/80',
    bg: 'bg-white',
    bar: 'bg-emerald-600',
    label: 'text-emerald-800',
    text: 'text-slate-900',
    badge: 'Success',
  },
  error: {
    icon: '✕',
    iconBg: 'bg-red-700',
    border: 'border-slate-200/80',
    bg: 'bg-white',
    bar: 'bg-red-600',
    label: 'text-red-800',
    text: 'text-slate-900',
    badge: 'Error',
  },
  warning: {
    icon: '!',
    iconBg: 'bg-amber-800',
    border: 'border-slate-200/80',
    bg: 'bg-white',
    bar: 'bg-amber-650', // or bg-amber-600
    label: 'text-amber-900',
    text: 'text-slate-900',
    badge: 'Warning',
  },
  info: {
    icon: 'i',
    iconBg: 'bg-sky-700',
    border: 'border-slate-200/80',
    bg: 'bg-white',
    bar: 'bg-sky-600',
    label: 'text-sky-800',
    text: 'text-slate-900',
    badge: 'Info',
  },
} as const;

export const Toast: React.FC<ToastProps> = ({ type, message, onDismiss }) => {
  const c = TOAST_CONFIG[type] ?? TOAST_CONFIG.info;
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    // Trigger entrance animation on next tick
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      style={{ transition: 'opacity 300ms, transform 300ms' }}
      className={`
        relative flex items-start gap-3 w-full max-w-md
        pl-4 pr-3 pt-3.5 pb-4 rounded-xl shadow-2xl
        border ${c.border} ${c.bg}
        backdrop-blur-md overflow-hidden
        ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
      {/* Colored left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.iconBg} rounded-l-xl`} />

      {/* Icon badge */}
      <div className={`shrink-0 w-7 h-7 rounded-lg ${c.iconBg} flex items-center justify-center`}>
        <span className="text-white text-sm font-black leading-none">{c.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={`text-[11px] font-bold uppercase tracking-widest ${c.label}`}>{c.badge}</p>
        <p className={`text-sm leading-snug font-medium ${c.text}`}>{message}</p>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xs"
      >
        ✕
      </button>

      {/* Auto-dismiss progress bar */}
      <div className={`absolute bottom-0 left-0 h-0.5 ${c.bar} opacity-60 rounded-b-xl`}
        style={{ animation: 'toast-progress 5s linear forwards' }}
      />
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();
  // Show max 3 toasts at once (newest on top)
  const visible = toasts.slice(-3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-3.5 z-[9999] pointer-events-none px-4">
      {visible.map((t: any) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast type={t.type} message={t.message} onDismiss={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
};

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full', lines = 1 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`skeleton ${className}`} />
    ))}
  </div>
);

// ── DataUnavailable ────────────────────────────────────────────────────────
// Shown whenever a fetch fails, returns null, or critical fields are N/A.

interface DataUnavailableProps {
  symbol?: string;
  reason?: string;        // optional technical hint (for devs / superusers)
  onRetry?: () => void;
  compact?: boolean;      // smaller inline version
}

export const DataUnavailable: React.FC<DataUnavailableProps> = ({
  symbol,
  reason,
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-300/80">
        <span className="text-base">⚠️</span>
        <span>
          We couldn't load this data right now.{' '}
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline underline-offset-2 hover:text-amber-200 transition-colors font-medium"
            >
              Try again
            </button>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in">
      {/* Logo / icon */}
      <div className="relative mb-6">
        <img
          src="/brand/icon_256.png"
          alt="InvestingAtti"
          className="w-16 h-16 object-contain opacity-60 grayscale"
        />
        {/* Warning badge */}
        <span className="absolute -bottom-1 -right-1 text-lg">😔</span>
      </div>

      {/* Heading */}
      <h3 className="text-lg font-bold text-slate-200 mb-2">
        {symbol ? `${symbol} — Data Unavailable` : 'Data Unavailable'}
      </h3>

      {/* Message */}
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
        We are sorry, we are not able to serve you this time. We will fix it. Please try again.
      </p>

      {/* Technical reason — subtle */}
      {reason && (
        <div className="mb-5 px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs text-slate-600 font-mono max-w-xs break-words">
          {reason}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 text-sm font-semibold hover:bg-brand-500/20 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try Again
          </button>
        )}
        <a
          href="/analyze"
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          Search another ticker →
        </a>
      </div>
    </div>
  );
};

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
  const [visible, setVisible] = React.useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-block cursor-help group"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className={`absolute z-[9999] w-72 max-w-[85vw] p-2.5 text-[11px] leading-relaxed font-normal text-slate-800 bg-white border border-slate-200 rounded-lg shadow-xl pointer-events-none transition-all duration-200 fade-in ${positionClasses[position]}`}>
          {content}
          <div className={`absolute w-1.5 h-1.5 bg-white border-r border-b border-slate-200 rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-0.75 border-t-0 border-l-0' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-0.75 border-b-0 border-r-0 border-t border-l' :
            position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-0.75 border-b-0 border-l-0 border-t border-r' :
            'right-full top-1/2 -translate-y-1/2 -mr-0.75 border-t-0 border-r-0 border-b border-l'
          }`} />
        </div>
      )}
    </div>
  );
};

interface TermTooltipProps {
  term: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const termDefinitions: Record<string, string> = {
  mixed: "Multiple timeframes or indicators are conflicting, showing no clear unified trend direction.",
  bias: "The dominant trend direction indicated by technical moving averages and indicator configurations.",
  technicalbias: "The dominant trend direction indicated by technical moving averages and indicator configurations.",
  bearish: "Technicals indicate selling pressure, with price generally declining or trading below key moving averages.",
  bullish: "Technicals indicate buying momentum, with price generally rising or trading above key moving averages.",
  neutral: "Price is trading within a consolidation range with low volatility and no clear directional bias.",
  accumulation: "Wyckoff Phase 1: Smart money quietly buys and builds positions near support levels, establishing a base.",
  markup: "Wyckoff Phase 2: Price breaks out of consolidation and trends steadily upward with increasing momentum.",
  distribution: "Wyckoff Phase 3: Smart money sells and distributes shares to buyers near resistance levels, forming a top.",
  markdown: "Wyckoff Phase 4: Price breaks key support levels and trends steadily downward as selling pressure intensifies.",
  sideways: "Price action is oscillating within horizontal support and resistance boundaries with no clear trend.",
  squeezerisk: "Risk that high short-interest shares are rapidly bought back to cover shorts, causing an explosive upward price spike.",
  daystocover: "The number of days it would take all short sellers to buy back and cover their positions based on average daily trading volume.",
  sector: "The industry category the stock belongs to, showing average daily sector index performance changes.",
  index: "The benchmark stock index change (e.g. S&P 500 or Nasdaq 100) representing broad market direction.",
  ssr: "Short Sale Restriction (Rule 201) prevents short selling on downward ticks once a stock falls 10% in a session.",
  ssrstatus: "Short Sale Restriction (Rule 201) status, restricting short sales to upticks if triggered.",
  borrowfee: "Annualized interest rate charged by brokers to borrow shares for shorting, reflecting share availability.",
  shortinterest: "Percentage of outstanding shares that have been sold short but not yet covered/closed.",
  technicalscore: "The strength of the combined technical indicators (moving averages, momentum, volume support) scored from 0 to 100. A high score indicates a strong, well-supported technical setup.",
  confidencescore: "The AI's conviction level (0-100%) in its final suggestion (e.g. buy, wait, hold). A low score indicates conflicting indicators or highly speculative conditions, while a high score indicates strong alignment across technicals, news, and fundamentals.",
  confidence: "The AI's confidence level in the primary driver of the stock's daily movement. A low score implies multiple speculative factors or mixed news, while a high score indicates a clear, dominant catalyst.",
  rsi: "Relative Strength Index (RSI) / RSI(14): Shows whether the stock is overheated/overbought (above 70) or cheap/oversold (below 30) using a 14-period lookback.",
  macd: "Moving Average Convergence Divergence (MACD): Shows whether price momentum is getting stronger (bullish) or weaker (bearish).",
  movingaverage: "Shows the average price over a set period. Helps identify if the trend is moving up or down.",
  volume: "Shows how many shares traded today. Higher volume indicates stronger confirmation of the price direction.",
  atr: "Average True Range (ATR): Shows how much the stock price swings daily. Higher values mean higher risk/volatility.",
  adx: "Average Directional Index (ADX): Shows whether a strong trend is active (above 25) or if the stock is range-bound/choppy (below 20).",
  vwap: "Volume Weighted Average Price (VWAP): The average price weighted by volume, showing the price level that institutions watch.",
  ema: "Exponential Moving Average (EMA): A moving average that responds faster to recent price moves than a simple average (e.g. EMA(20) or EMA(50)).",
  sma: "Simple Moving Average (SMA): The average price over a specific number of days, representing standard support and resistance lines (e.g. SMA(200)).",
};

export const TermTooltip: React.FC<TermTooltipProps> = ({ term, children, position = 'top' }) => {
  const cleanKey = term.toLowerCase().replace(/[^a-z0-9]/g, '');
  const definition = termDefinitions[cleanKey] || `Definition for ${term}`;

  return (
    <Tooltip content={definition} position={position}>
      {children}
    </Tooltip>
  );
};

// ── AppShell ────────────────────────────────────────────────────────
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-full flex flex-col bg-surface-950 text-slate-100 transition-colors duration-200">
      {children}
    </div>
  );
};

// ── PageContainer ───────────────────────────────────────────────────
export const PageContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-[1320px] mx-auto w-full px-4 md:px-8 py-6 space-y-6 md:space-y-8 animate-fade-in ${className}`}>
      {children}
    </div>
  );
};

// ── PageHeader ──────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-850 pb-5">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">{title}</h1>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shrink-0">
            🇺🇸 <strong className="font-black">US</strong> Markets Only
          </span>
        </div>
        {subtitle && <p className="text-slate-450 text-sm md:text-base mt-1.5 leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};

// ── SectionHeader ───────────────────────────────────────────────────
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}> = ({ title, subtitle, badge }) => {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg md:text-xl font-bold text-slate-100 tracking-tight">{title}</h2>
        {badge}
      </div>
      {subtitle && <p className="text-slate-450 text-xs md:text-sm mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
};

// ── ResponsiveGrid ──────────────────────────────────────────────────
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}> = ({ children, cols = 3, className = '' }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  return (
    <div className={`grid gap-5 md:gap-6 ${colClasses[cols]} ${className}`}>
      {children}
    </div>
  );
};

// ── InsightCard ─────────────────────────────────────────────────────
export const InsightCard: React.FC<{
  title: string;
  subtitle?: string;
  verdict?: React.ReactNode;
  children?: React.ReactNode;
  whyItMatters?: string;
  footer?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, verdict, children, whyItMatters, footer, className = '' }) => {
  return (
    <div className={`card flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-850/50 pb-3">
        <div>
          <h3 className="text-base md:text-lg font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-450 mt-0.5">{subtitle}</p>}
        </div>
        {verdict && <div className="shrink-0">{verdict}</div>}
      </div>
      
      {children && <div className="text-sm text-slate-200 leading-relaxed">{children}</div>}
      
      {whyItMatters && (
        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-850/60 text-xs text-slate-350 leading-relaxed">
          <strong className="text-slate-200 font-semibold  tracking-wider text-[10px] block mb-1">Why it matters</strong>
          {whyItMatters}
        </div>
      )}

      {footer && <div className="border-t border-slate-850/50 pt-3 mt-auto flex items-center justify-between">{footer}</div>}
    </div>
  );
};

// ── MetricCard ──────────────────────────────────────────────────────
export const MetricCard: React.FC<{
  label: string;
  value: string | number | React.ReactNode;
  subValue?: string | React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ label, value, subValue, icon, className = '' }) => {
  return (
    <div className={`card flex flex-row items-center justify-between p-5 ${className}`}>
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-450  tracking-wider block">{label}</span>
        <div className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-tight font-mono leading-none">{value}</div>
        {subValue && <div className="text-xs text-slate-450 leading-none">{subValue}</div>}
      </div>
      {icon && <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-850 text-slate-450">{icon}</div>}
    </div>
  );
};

// ── StatusBadge ─────────────────────────────────────────────────────
export const StatusBadge: React.FC<{
  status: 'bullish' | 'bearish' | 'mixed' | 'neutral' | 'wait' | 'watch' | 'entry zone' | 'high risk' | 'medium risk' | 'low risk' | string;
  size?: 'sm' | 'md';
}> = ({ status, size = 'md' }) => {
  const statusLower = status.toLowerCase();
  const baseClass = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider transition-colors";
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';
  
  let styles = "bg-slate-500/10 text-slate-450 border border-slate-500/20";
  let dotColor = "bg-slate-400";

  if (statusLower.includes('bullish') || statusLower.includes('buy')) {
    styles = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400";
    dotColor = "bg-emerald-400";
  } else if (statusLower.includes('bearish') || statusLower.includes('sell')) {
    styles = "bg-red-500/10 text-red-500 border border-red-500/20 dark:bg-red-500/20 dark:text-red-400";
    dotColor = "bg-red-400";
  } else if (statusLower.includes('hold') || statusLower.includes('mixed') || statusLower.includes('warning') || statusLower.includes('medium risk')) {
    styles = "bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 dark:bg-amber-500/20";
    dotColor = "bg-amber-400";
  } else if (statusLower.includes('watchlist') || statusLower.includes('watch') || statusLower.includes('info') || statusLower.includes('low risk')) {
    styles = "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-400";
    dotColor = "bg-indigo-400";
  } else if (statusLower.includes('entry zone') || statusLower.includes('strong setup')) {
    styles = "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 dark:bg-teal-500/20";
    dotColor = "bg-teal-400";
  } else if (statusLower.includes('high risk') || statusLower.includes('avoid')) {
    styles = "bg-rose-500/10 text-rose-500 border border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400";
    dotColor = "bg-rose-400";
  }

  return (
    <span className={`${baseClass} ${sizeClass} ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse-slow`} />
      {status.toUpperCase()}
    </span>
  );
};

