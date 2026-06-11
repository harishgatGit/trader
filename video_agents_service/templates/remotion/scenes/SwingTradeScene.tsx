import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface SwingTradeProps extends SceneProps {
  entryZone: string;
  stopLoss: string;
  targets: Array<number>;
}

export const SwingTradeScene: React.FC<SwingTradeProps> = ({
  entryZone,
  stopLoss,
  targets
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({ frame, fps, from: 0.9, to: 1, config: { damping: 14 } });
  
  // Slide-in animations for each detail card
  const entryX = spring({ frame, fps, from: -300, to: 0, config: { damping: 12 } });
  const stopX = spring({ frame: frame - 6, fps, from: -300, to: 0, config: { damping: 12 } });
  const targetX = spring({ frame: frame - 12, fps, from: -300, to: 0, config: { damping: 12 } });

  const target_str = targets.length > 0 
    ? targets.map(t => `$${t}`).join(', ') 
    : 'N/A';

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
        gap: '20px'
      }}>
        {/* Header */}
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          padding: '4px 12px',
          borderRadius: '6px',
          alignSelf: 'flex-start',
          textTransform: 'uppercase'
        }}>
          Trade Plan
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '24px',
          fontWeight: 800,
          color: '#ffffff',
          margin: 0
        }}>
          Swing Trade Levels
        </h3>

        {/* Level Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
          {/* Entry Card */}
          <div style={{
            transform: `translateX(${entryX}px)`,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(148, 163, 184, 0.08)',
            borderLeft: '5px solid #3b82f6',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Entry Zone</div>
              <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '3px' }}>Chasing limits</div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>
              {entryZone.replace("Price: ", "").replace("Low: ", "$").replace(" High: ", " - $").replace("High: ", "$")}
            </div>
          </div>

          {/* Stop Loss Card */}
          <div style={{
            transform: `translateX(${stopX}px)`,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(148, 163, 184, 0.08)',
            borderLeft: '5px solid #ef4444',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stop Loss</div>
              <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '3px' }}>Invalidation line</div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
              {stopLoss.replace("Price: ", "$")}
            </div>
          </div>

          {/* Targets Card */}
          <div style={{
            transform: `translateX(${targetX}px)`,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(148, 163, 184, 0.08)',
            borderLeft: '5px solid #10b981',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Target Exits</div>
              <div style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '3px' }}>Take profit areas</div>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
              {target_str}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
