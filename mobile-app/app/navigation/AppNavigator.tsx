import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

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

// Custom Tab Bar Icon Placeholder/Renders using styling for simplicity and reliability
const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => {
  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIconText, focused ? styles.tabIconTextActive : null]}>
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
        height: 60,
        paddingBottom: 8,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon label="Home" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Analyze"
      component={AnalyzeScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon label="Analyze" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Watchlist"
      component={WatchlistScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon label="Watch" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Alerts"
      component={AlertsScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon label="Alerts" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarIcon: ({ focused }: any) => <TabIcon label="Prefs" focused={focused} />,
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
    paddingTop: 6,
  },
  tabIconText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
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
