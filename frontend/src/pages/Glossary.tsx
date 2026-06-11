import React, { useState } from 'react';
import { Search, Compass, BookOpen, Layers, BarChart2, TrendingUp, HelpCircle, X, ChevronRight } from 'lucide-react';

interface GlossaryItem {
  term: string;
  category: 'Stages' | 'Biases' | 'Setups' | 'Indicators' | 'Volume';
  definition: string;
  analogy: string;
  badgeText: string;
  badgeColorClass: string;
  borderColorClass: string;
}

const glossaryData: GlossaryItem[] = [
  // ── Market Cycle Stages ──────────────────────────────────────────
  {
    term: 'Accumulation (Stage 1)',
    category: 'Stages',
    definition: 'The base-building phase of the market cycle. Large institutional players ("smart money") quietly buy shares at low prices from discouraged sellers. The stock price stops falling and moves sideways within a narrow range.',
    analogy: 'Imagine a builder buying up cheap land in an undeveloped neighborhood before anyone else knows it is about to get a major highway. They buy quietly to keep land prices low.',
    badgeText: 'Base Building',
    badgeColorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderColorClass: 'hover:border-indigo-500/40 border-indigo-950/40',
  },
  {
    term: 'Markup (Stage 2)',
    category: 'Stages',
    definition: 'The upward breakout and bull trend phase. Demand exceeds supply, causing the price to consistently make higher highs and higher lows. Short and long-term moving averages slope upward.',
    analogy: 'Think of a hot new tech gadget that goes viral. Everyone wants one, but supply is limited, so sellers keep raising the price, and buyers are happy to pay more to get it.',
    badgeText: 'Bull Market',
    badgeColorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColorClass: 'hover:border-emerald-500/40 border-emerald-950/40',
  },
  {
    term: 'Distribution (Stage 3)',
    category: 'Stages',
    definition: 'The topping phase of the market cycle. Institutional investors begin selling ("distributing") their shares to late-arriving retail buyers. The price stalls, fluctuates wildly, and moves sideways near its highs.',
    analogy: 'A developer selling off their neighborhood properties to regular families at peak prices, just as the buzz starts to fade. The developer makes their money and exits.',
    badgeText: 'Peak Phase',
    badgeColorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColorClass: 'hover:border-amber-500/40 border-amber-950/40',
  },
  {
    term: 'Markdown (Stage 4)',
    category: 'Stages',
    definition: 'The downward breakdown and bear trend phase. Supply exceeds demand as panic-selling kicks in. The stock price consistently falls, making lower highs and lower lows. A phase to protect cash.',
    analogy: 'A major department store going out of business. They have huge amounts of unsold clothing, so they slash prices by 50%, then 70%, then 90% just to get rid of it.',
    badgeText: 'Bear Market',
    badgeColorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    borderColorClass: 'hover:border-red-500/40 border-red-950/40',
  },
  {
    term: 'Sideways Range',
    category: 'Stages',
    definition: 'A period of consolidation where price moves back and forth between a defined floor (support) and ceiling (resistance) without starting a clear up or down trend.',
    analogy: 'A tennis ball bouncing back and forth between the floor and the ceiling of a room. It stays in the middle until someone hits it hard enough to break out.',
    badgeText: 'Consolidation',
    badgeColorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    borderColorClass: 'hover:border-slate-500/40 border-slate-900',
  },

  // ── Trend Biases ────────────────────────────────────────────────
  {
    term: 'Bullish Bias',
    category: 'Biases',
    definition: 'Indicators are strongly positive. The stock is trading above its primary moving averages, buyers have strong conviction, and technical indicators suggest upward price movement.',
    analogy: 'A green traffic light on an open highway. Conditions are safe to move forward, and traffic is flowing smoothly.',
    badgeText: 'Strong Upward',
    badgeColorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColorClass: 'hover:border-emerald-500/40 border-emerald-950/40',
  },
  {
    term: 'Bearish Bias',
    category: 'Biases',
    definition: 'Indicators are strongly negative. The stock is trading below major moving averages, volume shows heavy distribution, and price action points to a continuation of downward movement.',
    analogy: 'A severe winter storm warning. It is safer to park your car in the garage (holding cash) than trying to drive on icy, dangerous roads.',
    badgeText: 'Strong Downward',
    badgeColorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    borderColorClass: 'hover:border-red-500/40 border-red-950/40',
  },
  {
    term: 'Neutral Bias',
    category: 'Biases',
    definition: 'Indicators are conflicting or flat. The stock is moving sideways, volatility is compressed, and there is no strong advantage for either buyers or sellers.',
    analogy: 'A car idling in neutral gear at a red light. It isn\'t moving forward or backward, just waiting for a signal to shift.',
    badgeText: 'Directionless',
    badgeColorClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    borderColorClass: 'hover:border-slate-500/40 border-slate-900',
  },
  {
    term: 'Mixed Bias',
    category: 'Biases',
    definition: 'Short-term indicators (like the 20 EMA) point one way, while long-term indicators (like the 200 EMA) point the opposite way. A period of transition and high volatility.',
    analogy: 'A sunny day with occasional heavy rain showers. It is hard to decide whether to go out or stay inside because conditions keep changing hour-by-hour.',
    badgeText: 'Transitioning',
    badgeColorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColorClass: 'hover:border-amber-500/40 border-amber-950/40',
  },

  // ── Setup Types ─────────────────────────────────────────────────
  {
    term: 'Pullback Setup',
    category: 'Setups',
    definition: 'Buying a stock in a healthy uptrend when its price temporarily drops ("dips") back to a known floor (support level or moving average) before resuming its rise.',
    analogy: 'Buying a premium winter jacket during an off-season clearance sale. It is still a high-quality product, you are just buying it at a temporary discount.',
    badgeText: 'Buy the Dip',
    badgeColorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColorClass: 'hover:border-emerald-500/40 border-emerald-950/40',
  },
  {
    term: 'Breakout Setup',
    category: 'Setups',
    definition: 'Buying a stock the moment its price breaches a major historical ceiling (resistance level), signaling that a new, strong upward trend has officially begun.',
    analogy: 'A sprinter burst through the starting tape. Once they break through, they run with absolute speed and no obstacles in front of them.',
    badgeText: 'Momentum Entry',
    badgeColorClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    borderColorClass: 'hover:border-blue-500/40 border-blue-950/40',
  },
  {
    term: 'Reversal Setup',
    category: 'Setups',
    definition: 'Entering a trade when a declining stock shows clear evidence of ending its markdown trend and beginning a new markup trend (a trend shift).',
    analogy: 'A pendulum stopping at its furthest point, reversing direction, and starting to swing back the other way.',
    badgeText: 'Trend Shift',
    badgeColorClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    borderColorClass: 'hover:border-indigo-500/40 border-indigo-950/40',
  },
  {
    term: 'Chase Risk',
    category: 'Setups',
    definition: 'The price has gone up too much too quickly and is sitting far above its support lines. Entering now carries an extremely high risk of an immediate sharp pullback.',
    analogy: 'Trying to jump onto a train that has already left the station and is moving at 60 mph. You are very likely to get hurt; wait for the next station stop.',
    badgeText: 'High Risk Alert',
    badgeColorClass: 'bg-red-500/10 text-red-400 border-red-500/20',
    borderColorClass: 'hover:border-red-500/40 border-red-950/40',
  },

  // ── Volume & Technical Indicators ────────────────────────────────
  {
    term: 'RSI (Relative Strength Index)',
    category: 'Indicators',
    definition: 'A momentum gauge that measures the speed and change of price movements on a scale of 0 to 100. It highlights overbought and oversold conditions.',
    analogy: 'An engine RPM gauge. If it is in the "red zone" (above 70), you need to ease off the gas (buying). If it is idling extremely low (below 30), it has plenty of room to rev up.',
    badgeText: 'Momentum Gauge',
    badgeColorClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    borderColorClass: 'hover:border-violet-500/40 border-violet-950/40',
  },
  {
    term: 'MACD',
    category: 'Indicators',
    definition: 'Moving Average Convergence Divergence is a trend-following momentum indicator that shows the relationship between two moving averages of a stock\'s price.',
    analogy: 'Wind direction and speed indicators on a ship. When the lines cross, it shows the wind has shifted direction, telling the captain which way the sails will fill.',
    badgeText: 'Trend Direction',
    badgeColorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    borderColorClass: 'hover:border-cyan-500/40 border-cyan-950/40',
  },
  {
    term: 'VWAP',
    category: 'Indicators',
    definition: 'Volume Weighted Average Price. It calculates the average price a stock has traded at throughout the day, based on both volume and price. It represents the "fair price".',
    analogy: 'The average price of gas in a city. If you find a station selling gas well below the average, it is a great deal. If you buy above it, you are overpaying.',
    badgeText: 'Fair Market Value',
    badgeColorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    borderColorClass: 'hover:border-amber-500/40 border-amber-950/40',
  },
  {
    term: 'ADX (Trend Strength)',
    category: 'Indicators',
    definition: 'Average Directional Index measures the overall strength of a trend on a scale of 0 to 100, regardless of whether the price is going up or down.',
    analogy: 'A wind speed gauge. An ADX above 25 means there is a strong gale (a powerful trend) pushing the boat. Below 20 means the wind is calm (no trend, sideways range).',
    badgeText: 'Wind Speed',
    badgeColorClass: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    borderColorClass: 'hover:border-pink-500/40 border-pink-950/40',
  },
  {
    term: 'Bollinger Bands',
    category: 'Indicators',
    definition: 'Volatility bands placed above and below a moving average. The bands expand when price changes are fast (high volatility) and contract when price is quiet (low volatility).',
    analogy: 'Flexible rubber guardrails on a highway. The price bounces off the upper and lower bands. When the guardrails squeeze narrow, it signals a major explosion is coming.',
    badgeText: 'Volatility Channels',
    badgeColorClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    borderColorClass: 'hover:border-teal-500/40 border-teal-950/40',
  },
  {
    term: 'ATR (Volatility)',
    category: 'Indicators',
    definition: 'Average True Range measures the average distance a stock moves in price over a day. It shows how "bumpy" or volatile the stock is.',
    analogy: 'The height of ocean waves. A stock with a high ATR has 10-foot waves (wild daily price swings). A stock with a low ATR has calm 1-foot ripples (quiet, stable prices).',
    badgeText: 'Wave Height',
    badgeColorClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    borderColorClass: 'hover:border-orange-500/40 border-orange-950/40',
  },

  // ── Volume Patterns ──────────────────────────────────────────────
  {
    term: 'Volume Trend Status',
    category: 'Volume',
    definition: 'An analysis of trading volume that confirms if a price move has real institutional backing behind it. Volume represents the "fuel" of the move.',
    analogy: 'Pressing the gas pedal in your car. If the car speeds up and the engine revs (rising volume), it is a real acceleration. If the car speeds up but engine stays silent, something is wrong.',
    badgeText: 'Trend Fuel',
    badgeColorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    borderColorClass: 'hover:border-emerald-500/40 border-emerald-950/40',
  },
  {
    term: 'Unusual Volume Spike',
    category: 'Volume',
    definition: 'A single day where the number of traded shares is massive (often 3x to 5x higher than average), usually triggered by news, earnings, or major events.',
    analogy: 'A massive wave of shoppers rushing into a store for a black-friday doorbuster. It indicates a sudden, major shift in demand and attention.',
    badgeText: 'Heavy Catalyst',
    badgeColorClass: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
    borderColorClass: 'hover:border-fuchsia-500/40 border-fuchsia-950/40',
  }
];

const Glossary: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Stages' | 'Biases' | 'Setups' | 'Indicators' | 'Volume'>('All');

  const categories: Array<{ id: typeof selectedCategory; label: string }> = [
    { id: 'All', label: 'All Terms' },
    { id: 'Stages', label: 'Market Cycle Stages' },
    { id: 'Biases', label: 'Trend Bias' },
    { id: 'Setups', label: 'Setup Types' },
    { id: 'Indicators', label: 'Technical Indicators' },
    { id: 'Volume', label: 'Volume Patterns' }
  ];

  const filteredItems = glossaryData.filter((item) => {
    const matchesSearch = item.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.analogy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6 fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-lg shadow-brand-950/20">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analyst Cheat Sheet</h1>
          <p className="text-sm text-slate-500 mt-0.5">Learn technical indicators, setups, and trend cycle stages translated into everyday analogies</p>
        </div>
      </div>

      {/* Control Row (Search & Filter) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 shadow-md">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search terms, definitions, analogies…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                selectedCategory === cat.id
                  ? 'bg-brand-500/15 text-brand-400 border-brand-500/40 shadow-sm'
                  : 'bg-slate-900/20 text-slate-400 border-slate-800/50 hover:text-slate-200 hover:border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredItems.map((item, idx) => (
            <div
              key={idx}
              className={`card-glass p-5 border transition-all duration-300 flex flex-col justify-between ${item.borderColorClass}`}
            >
              <div>
                {/* Term title and category */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-md font-bold text-slate-100 font-sans tracking-tight">
                    {item.term}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${item.badgeColorClass}`}>
                    {item.badgeText}
                  </span>
                </div>

                {/* Definition */}
                <p className="text-xs text-slate-350 leading-relaxed font-sans font-normal mb-4">
                  {item.definition}
                </p>
              </div>

              {/* Layman's Analogy section */}
              <div className="pt-3 border-t border-slate-800/80 bg-slate-950/20 rounded-lg p-3 mt-auto">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-brand-400/90 mb-1 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-400" /> Everyday Analogy
                </h4>
                <p className="text-[11px] italic text-slate-500 leading-relaxed">
                  "{item.analogy}"
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10">
          <BookOpen className="w-8 h-8 text-slate-600 mb-3" />
          <p className="text-sm font-semibold text-slate-400">No terms found</p>
          <p className="text-xs text-slate-600 mt-1">Try modifying your search query or switching categories</p>
        </div>
      )}
    </div>
  );
};

export default Glossary;
