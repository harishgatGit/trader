import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const SupportResistanceScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const support = dataFields.support || 'N/A';
  const resistance = dataFields.resistance || 'N/A';

  const lineProgress = interpolate(frame, [5, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  const animScale = spring({ frame, fps, from: 0.8, to: 1, config: { damping: 12 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 32,
      background: 'radial-gradient(circle at center, #111827 0%, #020617 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        SUPPORT & RESISTANCE
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 24, width: '100%',
        transform: `scale(${animScale})`
      }}>
        {/* Resistance (Ceiling) Card */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Animated ceiling line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, height: 4, 
            backgroundColor: '#ef4444', width: `${lineProgress * 100}%`
          }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: '#fca5a5', letterSpacing: 1 }}>
            RESISTANCE CEILING
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, color: '#ef4444' }}>
            {resistance}
          </div>
        </div>

        {/* Support (Floor) Card */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 16, padding: '20px 24px', position: 'relative', overflow: 'hidden'
        }}>
          {/* Animated floor line */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, height: 4, 
            backgroundColor: '#10b981', width: `${lineProgress * 100}%`
          }} />
          <div style={{ fontSize: 24, fontWeight: 700, color: '#a7f3d0', letterSpacing: 1 }}>
            SUPPORT FLOOR
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, color: '#10b981' }}>
            {support}
          </div>
        </div>
      </div>
    </div>
  );
};
