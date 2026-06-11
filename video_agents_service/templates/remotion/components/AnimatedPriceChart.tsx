import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface PricePoint { label: string; price: number; }

interface AnimatedPriceChartProps {
  prices: PricePoint[];
  currentPrice: number;
  supportLevel?: number;
  resistanceLevel?: number;
  color?: string;
  showVolume?: boolean;
  volumes?: number[];  // 0-100 relative volume per bar
  title?: string;
}

export const AnimatedPriceChart: React.FC<AnimatedPriceChartProps> = ({
  prices,
  currentPrice,
  supportLevel,
  resistanceLevel,
  color = '#14b8a6',
  showVolume = false,
  volumes = [],
  title = 'Price Action',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const drawProgress = spring({ frame, fps, from: 0, to: 1, config: { damping: 22, stiffness: 45 } });
  const overlaysProgress = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 16, stiffness: 60 } });

  const W = 300;
  const H = showVolume ? 80 : 100;
  const VOL_H = 30;
  const PAD = { t: 10, r: 10, b: 8, l: 30 };

  const allPrices = prices.map(p => p.price);
  const minP = Math.min(...allPrices) * 0.998;
  const maxP = Math.max(...allPrices) * 1.002;
  const range = maxP - minP || 1;

  const toY = (p: number) => PAD.t + H - ((p - minP) / range) * H;
  const toX = (i: number) => PAD.l + (i / (prices.length - 1)) * (W - PAD.l - PAD.r);

  // Build SVG path
  const points = prices.map((p, i) => ({ x: toX(i), y: toY(p.price) }));
  const pathStr = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

  // Area fill path
  const areaStr = pathStr + ` L${points[points.length - 1].x.toFixed(1)},${(PAD.t + H).toFixed(1)} L${points[0].x.toFixed(1)},${(PAD.t + H).toFixed(1)} Z`;

  // Approx path length
  const totalLen = points.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    return acc + Math.hypot(pt.x - prev.x, pt.y - prev.y);
  }, 0) + 1;

  const dashOffset = totalLen * (1 - drawProgress);

  const isUp = prices[prices.length - 1].price >= prices[0].price;
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  const glowColor = isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';

  // Price labels
  const priceLabels = [minP, (minP + maxP) / 2, maxP];

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          {title}
        </div>
      )}
      <div style={{
        background: '#0a0f1e',
        borderRadius: 12,
        padding: '8px 6px 4px',
        border: '1px solid rgba(148,163,184,0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${PAD.t + H + PAD.b + (showVolume ? VOL_H + 8 : 0)}`}
          style={{ display: 'block' }}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`area-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {priceLabels.map((p, i) => {
            const y = toY(p);
            return (
              <g key={i}>
                <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={PAD.l - 3} y={y + 3} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="7" fontFamily="monospace">
                  {p >= 1000 ? `${(p / 1000).toFixed(1)}k` : p.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Support line */}
          {supportLevel && overlaysProgress > 0 && (
            <g opacity={overlaysProgress}>
              <line x1={PAD.l} y1={toY(supportLevel)} x2={PAD.l + (W - PAD.l - PAD.r) * overlaysProgress} y2={toY(supportLevel)}
                stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,3" />
              <text x={PAD.l + 4} y={toY(supportLevel) - 3} fill="#22c55e" fontSize="8" fontWeight="700" fontFamily="monospace">
                SUP ${supportLevel.toFixed(0)}
              </text>
            </g>
          )}

          {/* Resistance line */}
          {resistanceLevel && overlaysProgress > 0 && (
            <g opacity={overlaysProgress}>
              <line x1={PAD.l} y1={toY(resistanceLevel)} x2={PAD.l + (W - PAD.l - PAD.r) * overlaysProgress} y2={toY(resistanceLevel)}
                stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,3" />
              <text x={PAD.l + 4} y={toY(resistanceLevel) - 3} fill="#ef4444" fontSize="8" fontWeight="700" fontFamily="monospace">
                RES ${resistanceLevel.toFixed(0)}
              </text>
            </g>
          )}

          {/* Area fill */}
          {drawProgress > 0.1 && (
            <path d={areaStr} fill={`url(#area-grad-${color})`} />
          )}

          {/* Price line */}
          <path
            d={pathStr}
            fill="none"
            stroke={lineColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={totalLen}
            strokeDashoffset={dashOffset}
            filter="url(#glow)"
          />

          {/* Current price dot */}
          {drawProgress > 0.9 && (
            <g>
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill={lineColor} opacity="0.3" />
              <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={lineColor} />
              <text
                x={points[points.length - 1].x + 6}
                y={points[points.length - 1].y + 4}
                fill={lineColor}
                fontSize="9"
                fontWeight="800"
                fontFamily="monospace"
              >
                ${currentPrice.toFixed(2)}
              </text>
            </g>
          )}

          {/* X-axis labels */}
          {prices.filter((_, i) => i % Math.max(1, Math.floor(prices.length / 5)) === 0).map((p, idx, arr) => {
            const origIdx = prices.indexOf(p);
            const x = toX(origIdx);
            return (
              <text key={idx} x={x} y={PAD.t + H + PAD.b + 2} textAnchor="middle" fill="rgba(148,163,184,0.45)" fontSize="7" fontFamily="monospace">
                {p.label}
              </text>
            );
          })}

          {/* Volume bars */}
          {showVolume && volumes.length > 0 && (
            <>
              <line x1={PAD.l} y1={PAD.t + H + PAD.b + 12} x2={W - PAD.r} y2={PAD.t + H + PAD.b + 12}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              {volumes.map((v, i) => {
                const x = toX(i);
                const barH = (v / 100) * VOL_H * drawProgress;
                const barColor = (prices[i]?.price ?? 0) >= (prices[i - 1]?.price ?? 0) ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)';
                return (
                  <rect
                    key={i}
                    x={x - 3}
                    y={PAD.t + H + PAD.b + 12 + VOL_H - barH}
                    width="6"
                    height={barH}
                    fill={barColor}
                    rx="1"
                  />
                );
              })}
              <text x={PAD.l - 3} y={PAD.t + H + PAD.b + 12 + VOL_H - 2} textAnchor="end" fill="rgba(148,163,184,0.4)" fontSize="7" fontFamily="monospace">VOL</text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
};
