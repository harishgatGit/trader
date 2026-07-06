import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 9 — Risk Warning
 * Animated red risk meter fills up + risk text reveals word by word.
 */
export const RiskWarningScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields, narration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const risk = String(dataFields?.risk || narration || 'Monitor support levels closely');
  const supportBreak = String(dataFields?.supportBreak || 'N/A');

  const headerY = spring({ frame, fps, from: -40, to: 0, config: { damping: 14 } });
  const meterFill = spring({ frame, fps, from: 0, to: 1, config: { damping: 18, stiffness: 60 }, delay: 8 });
  const textOpacity = interpolate(frame, [18, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const warnPulse = 1 + Math.sin(frame / 10) * 0.04;

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 20,
      background: 'radial-gradient(ellipse at 50% 70%, #ef444418 0%, transparent 65%)',
    }}>
      <div style={{
        transform: `translateY(${headerY}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontSize: 48, transform: `scale(${warnPulse})` }}>⚠️</div>
        <div style={{
          fontSize: 13, fontWeight: 800, color: '#ef4444',
          letterSpacing: 2, textTransform: 'uppercase',
        }}>
          {ticker} · Risk Watch
        </div>
      </div>

      {/* Risk meter bar */}
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 6,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          <span>Low Risk</span><span>High Risk</span>
        </div>
        <div style={{
          width: '100%', height: 14, backgroundColor: '#1e293b',
          borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            width: `${Math.min(meterFill * 80, 100)}%`, height: '100%',
            background: 'linear-gradient(to right, #f59e0b, #ef4444)',
            borderRadius: 999, boxShadow: '0 0 12px #ef444480',
          }} />
        </div>
      </div>

      {/* Risk text card */}
      <div style={{
        opacity: textOpacity,
        backgroundColor: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 16, padding: '16px 20px', width: '100%',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 6 }}>
          Key Risk
        </div>
        <div style={{ fontSize: 16, color: '#e2e8f0', lineHeight: 1.5, fontWeight: 500 }}>
          {risk}
        </div>
      </div>

      {supportBreak !== 'N/A' && (
        <div style={{
          opacity: textOpacity,
          fontSize: 13, color: '#ef4444', fontWeight: 700, textAlign: 'center',
        }}>
          Watch: break below {supportBreak} increases risk
        </div>
      )}
    </div>
  );
};
