import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS, SIZES, SHADOWS } from '../constants/theme';
import { aiAPI, utilAPI, userAPI } from '../services/api';

interface OnboardingStepsProps {
  role: 'worker' | 'business';
  onComplete: () => void;
  initialName?: string;
}

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  role,
  onComplete,
  initialName = '',
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [businessPhotos, setBusinessPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  const totalSteps = role === 'worker' ? 4 : 5;

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const response = await utilAPI.getSkills();
      setAvailableSkills(response.data);
    } catch (error) {
      console.error('Error loading skills:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const pickBusinessPhoto = async () => {
    if (businessPhotos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Máximo 5 fotos del negocio');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setBusinessPhotos([...businessPhotos, `data:image/jpeg;base64,${result.assets[0].base64}`]);
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

      // Get address from coordinates
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
    if (!bio.trim()) {
      Alert.alert('Error', 'Escribe una descripción primero');
      return;
    }

    setAiLoading(true);
    try {
      const response = await aiAPI.improveDescription(bio, 'profile');
      setBio(response.data.improved);
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

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const data = role === 'worker'
        ? {
            name,
            age: age ? parseInt(age) : null,
            bio,
            photo,
            skills: selectedSkills,
            location,
            address,
          }
        : {
            name,
            bio,
            photo,
            business_name: businessName,
            business_photos: businessPhotos,
            location,
            address,
            skills: selectedSkills,
          };

      if (role === 'worker') {
        await userAPI.completeWorkerOnboarding(data);
      } else {
        await userAPI.completeBusinessOnboarding(data);
      }

      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Error', 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedSkills.length > 0;
      case 3:
        return true; // Bio is optional
      case 4:
        if (role === 'worker') return true;
        return businessName.trim().length > 0;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return renderBasicInfoStep();
      case 2:
        return renderSkillsStep();
      case 3:
        return renderBioStep();
      case 4:
        if (role === 'worker') return renderLocationStep();
        return renderBusinessInfoStep();
      case 5:
        return renderLocationStep();
      default:
        return null;
    }
  };

  const renderBasicInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Información Básica</Text>
      <Text style={styles.stepSubtitle}>
        {role === 'worker'
          ? 'Cuéntanos sobre ti'
          : 'Cuéntanos sobre ti y tu negocio'}
      </Text>

      {/* Photo */}
      <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={40} color={COLORS.textSecondary} />
            <Text style={styles.photoText}>Agregar foto</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre completo *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Tu nombre"
          placeholderTextColor={COLORS.textDisabled}
        />
      </View>

      {/* Age (worker only) */}
      {role === 'worker' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Edad</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            placeholder="Tu edad"
            placeholderTextColor={COLORS.textDisabled}
            keyboardType="number-pad"
          />
        </View>
      )}
    </View>
  );

  const renderSkillsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>
        {role === 'worker' ? 'Tus Habilidades' : 'Categorías que Contratas'}
      </Text>
      <Text style={styles.stepSubtitle}>
        {role === 'worker'
          ? 'Selecciona las habilidades que tienes'
          : 'Selecciona las áreas para las que contratas'}
      </Text>

      <View style={styles.skillsContainer}>
        {availableSkills.map((skill) => (
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
                styles.skillChipText,
                selectedSkills.includes(skill) && styles.skillChipTextSelected,
              ]}
            >
              {skill}
            </Text>
            {selectedSkills.includes(skill) && (
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBioStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tu Descripción</Text>
      <Text style={styles.stepSubtitle}>
        Escribe una breve descripción sobre ti
      </Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        value={bio}
        onChangeText={setBio}
        placeholder={role === 'worker'
          ? 'Ej: Soy una persona responsable con 3 años de experiencia en atención al cliente...'
          : 'Ej: Somos un café acogedor en el centro de la ciudad...'}
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
          <ActivityIndicator color={COLORS.secondary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={20} color={COLORS.secondary} />
            <Text style={styles.aiButtonText}>Mejorar con IA</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderBusinessInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Tu Negocio</Text>
      <Text style={styles.stepSubtitle}>Información de tu establecimiento</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Nombre del negocio *</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder="Ej: Café Central"
          placeholderTextColor={COLORS.textDisabled}
        />
      </View>

      {/* Business Photos */}
      <Text style={styles.inputLabel}>Fotos del negocio</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.photosScroll}
      >
        {businessPhotos.map((photoUri, index) => (
          <View key={index} style={styles.businessPhotoContainer}>
            <Image source={{ uri: photoUri }} style={styles.businessPhoto} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={() =>
                setBusinessPhotos(businessPhotos.filter((_, i) => i !== index))
              }
            >
              <Ionicons name="close" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={pickBusinessPhoto}
        >
          <Ionicons name="add" size={32} color={COLORS.primary} />
          <Text style={styles.addPhotoText}>Agregar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Ubicación</Text>
      <Text style={styles.stepSubtitle}>
        {role === 'worker'
          ? 'Para mostrarte trabajos cercanos'
          : 'Para que los trabajadores te encuentren'}
      </Text>

      <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
        <Ionicons name="location" size={24} color={COLORS.primary} />
        <Text style={styles.locationButtonText}>Obtener mi ubicación</Text>
      </TouchableOpacity>

      {location && (
        <View style={styles.locationInfo}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.locationText}>Ubicación obtenida</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Tu dirección"
          placeholderTextColor={COLORS.textDisabled}
        />
      </View>

      {/* Final Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Nombre:</Text>
          <Text style={styles.summaryValue}>{name}</Text>
        </View>
        {role === 'business' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Negocio:</Text>
            <Text style={styles.summaryValue}>{businessName}</Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Habilidades:</Text>
          <Text style={styles.summaryValue}>{selectedSkills.length} seleccionadas</Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(step / totalSteps) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          Paso {step} de {totalSteps}
        </Text>
      </View>

      {/* Step Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonsContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canProceed() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!canProceed() || loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === totalSteps ? 'Completar' : 'Siguiente'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressContainer: {
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  stepSubtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: SIZES.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 60,
  },
  photoText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    marginBottom: SIZES.md,
  },
  inputLabel: {
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
    height: 150,
    textAlignVertical: 'top',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skillChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  skillChipText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    marginRight: SIZES.xs,
  },
  skillChipTextSelected: {
    color: COLORS.white,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.md,
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  aiButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  photosScroll: {
    marginTop: SIZES.sm,
  },
  businessPhotoContainer: {
    width: 150,
    height: 100,
    borderRadius: SIZES.radiusMd,
    marginRight: SIZES.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  businessPhoto: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: SIZES.xs,
    right: SIZES.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 150,
    height: 100,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.primaryTint,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: SIZES.md,
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
    marginBottom: SIZES.md,
  },
  locationText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.success,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.lg,
    ...SHADOWS.small,
  },
  summaryTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  summaryLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMd,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  nextButtonText: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: SIZES.sm,
  },
});
