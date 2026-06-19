import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  BarChart3, 
  HelpCircle, 
  Compass, 
  CheckCircle2, 
  Play,
  Info
} from 'lucide-react';
import { PageContainer, PageHeader, SectionHeader, ResponsiveGrid, InsightCard } from '../components/ui';
import { useSEO } from '../utils/useSEO';
import { StructuredData } from '../components/StructuredData';

const Education: React.FC = () => {
  useSEO({
    title: 'Stock Market Education & Cheat Sheet | Investing Atti',
    description: 'Learn how to analyze stocks using technical indicators, moving averages, support and resistance lines, and AI-generated insights.',
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
        "name": "Learning Center",
        "item": "https://investingatti.com/education"
      }
    ]
  };

  return (
    <PageContainer>
      <StructuredData data={breadcrumbSchema} />
      {/* Page Header */}
      <PageHeader
        title="Learning Center & Cheat Sheet"
        subtitle="Learn how we analyze stocks and how you can use our reports to make Buy & Sell decisions."
      />

      {/* Core Educational Introduction */}
      <div className="card border border-slate-800/80 shadow-lg relative overflow-hidden bg-gradient-to-br from-brand-950/5 dark:from-brand-950/20 via-slate-900/5 to-slate-900/30 dark:via-slate-900/50 to-indigo-950/5 dark:to-indigo-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-base sm:text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand-500 dark:text-brand-400" />
          Our Mission: Educate first, Analyze second, Decide confidently
        </h2>
        <p className="text-sm text-slate-350 leading-relaxed font-sans font-normal max-w-4xl">
          We believe that trading should not be a guessing game. Our platform does the heavy lifting: we fetch 
          historical candlestick data, calculate indicators, parse recent news, and look up institutional footprints. 
          Then, we synthesize this information into a clear, structured report.
          <br /><br />
          <strong>Your Role:</strong> You use this report as your cheat sheet. While our AI suggests ratings and levels, 
          you should use the data points below to understand the reasoning and make the final trade decision yourself.
        </p>
      </div>

      {/* Section 1: The Analysis Process (How It Works) */}
      <div className="card space-y-4">
        <SectionHeader
          title="1. The Analysis Process — How We Build Your Report"
          subtitle="When you enter a stock ticker (e.g. AAPL, NVDA), our pipeline kicks off a parallel multi-stage process:"
        />
        
        <ResponsiveGrid cols={3} className="pt-2">
          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center text-xs font-bold font-mono">01</span>
              <h4 className="text-xs font-bold text-slate-100  tracking-wider">Multi-Source Gathering</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              We query Alpaca for live market prices, daily candles, and volume averages. Simultaneously, we fetch corporate financials and scan media publications for recent headlines.
            </p>
          </div>

          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-xs font-bold font-mono">02</span>
              <h4 className="text-xs font-bold text-slate-100  tracking-wider">Technical & Trend Math</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              We run technical scripts to compute RSI(14) momentum, search for EMA(20) and EMA(50) support grids, evaluate test counts of historical floor/ceiling levels, and calculate average true range (ATR) volatility.
            </p>
          </div>

          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-505 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-xs font-bold font-mono">03</span>
              <h4 className="text-xs font-bold text-slate-100  tracking-wider">AI Report Synthesis</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Our advanced AI Analyst model reads the consolidated quantitative data, detects the Wyckoff market cycle phase (Accumulation, Markup, etc.), and generates a clear layman story, entry zones, exit targets, and a final rating.
            </p>
          </div>
        </ResponsiveGrid>
      </div>

      {/* Section 2: Buy & Sell Cheat Sheet */}
      <div className="space-y-4">
        <div className="border-l-4 border-brand-500 pl-3">
          <h3 className="text-base sm:text-lg font-bold text-slate-100  tracking-tight">2. The Trader's Action Plan: When to Buy & When to Sell</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Your practical cheat sheet guide to translating technical signals into action.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WHEN TO BUY CARD */}
          <div className="card border-emerald-500/20 dark:border-emerald-500/30 hover:shadow-lg transition-all p-5 space-y-4">
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs tracking-wider  font-bold">When to BUY</span>
            </h4>
            
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Look for these aligning indicators to find low-risk, high-probability entry points:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Price Sitting in the Accumulation/Entry Zone</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    Always compare the current stock price to our suggested entry zone. Run a fresh check on our <Link to="/analyze" className="text-brand-400 hover:underline">Analysis Page</Link> to find current values.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Price Bouncing Above Support Floors</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    Support is where buyers step in. When a stock hits a support floor (especially one tested multiple times) and rebounds, it validates the level. View floor levels for <Link to="/stocks/AAPL" className="text-brand-400 hover:underline">AAPL</Link> or <Link to="/stocks/NVDA" className="text-brand-400 hover:underline">NVDA</Link>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">RSI(14) is Oversold (Below 30)</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    An RSI(14) below 30 signals the stock has been sold aggressively and is undervalued. This indicates high probability of a quick, upward correction bounce.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Markup Phase Consolidation (Stage 2)</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    If the Wyckoff phase is marked as MARKUP, the stock is in a confirmed uptrend. Buy minor pullbacks that find support at short-term EMA lines (EMA(20) or EMA(50)).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* WHEN TO SELL CARD */}
          <div className="card border-red-500/20 dark:border-red-500/30 hover:shadow-lg transition-all p-5 space-y-4">
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
              <span className="px-2.5 py-0.5 rounded-lg bg-red-500/10 text-red-655 dark:text-red-400 border border-red-500/20 text-xs tracking-wider  font-bold">When to SELL</span>
            </h4>
            
            <p className="text-xs text-slate-450 leading-relaxed font-sans">
              Look for these flags to take profits or exit to protect your trading capital:
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Price Touches Target Exit Levels</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    When the stock hits our suggested swing exit target, take your profits! Locking in gains keeps your win-rate high and prevents giving profits back to the market.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Price Reaches Resistance Ceilings</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    Resistance represents heavy institutional selling. If the price fails to break a resistance ceiling repeatedly, it is highly likely to roll back down.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">RSI(14) is Overbought (Above 70)</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    An RSI(14) above 70 means the stock is historically overextended and buying has redlined. Pullovers are common here as early buyers exit. Avoid starting new buy orders.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-100 block">Price Breaks Below Stop Loss</span>
                  <p className="text-[11px] text-slate-450 font-sans leading-relaxed">
                    Our reports outline a strict Stop Loss price. If a stock slides below this line, the bullish setup is invalidated. Exit immediately to cut losses—never hope for a bounce.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Popular Indicators & Everyday Analogies */}
      <div className="card space-y-5">
        <SectionHeader
          title="3. Indicators Cheat Sheet — Read Like a Pro"
          subtitle="A quick breakdown of technical data points translated into everyday comparisons."
        />
        
        <ResponsiveGrid cols={3}>
          {/* RSI Analogy */}
          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/25 text-[10px] font-bold  tracking-wide">RSI(14) Momentum</span>
              <p className="text-xs text-slate-350 font-sans leading-relaxed">
                RSI(14) measures momentum speed on a scale of 0 to 100.
              </p>
            </div>
            <div className="bg-slate-900/10 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-450 leading-relaxed font-sans italic">
              <strong className="text-slate-300 dark:text-slate-200 font-bold not-italic block mb-0.5">Everyday Analogy:</strong>
              Think of it like a rubber band. Stretch it too far to the right (RSI(14) &gt; 70) and it will snap back. Pull it too far left (RSI(14) &lt; 30) and it recoils.
            </div>
          </div>

          {/* EMA Analogy */}
          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-550 dark:text-indigo-400 border border-indigo-500/25 text-[10px] font-bold  tracking-wide">Exponential Moving Average (EMA)</span>
              <p className="text-xs text-slate-350 font-sans leading-relaxed">
                EMA(20) and EMA(50) smooth prices to trace short and long-term directions.
              </p>
            </div>
            <div className="bg-slate-900/10 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-450 leading-relaxed font-sans italic">
              <strong className="text-slate-300 dark:text-slate-200 font-bold not-italic block mb-0.5">Everyday Analogy:</strong>
              Think of EMA(200) as a giant magnet. Prices pull away from it during booms, but historically return to it. A stock trading above it is in clear health.
            </div>
          </div>

          {/* Volume Analogy */}
          <div className="bg-slate-950/5 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/25 text-[10px] font-bold  tracking-wide">Volume Sentiment</span>
              <p className="text-xs text-slate-350 font-sans leading-relaxed">
                Volume shows the total share quantities traded per day.
              </p>
            </div>
            <div className="bg-slate-900/10 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-450 leading-relaxed font-sans italic">
              <strong className="text-slate-300 dark:text-slate-200 font-bold not-italic block mb-0.5">Everyday Analogy:</strong>
              Think of volume as fuel. If price moves up but volume fades, the stock is driving on fumes and will stall. Growing volume validates the movement.
            </div>
          </div>
        </ResponsiveGrid>
      </div>

      {/* Section 4: Risk Management Rules */}
      <div className="card space-y-4">
        <SectionHeader
          title="4. Capital Protection Rules — Never Trade Without a Seatbelt"
          subtitle="The best traders aren't the ones who make the most money, but the ones who lose the least when they are wrong. Protect your portfolio:"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/5 dark:bg-slate-950/40 border border-slate-800 space-y-1.5 text-xs">
            <span className="font-bold text-slate-100 block">Rule #1: Respect the Stop Loss</span>
            <p className="text-slate-450 font-sans leading-relaxed">
              Before entering a trade, write down the stop-loss price. If the stock drops below that number, exit immediately. Stop loss is your airbag—it converts a small, manageable loss into absolute protection against a catastrophic account wipeout.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/5 dark:bg-slate-950/40 border border-slate-800 space-y-1.5 text-xs">
            <span className="font-bold text-slate-100 block">Rule #2: Limit Your Position Size</span>
            <p className="text-slate-450 font-sans leading-relaxed">
              Never buy a single stock with more than 5% to 10% of your total capital. If a stock falls 10% but represents only 5% of your portfolio, your total portfolio only drops 0.5%. Diversification spreads risk across sectors.
            </p>
          </div>
        </div>
      </div>

      {/* Section 5: The Ultimate Decision Checklist */}
      <div className="card border border-emerald-500/10 space-y-4">
        <SectionHeader
          title="5. Checklist — Should You Execute?"
          subtitle="Run through these interactive checks before hitting the execute order button on any stock:"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {[
            { text: "Evaluate the AI Rating and decision metrics (BUY, HOLD, WATCHLIST, SELL, AVOID).", tip: "Read the layman explanation first to understand the context of the move." },
            { text: "Check that the current price is within or near the suggested Entry Zone.", tip: "Do not chase stocks that have run up far past the entry limits." },
            { text: "Verify that RSI(14) is not redlining (keep it below 70 for buying).", tip: "Overbought RSI(14) triggers pullbacks." },
            { text: "Make sure volume trend is growing or stable (never buy on fading fuel).", tip: "Check that volume validates momentum." },
            { text: "Pre-set your automatic stop-loss price in your brokerage dashboard.", tip: "Plan your exits before you enter." },
            { text: "Verify that your position size conforms to your risk settings (maximum 5%).", tip: "Ensure long-term portfolio stability." }
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-950/5 dark:bg-slate-950/30 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3 hover:border-slate-400 dark:hover:border-slate-700 transition-all">
              <input 
                type="checkbox" 
                defaultChecked={idx < 2} 
                className="mt-1 shrink-0 h-4.5 w-4.5 rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-brand-500/30 accent-brand-500 cursor-pointer" 
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-100 leading-normal block">{item.text}</span>
                <span className="text-[10px] text-slate-450 font-sans leading-normal block">{item.tip}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Education;
