import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';
import { ShortsSceneProps } from '../../ShortsVideo';

/** Scene 12 — CTA Screen
 * Energetic end card: Like · Subscribe · Follow + InvestingAtti.com
 * Each element fires in sequentially with bouncy springs.
 */
export const CTAScene: React.FC<ShortsSceneProps> = ({ dataFields }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, from: 0, to: 1, config: { damping: 10, stiffness: 120 } });
  const line1Y    = spring({ frame, fps, from: 50, to: 0,  config: { damping: 14 }, delay: 8 });
  const line2Y    = spring({ frame, fps, from: 50, to: 0,  config: { damping: 14 }, delay: 16 });
  const urlScale  = spring({ frame, fps, from: 0.7, to: 1, config: { damping: 12 }, delay: 22 });
  const urlOpacity= interpolate(frame, [22, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const disclaimerOpacity = interpolate(frame, [28, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const glowPulse = 1 + Math.sin(frame / 18) * 0.03;

  const ctaLine1 = dataFields?.ctaLine1 || '👍 Like  •  🔔 Subscribe  •  📲 Follow';
  const ctaLine2 = dataFields?.ctaLine2 || 'Daily AI Stock Analysis';
  const websiteUrl = dataFields?.websiteUrl || 'www.investingatti.com';
  const websitePrompt = dataFields?.websitePrompt || 'Full report & analysis at';
  const disclaimer = dataFields?.disclaimer || 'Not financial advice. Educational insights only.';

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: 'radial-gradient(ellipse at 50% 40%, #14b8a618 0%, #090d16 65%)',
    }}>
      {/* Logo */}
      <div style={{ transform: `scale(${logoScale * glowPulse})` }}>
        <img
          src={staticFile('mobile_header_logo_dark_390x96.png')}
          style={{ height: 38, objectFit: 'contain' }}
        />
      </div>

      {/* CTA buttons row */}
      <div style={{
        transform: `translateY(${line1Y}px)`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #14b8a6, #3b82f6)',
          borderRadius: 16, padding: '16px 32px',
          fontSize: 18, fontWeight: 800, color: '#ffffff',
          textAlign: 'center', letterSpacing: 0.5,
          boxShadow: '0 8px 32px rgba(20,184,166,0.4)',
          width: '92%',
        }}>
          {ctaLine1}
        </div>
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#94a3b8', textAlign: 'center',
          letterSpacing: 0.5,
        }}>
          {ctaLine2}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, width: '60%', backgroundColor: 'rgba(148,163,184,0.15)' }} />

      {/* Website CTA */}
      <div style={{
        transform: `scale(${urlScale * glowPulse})`, opacity: urlOpacity,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          {websitePrompt}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 900, color: '#14b8a6', letterSpacing: 0.5,
          textShadow: '0 0 20px rgba(20,184,166,0.6)',
        }}>
          {websiteUrl}
        </div>
        <div style={{
          backgroundColor: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.3)',
          borderRadius: 8, padding: '4px 14px', fontSize: 11, color: '#14b8a6', fontWeight: 700,
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          Free AI Stock Research
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        opacity: disclaimerOpacity,
        fontSize: 9, color: '#374151', textAlign: 'center',
        maxWidth: '85%', lineHeight: 1.4,
      }}>
        {disclaimer}
      </div>
    </div>
  );
};
