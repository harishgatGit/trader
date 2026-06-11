import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, Platform 
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import whatsForTodayApi, { TopStock } from '../services/whatsForTodayApi';
import watchlistApi from '../services/watchlistApi';

type WhatsForTodayStockDetailScreenRouteProp = RouteProp<RootStackParamList, 'WhatsForTodayStockDetail'>;
type WhatsForTodayStockDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WhatsForTodayStockDetail'>;

interface WhatsForTodayStockDetailScreenProps {
  route: WhatsForTodayStockDetailScreenRouteProp;
  navigation: WhatsForTodayStockDetailScreenNavigationProp;
}

export const WhatsForTodayStockDetailScreen: React.FC<WhatsForTodayStockDetailScreenProps> = ({ route, navigation }) => {
  const { stock } = route.params;
  const queryClient = useQueryClient();
  const [added, setAdded] = useState(false);

  // Watchlist addition mutation
  const watchlistMutation = useMutation({
    mutationFn: (symbol: string) => watchlistApi.add(symbol),
    onSuccess: () => {
      setAdded(true);
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      // Log interaction
      whatsForTodayApi.trackInteraction(stock.symbol, 'watchlist_add');
    },
  });

  const handleAddToWatchlist = () => {
    watchlistMutation.mutate(stock.symbol);
  };

  const getMetricColor = (val: string) => {
    const v = val.toLowerCase().trim();
    if (v === 'strong' || v === 'improving') return Colors.buy;
    if (v === 'weak' || v === 'falling' || v === 'high risk') return Colors.sell;
    if (v === 'medium') return Colors.hold;
    return Colors.textSecondary;
  };

  const isUp = stock.changePercent >= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Back header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{stock.symbol} Insights</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Stock Title Block */}
          <View style={styles.stockHeaderCard}>
            <View style={styles.stockTitleRow}>
              <View>
                <Text style={styles.symbolText}>{stock.symbol}</Text>
                <Text style={styles.nameText} numberOfLines={1}>{stock.companyName}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.priceText}>${stock.price.toFixed(2)}</Text>
                <Text style={[styles.changeText, { color: isUp ? Colors.buy : Colors.sell }]}>
                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.watchlistBtn, added ? styles.watchlistBtnAdded : null]}
              onPress={handleAddToWatchlist}
              disabled={added || watchlistMutation.isPending}
            >
              {watchlistMutation.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={[styles.watchlistBtnText, added ? styles.watchlistBtnTextAdded : null]}>
                  {added ? '★ Saved to Watchlist' : '☆ Save to Watchlist'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Layperson Explanation column */}
          <View style={styles.analogyCard}>
            <Text style={styles.sectionTitle}>💡 Beginner Takeaway</Text>
            <Text style={styles.analogyText}>{stock.explanation}</Text>
          </View>

          {/* Core insights panel */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Insights</Text>
            
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Trigger Reason</Text>
              <Text style={styles.insightVal}>{stock.watchReason}</Text>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Setup State</Text>
              <Text style={styles.insightVal}>{stock.technicalSetup}</Text>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Catalyst</Text>
              <Text style={styles.insightVal}>{stock.catalyst}</Text>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Risk Rating</Text>
              <Text style={[styles.insightVal, { color: Colors.sell, fontWeight: '700' }]}>{stock.riskLevel}</Text>
            </View>

            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Liquidity</Text>
              <Text style={styles.insightVal}>{stock.liquidityScore}</Text>
            </View>
          </View>

          {/* Heat map blocks */}
          <View style={styles.card}>
            <View style={styles.heatmapHeader}>
              <Text style={styles.sectionTitle}>Technical Heatmap</Text>
              <Text style={styles.overallScore}>Score: {stock.heatmap.overallWatchScore}/100</Text>
            </View>

            <View style={styles.heatmapGrid}>
              
              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Price Momentum</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.priceMomentum) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.priceMomentum) }]}>
                    {stock.heatmap.priceMomentum}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Volume Strength</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.volumeStrength) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.volumeStrength) }]}>
                    {stock.heatmap.volumeStrength}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>News Sentiment</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.newsSentiment) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.newsSentiment) }]}>
                    {stock.heatmap.newsSentiment}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Sector Strength</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.sectorStrength) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.sectorStrength) }]}>
                    {stock.heatmap.sectorStrength}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Technical Trend</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.technicalTrend) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.technicalTrend) }]}>
                    {stock.heatmap.technicalTrend}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Volatility Risk</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.volatilityRisk) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.volatilityRisk) }]}>
                    {stock.heatmap.volatilityRisk}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Liquidity</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.liquidity) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.liquidity) }]}>
                    {stock.heatmap.liquidity}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Catalyst Impact</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.catalystImpact) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.catalystImpact) }]}>
                    {stock.heatmap.catalystImpact}
                  </Text>
                </View>
              </View>

              <View style={styles.heatmapItem}>
                <Text style={styles.metricLabel}>Acc/Dist Flow</Text>
                <View style={[styles.metricBox, { borderColor: getMetricColor(stock.heatmap.accDistSignal) }]}>
                  <Text style={[styles.metricValue, { color: getMetricColor(stock.heatmap.accDistSignal) }]}>
                    {stock.heatmap.accDistSignal}
                  </Text>
                </View>
              </View>

            </View>
          </View>


        </ScrollView>
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
  backBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  stockHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  stockTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  symbolText: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 180,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  watchlistBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  watchlistBtnAdded: {
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  watchlistBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  watchlistBtnTextAdded: {
    color: Colors.primary,
  },
  analogyCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  analogyText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  insightRow: {
    borderBottomWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: 8,
  },
  insightLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  insightVal: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallScore: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heatmapItem: {
    width: '48%',
  },
  metricLabel: {
    fontSize: 9.5,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
  },
  metricValue: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  noticeCard: {
    padding: 12,
  },
  noticeText: {
    fontSize: 9.5,
    color: Colors.textMuted,
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default WhatsForTodayStockDetailScreen;
