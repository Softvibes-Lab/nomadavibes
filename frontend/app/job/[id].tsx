import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { jobAPI, userAPI } from '../../src/services/api';
import { useAuthStore } from '../../src/store/authStore';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const isWorker = profile?.role === 'worker';
  const isBusiness = profile?.role === 'business';
  const isOwner = job?.business_user_id === profile?.user_id;

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      
      const jobResponse = await jobAPI.getJob(id as string);
      setJob(jobResponse.data);

      // Load business profile
      try {
        const profileResponse = await userAPI.getUserProfile(jobResponse.data.business_user_id);
        setBusinessProfile(profileResponse.data);
      } catch (e) {
        console.log('Could not load business profile');
      }

      // If owner, load applications
      if (jobResponse.data.business_user_id === profile?.user_id) {
        const appsResponse = await jobAPI.getJobApplications(id as string);
        setApplications(appsResponse.data);
      }

      // Check if worker has applied
      if (isWorker) {
        const myJobsResponse = await jobAPI.getMyJobs();
        const applied = myJobsResponse.data.some((j: any) => j.job_id === id);
        setHasApplied(applied);
      }
    } catch (error) {
      console.error('Error loading job:', error);
      Alert.alert('Error', 'No se pudo cargar el trabajo');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await jobAPI.applyToJob(id as string);
      setHasApplied(true);
      Alert.alert('Éxito', 'Tu aplicación ha sido enviada');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo aplicar');
    } finally {
      setApplying(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      const response = await jobAPI.acceptApplication(id as string, applicationId);
      Alert.alert('Éxito', 'Trabajador aceptado', [
        {
          text: 'Ir al chat',
          onPress: () => router.push(`/chat/${response.data.chat_room_id}`),
        },
        { text: 'OK' },
      ]);
      loadJobDetails();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo aceptar');
    }
  };

  const handleCompleteJob = async () => {
    Alert.alert(
      'Completar trabajo',
      '¿Estás seguro de que el trabajo ha sido completado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              await jobAPI.completeJob(id as string);
              Alert.alert('Éxito', 'Trabajo marcado como completado');
              loadJobDetails();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Error al completar');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Trabajo no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerImage}>
          {businessProfile?.business_photos?.[0] ? (
            <Image source={{ uri: businessProfile.business_photos[0] }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Ionicons name="business" size={60} color={COLORS.textDisabled} />
            </View>
          )}
          <View style={styles.overlay} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Status Badge */}
          <View style={[
            styles.statusBadge,
            job.status === 'open' && { backgroundColor: COLORS.success + '20' },
            job.status === 'in_progress' && { backgroundColor: COLORS.warning + '20' },
            job.status === 'completed' && { backgroundColor: COLORS.info + '20' },
          ]}>
            <Text style={styles.statusText}>
              {job.status === 'open' ? 'Disponible' :
               job.status === 'in_progress' ? 'En Progreso' : 'Completado'}
            </Text>
          </View>

          <Text style={styles.title}>{job.title}</Text>
          
          {/* Business Info */}
          <TouchableOpacity style={styles.businessCard}>
            <View style={styles.businessAvatar}>
              {businessProfile?.photo ? (
                <Image source={{ uri: businessProfile.photo }} style={styles.businessPhoto} />
              ) : (
                <Ionicons name="business" size={24} color={COLORS.primary} />
              )}
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{job.business_name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {businessProfile?.rating?.toFixed(1) || '0.0'} ({businessProfile?.rating_count || 0})
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Job Details */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="cash" size={24} color={COLORS.success} />
                <Text style={styles.detailLabel}>Pago por hora</Text>
                <Text style={styles.detailValue}>${job.hourly_rate}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time" size={24} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Duración</Text>
                <Text style={styles.detailValue}>{job.duration_hours}h</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="wallet" size={24} color={COLORS.accent} />
                <Text style={styles.detailLabel}>Total estimado</Text>
                <Text style={styles.detailValue}>${job.hourly_rate * job.duration_hours}</Text>
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={20} color={COLORS.accent} />
              <Text style={styles.locationText}>{job.address}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>

          {/* Skills Required */}
          {job.skills_required?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Habilidades requeridas</Text>
              <View style={styles.skillsContainer}>
                {job.skills_required.map((skill: string, index: number) => (
                  <View key={index} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Applications (Business Owner View) */}
          {isOwner && applications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aplicaciones ({applications.length})</Text>
              {applications.map((app) => (
                <View key={app.application_id} style={styles.applicationCard}>
                  <View style={styles.applicantInfo}>
                    <View style={styles.applicantAvatar}>
                      {app.worker_profile?.photo ? (
                        <Image source={{ uri: app.worker_profile.photo }} style={styles.applicantPhoto} />
                      ) : (
                        <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                      )}
                    </View>
                    <View style={styles.applicantDetails}>
                      <Text style={styles.applicantName}>{app.worker_profile?.name}</Text>
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchText}>Match: {app.match_score.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </View>
                  {app.status === 'pending' && job.status === 'open' && (
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleAcceptApplication(app.application_id)}
                    >
                      <Text style={styles.acceptButtonText}>Aceptar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Spacer for bottom button */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      {isWorker && job.status === 'open' && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[
              styles.applyButton,
              hasApplied && styles.appliedButton,
            ]}
            onPress={handleApply}
            disabled={hasApplied || applying}
          >
            {applying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons 
                  name={hasApplied ? 'checkmark-circle' : 'paper-plane'} 
                  size={20} 
                  color={COLORS.white} 
                />
                <Text style={styles.applyButtonText}>
                  {hasApplied ? 'Ya aplicaste' : 'Aplicar ahora'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Complete Job Button (Owner) */}
      {isOwner && job.status === 'in_progress' && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: COLORS.success }]}
            onPress={handleCompleteJob}
          >
            <Ionicons name="checkmark-done" size={20} color={COLORS.white} />
            <Text style={styles.applyButtonText}>Marcar como completado</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.md,
    ...SHADOWS.medium,
  },
  scrollView: {
    flex: 1,
  },
  headerImage: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    padding: SIZES.lg,
    marginTop: -SIZES.xl,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.sm,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  businessAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  businessInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  businessName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  detailValue: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  locationText: {
    flex: 1,
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  skillChip: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  skillText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
  },
  applicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    ...SHADOWS.small,
  },
  applicantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  applicantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applicantPhoto: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  applicantDetails: {
    marginLeft: SIZES.sm,
  },
  applicantName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  matchBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  matchText: {
    fontSize: SIZES.fontXs,
    color: COLORS.accent,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SIZES.lg,
    paddingBottom: SIZES.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.large,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
  },
  appliedButton: {
    backgroundColor: COLORS.textDisabled,
  },
  applyButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
  },
});
