import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface TacticalSetupProps extends SceneProps {
  entryZone: string;
  stopLoss: string;
  targets: number[];
}

export const TacticalSetupScene: React.FC<TacticalSetupProps> = ({
  entryZone,
  stopLoss,
  targets,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });

  // Progressive list reveal
  const row1 = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const row2 = spring({ frame: frame - 10, fps, from: 0, to: 1, config: { damping: 12 } });
  const row3 = spring({ frame: frame - 20, fps, from: 0, to: 1, config: { damping: 12 } });

  const target1 = targets[0] ? `$${targets[0]}` : 'N/A';
  const target2 = targets[1] ? `$${targets[1]}` : 'N/A';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      opacity,
    }}>
      <div style={{
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '24px',
        padding: '20px',
        width: '90%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(51, 65, 85, 0.4)', paddingBottom: '8px' }}>
          Tactical Trade Plan
        </div>

        {/* Row 1: Entry Zone */}
        {row1 > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(20, 184, 166, 0.08)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            padding: '10px 15px',
            borderRadius: '10px',
            opacity: row1,
            transform: `translateX(${(1 - row1) * -20}px)`,
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#14b8a6', textTransform: 'uppercase' }}>Entry Zone</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{entryZone}</div>
            </div>
            <span style={{ fontSize: '20px' }}>🎯</span>
          </div>
        )}

        {/* Row 2: Stop Loss */}
        {row2 > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '10px 15px',
            borderRadius: '10px',
            opacity: row2,
            transform: `translateX(${(1 - row2) * -20}px)`,
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>Stop Loss</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>{stopLoss}</div>
            </div>
            <span style={{ fontSize: '20px' }}>🛡️</span>
          </div>
        )}

        {/* Row 3: Profit Targets */}
        {row3 > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            padding: '10px 15px',
            borderRadius: '10px',
            opacity: row3,
            transform: `translateX(${(1 - row3) * -20}px)`,
          }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase' }}>Exit Targets</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                T1: {target1} | T2: {target2}
              </div>
            </div>
            <span style={{ fontSize: '20px' }}>💰</span>
          </div>
        )}
      </div>
    </div>
  );
};
