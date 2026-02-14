import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.6;

interface RoleSelectionCardProps {
  type: 'worker' | 'business';
  onSelect: () => void;
}

const CARD_DATA = {
  worker: {
    title: 'Soy Trabajador Nómada',
    subtitle: 'Busco trabajos flexibles cerca de mí',
    icon: 'person' as const,
    image: 'https://images.unsplash.com/photo-1597242035030-ec338a70d28f?w=600',
    features: [
      'Encuentra trabajos cercanos',
      'Trabaja cuando quieras',
      'Gana dinero rápido',
      'Construye tu reputación',
    ],
  },
  business: {
    title: 'Soy Dueño de Negocio',
    subtitle: 'Busco trabajadores para mi negocio',
    icon: 'business' as const,
    image: 'https://images.unsplash.com/photo-1649768757981-45b683e4889c?w=600',
    features: [
      'Encuentra trabajadores rápido',
      'Perfiles verificados',
      'Sistema de reputación',
      'Contratación instantánea',
    ],
  },
};

export const RoleSelectionCard: React.FC<RoleSelectionCardProps> = ({
  type,
  onSelect,
}) => {
  const data = CARD_DATA[type];

  return (
    <View style={styles.cardContainer}>
      <View style={[styles.card, SHADOWS.large]}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: data.image }} style={styles.image} />
          <View style={[styles.overlay, { backgroundColor: 'rgba(0, 191, 165, 0.25)' }]} />
          <View style={[styles.iconBadge, { backgroundColor: COLORS.primary }]}>
            <Ionicons name={data.icon} size={28} color={COLORS.white} />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>

          {/* Features */}
          <View style={styles.features}>
            {data.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={20} 
                  color={COLORS.primary}
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Select Button */}
          <TouchableOpacity
            style={styles.selectButton}
            onPress={onSelect}
            activeOpacity={0.8}
          >
            <Text style={styles.selectButtonText}>Seleccionar</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: (width - CARD_WIDTH) / 2,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  imageContainer: {
    height: '40%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  iconBadge: {
    position: 'absolute',
    bottom: -25,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  content: {
    flex: 1,
    padding: SIZES.lg,
    paddingTop: SIZES.xl + 10,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  features: {
    flex: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  featureText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
    backgroundColor: COLORS.primary,
  },
  selectButtonText: {
    color: COLORS.white,
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    marginRight: SIZES.sm,
  },
});
