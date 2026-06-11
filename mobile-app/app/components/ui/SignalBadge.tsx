import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../theme/colors';

interface SignalBadgeProps {
  rating: 'BUY' | 'HOLD' | 'SELL' | 'WATCHLIST' | 'AVOID' | string;
  size?: 'small' | 'medium' | 'large';
}

export const SignalBadge: React.FC<SignalBadgeProps> = ({ rating, size = 'medium' }) => {
  const normRating = rating?.toUpperCase() || 'WATCHLIST';
  
  let backgroundColor = Colors.cardElevated;
  let textColor = Colors.textSecondary;

  switch (normRating) {
    case 'BUY':
      backgroundColor = `${Colors.buy}1A`; // 10% opacity
      textColor = Colors.buy;
      break;
    case 'SELL':
      backgroundColor = `${Colors.sell}1A`;
      textColor = Colors.sell;
      break;
    case 'HOLD':
      backgroundColor = `${Colors.hold}1A`;
      textColor = Colors.hold;
      break;
    case 'WATCHLIST':
      backgroundColor = `${Colors.watchlist}1A`;
      textColor = Colors.watchlist;
      break;
    case 'AVOID':
      backgroundColor = `${Colors.avoid}1A`;
      textColor = Colors.avoid;
      break;
  }

  const paddingStyle = 
    size === 'small' 
      ? styles.small 
      : size === 'large' 
      ? styles.large 
      : styles.medium;

  return (
    <View style={[styles.badge, { backgroundColor }, paddingStyle]}>
      <Text style={[styles.text, { color: textColor }, size === 'small' && styles.textSmall]}>
        {normRating}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  text: {
    fontWeight: '600',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 10,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
export default SignalBadge;
