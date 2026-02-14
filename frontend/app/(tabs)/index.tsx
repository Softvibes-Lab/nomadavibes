import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuthStore } from '../../src/store/authStore';
import { jobAPI, utilAPI } from '../../src/services/api';
import { JobCard } from '../../src/components/JobCard';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [jobs, setJobs] = useState<any[]>([]);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadData();
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const catResponse = await utilAPI.getCategories();
      setCategories(catResponse.data);

      // Load jobs
      const params: any = {};
      if (selectedCategory) params.category = selectedCategory;
      if (location) {
        params.lat = location.lat;
        params.lng = location.lng;
      }
      
      const jobsResponse = await jobAPI.getJobs(params);
      setJobs(jobsResponse.data);

      // Load my jobs
      const myJobsResponse = await jobAPI.getMyJobs();
      setMyJobs(myJobsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [selectedCategory, location]);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [selectedCategory]);

  const isWorker = profile?.role === 'worker';
  const isBusiness = profile?.role === 'business';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {profile?.name?.split(' ')[0]} \ud83d\udc4b</Text>
          <Text style={styles.subtitle}>
            {isWorker ? 'Encuentra trabajos cerca de ti' : 'Gestiona tus publicaciones'}
          </Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Prestige Card (Workers) */}
        {isWorker && profile && (
          <View style={styles.prestigeCard}>
            <View style={styles.prestigeLeft}>
              <View style={styles.prestigeIconContainer}>
                <Ionicons name="star" size={24} color={COLORS.warning} />
              </View>
              <View>
                <Text style={styles.prestigeLabel}>Tu Prestige</Text>
                <Text style={styles.prestigeValue}>{profile.prestige_score || 0} puntos</Text>
              </View>
            </View>
            <View style={styles.prestigeStats}>
              <View style={styles.prestigeStat}>
                <Text style={styles.statValue}>{profile.completed_jobs || 0}</Text>
                <Text style={styles.statLabel}>Trabajos</Text>
              </View>
              <View style={styles.prestigeStat}>
                <Text style={styles.statValue}>{profile.rating?.toFixed(1) || '0.0'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats (Business) */}
        {isBusiness && (
          <View style={styles.quickStats}>
            <View style={[styles.statCard, { backgroundColor: COLORS.primary + '15' }]}>
              <Ionicons name="briefcase" size={28} color={COLORS.primary} />
              <Text style={styles.quickStatValue}>{myJobs.filter(j => j.status === 'open').length}</Text>
              <Text style={styles.quickStatLabel}>Activos</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.accent + '15' }]}>
              <Ionicons name="time" size={28} color={COLORS.accent} />
              <Text style={styles.quickStatValue}>{myJobs.filter(j => j.status === 'in_progress').length}</Text>
              <Text style={styles.quickStatLabel}>En Progreso</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: COLORS.success + '15' }]}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
              <Text style={styles.quickStatValue}>{myJobs.filter(j => j.status === 'completed').length}</Text>
              <Text style={styles.quickStatLabel}>Completados</Text>
            </View>
          </View>
        )}

        {/* Post Job Button (Business) */}
        {isBusiness && (
          <TouchableOpacity
            style={styles.postJobButton}
            onPress={() => router.push('/post-job')}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.white} />
            <Text style={styles.postJobText}>Publicar Nuevo Trabajo</Text>
          </TouchableOpacity>
        )}

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorías</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipSelected,
              ]}
              onPress={() => handleCategorySelect(cat.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.id && styles.categoryTextSelected,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* My Jobs Section */}
        {myJobs.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isWorker ? 'Mis Aplicaciones' : 'Mis Publicaciones'}
              </Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>Ver todo</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.myJobsContainer}
            >
              {myJobs.slice(0, 5).map((job) => (
                <TouchableOpacity
                  key={job.job_id}
                  style={styles.myJobCard}
                  onPress={() => router.push(`/job/${job.job_id}`)}
                >
                  <View style={styles.myJobHeader}>
                    <Text style={styles.myJobTitle} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <View style={[
                      styles.myJobStatus,
                      job.status === 'open' && { backgroundColor: COLORS.success + '20' },
                      job.status === 'in_progress' && { backgroundColor: COLORS.warning + '20' },
                    ]}>
                      <Text style={styles.myJobStatusText}>
                        {job.status === 'open' ? 'Abierto' : 
                         job.status === 'in_progress' ? 'En progreso' : 'Completado'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.myJobBusiness}>{job.business_name}</Text>
                  <View style={styles.myJobFooter}>
                    <Text style={styles.myJobRate}>${job.hourly_rate}/hr</Text>
                    <Text style={styles.myJobDuration}>{job.duration_hours}h</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Available Jobs */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isWorker ? 'Trabajos Disponibles' : 'Todos los Trabajos'}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/map')}>
            <Text style={styles.seeAll}>Ver mapa</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
        ) : jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={64} color={COLORS.textDisabled} />
            <Text style={styles.emptyText}>No hay trabajos disponibles</Text>
            <Text style={styles.emptySubtext}>Intenta cambiar los filtros o vuelve más tarde</Text>
          </View>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              onPress={() => router.push(`/job/${job.job_id}`)}
            />
          ))
        )}

        {/* Bottom padding */}
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
  greeting: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  prestigeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.radiusLg,
    ...SHADOWS.medium,
  },
  prestigeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prestigeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  prestigeLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  prestigeValue: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  prestigeStats: {
    flexDirection: 'row',
  },
  prestigeStat: {
    alignItems: 'center',
    marginLeft: SIZES.md,
  },
  statValue: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginHorizontal: 4,
  },
  quickStatValue: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  quickStatLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  postJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SIZES.lg,
    marginTop: SIZES.md,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.medium,
  },
  postJobText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  seeAll: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: SIZES.lg,
  },
  categoryChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  categoryTextSelected: {
    color: COLORS.white,
  },
  myJobsContainer: {
    paddingHorizontal: SIZES.lg,
  },
  myJobCard: {
    width: width * 0.6,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginRight: SIZES.md,
    ...SHADOWS.small,
  },
  myJobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.xs,
  },
  myJobTitle: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SIZES.sm,
  },
  myJobStatus: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  myJobStatusText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textPrimary,
  },
  myJobBusiness: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  myJobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  myJobRate: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.success,
  },
  myJobDuration: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  loader: {
    marginTop: SIZES.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    paddingHorizontal: SIZES.lg,
  },
  emptyText: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
});
