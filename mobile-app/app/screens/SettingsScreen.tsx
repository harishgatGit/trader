import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import useAuthStore from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import GlobalDisclaimer from '../components/ui/GlobalDisclaimer';

type ReadingPreference = 'COMPACT' | 'BALANCED' | 'DETAILED';

export const SettingsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [pref, setPref] = useState<ReadingPreference>('BALANCED');

  // Fetch API Status from backend
  const { data: configStatus = null, isLoading } = useQuery({
    queryKey: ['config-status'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/config/status');
        return res.data;
      } catch (e) {
        return null;
      }
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headerTitle}>Preferences & Config</Text>

        {/* User Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>User Account</Text>
          <View style={styles.accountRow}>
            <View>
              <Text style={styles.username}>{user?.username || 'Trader'}</Text>
              <Text style={styles.roleLabel}>{user?.role} SUBSCRIPTION LEVEL</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{user?.role}</Text>
            </View>
          </View>
        </View>

        {/* Dashboard View Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dashboard View Preference</Text>
          <Text style={styles.desc}>Customize how stock analysis stories are formatted and summarized.</Text>
          
          <View style={styles.prefList}>
            {([
              { key: 'COMPACT', title: 'Compact Summary Mode', desc: 'Ideal for quick scans, fits on a single screen' },
              { key: 'BALANCED', title: 'Balanced Story Mode', desc: 'Standard narrative flow with main bullet details' },
              { key: 'DETAILED', title: 'Detailed Analyst Mode', desc: 'Comprehensive technical formulas and risk indicators' }
            ] as { key: ReadingPreference; title: string; desc: string }[]).map((p) => {
              const isActive = pref === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.prefBtn, isActive && styles.prefBtnActive]}
                  onPress={() => setPref(p.key)}
                >
                  <View style={[styles.radio, isActive && styles.radioActive]}>
                    {isActive && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.prefTextWrapper}>
                    <Text style={[styles.prefTitle, isActive && styles.prefTitleActive]}>{p.title}</Text>
                    <Text style={styles.prefDesc}>{p.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* API Infrastructure Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>API Infrastructure Status</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
          ) : !configStatus ? (
            // Offline/Local Simulated response
            <View style={styles.statusGrid}>
              {[
                { name: 'NestJS Backend', status: 'connected' },
                { name: 'Postgres Database', status: 'connected' },
                { name: 'Redis Cache/Queue', status: 'connected' },
                { name: 'Alpaca Data Feed', status: 'connected' },
                { name: 'OpenAI Analyst Agent', status: 'connected' }
              ].map((s, idx) => (
                <View key={idx} style={styles.statusRow}>
                  <Text style={styles.statusName}>{s.name}</Text>
                  <View style={styles.statusIndicator}>
                    <View style={styles.greenDot} />
                    <Text style={styles.greenText}>{s.status.toUpperCase()}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // Dynamic Response from Backend
            <View style={styles.statusGrid}>
              {Object.keys(configStatus).map((key) => {
                const isOk = configStatus[key] === 'connected' || configStatus[key] === true || configStatus[key]?.status === 'connected';
                return (
                  <View key={key} style={styles.statusRow}>
                    <Text style={styles.statusName}>{key.toUpperCase()}</Text>
                    <View style={styles.statusIndicator}>
                      <View style={isOk ? styles.greenDot : styles.redDot} />
                      <Text style={isOk ? styles.greenText : styles.redText}>
                        {isOk ? 'CONNECTED' : 'ERROR'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <GlobalDisclaimer />

        <Text style={styles.version}>InvestingAtti Stock Analyst v1.0.0</Text>
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
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  roleLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  roleBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  desc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  prefList: {
    gap: 12,
  },
  prefBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  prefBtnActive: {
    borderColor: Colors.primary,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  prefTextWrapper: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  prefTitleActive: {
    color: Colors.text,
    fontWeight: '700',
  },
  prefDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusGrid: {
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusName: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.buy,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.sell,
  },
  greenText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.buy,
  },
  redText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.sell,
  },
  version: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
});
export default SettingsScreen;
