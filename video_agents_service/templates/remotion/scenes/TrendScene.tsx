import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface TrendProps extends SceneProps {
  trendSummary: string;
}

export const TrendScene: React.FC<TrendProps> = ({
  trendSummary
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardTranslateY = spring({
    frame,
    fps,
    from: 200,
    to: 0,
    config: { damping: 15 }
  });

  // SVG Line drawing animation
  const lineLength = 500;
  const drawOffset = spring({
    frame: frame - 5, // slight delay
    fps,
    from: lineLength,
    to: 0,
    config: { damping: 18, stiffness: 60 }
  });

  const isUpward = trendSummary.toUpperCase().includes("UP") || trendSummary.toUpperCase().includes("BULL");

  // Path coordinates: Upward goes up, Downward goes down
  const pathData = isUpward
    ? "M 50,220 C 150,200 250,80 350,50"
    : "M 50,50 C 150,80 250,200 350,220";

  const lineColor = isUpward ? '#10b981' : '#ef4444';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '105%',
      transform: `translateY(${cardTranslateY}px)`
    }}>
      <div style={{
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
          Trend Analysis
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#ffffff',
          margin: 0
        }}>
          Daily & Hourly Trend Story
        </h3>

        {/* Animated Line Graph SVG */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '250px',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          borderRadius: '16px',
          border: '1px solid rgba(148, 163, 184, 0.08)',
          position: 'relative'
        }}>
          <svg width="400" height="250" viewBox="0 0 400 250" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            <line x1="50" y1="50" x2="350" y2="50" stroke="rgba(148, 163, 184, 0.05)" strokeWidth="1" />
            <line x1="50" y1="135" x2="350" y2="135" stroke="rgba(148, 163, 184, 0.05)" strokeWidth="1" />
            <line x1="50" y1="220" x2="350" y2="220" stroke="rgba(148, 163, 184, 0.05)" strokeWidth="1" />
            
            {/* Animated Trend Line */}
            <path
              d={pathData}
              fill="none"
              stroke={lineColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={lineLength}
              strokeDashoffset={drawOffset}
            />

            {/* End Point Glow Circle */}
            {drawOffset === 0 && (
              <circle
                cx="350"
                cy={isUpward ? 50 : 220}
                r="7"
                fill={lineColor}
                style={{ boxShadow: `0 0 10px ${lineColor}` }}
              />
            )}
          </svg>
        </div>

        {/* Description Text */}
        <div style={{
          fontSize: '15px',
          color: '#cbd5e1',
          lineHeight: '1.5',
          fontWeight: 500
        }}>
          {trendSummary}
        </div>
      </div>
    </div>
  );
};
