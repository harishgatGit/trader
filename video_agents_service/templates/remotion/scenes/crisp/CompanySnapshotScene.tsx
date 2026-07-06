import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const CompanySnapshotScene: React.FC<ShortsSceneProps> = ({ ticker, companyName, textOverlay, subText, narration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const animX = spring({ frame, fps, from: -100, to: 0, config: { damping: 15 } });
  const animOpacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
      padding: '0 40px',
    }}>
      {/* Visual background element */}
      <div style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
        bottom: '20%', right: '10%', zIndex: 1, pointerEvents: 'none',
      }} />

      {/* Snapshot Header */}
      <div style={{
        transform: `translateX(${animX}px)`, opacity: animOpacity, zIndex: 2,
        fontSize: 36, fontWeight: 700, color: '#6366f1', letterSpacing: 1.5,
        textTransform: 'uppercase'
      }}>
        COMPANY SNAPSHOT
      </div>

      {/* Main Stock Card */}
      <div style={{
        transform: `scale(${animOpacity})`, zIndex: 2,
        background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 24, padding: '30px', width: '90%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: '#ffffff' }}>
          {ticker}
        </div>
        <div style={{ fontSize: 36, fontWeight: 600, color: '#cbd5e1', textAlign: 'center' }}>
          {companyName}
        </div>
      </div>

      {/* Detail Text Block */}
      <div style={{
        fontSize: 32, fontWeight: 500, color: '#94a3b8', textAlign: 'center',
        lineHeight: 1.4, maxWidth: '85%', zIndex: 2
      }}>
        {textOverlay || 'Corporate Profile Stability Active'}
      </div>
    </div>
  );
};
