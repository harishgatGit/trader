import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './app/navigation/AppNavigator';
import DisclaimerModal from './app/components/ui/DisclaimerModal';
import { Colors } from './app/theme/colors';
import useAuthStore from './app/store/authStore';
import useLocalCacheStore from './app/store/localCacheStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { loadSession, isLoading } = useAuthStore();
  const { loadCache } = useLocalCacheStore();

  useEffect(() => {
    // Initial load of cached tokens and search histories
    loadSession();
    loadCache();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <AppNavigator />
        <DisclaimerModal />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
