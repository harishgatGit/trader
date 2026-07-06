import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface RecapOutroSceneProps {
  narration: string;
  textOverlay: string;
  subText?: string;
  dataFields: {
    websiteUrl?: string;
    date?: string;
  };
}

export const RecapOutroScene: React.FC<RecapOutroSceneProps> = ({
  textOverlay, subText, dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale  = spring({ frame, fps, config: { damping: 13, stiffness: 80 } });
  const tagOpacity = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateRight: 'clamp' });
  const ctaScale   = spring({ frame: frame - Math.round(fps * 1.0), fps, config: { damping: 14, stiffness: 100 } });
  const subOp      = interpolate(frame, [fps * 1.4, fps * 1.9], [0, 1], { extrapolateRight: 'clamp' });
  const pulseOp    = interpolate(frame, [0, fps * 0.5, fps * 1.0, fps * 1.5, fps * 2.0], [0.4, 1, 0.4, 1, 0.4], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at 50% 40%, #0f2937 0%, #090d16 65%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Teal ring effect */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        border: '1px solid rgba(20,184,166,0.15)',
        borderRadius: '50%',
        opacity: pulseOp,
      }} />
      <div style={{
        position: 'absolute',
        width: 700, height: 700,
        border: '1px solid rgba(20,184,166,0.07)',
        borderRadius: '50%',
        opacity: pulseOp * 0.6,
      }} />

      {/* Brand */}
      <div style={{ transform: `scale(${logoScale})`, marginBottom: 20, textAlign: 'center' }}>
        <div style={{
          color: '#14b8a6', fontSize: 42, fontWeight: 900, letterSpacing: 4, textTransform: 'uppercase',
        }}>
          InvestingAtti
        </div>
        <div style={{ color: '#0e7490', fontSize: 13, letterSpacing: 3, marginTop: 6 }}>
          AI-Powered Stock Analysis
        </div>
      </div>

      {/* Divider */}
      <div style={{
        opacity: tagOpacity, width: 80, height: 2,
        background: 'linear-gradient(90deg, transparent, #14b8a6, transparent)',
        marginBottom: 28,
      }} />

      {/* CTA */}
      <div style={{
        transform: `scale(${ctaScale})`, textAlign: 'center',
      }}>
        <div style={{
          background: 'rgba(20,184,166,0.15)', border: '2px solid #14b8a6',
          borderRadius: 12, padding: '16px 48px',
          color: '#14b8a6', fontSize: 22, fontWeight: 700, letterSpacing: 1,
          marginBottom: 16,
        }}>
          {dataFields.websiteUrl || 'www.investingatti.com'}
        </div>
      </div>

      {/* Sub text */}
      <div style={{
        opacity: subOp, textAlign: 'center',
        color: '#475569', fontSize: 14, letterSpacing: 1, maxWidth: 500, lineHeight: 1.5,
      }}>
        Get full AI analysis on every stock • Free reports daily
        {'\n'}Not financial advice. Educational insights only.
      </div>

      {/* Date */}
      {dataFields.date && (
        <div style={{
          opacity: subOp,
          position: 'absolute', bottom: 28,
          color: '#1e293b', fontSize: 12, letterSpacing: 3,
        }}>
          {dataFields.date}
        </div>
      )}
    </div>
  );
};
