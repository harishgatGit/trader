import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scenes 6, 7, 8 — Trade Levels (Entry / Stop Loss / Targets)
 * Three color-coded pill rows slide in sequentially.
 */

interface LevelRowProps {
  label: string;
  value: string;
  color: string;
  delayFrames: number;
  frame: number;
  fps: number;
  icon: string;
}

const LevelRow: React.FC<LevelRowProps> = ({ label, value, color, delayFrames, frame, fps, icon }) => {
  const x = spring({ frame, fps, from: -120, to: 0, config: { damping: 14, stiffness: 100 }, delay: delayFrames });
  const opacity = interpolate(frame, [delayFrames, delayFrames + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      transform: `translateX(${x}px)`, opacity,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: `${color}12`, border: `1.5px solid ${color}40`,
      borderRadius: 14, padding: '14px 20px', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace',
        textShadow: `0 0 12px ${color}60`,
      }}>
        {value}
      </span>
    </div>
  );
};

/** Scene 6 — Entry Setup */
export const EntrySetupScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = String(dataFields?.entryZone || 'N/A');
  const support = String(dataFields?.support || 'N/A');
  const titleY = spring({ frame, fps, from: -30, to: 0, config: { damping: 16 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 16,
    }}>
      <div style={{
        transform: `translateY(${titleY}px)`,
        fontSize: 13, fontWeight: 800, color: '#14b8a6',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
      }}>
        {ticker} · Entry Setup
      </div>
      <LevelRow label="Watch Zone" value={entry} color="#10b981" delayFrames={6} frame={frame} fps={fps} icon="🎯" />
      <LevelRow label="Support" value={support} color="#14b8a6" delayFrames={14} frame={frame} fps={fps} icon="🛡️" />
      <div style={{
        marginTop: 8, fontSize: 13, color: '#475569', textAlign: 'center',
        lineHeight: 1.5, opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        Wait for price to hold & volume to confirm
      </div>
    </div>
  );
};

/** Scene 7 — Stop Loss */
export const StopLossScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stop = String(dataFields?.stopLoss || 'N/A');
  const titleY = spring({ frame, fps, from: -30, to: 0, config: { damping: 16 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 16,
      background: 'radial-gradient(circle at 50% 60%, #ef444412 0%, transparent 70%)',
    }}>
      <div style={{
        transform: `translateY(${titleY}px)`,
        fontSize: 13, fontWeight: 800, color: '#ef4444',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
      }}>
        {ticker} · Risk Boundary
      </div>
      <div style={{ fontSize: 48, marginBottom: 4 }}>🛑</div>
      <LevelRow label="Stop Loss" value={stop} color="#ef4444" delayFrames={10} frame={frame} fps={fps} icon="" />
      <div style={{
        marginTop: 8, fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 1.5,
        opacity: interpolate(frame, [18, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        Below this level, the trade thesis weakens
      </div>
    </div>
  );
};

/** Scene 8 — Profit Targets */
export const TargetsScene: React.FC<ShortsSceneProps> = ({ ticker, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const targetStr = String(dataFields?.targetStr || 'N/A');
  const resistance = String(dataFields?.resistance || 'N/A');
  const titleY = spring({ frame, fps, from: -30, to: 0, config: { damping: 16 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px', gap: 16,
      background: 'radial-gradient(circle at 50% 40%, #10b98112 0%, transparent 70%)',
    }}>
      <div style={{
        transform: `translateY(${titleY}px)`,
        fontSize: 13, fontWeight: 800, color: '#10b981',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8,
      }}>
        {ticker} · Upside Watch
      </div>
      <div style={{ fontSize: 48, marginBottom: 4 }}>🚀</div>
      <LevelRow label="Target" value={targetStr} color="#10b981" delayFrames={8} frame={frame} fps={fps} icon="" />
      <LevelRow label="Resistance" value={resistance} color="#f59e0b" delayFrames={16} frame={frame} fps={fps} icon="⚡" />
      <div style={{
        marginTop: 8, fontSize: 13, color: '#475569', textAlign: 'center', lineHeight: 1.5,
        opacity: interpolate(frame, [22, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
      }}>
        Upside only if momentum confirms the breakout
      </div>
    </div>
  );
};
