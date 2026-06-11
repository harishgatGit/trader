import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import SignalBadge from '../components/ui/SignalBadge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import watchlistApi from '../services/watchlistApi';

type WatchlistScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface WatchlistScreenProps {
  navigation: WatchlistScreenNavigationProp;
}

type SortOption = 'SYMBOL' | 'RATING' | 'PRICE';

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({ navigation }) => {
  const [sortBy, setSortBy] = useState<SortOption>('SYMBOL');
  const queryClient = useQueryClient();

  const { data: watchlist = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
  });

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => watchlistApi.remove(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    if (sortBy === 'SYMBOL') {
      return a.symbol.localeCompare(b.symbol);
    }
    if (sortBy === 'RATING') {
      const ratingA = a.latestRating || 'WATCHLIST';
      const ratingB = b.latestRating || 'WATCHLIST';
      return ratingA.localeCompare(ratingB);
    }
    if (sortBy === 'PRICE') {
      return (b.latestPrice || 0) - (a.latestPrice || 0);
    }
    return 0;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Watchlist Signals</Text>

        {/* Sort header */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <View style={styles.sortTabs}>
            {(['SYMBOL', 'RATING', 'PRICE'] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortBtn, sortBy === opt ? styles.sortBtnActive : null]}
                onPress={() => setSortBy(opt)}
              >
                <Text style={[styles.sortBtnText, sortBy === opt ? styles.sortBtnTextActive : null]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : sortedWatchlist.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Watchlist is empty</Text>
            <Text style={styles.emptySub}>
              Search for assets in the Research tab and tap the Watchlist button to save signals here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sortedWatchlist}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const rating = item.latestRating || 'BUY'; // fallback rating
              const price = item.latestPrice || 142.50; // fallback price
              const priceChange = rating === 'BUY' ? 2.45 : rating === 'SELL' ? -1.80 : 0.00;
              const changePercent = rating === 'BUY' ? 1.72 : rating === 'SELL' ? -1.25 : 0.00;

              return (
                <TouchableOpacity
                  style={styles.card}
                  onPress={() => navigation.navigate('StockInsight', { symbol: item.symbol })}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.symbol}>{item.symbol}</Text>
                      <Text style={styles.notes} numberOfLines={1}>
                        {item.notes || 'No custom notes added'}
                      </Text>
                    </View>
                    <SignalBadge rating={rating} />
                  </View>

                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.priceText}>${price.toFixed(2)}</Text>
                      <Text style={[styles.changeText, { color: priceChange >= 0 ? Colors.buy : Colors.sell }]}>
                        {priceChange >= 0 ? '+' : ''}
                        {priceChange.toFixed(2)} ({priceChange >= 0 ? '+' : ''}
                        {changePercent.toFixed(2)}%)
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeMutation.mutate(item.symbol)}
                      disabled={removeMutation.isPending}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
    padding: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
    marginTop: 10,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sortLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sortTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sortBtnActive: {
    backgroundColor: Colors.cardElevated,
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  sortBtnTextActive: {
    color: Colors.primary,
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  notes: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    maxWidth: 180,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderColor: Colors.divider,
    paddingTop: 12,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  removeBtn: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.sell,
  },
});
export default WatchlistScreen;
