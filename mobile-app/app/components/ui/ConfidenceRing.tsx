import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface ConfidenceRingProps {
  score: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
}

export const ConfidenceRing: React.FC<ConfidenceRingProps> = ({
  score = 0,
  size = 48,
  strokeWidth = 4,
}) => {
  const clampedScore = Math.min(100, Math.max(0, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Color mapping based on score
  let strokeColor = Colors.primary;
  if (clampedScore >= 80) strokeColor = Colors.buy;
  else if (clampedScore >= 50) strokeColor = Colors.hold;
  else strokeColor = Colors.sell;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.divider}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Foreground Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.text, { fontSize: size * 0.28 }]}>
          {Math.round(clampedScore)}
          <Text style={{ fontSize: size * 0.16, color: Colors.textSecondary }}>%</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontWeight: '700',
    color: Colors.text,
  },
});
export default ConfidenceRing;
