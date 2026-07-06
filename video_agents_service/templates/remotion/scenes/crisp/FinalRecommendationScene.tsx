import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const FinalRecommendationScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, decisionColor, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rating = dataFields.signal || 'HOLD';
  const themeColor = decisionColor === 'green' ? '#10b981' : decisionColor === 'red' ? '#ef4444' : '#eab308';

  const stampScale = spring({ frame, fps, from: 3.5, to: 1.0, config: { damping: 10, stiffness: 150 } });
  const stampOpacity = interpolate(frame, [0, 8], [0, 1]);
  
  const textTranslateY = spring({ frame, fps, from: 50, to: 0, config: { damping: 12 }, delay: 15 });
  const textOpacity = interpolate(frame, [15, 25], [0, 1]);

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 36,
      background: 'radial-gradient(circle at center, #0f172a 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        FINAL RECOMMENDATION
      </div>

      {/* Massive Stamp */}
      <div style={{
        transform: `scale(${stampScale})`, opacity: stampOpacity,
        border: `8px double ${themeColor}`, borderRadius: 20,
        padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 35px ${themeColor}30`, transformOrigin: 'center center'
      }}>
        <div style={{
          fontSize: 88, fontWeight: 950, color: themeColor, letterSpacing: 1.5,
          textTransform: 'uppercase', textShadow: `0 0 10px ${themeColor}40`
        }}>
          {rating}
        </div>
      </div>

      {/* Call to Action details */}
      <div style={{
        transform: `translateY(${textTranslateY}px)`, opacity: textOpacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        width: '100%'
      }}>
        <div style={{ fontSize: 24, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Full analysis & report at
        </div>
        <div style={{
          fontSize: 38, fontWeight: 900, color: '#14b8a6', letterSpacing: 0.5,
          textShadow: '0 0 20px rgba(20,184,166,0.4)',
        }}>
          investingatti.com
        </div>
        <div style={{
          backgroundColor: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
          borderRadius: 8, padding: '6px 16px', fontSize: 18, color: '#14b8a6', fontWeight: 800,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          Free AI Stock Research
        </div>
      </div>
    </div>
  );
};
