import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../src/store/authStore';
import { RoleSelectionCard } from '../src/components/RoleSelectionCard';
import { OnboardingSteps } from '../src/components/OnboardingSteps';
import { userAPI } from '../src/services/api';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user, profile, checkAuth, login, refreshProfile } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'worker' | 'business' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If authenticated and onboarding completed, redirect to main app
    if (isAuthenticated && user?.onboarding_completed && profile) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, user, profile]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const redirectUrl = Platform.OS === 'web'
        ? window.location.origin + '/'
        : Linking.createURL('/');

      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === 'web') {
        window.location.href = authUrl;
      } else {
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          const sessionIdMatch = result.url.match(/[#?]session_id=([^&]+)/);
          if (sessionIdMatch) {
            await login(sessionIdMatch[1]);
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle session_id from URL on web
  useEffect(() => {
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
        login(sessionId);
      }
    }
  }, []);

  const handleRoleSelect = async (role: 'worker' | 'business') => {
    setSelectedRole(role);
    
    try {
      await userAPI.setRole(role);
      await refreshProfile();
      setShowOnboarding(true);
    } catch (error) {
      console.error('Error setting role:', error);
    }
  };

  const handleOnboardingComplete = async () => {
    await refreshProfile();
    router.replace('/(tabs)');
  };

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  // If authenticated but no role selected, show role selection
  if (isAuthenticated && !user?.role && !showOnboarding) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>NomadShift</Text>
          <Text style={styles.headerSubtitle}>\u00bfQui\u00e9n eres?</Text>
        </View>

        {/* Role Cards Carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.carouselContent}
        >
          <RoleSelectionCard type="worker" onSelect={() => handleRoleSelect('worker')} />
          <RoleSelectionCard type="business" onSelect={() => handleRoleSelect('business')} />
        </ScrollView>

        {/* Page Indicator */}
        <View style={styles.pageIndicator}>
          <View style={[styles.dot, currentPage === 0 && styles.dotActive]} />
          <View style={[styles.dot, currentPage === 1 && styles.dotActive]} />
        </View>

        {/* Swipe hint */}
        <Text style={styles.swipeHint}>Desliza para ver opciones</Text>
      </View>
    );
  }

  // If authenticated with role but onboarding not complete, show onboarding
  if (isAuthenticated && user?.role && !user?.onboarding_completed && showOnboarding) {
    return (
      <View style={styles.container}>
        <OnboardingSteps
          role={user.role as 'worker' | 'business'}
          onComplete={handleOnboardingComplete}
          initialName={user.name}
        />
      </View>
    );
  }

  // If authenticated with role selected, show onboarding
  if (isAuthenticated && selectedRole) {
    return (
      <View style={styles.container}>
        <OnboardingSteps
          role={selectedRole}
          onComplete={handleOnboardingComplete}
          initialName={user?.name}
        />
      </View>
    );
  }

  // Welcome/Login screen
  return (
    <View style={styles.welcomeContainer}>
      {/* Background gradient effect */}
      <View style={styles.gradientTop} />
      
      <View style={styles.welcomeContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="flash" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.welcomeLogo}>NomadShift</Text>
          <Text style={styles.welcomeTagline}>
            Conectamos negocios con trabajadores flexibles
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Ionicons name="location" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Trabajos Cercanos</Text>
              <Text style={styles.featureDesc}>Encuentra oportunidades cerca de ti</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="star" size={24} color={COLORS.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Sistema Prestige</Text>
              <Text style={styles.featureDesc}>Construye tu reputaci\u00f3n</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Ionicons name="cash" size={24} color={COLORS.success} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Pago R\u00e1pido</Text>
              <Text style={styles.featureDesc}>Gana dinero de forma flexible</Text>
            </View>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={24} color={COLORS.white} />
          <Text style={styles.loginButtonText}>
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          Al continuar, aceptas nuestros T\u00e9rminos y Condiciones
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
  },
  logo: {
    fontSize: SIZES.fontTitle,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: SIZES.fontLg,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  carouselContent: {
    paddingVertical: SIZES.lg,
  },
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    paddingBottom: SIZES.xl,
  },
  // Welcome Screen
  welcomeContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: 80,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xxl,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
    ...SHADOWS.large,
  },
  welcomeLogo: {
    fontSize: SIZES.fontHero,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.sm,
  },
  welcomeTagline: {
    fontSize: SIZES.fontMd,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
  },
  features: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    marginTop: SIZES.xl,
    ...SHADOWS.medium,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  featureTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  featureDesc: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: 'auto',
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
  termsText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
});
