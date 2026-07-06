import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 5 — AI Signal Badge
 * Giant badge slams in from top, radiates glow, signal label pops.
 */
export const SignalBadgeScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const signal = dataFields?.signal || 'HOLD';
  const decisionColor = dataFields?.decisionColor || 'yellow';
  const colorMap: Record<string, string> = {
    green: '#10b981', yellow: '#f59e0b', red: '#ef4444'
  };
  const accentColor = colorMap[decisionColor] || '#14b8a6';

  const badgeScale = spring({ frame, fps, from: 0.2, to: 1, config: { damping: 9, stiffness: 110 } });
  const glowPulse = 1 + Math.sin(frame / 14) * 0.06;
  const labelY = spring({ frame, fps, from: 30, to: 0, config: { damping: 14 }, delay: 12 });

  const emoji = decisionColor === 'green' ? '🟢' : decisionColor === 'red' ? '🔴' : '🟡';

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 50% 40%, ${accentColor}18 0%, #090d16 70%)`,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#64748b',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20,
      }}>
        {ticker} · AI Signal Rating
      </div>

      {/* Giant badge */}
      <div style={{
        transform: `scale(${badgeScale * glowPulse})`,
        backgroundColor: `${accentColor}18`,
        border: `3px solid ${accentColor}`,
        borderRadius: 24, padding: '24px 48px',
        fontSize: 52, fontWeight: 900, color: accentColor,
        textTransform: 'uppercase', letterSpacing: 2,
        boxShadow: `0 0 60px ${accentColor}40, 0 0 120px ${accentColor}20`,
        textShadow: `0 0 30px ${accentColor}80`,
      }}>
        {signal}
      </div>

      {/* Emoji + description */}
      <div style={{
        transform: `translateY(${labelY}px)`,
        marginTop: 28, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 36 }}>{emoji}</div>
        <div style={{
          fontSize: 16, fontWeight: 600, color: '#94a3b8', textAlign: 'center',
        }}>
          {decisionColor === 'green'
            ? 'Bullish setup — watch for confirmation'
            : decisionColor === 'red'
            ? 'Bearish signal — manage risk carefully'
            : 'Neutral — wait for clear direction'}
        </div>
      </div>
    </div>
  );
};
