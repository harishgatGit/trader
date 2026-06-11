import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../../theme/colors';

interface Step {
  label: string;
  description: string;
}

interface AgentProgressStepperProps {
  activeStep: number; // 0 to 6
}

const STEPS: Step[] = [
  { label: 'Market Data', description: 'Fetching current quotes and market volume' },
  { label: 'Historical Trend', description: 'Extracting historical charts and trend data' },
  { label: 'Technical Analysis', description: 'Calculating RSI, MACD, Support, and Resistance' },
  { label: 'News & Events', description: 'Scanning news outlets and corporate calendar events' },
  { label: 'Accumulation Flow', description: 'Analyzing institutional block trade metrics' },
  { label: 'AI Synthesis', description: 'Running narrative engine to draft reading reports' },
  { label: 'Action Plan', description: 'Finalizing stop losses, price zones, and targets' },
];

export const AgentProgressStepper: React.FC<AgentProgressStepperProps> = ({ activeStep = 0 }) => {
  return (
    <View style={styles.container}>
      {STEPS.map((step, idx) => {
        const isCompleted = idx < activeStep;
        const isActive = idx === activeStep;
        
        let titleColor = Colors.textMuted;
        let descColor = Colors.textMuted;
        let badgeColor = Colors.divider;
        let borderIndicatorColor = Colors.divider;

        if (isCompleted) {
          titleColor = Colors.text;
          descColor = Colors.textSecondary;
          badgeColor = Colors.buy; // green checkmark
        } else if (isActive) {
          titleColor = Colors.primary;
          descColor = Colors.text;
          badgeColor = Colors.primary;
          borderIndicatorColor = Colors.primary;
        }

        return (
          <View key={idx} style={styles.stepRow}>
            {/* Left side: indicators and lines */}
            <View style={styles.indicatorContainer}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isCompleted ? Colors.buy : isActive ? Colors.primary : Colors.cardElevated },
                  isActive && { borderColor: Colors.primary, borderWidth: 1 }
                ]}
              >
                {isCompleted ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : isActive ? (
                  <ActivityIndicator size="small" color={Colors.white} style={styles.spinner} />
                ) : (
                  <Text style={styles.stepNum}>{idx + 1}</Text>
                )}
              </View>
              
              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: isCompleted ? Colors.buy : Colors.divider },
                  ]}
                />
              )}
            </View>

            {/* Right side: text details */}
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: titleColor }, isActive && styles.boldText]}>
                {step.label}
              </Text>
              <Text style={[styles.description, { color: descColor }]}>
                {step.description}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    width: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  indicatorContainer: {
    alignItems: 'center',
    width: 32,
    marginRight: 16,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  checkmark: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 12,
  },
  stepNum: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  line: {
    width: 2,
    position: 'absolute',
    top: 24,
    bottom: -12,
    left: 15,
  },
  textContainer: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: '700',
  },
  description: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
export default AgentProgressStepper;
