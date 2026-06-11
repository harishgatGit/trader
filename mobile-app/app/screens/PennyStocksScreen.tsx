import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, ActivityIndicator, StatusBar, Alert, Platform 
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import whatsForTodayApi, { PennyStockItem } from '../services/whatsForTodayApi';
import useAuthStore from '../store/authStore';

type PennyStocksScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PennyStocks'>;

interface PennyStocksScreenProps {
  navigation: PennyStocksScreenNavigationProp;
}

export const PennyStocksScreen: React.FC<PennyStocksScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch penny stocks
  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['whatsForToday', 'pennyStocks'],
    queryFn: () => whatsForTodayApi.getPennyStocks(),
  });

  const stocks = response?.pennyStocks || [];
  const generatedAt = response?.generatedAt;
  const nextRefreshAt = response?.nextRefreshAt;


  // Trigger scan mutation
  const scanMutation = useMutation({
    mutationFn: whatsForTodayApi.triggerPennyStockScan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsForToday', 'pennyStocks'] });
      Alert.alert('Scan Completed', 'Scanned and updated Micro-Cap Catalysts watchlist.');
    },
    onError: (err: any) => {
      Alert.alert('Scan Failed', err.message || 'Alpaca snapshots scan failed.');
    }
  });

  const handleManualScan = () => {
    scanMutation.mutate();
  };

  const isAdmin = user?.role === 'SUPERUSER' || user?.role === 'ADMIN';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>⚡ Micro-Cap Catalysts</Text>
          {isAdmin ? (
            <TouchableOpacity 
              onPress={handleManualScan} 
              disabled={scanMutation.isPending}
              style={styles.scanBtn}
            >
              {scanMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.scanBtnText}>Scan</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 50 }} />
          )}
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>⚠️ High Risk Warning</Text>
          <Text style={styles.warningText}>
            Micro-cap catalysts are highly speculative and present extremely high volatility, thin liquidity, and susceptibility to rapid price manipulation.
          </Text>
        </View>

        {/* Cache Status Ribbon */}
        {generatedAt && nextRefreshAt ? (
          <View style={styles.cacheBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.cacheStatusDot} />
              <Text style={styles.cacheBannerTitle}>Cached Scanner Output (2h refresh)</Text>
            </View>
            <View style={styles.cacheTimesContainer}>
              <Text style={styles.cacheTimeText}>
                Gen: <Text style={styles.cacheTimeHighlight}>{new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </Text>
              <Text style={styles.cacheTimeTextDivider}>|</Text>
              <Text style={styles.cacheTimeText}>
                Next: <Text style={styles.cacheTimeHighlightAmber}>{new Date(nextRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </Text>
            </View>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.centerWrapper}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : stocks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Micro-Cap Catalysts Found</Text>
            <Text style={styles.emptySub}>
              Run the scanner to discover active micro-cap catalysts.
            </Text>
          </View>
        ) : (
          <FlatList
            data={stocks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isUp = item.changePercent >= 0;

              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <View style={styles.symbolRow}>
                        <Text style={styles.symbol}>{item.symbol}</Text>
                        <Text style={[styles.changePercent, { color: isUp ? Colors.buy : Colors.sell }]}>
                          {isUp ? '+' : ''}{item.changePercent.toFixed(1)}%
                        </Text>
                      </View>
                      <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                      <Text style={styles.spikeLabel}>Vol Spike: <Text style={{ color: Colors.primary }}>{item.volumeSpike.toFixed(1)}x</Text></Text>
                    </View>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Risk Level</Text>
                      <Text style={[styles.statValue, { color: Colors.sell }]}>{item.riskLevel}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>Liquidity Score</Text>
                      <Text style={styles.statValue}>{item.liquidityScore}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={[styles.explanationBox, { marginBottom: 12 }]}>
                    <Text style={styles.explanationText}>{item.explanation}</Text>
                  </View>

                  <View style={styles.parallelInfoRow}>
                    <View style={[styles.infoSection, styles.parallelInfoCol]}>
                      <Text style={styles.infoLabel}>Scanner Trigger</Text>
                      <Text style={styles.infoValue}>{item.watchReason}</Text>
                    </View>
                    <View style={[styles.infoSection, styles.parallelInfoCol]}>
                      <Text style={styles.infoLabel}>News Catalyst</Text>
                      <Text style={styles.infoValue}>{item.catalyst}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
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
  scanBtn: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  scanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  warningBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderLeftWidth: 3,
    borderColor: Colors.sell,
    padding: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 6,
  },
  warningTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.sell,
    letterSpacing: 0.5,
  },
  warningText: {
    fontSize: 9.5,
    color: Colors.textSecondary,
    lineHeight: 13,
    marginTop: 2,
  },
  searchBar: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 12.5,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 0.8,
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
  },
  listContent: {
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
    alignItems: 'flex-start',
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  changePercent: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  companyName: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 160,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  spikeLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 8,
  },
  statLabel: {
    fontSize: 8,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  infoSection: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 8.5,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 11.5,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 3,
  },
  parallelInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  parallelInfoCol: {
    flex: 1,
  },
  expandToggle: {
    marginTop: 6,
    paddingVertical: 4,
  },
  expandToggleText: {
    fontSize: 11.5,
    color: Colors.primary,
    fontWeight: '600',
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
  cacheBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  cacheStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.buy,
  },
  cacheBannerTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  cacheTimesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cacheTimeText: {
    fontSize: 9.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.textMuted,
  },
  cacheTimeHighlight: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  cacheTimeHighlightAmber: {
    color: Colors.hold,
    fontWeight: '700',
  },
  cacheTimeTextDivider: {
    fontSize: 9.5,
    color: Colors.border,
  },
});

export default PennyStocksScreen;
