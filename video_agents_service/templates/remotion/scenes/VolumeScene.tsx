import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface VolumeProps extends SceneProps {
  volumeSummary: string;
}

export const VolumeScene: React.FC<VolumeProps> = ({
  volumeSummary
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // spring for bar height
  const barHeight1 = spring({ frame, fps, from: 0, to: 80, config: { damping: 10 } });
  const barHeight2 = spring({ frame: frame - 5, fps, from: 0, to: 120, config: { damping: 12 } });
  const barHeight3 = spring({ frame: frame - 10, fps, from: 0, to: 160, config: { damping: 15 } });
  const barHeight4 = spring({ frame: frame - 15, fps, from: 0, to: 90, config: { damping: 11 } });

  const cardScale = spring({
    frame,
    fps,
    from: 0.9,
    to: 1,
    config: { damping: 14 }
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '105%',
      transform: `scale(${cardScale})`
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.65)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        padding: '35px 25px',
        width: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'center'
      }}>
        {/* Header */}
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.12)',
          border: '1px solid rgba(20, 184, 166, 0.25)',
          padding: '4px 12px',
          borderRadius: '6px',
          textTransform: 'uppercase'
        }}>
          Volume Strength
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          textAlign: 'center'
        }}>
          Institutional Support Check
        </h3>

        {/* Animated Volume Bars */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '12px',
          height: '180px',
          width: '100%',
          paddingBottom: '10px',
          borderBottom: '2px solid rgba(148, 163, 184, 0.15)'
        }}>
          <div style={{ width: '25px', height: `${barHeight1}px`, backgroundColor: 'rgba(20, 184, 166, 0.3)', borderRadius: '6px 6px 0 0' }} />
          <div style={{ width: '25px', height: `${barHeight2}px`, backgroundColor: 'rgba(20, 184, 166, 0.5)', borderRadius: '6px 6px 0 0' }} />
          <div style={{ width: '25px', height: `${barHeight3}px`, backgroundColor: '#14b8a6', borderRadius: '6px 6px 0 0' }} />
          <div style={{ width: '25px', height: `${barHeight4}px`, backgroundColor: 'rgba(20, 184, 166, 0.7)', borderRadius: '6px 6px 0 0' }} />
        </div>

        {/* Explanation */}
        <div style={{
          fontSize: '15px',
          color: '#cbd5e1',
          lineHeight: '1.5',
          textAlign: 'center',
          fontWeight: 550
        }}>
          {volumeSummary}
        </div>
      </div>
    </div>
  );
};
