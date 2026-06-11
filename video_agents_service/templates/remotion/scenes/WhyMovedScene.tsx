import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface WhyMovedProps extends SceneProps {
  whyMoved: string;
  catalysts: string;
}

export const WhyMovedScene: React.FC<WhyMovedProps> = ({
  whyMoved,
  catalysts
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({
    frame,
    fps,
    from: 0.9,
    to: 1,
    config: { damping: 12 }
  });

  const cardX = spring({
    frame,
    fps,
    from: -300,
    to: 0,
    config: { damping: 15, stiffness: 90 }
  });

  const catalystOpacity = spring({
    frame: frame - 10,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15 }
  });

  const floatY = Math.sin(frame / 20) * 6;
  const slowZoom = 1 + (frame / 300) * 0.015;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '105%',
      transform: `scale(${titleScale * slowZoom}) translateY(${floatY}px)`
    }}>
      <div style={{
        transform: `translateX(${cardX}px)`,
        backgroundColor: 'rgba(30, 41, 59, 0.65)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '35px 25px',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '4px 12px',
          borderRadius: '6px',
          alignSelf: 'flex-start',
          textTransform: 'uppercase'
        }}>
          Market Catalyst
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          lineHeight: '1.3'
        }}>
          Why It Moved Today
        </h3>

        {/* Detailed Explanation */}
        <div style={{
          fontSize: '16px',
          color: '#cbd5e1',
          lineHeight: '1.6',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          borderLeft: '4px solid #3b82f6',
          padding: '12px 16px',
          borderRadius: '0 8px 8px 0',
          fontWeight: 500
        }}>
          {whyMoved}
        </div>

        {/* Catalyst Highlights */}
        {catalysts && catalysts !== 'Unavailable' && (
          <div style={{
            opacity: catalystOpacity,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '5px'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Key Highlights
            </div>
            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
              lineHeight: '1.5',
              margin: 0,
              fontStyle: 'italic'
            }}>
              {catalysts}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
