import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface RiskMeterProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'SIGNIFICANT' | string;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ level }) => {
  const normLevel = level?.toUpperCase() || 'MEDIUM';
  let activeSegments = 1;
  let color = Colors.buy;

  if (normLevel === 'LOW') {
    activeSegments = 1;
    color = Colors.buy;
  } else if (normLevel === 'MEDIUM') {
    activeSegments = 2;
    color = Colors.hold;
  } else if (normLevel === 'HIGH' || normLevel === 'SIGNIFICANT') {
    activeSegments = 3;
    color = Colors.risk;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Risk Profile</Text>
        <Text style={[styles.value, { color }]}>{normLevel}</Text>
      </View>
      <View style={styles.bar}>
        <View
          style={[
            styles.segment,
            activeSegments >= 1 ? { backgroundColor: color } : styles.inactiveSegment,
          ]}
        />
        <View
          style={[
            styles.segment,
            activeSegments >= 2 ? { backgroundColor: color } : styles.inactiveSegment,
          ]}
        />
        <View
          style={[
            styles.segment,
            activeSegments >= 3 ? { backgroundColor: color } : styles.inactiveSegment,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    width: '100%',
  },
  segment: {
    flex: 1,
    height: '100%',
    borderRadius: 3,
    marginRight: 4,
  },
  inactiveSegment: {
    backgroundColor: Colors.border,
  },
});
export default RiskMeter;
