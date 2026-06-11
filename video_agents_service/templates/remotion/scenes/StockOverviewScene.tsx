import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface StockOverviewProps extends SceneProps {
  overallSignal: string;
  confidenceScore: number;
}

export const StockOverviewScene: React.FC<StockOverviewProps> = ({
  ticker,
  companyName,
  overallSignal,
  confidenceScore,
  dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const scale = spring({ frame, fps, from: 0.8, to: 1, config: { damping: 10 } });
  
  // Confidence meter circle stroke offset animation
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (confidenceScore / 100) * circumference;
  
  const circleOffset = spring({
    frame,
    fps,
    from: circumference,
    to: targetOffset,
    config: { damping: 20, stiffness: 60 }
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      opacity,
      transform: `scale(${scale})`,
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '24px',
        padding: '30px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}>
        {/* Ticker and Company Info Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          padding: '6px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '22px',
            fontWeight: 900,
            color: '#14b8a6',
          }}>
            {ticker}
          </span>
          <span style={{
            width: '1px',
            height: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          }} />
          <span style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#cbd5e1',
          }}>
            {companyName}
          </span>
        </div>

        {/* Catchy Hook/Highlight Line (Large, Prominent Headline) */}
        <div style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#ffffff',
          textAlign: 'center',
          lineHeight: '1.35',
          maxWidth: '95%',
          margin: '10px 0',
          backgroundImage: 'linear-gradient(to right, #ffffff, #14b8a6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 4px 12px rgba(20, 184, 166, 0.2)',
        }}>
          {dataFields?.catchyLine || dataFields?.CatchyLine || `${ticker} Stock Analysis`}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          width: '100%',
          marginTop: '10px',
        }}>
          {/* Signal Badge */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Rating
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#ffffff',
              backgroundColor: overallSignal.toUpperCase() === 'BUY' || overallSignal.toUpperCase() === 'BULLISH'
                ? '#0f766e' : overallSignal.toUpperCase() === 'SELL' || overallSignal.toUpperCase() === 'BEARISH'
                ? '#991b1b' : '#334155',
              padding: '6px 16px',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}>
              {overallSignal}
            </span>
          </div>

          {/* Confidence circular meter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Confidence
            </span>
            <div style={{ position: 'relative', width: '100px', height: '100px' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.1)"
                  strokeWidth="8"
                />
                {/* Meter circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={circleOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                fontWeight: 800,
                color: '#ffffff',
              }}>
                {confidenceScore}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
