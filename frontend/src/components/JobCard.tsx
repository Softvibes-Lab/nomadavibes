import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

interface Job {
  job_id: string;
  title: string;
  description: string;
  business_name: string;
  category: string;
  hourly_rate: number;
  duration_hours: number;
  address: string;
  distance_km?: number;
  status: string;
}

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <View style={styles.businessInfo}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.businessText}>
            <Text style={styles.businessName}>{job.business_name}</Text>
            <Text style={styles.category}>{job.category}</Text>
          </View>
        </View>
        {job.distance_km !== undefined && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={14} color={COLORS.accent} />
            <Text style={styles.distanceText}>{job.distance_km} km</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={18} color={COLORS.success} />
          <Text style={styles.detailText}>${job.hourly_rate}/hr</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} />
          <Text style={styles.detailText}>{job.duration_hours}h</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {job.address.split(',')[0]}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={[
          styles.statusBadge,
          job.status === 'open' && styles.statusOpen,
          job.status === 'in_progress' && styles.statusInProgress,
          job.status === 'completed' && styles.statusCompleted,
        ]}>
          <Text style={styles.statusText}>
            {job.status === 'open' ? 'Disponible' :
             job.status === 'in_progress' ? 'En progreso' : 'Completado'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessText: {
    marginLeft: SIZES.sm,
  },
  businessName: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  category: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: SIZES.fontXs,
    color: COLORS.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  description: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.md,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 4,
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
  },
  statusInProgress: {
    backgroundColor: '#FFF3E0',
  },
  statusCompleted: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
