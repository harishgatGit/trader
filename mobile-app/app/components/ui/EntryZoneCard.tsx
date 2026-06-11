import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface EntryZoneCardProps {
  currentPrice: number;
  entryZone: string;        // e.g. "120 - 125" or "under 130"
  accumulationZone: string; // e.g. "110 - 118"
  stopLoss: number;
}

export const EntryZoneCard: React.FC<EntryZoneCardProps> = ({
  currentPrice,
  entryZone,
  accumulationZone,
  stopLoss,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>Entry Trigger Zone</Text>
          <Text style={styles.priceHighlight}>${entryZone}</Text>
        </View>
        <Text style={styles.description}>
          Ideal range for initiating swing trades. Wait for price consolidation here.
        </Text>
      </View>
      
      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.header}>
          <Text style={styles.title}>Long-term Accumulation Zone</Text>
          <Text style={[styles.priceHighlight, { color: Colors.hold }]}>
            {accumulationZone}
          </Text>
        </View>
        <Text style={styles.description}>
          Scale in slowly if price drops to this range for long-term hold portfolios.
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Hard Stop Loss</Text>
        <Text style={[styles.footerValue, { color: Colors.sell }]}>
          ${stopLoss ? stopLoss.toFixed(2) : 'N/A'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    width: '100%',
    marginVertical: 8,
  },
  section: {
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  priceHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.buy,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  footerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  footerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
});
export default EntryZoneCard;
