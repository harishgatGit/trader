import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface RecapIntroSceneProps {
  narration: string;
  textOverlay: string;
  subText?: string;
  decisionColor?: string;
  dataFields: {
    date?: string;
    mood?: string;
    moodColor?: string;
    title?: string;
  };
}

const MOOD_LABELS: Record<string, string> = {
  BULLISH: 'BULLISH', BEARISH: 'BEARISH', MIXED: 'MIXED',
  CAUTIOUS: 'CAUTIOUS', RISK_ON: 'RISK ON', RISK_OFF: 'RISK OFF', NEUTRAL: 'NEUTRAL',
};

const COLOR_MAP: Record<string, string> = {
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', teal: '#14b8a6',
};

export const RecapIntroScene: React.FC<RecapIntroSceneProps> = ({ textOverlay, subText, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const tagOpacity  = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });
  const tagY        = interpolate(frame, [fps * 0.3, fps * 0.8], [30, 0], { extrapolateRight: 'clamp' });
  const dateOpacity = interpolate(frame, [fps * 0.6, fps * 1.1], [0, 1], { extrapolateRight: 'clamp' });
  const moodScale   = spring({ frame: frame - Math.round(fps * 1.2), fps, config: { damping: 14, stiffness: 80 } });
  const lineOpacity = interpolate(frame, [fps * 1.6, fps * 2.0], [0, 1], { extrapolateRight: 'clamp' });

  const mood = dataFields.mood || 'NEUTRAL';
  const moodLabel = MOOD_LABELS[mood] || mood;
  const moodColor = COLOR_MAP[dataFields.moodColor || 'yellow'] || '#f59e0b';
  const date = dataFields.date || '';
  const title = dataFields.title || 'Daily Market Recap';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at 30% 30%, #0f172a 0%, #090d16 70%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06,
        backgroundImage: 'linear-gradient(rgba(20,184,166,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.5) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -120, left: -120,
        width: 400, height: 400,
        background: `radial-gradient(circle, ${moodColor}22 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />

      {/* InvestingAtti brand */}
      <div style={{ opacity: logoOpacity, marginBottom: 20, textAlign: 'center' }}>
        <div style={{ color: '#14b8a6', fontSize: 13, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
          INVESTINGATTI
        </div>
        <div style={{ width: 60, height: 1, background: '#14b8a6', margin: '0 auto', opacity: 0.5 }} />
      </div>

      {/* MARKET RECAP tag */}
      <div style={{ opacity: tagOpacity, transform: `translateY(${tagY}px)`, marginBottom: 16 }}>
        <div style={{
          background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.4)',
          borderRadius: 4, padding: '6px 20px',
          color: '#38bdf8', fontSize: 13, letterSpacing: 4, textTransform: 'uppercase',
        }}>
          {textOverlay}
        </div>
      </div>

      {/* Title */}
      <div style={{ opacity: dateOpacity, textAlign: 'center', marginBottom: 28 }}>
        <div style={{ color: '#f8fafc', fontSize: 42, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
          {title}
        </div>
        {date && (
          <div style={{ color: '#64748b', fontSize: 16, marginTop: 8, letterSpacing: 2 }}>
            {date}
          </div>
        )}
      </div>

      {/* Mood badge */}
      <div style={{ transform: `scale(${moodScale})`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: `${moodColor}22`, border: `2px solid ${moodColor}`,
          borderRadius: 8, padding: '10px 28px',
          color: moodColor, fontSize: 22, fontWeight: 800, letterSpacing: 3,
        }}>
          {moodLabel}
        </div>
      </div>

      {/* Divider line */}
      <div style={{
        opacity: lineOpacity, position: 'absolute', bottom: 32,
        left: 60, right: 60, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.4), transparent)',
      }} />
    </div>
  );
};
