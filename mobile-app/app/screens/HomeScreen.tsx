import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, SafeAreaView, StatusBar } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import useAuthStore from '../store/authStore';
import useLocalCacheStore from '../store/localCacheStore';
import { useQuery } from '@tanstack/react-query';
import watchlistApi from '../services/watchlistApi';
import alertsApi from '../services/alertsApi';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuthStore();
  const { recentSearches, readHistory, loadCache, clearSearches } = useLocalCacheStore();

  useEffect(() => {
    loadCache();
  }, []);

  // Fetch watchlist overview
  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
  });

  // Fetch alerts overview
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.getAll,
  });

  const activeAlertsCount = alerts.filter((a) => a.enabled).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>
              {user?.username || 'Trader'}{' '}
              <Text style={styles.roleBadge}>
                [{user?.role}]
              </Text>
            </Text>
          </View>
          <Pressable onPress={logout} style={({ pressed }) => [styles.logoutButton, pressed && styles.pressedOpacity]}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>

        {/* Daily Focus Briefing */}
        <View style={styles.focusCard}>
          <Text style={styles.focusLabel}>Today's Market Focus</Text>
          <Text style={styles.focusTitle}>AI Analyst: NVDA enters entry range</Text>
          <Text style={styles.focusDescription}>
            Nvidia consolidated near support, triggering entry parameters for Swing portfolios. Click to read full AI synthesis.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.focusBtn, pressed && styles.pressedOpacity]}
            onPress={() => navigation.navigate('StockInsight', { symbol: 'NVDA' })}
          >
            <Text style={styles.focusBtnText}>View NVDA Insight</Text>
          </Pressable>
        </View>

        {/* What's For Today & Micro-Cap Catalysts Quick Launch */}
        <View style={styles.quickLaunchRow}>
          <Pressable
            style={({ pressed }) => [styles.quickLaunchCard, pressed && styles.pressedOpacity]}
            onPress={() => navigation.navigate('WhatsForToday')}
          >
            <Text style={styles.quickLaunchTitle}>✨ What's For Today</Text>
            <Text style={styles.quickLaunchSub}>Daily Market Story</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.quickLaunchCard, pressed && styles.pressedOpacity]}
            onPress={() => navigation.navigate('PennyStocks')}
          >
            <Text style={styles.quickLaunchTitle}>⚡ Micro-Cap Catalysts</Text>
            <Text style={styles.quickLaunchSub}>High-Risk Catalysts</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{watchlist.length}</Text>
            <Text style={styles.statLabel}>Watchlist Signals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{activeAlertsCount}</Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>
        </View>

        {/* Local Search Cache History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            {recentSearches.length > 0 ? (
              <Pressable onPress={clearSearches} style={({ pressed }) => [pressed && styles.pressedOpacity]}>
                <Text style={styles.clearText}>Clear History</Text>
              </Pressable>
            ) : null}
          </View>
          {recentSearches.length === 0 ? (
            <View style={styles.emptyCache}>
              <Text style={styles.emptyCacheText}>
                No recent searches. Use the Analyze tab to research tickers.
              </Text>
            </View>
          ) : (
            <View style={styles.searchHistoryGrid}>
              {recentSearches.map((search, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.historyChip, pressed && styles.pressedOpacity]}
                  onPress={() => navigation.navigate('StockInsight', { symbol: search })}
                >
                  <Text style={styles.historyChipText}>{search}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Continue Reading Section */}
        {readHistory.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Reading</Text>
            <View style={styles.historyGrid}>
              {readHistory.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={({ pressed }) => [styles.readHistoryCard, pressed && styles.pressedOpacity]}
                  onPress={() => navigation.navigate('StockInsight', { symbol: item })}
                >
                  <Text style={styles.readHistorySymbol}>{item}</Text>
                  <Text style={styles.readHistoryAction}>Open Report →</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Pro / Max restricted details demo */}
        {user?.role === 'BASIC' ? (
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>Upgrade to Pro or Max</Text>
            <Text style={styles.promoText}>
              Unlock Institutional Flow Tracking, News Catalysts, and AI Story Narrative summaries for deeper stock analysis.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  roleBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  pressedOpacity: {
    opacity: 0.7,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  logoutText: {
    color: Colors.sell,
    fontSize: 12,
    fontWeight: '600',
  },
  focusCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  focusDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  focusBtn: {
    backgroundColor: Colors.cardElevated,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  focusBtnText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  clearText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyCache: {
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  emptyCacheText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchHistoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  historyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  readHistoryCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  readHistorySymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  readHistoryAction: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 10,
  },
  promoCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.15)',
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  promoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  quickLaunchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickLaunchCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLaunchTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text,
  },
  quickLaunchSub: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 3,
  },
});
export default HomeScreen;
