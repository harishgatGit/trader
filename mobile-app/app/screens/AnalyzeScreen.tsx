import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, SafeAreaView, ActivityIndicator, Keyboard } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors } from '../theme/colors';
import AgentProgressStepper from '../components/ui/AgentProgressStepper';
import useLocalCacheStore from '../store/localCacheStore';
import analysisApi from '../services/analysisApi';

type AnalyzeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

interface AnalyzeScreenProps {
  navigation: AnalyzeScreenNavigationProp;
}

const POPULAR_SYMBOLS = ['AAPL', 'NVDA', 'SPY', 'QQQ', 'AMD'];
const POPULAR_FUNDS = ['VTI', 'VOO', 'VFIAX', 'FXAIX', 'ARKK'];

export const AnalyzeScreen: React.FC<AnalyzeScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [analysisType, setAnalysisType] = useState<'STOCK' | 'FUND'>('STOCK');
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { addSearch } = useLocalCacheStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= 6) {
            clearInterval(interval);
            setTimeout(() => {
              setIsRunning(false);
              addSearch(query.toUpperCase());
              navigation.navigate('StockInsight', { symbol: query.toUpperCase() });
            }, 1000);
            return prev;
          }
          return prev + 1;
        });
      }, 1500); // 1.5s per agent step
    }
    return () => clearInterval(interval);
  }, [isRunning, query]);

  const handleStartAnalysis = async (symbol: string) => {
    if (!symbol) return;
    Keyboard.dismiss();
    setError(null);
    setQuery(symbol);
    setIsRunning(true);
    setActiveStep(0);

    // Call API in the background to pre-fetch or trigger
    try {
      await analysisApi.analyze(symbol.toUpperCase()).catch(() => {
        // Fallback gracefully since loading runs on simulator stepper
      });
    } catch (err) {}
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Research Center</Text>

        {!isRunning ? (
          <View style={styles.content}>
            {/* Stock vs Fund Toggle */}
            <View style={styles.toggleContainer}>
              <Pressable
                style={({ pressed }) => [styles.toggleBtn, analysisType === 'STOCK' ? styles.toggleBtnActive : null, pressed && styles.pressedOpacity]}
                onPress={() => {
                  setError(null);
                  setAnalysisType('STOCK');
                }}
              >
                <Text style={[styles.toggleText, analysisType === 'STOCK' ? styles.toggleTextActive : null]}>
                  Analyze Stock
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.toggleBtn, analysisType === 'FUND' ? styles.toggleBtnActive : null, pressed && styles.pressedOpacity]}
                onPress={() => {
                  setError(null);
                  setAnalysisType('FUND');
                }}
              >
                <Text style={[styles.toggleText, analysisType === 'FUND' ? styles.toggleTextActive : null]}>
                  Analyze Fund (ETF/MF)
                </Text>
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={(txt) => {
                  setError(null);
                  setQuery(txt);
                }}
                placeholder={analysisType === 'STOCK' ? "Enter stock ticker (e.g. AAPL, AMD)" : "Enter fund/ETF symbol (e.g. VOO, VFIAX)"}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable
                style={({ pressed }) => [styles.analyzeBtn, !query.trim() && styles.analyzeBtnDisabled, pressed && styles.pressedOpacity]}
                onPress={() => handleStartAnalysis(query.trim())}
                disabled={!query.trim()}
              >
                <Text style={styles.analyzeBtnText}>Analyze</Text>
              </Pressable>
            </View>

            {/* Popular/Suggested List */}
            <View style={styles.suggestionsSection}>
              <Text style={styles.suggestionsTitle}>
                {analysisType === 'STOCK' ? 'Popular Stocks' : 'Popular Funds & ETFs'}
              </Text>
              <View style={styles.chipGrid}>
                {(analysisType === 'STOCK' ? POPULAR_SYMBOLS : POPULAR_FUNDS).map((sym) => (
                  <Pressable
                    key={sym}
                    style={({ pressed }) => [styles.chip, pressed && styles.pressedOpacity]}
                    onPress={() => handleStartAnalysis(sym)}
                  >
                    <Text style={styles.chipText}>{sym}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>AI Multi-Agent Pipeline</Text>
              <Text style={styles.progressSymbol}>Researching {query.toUpperCase()}…</Text>
              <AgentProgressStepper activeStep={activeStep} />
            </View>
          </View>
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
    marginBottom: 20,
    marginTop: 10,
  },
  content: {
    flex: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  analyzeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeBtnDisabled: {
    backgroundColor: Colors.divider,
    opacity: 0.5,
  },
  analyzeBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionsSection: {
    marginTop: 10,
  },
  suggestionsTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  progressSymbol: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  pressedOpacity: {
    opacity: 0.7,
  },
});
export default AnalyzeScreen;
