import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const HookScene: React.FC<ShortsSceneProps> = ({ ticker, companyName, textOverlay, subText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, from: 0.5, to: 1.0, config: { damping: 12, stiffness: 100 } });
  const textTranslateY = spring({ frame, fps, from: 80, to: 0, config: { damping: 15 }, delay: 5 });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: 'radial-gradient(circle at center, #1e293b 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Decorative gradient orb */}
      <div style={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)',
        top: '25%', left: '15%', zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Floating badge */}
      <div style={{
        transform: `scale(${scale})`, zIndex: 2,
        backgroundColor: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
        borderRadius: 8, padding: '6px 16px', fontSize: 14, color: '#14b8a6', fontWeight: 800,
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10
      }}>
        DAILY AI ANALYSIS
      </div>

      {/* Ticker Symbol */}
      <div style={{
        fontSize: 72, fontWeight: 900, color: '#ffffff', letterSpacing: -1,
        textShadow: '0 0 30px rgba(255,255,255,0.2)', zIndex: 2
      }}>
        {ticker}
      </div>

      {/* Main Hook Question */}
      <div style={{
        transform: `translateY(${textTranslateY}px)`, zIndex: 2,
        fontSize: 48, fontWeight: 800, color: '#14b8a6', textAlign: 'center',
        lineHeight: 1.2, letterSpacing: -0.5, maxWidth: '90%'
      }}>
        {textOverlay || 'Breakout or Trap?'}
      </div>

      {/* Subtext info */}
      <div style={{
        fontSize: 32, fontWeight: 500, color: '#64748b', textAlign: 'center',
        marginTop: 10, maxWidth: '80%', zIndex: 2
      }}>
        {subText || companyName}
      </div>
    </div>
  );
};
