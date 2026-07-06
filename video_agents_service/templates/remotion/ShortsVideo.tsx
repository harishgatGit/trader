import React from 'react';
import { Series, Audio, staticFile, useCurrentFrame } from 'remotion';

// CRISP scene components
import { HookScene } from './scenes/crisp/HookScene';
import { CompanySnapshotScene } from './scenes/crisp/CompanySnapshotScene';
import { MarketActionScene } from './scenes/crisp/MarketActionScene';
import { TrendAnalysisScene } from './scenes/crisp/TrendAnalysisScene';
import { MomentumIndicatorsScene } from './scenes/crisp/MomentumIndicatorsScene';
import { SupportResistanceScene } from './scenes/crisp/SupportResistanceScene';
import { EntryZoneScene } from './scenes/crisp/EntryZoneScene';
import { RiskAnalysisScene } from './scenes/crisp/RiskAnalysisScene';
import { UpsidePotentialScene } from './scenes/crisp/UpsidePotentialScene';
import { AIInsightsScene } from './scenes/crisp/AIInsightsScene';
import { FinalRecommendationScene } from './scenes/crisp/FinalRecommendationScene';

export interface ShortsSceneProps {
  sceneNumber: number;
  sceneName: string;
  sceneType: string;
  durationSeconds: number;
  narration: string;
  textOverlay: string;
  subText?: string;
  decisionColor?: string;
  dataFields: Record<string, any>;
  ticker: string;
  companyName: string;
  reportDate: string;
}

interface ShortsVideoProps {
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

/** Maps sceneType string → the correct Remotion component */
const renderScene = (scene: any, ticker: string, companyName: string, reportDate: string): React.ReactNode => {
  const props: ShortsSceneProps = {
    sceneNumber:    scene.sceneNumber,
    sceneName:      scene.sceneName || '',
    sceneType:      scene.sceneType || 'generic',
    durationSeconds:scene.durationSeconds,
    narration:      scene.narration || '',
    textOverlay:    scene.textOverlay || '',
    subText:        scene.subText || '',
    decisionColor:  scene.decisionColor || 'yellow',
    dataFields:     scene.dataFields || {},
    ticker,
    companyName,
    reportDate,
  };

  switch (scene.sceneType) {
    case 'crisp_hook':            return <HookScene {...props} />;
    case 'company_snapshot':      return <CompanySnapshotScene {...props} />;
    case 'market_action':         return <MarketActionScene {...props} />;
    case 'trend_analysis':        return <TrendAnalysisScene {...props} />;
    case 'momentum_indicators':    return <MomentumIndicatorsScene {...props} />;
    case 'support_resistance':    return <SupportResistanceScene {...props} />;
    case 'entry_zone':            return <EntryZoneScene {...props} />;
    case 'risk_analysis':         return <RiskAnalysisScene {...props} />;
    case 'upside_potential':      return <UpsidePotentialScene {...props} />;
    case 'ai_insights':           return <AIInsightsScene {...props} />;
    case 'final_recommendation':  return <FinalRecommendationScene {...props} />;
    // Fallback
    default:                      return <HookScene {...props} />;
  }
};

export const ShortsVideo: React.FC<ShortsVideoProps> = ({
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

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Global audio track */}
      {audioUrl && (
        <Audio src={staticFile(audioUrl)} />
      )}

      {/* Persistent subtle scan-line texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
      }} />

      {/* Persistent Header logo banner */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 30,
        pointerEvents: 'none',
      }}>
        <img
          src={staticFile('mobile_header_logo_dark_390x96.png')}
          style={{ height: '32px', objectFit: 'contain', opacity: 0.9 }}
        />
      </div>

      {/* Scene content — full bleed, no header/footer chrome */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Series>
          {scenes.map((scene, index) => (
            <Series.Sequence
              key={index}
              durationInFrames={Math.round(scene.durationSeconds * 30)}
            >
              {renderScene(scene, ticker, companyName, reportDate)}
            </Series.Sequence>
          ))}
        </Series>
      </div>
    </div>
  );
};
