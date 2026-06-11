import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import AnalyzeScreen from '../screens/AnalyzeScreen';
import StockInsightScreen from '../screens/StockInsightScreen';
import ReportReaderScreen from '../screens/ReportReaderScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WhatsForTodayScreen from '../screens/WhatsForTodayScreen';
import WhatsForTodayStockDetailScreen from '../screens/WhatsForTodayStockDetailScreen';
import PennyStocksScreen from '../screens/PennyStocksScreen';

import useAuthStore from '../store/authStore';
import { Colors } from '../theme/colors';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  StockInsight: { symbol: string; reportId?: string };
  ReportReader: { symbol: string; reportId: string };
  WhatsForToday: undefined;
  WhatsForTodayStockDetail: { stock: any };
  PennyStocks: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Analyze: undefined;
  Watchlist: undefined;
  Alerts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const renderSvgIcon = (name: string, color: string) => {
  switch (name) {
    case 'Home':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      );
    case 'Analyze':
      // A premium magnifying glass combined with a plus indicator
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="11" cy="11" r="7" />
          <Path d="m21 21-4.3-4.3" />
          <Path d="M8 11h6" />
          <Path d="M11 8v6" />
        </Svg>
      );
    case 'Watch':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="m12 2 3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1L12 2z" />
        </Svg>
      );
    case 'Alerts':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </Svg>
      );
    case 'Prefs':
      return (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="3" />
          <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </Svg>
      );
    default:
      return null;
  }
};

const TabIcon = ({ name, label, focused }: { name: string; label: string; focused: boolean }) => {
  const color = focused ? Colors.primary : Colors.textSecondary;
  return (
    <View style={styles.tabIconContainer}>
      <View style={styles.iconWrapper}>
        {renderSvgIcon(name, color)}
      </View>
      <Text 
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.tabIconText, focused ? styles.tabIconTextActive : null]}
      >
        {label}
      </Text>
      {focused && <View style={styles.tabActiveDot} />}
    </View>
  );
};

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: Colors.background },
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: Colors.card,
        borderTopWidth: 1,
        borderColor: Colors.border,
        height: 68,
        paddingBottom: Platform.OS === 'ios' ? 16 : 8,
        paddingTop: 8,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon name="Home" label="Home" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Watchlist"
      component={WatchlistScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon name="Watch" label="Watch" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Analyze"
      component={AnalyzeScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon name="Analyze" label="Analyze" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Alerts"
      component={AlertsScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon name="Alerts" label="Alerts" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon name="Prefs" label="Prefs" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>InvestingAtti…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      {!token ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="StockInsight" component={StockInsightScreen} />
          <Stack.Screen name="ReportReader" component={ReportReaderScreen} />
          <Stack.Screen name="WhatsForToday" component={WhatsForTodayScreen} />
          <Stack.Screen name="WhatsForTodayStockDetail" component={WhatsForTodayStockDetailScreen} />
          <Stack.Screen name="PennyStocks" component={PennyStocksScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60, // Fixed width prevents label overflow
  },
  iconWrapper: {
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabIconText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  tabIconTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
});
export default AppNavigator;
