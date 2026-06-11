import React from 'react';
import {
  Series,
  Audio,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
} from 'remotion';

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface StudioSceneProps {
  sceneNumber: number;
  sceneName: string;
  durationSeconds: number;
  narration: string;
  speechBubbleText: string;
  ticker: string;
  companyName: string;
  reportDate: string;
}

interface StudioMainVideoProps {
  ticker: string;
  companyName: string;
  reportDate: string;
  currentPrice: number;
  dayChangePct: number;
  overallSignal: string;
  audioUrl: string;
  scenes: Array<any>;
  normalizedData: Record<string, any>;
}

// ─── Utility: fade-in spring ──────────────────────────────────────────────────
const FadeIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 80 } });
  const y = interpolate(frame - delay, [0, 15], [24, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ opacity, transform: `translateY(${y}px)` }}>
      {children}
    </div>
  );
};

// ─── Signal colour helper ─────────────────────────────────────────────────────
const signalColor = (signal: string) => {
  const s = signal?.toUpperCase() || '';
  if (s.includes('BUY') || s.includes('BULL')) return '#22c55e';
  if (s.includes('SELL') || s.includes('AVOID') || s.includes('BEAR')) return '#ef4444';
  if (s.includes('WAIT') || s.includes('WATCH')) return '#f59e0b';
  return '#64748b';
};

// ─── Scene Overlay Components ─────────────────────────────────────────────────

// Scene 1: Stock Overview — big ticker card slides up over avatar
const StudioScene1: React.FC<{ scene: any; ticker: string; overallSignal: string; currentPrice: number; normalizedData: any }> = ({
  scene, ticker, overallSignal, currentPrice, normalizedData,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideUp = spring({ frame, fps, config: { damping: 18, stiffness: 70 } });
  const y = interpolate(slideUp, [0, 1], [60, 0]);
  const color = signalColor(overallSignal);
  const catchyLine = scene?.dataFields?.catchyLine || scene?.dataFields?.CatchyLine || `${ticker} Stock Analysis`;
  return (
    <div style={{ opacity: Math.min(frame / 8, 1), transform: `translateY(${y}px)` }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(9,13,22,0.92) 0%, rgba(17,27,45,0.92) 100%)',
        border: `2px solid ${color}`,
        borderRadius: 20,
        padding: '28px 36px',
        backdropFilter: 'blur(12px)',
        textAlign: 'center',
        boxShadow: `0 0 40px ${color}33`,
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#14b8a6',
          marginBottom: 14,
          lineHeight: 1.35,
          textShadow: '0 2px 8px rgba(20, 184, 166, 0.3)',
        }}>{catchyLine}</div>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#f8fafc', letterSpacing: 2, lineHeight: 1 }}>{ticker}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{normalizedData?.companyName || ticker}</div>
        <div style={{
          display: 'inline-block',
          marginTop: 18,
          padding: '8px 28px',
          background: `${color}22`,
          border: `1.5px solid ${color}`,
          borderRadius: 40,
          fontSize: 18,
          fontWeight: 700,
          color,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}>{overallSignal}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', marginTop: 16 }}>${currentPrice.toFixed(2)}</div>
      </div>
    </div>
  );
};

// Scene 2: Price Action
const StudioScene2: React.FC<{ scene: any; currentPrice: number; dayChangePct: number }> = ({
  scene, currentPrice, dayChangePct,
}) => {
  const frame = useCurrentFrame();
  const isDown = dayChangePct < 0;
  const color = isDown ? '#ef4444' : '#22c55e';
  const pct = Math.abs(dayChangePct).toFixed(2);
  return (
    <div style={{ opacity: Math.min(frame / 8, 1) }}>
      <FadeIn>
        <div style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(9,13,22,0.92)',
            border: '1.5px solid rgba(51,65,85,0.6)',
            borderRadius: 16,
            padding: '20px 30px',
            textAlign: 'center',
            minWidth: 160,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Current Price</div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#f8fafc' }}>${currentPrice.toFixed(2)}</div>
          </div>
          <div style={{
            background: 'rgba(9,13,22,0.92)',
            border: `1.5px solid ${color}55`,
            borderRadius: 16,
            padding: '20px 30px',
            textAlign: 'center',
            minWidth: 160,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Day Change</div>
            <div style={{ fontSize: 42, fontWeight: 900, color }}>{isDown ? '▼' : '▲'} {pct}%</div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

// Generic data overlay card
const StudioGenericScene: React.FC<{ scene: any; label: string; content: string; accent?: string }> = ({
  scene, label, content, accent = '#14b8a6',
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ opacity: Math.min(frame / 8, 1) }}>
      <FadeIn>
        <div style={{
          background: 'rgba(9,13,22,0.90)',
          border: `1.5px solid ${accent}55`,
          borderRadius: 18,
          padding: '22px 30px',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
          maxWidth: 580,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 10,
            borderBottom: `1px solid ${accent}33`,
            paddingBottom: 8,
          }}>{label}</div>
          <div style={{
            fontSize: 16,
            color: '#cbd5e1',
            lineHeight: 1.6,
            fontWeight: 400,
          }}>{content}</div>
        </div>
      </FadeIn>
    </div>
  );
};

// Scene 7: Trade Setup — entry/stop/targets
const StudioScene7: React.FC<{ scene: any; normalizedData: any }> = ({ scene, normalizedData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const targets = normalizedData?.targets || [];
  return (
    <div style={{ opacity: Math.min(frame / 8, 1) }}>
      <FadeIn>
        <div style={{
          background: 'rgba(9,13,22,0.92)',
          border: '1.5px solid rgba(59,130,246,0.4)',
          borderRadius: 18,
          padding: '20px 28px',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>TACTICAL SETUP</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {[
              { label: 'ENTRY ZONE', value: normalizedData?.entryZone || 'N/A', color: '#22c55e' },
              { label: 'STOP LOSS', value: normalizedData?.stopLoss || 'N/A', color: '#ef4444' },
              { label: 'TARGET 1', value: targets[0] ? `$${targets[0]}` : 'N/A', color: '#f59e0b' },
              { label: 'TARGET 2', value: targets[1] ? `$${targets[1]}` : 'N/A', color: '#f59e0b' },
            ].map((item) => (
              <div key={item.label} style={{
                background: `${item.color}11`,
                border: `1px solid ${item.color}44`,
                borderRadius: 12,
                padding: '12px 18px',
                flex: 1,
                minWidth: 120,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 9, color: item.color, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
};

// Scene 10: Final Verdict
const StudioScene10: React.FC<{ scene: any; overallSignal: string; normalizedData: any }> = ({ scene, overallSignal, normalizedData }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = signalColor(overallSignal);
  const scale = spring({ frame, fps, config: { damping: 15, stiffness: 60 } });
  return (
    <div style={{ opacity: Math.min(frame / 6, 1), transform: `scale(${interpolate(scale, [0, 1], [0.9, 1])})` }}>
      <div style={{
        background: 'rgba(9,13,22,0.95)',
        border: `2px solid ${color}`,
        borderRadius: 20,
        padding: '28px 36px',
        textAlign: 'center',
        backdropFilter: 'blur(14px)',
        boxShadow: `0 0 60px ${color}22`,
      }}>
        <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>FINAL VERDICT</div>
        <div style={{
          fontSize: 48,
          fontWeight: 900,
          color,
          textTransform: 'uppercase',
          letterSpacing: 3,
          marginBottom: 16,
        }}>{overallSignal}</div>
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, maxWidth: 480 }}>
          {normalizedData?.finalVerdict || 'Analysis complete. Manage your risk carefully.'}
        </div>
        <div style={{ marginTop: 18, fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
          ⚠️ This is for educational purposes only — not financial advice.
        </div>
      </div>
    </div>
  );
};

// ─── Speech Bubble (bottom-right corner) ─────────────────────────────────────
const SpeechBubble: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  if (!text) return null;
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      opacity,
      position: 'absolute',
      bottom: 220,
      right: 30,
      maxWidth: 200,
      background: 'rgba(20,184,166,0.95)',
      color: '#fff',
      borderRadius: '18px 18px 4px 18px',
      padding: '10px 14px',
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.4,
      boxShadow: '0 4px 20px rgba(20,184,166,0.4)',
      zIndex: 30,
    }}>
      {text}
      <div style={{
        position: 'absolute',
        bottom: -10,
        right: 16,
        width: 0,
        height: 0,
        borderLeft: '10px solid transparent',
        borderRight: '0px solid transparent',
        borderTop: '10px solid rgba(20,184,166,0.95)',
      }} />
    </div>
  );
};

// ─── Scene number progress bar ────────────────────────────────────────────────
const SceneProgress: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    background: 'rgba(51,65,85,0.3)',
    zIndex: 40,
  }}>
    <div style={{
      height: '100%',
      width: `${(current / total) * 100}%`,
      background: 'linear-gradient(to right, #14b8a6, #3b82f6)',
      borderRadius: 2,
      transition: 'width 0.3s ease',
    }} />
  </div>
);

// ─── Main Studio Video ────────────────────────────────────────────────────────
export const StudioMainVideo: React.FC<StudioMainVideoProps> = ({
  ticker,
  companyName,
  reportDate,
  currentPrice,
  dayChangePct,
  overallSignal,
  audioUrl,
  scenes,
  normalizedData,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Intro splash banner layer (fades out over first 24 frames)
  const showSplash = frame < 24;
  const splashOpacity = interpolate(frame, [12, 22], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Determine active scene
  let activeSceneIndex = 0;
  let frameAcc = 0;
  for (let i = 0; i < scenes.length; i++) {
    const d = Math.round(scenes[i].durationSeconds * fps);
    if (frame >= frameAcc && frame < frameAcc + d) { activeSceneIndex = i; break; }
    frameAcc += d;
  }
  const activeScene = scenes[activeSceneIndex] || scenes[scenes.length - 1] || {};

  const renderOverlay = (scene: any, idx: number) => {
    const baseProps = { scene, ticker, companyName, reportDate };
    switch (scene.sceneNumber) {
      case 1:  return <StudioScene1 {...baseProps} overallSignal={overallSignal} currentPrice={currentPrice} normalizedData={normalizedData} />;
      case 2:  return <StudioScene2 {...baseProps} currentPrice={currentPrice} dayChangePct={dayChangePct} />;
      case 3:  return <StudioGenericScene scene={scene} label="Trend Analysis" content={String(normalizedData?.trendSummary || scene.narration).slice(0, 180) + '…'} accent="#8b5cf6" />;
      case 4:  return <StudioGenericScene scene={scene} label="Evidence & Catalysts" content={String(normalizedData?.catalystSummary || scene.narration)} accent="#06b6d4" />;
      case 5:  return <StudioGenericScene scene={scene} label="Daily Trend" content={scene.narration} accent="#f59e0b" />;
      case 6:  return <StudioGenericScene scene={scene} label="Technical Metrics" content={`Volume: ${normalizedData?.volumeSummary || 'N/A'}`} accent="#3b82f6" />;
      case 7:  return <StudioScene7 scene={scene} normalizedData={normalizedData} />;
      case 8:  return <StudioGenericScene scene={scene} label="Short Trade View" content={normalizedData?.shortTradeView || scene.narration} accent="#ef4444" />;
      case 9:  return <StudioGenericScene scene={scene} label="Sector & Ecosystem" content={scene.narration} accent="#10b981" />;
      case 10: return <StudioScene10 scene={scene} overallSignal={overallSignal} normalizedData={normalizedData} />;
      default: return <StudioGenericScene scene={scene} label={scene.sceneName || 'Analysis'} content={scene.narration} />;
    }
  };

  // Subtle avatar breath/bob animation
  const breath = Math.sin(frame / 50) * 2;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      backgroundColor: '#090d16',
    }}>
      {/* Intro splash banner layer */}
      {showSplash && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#090d16',
          backgroundImage: 'radial-gradient(circle at 50% 30%, #111b2d 0%, #06090f 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          opacity: splashOpacity,
          padding: '40px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '30px',
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <img 
              src={staticFile('mobile_header_logo_dark_390x96.png')} 
              style={{ width: '80%', maxHeight: '80px', objectFit: 'contain' }} 
            />
            <div style={{
              height: '2px',
              width: '60px',
              backgroundColor: '#14b8a6',
              borderRadius: '2px',
            }} />
            <img 
              src={staticFile('website_banner_dark_1440x360.png')} 
              style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', border: '1px solid rgba(20, 184, 166, 0.2)' }} 
            />
            <div style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginTop: '10px',
              backgroundImage: 'linear-gradient(to right, #ffffff, #14b8a6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              STOCK ANALYSIS WALKTHROUGH
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 600,
              letterSpacing: '1px',
            }}>
              {ticker}{reportDate && reportDate.toLowerCase() !== 'unavailable' && reportDate.toLowerCase() !== 'undefined' ? ` • ${reportDate}` : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── Full-bleed avatar background ── */}
      <img
        src={staticFile('investingatti-avatar.png')}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
          transform: `translateY(${breath}px)`,
          zIndex: 0,
        }}
      />

      {/* Dark gradient overlay — heavier at top & bottom for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(9,13,22,0.55) 0%, rgba(9,13,22,0.10) 35%, rgba(9,13,22,0.10) 65%, rgba(9,13,22,0.75) 100%)',
        zIndex: 1,
      }} />

      {/* ── Audio track ── */}
      {audioUrl && <Audio src={staticFile(audioUrl)} />}

      {/* ── Top bar: Branding ── */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '18px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(9,13,22,0.80) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img 
            src={staticFile('mobile_header_logo_dark_390x96.png')} 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            background: 'rgba(20,184,166,0.15)',
            color: '#14b8a6',
            border: '1px solid rgba(20,184,166,0.3)',
            padding: '2px 8px',
            borderRadius: 4,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>WALKTHROUGH</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace' }}>
          {ticker}{reportDate && reportDate.toLowerCase() !== 'unavailable' && reportDate.toLowerCase() !== 'undefined' ? ` · ${reportDate}` : ''}
        </span>
      </div>

      {/* ── Scene name badge ── */}
      <div style={{
        position: 'absolute',
        top: 68,
        left: 28,
        zIndex: 20,
      }}>
        <FadeIn>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#94a3b8',
            letterSpacing: 2,
            textTransform: 'uppercase',
            background: 'rgba(9,13,22,0.70)',
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid rgba(51,65,85,0.5)',
          }}>
            {activeScene.sceneNumber}/{scenes.length} · {activeScene.sceneName}
          </div>
        </FadeIn>
      </div>

      {/* ── Data overlay (centred, lower third style) ── */}
      <div style={{
        position: 'absolute',
        bottom: 110,
        left: 28,
        right: 28,
        zIndex: 20,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Series>
          {scenes.map((scene, idx) => (
            <Series.Sequence
              key={idx}
              durationInFrames={Math.round(scene.durationSeconds * fps)}
            >
              {renderOverlay(scene, idx)}
            </Series.Sequence>
          ))}
        </Series>
      </div>

      {/* ── Speech bubble ── */}
      <SpeechBubble text={activeScene.speechBubbleText || ''} />

      {/* ── Footer ── */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(9,13,22,0.90) 0%, transparent 100%)',
        padding: '14px 28px 18px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 20,
      }}>
        <img 
          src={staticFile('website_banner_dark_1440x360.png')} 
          style={{ width: '100%', maxHeight: '60px', objectFit: 'contain', borderRadius: '4px', marginBottom: '4px' }} 
        />
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#14b8a6', letterSpacing: 1 }}>
            WWW.INVESTINGATTI.COM
          </div>
          <div style={{ fontSize: 9, color: '#475569', textAlign: 'right', maxWidth: 320 }}>
            Educational insights only · Not financial advice
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <SceneProgress current={activeSceneIndex + 1} total={scenes.length} />

    </div>
  );
};
