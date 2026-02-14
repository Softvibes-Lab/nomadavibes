import React, { useEffect, useState, useRef } from 'react';
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
import { WebView } from 'react-native-webview';
import { jobAPI } from '../../src/services/api';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

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
      }

      // Load jobs
      const response = await jobAPI.getJobs();
      setJobs(response.data);
    } catch (error) {
      console.error('Error loading data:', error);
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
    const center = location || { lat: 19.4326, lng: -99.1332 }; // Default to Mexico City
    
    const markers = jobs.map((job, index) => {
      if (!job.location) return '';
      return `
        L.marker([${job.location.lat}, ${job.location.lng}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div class="marker-pin" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\'selectJob\',jobId:\'${job.job_id}\'}))">${index + 1}</div>',
            iconSize: [30, 30]
          })
        }).addTo(map).bindPopup('<b>${job.title}</b><br>$${job.hourly_rate}/hr');
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
          .custom-marker { background: transparent; border: none; }
          .marker-pin {
            width: 30px;
            height: 30px;
            background: #FF6B00;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          }
          .user-marker {
            width: 20px;
            height: 20px;
            background: #00B8A9;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${center.lat}, ${center.lng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);
          
          // User location marker
          ${location ? `
            L.marker([${location.lat}, ${location.lng}], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: '<div class="user-marker"></div>',
                iconSize: [20, 20]
              })
            }).addTo(map).bindPopup('Tu ubicaci\u00f3n');
          ` : ''}
          
          // Job markers
          ${markers}
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'selectJob') {
        const job = jobs.find(j => j.job_id === data.jobId);
        if (job) {
          handleJobSelect(job);
        }
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
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
        <WebView
          source={{ html: generateMapHtml() }}
          style={styles.map}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>

      {/* Jobs List (Bottom Sheet) */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Trabajos disponibles</Text>
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
                  <Ionicons name="location" size={14} color={COLORS.accent} />
                  <Text style={styles.distanceText}>{job.distance_km} km</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
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
                    <Text style={styles.detailText}>{selectedJob.address}</Text>
                  </View>
                </View>

                <Text style={styles.modalDescription}>{selectedJob.description}</Text>

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
    backgroundColor: COLORS.primary + '20',
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
    color: COLORS.accent,
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
