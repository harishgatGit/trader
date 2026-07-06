import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';
import { ShortsSceneProps } from '../ShortsVideo';

/** Scene 1 — Thumbnail Hook
 * Full-bleed gradient background, giant ticker, hook question flies in.
 * Designed to be the thumbnail frame (first 5 seconds).
 */
export const ThumbnailHookScene: React.FC<ShortsSceneProps> = ({
  ticker, companyName, dataFields, narration
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const decisionColor = dataFields?.decisionColor || 'yellow';
  const colorMap: Record<string, string> = {
    green: '#10b981', yellow: '#f59e0b', red: '#ef4444'
  };
  const accentColor = colorMap[decisionColor] || '#14b8a6';

  const tickerScale = spring({ frame, fps, from: 0.5, to: 1, config: { damping: 12, stiffness: 120 } });
  const hookY = spring({ frame, fps, from: 60, to: 0, config: { damping: 14 }, delay: 10 });
  const logoOpacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 20 }, delay: 5 });

  const pulse = 1 + Math.sin(frame / 18) * 0.012;
  const hookQuestion = dataFields?.hookQuestion || narration || `Is ${ticker} about to break out?`;

  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `radial-gradient(ellipse at 40% 30%, ${accentColor}22 0%, #090d16 65%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {/* Animated glow ring behind ticker */}
      <div style={{
        position: 'absolute', width: 340, height: 340, borderRadius: '50%',
        background: `radial-gradient(circle, ${accentColor}18 0%, transparent 70%)`,
        transform: `scale(${pulse})`,
      }} />

      {/* InvestingAtti logo */}
      <div style={{ position: 'absolute', top: 32, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: logoOpacity }}>
        <img src={staticFile('mobile_header_logo_dark_390x96.png')}
          style={{ height: 28, objectFit: 'contain' }} />
      </div>

      {/* Badge */}
      <div style={{
        backgroundColor: `${accentColor}20`, border: `1px solid ${accentColor}50`,
        borderRadius: 999, padding: '5px 14px', fontSize: 11, fontWeight: 800,
        color: accentColor, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18,
        opacity: logoOpacity,
      }}>
        {dataFields?.badge || 'Daily AI Analysis'}
      </div>

      {/* Giant Ticker */}
      <div style={{
        fontSize: 96, fontWeight: 900, color: '#ffffff', fontFamily: 'monospace',
        letterSpacing: -3, lineHeight: 1, transform: `scale(${tickerScale})`,
        textShadow: `0 0 40px ${accentColor}60`,
      }}>
        {ticker}
      </div>

      {/* Company name */}
      <div style={{
        fontSize: 16, color: '#94a3b8', fontWeight: 500, marginTop: 6,
        opacity: logoOpacity,
      }}>
        {companyName}
      </div>

      {/* Hook question */}
      <div style={{
        transform: `translateY(${hookY}px)`, marginTop: 28,
        backgroundColor: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(10px)',
        border: `1px solid ${accentColor}30`, borderRadius: 16,
        padding: '16px 24px', maxWidth: '88%', textAlign: 'center',
        fontSize: 19, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.4,
      }}>
        {hookQuestion}
      </div>

      {/* Bottom teal line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 3, background: `linear-gradient(to right, transparent, ${accentColor}, transparent)`,
      }} />
    </div>
  );
};
