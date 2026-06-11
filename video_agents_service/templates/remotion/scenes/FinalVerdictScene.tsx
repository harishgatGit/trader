import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneProps } from '../MainVideo';

interface FinalVerdictProps extends SceneProps {
  overallSignal: string;
  finalVerdict: string;
  riskWarning: string;
  keyLevel: string;
}

export const FinalVerdictScene: React.FC<FinalVerdictProps> = ({
  overallSignal,
  finalVerdict,
  riskWarning,
  keyLevel,
  dataFields,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const opacity = spring({ frame, fps, from: 0, to: 1, config: { damping: 12 } });
  const badgeScale = spring({ frame, fps, from: 0, to: 1, config: { damping: 10, stiffness: 85 } });

  const isPositive = overallSignal.toUpperCase() === 'BUY' || overallSignal.toUpperCase() === 'BULLISH';
  const signalColor = isPositive ? '#10b981' : '#ef4444';

  const quote = dataFields?.quote || "Success in trading comes from risk control, not from predicting the future. Stay disciplined!";
  const sceneDisclaimer = dataFields?.disclaimer || "Disclaimer: Educational insights only. Not financial advice. Past performance is not indicative of future results.";

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
        gap: '15px',
      }}>
        {/* Verdict Badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
            Final Verdict
          </span>
          <div style={{
            transform: `scale(${badgeScale})`,
            backgroundColor: `${signalColor}15`,
            border: `2px solid ${signalColor}`,
            borderRadius: '12px',
            padding: '10px 24px',
            fontSize: '24px',
            fontWeight: 900,
            color: signalColor,
            boxShadow: `0 0 15px ${signalColor}30`,
            textTransform: 'uppercase',
          }}>
            {overallSignal}
          </div>
        </div>

        {/* Risk warning section */}
        {riskWarning && riskWarning !== 'N/A' && riskWarning !== 'Unavailable' && (
          <div style={{
            backgroundColor: '#1b1c28',
            borderRadius: '12px',
            padding: '10px 12px',
            border: '1px solid rgba(239, 68, 68, 0.15)',
          }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '2px' }}>
              Main Risk Factor
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4' }}>
              {riskWarning}
            </div>
          </div>
        )}

        {/* Key levels to watch */}
        {keyLevel && keyLevel !== 'N/A' && keyLevel !== 'Unavailable' && (
          <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '12px',
            padding: '10px 12px',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Key Level to Watch</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', fontFamily: 'monospace' }}>
              {keyLevel}
            </span>
          </div>
        )}

        {/* Encouraging Quote Card */}
        {quote && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
            border: '1px solid rgba(20, 184, 166, 0.2)',
            borderRadius: '12px',
            padding: '14px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}>
            <div style={{
              fontSize: '24px',
              color: '#14b8a6',
              fontFamily: 'Georgia, serif',
              position: 'absolute',
              top: '2px',
              left: '6px',
              opacity: 0.3,
              lineHeight: 1,
            }}>
              “
            </div>
            <div style={{
              fontSize: '11px',
              fontStyle: 'italic',
              color: '#e2e8f0',
              lineHeight: '1.4',
              paddingLeft: '12px',
              paddingRight: '6px',
            }}>
              {quote}
            </div>
            <div style={{
              alignSelf: 'flex-end',
              fontSize: '9px',
              fontWeight: 700,
              color: '#14b8a6',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              — ATTI PANDA
            </div>
          </div>
        )}

        {/* Legal Disclaimer */}
        {sceneDisclaimer && (
          <div style={{
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '10px',
            padding: '8px 12px',
            border: '1px solid rgba(148, 163, 184, 0.08)',
          }}>
            <div style={{
              fontSize: '8px',
              color: '#94a3b8',
              lineHeight: '1.3',
              textAlign: 'center',
            }}>
              {sceneDisclaimer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
