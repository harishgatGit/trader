import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface TargetRangeBarProps {
  currentPrice: number;
  targets: number[];
  riskRewardRatio: number;
}

export const TargetRangeBar: React.FC<TargetRangeBarProps> = ({
  currentPrice,
  targets = [],
  riskRewardRatio = 0,
}) => {
  const t1 = targets[0] || 0;
  const t2 = targets[1] || 0;
  const t3 = targets[2] || 0;

  // Estimate progress on a scale from current price to target 3
  const maxVal = t3 || currentPrice * 1.5;
  const minVal = currentPrice;
  const range = maxVal - minVal;
  
  const getPercent = (val: number) => {
    if (range <= 0) return '0%';
    const pct = Math.max(0, Math.min(100, ((val - minVal) / range) * 100));
    return `${pct}%`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profit Targets</Text>
        <View style={styles.rrChip}>
          <Text style={styles.rrText}>R:R {riskRewardRatio ? riskRewardRatio.toFixed(1) : '1.5'}</Text>
        </View>
      </View>

      <View style={styles.barContainer}>
        {/* Track Line */}
        <View style={styles.track} />

        {/* Current Price Indicator */}
        <View style={[styles.marker, { left: '0%' }]}>
          <View style={[styles.dot, styles.currentDot]} />
          <Text style={styles.markerLabel}>Current</Text>
          <Text style={styles.markerPrice}>${currentPrice ? currentPrice.toFixed(2) : ''}</Text>
        </View>

        {/* Target 1 Indicator */}
        {t1 > 0 && (
          <View style={[styles.marker, { left: getPercent(t1) as any }]}>
            <View style={styles.dot} />
            <Text style={styles.markerLabel}>T1</Text>
            <Text style={styles.markerPrice}>${t1.toFixed(2)}</Text>
          </View>
        )}

        {/* Target 2 Indicator */}
        {t2 > 0 && (
          <View style={[styles.marker, { left: getPercent(t2) as any }]}>
            <View style={styles.dot} />
            <Text style={styles.markerLabel}>T2</Text>
            <Text style={styles.markerPrice}>${t2.toFixed(2)}</Text>
          </View>
        )}

        {/* Target 3 Indicator */}
        {t3 > 0 && (
          <View style={[styles.marker, { left: '100%' }]}>
            <View style={[styles.dot, styles.finalDot]} />
            <Text style={styles.markerLabel}>T3</Text>
            <Text style={styles.markerPrice}>${t3.toFixed(2)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 12,
    paddingBottom: 24, // spacing for labels below the bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rrChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  rrText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  barContainer: {
    height: 30,
    width: '100%',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 10,
  },
  track: {
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    width: '100%',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    width: 60,
    marginLeft: -20, // Center the marker
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.background,
    top: -3,
  },
  currentDot: {
    backgroundColor: Colors.textSecondary,
  },
  finalDot: {
    backgroundColor: Colors.buy,
  },
  markerLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 4,
  },
  markerPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
});
export default TargetRangeBar;
