import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 11 — Decision Map
 * 4-row summary card: Signal | Entry | Stop | Target with color-coded badges.
 */
export const DecisionMapScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const signal      = String(dataFields?.signal || 'HOLD');
  const entryZone   = String(dataFields?.entryZone || 'N/A');
  const stopLoss    = String(dataFields?.stopLoss || 'N/A');
  const targets     = String(dataFields?.targets || 'N/A');
  const supportBreak= String(dataFields?.supportBreak || 'N/A');
  const upsideWatch = String(dataFields?.upsideWatch || 'N/A');
  const bestAction  = String(dataFields?.bestAction || 'Watch, confirm, then decide');
  const decisionColor = dataFields?.decisionColor || 'yellow';
  const colorMap: Record<string, string> = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
  const accentColor = colorMap[decisionColor] || '#14b8a6';

  const headerY = spring({ frame, fps, from: -30, to: 0, config: { damping: 14 } });

  const rows = [
    { label: 'Signal',      value: signal,      color: accentColor,  icon: '📡', delay: 4 },
    { label: 'Entry Watch', value: entryZone,   color: '#10b981',    icon: '🎯', delay: 10 },
    { label: 'Stop Loss',   value: stopLoss,    color: '#ef4444',    icon: '🛑', delay: 16 },
    { label: 'Target',      value: targets,     color: '#10b981',    icon: '🚀', delay: 22 },
    { label: 'Risk Zone',   value: `Below ${supportBreak}`, color: '#ef4444', icon: '⚠️', delay: 28 },
  ];

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 20px', gap: 10,
    }}>
      <div style={{
        transform: `translateY(${headerY}px)`,
        fontSize: 12, fontWeight: 800, color: '#14b8a6',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4,
      }}>
        {ticker} · Decision Map
      </div>

      {rows.map((row, i) => {
        const rowX = spring({ frame, fps, from: -100, to: 0, config: { damping: 14, stiffness: 100 }, delay: row.delay });
        const rowOpacity = interpolate(frame, [row.delay, row.delay + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <div key={i} style={{
            transform: `translateX(${rowX}px)`, opacity: rowOpacity,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: `${row.color}10`, border: `1px solid ${row.color}30`,
            borderRadius: 12, padding: '10px 16px', width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{row.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {row.label}
              </span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: row.color, fontFamily: 'monospace' }}>
              {row.value}
            </span>
          </div>
        );
      })}

      <div style={{
        marginTop: 6, fontSize: 12, fontWeight: 600, color: '#14b8a6', textAlign: 'center',
        opacity: interpolate(frame, [34, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        💡 {bestAction}
      </div>
    </div>
  );
};
