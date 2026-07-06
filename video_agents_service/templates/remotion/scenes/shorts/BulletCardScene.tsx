import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Reusable bold bullet card — used for Scenes 3 (Why Moved) and 4 (Catalyst) */
export const BulletCardScene: React.FC<ShortsSceneProps & { label: string; icon: string }> = ({
  dataFields, narration, textOverlay, subText, label, icon
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardY = spring({ frame, fps, from: 80, to: 0, config: { damping: 14, stiffness: 100 } });
  const iconScale = spring({ frame, fps, from: 0, to: 1, config: { damping: 10, stiffness: 130 }, delay: 8 });
  const textOpacity = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const bodyText = subText || narration || '';

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '0 24px',
    }}>
      {/* Section label */}
      <div style={{
        fontSize: 11, fontWeight: 800, color: '#64748b',
        letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14,
      }}>
        {label}
      </div>

      {/* Icon */}
      <div style={{
        transform: `scale(${iconScale})`,
        fontSize: 52, marginBottom: 18, lineHeight: 1,
      }}>
        {icon}
      </div>

      {/* Card */}
      <div style={{
        transform: `translateY(${cardY}px)`,
        backgroundColor: 'rgba(17,24,39,0.85)',
        border: '1px solid rgba(148,163,184,0.12)',
        borderRadius: 20, padding: '22px 24px',
        width: '100%', backdropFilter: 'blur(8px)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: '#14b8a6',
          textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
        }}>
          {textOverlay}
        </div>
        <div style={{
          fontSize: 18, fontWeight: 600, color: '#e2e8f0',
          lineHeight: 1.5, opacity: textOpacity,
        }}>
          {bodyText}
        </div>
      </div>
    </div>
  );
};

/** Scene 3 — Why Moved */
export const ReasonCardScene: React.FC<ShortsSceneProps> = (props) => (
  <BulletCardScene {...props} label="Why It Moved" icon="📊" />
);

/** Scene 4 — Catalyst */
export const CatalystCardScene: React.FC<ShortsSceneProps> = (props) => (
  <BulletCardScene {...props} label="Key Catalyst" icon="⚡" />
);
