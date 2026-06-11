import React from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface AttiPandaProps {
  action: 'walk' | 'point' | 'magnifying' | 'caution' | 'drawing' | 'celebrate' | 'default';
  speechBubbleText?: string;
}

export const AttiPanda: React.FC<AttiPandaProps> = ({ action, speechBubbleText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance slide-in spring
  const entrance = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 15, stiffness: 90 },
  });

  // Floating idle animation
  const floatY = Math.sin(frame / 15) * 5;
  const bodyShake = Math.sin(frame / 10) * 1;

  // Hand/Arm rotation based on action
  let leftArmRotate = '20deg';
  let rightArmRotate = '-20deg';
  let accessory: React.ReactNode = null;

  if (action === 'point') {
    rightArmRotate = '-80deg'; // Pointing arm raised
  } else if (action === 'celebrate') {
    leftArmRotate = '140deg'; // Both arms raised in celebration
    rightArmRotate = '-140deg';
  } else if (action === 'caution') {
    rightArmRotate = '-50deg';
    // Render yellow caution triangle with exclamation point
    accessory = (
      <g transform="translate(130, 90) scale(0.8)">
        <polygon
          points="30,0 60,50 0,50"
          fill="#eab308"
          stroke="#000"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <text
          x="30"
          y="42"
          fill="#000000"
          fontWeight="900"
          fontSize="24"
          textAnchor="middle"
          fontFamily="monospace"
        >
          !
        </text>
      </g>
    );
  } else if (action === 'magnifying') {
    rightArmRotate = '-60deg';
    // Render a magnifying glass
    accessory = (
      <g transform="translate(120, 100)">
        <line x1="0" y1="0" x2="-20" y2="-20" stroke="#64748b" strokeWidth="6" strokeLinecap="round" />
        <circle cx="10" cy="10" r="14" fill="rgba(56, 189, 248, 0.4)" stroke="#e2e8f0" strokeWidth="4" />
      </g>
    );
  } else if (action === 'drawing') {
    rightArmRotate = '-70deg';
    // Render a blue marker/pen pointing up/right
    accessory = (
      <g transform="translate(125, 95) rotate(45)">
        <rect x="-4" y="-15" width="8" height="30" rx="2" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
        <polygon points="-4,-15 0,-22 4,-15" fill="#1e293b" />
      </g>
    );
  }

  // Eye scaling (blinking every ~100 frames)
  const isBlinking = frame % 120 > 115;
  const eyeScaleY = isBlinking ? 0.1 : 1;

  // Speech bubble pop-in spring
  const bubbleScale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    config: { damping: 12, stiffness: 120 },
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '20px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        pointerEvents: 'none',
        transform: `translateY(${(1 - entrance) * 300 + floatY}px) scale(${entrance})`,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* SVG Panda Mascot */}
      <svg
        width="160"
        height="180"
        viewBox="0 0 200 220"
        style={{
          filter: 'drop-shadow(0 15px 15px rgba(0, 0, 0, 0.5))',
        }}
      >
        {/* Feet */}
        <ellipse cx="60" cy="205" rx="20" ry="12" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />
        <ellipse cx="140" cy="205" rx="20" ry="12" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />

        {/* Body / Torso */}
        <ellipse
          cx="100"
          cy="150"
          rx="55"
          ry="50"
          fill="#ffffff"
          stroke="#1f2937"
          strokeWidth="4"
          transform={`rotate(${bodyShake} 100 150)`}
        />
        {/* Black belly patch */}
        <path d="M 55 135 A 48 48 0 0 0 145 135 Z" fill="#0c111d" />

        {/* Left Arm */}
        <g
          style={{
            transform: `rotate(${leftArmRotate})`,
            transformOrigin: '55px 125px',
            transition: 'transform 0.3s ease-out',
          }}
        >
          <rect x="25" y="110" width="30" height="50" rx="15" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />
        </g>

        {/* Right Arm */}
        <g
          style={{
            transform: `rotate(${rightArmRotate})`,
            transformOrigin: '145px 125px',
            transition: 'transform 0.3s ease-out',
          }}
        >
          <rect x="145" y="110" width="30" height="50" rx="15" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />
          {/* Accessory attached to right hand */}
          {accessory}
        </g>

        {/* Head */}
        <g transform={`translate(0, ${bodyShake * 0.5})`}>
          {/* Ears */}
          <circle cx="50" cy="45" r="22" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />
          <circle cx="150" cy="45" r="22" fill="#0c111d" stroke="#1f2937" strokeWidth="2" />
          <circle cx="50" cy="45" r="12" fill="#1f2937" />
          <circle cx="150" cy="45" r="12" fill="#1f2937" />

          {/* Main Head Circle */}
          <circle cx="100" cy="85" r="55" fill="#ffffff" stroke="#1f2937" strokeWidth="4" />

          {/* Eye Patches */}
          <ellipse
            cx="75"
            cy="82"
            rx="16"
            ry="20"
            fill="#0c111d"
            transform="rotate(-15 75 82)"
          />
          <ellipse
            cx="125"
            cy="82"
            rx="16"
            ry="20"
            fill="#0c111d"
            transform="rotate(15 125 82)"
          />

          {/* Eyes (Pupils) */}
          <circle
            cx="77"
            cy="80"
            r="6"
            fill="#ffffff"
            style={{
              transform: `scaleY(${eyeScaleY})`,
              transformOrigin: '77px 80px',
            }}
          />
          <circle
            cx="123"
            cy="80"
            r="6"
            fill="#ffffff"
            style={{
              transform: `scaleY(${eyeScaleY})`,
              transformOrigin: '123px 80px',
            }}
          />
          {/* Eye Highlights */}
          <circle cx="79" cy="78" r="2" fill="#000000" />
          <circle cx="121" cy="78" r="2" fill="#000000" />

          {/* Cheeks (Cute Blush) */}
          <circle cx="54" cy="98" r="6" fill="rgba(244, 63, 94, 0.4)" />
          <circle cx="146" cy="98" r="6" fill="rgba(244, 63, 94, 0.4)" />

          {/* Nose */}
          <polygon points="95,95 105,95 100,101" fill="#0c111d" />

          {/* Smile / Mouth */}
          <path
            d="M 94 104 Q 97 109 100 106 Q 103 109 106 104"
            fill="none"
            stroke="#0c111d"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Speech Bubble */}
      {speechBubbleText && (
        <div
          style={{
            marginLeft: '-10px',
            marginBottom: '110px',
            backgroundColor: '#1e293b',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '16px',
            padding: '12px 18px',
            color: '#f8fafc',
            fontSize: '15px',
            fontWeight: 700,
            maxWidth: '220px',
            lineHeight: '1.3',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6)',
            transform: `scale(${bubbleScale})`,
            transformOrigin: 'bottom left',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {speechBubbleText}
          {/* Triangular Tail */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '20px',
              width: '0',
              height: '0',
              borderStyle: 'solid',
              borderWidth: '8px 8px 0 0',
              borderColor: '#1e293b transparent transparent transparent',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-10px',
              left: '19px',
              width: '0',
              height: '0',
              borderStyle: 'solid',
              borderWidth: '9px 9px 0 0',
              borderColor: 'rgba(148, 163, 184, 0.25) transparent transparent transparent',
              zIndex: -1,
            }}
          />
        </div>
      )}
    </div>
  );
};
