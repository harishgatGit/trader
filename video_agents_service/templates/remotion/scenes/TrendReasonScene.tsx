import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface TrendReasonProps extends SceneProps {
  whyMoved: string;
  trend: string;
}

export const TrendReasonScene: React.FC<TrendReasonProps> = ({
  whyMoved,
  trend,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  
  // Arrow rotation/movement animation
  const isUp = trend.toUpperCase().includes('BULL') || trend.toUpperCase().includes('UP');
  const isDown = trend.toUpperCase().includes('BEAR') || trend.toUpperCase().includes('DOWN');
  
  const arrowY = spring({
    frame,
    fps,
    from: 30,
    to: 0,
    config: { damping: 12, stiffness: 80 }
  });

  const flowProgress = spring({
    frame: frame - 15,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15 }
  });

  const arrowAngle = isUp ? '-45deg' : isDown ? '45deg' : '0deg';
  const arrowColor = isUp ? '#10b981' : isDown ? '#ef4444' : '#64748b';

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
        padding: '25px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Trend Indicator Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            transform: `translateY(${arrowY}px) rotate(${arrowAngle})`,
            color: arrowColor,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
              <polyline points="12 5 19 12 12 19" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Trend Direction
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f8fafc' }}>
              {trend}
            </div>
          </div>
        </div>

        {/* Reason card */}
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          padding: '18px',
          border: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase', marginBottom: '8px' }}>
            Primary Driver
          </div>
          <div style={{ fontSize: '15px', color: '#cbd5e1', lineHeight: '1.4', fontWeight: 500 }}>
            {whyMoved}
          </div>
        </div>

        {/* Catalyst flow diagram */}
        {flowProgress > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#64748b',
            opacity: flowProgress,
            transform: `translateY(${(1 - flowProgress) * 10}px)`,
          }}>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '6px' }}>Catalyst</div>
            <span>→</span>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '6px' }}>Volume</div>
            <span>→</span>
            <div style={{ backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '6px' }}>Price Move</div>
          </div>
        )}
      </div>
    </div>
  );
};
