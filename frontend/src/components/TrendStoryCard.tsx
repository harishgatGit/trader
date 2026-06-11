import React, { useState } from 'react';
import { TrendStoryResult } from '../types';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
  HelpCircle,
  FileText,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';

interface TrendStoryCardProps {
  trendStory?: TrendStoryResult;
}

export const TrendStoryCard: React.FC<TrendStoryCardProps> = ({ trendStory }) => {
  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);
  const [activeTradeTab, setActiveTradeTab] = useState<'swing' | 'short'>('swing');

  if (!trendStory) {
    return null;
  }

  const {
    price_summary: price,
    move_classification: classification,
    story_for_layman: story,
    evidence,
    swing_trade_view: swing,
    short_trade_view: short,
    final_summary: summary
  } = trendStory;

  const isUp = price.day_change_percent >= 0;

  // Primary Reason Label mapping
  const primaryReasonLabels: Record<string, string> = {
    'earnings-driven': 'Earnings Reaction',
    'news-driven': 'News Catalyst',
    'analyst-driven': 'Analyst Action',
    'sector-sympathy': 'Sector Sympathy',
    'market-wide': 'Market Wide Move',
    'institutional-accumulation': 'Institutional Accumulation',
    'retail-momentum': 'Retail Momentum / Buzz',
    'short-covering': 'Short Covering / Squeeze',
    'technical-breakout': 'Technical Breakout',
    'technical-breakdown': 'Technical Breakdown',
    'low-volume-fake-move': 'Low Volume Fake Move',
    'unknown-mixed': 'Unknown / Mixed Action'
  };

  const primaryReasonColors: Record<string, string> = {
    'earnings-driven': 'bg-purple-500/20 border-purple-500/40 text-purple-400',
    'news-driven': 'bg-teal-500/20 border-teal-500/40 text-teal-400',
    'analyst-driven': 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    'sector-sympathy': 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400',
    'market-wide': 'bg-slate-500/20 border-slate-500/40 text-slate-400',
    'institutional-accumulation': 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
    'retail-momentum': 'bg-pink-500/20 border-pink-500/40 text-pink-400',
    'short-covering': 'bg-amber-500/20 border-amber-500/40 text-amber-400',
    'technical-breakout': 'bg-green-500/20 border-green-500/40 text-green-400',
    'technical-breakdown': 'bg-red-500/20 border-red-500/40 text-red-400',
    'low-volume-fake-move': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    'unknown-mixed': 'bg-slate-700/20 border-slate-700/40 text-slate-355'
  };

  const sustainColors = {
    yes: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    no: 'bg-red-500/10 border-red-500/20 text-red-400',
    uncertain: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
  };

  const biasColors = {
    buy: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    hold: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    wait: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    avoid: 'bg-red-500/20 border-red-500/30 text-red-400',
    take_profit: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    short_watch: 'bg-pink-500/20 border-pink-500/30 text-pink-400'
  };

  const shortBiasColors = {
    safe_to_short: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    wait_for_breakdown: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    avoid_short: 'bg-red-500/20 border-red-500/30 text-red-400',
    squeeze_risk_high: 'bg-pink-500/20 border-pink-500/30 text-pink-400 hover:animate-pulse'
  };

  return (
    <div className="card-glass border border-brand-500/15 relative overflow-hidden transition-all duration-300 hover:border-brand-500/25">
      {/* Background radial highlight */}
      <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${isUp ? 'bg-emerald-500/5' : 'bg-red-500/5'}`} />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${isUp ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {isUp ? <TrendingUp className="w-5 h-5" strokeWidth={2.5} /> : <TrendingDown className="w-5 h-5" strokeWidth={2.5} />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">Why the stock moved today</h3>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">ANALYZED ON {trendStory.analysis_date}</p>
          </div>
        </div>

        {/* Badges container */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reason Badge */}
          <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold font-sans tracking-wide uppercase ${primaryReasonColors[classification.primary_reason] || primaryReasonColors['unknown-mixed']}`}>
            {primaryReasonLabels[classification.primary_reason] || classification.primary_reason}
          </span>
        </div>
      </div>

      {/* Layman Story */}
      <div className="py-5 space-y-4">
        <div>
          <h4 className="text-sm sm:text-base font-bold text-slate-100 font-sans tracking-tight mb-2 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-brand-500 rounded-full inline-block" />
            {story.headline}
          </h4>
          <p className="text-sm sm:text-[15px] text-slate-250 leading-relaxed sm:leading-loose font-sans font-normal whitespace-pre-line bg-slate-950/45 p-4 sm:p-5 rounded-2xl border border-slate-850/80 shadow-inner">
            {story.simple_explanation}
          </p>
        </div>

        {/* Sustainability Check & Buyers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-start gap-3.5 hover:border-slate-700/40 transition-colors">
            <HelpCircle className="w-4.5 h-4.5 text-brand-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Is this move sustainable?</div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${sustainColors[story.is_move_sustainable]}`}>
                  {story.is_move_sustainable}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-sans">{story.sustainability_reason}</p>
            </div>
          </div>

          <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl flex items-start gap-3.5 hover:border-slate-700/40 transition-colors">
            <Activity className="w-4.5 h-4.5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Who is driving today's action?</div>
              <div className="mt-1 font-semibold text-slate-200 capitalize text-sm">
                {story.who_may_be_buying_or_selling === 'shorts covering' ? 'Short Sellers Covering' : `${story.who_may_be_buying_or_selling} Participation`}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-sans">
                {story.who_may_be_buying_or_selling === 'institution' && 'Unusually high block orders and volume pattern suggests major funds or corporate accounts.'}
                {story.who_may_be_buying_or_selling === 'retail' && 'Heavy social interest and small orders drive speculation. Risk of abrupt reversal remains higher.'}
                {story.who_may_be_buying_or_selling === 'shorts covering' && 'Fast spike driven by short sellers closing out borrows quickly to cut losses.'}
                {story.who_may_be_buying_or_selling === 'mixed' && 'Both retail traders and institutional desks are actively participating on the tape.'}
                {story.who_may_be_buying_or_selling === 'unknown' && 'Limited exchange tracking makes buyer proxy unclear. Look to volume for hints.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Interpretation Tabs (Swing vs Short) */}
      <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-hidden mb-4">
        <div className="flex border-b border-slate-850 bg-slate-950/20">
          <button
            type="button"
            onClick={() => setActiveTradeTab('swing')}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTradeTab === 'swing'
                ? 'border-brand-500 text-brand-400 bg-slate-900/20'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4 text-brand-400" />
            Swing Trade Setup
          </button>
          <button
            type="button"
            onClick={() => setActiveTradeTab('short')}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
              activeTradeTab === 'short'
                ? 'border-brand-500 text-brand-400 bg-slate-900/20'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-pink-400" />
            Short Trade View
          </button>
        </div>

        <div className="p-4 space-y-4">
          {activeTradeTab === 'swing' ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/25 p-4 rounded-xl border border-slate-850">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Bias Action Plan</span>
                  <p className="text-xs sm:text-sm text-slate-200 font-sans mt-1 leading-relaxed">{swing.entry_reason}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-center ${biasColors[swing.trade_bias] || 'bg-slate-700 text-slate-200'}`}>
                  {swing.trade_bias.replace('_', ' ')}
                </span>
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Entry Zone</span>
                  <span className="font-mono text-indigo-400 font-bold text-sm sm:text-base block mt-1">
                    ${swing.entry_zone.low.toFixed(2)} - ${swing.entry_zone.high.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Target 1 & 2</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm sm:text-base block mt-1">
                    ${swing.target_1.toFixed(2)} / ${swing.target_2.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Stop Loss</span>
                  <span className="font-mono text-red-400 font-bold text-sm sm:text-base block mt-1">
                    ${swing.stop_loss.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Current Price</span>
                  <span className="font-mono text-slate-200 font-bold text-sm sm:text-base block mt-1">
                    ${price.current_price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Warnings and Confirmation */}
              {swing.wait_for_confirmation && (
                <div className="flex items-start gap-2.5 bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10 text-xs sm:text-sm">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 leading-relaxed font-sans">
                    <strong className="text-indigo-300 font-semibold mr-1.5">Confirmation Needed:</strong>
                    {swing.wait_for_confirmation}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/25 p-4 rounded-xl border border-slate-850">
                <div>
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Short Safety Comment</span>
                  <p className="text-xs sm:text-sm text-slate-200 font-sans mt-1 leading-relaxed">{short.reason}</p>
                </div>
                <span className={`px-3 py-1 rounded-xl border text-[11px] font-bold uppercase tracking-wider shrink-0 self-start sm:self-center ${shortBiasColors[short.short_bias] || 'bg-slate-700 text-slate-200'}`}>
                  {short.short_bias.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Entry Trigger</span>
                  <span className="font-mono text-purple-400 font-bold text-sm sm:text-base block mt-1">
                    {short.short_entry_trigger > 0 ? `$${short.short_entry_trigger.toFixed(2)}` : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Short Targets</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm sm:text-base block mt-1">
                    ${short.short_target_1.toFixed(2)} / ${short.short_target_2.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Short Stop Loss</span>
                  <span className="font-mono text-red-400 font-bold text-sm sm:text-base block mt-1">
                    ${short.short_stop_loss.toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center flex flex-col justify-center items-center hover:border-slate-700/40 transition-colors">
                  <span className="text-[10px] sm:text-xs text-slate-500 block uppercase font-bold tracking-wider">Squeeze Risk</span>
                  <span className={`text-[10px] font-bold mt-1 px-2.5 py-0.5 rounded-lg ${
                    evidence.short_context.short_squeeze_risk === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                    evidence.short_context.short_squeeze_risk === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {evidence.short_context.short_squeeze_risk.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Warning label */}
              {evidence.short_context.summary && (
                <div className="flex items-start gap-2.5 bg-red-500/5 p-3.5 rounded-xl border border-red-500/10 text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-slate-350 leading-relaxed font-sans">
                    <strong className="text-red-300 font-semibold mr-1.5">Short Warning Context:</strong>
                    {evidence.short_context.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Evidence Details */}
      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/15">
        <button
          type="button"
          onClick={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/20 text-xs font-semibold text-slate-355 hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-400" />
            Evidence & Catalyst Context Table
          </span>
          {isEvidenceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isEvidenceExpanded && (
          <div className="p-4 border-t border-slate-855 divide-y divide-slate-855 text-xs space-y-4">
            {/* Context Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
              {/* Left Column context */}
              <div className="space-y-4">
                {/* Price & Vol summary */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Price & Volume Metrics
                  </h5>
                  <table className="w-full text-slate-405">
                    <tbody>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Day Change %</td><td className={`py-1 text-right font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{price.day_change_percent.toFixed(2)}%</td></tr>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Volume / Avg Vol</td><td className="py-1 text-right font-mono">{price.volume.toLocaleString()} / {price.average_volume.toLocaleString()}</td></tr>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Relative Volume</td><td className="py-1 text-right font-mono font-bold text-indigo-400">{price.relative_volume.toFixed(2)}x</td></tr>
                      <tr><td className="py-1">Relative Vol Level</td><td className="py-1 text-right capitalize text-slate-300 font-semibold">{evidence.volume_context.volume_interpretation.replace('_', ' ')}</td></tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 italic mt-1">{evidence.volume_context.summary}</p>
                </div>

                {/* Sector / Index Context */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Sector & Index Performance
                  </h5>
                  <table className="w-full text-slate-405">
                    <tbody>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Sector Name</td><td className="py-1 text-right text-slate-300 font-medium">{evidence.sector_context.sector_name}</td></tr>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Sector Change</td><td className="py-1 text-right font-mono">{evidence.sector_context.sector_change_percent > 0 ? '+' : ''}{evidence.sector_context.sector_change_percent.toFixed(2)}%</td></tr>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Index Change</td><td className="py-1 text-right font-mono">{evidence.sector_context.index_change_percent > 0 ? '+' : ''}{evidence.sector_context.index_change_percent.toFixed(2)}%</td></tr>
                      <tr><td className="py-1">Outperforming Sector?</td><td className="py-1 text-right font-bold">{evidence.sector_context.is_stock_outperforming_sector ? <span className="text-emerald-400">YES</span> : <span className="text-slate-500">NO</span>}</td></tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 italic mt-1">{evidence.sector_context.summary}</p>
                </div>
              </div>

              {/* Right Column Context */}
              <div className="space-y-4">
                {/* Technical Context */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-amber-400" /> Technical Indicator Phrasings
                  </h5>
                  <table className="w-full text-slate-405 font-sans">
                    <tbody>
                      <tr className="border-b border-slate-900/60">
                        <td className="py-1">Daily Trend Bias</td>
                        <td className="py-1 text-right capitalize font-bold text-slate-200">{evidence.technical_context.trend}</td>
                      </tr>
                      <tr className="border-b border-slate-900/60">
                        <td className="py-1">Aggressive Buying?</td>
                        <td className="py-1 text-right font-medium">
                          {evidence.technical_context.rsi > 70 ? (
                            <span className="text-amber-400">Buying has been very aggressive (Cooldown may be needed)</span>
                          ) : evidence.technical_context.rsi < 30 ? (
                            <span className="text-emerald-400">Sellers have been very aggressive (Oversold rebound risk)</span>
                          ) : (
                            <span className="text-slate-300">Balanced buying and selling</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-900/60">
                        <td className="py-1">Sellers Area (Resistance)</td>
                        <td className="py-1 text-right font-mono text-red-400">
                          {evidence.technical_context.resistance_level ? `$${evidence.technical_context.resistance_level.toFixed(2)}` : 'None detected'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1">Average Price paid today (VWAP)</td>
                        <td className="py-1 text-right text-slate-300">
                          {evidence.technical_context.vwap_position === 'above' && 'Price is above VWAP (Positive momentum)'}
                          {evidence.technical_context.vwap_position === 'below' && 'Price is below VWAP (Negative momentum)'}
                          {evidence.technical_context.vwap_position === 'near' && 'Price is hovering near VWAP'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500 italic mt-1">{evidence.technical_context.summary}</p>
                </div>

                {/* Squeeze context */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-1 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <ShieldAlert className="w-3.5 h-3.5 text-pink-400" /> Short Interest Metrics
                  </h5>
                  <table className="w-full text-slate-405">
                    <tbody>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Short Interest (SI)</td><td className="py-1 text-right font-mono">{evidence.short_context.short_interest_available && evidence.short_context.short_interest_percent != null ? `${evidence.short_context.short_interest_percent}%` : 'Unavailable'}</td></tr>
                      <tr className="border-b border-slate-900/60"><td className="py-1">Days to Cover</td><td className="py-1 text-right font-mono">{evidence.short_context.days_to_cover ? `${evidence.short_context.days_to_cover.toFixed(1)} Days` : 'N/A'}</td></tr>
                      <tr><td className="py-1">Borrow Available?</td><td className="py-1 text-right font-medium">{evidence.short_context.borrow_available ? <span className="text-emerald-400">YES</span> : <span className="text-red-400">NO</span>}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* News Catalysts */}
            {evidence.news_catalysts && evidence.news_catalysts.length > 0 && (
              <div className="pt-3">
                <h5 className="font-bold text-slate-300 mb-2 uppercase text-[10px] tracking-wider">News Catalyst Timeline</h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {evidence.news_catalysts.map((n, idx) => (
                    <div key={idx} className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-900/60 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">{n.source} · {new Date(n.published_at).toLocaleDateString()}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          n.impact === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                          n.impact === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {n.impact} impact
                        </span>
                      </div>
                      <h6 className="font-bold text-slate-200 text-xs leading-snug">{n.headline}</h6>
                      <p className="text-[11px] text-slate-400 leading-normal font-sans">{n.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earnings context details */}
            {evidence.earnings_catalyst && evidence.earnings_catalyst.has_recent_earnings && (
              <div className="pt-3">
                <h5 className="font-bold text-slate-300 mb-1.5 uppercase text-[10px] tracking-wider">Earnings Catalyst Report</h5>
                <div className="bg-purple-950/10 border border-purple-500/15 p-3 rounded-lg flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between border-b border-purple-500/10 pb-1.5 mb-1.5">
                    <span className="font-bold text-purple-400 text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Earnings Announced
                    </span>
                    <span className="font-mono text-slate-500">SURPRISE METRICS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-slate-400 mb-2">
                    <div className="bg-slate-950/20 p-1.5 rounded border border-slate-900">
                      <span className="text-[9px] text-slate-500 block">EPS Surprise</span>
                      <span className={`font-bold font-mono text-xs ${evidence.earnings_catalyst.eps_surprise && evidence.earnings_catalyst.eps_surprise >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {evidence.earnings_catalyst.eps_surprise != null ? `${evidence.earnings_catalyst.eps_surprise > 0 ? '+' : ''}${evidence.earnings_catalyst.eps_surprise}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-950/20 p-1.5 rounded border border-slate-900">
                      <span className="text-[9px] text-slate-500 block">Revenue Surprise</span>
                      <span className={`font-bold font-mono text-xs ${evidence.earnings_catalyst.revenue_surprise && evidence.earnings_catalyst.revenue_surprise >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {evidence.earnings_catalyst.revenue_surprise != null ? `${evidence.earnings_catalyst.revenue_surprise > 0 ? '+' : ''}${evidence.earnings_catalyst.revenue_surprise}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-950/20 p-1.5 rounded border border-slate-950 text-center">
                      <span className="text-[9px] text-slate-500 block">Future Guidance</span>
                      <span className="font-bold text-indigo-400 capitalize text-xs">
                        {evidence.earnings_catalyst.guidance_change}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed">{evidence.earnings_catalyst.summary}</p>
                </div>
              </div>
            )}

            {/* Analyst Actions */}
            {evidence.analyst_actions && evidence.analyst_actions.length > 0 && (
              <div className="pt-3">
                <h5 className="font-bold text-slate-300 mb-2 uppercase text-[10px] tracking-wider">Recent Analyst Upgrades / Downgrades</h5>
                <div className="space-y-1.5">
                  {evidence.analyst_actions.map((act, idx) => (
                    <div key={idx} className="bg-slate-900/30 p-2.5 rounded-lg border border-slate-900/60 flex items-start justify-between gap-3 text-[11px]">
                      <div>
                        <span className="font-bold text-slate-300">{act.firm}</span>
                        <p className="text-slate-450 mt-0.5 leading-normal font-sans">{act.summary}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block px-1.5 py-0.25 rounded font-bold uppercase text-[9px] ${
                          act.action === 'upgrade' ? 'bg-emerald-500/10 text-emerald-400' :
                          act.action === 'downgrade' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-450'
                        }`}>
                          {act.action.replace('_', ' ')}
                        </span>
                        {act.new_target && (
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {act.old_target ? `$${act.old_target} → ` : ''}${act.new_target} Target
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cautious summary disclaimer note */}
      <div className="mt-3 flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-[11px] leading-relaxed text-slate-450">
        <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-300 font-sans block mb-0.5">Analyst Consensus Summary</span>
          <p className="font-sans font-normal italic">
            "{summary.one_line_story}" — {summary.risk_warning}
          </p>
        </div>
      </div>
    </div>
  );
};
