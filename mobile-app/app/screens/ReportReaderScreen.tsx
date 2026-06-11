import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';

type ReportReaderScreenRouteProp = RouteProp<RootStackParamList, 'ReportReader'>;

interface ReportReaderScreenProps {
  route: ReportReaderScreenRouteProp;
  navigation: any;
}

interface Section {
  key: string;
  title: string;
  points: string[];
  layman: string;
}

const REPORT_SECTIONS: Section[] = [
  {
    key: 'overview',
    title: 'Market Structure & Catalyst',
    points: [
      'Positive price action triggered by high-volume support tests.',
      'Strong forward growth guidance exceeding general market expectations.',
      'Constructive technical momentum with bullish MACD crossover confirm.',
    ],
    layman: 'The stock price is going up because a lot of people are buying it at key support levels, and the company is predicting very good sales for the next few months.',
  },
  {
    key: 'entry',
    title: 'Entry Strategy & Triggers',
    points: [
      'Initiate partial positions in the key entry zone ($122 - $125).',
      'Deploy remaining capital in accumulation zone ($112 - $120).',
      'Enforce hard stop loss at $108.50 on daily closing bases.',
    ],
    layman: 'Buy a small amount of stock if the price is between $122 and $125. If the price drops to between $112 and $120, buy a bit more. Sell everything immediately if the price drops below $108.50 to avoid losing too much money.',
  },
  {
    key: 'risks',
    title: 'Risk Factors & Downside Indicators',
    points: [
      'High price-to-earnings ratios require perfect forward growth execution.',
      'Global logistics bottlenecks could delay deliveries and impact gross margins.',
      'Potential regulatory constraints in key target export markets.',
    ],
    layman: 'The stock is quite expensive right now, so if the company does not perform perfectly, the price could drop. Also, shipping delays or new government rules could hurt their business.',
  },
];

export const ReportReaderScreen: React.FC<ReportReaderScreenProps> = ({ route, navigation }) => {
  const { symbol } = route.params;
  const [fontSize, setFontSize] = useState(14);
  const [keyPointsOnly, setKeyPointsOnly] = useState(false);
  const [explainSimply, setExplainSimply] = useState(false);

  const increaseFont = () => setFontSize((f) => Math.min(22, f + 2));
  const decreaseFont = () => setFontSize((f) => Math.max(12, f - 2));

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navbar */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.navText}>← Close Reader</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{symbol} Report</Text>
        
        {/* Font controls */}
        <View style={styles.fontControls}>
          <TouchableOpacity onPress={decreaseFont} style={styles.fontBtn}>
            <Text style={styles.fontBtnText}>A-</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={increaseFont} style={styles.fontBtn}>
            <Text style={styles.fontBtnText}>A+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reader Controls Panel */}
      <View style={styles.controlPanel}>
        <TouchableOpacity
          style={[styles.panelBtn, keyPointsOnly && styles.panelBtnActive]}
          onPress={() => setKeyPointsOnly(!keyPointsOnly)}
        >
          <Text style={[styles.panelBtnText, keyPointsOnly && styles.panelBtnTextActive]}>
            {keyPointsOnly ? '• Show Full Text' : '• Key Points Only'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.panelBtn, explainSimply && styles.panelBtnActive]}
          onPress={() => setExplainSimply(!explainSimply)}
        >
          <Text style={[styles.panelBtnText, explainSimply && styles.panelBtnTextActive]}>
            {explainSimply ? '★ Professional Mode' : '★ Explain Simply'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document Body */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {REPORT_SECTIONS.map((sec) => (
          <View key={sec.key} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            
            {explainSimply ? (
              // Simple layman mode
              <View style={styles.laymanContainer}>
                <Text style={[styles.laymanText, { fontSize: fontSize + 1 }]}>
                  {sec.layman}
                </Text>
              </View>
            ) : (
              // Standard professional bullet points
              <View style={styles.pointsList}>
                {sec.points.map((pt, index) => {
                  // If Key Points mode, we can show a truncated highlights view or format it
                  return (
                    <View key={index} style={styles.pointRow}>
                      <Text style={[styles.bullet, { fontSize }]}>•</Text>
                      <Text style={[styles.pointText, { fontSize }, keyPointsOnly && styles.boldText]}>
                        {pt}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>Research Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            Generated by AI Research Agent. This report is for educational and information purposes only. Not financial advice.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: Colors.cardElevated,
  },
  navText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  fontControls: {
    flexDirection: 'row',
    gap: 8,
  },
  fontBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontBtnText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  controlPanel: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.cardElevated,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  panelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  panelBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  panelBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  panelBtnTextActive: {
    color: Colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pointsList: {
    gap: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    color: Colors.primary,
    marginRight: 8,
    fontWeight: '700',
  },
  pointText: {
    color: Colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.text,
  },
  laymanContainer: {
    backgroundColor: 'rgba(20, 184, 166, 0.03)',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  laymanText: {
    color: Colors.text,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  disclaimerCard: {
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
});
export default ReportReaderScreen;
