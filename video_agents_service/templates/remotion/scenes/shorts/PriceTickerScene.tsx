import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 2 — Price Ticker
 * Animated counting number up to the price, day change badge pulses in.
 */
export const PriceTickerScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields, narration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const price = Number(dataFields?.price || 0);
  const dayChange = Number(dataFields?.dayChangePct || 0);
  const changeColor = dayChange >= 0 ? '#10b981' : '#ef4444';
  const changeSign = dayChange >= 0 ? '+' : '';

  // Animated price counter
  const priceProgress = spring({ frame, fps, from: 0, to: 1, config: { damping: 16, stiffness: 80 } });
  const displayPrice = (price * priceProgress).toFixed(2);

  const badgeScale = spring({ frame, fps, from: 0, to: 1, config: { damping: 10, stiffness: 90 }, delay: 12 });
  const labelY = spring({ frame, fps, from: 40, to: 0, config: { damping: 14 }, delay: 6 });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{
        transform: `translateY(${labelY}px)`,
        fontSize: 13, fontWeight: 700, color: '#64748b',
        letterSpacing: 2, textTransform: 'uppercase',
      }}>
        {ticker} · Current Price
      </div>

      {/* Giant animated price */}
      <div style={{
        fontSize: 82, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace',
        letterSpacing: -2, lineHeight: 1,
        textShadow: '0 0 30px rgba(20,184,166,0.3)',
      }}>
        ${displayPrice}
      </div>

      {/* Day change badge */}
      <div style={{
        transform: `scale(${badgeScale})`,
        backgroundColor: `${changeColor}18`,
        border: `2px solid ${changeColor}60`,
        borderRadius: 12, padding: '10px 28px',
        fontSize: 28, fontWeight: 900, color: changeColor,
        fontFamily: 'monospace',
        boxShadow: `0 0 20px ${changeColor}30`,
      }}>
        {changeSign}{dayChange}% today
      </div>

      {/* Narration hint */}
      <div style={{
        marginTop: 8, fontSize: 14, color: '#475569', textAlign: 'center',
        maxWidth: '80%', lineHeight: 1.5, opacity: interpolate(frame, [15, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        {narration}
      </div>
    </div>
  );
};
