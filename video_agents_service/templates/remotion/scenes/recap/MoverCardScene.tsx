import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/**
 * Handles both top_mover (winner) and top_loser (loser) scene types.
 * Shows ticker, signal badge, price, and a summary snippet.
 */

interface MoverCardSceneProps {
  sceneType: string;
  narration: string;
  textOverlay: string;
  subText?: string;
  decisionColor?: string;
  dataFields: {
    type?: 'WINNER' | 'LOSER';
    symbol?: string;
    signal?: string;
    price?: number | null;
    summary?: string;
    decisionColor?: string;
  };
}

const COLOR_MAP: Record<string, string> = {
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', teal: '#14b8a6',
};

export const MoverCardScene: React.FC<MoverCardSceneProps> = ({
  sceneType, textOverlay, subText, dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isWinner = dataFields.type === 'WINNER' || sceneType === 'top_mover';
  const color = COLOR_MAP[isWinner ? 'green' : 'red'];
  const symbol = dataFields.symbol || 'N/A';
  const signal = dataFields.signal || (isWinner ? 'BUY' : 'SELL');
  const price = dataFields.price;
  const summary = dataFields.summary || '';
  const label = isWinner ? 'TOP WINNER' : 'UNDER PRESSURE';
  const icon = isWinner ? '▲' : '▼';

  const cardY   = interpolate(frame, [0, fps * 0.6], [60, 0], { extrapolateRight: 'clamp' });
  const cardOp  = interpolate(frame, [0, fps * 0.6], [0, 1], { extrapolateRight: 'clamp' });
  const sumOp   = interpolate(frame, [fps * 0.8, fps * 1.4], [0, 1], { extrapolateRight: 'clamp' });
  const tickerScale = spring({ frame: frame - Math.round(fps * 0.5), fps, config: { damping: 12, stiffness: 90 } });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: `radial-gradient(ellipse at 20% 50%, ${color}0a 0%, #090d16 60%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      padding: '40px 80px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Diagonal accent stripe */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 6, height: '100%', background: color, opacity: 0.6,
      }} />

      {/* Label */}
      <div style={{
        opacity: cardOp, transform: `translateY(${cardY}px)`,
        color: '#64748b', fontSize: 13, letterSpacing: 4, marginBottom: 16,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      {/* Main ticker card */}
      <div style={{
        opacity: cardOp, transform: `translateY(${cardY}px)`,
        background: `${color}15`, border: `2px solid ${color}66`,
        borderRadius: 16, padding: '32px 60px', textAlign: 'center', marginBottom: 28,
        position: 'relative',
      }}>
        {/* Ticker */}
        <div style={{
          transform: `scale(${tickerScale})`,
          color, fontSize: 72, fontWeight: 900, letterSpacing: -2, lineHeight: 1,
        }}>
          ${symbol}
        </div>

        {/* Icon + signal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
          <span style={{ color, fontSize: 20 }}>{icon}</span>
          <span style={{
            background: `${color}22`, border: `1px solid ${color}`,
            color, borderRadius: 4, padding: '4px 14px', fontSize: 13, fontWeight: 700, letterSpacing: 2,
          }}>
            {signal}
          </span>
          {price && (
            <>
              <span style={{ color: '#475569' }}>•</span>
              <span style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600 }}>
                ${Number(price).toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Summary text */}
      {summary && (
        <div style={{
          opacity: sumOp,
          color: '#94a3b8', fontSize: 17, lineHeight: 1.6,
          maxWidth: 780, textAlign: 'center',
        }}>
          {summary.length > 160 ? summary.slice(0, 160) + '...' : summary}
        </div>
      )}

      {/* Brand */}
      <div style={{
        position: 'absolute', bottom: 22, right: 36,
        color: '#1e293b', fontSize: 11, letterSpacing: 3,
      }}>
        INVESTINGATTI
      </div>
    </div>
  );
};
