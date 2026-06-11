import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface ShortTradeProps extends SceneProps {
  shortView: string;
}

export const ShortTradeScene: React.FC<ShortTradeProps> = ({
  shortView,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Squeeze Risk indicator pulse
  const pulseScale = 1 + Math.sin(frame / 6) * 0.04;

  const getSqueezeRisk = () => {
    const text = shortView.toUpperCase();
    if (text.includes('HIGH') || text.includes('RISK')) return 'HIGH';
    if (text.includes('LOW')) return 'LOW';
    return 'MEDIUM';
  };

  const risk = getSqueezeRisk();
  const riskColor = risk === 'HIGH' ? '#ef4444' : risk === 'MEDIUM' ? '#f59e0b' : '#10b981';

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Short Selling View
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: riskColor,
              backgroundColor: `${riskColor}15`,
              border: `1px solid ${riskColor}30`,
              padding: '3px 8px',
              borderRadius: '6px',
              transform: `scale(${pulseScale})`,
            }}
          >
            SQUEEZE RISK: {risk}
          </span>
        </div>

        {/* Short setup commentary */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</span>
          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.4', fontWeight: 500 }}>
            {shortView}
          </div>
        </div>
      </div>
    </div>
  );
};
