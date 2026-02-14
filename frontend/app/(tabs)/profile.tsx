import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesi\u00f3n',
      '\u00bfEst\u00e1s seguro de que deseas cerrar sesi\u00f3n?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesi\u00f3n',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  const isWorker = profile?.role === 'worker';
  const isBusiness = profile?.role === 'business';

  const renderBadge = (badge: string) => {
    const badgeConfig: Record<string, { icon: string; color: string; label: string }> = {
      newcomer: { icon: 'star-outline', color: COLORS.textSecondary, label: 'Nuevo' },
      rising_star: { icon: 'star-half', color: COLORS.warning, label: 'Estrella' },
      trusted: { icon: 'shield-checkmark', color: COLORS.accent, label: 'Confiable' },
      top_rated: { icon: 'trophy', color: COLORS.primary, label: 'Top' },
    };

    const config = badgeConfig[badge] || badgeConfig.newcomer;

    return (
      <View key={badge} style={[styles.badge, { backgroundColor: config.color + '20' }]}>
        <Ionicons name={config.icon as any} size={16} color={config.color} />
        <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {profile?.photo ? (
              <Image source={{ uri: profile.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.textSecondary} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.name}>{profile?.name || user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          {isBusiness && profile?.business_name && (
            <View style={styles.businessTag}>
              <Ionicons name="business" size={16} color={COLORS.primary} />
              <Text style={styles.businessName}>{profile.business_name}</Text>
            </View>
          )}

          {/* Role Badge */}
          <View style={styles.roleContainer}>
            <View style={[
              styles.roleBadge,
              { backgroundColor: isWorker ? COLORS.accent + '20' : COLORS.primary + '20' }
            ]}>
              <Ionicons 
                name={isWorker ? 'person' : 'business'} 
                size={16} 
                color={isWorker ? COLORS.accent : COLORS.primary} 
              />
              <Text style={[
                styles.roleText,
                { color: isWorker ? COLORS.accent : COLORS.primary }
              ]}>
                {isWorker ? 'Trabajador N\u00f3mada' : 'Due\u00f1o de Negocio'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Section (Worker) */}
        {isWorker && profile && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.warning + '20' }]}>
                <Ionicons name="star" size={24} color={COLORS.warning} />
              </View>
              <Text style={styles.statValue}>{profile.prestige_score || 0}</Text>
              <Text style={styles.statLabel}>Prestige</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.success + '20' }]}>
                <Ionicons name="briefcase" size={24} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{profile.completed_jobs || 0}</Text>
              <Text style={styles.statLabel}>Trabajos</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: COLORS.primary + '20' }]}>
                <Ionicons name="star-half" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{profile.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        )}

        {/* Badges (Worker) */}
        {isWorker && profile?.badges && profile.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Insignias</Text>
            <View style={styles.badgesContainer}>
              {profile.badges.map(renderBadge)}
            </View>
          </View>
        )}

        {/* Bio */}
        {profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acerca de</Text>
            <Text style={styles.bio}>{profile.bio}</Text>
          </View>
        )}

        {/* Skills */}
        {profile?.skills && profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isWorker ? 'Habilidades' : 'Categor\u00edas'}
            </Text>
            <View style={styles.skillsContainer}>
              {profile.skills.map((skill, index) => (
                <View key={index} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        {profile?.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicaci\u00f3n</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <Text style={styles.locationText}>{profile.address}</Text>
            </View>
          </View>
        )}

        {/* Business Photos */}
        {isBusiness && profile?.business_photos && profile.business_photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos del negocio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.business_photos.map((photo, index) => (
                <Image key={index} source={{ uri: photo }} style={styles.businessPhoto} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.info + '20' }]}>
              <Ionicons name="document-text" size={20} color={COLORS.info} />
            </View>
            <Text style={styles.menuText}>Historial de Trabajos</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.warning + '20' }]}>
              <Ionicons name="star" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.menuText}>Mis Rese\u00f1as</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.accent + '20' }]}>
              <Ionicons name="help-circle" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.menuText}>Ayuda y Soporte</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={[styles.menuIcon, { backgroundColor: COLORS.error + '20' }]}>
              <Ionicons name="log-out" size={20} color={COLORS.error} />
            </View>
            <Text style={[styles.menuText, { color: COLORS.error }]}>Cerrar Sesi\u00f3n</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>NomadShift v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: SIZES.xl,
    paddingHorizontal: SIZES.lg,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    borderRadius: SIZES.radiusXl,
    ...SHADOWS.medium,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.surface,
  },
  name: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  email: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  businessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  businessName: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '600',
  },
  roleContainer: {
    marginTop: SIZES.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  roleText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    paddingVertical: SIZES.lg,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.small,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  statValue: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  bio: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  badgeText: {
    marginLeft: 4,
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  skillChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  skillText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  businessPhoto: {
    width: 150,
    height: 100,
    borderRadius: SIZES.radiusMd,
    marginRight: SIZES.sm,
  },
  menuSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  menuText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  version: {
    textAlign: 'center',
    fontSize: SIZES.fontXs,
    color: COLORS.textDisabled,
    marginTop: SIZES.lg,
  },
});
