import React from 'react';
import { Series, Audio, staticFile, useCurrentFrame, interpolate } from 'remotion';
import { StockOverviewScene } from './scenes/StockOverviewScene';
import { PriceActionScene } from './scenes/PriceActionScene';
import { TrendReasonScene } from './scenes/TrendReasonScene';
import { EvidenceScene } from './scenes/EvidenceScene';
import { DailyTrendScene } from './scenes/DailyTrendScene';
import { TechnicalMetricsScene } from './scenes/TechnicalMetricsScene';
import { TacticalSetupScene } from './scenes/TacticalSetupScene';
import { ShortTradeScene } from './scenes/ShortTradeScene';
import { EcosystemInsightScene } from './scenes/EcosystemInsightScene';
import { FinalVerdictScene } from './scenes/FinalVerdictScene';

export interface SceneProps {
  sceneNumber: number;
  sceneName: string;
  durationSeconds: number;
  narration: string;
  pandaAction: string;
  speechBubbleText: string;
  visualElements: string[];
  chartElements: string[];
  animationInstructions: string[];
  dataFields: Record<string, any>;
  ticker: string;
  companyName: string;
  reportDate: string;
  textOverlay?: string;
  visualInstruction?: string;
}

interface MainVideoProps {
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

export const MainVideo: React.FC<MainVideoProps> = ({
  ticker,
  companyName,
  reportDate,
  currentPrice,
  dayChangePct,
  overallSignal,
  audioUrl,
  scenes,
  normalizedData
}) => {
  const frame = useCurrentFrame();

  // Intro splash banner layer (fades out over first 24 frames)
  const showSplash = frame < 24;
  const splashOpacity = interpolate(frame, [12, 22], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Find active scene index to drive the global Atti Panda guide
  let activeSceneIndex = 0;
  let frameAccumulator = 0;
  for (let i = 0; i < scenes.length; i++) {
    const sceneDurationFrames = Math.round(scenes[i].durationSeconds * 30);
    if (frame >= frameAccumulator && frame < frameAccumulator + sceneDurationFrames) {
      activeSceneIndex = i;
      break;
    }
    frameAccumulator += sceneDurationFrames;
  }
  const currentActiveScene = scenes[activeSceneIndex] || scenes[scenes.length - 1] || {};

  const renderSceneComponent = (scene: any) => {
    const props: SceneProps = {
      sceneNumber: scene.sceneNumber,
      sceneName: scene.sceneName || scene.sceneTitle || '',
      durationSeconds: scene.durationSeconds,
      narration: scene.narration || scene.voiceover || '',
      pandaAction: scene.pandaAction || 'default',
      speechBubbleText: scene.speechBubbleText || '',
      visualElements: scene.visualElements || [],
      chartElements: scene.chartElements || [],
      animationInstructions: scene.animationInstructions || [],
      dataFields: scene.dataFields || {},
      ticker,
      companyName,
      reportDate
    };

    switch (scene.sceneNumber) {
      case 1:
        return <StockOverviewScene {...props} overallSignal={overallSignal} confidenceScore={normalizedData?.confidenceScore || 85} />;
      case 2:
        return <PriceActionScene {...props} currentPrice={currentPrice} dayChangePct={dayChangePct} overallSignal={overallSignal} />;
      case 3:
        return <TrendReasonScene {...props} whyMoved={normalizedData?.whyStockMoved || 'N/A'} trend={normalizedData?.trendSummary || 'N/A'} />;
      case 4:
        return <EvidenceScene {...props} catalysts={normalizedData?.catalystSummary || 'N/A'} />;
      case 5:
        return <DailyTrendScene {...props} entryZone={normalizedData?.entryZone || 'N/A'} stopLoss={normalizedData?.stopLoss || 'N/A'} />;
      case 6:
        return <TechnicalMetricsScene {...props} technicals={normalizedData?.technicals || {}} />;
      case 7:
        return <TacticalSetupScene {...props} entryZone={normalizedData?.entryZone || 'N/A'} stopLoss={normalizedData?.stopLoss || 'N/A'} targets={normalizedData?.targets || []} />;
      case 8:
        return <ShortTradeScene {...props} shortView={normalizedData?.shortTradeView || 'N/A'} />;
      case 9:
        return <EcosystemInsightScene {...props} ticker={ticker} />;
      case 10:
        return <FinalVerdictScene {...props} overallSignal={overallSignal} finalVerdict={normalizedData?.finalVerdict || 'N/A'} riskWarning={normalizedData?.riskWarning || 'N/A'} keyLevel={normalizedData?.keyLevel || 'N/A'} />;
      default:
        return <StockOverviewScene {...props} overallSignal={overallSignal} confidenceScore={85} />;
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#090d16',
      backgroundImage: 'radial-gradient(circle at 50% 30%, #111b2d 0%, #06090f 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px 30px'
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
            <div style={{
              fontSize: '18px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '1px',
              marginTop: '10px',
              backgroundImage: 'linear-gradient(to right, #ffffff, #14b8a6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: '1.4',
            }}>
              Visit us www.investingatti.com to do your own analysis of the stock you wish
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

      {/* Audio Track */}
      {audioUrl && <Audio src={staticFile(audioUrl)} />}

      {/* Header (Branding) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
        paddingBottom: '15px',
        marginBottom: '20px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={staticFile('mobile_header_logo_dark_390x96.png')} 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            color: '#14b8a6',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            marginLeft: '4px'
          }}>WALKTHROUGH</span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>
          {ticker}{reportDate && reportDate.toLowerCase() !== 'unavailable' && reportDate.toLowerCase() !== 'undefined' ? ` // ${reportDate}` : ''}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        <Series>
          {scenes.map((scene, index) => (
            <Series.Sequence 
              key={index} 
              durationInFrames={Math.round(scene.durationSeconds * 30)}
            >
              {renderSceneComponent(scene)}
            </Series.Sequence>
          ))}
        </Series>
      </div>

      {/* Global Atti Panda mascot guide layer removed */}

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        borderTop: '1px solid rgba(51, 65, 85, 0.4)',
        paddingTop: '15px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        zIndex: 10
      }}>
        <img 
          src={staticFile('website_banner_dark_1440x360.png')} 
          style={{ width: '100%', maxHeight: '60px', objectFit: 'contain', borderRadius: '6px', marginBottom: '8px' }} 
        />
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#14b8a6', letterSpacing: '0.5px' }}>
          WWW.INVESTINGATTI.COM
        </div>
        <div style={{ fontSize: '8px', color: '#475569', textAlign: 'center', lineHeight: '1.4' }}>
          Disclaimer: Educational insights only. Not financial advice. Past performance is not indicative of future results.
        </div>
      </div>
    </div>
  );
};
