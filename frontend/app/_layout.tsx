import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../src/store/authStore';
import { COLORS } from '../src/constants/theme';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  const { isLoading, checkAuth, login } = useAuthStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      // On web, check URL for session_id first
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const hash = window.location.hash;
        const search = window.location.search;
        
        let sessionId = null;
        const hashMatch = hash.match(/session_id=([^&]+)/);
        const searchMatch = search.match(/session_id=([^&]+)/);
        
        if (hashMatch) sessionId = hashMatch[1];
        else if (searchMatch) sessionId = searchMatch[1];
        
        if (sessionId) {
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
          // Login with session_id
          await login(sessionId);
          setInitializing(false);
          return;
        }
      }
      
      // On mobile, handle deep links
      if (Platform.OS !== 'web') {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const match = initialUrl.match(/[#?]session_id=([^&]+)/);
          if (match) {
            await login(match[1]);
            setInitializing(false);
            return;
          }
        }
      }

      // Check existing auth if no session_id in URL
      await checkAuth();
      setInitializing(false);
    };

    init();

    // Handle deep links while app is running (mobile only)
    if (Platform.OS !== 'web') {
      const subscription = Linking.addEventListener('url', async (event) => {
        const match = event.url.match(/[#?]session_id=([^&]+)/);
        if (match) {
          await login(match[1]);
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, []);

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
