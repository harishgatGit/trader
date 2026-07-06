import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 10 — Verdict Stamp
 * "FINAL VERDICT" label, then the signal badge slams down like a rubber stamp with glow.
 */
export const VerdictStampScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const signal = String(dataFields?.signal || 'HOLD');
  const verdict = String(dataFields?.verdict || signal);
  const decisionColor = dataFields?.decisionColor || 'yellow';
  const colorMap: Record<string, string> = {
    green: '#10b981', yellow: '#f59e0b', red: '#ef4444'
  };
  const accentColor = colorMap[decisionColor] || '#14b8a6';

  // Stamp slam animation
  const stampScale = spring({ frame, fps, from: 3, to: 1, config: { damping: 8, stiffness: 150 }, delay: 6 });
  const stampOpacity = interpolate(frame, [6, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const verdictOpacity = interpolate(frame, [16, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const glowPulse = 1 + Math.sin(frame / 16) * 0.05;
  const rotation = interpolate(frame, [6, 10], [-8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      background: `radial-gradient(circle at 50% 45%, ${accentColor}20 0%, #090d16 65%)`,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase' }}>
        {ticker} · Final Verdict
      </div>

      {/* Stamp badge */}
      <div style={{
        transform: `scale(${stampScale * glowPulse}) rotate(${rotation}deg)`,
        opacity: stampOpacity,
        border: `4px solid ${accentColor}`,
        borderRadius: 20, padding: '20px 40px',
        fontSize: 46, fontWeight: 900, color: accentColor,
        textTransform: 'uppercase', letterSpacing: 3,
        backgroundColor: `${accentColor}15`,
        boxShadow: `0 0 80px ${accentColor}50, inset 0 0 30px ${accentColor}10`,
        textShadow: `0 0 30px ${accentColor}90`,
      }}>
        {signal}
      </div>

      {/* Verdict text */}
      <div style={{
        opacity: verdictOpacity,
        backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(148,163,184,0.12)',
        borderRadius: 16, padding: '16px 22px', maxWidth: '90%',
        fontSize: 16, color: '#e2e8f0', lineHeight: 1.5, textAlign: 'center', fontWeight: 500,
      }}>
        {verdict}
      </div>

      <div style={{
        opacity: verdictOpacity, fontSize: 10, color: '#475569', textAlign: 'center', marginTop: -8,
      }}>
        Educational insights only · Not financial advice
      </div>
    </div>
  );
};
