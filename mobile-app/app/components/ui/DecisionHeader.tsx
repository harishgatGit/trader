import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';
import SignalBadge from './SignalBadge';
import ConfidenceRing from './ConfidenceRing';

interface DecisionHeaderProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  rating: string;
  confidenceScore: number;
  riskLevel: string;
}

export const DecisionHeader: React.FC<DecisionHeaderProps> = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  rating,
  confidenceScore,
  riskLevel,
}) => {
  const isPositive = change >= 0;
  const changeColor = isPositive ? Colors.buy : Colors.sell;
  const changeSign = isPositive ? '+' : '';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Symbol Details */}
        <View style={styles.leftCol}>
          <Text style={styles.symbol}>{symbol.toUpperCase()}</Text>
          <Text style={styles.name} numberOfLines={1}>{name || 'US Equity Asset'}</Text>
          <View style={styles.badgeRow}>
            <SignalBadge rating={rating} />
            <Text style={[styles.riskLabel, { color: riskLevel === 'LOW' ? Colors.buy : riskLevel === 'MEDIUM' ? Colors.hold : Colors.risk }]}>
              {riskLevel} RISK
            </Text>
          </View>
        </View>

        {/* Confidence Circle & Price */}
        <View style={styles.rightCol}>
          <ConfidenceRing score={confidenceScore} size={42} strokeWidth={3} />
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${price ? price.toFixed(2) : '0.00'}</Text>
            <Text style={[styles.change, { color: changeColor }]}>
              {changeSign}{change ? change.toFixed(2) : '0.00'} ({changeSign}{changePercent ? changePercent.toFixed(2) : '0.00'}%)
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1.2,
    justifyContent: 'center',
  },
  rightCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  symbol: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.8,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  change: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
export default DecisionHeader;
