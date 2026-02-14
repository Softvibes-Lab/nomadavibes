import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { jobAPI } from '../../src/services/api';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

// Conditionally import WebView for native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

export default function MapScreen() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        // Default to Mexico City if no permission
        setLocation({ lat: 19.4326, lng: -99.1332 });
      }

      // Load jobs
      const response = await jobAPI.getJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set default location on error
      setLocation({ lat: 19.4326, lng: -99.1332 });
    } finally {
      setLoading(false);
    }
  };

  const handleJobSelect = (job: any) => {
    setSelectedJob(job);
    setShowJobModal(true);
  };

  // Generate OpenStreetMap HTML
  const generateMapHtml = () => {
    const center = location || { lat: 19.4326, lng: -99.1332 };
    
    const markers = jobs.map((job, index) => {
      if (!job.location) return '';
      return `
        L.marker([${job.location.lat}, ${job.location.lng}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-pin">${index + 1}</div>',
            iconSize: [30, 30]
          })
        }).addTo(map).bindPopup('<b>${job.title}</b><br>$${job.hourly_rate}/hr<br><small>${job.business_name}</small>');
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; }
          #map { width: 100%; height: 100%; }
          .custom-marker { background: transparent; border: none; }
          .marker-pin {
            width: 32px;
            height: 32px;
            background: #00BFA5;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          .user-marker {
            width: 16px;
            height: 16px;
            background: #10B981;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          .leaflet-popup-content-wrapper {
            border-radius: 12px;
          }
          .leaflet-popup-content {
            margin: 12px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView([${center.lat}, ${center.lng}], 13);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);
          
          // User location marker
          ${location ? `
            L.marker([${location.lat}, ${location.lng}], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '<div class="user-marker"></div>',
                iconSize: [16, 16]
              })
            }).addTo(map).bindPopup('Tu ubicación');
          ` : ''}
          
          // Job markers
          ${markers}
          
          // Fit bounds if there are jobs
          ${jobs.length > 0 ? `
            var bounds = L.latLngBounds([
              ${jobs.filter(j => j.location).map(j => `[${j.location.lat}, ${j.location.lng}]`).join(',')}
              ${location ? `,[${location.lat}, ${location.lng}]` : ''}
            ]);
            if (bounds.isValid()) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          ` : ''}
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trabajos Cercanos</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.badgeText}>{jobs.length} trabajos</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          // Use iframe for web
          <iframe
            srcDoc={generateMapHtml()}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Map"
          />
        ) : WebView ? (
          // Use WebView for native
          <WebView
            source={{ html: generateMapHtml() }}
            style={styles.map}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          />
        ) : (
          <View style={styles.mapFallback}>
            <Ionicons name="map-outline" size={64} color={COLORS.textDisabled} />
            <Text style={styles.mapFallbackText}>Mapa no disponible</Text>
          </View>
        )}
      </View>

      {/* Jobs List (Bottom Sheet) */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Trabajos disponibles</Text>
        {jobs.length === 0 ? (
          <View style={styles.emptyJobs}>
            <Text style={styles.emptyText}>No hay trabajos disponibles</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {jobs.map((job) => (
              <TouchableOpacity
                key={job.job_id}
                style={styles.jobChip}
                onPress={() => handleJobSelect(job)}
              >
                <View style={styles.jobChipHeader}>
                  <Text style={styles.jobChipTitle} numberOfLines={1}>
                    {job.title}
                  </Text>
                  <Text style={styles.jobChipRate}>${job.hourly_rate}/hr</Text>
                </View>
                <Text style={styles.jobChipBusiness}>{job.business_name}</Text>
                {job.distance_km && (
                  <View style={styles.distanceRow}>
                    <Ionicons name="location" size={14} color={COLORS.primary} />
                    <Text style={styles.distanceText}>{job.distance_km} km</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Job Detail Modal */}
      <Modal
        visible={showJobModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowJobModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {selectedJob && (
              <>
                <Text style={styles.modalTitle}>{selectedJob.title}</Text>
                <Text style={styles.modalBusiness}>{selectedJob.business_name}</Text>
                
                <View style={styles.modalDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="cash" size={20} color={COLORS.success} />
                    <Text style={styles.detailText}>${selectedJob.hourly_rate}/hr</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={20} color={COLORS.primary} />
                    <Text style={styles.detailText}>{selectedJob.duration_hours}h</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="location" size={20} color={COLORS.accent} />
                    <Text style={styles.detailText} numberOfLines={1}>{selectedJob.address}</Text>
                  </View>
                </View>

                <Text style={styles.modalDescription} numberOfLines={3}>
                  {selectedJob.description}
                </Text>

                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => {
                    setShowJobModal(false);
                    router.push(`/job/${selectedJob.job_id}`);
                  }}
                >
                  <Text style={styles.viewButtonText}>Ver Detalles</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating refresh button */}
      <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
        <Ionicons name="refresh" size={24} color={COLORS.white} />
      </TouchableOpacity>
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
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  headerBadge: {
    backgroundColor: COLORS.primaryTint20,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  badgeText: {
    fontSize: SIZES.fontSm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  mapFallbackText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  bottomSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.sm,
    paddingBottom: SIZES.xl,
    ...SHADOWS.large,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: SIZES.md,
  },
  sheetTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  emptyJobs: {
    paddingVertical: SIZES.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  jobChip: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginRight: SIZES.sm,
    width: 200,
    ...SHADOWS.small,
  },
  jobChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  jobChipTitle: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SIZES.sm,
  },
  jobChipRate: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.success,
  },
  jobChipBusiness: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: SIZES.fontXs,
    color: COLORS.primary,
  },
  refreshButton: {
    position: 'absolute',
    bottom: 160,
    right: SIZES.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl,
    padding: SIZES.lg,
    paddingTop: SIZES.xl,
  },
  closeButton: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: SIZES.fontXxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  modalBusiness: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  modalDetails: {
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
    marginLeft: 6,
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  modalDescription: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.lg,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
  },
  viewButtonText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
    marginRight: SIZES.sm,
  },
});
