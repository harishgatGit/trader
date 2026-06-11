import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface AnimatedRSIChartProps {
  rsiValue: number;       // 0-100
  macdLine: number;
  macdSignal: number;
  macdHistogram?: number;
  overallBias?: string;
  ema20?: number;
  ema50?: number;
  currentPrice?: number;
}

export const AnimatedRSIChart: React.FC<AnimatedRSIChartProps> = ({
  rsiValue = 55,
  macdLine = 1.2,
  macdSignal = 0.8,
  macdHistogram,
  overallBias = 'BULLISH',
  ema20,
  ema50,
  currentPrice,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p1 = spring({ frame, fps, from: 0, to: 1, config: { damping: 14, stiffness: 55 } });
  const p2 = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 14, stiffness: 55 } });
  const p3 = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 14, stiffness: 55 } });
  const p4 = spring({ frame: frame - 30, fps, from: 0, to: 1, config: { damping: 14, stiffness: 55 } });

  const rsiColor = rsiValue > 70 ? '#ef4444' : rsiValue < 30 ? '#22c55e' : '#14b8a6';
  const rsiLabel = rsiValue > 70 ? 'OVERBOUGHT' : rsiValue < 30 ? 'OVERSOLD' : 'NEUTRAL';
  const biasColor = overallBias === 'BULLISH' ? '#22c55e' : overallBias === 'BEARISH' ? '#ef4444' : '#f59e0b';

  const macdPositive = macdLine > macdSignal;
  const macdColor = macdPositive ? '#22c55e' : '#ef4444';
  const hist = macdHistogram ?? (macdLine - macdSignal);

  // RSI arc params
  const ARC_R = 36;
  const ARC_CX = 56;
  const ARC_CY = 52;
  const startAngle = -210;
  const sweepAngle = 240;
  const rsiAngle = startAngle + (rsiValue / 100) * sweepAngle * p1;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPoint = (angle: number, r: number) => ({
    x: ARC_CX + r * Math.cos(toRad(angle)),
    y: ARC_CY + r * Math.sin(toRad(angle)),
  });
  const arcPath = (startDeg: number, endDeg: number, r: number) => {
    const s = arcPoint(startDeg, r);
    const e = arcPoint(endDeg, r);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  };
  const needlePt = arcPoint(rsiAngle, ARC_R - 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Row 1: RSI Gauge + MACD */}
      <div style={{ display: 'flex', gap: 10 }}>

        {/* RSI Gauge */}
        <div style={{
          flex: 1,
          background: '#0a0f1e',
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.08)',
          padding: '10px 8px 6px',
          opacity: p1,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>RSI (14)</div>
          <svg width="100%" viewBox="0 0 112 68" style={{ display: 'block' }}>
            {/* Background arc — full sweep */}
            <path d={arcPath(startAngle, startAngle + sweepAngle, ARC_R)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
            {/* Zone arcs */}
            <path d={arcPath(startAngle, startAngle + sweepAngle * 0.3, ARC_R)} fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth="8" strokeLinecap="round" />
            <path d={arcPath(startAngle + sweepAngle * 0.3, startAngle + sweepAngle * 0.7, ARC_R)} fill="none" stroke="rgba(20,184,166,0.2)" strokeWidth="8" strokeLinecap="round" />
            <path d={arcPath(startAngle + sweepAngle * 0.7, startAngle + sweepAngle, ARC_R)} fill="none" stroke="rgba(239,68,68,0.25)" strokeWidth="8" strokeLinecap="round" />
            {/* Value arc */}
            {p1 > 0.02 && (
              <path d={arcPath(startAngle, rsiAngle, ARC_R)} fill="none" stroke={rsiColor} strokeWidth="8" strokeLinecap="round" />
            )}
            {/* Needle dot */}
            <circle cx={needlePt.x} cy={needlePt.y} r="5" fill={rsiColor} />
            {/* RSI value */}
            <text x={ARC_CX} y={ARC_CY + 4} textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="900" fontFamily="monospace">
              {(rsiValue * p1).toFixed(0)}
            </text>
            {/* Labels */}
            <text x="14" y="64" fill="rgba(34,197,94,0.7)" fontSize="7" fontWeight="700">OVS</text>
            <text x="87" y="64" fill="rgba(239,68,68,0.7)" fontSize="7" fontWeight="700">OVB</text>
          </svg>
          <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: rsiColor, letterSpacing: 1 }}>{rsiLabel}</div>
        </div>

        {/* MACD Panel */}
        <div style={{
          flex: 1,
          background: '#0a0f1e',
          borderRadius: 12,
          border: '1px solid rgba(148,163,184,0.08)',
          padding: '10px 8px 6px',
          opacity: p2,
          transform: `translateY(${(1 - p2) * 10}px)`,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>MACD</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'MACD Line', value: macdLine.toFixed(3), color: macdColor },
              { label: 'Signal', value: macdSignal.toFixed(3), color: '#94a3b8' },
              { label: 'Histogram', value: hist.toFixed(3), color: hist >= 0 ? '#22c55e' : '#ef4444' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 8,
            padding: '4px 8px',
            background: macdPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${macdPositive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 6,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 800,
            color: macdColor,
            letterSpacing: 1,
          }}>
            {macdPositive ? 'BULLISH CROSS' : 'BEARISH CROSS'}
          </div>
        </div>
      </div>

      {/* Row 2: Moving Averages */}
      <div style={{
        background: '#0a0f1e',
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.08)',
        padding: '10px 12px',
        opacity: p3,
        transform: `translateY(${(1 - p3) * 10}px)`,
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Moving Averages</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          {[
            { label: 'EMA 20', value: ema20 ? `$${ema20.toFixed(0)}` : 'Above', color: '#22c55e' },
            { label: 'EMA 50', value: ema50 ? `$${ema50.toFixed(0)}` : 'Above', color: '#22c55e' },
            { label: 'BIAS', value: overallBias, color: biasColor },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: '#475569', fontWeight: 600, marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Overall signal bar */}
      <div style={{
        background: `${biasColor}18`,
        border: `1px solid ${biasColor}44`,
        borderRadius: 10,
        padding: '8px 14px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: p4,
        transform: `scale(${interpolate(p4, [0, 1], [0.95, 1])})`,
      }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Overall Technical Bias</span>
        <span style={{ fontSize: 13, fontWeight: 900, color: biasColor, letterSpacing: 1 }}>{overallBias}</span>
      </div>

    </div>
  );
};
