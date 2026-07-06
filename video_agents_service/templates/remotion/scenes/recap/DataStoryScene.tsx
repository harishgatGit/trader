import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

/**
 * Reusable narrative scene for: market_catalyst, volume_momentum,
 * sentiment_pulse, risk_snapshot, tomorrow_outlook.
 * Shows a bold label badge + headline + body text.
 */

interface DataStorySceneProps {
  sceneType: string;
  narration: string;
  textOverlay: string;
  subText?: string;
  decisionColor?: string;
  dataFields: Record<string, any>;
}

const COLOR_MAP: Record<string, string> = {
  green: '#10b981', red: '#ef4444', yellow: '#f59e0b', teal: '#14b8a6',
};

const SCENE_CONFIG: Record<string, { icon: string; badge: string }> = {
  market_catalyst:  { icon: '⚡', badge: 'MAIN CATALYST' },
  volume_momentum:  { icon: '📊', badge: 'VOLUME & MOMENTUM' },
  sentiment_pulse:  { icon: '🧠', badge: 'AI SENTIMENT' },
  risk_snapshot:    { icon: '🛡', badge: 'RISK SNAPSHOT' },
  tomorrow_outlook: { icon: '🔭', badge: 'TOMORROW OUTLOOK' },
};

export const DataStoryScene: React.FC<DataStorySceneProps> = ({
  sceneType, textOverlay, subText, decisionColor, dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const config = SCENE_CONFIG[sceneType] || { icon: '📈', badge: textOverlay };
  const color = COLOR_MAP[decisionColor || 'teal'] || '#14b8a6';

  const badgeScale = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const headlineOpacity = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateRight: 'clamp' });
  const headlineX = interpolate(frame, [fps * 0.5, fps * 1.0], [-40, 0], { extrapolateRight: 'clamp' });
  const bodyOpacity = interpolate(frame, [fps * 1.0, fps * 1.6], [0, 1], { extrapolateRight: 'clamp' });

  // Extra content by scene type
  const extraContent = renderExtra(sceneType, dataFields, color, frame, fps);

  // Main body text: use catalyst / outlook / etc. from dataFields, else subText
  const bodyText = dataFields.catalyst || dataFields.outlook || dataFields.volume || subText || '';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #0f172a 0%, #090d16 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'flex-start', justifyContent: 'center',
      fontFamily: '"Outfit", "Inter", system-ui, sans-serif',
      padding: '48px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Accent bar left */}
      <div style={{
        position: 'absolute', left: 0, top: '15%', bottom: '15%',
        width: 4, background: color, borderRadius: '0 4px 4px 0',
      }} />

      {/* Background glow */}
      <div style={{
        position: 'absolute', right: -200, top: -200,
        width: 600, height: 600,
        background: `radial-gradient(circle, ${color}0f 0%, transparent 70%)`,
        borderRadius: '50%',
      }} />

      {/* Badge */}
      <div style={{
        transform: `scale(${badgeScale})`, marginBottom: 24,
        background: `${color}22`, border: `1px solid ${color}66`,
        borderRadius: 6, padding: '6px 18px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>{config.icon}</span>
        <span style={{
          color, fontSize: 12, letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase',
        }}>
          {config.badge}
        </span>
      </div>

      {/* Headline */}
      <div style={{
        opacity: headlineOpacity, transform: `translateX(${headlineX}px)`,
        color: '#f8fafc', fontSize: 38, fontWeight: 800, lineHeight: 1.15,
        letterSpacing: -0.5, marginBottom: 20, maxWidth: 900,
      }}>
        {textOverlay}
      </div>

      {/* Body */}
      {bodyText && (
        <div style={{
          opacity: bodyOpacity,
          color: '#94a3b8', fontSize: 18, lineHeight: 1.6, maxWidth: 840,
        }}>
          {bodyText.length > 200 ? bodyText.slice(0, 200) + '...' : bodyText}
        </div>
      )}

      {/* Extra content (risk meter, sentiment badge, etc.) */}
      {extraContent}

      {/* InvestingAtti brand bottom right */}
      <div style={{
        position: 'absolute', bottom: 24, right: 40,
        color: '#1e293b', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase',
      }}>
        INVESTINGATTI
      </div>
    </div>
  );
};

function renderExtra(
  sceneType: string,
  dataFields: Record<string, any>,
  color: string,
  frame: number,
  fps: number,
): React.ReactNode {
  const extraOpacity = interpolate(frame, [fps * 1.4, fps * 1.9], [0, 1], { extrapolateRight: 'clamp' });

  if (sceneType === 'risk_snapshot' || sceneType === 'volume_momentum') {
    const level = dataFields.risk || dataFields.volatility || 'MEDIUM';
    const levels = ['LOW', 'MEDIUM', 'HIGH'];
    const idx = levels.indexOf(level);
    return (
      <div style={{ opacity: extraOpacity, marginTop: 28, display: 'flex', gap: 12 }}>
        {levels.map((l, i) => (
          <div key={l} style={{
            padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700, letterSpacing: 2,
            background: i === idx ? `${color}33` : 'rgba(30,41,59,0.6)',
            border: `1px solid ${i === idx ? color : '#1e293b'}`,
            color: i === idx ? color : '#475569',
          }}>{l}</div>
        ))}
      </div>
    );
  }

  if (sceneType === 'sentiment_pulse') {
    const sentiment = dataFields.sentiment || 'NEUTRAL';
    return (
      <div style={{
        opacity: extraOpacity, marginTop: 24,
        background: `${color}22`, border: `2px solid ${color}`,
        borderRadius: 10, padding: '12px 32px', display: 'inline-block',
      }}>
        <div style={{ color, fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>
          {sentiment}
        </div>
        <div style={{ color: '#64748b', fontSize: 11, letterSpacing: 2, marginTop: 4 }}>
          NEWS SENTIMENT
        </div>
      </div>
    );
  }

  if (sceneType === 'tomorrow_outlook') {
    const stocks = dataFields.trendingStocks || [];
    if (!stocks.length) return null;
    return (
      <div style={{ opacity: extraOpacity, marginTop: 24, display: 'flex', gap: 10 }}>
        {stocks.slice(0, 3).map((s: any) => (
          <div key={s.symbol} style={{
            background: 'rgba(17,24,39,0.8)', border: '1px solid #1e293b',
            borderRadius: 8, padding: '10px 18px', textAlign: 'center',
          }}>
            <div style={{ color: '#14b8a6', fontSize: 15, fontWeight: 700 }}>${s.symbol}</div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>{s.signal}</div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
