import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/header';
import ClipRecorder from '../components/sos/ClipRecorder';
import AmbulanceAlert from '../components/sos/AmbulanceAlert';
import MessageBroadcasting from '../components/sos/MessageBroadcasting';

const THUMB_SIZE = 44;
const TRACK_HEIGHT = 52;

export default function SOS() {
  const [cameraVisible, setCameraVisible] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [ready, setReady] = useState(false);

  // Recording swipe
  const recordSwipeX = useRef(new Animated.Value(0)).current;
  const recordTrackWidth = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user?.id) setUserId(Number(user.id));
          if (user?.role) setUserRole(String(user.role));
        }
      } catch (err) {
        console.error('[SOS] init error:', err);
      } finally {
        setLoadingUser(false);
        setReady(true);
      }
    };
    init();
  }, []);

  // ─── Recording swipe ───────────────────────────────────────────────────────
  const recordPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        const max = Math.max(0, recordTrackWidth.current - THUMB_SIZE);
        recordSwipeX.setValue(Math.max(0, Math.min(g.dx, max)));
      },
      onPanResponderRelease: (_, g) => {
        const max = Math.max(1, recordTrackWidth.current - THUMB_SIZE);
        if (g.dx > max * 0.65) {
          Animated.timing(recordSwipeX, {
            toValue: max,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            setCameraVisible(true);
            setTimeout(() => {
              Animated.spring(recordSwipeX, {
                toValue: 0,
                useNativeDriver: false,
              }).start();
            }, 400);
          });
        } else {
          Animated.spring(recordSwipeX, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#dc2626" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ───────────── 1. Emergency Recording ───────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="emergency-recording" size={22} color="#dc2626" />
            <Text style={styles.cardTitle}>Emergency Recording</Text>
          </View>

          <View
            style={styles.swipeTrack}
            onLayout={(e) => {
              recordTrackWidth.current = e.nativeEvent.layout.width;
            }}
          >
            <Text style={styles.swipeHint}>Swipe to Record SOS</Text>
            <Animated.View
              style={[
                styles.swipeThumb,
                { transform: [{ translateX: recordSwipeX }] },
              ]}
              {...recordPan.panHandlers}
            >
              <MaterialIcons name="emergency-recording" size={20} color="#fff" />
            </Animated.View>
          </View>
        </View>

        {/* ───────────── 2. Ambulance Alert ───────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="car-emergency"
              size={22}
              color="#dc2626"
            />
            <Text style={styles.cardTitle}>Ambulance Alert</Text>
          </View>

          {loadingUser ? (
            <ActivityIndicator color="#dc2626" style={{ marginVertical: 12 }} />
          ) : userId ? (
            <AmbulanceAlert userId={userId} userRole={userRole} />
          ) : (
            <Text style={styles.hint}>Login required</Text>
          )}
        </View>

        {/* ───────────── 3. Message Broadcast ───────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="message-alert"
              size={22}
              color="#dc2626"
            />
            <Text style={styles.cardTitle}>Message Broadcast</Text>
          </View>

          {loadingUser ? (
            <ActivityIndicator color="#dc2626" style={{ marginVertical: 12 }} />
          ) : userId ? (
            <MessageBroadcasting userId={userId} compact={false} />
          ) : (
            <Text style={styles.hint}>Login required</Text>
          )}
        </View>
      </ScrollView>

      <ClipRecorder
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onUploaded={() => console.log('[SOS] Clip uploaded')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card
  card: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },

  // Shared swipe track (only used by Recording now)
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

  hint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});