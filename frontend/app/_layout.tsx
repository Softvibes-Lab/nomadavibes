import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/theme';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export default function RootLayout() {
  const { isLoading, checkAuth } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Handle deep link session_id on cold start
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        await handleAuthUrl(initialUrl);
      }

      // Check existing auth
      await checkAuth();
      setInitializing(false);
    };

    init();

    // Handle deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      handleAuthUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAuthUrl = async (url: string) => {
    const { login } = useAuthStore.getState();
    
    // Parse session_id from URL
    let sessionId = null;
    
    // Check hash
    const hashMatch = url.match(/[#?]session_id=([^&]+)/);
    if (hashMatch) {
      sessionId = hashMatch[1];
    }
    
    if (sessionId) {
      await login(sessionId);
    }
  };

  if (initializing || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
