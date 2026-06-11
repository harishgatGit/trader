import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

export const HookScene: React.FC<SceneProps> = ({
  ticker,
  companyName,
  textOverlay,
  visualInstruction
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation values
  const cardTranslateY = spring({
    frame,
    fps,
    from: 400,
    to: 0,
    config: { damping: 15, stiffness: 100 }
  });

  const opacity = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 20 }
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
      opacity,
      transform: `scale(${slowZoom})`
    }}>
      <div style={{
        transform: `translateY(${cardTranslateY + floatY}px)`,
        backgroundColor: 'rgba(30, 41, 59, 0.65)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '50px 30px',
        width: '90%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '25px'
      }}>
        {/* Animated Badge */}
        <div style={{
          backgroundColor: 'rgba(20, 184, 166, 0.12)',
          color: '#14b8a6',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          padding: '6px 16px',
          borderRadius: '9999px',
          fontSize: '14px',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Daily Stock Story
        </div>

        {/* Ticker Title */}
        <h2 style={{
          fontSize: '54px',
          fontWeight: 900,
          margin: 0,
          color: '#ffffff',
          fontFamily: 'monospace',
          letterSpacing: '-1px'
        }}>
          {ticker}
        </h2>

        {/* Company Name */}
        <div style={{
          fontSize: '18px',
          color: '#94a3b8',
          marginTop: '-15px',
          fontWeight: 500
        }}>
          {companyName}
        </div>

        {/* Text Overlay Hook */}
        <div style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#e2e8f0',
          lineHeight: '1.4',
          marginTop: '10px',
          background: 'linear-gradient(to bottom, #ffffff, #cbd5e1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          {textOverlay}
        </div>
      </div>
    </div>
  );
};
