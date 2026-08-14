import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_SIZE = 44;
const TRACK_HEIGHT = 52;

const getApiBaseUrl = async (): Promise<string> => {
  try {
    const storedIp = await AsyncStorage.getItem('serverIp');
    if (storedIp) {
      return `http://${storedIp}:5000/api`;
    }
    return 'http://192.168.137.1:5000/api';
  } catch {
    return 'http://192.168.137.1:5000/api';
  }
};

interface AlertItem {
  alert_id: number;
  alert_sender: number;
  sender_location: {
    latitude: number;
    longitude: number;
    location_name: string;
  };
  my_distance_km: number;
  created_at: string;
}

interface SentAlertSummary {
  alert_id: number;
  receivers_count: number;
  received_count: number;
  created_at: string;
}

interface AmbulanceAlertProps {
  userId: number;
  userRole?: string;
}

export default function AmbulanceAlert({ userId }: AmbulanceAlertProps) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<AlertItem[]>([]);
  const [latestSent, setLatestSent] = useState<SentAlertSummary | null>(null);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://192.168.137.1:5000/api');

  const trackWidth = useRef(0);
  const swipeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadApiUrl = async () => {
      const url = await getApiBaseUrl();
      setApiBaseUrl(url);
    };
    loadApiUrl();
  }, []);

  const fetchMyAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/notifications/ambulance-alerts/${userId}`);
      const json = await res.json();
      if (!res.ok || !json.success) return;

      const pending = (json.data || []).filter((n: any) => n.my_received_status !== 1);
      const mapped: AlertItem[] = pending.map((n: any) => ({
        alert_id: n.id,
        alert_sender: n.alert_sender,
        sender_location: n.sender_location,
        my_distance_km: n.my_distance_km,
        created_at: n.created_at,
      }));
      setActiveAlerts(mapped);
      // No popup – just keep the count for the banner
    } catch (err) {
      console.error('[AmbulanceAlert] fetchMyAlerts error:', err);
    }
  }, [userId, apiBaseUrl]);

  useEffect(() => {
    fetchMyAlerts();
    const interval = setInterval(fetchMyAlerts, 20000);
    return () => clearInterval(interval);
  }, [fetchMyAlerts]);

  const activateAmbulanceAlert = async () => {
    if (activating) return;
    try {
      setActivating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;

      let locationName = 'Current Location';
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places[0]) {
          const p = places[0];
          locationName =
            [p.name, p.street, p.city].filter(Boolean).join(', ') || locationName;
        }
      } catch (_) {}

      const res = await fetch(`${apiBaseUrl}/ambulance-alerts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: userId,
          latitude,
          longitude,
          location_name: locationName,
          radius_km: 2.5,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        Alert.alert('Error', json.message || `Server error ${res.status}`);
        return;
      }

      if (json.success) {
        setLatestSent({
          alert_id: json.data?.alert_id,
          receivers_count: json.data?.receivers_count ?? 0,
          received_count: 0,
          created_at: new Date().toISOString(),
        });
        setShowSenderModal(true);
      } else {
        Alert.alert('Error', json.message || 'Failed to send alert');
      }
    } catch (err: any) {
      console.error('[AmbulanceAlert] activate error:', err);
      Alert.alert('Error', err?.message || 'Something went wrong');
    } finally {
      setActivating(false);
      Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const max = Math.max(0, trackWidth.current - THUMB_SIZE);
        swipeX.setValue(Math.max(0, Math.min(gesture.dx, max)));
      },
      onPanResponderRelease: (_, gesture) => {
        const max = Math.max(1, trackWidth.current - THUMB_SIZE);
        if (gesture.dx > max * 0.65) {
          Animated.timing(swipeX, {
            toValue: max,
            duration: 120,
            useNativeDriver: false,
          }).start(() => activateAmbulanceAlert());
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrapper}>
      {/* Swipe to send alert */}
      <View
        style={styles.swipeTrack}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <Text style={styles.swipeHint} numberOfLines={1}>
          Swipe to alert
        </Text>
        <Animated.View
          style={[styles.swipeThumb, { transform: [{ translateX: swipeX }] }]}
          {...panResponder.panHandlers}
        >
          {activating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome5 name="ambulance" size={16} color="#fff" />
          )}
        </Animated.View>
      </View>

      {/* Banner only – no popup */}
      {activeAlerts.length > 0 && (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push('/components/ambulance-notifications')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="ambulance" size={16} color="#fff" />
          <Text style={styles.bannerText} numberOfLines={1}>
            {activeAlerts.length} nearby ambulance alert{activeAlerts.length > 1 ? 's' : ''} – tap to view
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Sender success modal (kept) */}
      <Modal visible={showSenderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <FontAwesome5 name="paper-plane" size={18} color="#16a34a" />
              <Text style={styles.modalTitle}>Alert Sent</Text>
            </View>
            {latestSent && (
              <Text style={styles.modalMsg}>
                Notified {latestSent.receivers_count} nearby people.
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.sendAgainBtn}
                onPress={() => {
                  setShowSenderModal(false);
                  activateAmbulanceAlert();
                }}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <FontAwesome5 name="ambulance" size={13} color="#fff" />
                    <Text style={styles.sendAgainText}>Send Again</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dismissBtn}
                onPress={() => setShowSenderModal(false)}
              >
                <Text style={styles.dismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  swipeTrack: {
    height: TRACK_HEIGHT,
    backgroundColor: '#FEE2E2',
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  swipeHint: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    paddingLeft: THUMB_SIZE + 4,
  },
  swipeThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  bannerText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: Math.min(SCREEN_W - 48, 340),
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalMsg: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
  },
  modalActions: {
    marginTop: 14,
    gap: 8,
  },
  sendAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  sendAgainText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});