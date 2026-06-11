import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface PriceSummaryProps extends SceneProps {
  currentPrice: number;
  dayChangePct: number;
  overallSignal: string;
}

export const PriceSummaryScene: React.FC<PriceSummaryProps> = ({
  ticker,
  currentPrice,
  dayChangePct,
  overallSignal
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Price count up interpolation
  const animationDuration = 25; // frames
  const fraction = Math.min(1, frame / animationDuration);
  const interpolatedPrice = currentPrice * fraction;

  const cardScale = spring({
    frame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 12 }
  });

  const ratingOpacity = spring({
    frame: frame - 15, // delay rating fade in
    fps,
    from: 0,
    to: 1,
    config: { damping: 15 }
  });

  const isUp = dayChangePct >= 0;
  const changeColor = isUp ? '#10b981' : '#ef4444';
  const changeSign = isUp ? '+' : '';

  const getSignalColor = (sig: string) => {
    const s = sig.toUpperCase();
    if (s.includes('BUY')) return '#10b981';
    if (s.includes('SELL') || s.includes('AVOID')) return '#ef4444';
    if (s.includes('HOLD') || s.includes('WATCH')) return '#f59e0b';
    return '#3b82f6';
  };

  const signalColor = getSignalColor(overallSignal);

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
      transform: `scale(${cardScale * slowZoom}) translateY(${floatY}px)`
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.65)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '24px',
        padding: '40px 30px',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px' }}>
          CURRENT PRICE SUMMARY
        </div>

        <div style={{
          fontSize: '64px',
          fontWeight: 900,
          color: '#ffffff',
          fontFamily: 'monospace',
          letterSpacing: '-2px',
          margin: 0
        }}>
          ${interpolatedPrice.toFixed(2)}
        </div>

        {/* Change Percent Badge */}
        {dayChangePct !== undefined && (
          <div style={{
            fontSize: '20px',
            fontWeight: 800,
            color: changeColor,
            backgroundColor: `${changeColor}15`,
            border: `1px solid ${changeColor}30`,
            padding: '8px 18px',
            borderRadius: '12px',
            marginTop: '-5px',
            fontFamily: 'monospace'
          }}>
            {changeSign}{dayChangePct.toFixed(2)}% TODAY
          </div>
        )}

        {/* Signal/Verdict Badge */}
        <div style={{
          opacity: ratingOpacity,
          marginTop: '15px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            InvestingAtti Rating
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 900,
            color: signalColor,
            backgroundColor: `${signalColor}15`,
            border: `2px solid ${signalColor}40`,
            padding: '12px 35px',
            borderRadius: '20px',
            letterSpacing: '1px',
            textAlign: 'center',
            boxShadow: `0 0 20px ${signalColor}10`
          }}>
            {overallSignal}
          </div>
        </div>
      </div>
    </div>
  );
};
