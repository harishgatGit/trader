import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import analysisApi from '../services/analysisApi';
import watchlistApi from '../services/watchlistApi';
import useAuthStore from '../store/authStore';
import useLocalCacheStore from '../store/localCacheStore';
import MiniChart from '../components/ui/MiniChart';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

type StockInsightScreenRouteProp = RouteProp<RootStackParamList, 'StockInsight'>;
type StockInsightScreenNavigationProp = StackNavigationProp<RootStackParamList, 'StockInsight'>;

interface StockInsightScreenProps {
  route: StockInsightScreenRouteProp;
  navigation: StockInsightScreenNavigationProp;
}

// ─────────────────────────────────────────────────────────────────
// CUSTOM PREMIUM INLINE SVG ICONS
// ─────────────────────────────────────────────────────────────────
const StarIcon = ({ filled }: { filled: boolean }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? Colors.primary : "none"} stroke={Colors.primary} strokeWidth={2}>
    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
);

const BellIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.textSecondary} strokeWidth={2}>
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const ActivityIcon = ({ color = Colors.primary, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </Svg>
);

const CheckIcon = ({ color = Colors.buy, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
    <Path d="M20 6L9 17l-5-5" />
  </Svg>
);

const AlertIcon = ({ color = Colors.sell, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
    <Line x1={12} y1={8} x2={12} y2={12} />
    <Line x1={12} y1={16} x2={12.01} y2={16} />
  </Svg>
);

const SparklesIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.hold} strokeWidth={2}>
    <Path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m10.607 10.607l.707.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
  </Svg>
);

const GlobeIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
    <Path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </Svg>
);

const CoinsIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2}>
    <Circle cx={8} cy={8} r={6} />
    <Circle cx={18} cy={18} r={4} />
    <Path d="M12 18a6 6 0 0 0-6-6" />
  </Svg>
);

const BuildingIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2}>
    <Rect x={4} y={2} width={16} height={20} rx={2} ry={2} />
    <Line x1={9} y1={22} x2={9} y2={16} />
    <Line x1={15} y1={22} x2={15} y2={16} />
    <Line x1={9} y1={16} x2={15} y2={16} />
  </Svg>
);

const LayersIcon = ({ color = Colors.watchlist, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </Svg>
);

const ClockIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.buy} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

const ShieldIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Svg>
);

const HelpIcon = ({ color = Colors.primary, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Circle cx={12} cy={12} r={10} />
    <Path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <Line x1={12} y1={17} x2={12.01} y2={17} />
  </Svg>
);

const ZapIcon = ({ color = Colors.hold, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </Svg>
);

const ShieldAlertIcon = ({ color = Colors.sell, size = 14 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <Line x1={12} y1={8} x2={12} y2={12} />
    <Line x1={12} y1={16} x2={12.01} y2={16} />
  </Svg>
);

const Polyline = ({ points }: { points: string }) => {
  const pts = points.split(' ').map(p => {
    const [x, y] = p.split(',');
    return { x: parseFloat(x), y: parseFloat(y) };
  });
  let d = '';
  pts.forEach((pt, idx) => {
    if (idx === 0) d = `M ${pt.x} ${pt.y}`;
    else d += ` L ${pt.x} ${pt.y}`;
  });
  return <Path d={d} fill="none" stroke="currentColor" strokeWidth={2} />;
};

const ChevronIcon = ({ direction }: { direction: 'up' | 'down' }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.textSecondary} strokeWidth={2}>
    {direction === 'up' ? <Path d="M18 15l-6-6-6 6" /> : <Path d="M6 9l6 6 6-6" />}
  </Svg>
);

const TrendingUpIcon = ({ color = Colors.buy, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
    <Path d="M23 6l-9.5 9.5-5-5L1 18" stroke={color} strokeWidth={2.5} fill="none" />
    <Path d="M17 6h6v6" stroke={color} strokeWidth={2.5} fill="none" />
  </Svg>
);

const TrendingDownIcon = ({ color = Colors.sell, size = 16 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
    <Path d="M23 18l-9.5-9.5-5 5L1 6" stroke={color} strokeWidth={2.5} fill="none" />
    <Path d="M17 18h6v-6" stroke={color} strokeWidth={2.5} fill="none" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// BADGE AND STYLE HELPERS FOR PREMIUM PORT
// ─────────────────────────────────────────────────────────────────
const getPrimaryReasonBadgeStyle = (reason: string) => {
  const r = reason?.toLowerCase() || '';
  if (r.includes('earnings')) return { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', text: '#A855F7', label: 'Earnings Reaction' };
  if (r.includes('news')) return { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.2)', text: '#14B8A6', label: 'News Catalyst' };
  if (r.includes('analyst')) return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6', label: 'Analyst Action' };
  if (r.includes('sector')) return { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)', text: '#6366F1', label: 'Sector Sympathy' };
  if (r.includes('market')) return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', text: '#64748B', label: 'Market Wide Move' };
  if (r.includes('institutional')) return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981', label: 'Institutional Accumulation' };
  if (r.includes('retail')) return { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)', text: '#EC4899', label: 'Retail Momentum / Buzz' };
  if (r.includes('short')) return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: 'Short Covering / Squeeze' };
  if (r.includes('breakout')) return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: '#10B981', label: 'Technical Breakout' };
  if (r.includes('breakdown')) return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', label: 'Technical Breakdown' };
  if (r.includes('fake')) return { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)', text: '#F97316', label: 'Low Volume Fake Move' };
  return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', text: '#64748B', label: reason?.replace(/-/g, ' ')?.toUpperCase() || 'Mixed Move' };
};

const getSustainStyle = (sustain: string) => {
  const s = sustain?.toLowerCase() || '';
  if (s === 'yes') return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: Colors.buy };
  if (s === 'no') return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: Colors.sell };
  return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: Colors.hold };
};

const getBiasBadgeStyle = (bias: string) => {
  const b = bias?.toLowerCase() || '';
  if (b.includes('buy') || b.includes('bullish')) return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.25)', text: Colors.buy };
  if (b.includes('hold') || b.includes('mixed')) return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.25)', text: '#3B82F6' };
  if (b.includes('wait')) return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.25)', text: Colors.hold };
  if (b.includes('avoid') || b.includes('bearish')) return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.25)', text: Colors.sell };
  if (b.includes('trim') || b.includes('profit')) return { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', text: '#A855F7' };
  if (b.includes('short') || b.includes('watch')) return { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', text: '#EC4899' };
  return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', text: Colors.textSecondary };
};

const getShortBiasStyle = (bias: string) => {
  const b = bias?.toLowerCase() || '';
  if (b === 'safe_to_short') return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.2)', text: Colors.buy, label: 'Safe to Short' };
  if (b === 'wait_for_breakdown') return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6', label: 'Wait for Breakdown' };
  if (b === 'avoid_short') return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: Colors.sell, label: 'Avoid Shorting' };
  if (b === 'squeeze_risk_high') return { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)', text: '#EC4899', label: 'SQUEEZE RISK HIGH' };
  return { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.2)', text: Colors.textSecondary, label: bias?.replace(/_/g, ' ')?.toUpperCase() };
};

// ─────────────────────────────────────────────────────────────────
// MAIN STOCK INSIGHT SCREEN
// ─────────────────────────────────────────────────────────────────
export const StockInsightScreen: React.FC<StockInsightScreenProps> = ({ route, navigation }) => {
  const { symbol } = route.params;
  const { user } = useAuthStore();
  const { addReadHistory, toggleBookmark, isBookmarked } = useLocalCacheStore();
  const queryClient = useQueryClient();

  const scrollViewRef = useRef<ScrollView>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'technical' | 'tactical' | 'insight'>('overview');

  const [isEvidenceExpanded, setIsEvidenceExpanded] = useState(false);
  const [activeTradeTab, setActiveTradeTab] = useState<'swing' | 'short'>('swing');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    addReadHistory(symbol);
  }, [symbol]);

  // Query latest report
  const { data: report, isLoading: isReportLoading, refetch: refetchReport } = useQuery({
    queryKey: ['report', symbol],
    queryFn: () => analysisApi.getLatestReport(symbol),
    retry: false,
  });

  // Query technical indicators & daily candles
  const { data: techData, isLoading: isTechLoading } = useQuery({
    queryKey: ['technicals', symbol],
    queryFn: () => analysisApi.getTechnicals(symbol),
    retry: false,
  });

  // Query watchlist
  const { data: watchlist = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.getAll,
  });

  const isInWatchlist = watchlist.some((w) => w.symbol.toUpperCase() === symbol.toUpperCase());

  // Watchlist mutation
  const toggleWatchlistMutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (isInWatchlist) {
        return watchlistApi.remove(symbol);
      } else {
        return watchlistApi.add(symbol);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const [analyzing, setAnalyzing] = useState(false);
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analysisApi.analyze(symbol, true); // Bypass cache
      await Promise.allSettled([
        refetchReport(),
        queryClient.invalidateQueries({ queryKey: ['technicals', symbol] }),
      ]);
    } catch (e) {
      console.warn('Re-analysis failed', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((p) => ({ ...p, [key]: !p[key] }));
  };

  const isReportLoadingState = isReportLoading;

  if (isReportLoadingState) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Synthesizing AI Insights…</Text>
      </SafeAreaView>
    );
  }

  // Create mock fallback data if backend report doesn't exist for the symbol yet
  const fallbackReport = {
    symbol: symbol,
    finalRating: 'BUY',
    confidenceScore: 85,
    currentPrice: 150.00,
    technicalScore: 78,
    fundamentalScore: 82,
    newsCatalystScore: 68,
    institutionalFlowProxyScore: 85,
    executiveSummary: `${symbol} exhibits a robust technical base consolidation. Relative volume demonstrates accumulation trends over the last 10 sessions.`,
    keyCatalysts: ['Strong revenue expansions quarterly', 'Institutional accumulation spikes detected'],
    keyRisks: ['Valuation multiple is high', 'Supply chain bottlenecks'],
    multibaggerProbability: {
      rating: 'HIGH',
      reason: 'Expanding total addressable market with high operating leverage.',
      requiredConditions: ['Revenue growth stays >20%', 'Operating margins expand']
    },
    institutionalFlowSummary: 'Net block buys suggest large fund positioning.',
    disclaimer: 'Generated by AI. Information only. Not financial advice.',
  };

  const activeReport = report || fallbackReport;
  const r = activeReport.reportJson || activeReport;
  const price = r.currentPrice || fallbackReport.currentPrice;
  const isSaved = isBookmarked(activeReport.id || symbol);

  const technicals = techData?.indicators || null;
  const candles = techData?.candles || [];
  const chartPrices = candles.length > 0 ? candles.slice(-60).map((c: any) => c.close) : [
    price * 0.95, price * 0.96, price * 0.94, price * 0.98, price * 0.97, price * 1.01, price
  ];

  if (r.isFund) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {/* Navbar Row */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.navText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.navTitle}>{symbol} REVIEW</Text>
          <TouchableOpacity
            onPress={() => toggleBookmark(activeReport as any)}
            style={styles.bookmarkBtn}
          >
            <Text style={{ color: isSaved ? Colors.buy : Colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
              {isSaved ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.fundScrollContainer}>
          {/* Header Block */}
          <View style={styles.fundHeaderCard}>
            <View style={styles.fundHeaderTop}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.fundTickerTitle}>{symbol}</Text>
                <Text style={styles.fundNameText}>{r.fundName}</Text>
                <Text style={styles.fundIssuerText}>{r.issuer} · ETF / Mutual Fund</Text>
              </View>
              <View style={[styles.ratingBadge, { borderColor: (Colors as any)[r.finalDecision?.finalRating?.toLowerCase()] || Colors.primary }]}>
                <Text style={[styles.ratingText, { color: (Colors as any)[r.finalDecision?.finalRating?.toLowerCase()] || Colors.primary }]}>
                  {r.finalDecision?.finalRating || 'WATCHLIST'}
                </Text>
              </View>
            </View>

            <View style={styles.fundBenchmarkRow}>
              <Text style={styles.fundBenchmarkLabel}>Benchmark Index:</Text>
              <Text style={styles.fundBenchmarkVal}>{r.benchmarkIndex || 'N/A'}</Text>
            </View>
          </View>

          {/* Final Decision Card */}
          <View style={styles.fundDecisionCard}>
            <View style={styles.fundSectionTitleHeader}>
              <Text style={styles.fundSectionTitle}>AI Review Verdict</Text>
              <View style={styles.fundConfidenceBadge}>
                <Text style={styles.fundConfidenceText}>Confidence: {r.finalDecision?.confidenceScore}%</Text>
              </View>
            </View>
            <Text style={styles.fundDecisionSummary}>{r.finalDecision?.decisionSummary}</Text>
            
            <View style={styles.fundActionBox}>
              <Text style={styles.fundActionLabel}>Best Action Now:</Text>
              <Text style={styles.fundActionText}>{r.finalDecision?.bestActionNow}</Text>
            </View>
          </View>

          {/* Overview Grid Stats */}
          <View style={styles.fundOverviewCard}>
            <Text style={styles.fundSectionTitle}>Key Fundamentals</Text>
            <View style={styles.fundOverviewGrid}>
              <View style={styles.fundOverviewCell}>
                <Text style={styles.fundOverviewLabel}>Expense Ratio</Text>
                <Text style={styles.fundOverviewVal}>{r.fundOverview?.expenseRatio || 'N/A'}</Text>
              </View>
              <View style={styles.fundOverviewCell}>
                <Text style={styles.fundOverviewLabel}>AUM (Assets)</Text>
                <Text style={styles.fundOverviewVal}>{r.fundOverview?.aum || 'N/A'}</Text>
              </View>
              <View style={styles.fundOverviewCell}>
                <Text style={styles.fundOverviewLabel}>Div. Yield</Text>
                <Text style={styles.fundOverviewVal}>{r.fundOverview?.dividendYield || 'N/A'}</Text>
              </View>
              <View style={styles.fundOverviewCell}>
                <Text style={styles.fundOverviewLabel}>Inception</Text>
                <Text style={styles.fundOverviewVal}>{r.fundOverview?.inceptionDate || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Layman Analogy Card */}
          <View style={styles.fundDecisionCard}>
            <Text style={styles.fundSectionTitle}>Simple Analogy</Text>
            <View style={styles.fundAnalogyBox}>
              <Text style={styles.fundAnalogyText}>{r.laymanExplanation}</Text>
            </View>
          </View>

          {/* Pros & Cons */}
          <View style={styles.fundProsConsRow}>
            {/* Pros */}
            <View style={[styles.fundProsConsCard, { borderColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Text style={[styles.fundProsConsTitle, { color: Colors.buy }]}>✓ Advantages</Text>
              {(r.pros || []).map((pro: string, idx: number) => (
                <View key={idx} style={styles.fundBulletRow}>
                  <Text style={[styles.fundBulletDot, { color: Colors.buy }]}>•</Text>
                  <Text style={styles.fundBulletText}>{pro}</Text>
                </View>
              ))}
            </View>

            {/* Cons */}
            <View style={[styles.fundProsConsCard, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <Text style={[styles.fundProsConsTitle, { color: Colors.sell }]}>✗ Risks / Drawbacks</Text>
              {(r.cons || []).map((con: string, idx: number) => (
                <View key={idx} style={styles.fundBulletRow}>
                  <Text style={[styles.fundBulletDot, { color: Colors.sell }]}>•</Text>
                  <Text style={styles.fundBulletText}>{con}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sector Allocations (Progress Bars) */}
          {r.topSectors && r.topSectors.length > 0 && (
            <View style={styles.fundDecisionCard}>
              <Text style={styles.fundSectionTitle}>Sector Allocations</Text>
              {r.topSectors.map((sec: any, idx: number) => {
                const pctStr = sec.percentage || '0%';
                const pctVal = parseFloat(pctStr.replace('%', '')) || 0;
                return (
                  <View key={idx} style={styles.fundProgressRow}>
                    <View style={styles.fundProgressLabelRow}>
                      <Text style={styles.fundProgressLabel}>{sec.sector}</Text>
                      <Text style={styles.fundProgressPct}>{pctStr}</Text>
                    </View>
                    <View style={styles.fundProgressBarBg}>
                      <View style={[styles.fundProgressBarFill, { width: `${Math.min(Math.max(pctVal, 0), 100)}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Top Holdings Table */}
          {r.topHoldings && r.topHoldings.length > 0 && (
            <View style={styles.fundHoldingsTableCard}>
              <Text style={styles.fundSectionTitle}>Top Portfolio Holdings</Text>
              {r.topHoldings.map((hold: any, idx: number) => (
                <View key={idx} style={styles.fundHoldingRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.fundHoldingTicker}>{hold.ticker}</Text>
                    <Text style={styles.fundHoldingName}>{hold.name}</Text>
                  </View>
                  <Text style={styles.fundHoldingPct}>{hold.percentage}</Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navbar Row */}
      <View style={styles.navRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.navText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{symbol} ANALYSIS</Text>
        <TouchableOpacity
          onPress={() => toggleBookmark(activeReport as any)}
          style={styles.bookmarkBtn}
        >
          <Text style={{ color: isSaved ? Colors.buy : Colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
            {isSaved ? '♥ Saved' : '♡ Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sticky Premium Header Block */}
      <View style={styles.stickyHeader}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.tickerTitle}>{symbol}</Text>
            <Text style={styles.companyName}>
              {symbol === 'NVDA' ? 'NVIDIA Corporation' : symbol === 'AAPL' ? 'Apple Inc.' : symbol === 'SPY' ? 'SPDR S&P 500 ETF' : 'US Market Asset'}
            </Text>
          </View>
          <View style={styles.headerRightActions}>
            <View style={[styles.ratingBadge, { borderColor: (Colors as any)[r.finalRating?.toLowerCase()] || Colors.primary }]}>
              <Text style={[styles.ratingText, { color: (Colors as any)[r.finalRating?.toLowerCase()] || Colors.primary }]}>
                {r.finalRating || 'BUY'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceText}>${price ? price.toFixed(2) : '—'}</Text>
          <TouchableOpacity
            onPress={handleAnalyze}
            disabled={analyzing}
            style={styles.reanalyzeBtn}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.reanalyzeText}>↻ Re-analyze</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bias & Stage Row */}
        {(() => {
          const biasVal = (r.technicalAnalysis?.overallBias || technicals?.overallBias || '').toUpperCase();
          const stageVal = (r.technicalAnalysis?.trendStage || '').toUpperCase();
          
          if (!biasVal && !stageVal) return null;
          
          const isBull = biasVal === 'BULLISH';
          const isBear = biasVal === 'BEARISH';
          
          let biasColor = Colors.hold;
          let biasBg = 'rgba(245, 158, 11, 0.1)';
          let biasBorder = 'rgba(245, 158, 11, 0.2)';
          
          if (isBull) {
            biasColor = Colors.buy;
            biasBg = 'rgba(16, 185, 129, 0.1)';
            biasBorder = 'rgba(16, 185, 129, 0.2)';
          } else if (isBear) {
            biasColor = Colors.sell;
            biasBg = 'rgba(239, 68, 68, 0.1)';
            biasBorder = 'rgba(239, 68, 68, 0.2)';
          }

          let stageColor = Colors.textSecondary;
          let stageBg = 'rgba(100, 116, 139, 0.1)';
          let stageBorder = 'rgba(100, 116, 139, 0.2)';

          if (stageVal === 'ACCUMULATION') {
            stageColor = Colors.watchlist;
            stageBg = `${Colors.watchlist}15`;
            stageBorder = `${Colors.watchlist}30`;
          } else if (stageVal === 'MARKUP') {
            stageColor = Colors.buy;
            stageBg = `${Colors.buy}15`;
            stageBorder = `${Colors.buy}30`;
          } else if (stageVal === 'DISTRIBUTION') {
            stageColor = Colors.hold;
            stageBg = `${Colors.hold}15`;
            stageBorder = `${Colors.hold}30`;
          } else if (stageVal === 'MARKDOWN') {
            stageColor = Colors.sell;
            stageBg = `${Colors.sell}15`;
            stageBorder = `${Colors.sell}30`;
          } else if (stageVal === 'SIDEWAYS') {
            stageColor = Colors.hold;
            stageBg = `${Colors.hold}15`;
            stageBorder = `${Colors.hold}30`;
          }

          return (
            <View style={styles.headerMetaRow}>
              {biasVal ? (
                <View style={[styles.headerMetaBadge, { backgroundColor: biasBg, borderColor: biasBorder }]}>
                  <Text style={[styles.headerMetaBadgeText, { color: biasColor }]}>
                    BIAS: {biasVal}
                  </Text>
                </View>
              ) : null}
              {stageVal ? (
                <View style={[styles.headerMetaBadge, { backgroundColor: stageBg, borderColor: stageBorder }]}>
                  <Text style={[styles.headerMetaBadgeText, { color: stageColor }]}>
                    STAGE: {stageVal.replace('_', ' ')}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })()}

        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isInWatchlist && styles.actionBtnActive]}
            onPress={() => toggleWatchlistMutation.mutate()}
            disabled={toggleWatchlistMutation.isPending}
          >
            <StarIcon filled={isInWatchlist} />
            <Text style={[styles.actionBtnText, isInWatchlist && styles.actionBtnTextActive]}>
              {isInWatchlist ? ' Watchlisted' : ' Add to Watch'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Alerts' as any)}
          >
            <BellIcon />
            <Text style={styles.actionBtnText}> Alerts</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sticky Tab Bar Selector */}
      <View style={styles.stickyTabBar}>
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'technical', label: 'Technical' },
          { key: 'tactical', label: 'Tactical' },
          { key: 'insight', label: 'Insights' }
        ] as const).map((tab) => {
          const isActive = activeSection === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              onPress={() => setActiveSection(tab.key)}
            >
              <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
      >
        {activeSection === 'overview' && (
          <View style={styles.tabContent}>
            {/* Scores Row */}
            <View style={styles.scoresGrid}>
              {[
                { label: 'Technical', value: r.technicalScore, color: Colors.primary },
                { label: 'Fundamental', value: r.fundamentalScore, color: '#6366F1' },
                { label: 'News Catalyst', value: r.newsCatalystScore, color: Colors.hold },
                { label: 'Inst. Flow Proxy', value: r.institutionalFlowProxyScore, color: Colors.buy },
              ].map((s) => (
                <View key={s.label} style={styles.scoreCard}>
                  <Text style={styles.scoreLabel}>{s.label}</Text>
                  <Text style={[styles.scoreValue, { color: s.color }]}>
                    {s.value != null ? s.value.toFixed(0) : '—'}
                    <Text style={styles.scoreMax}>/100</Text>
                  </Text>
                </View>
              ))}
            </View>

            {/* Price Chart Card */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Price Chart (Daily)</Text>
              {isTechLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 40 }} />
              ) : (
                <MiniChart
                  data={chartPrices}
                  supportLevels={technicals?.supportLevels || []}
                  resistanceLevels={technicals?.resistanceLevels || []}
                  color={Colors.primary}
                  height={150}
                />
              )}
            </View>

            {/* TrendStoryCard (if present in backend) */}
            {r.trendStory && (() => {
              const ts = r.trendStory;
              const isUp = ts.price_summary?.day_change_percent >= 0;
              const primaryReason = ts.move_classification?.primary_reason;
              const reasonBadgeStyle = getPrimaryReasonBadgeStyle(primaryReason);

              const getDriverDescription = (driver: string) => {
                const d = driver?.toLowerCase();
                if (d === 'institution') return 'Unusually high block orders and volume pattern suggests major funds or corporate accounts.';
                if (d === 'retail') return 'Heavy social interest and small orders drive speculation. Risk of abrupt reversal remains higher.';
                if (d === 'shorts covering') return 'Fast spike driven by short sellers closing out borrows quickly to cut losses.';
                if (d === 'mixed') return 'Both retail traders and institutional desks are actively participating on the tape.';
                if (d === 'unknown') return 'Limited exchange tracking makes buyer proxy unclear. Look to volume for hints.';
                return 'Unusually high volume blocks and trading desks suggest active positioning.';
              };

              const sustainStyle = getSustainStyle(ts.story_for_layman?.is_move_sustainable);

              return (
                <View style={styles.card}>
                  <View style={styles.trendStoryHeader}>
                    <View style={styles.trendStoryTitleRow}>
                      <View style={[styles.trendArrowWrapper, { backgroundColor: isUp ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
                        {isUp ? (
                          <TrendingUpIcon color={Colors.buy} size={18} />
                        ) : (
                          <TrendingDownIcon color={Colors.sell} size={18} />
                        )}
                      </View>
                      <View>
                        <Text style={styles.trendStoryHeading}>Why the stock moved today</Text>
                        <Text style={styles.trendStorySub}>ANALYZED ON {ts.analysis_date}</Text>
                      </View>
                    </View>
                    <View style={[styles.reasonBadge, { backgroundColor: reasonBadgeStyle.bg, borderColor: reasonBadgeStyle.border }]}>
                      <Text style={[styles.reasonBadgeText, { color: reasonBadgeStyle.text }]}>{reasonBadgeStyle.label.toUpperCase()}</Text>
                    </View>
                  </View>

                  <View style={styles.laymanSection}>
                    <Text style={styles.headlineText}>"{ts.story_for_layman?.headline}"</Text>
                    <Text style={styles.explanationText}>{ts.story_for_layman?.simple_explanation}</Text>
                  </View>

                  {/* Sustainability & Driving Grid */}
                  <View style={styles.sustainGrid}>
                    <View style={styles.sustainCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <HelpIcon color={Colors.primary} size={11} />
                        <Text style={styles.sustainLabel}>Move Sustainable?</Text>
                      </View>
                      <View style={[styles.sustainBadge, { backgroundColor: sustainStyle.bg, borderColor: sustainStyle.border }]}>
                        <Text style={[styles.sustainBadgeText, { color: sustainStyle.text }]}>
                          {ts.story_for_layman?.is_move_sustainable?.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.sustainDesc}>{ts.story_for_layman?.sustainability_reason}</Text>
                    </View>

                    <View style={styles.sustainCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        <ActivityIcon color="#818CF8" size={11} />
                        <Text style={styles.sustainLabel}>Driving Force?</Text>
                      </View>
                      <Text style={styles.driverVal}>
                        {ts.story_for_layman?.who_may_be_buying_or_selling === 'shorts covering' ? 'Short Sellers Covering' : `${ts.story_for_layman?.who_may_be_buying_or_selling?.toUpperCase()} PARTICIPATION`}
                      </Text>
                      <Text style={styles.sustainDesc}>
                        {getDriverDescription(ts.story_for_layman?.who_may_be_buying_or_selling)}
                      </Text>
                    </View>
                  </View>

                  {/* Interpretation Sub-Tabs */}
                  <View style={styles.tradeTabs}>
                    <TouchableOpacity
                      style={[styles.tradeTabBtn, activeTradeTab === 'swing' && styles.tradeTabBtnActive]}
                      onPress={() => setActiveTradeTab('swing')}
                    >
                      <ZapIcon color={activeTradeTab === 'swing' ? Colors.primary : Colors.textSecondary} size={12} />
                      <Text style={[styles.tradeTabText, activeTradeTab === 'swing' && styles.tradeTabTextActive]}>Swing Setup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.tradeTabBtn, activeTradeTab === 'short' && styles.tradeTabBtnActive]}
                      onPress={() => setActiveTradeTab('short')}
                    >
                      <ShieldAlertIcon color={activeTradeTab === 'short' ? '#EC4899' : Colors.textSecondary} size={12} />
                      <Text style={[styles.tradeTabText, activeTradeTab === 'short' && styles.tradeTabTextActive]}>Short Setup</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Swing Trade Setup */}
                  {activeTradeTab === 'swing' && (() => {
                    const swingBiasStyle = getBiasBadgeStyle(ts.swing_trade_view?.trade_bias);
                    return (
                      <View style={styles.tradeViewBody}>
                        <View style={styles.tradeBiasCard}>
                          <Text style={styles.tradeBiasLabel}>Swing Trade Plan</Text>
                          <Text style={styles.tradeBiasDesc}>{ts.swing_trade_view?.entry_reason}</Text>
                          <View style={[styles.biasTag, { backgroundColor: swingBiasStyle.bg, borderColor: swingBiasStyle.border }]}>
                            <Text style={[styles.biasTagText, { color: swingBiasStyle.text }]}>{swingBiasStyle.text.toUpperCase() === '#EC4899' ? 'SHORT WATCH' : ts.swing_trade_view?.trade_bias?.replace(/_/g, ' ')?.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={styles.levelsRow}>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Entry Zone</Text>
                            <Text style={styles.levelCellVal}>${ts.swing_trade_view?.entry_zone?.low?.toFixed(2)} - ${ts.swing_trade_view?.entry_zone?.high?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Targets</Text>
                            <Text style={styles.levelCellVal}>${ts.swing_trade_view?.target_1?.toFixed(2)} / ${ts.swing_trade_view?.target_2?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Stop Loss</Text>
                            <Text style={[styles.levelCellVal, { color: Colors.sell }]}>${ts.swing_trade_view?.stop_loss?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Current Price</Text>
                            <Text style={styles.levelCellVal}>${ts.price_summary?.current_price?.toFixed(2)}</Text>
                          </View>
                        </View>

                        {ts.swing_trade_view?.wait_for_confirmation && (
                          <View style={styles.confirmBox}>
                            <Text style={styles.confirmText}>⚠️ Confirmation: {ts.swing_trade_view?.wait_for_confirmation}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Short Trade Setup */}
                  {activeTradeTab === 'short' && (() => {
                    const shortBiasStyle = getShortBiasStyle(ts.short_trade_view?.short_bias);
                    const isSqueezeHigh = ts.evidence?.short_context?.short_squeeze_risk === 'high';
                    return (
                      <View style={styles.tradeViewBody}>
                        <View style={styles.tradeBiasCard}>
                          <Text style={styles.tradeBiasLabel}>Short Trade Comment</Text>
                          <Text style={styles.tradeBiasDesc}>{ts.short_trade_view?.reason}</Text>
                          <View style={[styles.biasTag, { backgroundColor: shortBiasStyle.bg, borderColor: shortBiasStyle.border }]}>
                            <Text style={[styles.biasTagText, { color: shortBiasStyle.text }]}>{shortBiasStyle.label}</Text>
                          </View>
                        </View>

                        <View style={styles.levelsRow}>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Short Entry</Text>
                            <Text style={styles.levelCellVal}>${ts.short_trade_view?.short_entry_trigger?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Short Targets</Text>
                            <Text style={styles.levelCellVal}>${ts.short_trade_view?.short_target_1?.toFixed(2)} / ${ts.short_trade_view?.short_target_2?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Short Stop Loss</Text>
                            <Text style={[styles.levelCellVal, { color: Colors.sell }]}>${ts.short_trade_view?.short_stop_loss?.toFixed(2)}</Text>
                          </View>
                          <View style={styles.levelCell}>
                            <Text style={styles.levelCellLabel}>Squeeze Risk</Text>
                            <View style={[styles.squeezeBadge, { backgroundColor: isSqueezeHigh ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', alignSelf: 'center', marginTop: 4 }]}>
                              <Text style={[styles.squeezeBadgeText, { color: isSqueezeHigh ? Colors.sell : Colors.buy }]}>
                                {ts.evidence?.short_context?.short_squeeze_risk?.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {ts.evidence?.short_context?.summary && (
                          <View style={[styles.confirmBox, { backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Text style={[styles.confirmText, { color: Colors.sell }]}>⚠️ Warning: {ts.evidence.short_context.summary}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* Collapsible Evidence Accordion */}
                  <TouchableOpacity
                    style={styles.evidenceHeader}
                    onPress={() => setIsEvidenceExpanded(!isEvidenceExpanded)}
                  >
                    <Text style={styles.evidenceHeaderText}>📊 Evidence & Catalyst Context Table</Text>
                    <ChevronIcon direction={isEvidenceExpanded ? 'up' : 'down'} />
                  </TouchableOpacity>

                  {isEvidenceExpanded && (
                    <View style={styles.evidenceContainer}>
                      {/* Price/Vol Table */}
                      <View style={styles.tableBlock}>
                        <Text style={styles.tableTitle}>Price & Volume Metrics</Text>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Day Change %</Text><Text style={[styles.tableColVal, { color: isUp ? Colors.buy : Colors.sell }]}>{ts.price_summary?.day_change_percent?.toFixed(2)}%</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Volume / Avg Vol</Text><Text style={styles.tableColVal}>{ts.price_summary?.volume?.toLocaleString()} / {ts.price_summary?.average_volume?.toLocaleString()}</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Relative Volume</Text><Text style={styles.tableColVal}>{ts.price_summary?.relative_volume?.toFixed(2)}x</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Vol Level</Text><Text style={[styles.tableColVal, { textTransform: 'capitalize' }]}>{ts.evidence?.volume_context?.volume_interpretation?.replace('_', ' ')}</Text></View>
                        {ts.evidence?.volume_context?.summary && (
                          <Text style={styles.tableSummaryText}>{ts.evidence.volume_context.summary}</Text>
                        )}
                      </View>

                      {/* Sector & Index Performance Table */}
                      {ts.evidence?.sector_context && (
                        <View style={styles.tableBlock}>
                          <Text style={styles.tableTitle}>Sector & Index Performance</Text>
                          <View style={styles.tableRow}><Text style={styles.tableColLabel}>Sector Name</Text><Text style={styles.tableColVal}>{ts.evidence.sector_context.sector_name}</Text></View>
                          <View style={styles.tableRow}><Text style={styles.tableColLabel}>Sector Change</Text><Text style={styles.tableColVal}>{ts.evidence.sector_context.sector_change_percent > 0 ? '+' : ''}{ts.evidence.sector_context.sector_change_percent?.toFixed(2)}%</Text></View>
                          <View style={styles.tableRow}><Text style={styles.tableColLabel}>Index Change</Text><Text style={styles.tableColVal}>{ts.evidence.sector_context.index_change_percent > 0 ? '+' : ''}{ts.evidence.sector_context.index_change_percent?.toFixed(2)}%</Text></View>
                          <View style={styles.tableRow}>
                            <Text style={styles.tableColLabel}>Outperforming Sector?</Text>
                            <Text style={[styles.tableColVal, { color: ts.evidence.sector_context.is_stock_outperforming_sector ? Colors.buy : Colors.textSecondary }]}>
                              {ts.evidence.sector_context.is_stock_outperforming_sector ? 'YES' : 'NO'}
                            </Text>
                          </View>
                          {ts.evidence.sector_context.summary && (
                            <Text style={styles.tableSummaryText}>{ts.evidence.sector_context.summary}</Text>
                          )}
                        </View>
                      )}

                      {/* Technical Phrasings */}
                      <View style={styles.tableBlock}>
                        <Text style={styles.tableTitle}>Technical Indicator Phrasings</Text>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Daily Trend Bias</Text><Text style={styles.tableColVal}>{ts.evidence?.technical_context?.trend}</Text></View>
                        <View style={styles.tableRow}>
                          <Text style={styles.tableColLabel}>Aggressive Buying?</Text>
                          <Text style={styles.tableColVal}>
                            {ts.evidence?.technical_context?.rsi > 70 ? 'Aggressive Buying (Cooldown risk)' :
                             ts.evidence?.technical_context?.rsi < 30 ? 'Aggressive Selling (Rebound risk)' : 'Balanced buying/selling'}
                          </Text>
                        </View>
                        <View style={styles.tableRow}>
                          <Text style={styles.tableColLabel}>Sellers Area (Resistance)</Text>
                          <Text style={[styles.tableColVal, { color: Colors.sell }]}>
                            {ts.evidence?.technical_context?.resistance_level ? `$${ts.evidence.technical_context.resistance_level.toFixed(2)}` : 'None detected'}
                          </Text>
                        </View>
                        <View style={styles.tableRow}>
                          <Text style={styles.tableColLabel}>VWAP Position</Text>
                          <Text style={styles.tableColVal}>
                            {ts.evidence?.technical_context?.vwap_position === 'above' ? 'Above VWAP (Positive momentum)' :
                             ts.evidence?.technical_context?.vwap_position === 'below' ? 'Below VWAP (Negative momentum)' : 'Near VWAP'}
                          </Text>
                        </View>
                        {ts.evidence?.technical_context?.summary && (
                          <Text style={styles.tableSummaryText}>{ts.evidence.technical_context.summary}</Text>
                        )}
                      </View>

                      {/* Short Interest Metrics */}
                      <View style={styles.tableBlock}>
                        <Text style={styles.tableTitle}>Short Interest Metrics</Text>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>SI %</Text><Text style={styles.tableColVal}>{ts.evidence?.short_context?.short_interest_percent != null ? `${ts.evidence?.short_context?.short_interest_percent}%` : 'N/A'}</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Days to Cover</Text><Text style={styles.tableColVal}>{ts.evidence?.short_context?.days_to_cover || 'N/A'}</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Borrow Available?</Text><Text style={[styles.tableColVal, { color: ts.evidence?.short_context?.borrow_available ? Colors.buy : Colors.sell }]}>{ts.evidence?.short_context?.borrow_available ? 'YES' : 'NO'}</Text></View>
                        <View style={styles.tableRow}><Text style={styles.tableColLabel}>Squeeze Risk</Text><Text style={styles.tableColVal}>{ts.evidence?.short_context?.short_squeeze_risk}</Text></View>
                      </View>

                      {/* News Catalyst Timeline */}
                      {ts.evidence?.news_catalysts && ts.evidence.news_catalysts.length > 0 && (
                        <View style={styles.tableBlock}>
                          <Text style={styles.tableTitle}>News Catalyst Timeline</Text>
                          {ts.evidence.news_catalysts.map((news: any, nIdx: number) => (
                            <View key={nIdx} style={styles.newsItem}>
                              <View style={styles.newsItemHeader}>
                                <Text style={styles.newsMeta}>{news.source} · {new Date(news.published_at).toLocaleDateString()}</Text>
                                <View style={[styles.newsImpactBadge, {
                                  backgroundColor: news.impact === 'positive' ? 'rgba(16, 185, 129, 0.1)' :
                                                   news.impact === 'negative' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                  borderColor: news.impact === 'positive' ? 'rgba(16, 185, 129, 0.2)' :
                                               news.impact === 'negative' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                }]}>
                                  <Text style={[styles.newsImpactText, {
                                    color: news.impact === 'positive' ? Colors.buy :
                                           news.impact === 'negative' ? Colors.sell : Colors.textMuted
                                  }]}>{news.impact?.toUpperCase()} IMPACT</Text>
                                </View>
                              </View>
                              <Text style={styles.newsHeadline}>{news.headline}</Text>
                              <Text style={styles.newsSummary}>{news.summary}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Earnings Catalyst Report */}
                      {ts.evidence?.earnings_catalyst && ts.evidence.earnings_catalyst.has_recent_earnings && (
                        <View style={styles.tableBlock}>
                          <Text style={styles.tableTitle}>Earnings Catalyst Report</Text>
                          <View style={styles.earningsGrid}>
                            <View style={styles.earningsCell}>
                              <Text style={styles.earningsCellLabel}>EPS Surprise</Text>
                              <Text style={[styles.earningsCellVal, {
                                color: (ts.evidence.earnings_catalyst.eps_surprise ?? 0) >= 0 ? Colors.buy : Colors.sell
                              }]}>
                                {ts.evidence.earnings_catalyst.eps_surprise != null ? `${ts.evidence.earnings_catalyst.eps_surprise > 0 ? '+' : ''}${ts.evidence.earnings_catalyst.eps_surprise}%` : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.earningsCell}>
                              <Text style={styles.earningsCellLabel}>Revenue Surprise</Text>
                              <Text style={[styles.earningsCellVal, {
                                color: (ts.evidence.earnings_catalyst.revenue_surprise ?? 0) >= 0 ? Colors.buy : Colors.sell
                              }]}>
                                {ts.evidence.earnings_catalyst.revenue_surprise != null ? `${ts.evidence.earnings_catalyst.revenue_surprise > 0 ? '+' : ''}${ts.evidence.earnings_catalyst.revenue_surprise}%` : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.earningsCell}>
                              <Text style={styles.earningsCellLabel}>Future Guidance</Text>
                              <Text style={[styles.earningsCellVal, { color: '#818CF8' }]}>
                                {ts.evidence.earnings_catalyst.guidance_change || 'N/A'}
                              </Text>
                            </View>
                          </View>
                          {ts.evidence.earnings_catalyst.summary && (
                            <Text style={styles.tableSummaryText}>{ts.evidence.earnings_catalyst.summary}</Text>
                          )}
                        </View>
                      )}

                      {/* Recent Analyst Upgrades / Downgrades */}
                      {ts.evidence?.analyst_actions && ts.evidence.analyst_actions.length > 0 && (
                        <View style={styles.tableBlock}>
                          <Text style={styles.tableTitle}>Recent Analyst Actions</Text>
                          {ts.evidence.analyst_actions.map((act: any, aIdx: number) => (
                            <View key={aIdx} style={styles.analystItem}>
                              <View style={styles.newsItemHeader}>
                                <Text style={styles.analystFirm}>{act.firm}</Text>
                                <View style={[styles.newsImpactBadge, {
                                  backgroundColor: act.action === 'upgrade' ? 'rgba(16, 185, 129, 0.1)' :
                                                   act.action === 'downgrade' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                  borderColor: act.action === 'upgrade' ? 'rgba(16, 185, 129, 0.2)' :
                                               act.action === 'downgrade' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                }]}>
                                  <Text style={[styles.newsImpactText, {
                                    color: act.action === 'upgrade' ? Colors.buy :
                                           act.action === 'downgrade' ? Colors.sell : Colors.textMuted
                                  }]}>{act.action?.toUpperCase()}</Text>
                                </View>
                              </View>
                              <Text style={styles.analystSummary}>{act.summary}</Text>
                              {act.new_target && (
                                <Text style={styles.analystTarget}>
                                  Price Target: {act.old_target ? `$${act.old_target} → ` : ''}${act.new_target}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Consensus Box */}
                  {ts.final_summary && (
                    <View style={styles.consensusBox}>
                      <Text style={styles.consensusArrow}>ℹ️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.consensusTitle}>Analyst Consensus Summary</Text>
                        <Text style={styles.consensusText}>
                          "{ts.final_summary.one_line_story}" — {ts.final_summary.risk_warning}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Signal Correlation Section */}
            {r.signalCorrelation && (() => {
              const sc = r.signalCorrelation;
              const isGreen = sc.finalZone === 'GREEN_ZONE';
              const isRed = sc.finalZone === 'RED_ZONE';
              
              let zoneColor = Colors.hold;
              let zoneBg = 'rgba(245, 158, 11, 0.1)';
              let zoneBorder = 'rgba(245, 158, 11, 0.2)';
              
              if (isGreen) {
                zoneColor = Colors.buy;
                zoneBg = 'rgba(16, 185, 129, 0.1)';
                zoneBorder = 'rgba(16, 185, 129, 0.2)';
              } else if (isRed) {
                zoneColor = Colors.sell;
                zoneBg = 'rgba(239, 68, 68, 0.1)';
                zoneBorder = 'rgba(239, 68, 68, 0.2)';
              }

              const categoryLabels: Record<string, string> = {
                priceTrendAlignment: 'Price Trend Alignment',
                volumeConfirmation: 'Volume Confirmation',
                momentumIndicators: 'Momentum Indicators',
                movingAverageStructure: 'Moving Average Structure',
                vwapPosition: 'VWAP Position',
                supportResistanceRiskReward: 'Support/Resistance Risk-Reward',
                sectorIndexAlignment: 'Sector/Index Alignment',
                shortInterestContext: 'Short Interest Context',
                newsCatalystConfirmation: 'News/Catalyst Confirmation',
                institutionalFlowProxy: 'Institutional Flow Proxy',
              };

              return (
                <View style={[styles.card, { borderColor: zoneBorder }]}>
                  {/* Header Row */}
                  <View style={styles.scHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <LayersIcon color={Colors.primary} size={16} />
                      <Text style={styles.scTitle}>{sc.correlationName || 'Signal Correlation'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.scScoreLabel}>SCORE</Text>
                        <Text style={styles.scScoreVal}>
                          {sc.correlationScore}
                          <Text style={{ fontSize: 10, color: Colors.textSecondary }}>/100</Text>
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.scSubText}>
                    Analyzed on {sc.analysisDate} · Confidence: {sc.confidenceLevel}
                  </Text>

                  {/* Gradient Bar Visual */}
                  {sc.uiRecommendation?.showGradientBar && (
                    <View style={styles.scGradientContainer}>
                      <View style={styles.scGradientTrack}>
                        {/* Red Segment (Left) */}
                        <View style={[styles.scGradientSegment, { backgroundColor: '#EF4444', borderTopLeftRadius: 3, borderBottomLeftRadius: 3 }]} />
                        {/* Yellow Segment (Middle) */}
                        <View style={[styles.scGradientSegment, { backgroundColor: '#F59E0B' }]} />
                        {/* Green Segment (Right) */}
                        <View style={[styles.scGradientSegment, { backgroundColor: '#10B981', borderTopRightRadius: 3, borderBottomRightRadius: 3 }]} />
                        
                        {/* Pointer / Marker pointing up from below */}
                        <View 
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: `${sc.correlationScore ?? 50}%`,
                            marginLeft: -20,
                            width: 40,
                            height: 42,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Svg width={40} height={42} viewBox="0 0 40 42">
                            <Path d="M20 0 L23.5 16 L16.5 16 Z" fill="#38bdf8" />
                            <Circle cx={20} cy={29} r={12} fill="#0F172A" stroke="#38bdf8" strokeWidth={2} />
                          </Svg>
                          <Text style={{
                            position: 'absolute',
                            left: 8,
                            top: 23,
                            width: 24,
                            textAlign: 'center',
                            fontSize: 9,
                            fontWeight: 'bold',
                            fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                            color: '#38bdf8',
                          }}>
                            {sc.correlationScore}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Layman Summary Callout */}
                  <View style={styles.scLaymanContainer}>
                    <Text style={styles.scLaymanBody}>{sc.laymanSummary}</Text>
                  </View>

                  {/* Support & Resistance context */}
                  {sc.supportResistanceContext && (
                    <View style={styles.scSupportCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={styles.scSupportTitle}>Support & Resistance Context</Text>
                        <View style={[styles.scSupportBadge, {
                          backgroundColor: sc.supportResistanceContext.riskRewardView === 'FAVORABLE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          borderColor: sc.supportResistanceContext.riskRewardView === 'FAVORABLE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        }]}>
                          <Text style={[styles.scSupportBadgeText, {
                            color: sc.supportResistanceContext.riskRewardView === 'FAVORABLE' ? Colors.buy : Colors.sell
                          }]}>
                            R/R: {sc.supportResistanceContext.riskRewardView?.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.scSupportGrid}>
                        <View style={styles.scSupportGridCell}>
                          <Text style={styles.scSupportCellLabel}>Support</Text>
                          <Text style={styles.scSupportCellVal}>
                            {sc.supportResistanceContext.nearestSupport ? `$${sc.supportResistanceContext.nearestSupport.toFixed(2)}` : 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.scSupportGridCell}>
                          <Text style={styles.scSupportCellLabel}>Dist. Support</Text>
                          <Text style={[styles.scSupportCellVal, { color: Colors.buy }]}>
                            {sc.supportResistanceContext.distanceToSupportPercent != null ? `${sc.supportResistanceContext.distanceToSupportPercent.toFixed(1)}%` : 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.scSupportGridCell}>
                          <Text style={styles.scSupportCellLabel}>Resistance</Text>
                          <Text style={styles.scSupportCellVal}>
                            {sc.supportResistanceContext.nearestResistance ? `$${sc.supportResistanceContext.nearestResistance.toFixed(2)}` : 'N/A'}
                          </Text>
                        </View>
                        <View style={styles.scSupportGridCell}>
                          <Text style={styles.scSupportCellLabel}>Dist. Resistance</Text>
                          <Text style={[styles.scSupportCellVal, { color: Colors.sell }]}>
                            {sc.supportResistanceContext.distanceToResistancePercent != null ? `${sc.supportResistanceContext.distanceToResistancePercent.toFixed(1)}%` : 'N/A'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.scSupportDesc}>{sc.supportResistanceContext.explanation}</Text>
                    </View>
                  )}

                  {/* Accordion Toggle */}
                  <TouchableOpacity 
                    style={styles.scDetailsToggle} 
                    onPress={() => toggleSection('signalCorrelation')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIcon color={Colors.primary} size={14} />
                      <Text style={styles.scDetailsToggleText}>Weighted Category Scores & Signals</Text>
                    </View>
                    <ChevronIcon direction={expandedSections['signalCorrelation'] ? 'up' : 'down'} />
                  </TouchableOpacity>

                  {/* Expanded Accordion Details */}
                  {expandedSections['signalCorrelation'] && (
                    <View style={{ marginTop: 12 }}>
                      <View style={styles.scDriversBox}>
                        <View style={styles.scDriverBlock}>
                          <Text style={styles.scDriverBlockLabel}>Strongest Positive Driver</Text>
                          <Text style={styles.scDriverBlockText}>
                            {sc.correlationEvidence?.strongestPositiveEvidence || 'None.'}
                          </Text>
                        </View>
                        <View style={[styles.scDriverBlock, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 8 }]}>
                          <Text style={styles.scDriverBlockLabel}>Strongest Negative Risk</Text>
                          <Text style={styles.scDriverBlockText}>
                            {sc.correlationEvidence?.strongestNegativeEvidence || 'None.'}
                          </Text>
                        </View>
                      </View>

                      {/* 10 Category Breakdown list */}
                      <View style={styles.scCategoryGrid}>
                        {Object.entries(sc.signalScores).map(([key, val]: any) => (
                          <View key={key} style={styles.scCategoryCard}>
                            <View style={styles.scCategoryHeader}>
                              <View style={{ flex: 1, paddingRight: 4 }}>
                                <Text style={styles.scCategoryName}>{categoryLabels[key] || key}</Text>
                                <View style={[styles.scCategoryStatusBadge, {
                                  backgroundColor: val.status === 'POSITIVE' ? 'rgba(16, 185, 129, 0.1)' :
                                                   val.status === 'NEGATIVE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                }]}>
                                  <Text style={[styles.scCategoryStatusText, {
                                    color: val.status === 'POSITIVE' ? Colors.buy :
                                           val.status === 'NEGATIVE' ? Colors.sell : Colors.textMuted
                                  }]}>{val.status}</Text>
                                </View>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={styles.scCategoryScoreVal}>{val.score}</Text>
                                <Text style={styles.scCategoryScoreMax}>/{val.maxScore}</Text>
                              </View>
                            </View>
                            <Text style={styles.scCategoryEvidence}>{val.evidence}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Confirmations List */}
                      {sc.confirmationNeeded && (
                        <View style={styles.scDriversBox}>
                          <Text style={[styles.scDriverBlockLabel, { color: Colors.buy, marginBottom: 4 }]}>Confirm Green Setup:</Text>
                          {(sc.confirmationNeeded.forGreenZone || []).map((item: string, i: number) => (
                            <Text key={i} style={styles.scBulletText}>• {item}</Text>
                          ))}

                          <Text style={[styles.scDriverBlockLabel, { color: Colors.primary, marginTop: 8, marginBottom: 4 }]}>To Upgrade to Green:</Text>
                          {(sc.confirmationNeeded.forYellowToGreenUpgrade || []).map((item: string, i: number) => (
                            <Text key={i} style={styles.scBulletText}>• {item}</Text>
                          ))}

                          <Text style={[styles.scDriverBlockLabel, { color: Colors.sell, marginTop: 8, marginBottom: 4 }]}>Downside Triggers:</Text>
                          {(sc.confirmationNeeded.forRedZoneWarning || []).map((item: string, i: number) => (
                            <Text key={i} style={styles.scBulletText}>• {item}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Summary Block */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <ActivityIcon />
                <Text style={styles.sectionHeading}>Executive Summary & Outlook</Text>
              </View>
              <Text style={styles.bodyText}>{r.executiveSummary}</Text>
            </View>

            {/* Catalysts & Risks side-by-side */}
            <View style={styles.splitRow}>
              <View style={[styles.card, styles.splitCard]}>
                <View style={styles.sectionHeader}>
                  <CheckIcon />
                  <Text style={styles.sectionHeading}>Key Catalysts</Text>
                </View>
                {(r.keyCatalysts || []).map((c: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={{ marginTop: 2.5, marginRight: 6 }}>
                      <CheckIcon color={Colors.buy} size={14} />
                    </View>
                    <Text style={styles.bulletText}>{c}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.card, styles.splitCard]}>
                <View style={styles.sectionHeader}>
                  <AlertIcon />
                  <Text style={styles.sectionHeading}>Key Risks</Text>
                </View>
                {(r.keyRisks || []).map((rk: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={{ marginTop: 2.5, marginRight: 6 }}>
                      <AlertIcon color={Colors.sell} size={14} />
                    </View>
                    <Text style={styles.bulletText}>{rk}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Multibagger Potential */}
            {r.multibaggerProbability && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <SparklesIcon />
                  <Text style={styles.sectionHeading}>Multibagger Assessment</Text>
                </View>
                <View style={styles.multibaggerRow}>
                  <View>
                    <Text style={styles.sustainLabel}>Probability Rating</Text>
                    <Text style={[styles.ratingVal, {
                      color: r.multibaggerProbability?.rating === 'VERY_HIGH' ? Colors.buy :
                             r.multibaggerProbability?.rating === 'HIGH' ? Colors.primary : Colors.hold
                    }]}>
                      {r.multibaggerProbability?.rating?.replace(/_/g, ' ')}
                    </Text>
                  </View>
                  <Text style={styles.multibaggerDesc}>{r.multibaggerProbability?.reason}</Text>
                </View>
                {r.multibaggerProbability?.requiredConditions?.length > 0 && (
                  <View style={styles.conditionsWrapper}>
                    <Text style={styles.subTitleText}>Required Conditions:</Text>
                    {r.multibaggerProbability.requiredConditions.map((cond: string, idx: number) => (
                      <Text key={idx} style={styles.condBullet}>• {cond}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Inst Flow Warning */}
            {user?.role !== 'BASIC' ? (
              <View style={[styles.card, styles.flowCard]}>
                <View style={styles.sectionHeader}>
                  <AlertIcon color={Colors.hold} />
                  <Text style={styles.flowHeading}>Institutional Flow Proxy</Text>
                </View>
                <Text style={styles.flowText}>{r.institutionalFlowSummary}</Text>
              </View>
            ) : (
              <View style={styles.restrictedSection}>
                <Text style={styles.restrictedTitle}>Fundamental & Inst. Flow Proxy (Locked)</Text>
                <Text style={styles.restrictedText}>
                  Institutional flows and detailed metrics are locked. Upgrade to PRO or MAX level to view.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeSection === 'technical' && (
          <View style={styles.tabContent}>
            {/* Market Cycle Stage Graphical Timeline */}
            {(() => {
              const currentStage = (r.technicalAnalysis?.trendStage || 'UNKNOWN').toUpperCase();
              const stages = [
                { id: 'ACCUMULATION', label: 'Accumulation', stage: 'Stage 1', icon: LayersIcon, color: Colors.watchlist },
                { id: 'MARKUP', label: 'Markup', stage: 'Stage 2', icon: TrendingUpIcon, color: Colors.buy },
                { id: 'DISTRIBUTION', label: 'Distribution', stage: 'Stage 3', icon: ActivityIcon, color: Colors.hold },
                { id: 'MARKDOWN', label: 'Markdown', stage: 'Stage 4', icon: TrendingDownIcon, color: Colors.sell },
              ];

              const isSideways = currentStage === 'SIDEWAYS';

              return (
                <View style={styles.wyckoffCard}>
                  <View style={styles.wyckoffHeader}>
                    <Text style={styles.wyckoffHeaderLabel}>Market Cycle Phase</Text>
                    {isSideways ? (
                      <View style={styles.sidewaysBadge}>
                        <Text style={styles.sidewaysBadgeText}>Current Stage: Sideways Range</Text>
                      </View>
                    ) : (
                      <View style={styles.activeStageBadge}>
                        <Text style={styles.activeStageBadgeText}>Current Stage: {currentStage}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.wyckoffStepsRow}>
                    {stages.map((st, idx) => {
                      const isActive = currentStage === st.id;
                      const isHighlightedSideways = isSideways && (st.id === 'ACCUMULATION' || st.id === 'DISTRIBUTION');
                      const Icon = st.icon;

                      let cardBorderColor = Colors.border;
                      let cardBg = 'rgba(255,255,255,0.01)';
                      let iconBg = Colors.card;
                      let iconColor = Colors.textMuted;
                      let textColor = Colors.textSecondary;
                      let stageTextColor = Colors.textMuted;

                      if (isActive) {
                        cardBorderColor = st.color;
                        cardBg = `${st.color}15`;
                        iconBg = st.color;
                        iconColor = Colors.white;
                        textColor = Colors.text;
                        stageTextColor = Colors.text;
                      } else if (isHighlightedSideways) {
                        cardBorderColor = Colors.hold;
                        cardBg = `${Colors.hold}08`;
                        iconBg = `${Colors.hold}1a`;
                        iconColor = Colors.hold;
                        textColor = Colors.hold;
                        stageTextColor = Colors.hold;
                      }

                      return (
                        <View key={st.id} style={[styles.wyckoffStepCard, { borderColor: cardBorderColor, backgroundColor: cardBg }]}>
                          {isActive && (
                            <View style={[styles.wyckoffPulseCircle, { backgroundColor: st.color }]} />
                          )}
                          <Text style={[styles.wyckoffStepNum, { color: stageTextColor }]}>{st.stage}</Text>
                          <View style={[styles.wyckoffIconWrapper, { backgroundColor: iconBg }]}>
                            {st.id === 'ACCUMULATION' ? (
                              <LayersIcon color={iconColor} size={15} />
                            ) : st.id === 'MARKUP' ? (
                              <TrendingUpIcon color={iconColor} size={15} />
                            ) : st.id === 'DISTRIBUTION' ? (
                              <ActivityIcon color={iconColor} size={15} />
                            ) : (
                              <TrendingDownIcon color={iconColor} size={15} />
                            )}
                          </View>
                          <Text style={[styles.wyckoffStepLabel, { color: textColor }]}>{st.label}</Text>
                        </View>
                      );
                    })}
                  </View>

                  {isSideways && (
                    <View style={styles.wyckoffSidewaysNotice}>
                      <AlertIcon color={Colors.hold} />
                      <Text style={styles.wyckoffSidewaysNoticeText}>
                        The stock is currently consolidating sideways within a range, indicating a consolidation base (Accumulation) or top (Distribution) before transitioning to the next major markup/markdown phase.
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {isTechLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 40 }} />
            ) : technicals ? (
              <View style={{ gap: 16 }}>
                {/* 9-parameter Grid */}
                <View style={styles.techIndicatorsGrid}>
                  {(() => {
                    const rsiValStr = technicals.rsi14 != null
                      ? `${technicals.rsi14.toFixed(1)}${
                          technicals.rsi14Prev != null
                            ? ` (${technicals.rsi14 > technicals.rsi14Prev ? '↗' : '↘'} ${technicals.rsi14Prev.toFixed(1)})`
                            : ''
                        }`
                      : '—';
                    const rsiAlert = technicals.rsi14 != null && technicals.rsi14 < 30 ? 'Oversold' :
                                     technicals.rsi14 != null && technicals.rsi14 > 70 ? 'Overbought' : null;

                    return [
                      { label: 'RSI (14)', value: rsiValStr, alert: rsiAlert },
                      { label: 'MACD', value: technicals.macdLine != null ? `${technicals.macdLine.toFixed(3)}` : '—' },
                      { label: 'EMA 20', value: technicals.ema20 != null ? `$${technicals.ema20.toFixed(2)}` : '—' },
                      { label: 'EMA 50', value: technicals.ema50 != null ? `$${technicals.ema50.toFixed(2)}` : '—' },
                      { label: 'EMA 200', value: technicals.ema200 != null ? `$${technicals.ema200.toFixed(2)}` : '—' },
                      { label: 'ATR (14)', value: technicals.atr14 != null ? `${technicals.atr14.toFixed(2)}` : '—' },
                      { label: 'ADX (14)', value: technicals.adx14 != null ? `${technicals.adx14.toFixed(1)}` : '—' },
                      { label: 'Rel. Volume', value: technicals.relVolume != null ? `${technicals.relVolume.toFixed(2)}x` : '—' },
                      { label: 'VWAP', value: technicals.vwap != null ? `$${technicals.vwap.toFixed(2)}` : '—' },
                    ].map((ind) => (
                      <View key={ind.label} style={styles.techIndicatorCard}>
                        <Text style={styles.techIndicatorLabel}>{ind.label}</Text>
                        <Text style={[styles.techIndicatorVal, ind.label === 'RSI (14)' && { fontSize: 10.5 }]}>{ind.value}</Text>
                        {ind.alert && (
                          <Text style={{ fontSize: 9, color: Colors.hold, fontWeight: '800', marginTop: 2 }}>
                            {ind.alert?.toUpperCase()}
                          </Text>
                        )}
                      </View>
                    ));
                  })()}
                </View>

                {/* Technical Bias Card */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    Technical Bias:{' '}
                    <Text style={{
                      color: technicals.overallBias === 'BULLISH' ? Colors.buy :
                             technicals.overallBias === 'BEARISH' ? Colors.sell : Colors.hold
                    }}>
                      {technicals.overallBias}
                    </Text>
                  </Text>
                  <View style={styles.signalsList}>
                    {(technicals.signals || []).map((s: string, idx: number) => {
                      const lowS = s.toLowerCase();
                      const isBull = lowS.includes('bullish') || lowS.includes('buy') || lowS.includes('crossover');
                      const isBear = lowS.includes('bearish') || lowS.includes('sell');
                      return (
                        <View key={idx} style={styles.signalRow}>
                          {isBull ? (
                            <TrendingUpIcon size={14} color={Colors.buy} />
                          ) : isBear ? (
                            <TrendingDownIcon size={14} color={Colors.sell} />
                          ) : (
                            <ActivityIcon color={Colors.primary} />
                          )}
                          <Text style={styles.signalText}>{s}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* S/R levels */}
                <View style={styles.splitRow}>
                  <View style={[styles.card, styles.splitCard]}>
                    <Text style={styles.sectionTitle}>Support Levels</Text>
                    {(technicals.supportLevels || []).map((l: number, idx: number) => (
                      <Text key={idx} style={styles.supPrice}>${l.toFixed(2)}</Text>
                    ))}
                  </View>
                  <View style={[styles.card, styles.splitCard]}>
                    <Text style={styles.sectionTitle}>Resistance Levels</Text>
                    {(technicals.resistanceLevels || []).map((l: number, idx: number) => (
                      <Text key={idx} style={styles.resPrice}>${l.toFixed(2)}</Text>
                    ))}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.bodyText}>Technical indicators are not available for this asset.</Text>
              </View>
            )}
          </View>
        )}

        {activeSection === 'tactical' && (
          <View style={styles.tabContent}>
            {/* Short-Term View */}
            {r.shortTermView && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Short-Term View ({r.shortTermView.horizon})</Text>
                <View style={styles.tacticalGrid}>
                  {r.shortTermView.entryZone && (
                    <View style={styles.tacticalCell}>
                      <Text style={styles.tacticalLabel}>Entry Zone</Text>
                      <Text style={styles.tacticalVal}>
                        ${r.shortTermView.entryZone.low?.toFixed(2)} – ${r.shortTermView.entryZone.high?.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {r.shortTermView.stopLoss && (
                    <View style={styles.tacticalCell}>
                      <Text style={styles.tacticalLabel}>Stop Loss</Text>
                      <Text style={[styles.tacticalVal, { color: Colors.sell }]}>
                        ${(r.shortTermView.stopLoss.price || r.shortTermView.stopLoss.low)?.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  {r.shortTermView.targets?.[0] && (
                    <View style={styles.tacticalCell}>
                      <Text style={styles.tacticalLabel}>Target Price</Text>
                      <Text style={[styles.tacticalVal, { color: Colors.buy }]}>
                        ${r.shortTermView.targets[0].price?.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Swing Trade Horizon Setup */}
            {r.tacticalHorizonView && (() => {
              const th = r.tacticalHorizonView;
              const isBull = th.bias === 'BULLISH';
              return (
                <View style={{ gap: 16 }}>
                  <View style={[styles.card, { borderColor: 'rgba(20, 184, 166, 0.2)', backgroundColor: 'rgba(20, 184, 166, 0.02)' }]}>
                    <View style={styles.sectionHeader}>
                      <ActivityIcon color={Colors.primary} />
                      <Text style={styles.sectionHeading}>Swing Trade Setup</Text>
                      <View style={[styles.biasBadge, { backgroundColor: isBull ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={[styles.biasBadgeText, { color: isBull ? Colors.buy : Colors.sell }]}>{th.bias} Bias</Text>
                      </View>
                    </View>

                    {/* SUGGESTED TRADING PARAMETERS */}
                    <View style={styles.suggestedGrid}>
                      <View style={styles.suggestedCell}>
                        <Text style={styles.suggestedLabel}>Current Price</Text>
                        <Text style={styles.suggestedVal}>
                          {price ? `$${price.toFixed(2)}` : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.suggestedCell}>
                        <Text style={styles.suggestedLabel}>Entry Zone</Text>
                        <Text style={styles.suggestedVal}>
                          {r.swingTradeView?.accumulationZone?.low != null && r.swingTradeView?.accumulationZone?.high != null
                            ? `$${r.swingTradeView.accumulationZone.low.toFixed(2)} - $${r.swingTradeView.accumulationZone.high.toFixed(2)}`
                            : th.suggestedEntryPrice
                              ? `$${th.suggestedEntryPrice.toFixed(2)}`
                              : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.suggestedCell}>
                        <Text style={styles.suggestedLabel}>Target Exit</Text>
                        <Text style={styles.suggestedVal}>
                          {th.suggestedExitPrice
                            ? `$${th.suggestedExitPrice.toFixed(2)}`
                            : r.swingTradeView?.targets?.[0]?.price
                              ? `$${r.swingTradeView.targets[0].price.toFixed(2)}`
                              : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.suggestedCell}>
                        <Text style={styles.suggestedLabel}>Stop Loss</Text>
                        <Text style={[styles.suggestedVal, { color: Colors.sell }]}>
                          {th.stopLossPrice
                            ? `$${th.stopLossPrice.toFixed(2)}`
                            : r.swingTradeView?.stopLoss?.price
                              ? `$${r.swingTradeView.stopLoss.price.toFixed(2)}`
                              : r.swingTradeView?.stopLoss?.low
                                ? `$${r.swingTradeView.stopLoss.low.toFixed(2)}`
                                : 'N/A'}
                        </Text>
                      </View>
                      <View style={styles.suggestedCell}>
                        <Text style={styles.suggestedLabel}>Risk/Reward</Text>
                        <Text style={[styles.suggestedVal, { color: Colors.hold }]}>
                          {r.swingTradeView?.riskReward || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Sourcing details / Timeframe Alignment */}
                    <View style={{ gap: 12, marginVertical: 8 }}>
                      {/* Collapse Daily Trend details */}
                      <View style={styles.collapsibleBlock}>
                        <TouchableOpacity style={styles.collapsibleBlockHeader} onPress={() => toggleSection('dailyTrend')}>
                          <Text style={styles.collapsibleBlockTitle}>📈 Daily Trend Context ({th.dailyTrend?.trend || 'N/A'})</Text>
                          <ChevronIcon direction={expandedSections['dailyTrend'] ? 'up' : 'down'} />
                        </TouchableOpacity>
                        {expandedSections['dailyTrend'] && (
                          <View style={styles.collapsibleBlockBody}>
                            <Text style={styles.bodyText}>
                              <Text style={{ fontWeight: '700' }}>Status: </Text>
                              {th.dailyTrend?.trend} ({th.dailyTrend?.barCount} daily bars)
                            </Text>
                            <Text style={[styles.bodyText, { marginTop: 4 }]}>
                              <Text style={{ fontWeight: '700' }}>Reasoning: </Text>
                              {th.dailyTrend?.analysis}
                            </Text>
                            {th.dailyTrend?.laymanExplanation && (
                              <Text style={styles.laymanQuote}>"Layman: {th.dailyTrend.laymanExplanation}"</Text>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Swing Setup Card */}
                      {th.swingSetup && (
                        <View style={styles.collapsibleBlock}>
                          <Text style={styles.collapsibleBlockTitle}>🔄 Swing Setup Pattern ({th.swingSetup.setup})</Text>
                          <Text style={[styles.bodyText, { marginTop: 4 }]}>{th.swingSetup.analysis}</Text>
                        </View>
                      )}

                      {/* Entry Timing Card */}
                      {th.entryTiming && (
                        <View style={styles.collapsibleBlock}>
                          <Text style={styles.collapsibleBlockTitle}>⏱️ Entry Timing Trigger ({th.entryTiming.trigger})</Text>
                          <Text style={[styles.bodyText, { marginTop: 4 }]}>{th.entryTiming.analysis}</Text>
                        </View>
                      )}
                    </View>

                    {/* Support / Resistance Levels nearest first */}
                    <View style={styles.splitRow}>
                      <View style={[styles.card, styles.splitCard, { padding: 12 }]}>
                        <Text style={styles.sectionTitle}>Nearest Support</Text>
                        {th.supportLevels && th.supportLevels.length > 0 ? (
                          th.supportLevels.slice(0, 5).map((level: any, idx: number) => (
                            <View key={idx} style={styles.levelRow}>
                              <Text style={styles.supPrice}>S{idx + 1} {level.tests != null && `(${level.tests}x)`}</Text>
                              <Text style={styles.supPrice}>${level.price?.toFixed(2)}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.bodyText}>None</Text>
                        )}
                      </View>
                      <View style={[styles.card, styles.splitCard, { padding: 12 }]}>
                        <Text style={styles.sectionTitle}>Nearest Resistance</Text>
                        {th.resistanceLevels && th.resistanceLevels.length > 0 ? (
                          th.resistanceLevels.slice(0, 5).map((level: any, idx: number) => (
                            <View key={idx} style={styles.levelRow}>
                              <Text style={styles.resPrice}>R{idx + 1} {level.tests != null && `(${level.tests}x)`}</Text>
                              <Text style={styles.resPrice}>${level.price?.toFixed(2)}</Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.bodyText}>None</Text>
                        )}
                      </View>
                    </View>

                    {/* Detailed Risk Indicators */}
                    {th.riskMetrics && (
                      <View style={[styles.card, { marginTop: 8 }]}>
                        <Text style={styles.sectionTitle}>Tactical Risk Controls</Text>
                        <View style={{ gap: 8 }}>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>ATR: </Text>
                            {th.riskMetrics.atr ? `$${th.riskMetrics.atr.toFixed(2)}` : 'N/A'} ({th.riskMetrics.atrAnalysis})
                          </Text>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>VWAP: </Text>
                            {th.riskMetrics.vwap ? `$${th.riskMetrics.vwap.toFixed(2)}` : 'N/A'} ({th.riskMetrics.vwapAnalysis})
                          </Text>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>S/R & Volume: </Text>
                            {th.riskMetrics.volumeStatus || 'Stable'} ({th.riskMetrics.supportResistanceAnalysis})
                          </Text>
                          <Text style={[styles.bodyText, { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 6, fontStyle: 'italic' }]}>
                            {th.riskMetrics.analysis}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Catalyst Filter Validation */}
                    {th.catalysts && (
                      <View style={[styles.card, { marginTop: 8 }]}>
                        <Text style={styles.sectionTitle}>Catalyst Filter Validation</Text>
                        <View style={{ gap: 8 }}>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>News: </Text>{th.catalysts.news}
                          </Text>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>Earnings: </Text>{th.catalysts.earnings}
                          </Text>
                          <Text style={styles.bodyText}>
                            <Text style={{ fontWeight: '700' }}>SEC & Cap: </Text>{th.catalysts.secFilings}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Short-Selling & Squeeze Filters */}
                    {th.shortFilter && (
                      <View style={[styles.card, { marginTop: 8 }]}>
                        <Text style={styles.sectionTitle}>Short-Selling & Squeeze Filters</Text>
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.bodyText}><Text style={{ fontWeight: '700' }}>Borrow Fee: </Text>{th.shortFilter.borrowFee}</Text>
                            <Text style={styles.bodyText}><Text style={{ fontWeight: '700' }}>SI%: </Text>{th.shortFilter.shortInterest}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.bodyText}><Text style={{ fontWeight: '700' }}>SSR Status: </Text>{th.shortFilter.ssrStatus}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.bodyText}><Text style={{ fontWeight: '700' }}>Squeeze Risk: </Text></Text>
                              <View style={[styles.squeezeBadge, { backgroundColor: th.shortFilter.squeezeRisk === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                                <Text style={[styles.squeezeBadgeText, { color: th.shortFilter.squeezeRisk === 'HIGH' ? Colors.sell : Colors.buy }]}>
                                  {th.shortFilter.squeezeRisk}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Text style={[styles.bodyText, { borderTopWidth: 1, borderTopColor: Colors.divider, paddingTop: 6, fontStyle: 'italic', fontSize: 11 }]}>
                            Squeeze risk estimates are evaluated via technical signals, relative volume surges, and estimated short parameters. SSR status restricts short entries on downtick sessions.
                          </Text>
                        </View>
                      </View>
                    )}
                    {/* Horizon Details */}
                    {th.horizonDetails && (
                      <View style={[styles.card, { marginTop: 8 }]}>
                        <Text style={styles.sectionTitle}>Horizon Setup Details</Text>
                        <Text style={styles.bodyText}>{th.horizonDetails}</Text>
                      </View>
                    )}

                  </View>
                </View>
              );
            })()}

            {/* Numbered Final Execution Timeline */}
            {r.finalActionPlan && r.finalActionPlan.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeading}>🏁 Execution Timeline & Action Plan</Text>
                </View>
                <View style={styles.timelineContainer}>
                  {r.finalActionPlan.map((step: string, idx: number) => (
                    <View key={idx} style={styles.timelineRow}>
                      <View style={styles.timelineNode}>
                        <Text style={styles.timelineNodeText}>{idx + 1}</Text>
                      </View>
                      <View style={styles.timelineContentCard}>
                        <Text style={styles.timelineStepLabel}>Step {idx + 1}</Text>
                        <Text style={styles.timelineStepText}>{step}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {activeSection === 'insight' && (
          <View style={styles.tabContent}>
            {user?.role !== 'BASIC' ? (
              !r.companyInsights ? (
                <View style={styles.card}>
                  <View style={{ alignItems: 'center', gap: 12, paddingVertical: 20 }}>
                    <AlertIcon color={Colors.textSecondary} />
                    <Text style={[styles.sectionHeading, { textAlign: 'center' }]}>Ecosystem Insights Unavailable</Text>
                    <Text style={[styles.bodyText, { textAlign: 'center', fontSize: 12 }]}>
                      This report was generated using an older cache schema. Click the "Re-analyze" button in the top right to compile fresh, deep business ecosystem insights for {symbol}.
                    </Text>
                    <TouchableOpacity onPress={handleAnalyze} disabled={analyzing} style={[styles.reanalyzeBtn, { backgroundColor: Colors.primary, borderColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 16 }]}>
                      {analyzing ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Text style={[styles.reanalyzeText, { color: Colors.white, fontWeight: '700' }]}>Generate Insights Now</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {/* Strategic Outlook */}
                  {r.companyInsights.strategicOutlook && (
                    <View style={[styles.card, { borderColor: 'rgba(20, 184, 166, 0.2)', backgroundColor: 'rgba(20, 184, 166, 0.02)' }]}>
                      <View style={styles.sectionHeader}>
                        <GlobeIcon />
                        <Text style={styles.sectionHeading}>Strategic Ecosystem Outlook</Text>
                      </View>
                      <Text style={styles.bodyText}>{r.companyInsights.strategicOutlook}</Text>
                    </View>
                  )}

                  {/* Strategic Investment Portfolio */}
                  <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                      <CoinsIcon />
                      <Text style={styles.sectionHeading}>Strategic Investment Portfolio</Text>
                    </View>

                    {r.companyInsights.investedCompanies && r.companyInsights.investedCompanies.length > 0 ? (
                      r.companyInsights.investedCompanies.map((c: any, idx: number) => (
                        <View key={idx} style={styles.portfolioCard}>
                          <View style={styles.portfolioHeader}>
                            <Text style={styles.portfolioName}>{c.name}</Text>
                            {c.ownershipPct && (
                              <View style={styles.ownershipBadge}>
                                <Text style={styles.ownershipText}>{c.ownershipPct} Own</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.portfolioPerformance}><Text style={{ fontWeight: '700' }}>Performance:</Text> {c.performance}</Text>
                          {c.upcomingEvents && c.upcomingEvents.length > 0 && (
                            <View style={{ marginTop: 6 }}>
                              <Text style={[styles.dependencyGroupTitle, { fontSize: 10, marginBottom: 2 }]}>Upcoming Catalyst Events:</Text>
                              {c.upcomingEvents.map((evt: string, eIdx: number) => (
                                <Text key={eIdx} style={[styles.bodyText, { fontSize: 11, marginLeft: 8 }]}>• {evt}</Text>
                              ))}
                            </View>
                          )}
                          <Text style={styles.portfolioImpact}><Text style={{ fontWeight: '700', color: Colors.buy }}>Impact Channel:</Text> {c.impactPotential}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.bodyText}>No strategic investments listed.</Text>
                    )}
                  </View>

                  {/* Dependencies */}
                  <View style={styles.card}>
                    <View style={styles.sectionHeader}>
                      <LayersIcon />
                      <Text style={styles.sectionHeading}>Business Dependency Network</Text>
                    </View>

                    {['suppliers', 'customers', 'outsourcePartners', 'marketingPartners'].map((groupKey) => {
                      const groupItems = r.companyInsights.dependencies?.[groupKey] || [];
                      if (groupItems.length === 0) return null;

                      const getGroupTitle = (key: string) => {
                        if (key === 'suppliers') return 'Suppliers & Infrastructure';
                        if (key === 'customers') return 'Consumer Base & Customers';
                        if (key === 'outsourcePartners') return 'Outsourcing & Support';
                        if (key === 'marketingPartners') return 'Marketing Channels & Partners';
                        return key.toUpperCase();
                      };

                      return (
                        <View key={groupKey} style={{ marginVertical: 8 }}>
                          <Text style={styles.dependencyGroupTitle}>{getGroupTitle(groupKey).toUpperCase()}</Text>
                          {groupItems.map((item: any, idx: number) => (
                            <View key={idx} style={styles.dependencyCard}>
                              <View style={styles.portfolioHeader}>
                                <Text style={styles.dependencyName}>{item.name}</Text>
                                <Text style={styles.dependencyRole}>{item.role}</Text>
                              </View>
                              <Text style={styles.dependencyDesc}>{item.description}</Text>
                              {item.riskExposure && (
                                <Text style={styles.dependencyRisk}>⚠️ Risk: {item.riskExposure}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )
            ) : (
              <View style={styles.restrictedSection}>
                <Text style={styles.restrictedTitle}>Ecosystem & Strategic Portfolio (Locked)</Text>
                <Text style={styles.restrictedText}>
                  Supply chain dependency maps, portfolio investments, and corporate catalysts require a PRO subscription. Upgrade to unlock.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  navRow: {
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
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  bookmarkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerBlock: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tickerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  companyName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerRightActions: {
    alignItems: 'flex-end',
  },
  ratingBadge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '900',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  priceText: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  reanalyzeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.cardElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reanalyzeText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 8,
  },
  actionBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  actionBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  scoreCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  scoreLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  scoreMax: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  stickyHeader: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  stickyTabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    justifyContent: 'space-around',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  trendArrowWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wyckoffCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  wyckoffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  wyckoffHeaderLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sidewaysBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sidewaysBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.hold,
  },
  activeStageBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeStageBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  wyckoffStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  wyckoffStepCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    position: 'relative',
  },
  wyckoffPulseCircle: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  wyckoffStepNum: {
    fontSize: 7.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  wyckoffIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  wyckoffStepLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  wyckoffSidewaysNotice: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'flex-start',
    gap: 8,
  },
  wyckoffSidewaysNoticeText: {
    flex: 1,
    fontSize: 10,
    color: Colors.hold,
    lineHeight: 14,
  },
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitCard: {
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  greenBullet: {
    color: Colors.buy,
    marginRight: 6,
    fontWeight: 'bold',
  },
  redBullet: {
    color: Colors.sell,
    marginRight: 6,
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  multibaggerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  ratingVal: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  multibaggerDesc: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  conditionsWrapper: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  subTitleText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 6,
  },
  condBullet: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginVertical: 2,
  },
  flowCard: {
    borderColor: 'rgba(245, 158, 11, 0.2)',
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
  },
  flowHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.hold,
    textTransform: 'uppercase',
  },
  flowText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  restrictedSection: {
    backgroundColor: 'rgba(239, 68, 68, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    padding: 16,
  },
  restrictedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.risk,
    marginBottom: 6,
  },
  restrictedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  // Technical Tab Styles
  techIndicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techIndicatorCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
  },
  techIndicatorLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  techIndicatorVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  signalsList: {
    gap: 8,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  signalText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  supPrice: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.buy,
    fontWeight: '700',
    marginVertical: 2,
  },
  resPrice: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.sell,
    fontWeight: '700',
    marginVertical: 2,
  },
  // Tactical Tab Styles
  tacticalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  tacticalCell: {
    width: '47%',
    marginBottom: 8,
  },
  tacticalLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  tacticalVal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  biasBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  biasBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  suggestedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    gap: 12,
  },
  suggestedCell: {
    width: '47%',
    marginBottom: 8,
  },
  suggestedLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestedVal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  collapsibleBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 8,
  },
  collapsibleBlockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  collapsibleBlockBody: {
    paddingTop: 4,
    paddingBottom: 10,
  },
  laymanQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 15,
  },
  squeezeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  squeezeBoxLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  squeezeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  squeezeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  timelineContainer: {
    paddingLeft: 12,
    position: 'relative',
    marginTop: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  timelineNode: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineNodeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
  },
  timelineContentCard: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  timelineStepLabel: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timelineStepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  // AI Tab Styles
  scenarioRow: {
    marginVertical: 6,
  },
  scenarioCol: {
    borderLeftWidth: 3,
    paddingLeft: 12,
  },
  scenarioLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.text,
  },
  scenarioText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    marginTop: 10,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.hold,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 10.5,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  metadataText: {
    fontSize: 9.5,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
  // Trend Story Inline Card Styles
  trendStoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingBottom: 10,
    marginBottom: 12,
  },
  trendStoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendArrow: {
    fontSize: 22,
    fontWeight: '900',
  },
  trendStoryHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  trendStorySub: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    marginTop: 1,
  },
  reasonBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  reasonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  laymanSection: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headlineText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  explanationText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18.5,
  },
  sustainGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sustainCard: {
    flex: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sustainLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sustainBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  sustainBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  sustainDesc: {
    fontSize: 10.5,
    color: Colors.textSecondary,
    lineHeight: 14,
    marginTop: 2,
  },
  driverVal: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 4,
  },
  tradeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tradeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tradeTabBtnActive: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tradeTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tradeTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tradeViewBody: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  tradeBiasCard: {
    marginBottom: 12,
    position: 'relative',
  },
  tradeBiasLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tradeBiasDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
    paddingRight: 60,
  },
  biasTag: {
    position: 'absolute',
    right: 0,
    top: 0,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  biasTagText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: Colors.buy,
  },
  levelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelCell: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    alignItems: 'center',
  },
  levelCellLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  levelCellVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
  confirmBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  confirmText: {
    fontSize: 11,
    color: '#818CF8',
    lineHeight: 15,
  },
  evidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: 8,
  },
  evidenceHeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  evidenceContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: 12,
  },
  tableBlock: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tableTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  tableColLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tableColVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // Ecosystem Tab Styles
  portfolioCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginVertical: 4,
  },
  portfolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portfolioName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  ownershipBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ownershipText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
  },
  portfolioPerformance: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  portfolioImpact: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4.5,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 6,
  },
  dependencyGroupTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dependencyCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginVertical: 4,
  },
  dependencyName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  dependencyRole: {
    fontSize: 10.5,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  dependencyDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 6,
    lineHeight: 16,
  },
  dependencyRisk: {
    fontSize: 11,
    color: Colors.risk,
    marginTop: 6,
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    padding: 6,
    borderRadius: 4,
  },
  fullReportBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  fullReportBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tableSummaryText: {
    fontSize: 10.5,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 6,
    lineHeight: 14,
  },
  newsItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: 10,
  },
  newsItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  newsMeta: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  newsImpactBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  newsImpactText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  newsHeadline: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 16,
  },
  newsSummary: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  earningsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  earningsCell: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
    alignItems: 'center',
  },
  earningsCellLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  earningsCellVal: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  analystItem: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    paddingVertical: 10,
  },
  analystFirm: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  analystSummary: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  analystTarget: {
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  consensusBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.1)',
    padding: 12,
    marginTop: 12,
  },
  consensusTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  consensusText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  consensusArrow: {
    fontSize: 14,
    marginTop: 1,
  },
  collapsibleBlock: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionWrapper: {
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
  },
  sectionTitleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionTitleHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  headerMetaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  headerMetaBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fundScrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  fundHeaderCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  fundHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fundTickerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fundNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  fundIssuerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fundBenchmarkRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  fundBenchmarkLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  fundBenchmarkVal: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
    marginLeft: 6,
  },
  fundDecisionCard: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  fundSectionTitleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fundSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fundConfidenceBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  fundConfidenceText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: Colors.primary,
  },
  fundDecisionSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  fundActionBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.1)',
  },
  fundActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818CF8',
    textTransform: 'uppercase',
  },
  fundActionText: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '700',
    marginTop: 2,
  },
  fundOverviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  fundOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  fundOverviewCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
  },
  fundOverviewLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fundOverviewVal: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  fundAnalogyBox: {
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  fundAnalogyText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  fundProsConsRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  fundProsConsCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  fundProsConsTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fundBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  fundBulletDot: {
    fontSize: 14,
    marginRight: 6,
    fontWeight: 'bold',
  },
  fundBulletText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  fundProgressRow: {
    marginVertical: 8,
  },
  fundProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fundProgressLabel: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  fundProgressPct: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '800',
  },
  fundProgressBarBg: {
    height: 6,
    backgroundColor: Colors.divider,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fundProgressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  fundHoldingsTableCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  fundHoldingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  fundHoldingTicker: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fundHoldingName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fundHoldingPct: {
    fontSize: 12.5,
    fontWeight: '800',
    color: Colors.primary,
    alignSelf: 'center',
  },
  fundDisclaimerBox: {
    backgroundColor: 'rgba(100, 116, 139, 0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 32,
  },
  fundDisclaimerText: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
    textAlign: 'center',
  },
  scHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  scZoneBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scZoneBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  scScoreLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  scScoreVal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scSubText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginBottom: 14,
  },
  scGradientContainer: {
    marginBottom: 44,
  },
  scGradientLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scGradientLabelText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  scGradientTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 3,
    position: 'relative',
    overflow: 'visible',
  },
  scGradientSegment: {
    flex: 1,
    height: '100%',
  },
  scGradientPin: {
    position: 'absolute',
    top: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1.5,
    elevation: 3,
  },
  scGradientPinInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
  scCurrentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  scBarSummary: {
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
  },
  scLaymanContainer: {
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  scLaymanTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scLaymanBody: {
    fontSize: 11,
    color: Colors.text,
    lineHeight: 15,
  },
  scSupportCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  scSupportTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  scSupportBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  scSupportBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  scSupportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
    marginTop: 6,
  },
  scSupportGridCell: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  scSupportCellLabel: {
    fontSize: 7.5,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  scSupportCellVal: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scSupportDesc: {
    fontSize: 10.5,
    color: Colors.textMuted,
    lineHeight: 14,
    marginTop: 4,
  },
  scDetailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  scDetailsToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  scDriversBox: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    marginBottom: 12,
  },
  scDriverBlock: {
    flex: 1,
  },
  scDriverBlockLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scDriverBlockText: {
    fontSize: 11,
    color: Colors.text,
    lineHeight: 15,
  },
  scCategoryGrid: {
    gap: 8,
    marginBottom: 12,
  },
  scCategoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
  },
  scCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  scCategoryName: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  scCategoryStatusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 3,
  },
  scCategoryStatusText: {
    fontSize: 7.5,
    fontWeight: '800',
  },
  scCategoryScoreVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scCategoryScoreMax: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  scCategoryEvidence: {
    fontSize: 10,
    color: Colors.textMuted,
    lineHeight: 14,
  },
  scBulletText: {
    fontSize: 10.5,
    color: Colors.textMuted,
    lineHeight: 14,
    marginLeft: 4,
  },
});

export default StockInsightScreen;
