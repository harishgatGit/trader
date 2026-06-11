import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface MiniChartProps {
  data: number[];
  supportLevels?: number[];
  resistanceLevels?: number[];
  color?: string;
  height?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data = [],
  supportLevels = [],
  resistanceLevels = [],
  color = Colors.primary,
  height = 130,
}) => {
  const prices = data.length > 0 ? data : [100, 102, 101, 105, 104, 108, 110, 109, 112, 115];
  
  const width = Dimensions.get('window').width - 64; // subtract padding
  const paddingX = 10;
  const paddingY = 15;

  const minVal = Math.min(...prices, ...(supportLevels.length > 0 ? supportLevels : []));
  const maxVal = Math.max(...prices, ...(resistanceLevels.length > 0 ? resistanceLevels : []));
  const range = maxVal - minVal || 1;

  const getX = (index: number) => {
    return paddingX + (index / (prices.length - 1)) * (width - 2 * paddingX);
  };

  const getY = (value: number) => {
    return height - paddingY - ((value - minVal) / range) * (height - 2 * paddingY);
  };

  // Build the SVG path string for the line
  let pathD = '';
  prices.forEach((price, idx) => {
    const x = getX(idx);
    const y = getY(price);
    if (idx === 0) {
      pathD = `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Build the closed path string for the gradient fill underneath
  const closedPathD = prices.length > 0
    ? `${pathD} L ${getX(prices.length - 1)} ${height - paddingY} L ${getX(0)} ${height - paddingY} Z`
    : '';

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.00" />
          </LinearGradient>
        </Defs>

        {/* Draw horizontal grid/support/resistance indicators */}
        {supportLevels.map((level, idx) => {
          const y = getY(level);
          if (y >= 0 && y <= height) {
            return (
              <Line
                key={`sup-${idx}`}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke={Colors.buy}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            );
          }
          return null;
        })}

        {resistanceLevels.map((level, idx) => {
          const y = getY(level);
          if (y >= 0 && y <= height) {
            return (
              <Line
                key={`res-${idx}`}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke={Colors.sell}
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            );
          }
          return null;
        })}

        {/* Gradient fill */}
        {closedPathD !== '' && (
          <Path d={closedPathD} fill="url(#gradient)" />
        )}

        {/* Price Trend Line */}
        {pathD !== '' && (
          <Path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
});
export default MiniChart;
