import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from './MainVideo';
import { StudioMainVideo } from './StudioMainVideo';

// Default scenes for Studio preview
// Default scenes for Studio preview
const DEFAULT_SCENES = [
  {
    sceneNumber: 1,
    sceneName: 'Stock Overview',
    durationSeconds: 6,
    narration: 'Today we are looking at Tesla, Inc., ticker TSLA. The setup is bullish with high confidence.',
    pandaAction: 'walk',
    speechBubbleText: "Let's look at TSLA!",
    visualElements: ['InvestingAtti logo', 'ticker card', 'confidence meter'],
    chartElements: [],
    animationInstructions: ['panda slide in', 'logo fade in', 'confidence meter count-up'],
    dataFields: {},
  },
  {
    sceneNumber: 2,
    sceneName: 'Price Action',
    durationSeconds: 6,
    narration: 'Currently trading around $225.50, up 1.5% in today\'s trading session.',
    pandaAction: 'point',
    speechBubbleText: 'Trading around $225.50 right now.',
    visualElements: ['Price card', 'Day change badge'],
    chartElements: ['Mini price trendline'],
    animationInstructions: ['price count-up', 'day change color pulse'],
    dataFields: {},
  },
  {
    sceneNumber: 3,
    sceneName: 'Trend Reason',
    durationSeconds: 6,
    narration: 'The main catalyst driving this trend is recent strong earnings results.',
    pandaAction: 'magnifying',
    speechBubbleText: 'Checking the trend catalyst.',
    visualElements: ['Trend arrow', 'Reason badge'],
    chartElements: [],
    animationInstructions: ['arrow drawing', 'catalyst fade-in'],
    dataFields: {},
  },
  {
    sceneNumber: 4,
    sceneName: 'Evidence',
    durationSeconds: 6,
    narration: 'Our report checks volume, news, and index movements, showing confirmed evidence.',
    pandaAction: 'point',
    speechBubbleText: 'Analyzing news and volume data.',
    visualElements: ['News card', 'Evidence cards list'],
    chartElements: [],
    animationInstructions: ['evidence stamp reveal'],
    dataFields: {},
  },
  {
    sceneNumber: 5,
    sceneName: 'Daily Trend',
    durationSeconds: 6,
    narration: 'On the daily chart, support and resistance boundaries are clearly established.',
    pandaAction: 'drawing',
    speechBubbleText: 'Here are the support and resistance lines.',
    visualElements: ['Daily chart card'],
    chartElements: ['Daily candlestick chart'],
    animationInstructions: ['candlestick path draw', 'levels overlay draw'],
    dataFields: {},
  },
  {
    sceneNumber: 6,
    sceneName: 'Technical Metrics',
    durationSeconds: 6,
    narration: 'Technical indicators like RSI and MACD support the bullish momentum.',
    pandaAction: 'point',
    speechBubbleText: 'Technical metrics showing momentum.',
    visualElements: ['RSI meter', 'MACD indicator'],
    chartElements: [],
    animationInstructions: ['metrics flip in', 'RSI indicator fill'],
    dataFields: {},
  },
  {
    sceneNumber: 7,
    sceneName: 'Tactical Setup',
    durationSeconds: 7,
    narration: 'For swing traders, entry is near $220 with a stop loss below $215.',
    pandaAction: 'point',
    speechBubbleText: 'Swing trade entry and stop loss.',
    visualElements: ['Trade levels dashboard'],
    chartElements: ['Entry/Stop/Target overlay'],
    animationInstructions: ['zones highlights slide-in', 'targets flag placement'],
    dataFields: {},
  },
  {
    sceneNumber: 8,
    sceneName: 'Short Trade',
    durationSeconds: 6,
    narration: 'Short sellers face caution due to elevated short interest and squeeze risk.',
    pandaAction: 'caution',
    speechBubbleText: 'Be careful with short trades here!',
    visualElements: ['Short warning card', 'Squeeze risk meter'],
    chartElements: [],
    animationInstructions: ['squeeze risk warning pulse'],
    dataFields: {},
  },
  {
    sceneName: 'Ecosystem Insight',
    sceneNumber: 9,
    durationSeconds: 6,
    narration: 'The broader sector and index movements are supportive of this setup.',
    pandaAction: 'magnifying',
    speechBubbleText: 'Broad market and sector view.',
    visualElements: ['Ecosystem map'],
    chartElements: [],
    animationInstructions: ['map zoom out', 'peer group connections pulse'],
    dataFields: {},
  },
  {
    sceneNumber: 10,
    sceneName: 'Final Verdict',
    durationSeconds: 7,
    narration: 'Our final signal is BULLISH. Monitor levels closely and manage risk.',
    pandaAction: 'celebrate',
    speechBubbleText: 'Final rating: BULLISH!',
    visualElements: ['Final verdict badge', 'Disclaimer footer'],
    chartElements: [],
    animationInstructions: ['badge pop in', 'checklist tick reveal'],
    dataFields: {},
  },
];

const DEFAULT_PROPS = {
  ticker: 'TSLA',
  companyName: 'Tesla, Inc.',
  reportDate: '2026-06-05',
  currentPrice: 225.50,
  dayChangePct: 1.5,
  overallSignal: 'BULLISH',
  audioUrl: 'narration-audio.mp3',
  scenes: DEFAULT_SCENES,
  normalizedData: {
    confidenceScore: 92,
    whyStockMoved: 'Recent strong earnings results',
    catalystSummary: 'Analyst upgrades and institutional volume support',
    entryZone: '$218 - $222',
    stopLoss: '$214.50',
    targets: [235, 245],
    shortTradeView: 'High squeeze risk due to elevated short interest',
    finalVerdict: 'Monitor support levels and enter on minor pullbacks',
    riskWarning: 'Market volatility and earnings sector drag',
    keyLevel: '$220 Support',
  },
};

const FPS = 30;
const MAX_FRAMES = 5400; // 180 seconds safety cap

const makeCalculateMetadata = (defaultScenes: Array<{ durationSeconds: number }>) =>
  ({ props }: { props: any }) => {
    const scenes: Array<{ durationSeconds: number }> = (props?.scenes && props.scenes.length > 0) ? props.scenes : defaultScenes;
    const totalSeconds = scenes.reduce(
      (acc, scene) => acc + (Number(scene.durationSeconds) || 10),
      0,
    );
    const calculatedFrames = Math.round(totalSeconds * FPS);
    const totalFrames = (calculatedFrames && calculatedFrames > 0) ? Math.min(calculatedFrames, MAX_FRAMES) : 1800;
    return { durationInFrames: totalFrames, fps: FPS, width: 720, height: 1280, props };
  };

export const VideoReport: React.FC = () => {
  return (
    <>
      {/* ── Original panda-guide walkthrough ── */}
      <Composition
        id="StockReportVideo"
        component={MainVideo}
        durationInFrames={MAX_FRAMES}
        fps={FPS}
        width={720}
        height={1280}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={makeCalculateMetadata(DEFAULT_SCENES)}
      />

      {/* ── New studio avatar presenter walkthrough ── */}
      <Composition
        id="StockReportStudio"
        component={StudioMainVideo}
        durationInFrames={MAX_FRAMES}
        fps={FPS}
        width={720}
        height={1280}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={makeCalculateMetadata(DEFAULT_SCENES)}
      />
    </>
  );
};
