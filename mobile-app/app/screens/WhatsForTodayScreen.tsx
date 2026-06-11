import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  SafeAreaView, ActivityIndicator, StatusBar, Alert, Platform, FlatList
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import whatsForTodayApi, { DailyReport, TopStock, FeedbackLog } from '../services/whatsForTodayApi';
import useAuthStore from '../store/authStore';

type WhatsForTodayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WhatsForToday'>;

interface WhatsForTodayScreenProps {
  navigation: WhatsForTodayScreenNavigationProp;
}

const PHASES = [
  { num: 1, label: 'Pre-Market', time: '8:00 AM', title: 'What’s Going to Happen?' },
  { num: 2, label: 'After Open', time: '10:00 AM', title: 'What Is Happening Now?' },
  { num: 3, label: 'Mid-Market', time: '1:00 PM', title: 'What Is Changing?' },
  { num: 4, label: 'Market Close', time: '4:30 PM', title: 'What Happened Today?' },
];

export const WhatsForTodayScreen: React.FC<WhatsForTodayScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activePhase, setActivePhase] = useState<number>(1);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showStory, setShowStory] = useState(true);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});

  const toggleSector = (sectorId: string) => {
    setExpandedSectors(prev => ({
      ...prev,
      [sectorId]: !prev[sectorId]
    }));
  };

  // Fetch latest report
  const { data: latestReport, isLoading: loadingLatest } = useQuery({
    queryKey: ['whatsForToday', 'latest'],
    queryFn: whatsForTodayApi.getLatest,
  });

  // State to hold cached reports for all 4 phases
  const [phaseReports, setPhaseReports] = useState<Record<number, DailyReport | null>>({});
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(false);

  // Load all phases for the target date to populate the cache
  const loadAllPhases = async (dateStr: string) => {
    setLoadingPhase(true);
    try {
      const results = await Promise.all([
        whatsForTodayApi.getByPhase(1, dateStr).catch(() => null),
        whatsForTodayApi.getByPhase(2, dateStr).catch(() => null),
        whatsForTodayApi.getByPhase(3, dateStr).catch(() => null),
        whatsForTodayApi.getByPhase(4, dateStr).catch(() => null),
      ]);
      const cache: Record<number, DailyReport | null> = {};
      results.forEach((res, i) => {
        cache[i + 1] = res;
      });
      setPhaseReports(cache);
    } catch (err) {
      console.error('Failed to pre-fetch all phases', err);
    } finally {
      setLoadingPhase(false);
    }
  };

  // Set initial active phase once latest report is fetched
  useEffect(() => {
    if (latestReport) {
      setActivePhase(latestReport.runNumber);
      setSelectedReport(latestReport);
      loadAllPhases(latestReport.date);
    }
  }, [latestReport]);

  const loadPhase = async (phaseNum: number) => {
    setActivePhase(phaseNum);
    if (phaseReports[phaseNum]) {
      setSelectedReport(phaseReports[phaseNum]);
      return;
    }

    setLoadingPhase(true);
    try {
      const today = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      const todayStr = new Date(today).toISOString().split('T')[0];

      const res = await whatsForTodayApi.getByPhase(phaseNum, todayStr);
      if (res) {
        setSelectedReport(res);
        setPhaseReports(prev => ({ ...prev, [phaseNum]: res }));
      } else {
        setSelectedReport(null);
      }
    } catch (err) {
      console.error(err);
      setSelectedReport(null);
    } finally {
      setLoadingPhase(false);
    }
  };

  // Admin trigger mutation
  const triggerMutation = useMutation({
    mutationFn: (phaseNum: number) => whatsForTodayApi.manualTrigger(phaseNum),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsForToday'] });
      if (data) {
        setSelectedReport(data);
        setPhaseReports(prev => ({ ...prev, [activePhase]: data }));
      }
      Alert.alert('Success', `Phase ${activePhase} generated successfully.`);
    },
    onError: (err: any) => {
      Alert.alert('Trigger Failed', err.message || 'OpenAI call failed');
    }
  });

  const handleTrigger = () => {
    triggerMutation.mutate(activePhase);
  };

  const getMoodColor = (mood: string) => {
    const m = mood.toUpperCase();
    if (m === 'BULLISH' || m === 'RISK_ON') return Colors.buy;
    if (m === 'BEARISH' || m === 'RISK_OFF') return Colors.sell;
    return Colors.hold;
  };

  const getSectorStyle = (trend: string) => {
    const t = trend.toUpperCase();
    if (t === 'STRONG') return { borderLeftColor: Colors.buy, backgroundColor: 'rgba(20, 184, 166, 0.04)' };
    if (t === 'WEAK') return { borderLeftColor: Colors.sell, backgroundColor: 'rgba(239, 68, 68, 0.04)' };
    if (t === 'REVERSING') return { borderLeftColor: Colors.hold, backgroundColor: 'rgba(234, 179, 8, 0.04)' };
    return { borderLeftColor: Colors.border, backgroundColor: Colors.card };
  };

  const isAdmin = user?.role === 'SUPERUSER' || user?.role === 'ADMIN';

  const formatTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|_|\s)\S/g, l => l.toUpperCase()).replace(/_/g, ' ');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        
        {/* Screen Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>✨ What's For Today</Text>
            <Text style={styles.headerSub}>Layman Daily Market Story</Text>
          </View>
        </View>

        <>
            {/* Sticky Horizontal Phase Selector */}
            <View style={styles.phaseSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseScroll}>
                {PHASES.map((phase) => {
                  const isActive = activePhase === phase.num;
                  const isGenerated = !!phaseReports[phase.num];

                  return (
                    <Pressable
                      key={phase.num}
                      style={({ pressed }) => [
                        styles.phaseCard, 
                        isActive ? styles.phaseCardActive : null,
                        !isGenerated && !isActive ? styles.phaseCardLocked : null,
                        pressed && styles.pressedOpacity
                      ]}
                      onPress={() => loadPhase(phase.num)}
                    >
                      <View style={styles.phaseHeaderRow}>
                        <Text style={[styles.phaseLabel, isActive ? styles.phaseLabelActive : null]}>
                          {phase.label}
                        </Text>
                        <Text style={styles.phaseTime}>{phase.time}</Text>
                      </View>
                      <Text style={[styles.phaseTitleText, isActive ? styles.phaseTitleTextActive : null]} numberOfLines={1}>
                        {phase.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {loadingLatest || loadingPhase ? (
              <View style={styles.centerWrapper}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : !selectedReport ? (
              <View style={styles.emptyReport}>
                <Text style={styles.emptyTitle}>Report locked or pending</Text>
                <Text style={styles.emptySub}>
                  No intelligence story generated for this daily phase yet.
                </Text>
                {isAdmin ? (
                  <Pressable 
                    style={({ pressed }) => [styles.triggerBtn, pressed && styles.pressedOpacity]} 
                    onPress={handleTrigger}
                    disabled={triggerMutation.isPending}
                  >
                    {triggerMutation.isPending ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.triggerBtnText}>Trigger OpenAI Generation</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Market Summary */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{selectedReport.title}</Text>
                    <Pressable onPress={() => setShowStory(!showStory)} style={({ pressed }) => [pressed && styles.pressedOpacity]}>
                      <Text style={styles.primaryToggleText}>{showStory ? '▲' : '▼'}</Text>
                    </Pressable>
                  </View>
                  {showStory ? (
                    <Text style={styles.summaryText}>{selectedReport.marketStorySummary}</Text>
                  ) : null}
                </View>

                {/* Market Snapshot Section */}
                <View style={styles.snapshotCard}>
                  <Text style={styles.snapshotTitle}>Market Snapshot</Text>
                  <View style={styles.snapshotTagsContainer}>
                    <View style={styles.snapshotTag}>
                      <Text style={styles.snapshotTagLabel}>Mood: </Text>
                      <Text style={[styles.snapshotTagValue, { color: getMoodColor(selectedReport.mood) }]}>
                        {selectedReport.mood === 'BULLISH' || selectedReport.mood === 'RISK_ON' ? '🐂 ' : selectedReport.mood === 'BEARISH' || selectedReport.mood === 'RISK_OFF' ? '🐻 ' : '⚖️ '}{formatTitleCase(selectedReport.mood)}
                      </Text>
                    </View>
                    <View style={styles.snapshotTag}>
                      <Text style={styles.snapshotTagLabel}>Sentiment: </Text>
                      <Text style={styles.snapshotTagValue}>
                        {selectedReport.newsSentiment === 'POSITIVE' ? '🟢 ' : selectedReport.newsSentiment === 'NEGATIVE' ? '🔴 ' : selectedReport.newsSentiment === 'MIXED' ? '🟠 ' : '🟡 '}{formatTitleCase(selectedReport.newsSentiment)}
                      </Text>
                    </View>
                    <View style={styles.snapshotTag}>
                      <Text style={styles.snapshotTagLabel}>Volatility: </Text>
                      <Text style={styles.snapshotTagValue}>
                        {selectedReport.volatilityLevel === 'HIGH' ? '⚡ ' : selectedReport.volatilityLevel === 'MEDIUM' ? '📊 ' : '📉 '}{formatTitleCase(selectedReport.volatilityLevel)}
                      </Text>
                    </View>
                    <View style={styles.snapshotTag}>
                      <Text style={styles.snapshotTagLabel}>Risk: </Text>
                      <Text style={styles.snapshotTagValue}>
                        {selectedReport.riskLevel === 'HIGH' ? '🚨 ' : selectedReport.riskLevel === 'MEDIUM' ? '⚠️ ' : '🛡️ '}{formatTitleCase(selectedReport.riskLevel)}
                      </Text>
                    </View>
                  </View>
                  {selectedReport.volumeBehavior ? (
                    <Text style={styles.snapshotVolumeText}>
                      Volume: <Text style={styles.italicNormalText}>"{selectedReport.volumeBehavior}"</Text>
                    </Text>
                  ) : null}
                </View>

                {/* Beginner friendly column and Market Catalysts in parallel */}
                <View style={styles.parallelRow}>
                  {/* Beginner friendly column */}
                  <View style={[styles.card, styles.beginnerCard, styles.parallelCol]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.beginnerCardTitle} numberOfLines={1}>💡 Lesson</Text>
                      <Pressable onPress={() => setShowExplanation(!showExplanation)} style={({ pressed }) => [pressed && styles.pressedOpacity]}>
                        <Text style={styles.primaryToggleText}>{showExplanation ? '▲' : '▼'}</Text>
                      </Pressable>
                    </View>
                    {showExplanation ? (
                      <Text style={styles.beginnerExplanation}>{selectedReport.beginnerExplanation}</Text>
                    ) : null}
                  </View>

                  {/* Market Catalysts card */}
                  <View style={[styles.card, styles.parallelCol]}>
                    <Text style={styles.cardLabelTitle}>Market Catalysts</Text>
                    <Text style={styles.normalText}>{selectedReport.catalystSummary}</Text>
                  </View>
                </View>

                {/* Sector watches list */}
                <Text style={styles.sectionTitle}>Sector Watch Heatmap</Text>
                {selectedReport.sectors ? selectedReport.sectors.map((sec) => (
                  <View key={sec.id} style={[styles.sectorCard, getSectorStyle(sec.trend)]}>
                    <Pressable 
                      onPress={() => toggleSector(sec.id)}
                      style={({ pressed }) => [
                        expandedSectors[sec.id] ? styles.sectorToggleContainerExpanded : styles.sectorToggleContainer,
                        pressed && styles.pressedOpacity
                      ]}
                    >
                      <View style={styles.sectorHeader}>
                        <View>
                          <View style={styles.sectorHeaderRow}>
                            <Text style={styles.sectorName}>{sec.sectorName}</Text>
                            <Text style={styles.sectorExpandIndicator}>
                              {expandedSectors[sec.id] ? '▲' : '▼'}
                            </Text>
                          </View>
                          <Text style={styles.sectorTrend}>Trend: {sec.trend}</Text>
                        </View>
                        <View style={styles.alignEnd}>
                          <Text style={styles.sectorStat}>Vol: {sec.volumeStrength}</Text>
                          <Text style={styles.sectorStat}>Risk: {sec.riskLevel}</Text>
                        </View>
                      </View>
                    </Pressable>

                    {expandedSectors[sec.id] ? (
                      <View style={styles.sectorExpandedContent}>
                        <Text style={styles.sectorReason}>{sec.reasoning}</Text>
                        
                        <View style={styles.sectorCatalystContainer}>
                          <Text style={styles.sectorCatalystText}>
                            <Text style={styles.boldText}>Catalyst: </Text>
                            {sec.catalyst}
                          </Text>
                        </View>

                        <Text style={styles.watchlistLabel}>Stocks in Watchlist</Text>
                        <View style={styles.stocksGrid}>
                          {sec.topStocks ? sec.topStocks.map((st) => {
                            const isUp = st.changePercent >= 0;
                            return (
                              <Pressable
                                key={st.symbol}
                                style={({ pressed }) => [styles.stockItem, pressed && styles.pressedOpacity]}
                                onPress={() => navigation.navigate('WhatsForTodayStockDetail', { stock: st })}
                              >
                                <View style={styles.stockTextRow}>
                                  <Text style={styles.stockSymbol}>{st.symbol}</Text>
                                  <Text style={[styles.stockChange, isUp ? styles.textBuyColor : styles.textSellColor]}>
                                    {isUp ? '+' : ''}{st.changePercent.toFixed(1)}%
                                  </Text>
                                </View>
                                <Text style={styles.stockSetup} numberOfLines={1}>{st.technicalSetup}</Text>
                              </Pressable>
                            );
                          }) : null}
                        </View>
                      </View>
                    ) : null}
                  </View>
                )) : null}

              </ScrollView>
            )}
          </>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: Colors.cardElevated,
  },
  tabBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  phaseSelector: {
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.background,
    paddingVertical: 8,
  },
  phaseScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  phaseCard: {
    width: 130,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  phaseCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  phaseCardLocked: {
    opacity: 0.5,
  },
  phaseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  phaseLabelActive: {
    color: Colors.primary,
  },
  phaseTime: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  phaseTitleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  phaseTitleTextActive: {
    color: Colors.text,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyReport: {
    flex: 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  triggerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  triggerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    paddingBottom: 8,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  toggleText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontWeight: '300',
  },
  normalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardLabelTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  beginnerCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.02)',
    borderColor: 'rgba(20, 184, 166, 0.15)',
  },
  beginnerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  beginnerExplanation: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  snapshotCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  snapshotTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  snapshotTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  snapshotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  snapshotTagLabel: {
    fontSize: 9.5,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  snapshotTagValue: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
  },
  snapshotVolumeText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: Colors.divider,
    paddingTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  indexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  indexItem: {
    alignItems: 'center',
  },
  indexName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  indexPrice: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  indexChange: {
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 8,
  },
  sectorCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  sectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  sectorTrend: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  sectorStat: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  sectorReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sectorCatalystContainer: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectorCatalystText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  watchlistLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  stocksGrid: {
    gap: 6,
  },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stockTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockSymbol: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stockChange: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  stockSetup: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: 250,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  modalAckBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalAckBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  feedbackCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  feedbackHeader: {
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    paddingBottom: 8,
    marginBottom: 10,
  },
  feedbackDate: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  feedbackGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackHalf: {
    flex: 1,
  },
  feedbackLabelTitle: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  feedbackValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  feedbackDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 10,
  },
  feedbackItem: {
    marginBottom: 8,
  },
  feedbackItemTitle: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 3,
  },
  feedbackFailItem: {
    fontSize: 11,
    color: Colors.sell,
    lineHeight: 16,
  },
  feedbackNarrative: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  feedbackImprovementContainer: {
    backgroundColor: 'rgba(20, 184, 166, 0.03)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    padding: 8,
    marginTop: 4,
  },
  feedbackImprovementText: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  parallelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  parallelCol: {
    flex: 1,
  },
  explanationBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.02)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    padding: 10,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  primaryToggleText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  italicNormalText: {
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  sectorToggleContainer: {
    paddingBottom: 0,
  },
  sectorToggleContainerExpanded: {
    paddingBottom: 12,
  },
  sectorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectorExpandIndicator: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  sectorExpandedContent: {
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingTop: 12,
  },
  boldText: {
    fontWeight: '700',
  },
  textBuyColor: {
    color: Colors.buy,
  },
  textSellColor: {
    color: Colors.sell,
  },
  pressedOpacity: {
    opacity: 0.7,
  },
});

export default WhatsForTodayScreen;
