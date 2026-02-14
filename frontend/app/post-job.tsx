import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { jobAPI, utilAPI, aiAPI } from '../src/services/api';
import { COLORS, SIZES, SHADOWS } from '../src/constants/theme';

export default function PostJobScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [catResponse, skillsResponse] = await Promise.all([
        utilAPI.getCategories(),
        utilAPI.getSkills(),
      ]);
      setCategories(catResponse.data);
      setSkills(skillsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const [result] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (result) {
        const addressParts = [
          result.street,
          result.city,
          result.region,
        ].filter(Boolean);
        setAddress(addressParts.join(', '));
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'No se pudo obtener la ubicación');
    }
  };

  const improveWithAI = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Escribe una descripción primero');
      return;
    }

    setAiLoading(true);
    try {
      const response = await aiAPI.improveDescription(description, 'job');
      setDescription(response.data.improved);
    } catch (error) {
      console.error('AI improvement error:', error);
      Alert.alert('Error', 'No se pudo mejorar la descripción');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Selecciona una categoría');
      return;
    }
    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      Alert.alert('Error', 'Ingresa un pago por hora válido');
      return;
    }
    if (!durationHours || parseFloat(durationHours) <= 0) {
      Alert.alert('Error', 'Ingresa una duración válida');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Obtén tu ubicación primero');
      return;
    }

    setLoading(true);
    try {
      await jobAPI.createJob({
        title,
        description,
        category,
        skills_required: selectedSkills,
        hourly_rate: parseFloat(hourlyRate),
        duration_hours: parseFloat(durationHours),
        location,
        address,
      });

      Alert.alert('Éxito', 'Trabajo publicado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'No se pudo publicar el trabajo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Publicar Trabajo',
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Título del trabajo *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej: Mesero para evento nocturno"
              placeholderTextColor={COLORS.textDisabled}
            />
          </View>

          {/* Category */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Categoría *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    category === cat.id && styles.categoryChipSelected,
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      category === cat.id && styles.categoryTextSelected,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Descripción *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe el trabajo, requisitos y beneficios..."
              placeholderTextColor={COLORS.textDisabled}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.aiButton}
              onPress={improveWithAI}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                  <Text style={styles.aiButtonText}>Mejorar con IA</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Payment */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: SIZES.sm }]}>
              <Text style={styles.label}>Pago por hora ($) *</Text>
              <TextInput
                style={styles.input}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="15"
                placeholderTextColor={COLORS.textDisabled}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Text style={styles.label}>Duración (horas) *</Text>
              <TextInput
                style={styles.input}
                value={durationHours}
                onChangeText={setDurationHours}
                placeholder="4"
                placeholderTextColor={COLORS.textDisabled}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Total Preview */}
          {hourlyRate && durationHours && (
            <View style={styles.totalPreview}>
              <Text style={styles.totalLabel}>Total estimado:</Text>
              <Text style={styles.totalValue}>
                ${(parseFloat(hourlyRate || '0') * parseFloat(durationHours || '0')).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Skills */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Habilidades requeridas</Text>
            <View style={styles.skillsContainer}>
              {skills.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    selectedSkills.includes(skill) && styles.skillChipSelected,
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text
                    style={[
                      styles.skillText,
                      selectedSkills.includes(skill) && styles.skillTextSelected,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Ubicación *</Text>
            <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <Text style={styles.locationButtonText}>Obtener ubicación</Text>
            </TouchableOpacity>
            {location && (
              <View style={styles.locationInfo}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.locationText}>Ubicación obtenida</Text>
              </View>
            )}
            <TextInput
              style={[styles.input, { marginTop: SIZES.sm }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Dirección del trabajo"
              placeholderTextColor={COLORS.textDisabled}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Publicar Trabajo</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: SIZES.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
  },
  inputContainer: {
    marginBottom: SIZES.md,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
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
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    marginTop: SIZES.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radiusMd,
  },
  aiButtonText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.success + '15',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
  },
  totalLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.success,
  },
  totalValue: {
    fontSize: SIZES.fontXl,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  skillChip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skillChipSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  skillText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  skillTextSelected: {
    color: COLORS.white,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  locationButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  locationText: {
    marginLeft: SIZES.xs,
    fontSize: SIZES.fontSm,
    color: COLORS.success,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.lg,
    ...SHADOWS.medium,
  },
  submitButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.white,
  },
});
