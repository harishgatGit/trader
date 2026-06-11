import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

export const GlobalDisclaimer: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Research Disclaimer & Data Disclosure</Text>
      <Text style={styles.text}>
        This application is for educational and informational purposes only. All data is aggregated and orchestrated from third-party sources; we do not guarantee its accuracy, completeness, or timeliness. There could be delays in the data used for research; while we endeavor to provide real-time information, in some cases it may be near real-time or delayed. We are not registered financial advisors and do not provide investment, financial, or tax advice. Trading stocks involves substantial risk, and you are solely responsible for any financial decisions and losses incurred. Past performance is not indicative of future results.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  text: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 15,
  },
});

export default GlobalDisclaimer;
