import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

export const EntryZoneScene: React.FC<ShortsSceneProps> = ({ ticker, textOverlay, subText, decisionColor, dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entry = dataFields.entryZone || 'N/A';
  const stop = dataFields.stopLoss || 'N/A';
  const themeColor = decisionColor === 'green' ? '#10b981' : '#f59e0b';

  const scale = spring({ frame, fps, from: 0.8, to: 1.0, config: { damping: 12 } });

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 28,
      background: 'radial-gradient(circle at bottom, #022c22 0%, #090d16 100%)',
      padding: '0 40px',
    }}>
      {/* Title */}
      <div style={{ fontSize: 36, fontWeight: 700, color: '#94a3b8', letterSpacing: 2 }}>
        ENTRY ZONE
      </div>

      {/* Main card */}
      <div style={{
        transform: `scale(${scale})`,
        background: 'rgba(15, 23, 42, 0.7)', border: `1.5px solid ${themeColor}`,
        borderRadius: 24, padding: '32px 24px', width: '90%', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: 20,
        boxShadow: `0 15px 35px rgba(16,185,129,0.15)`, backdropFilter: 'blur(8px)'
      }}>
        {/* Entry target */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            SUGGESTED ENTRY
          </div>
          <div style={{ fontSize: 56, fontWeight: 900, color: '#ffffff', textAlign: 'center' }}>
            {entry}
          </div>
        </div>

        <div style={{ width: '80%', height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />

        {/* Stop Loss limit */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            STOP LOSS LIMIT
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, color: '#fca5a5' }}>
            {stop}
          </div>
        </div>
      </div>
    </div>
  );
};
