import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

export const EcosystemInsightScene: React.FC<SceneProps> = ({
  ticker,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Node connection pulses
  const pulseScale = 1 + Math.sin(frame / 8) * 0.05;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      opacity,
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '24px',
        padding: '20px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: '8px' }}>
          Market Ecosystem
        </div>

        {/* Radial Map Container */}
        <div style={{
          height: '140px',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Central Ticker Node */}
          <div style={{
            position: 'absolute',
            width: '56px',
            height: '56px',
            borderRadius: '28px',
            backgroundColor: '#1e293b',
            border: '2px stroke #3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '14px',
            color: '#ffffff',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)',
            transform: `scale(${pulseScale})`,
            zIndex: 10,
          }}>
            {ticker}
          </div>

          {/* Sector Node (Left) */}
          <div style={{
            position: 'absolute',
            left: '20px',
            padding: '5px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#10b981',
          }}>
            Sector
          </div>

          {/* Peer Nodes (Top/Bottom) */}
          <div style={{
            position: 'absolute',
            top: '12px',
            padding: '5px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#10b981',
          }}>
            Peers
          </div>

          <div style={{
            position: 'absolute',
            bottom: '12px',
            padding: '5px 10px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11px',
            fontWeight: 700,
            color: '#ef4444',
          }}>
            S&P 500
          </div>
        </div>
      </div>
    </div>
  );
};
