import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, ScrollView, Alert as RNAlert } from 'react-native';
import { Colors } from '../theme/colors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import alertsApi from '../services/alertsApi';

type TabOption = 'ACTIVE' | 'CREATE' | 'TRIGGERED';

export const AlertsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabOption>('ACTIVE');
  const [nlInput, setNlInput] = useState('');
  
  // Standard Form States
  const [symbol, setSymbol] = useState('');
  const [alertType, setAlertType] = useState('price_above');
  const [value, setValue] = useState('');

  const queryClient = useQueryClient();

  // Fetch active alerts
  const { data: alerts = [], isLoading: isAlertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.getAll,
  });

  // Fetch alert events (triggered logs)
  const { data: events = [], isLoading: isEventsLoading } = useQuery({
    queryKey: ['alert-events'],
    queryFn: () => alertsApi.getRecentEvents(30),
  });

  // Create alert mutation
  const createMutation = useMutation({
    mutationFn: (params: { symbol: string; type: string; value?: number; name?: string }) =>
      alertsApi.create(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setActiveTab('ACTIVE');
      setSymbol('');
      setValue('');
      setNlInput('');
    },
  });

  // Toggle/Delete alert mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const handleCreateAlert = () => {
    if (!symbol) return;
    createMutation.mutate({
      symbol: symbol.toUpperCase().trim(),
      type: alertType,
      value: value ? parseFloat(value) : undefined,
      name: `${symbol.toUpperCase()} ${alertType.replace('_', ' ')}`,
    });
  };

  // Client-side Natural Language Parser
  const handleNlCreate = () => {
    if (!nlInput.trim()) return;
    
    const text = nlInput.toLowerCase().trim();
    
    // 1. Ticker Extraction (find 3-4 consecutive letters uppercase or standard words)
    // Common pattern: "when NVDA hits", "when AMD enters"
    const words = text.split(/\s+/);
    let extractedSymbol = '';
    
    // Look for a word that is 1-5 characters and is mostly alphabetic
    for (const w of words) {
      const cleanWord = w.replace(/[^a-z0-9]/g, '');
      if (cleanWord.length >= 2 && cleanWord.length <= 5 && /^[a-z]+$/.test(cleanWord)) {
        // Exclude common trigger words
        const skipWords = ['alert', 'me', 'when', 'enters', 'hits', 'above', 'below', 'under', 'over', 'target', 'stop', 'loss', 'zone', 'price', 'rsi', 'macd'];
        if (!skipWords.includes(cleanWord)) {
          extractedSymbol = cleanWord.toUpperCase();
          break;
        }
      }
    }

    if (!extractedSymbol) {
      RNAlert.alert('Parser Error', 'Unable to detect stock symbol. Please write e.g., "Alert me when AMD enters accumulation zone"');
      return;
    }

    // 2. Alert Type and Value Extraction
    let type = 'price_above';
    let thresholdVal: number | undefined = undefined;

    if (text.includes('accumulation') || text.includes('accumulation zone')) {
      type = 'accumulation_zone';
    } else if (text.includes('stop loss') || text.includes('stop')) {
      type = 'stop_loss_hit';
    } else if (text.includes('target 1') || text.includes('t1')) {
      type = 'target_hit';
      thresholdVal = 1; // standard target number index
    } else if (text.includes('target 2') || text.includes('t2')) {
      type = 'target_hit';
      thresholdVal = 2;
    } else if (text.includes('target 3') || text.includes('t3') || text.includes('target')) {
      type = 'target_hit';
      thresholdVal = 3;
    } else if (text.includes('above') || text.includes('over') || text.includes('higher than')) {
      type = 'price_above';
      const numMatch = text.match(/\d+(?:\.\d+)?/);
      if (numMatch) thresholdVal = parseFloat(numMatch[0]);
    } else if (text.includes('below') || text.includes('under') || text.includes('lower than')) {
      type = 'price_below';
      const numMatch = text.match(/\d+(?:\.\d+)?/);
      if (numMatch) thresholdVal = parseFloat(numMatch[0]);
    } else if (text.includes('rsi below') || text.includes('rsi under')) {
      type = 'rsi_below';
      thresholdVal = 30;
    } else if (text.includes('rsi above') || text.includes('rsi over')) {
      type = 'rsi_above';
      thresholdVal = 70;
    }

    // Submit mutation
    createMutation.mutate({
      symbol: extractedSymbol,
      type,
      value: thresholdVal,
      name: `NL Alert: ${extractedSymbol} ${type.replace('_', ' ')}`,
    });

    RNAlert.alert('Success', `Parsed Alert: ${extractedSymbol} | Type: ${type.replace('_', ' ')}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>System Alerts</Text>

        {/* Tab Selector */}
        <View style={styles.toggleContainer}>
          {(['ACTIVE', 'CREATE', 'TRIGGERED'] as TabOption[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleBtn, activeTab === tab ? styles.toggleBtnActive : null]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.toggleText, activeTab === tab ? styles.toggleTextActive : null]}>
                {tab === 'ACTIVE' ? 'Active' : tab === 'CREATE' ? 'New Alert' : 'Triggered Logs'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'ACTIVE' && (
          isAlertsLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
          ) : alerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No active alerts</Text>
              <Text style={styles.emptySub}>Create alerts to get notified when price actions cross support bounds.</Text>
            </View>
          ) : (
            <FlatList
              data={alerts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.alertCard}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.alertSymbol}>{item.symbol}</Text>
                    <Text style={styles.alertTypeLabel}>
                      {item.type.replace('_', ' ').toUpperCase()} 
                      {item.value ? ` @ $${item.value.toFixed(2)}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => deleteMutation.mutate(item.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )
        )}

        {activeTab === 'CREATE' && (
          <ScrollView contentContainerStyle={styles.formContainer}>
            {/* Natural Language Panel */}
            <View style={styles.nlPanel}>
              <Text style={styles.sectionLabel}>Natural Language Alert Engine</Text>
              <TextInput
                style={styles.nlInput}
                value={nlInput}
                onChangeText={setNlInput}
                placeholder='e.g. "Alert me when AMD enters accumulation zone"'
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.nlBtn, !nlInput.trim() && styles.disabledBtn]}
                onPress={handleNlCreate}
                disabled={!nlInput.trim() || createMutation.isPending}
              >
                <Text style={styles.nlBtnText}>Auto Parse & Create</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR MANUAL BUILDER</Text>
              <View style={styles.orLine} />
            </View>

            {/* Manual Form */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Asset Ticker Symbol</Text>
              <TextInput
                style={styles.textInput}
                value={symbol}
                onChangeText={setSymbol}
                placeholder="e.g. AAPL"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Alert Type</Text>
              <View style={styles.pickerFake}>
                {['price_above', 'price_below', 'accumulation_zone', 'stop_loss_hit', 'target_hit'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pickerBtn, alertType === t && styles.pickerBtnActive]}
                    onPress={() => setAlertType(t)}
                  >
                    <Text style={[styles.pickerText, alertType === t && styles.pickerTextActive]}>
                      {t.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {['price_above', 'price_below'].includes(alertType) && (
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Price Target ($)</Text>
                <TextInput
                  style={styles.textInput}
                  value={value}
                  onChangeText={setValue}
                  placeholder="e.g. 150.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, !symbol && styles.disabledBtn]}
              onPress={handleCreateAlert}
              disabled={!symbol || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Create Manual Alert</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === 'TRIGGERED' && (
          isEventsLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
          ) : events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No triggered events</Text>
              <Text style={styles.emptySub}>Your triggers will log historical hits here.</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventSymbol}>{item.symbol}</Text>
                    <Text style={styles.eventTime}>
                      {new Date(item.triggeredAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.eventMessage}>{item.message}</Text>
                </View>
              )}
            />
          )
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  spinner: {
    marginTop: 40,
  },
  emptyState: {
    flex: 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
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
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  alertSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  alertTypeLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.cardElevated,
  },
  deleteBtnText: {
    fontSize: 11,
    color: Colors.sell,
    fontWeight: '600',
  },
  formContainer: {
    paddingBottom: 24,
  },
  nlPanel: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 10,
  },
  nlInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 12,
  },
  nlBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  nlBtnText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  orText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginHorizontal: 10,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: Colors.text,
  },
  pickerFake: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pickerBtn: {
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pickerBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  pickerText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pickerTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledBtn: {
    backgroundColor: Colors.divider,
    opacity: 0.5,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  eventCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.hold,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  eventTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  eventMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
});
export default AlertsScreen;
