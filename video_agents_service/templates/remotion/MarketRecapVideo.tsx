import React from 'react';
import { Series, Audio, staticFile, useCurrentFrame } from 'remotion';

import { RecapIntroScene }    from './scenes/recap/RecapIntroScene';
import { IndexOverviewScene } from './scenes/recap/IndexOverviewScene';
import { DataStoryScene }     from './scenes/recap/DataStoryScene';
import { MoverCardScene }     from './scenes/recap/MoverCardScene';
import { SectorBarScene }     from './scenes/recap/SectorBarScene';
import { RecapOutroScene }    from './scenes/recap/RecapOutroScene';

export interface MarketRecapSceneProps {
  sceneNumber: number;
  sceneName: string;
  sceneType: string;
  durationSeconds: number;
  narration: string;
  textOverlay: string;
  subText?: string;
  decisionColor?: string;
  dataFields: Record<string, any>;
}

interface MarketRecapVideoProps {
  ticker: string;
  date: string;
  audioUrl: string;
  scenes: Array<any>;
  normalizedData: Record<string, any>;
}

/** Routes each scene by its sceneType to the correct Remotion component */
const renderRecapScene = (scene: any): React.ReactNode => {
  const props: MarketRecapSceneProps = {
    sceneNumber:     scene.sceneNumber || 0,
    sceneName:       scene.sceneName || '',
    sceneType:       scene.sceneType || 'market_catalyst',
    durationSeconds: scene.durationSeconds || 12,
    narration:       scene.narration || '',
    textOverlay:     scene.textOverlay || '',
    subText:         scene.subText || '',
    decisionColor:   scene.decisionColor || 'teal',
    dataFields:      scene.dataFields || {},
  };

  switch (scene.sceneType) {
    case 'recap_intro':
      return <RecapIntroScene {...props} />;
    case 'index_overview':
      return <IndexOverviewScene {...props} />;
    case 'top_mover':
    case 'top_loser':
      return <MoverCardScene {...props} />;
    case 'sector_rotation':
      return <SectorBarScene {...props} />;
    case 'recap_outro':
      return <RecapOutroScene {...props} />;
    // All narrative/text scenes use DataStoryScene
    case 'market_catalyst':
    case 'volume_momentum':
    case 'sentiment_pulse':
    case 'risk_snapshot':
    case 'tomorrow_outlook':
    default:
      return <DataStoryScene {...props} />;
  }
};

export const MarketRecapVideo: React.FC<MarketRecapVideoProps> = ({
  audioUrl,
  scenes,
}) => {
  return (
    <div style={{
      width: '100%', height: '100%',
      backgroundColor: '#090d16',
      color: '#f8fafc',
      fontFamily: '"Outfit", "Inter", system-ui, -apple-system, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Global audio */}
      {audioUrl && <Audio src={staticFile(audioUrl)} />}

      {/* Subtle scan-line texture */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.02) 4px, rgba(0,0,0,0.02) 5px)',
      }} />

      {/* Persistent bottom ticker bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        zIndex: 20, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent, #14b8a6 20%, #14b8a6 80%, transparent)',
        opacity: 0.4,
      }} />

      {/* Scene content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Series>
          {scenes.map((scene, index) => (
            <Series.Sequence
              key={index}
              durationInFrames={Math.round(scene.durationSeconds * 30)}
            >
              {renderRecapScene(scene)}
            </Series.Sequence>
          ))}
        </Series>
      </div>
    </div>
  );
};
