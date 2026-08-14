import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Vibration,
  Platform,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';
import {
  getLocalContacts,
  initializeOfflineDB,
  EmergencyContact,
} from '../../../services/offlineSyncService';

const { width: SCREEN_W } = Dimensions.get('window');
const THUMB_SIZE = 44;
const TRACK_HEIGHT = 52;

const API_BASE_URL = 'http://192.168.137.1:5000/api';

interface MessageBroadcastingProps {
  userId: number;
  compact?: boolean;
}

type BroadcastStatus = 'idle' | 'loading' | 'sending' | 'active' | 'stopped' | 'error';

/* ═══════════════════════════════════════════════════════════
   LOCAL SQLITE – read Emergency PIN
═══════════════════════════════════════════════════════════ */
let pinDb: SQLite.SQLiteDatabase | null = null;

const initPinDatabase = async () => {
  if (pinDb) return pinDb;
  pinDb = await SQLite.openDatabaseAsync('wehere_emergency_pin.db');
  await pinDb.execAsync(`
    CREATE TABLE IF NOT EXISTS user_emergency_pin (
      user_id INTEGER PRIMARY KEY NOT NULL,
      emergency_pin TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return pinDb;
};

const getPinLocally = async (userId: number): Promise<string | null> => {
  try {
    const db = await initPinDatabase();
    const row = await db.getFirstAsync<{ emergency_pin: string }>(
      'SELECT emergency_pin FROM user_emergency_pin WHERE user_id = ?',
      [userId]
    );
    return row?.emergency_pin ?? null;
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════════════════ */

export default function MessageBroadcasting({
  userId,
  compact = false,
}: MessageBroadcastingProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [status, setStatus] = useState<BroadcastStatus>('idle');
  const [activeBroadcastId, setActiveBroadcastId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Message confirmation modal (after swipe)
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [tempMessage, setTempMessage] = useState('');

  // PIN modal state
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Swipe
  const trackWidth = useRef(0);
  const swipeX = useRef(new Animated.Value(0)).current;

  const loadEmergencyContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      await initializeOfflineDB();
      const localContacts = await getLocalContacts(userId);
      setContacts(localContacts);
    } catch (error) {
      console.error('[Broadcast] Failed to load contacts:', error);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadEmergencyContacts();
      initPinDatabase();
    }
  }, [userId, loadEmergencyContacts]);

  const resetSwipe = () => {
    Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
  };

  // Called when user finishes the swipe
  const onSwipeComplete = () => {
    if (contacts.length === 0) {
      Alert.alert(
        'No Emergency Contacts',
        'Please add at least one emergency contact in your profile before broadcasting.'
      );
      resetSwipe();
      return;
    }

    // Open message modal
    setTempMessage('');
    setMessageModalVisible(true);
  };

  const startBroadcast = async (finalMessage: string) => {
    try {
      setStatus('sending');
      setMessageModalVisible(false);

      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 50, 100]);
      }

      const payload = {
        userId,
        emergency_contacts: contacts.map((c) => ({
          contact_name: c.contact_name,
          contact_number: `${c.country_code || '+91'}${c.contact_number}`,
        })),
        nearby_users: null,
        message: finalMessage.trim() || null,
        latitude: null,
        longitude: null,
      };

      const response = await fetch(`${API_BASE_URL}/sos/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Broadcast] Non-JSON response:', text.slice(0, 300));
        throw new Error('Server returned non-JSON response (check API URL)');
      }

      const data = await response.json();

      if (data.success) {
        setActiveBroadcastId(data.broadcast.id);
        setStatus('active');
        setMessage('');
        Alert.alert(
          'Broadcast Sent',
          `Emergency message sent to ${contacts.length} contact(s).`
        );
      } else {
        setStatus('error');
        Alert.alert('Failed', data.message || 'Could not send broadcast');
      }
    } catch (error) {
      console.error('[Broadcast] Error:', error);
      setStatus('error');
      Alert.alert(
        'Error',
        'Failed to send emergency broadcast. Check your connection.'
      );
    } finally {
      resetSwipe();
    }
  };

  // ── Stop flow: open PIN modal first ─────────────────────────────────────
  const handleStopBroadcast = () => {
    if (!activeBroadcastId) return;
    setPinInput('');
    setPinError('');
    setShowPin(false);
    setPinModalVisible(true);
  };

  const verifyPinAndStop = async () => {
    if (!pinInput.trim()) {
      setPinError('Please enter your Emergency PIN');
      return;
    }

    if (!/^\d{4,6}$/.test(pinInput.trim())) {
      setPinError('PIN must be 4–6 digits');
      return;
    }

    setPinVerifying(true);
    setPinError('');

    try {
      const localPin = await getPinLocally(userId);

      if (!localPin) {
        setPinError('No Emergency PIN found. Set it in Profile first.');
        setPinVerifying(false);
        return;
      }

      if (String(localPin) !== String(pinInput.trim())) {
        setPinError('Incorrect Emergency PIN');
        setPinVerifying(false);
        if (Platform.OS !== 'web') {
          Vibration.vibrate(200);
        }
        return;
      }

      await stopBroadcastOnServer(pinInput.trim());
    } catch (error) {
      console.error('[Broadcast] PIN verify error:', error);
      setPinError('Verification failed. Try again.');
      setPinVerifying(false);
    }
  };

  const stopBroadcastOnServer = async (pin: string) => {
    if (!activeBroadcastId) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/sos/broadcast/${activeBroadcastId}/stop`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, emergencyPin: pin }),
        }
      );

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[Broadcast] Non-JSON response:', text.slice(0, 300));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (data.success) {
        setPinModalVisible(false);
        setPinInput('');
        setPinError('');
        setStatus('stopped');
        setActiveBroadcastId(null);
        setPinVerifying(false);
        Alert.alert('Stopped', 'Emergency broadcast has been stopped.');
      } else {
        setPinError(data.message || 'Could not stop broadcast');
        setPinVerifying(false);
        if (data.message?.toLowerCase().includes('pin')) {
          if (Platform.OS !== 'web') Vibration.vibrate(200);
        }
      }
    } catch (error) {
      console.error('[Broadcast] Stop error:', error);
      setPinError('Failed to stop broadcast. Check connection.');
      setPinVerifying(false);
    }
  };

  // ── Swipe gesture ───────────────────────────────────────────────────────
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
          }).start(() => onSwipeComplete());
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  // ── Compact mode ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <View style={styles.compactBody}>
        <MaterialCommunityIcons name="message-alert" size={20} color="#dc2626" />
        <Text style={styles.compactText}>Broadcast</Text>
        {status === 'active' && <View style={styles.liveDot} />}
      </View>
    );
  }

  // ── Full mode ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Status Header */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusIndicator,
              status === 'active' && styles.statusActive,
              status === 'sending' && styles.statusSending,
              status === 'stopped' && styles.statusStopped,
              status === 'error' && styles.statusError,
            ]}
          />
          <Text style={styles.statusLabel}>
            {status === 'idle' && 'Ready'}
            {status === 'loading' && 'Loading...'}
            {status === 'sending' && 'Sending...'}
            {status === 'active' && 'LIVE BROADCAST'}
            {status === 'stopped' && 'Stopped'}
            {status === 'error' && 'Error'}
          </Text>
        </View>
        <Text style={styles.contactCount}>
          {loadingContacts ? '...' : `${contacts.length} contacts`}
        </Text>
      </View>

      {/* ── Swipe to Broadcast (when not active) ── */}
      {status !== 'active' && status !== 'sending' ? (
        <View
          style={styles.swipeTrack}
          onLayout={(e) => {
            trackWidth.current = e.nativeEvent.layout.width;
          }}
        >
          <Text style={styles.swipeHint} numberOfLines={1}>
            Swipe to Broadcast SOS
          </Text>
          <Animated.View
            style={[styles.swipeThumb, { transform: [{ translateX: swipeX }] }]}
            {...panResponder.panHandlers}
          >
            {status === 'sending' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialCommunityIcons name="broadcast" size={20} color="#fff" />
            )}
          </Animated.View>
        </View>
      ) : (
        /* Stop button when live */
        <TouchableOpacity
          style={[styles.btn, styles.stopBtn]}
          onPress={handleStopBroadcast}
          activeOpacity={0.85}
        >
          <Ionicons name="stop-circle" size={22} color="#fff" />
          <Text style={styles.btnText}>Stop Broadcast</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.helperText}>
        {contacts.length === 0
          ? 'Add emergency contacts in Profile first'
          : status === 'active'
          ? 'Enter Emergency PIN to stop the broadcast'
          : 'Swipe right to send emergency broadcast'}
      </Text>

      {/* ── Message confirmation modal (after swipe) ── */}
      <Modal
        visible={messageModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setMessageModalVisible(false);
          resetSwipe();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircle}>
              <MaterialCommunityIcons name="message-alert" size={32} color="#dc2626" />
            </View>

            <Text style={styles.modalTitle}>Emergency Broadcast</Text>
            <Text style={styles.modalSubtitle}>
              This will notify {contacts.length} emergency contact
              {contacts.length > 1 ? 's' : ''}. Add an optional message:
            </Text>

            <TextInput
              style={styles.messageInput}
              placeholder="Optional message (e.g. I need help)"
              placeholderTextColor="#94A3B8"
              value={tempMessage}
              onChangeText={setTempMessage}
              maxLength={120}
              multiline
              numberOfLines={3}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setMessageModalVisible(false);
                  setTempMessage('');
                  resetSwipe();
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.okBtn]}
                onPress={() => startBroadcast(tempMessage)}
              >
                <MaterialCommunityIcons name="broadcast" size={18} color="#fff" />
                <Text style={styles.okText}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Emergency PIN Modal ── */}
      <Modal
        visible={pinModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!pinVerifying) {
            setPinModalVisible(false);
            setPinInput('');
            setPinError('');
          }
        }}
      >
        <View style={styles.pinOverlay}>
          <View style={styles.pinBox}>
            <View style={styles.pinIconCircle}>
              <Ionicons name="shield-checkmark" size={36} color="#dc2626" />
            </View>

            <Text style={styles.pinTitle}>Enter Emergency PIN</Text>
            <Text style={styles.pinSubtitle}>
              Verify your PIN to stop the live broadcast
            </Text>

            <View style={styles.pinInputRow}>
              <TextInput
                style={styles.pinInput}
                value={pinInput}
                onChangeText={(t) => {
                  setPinInput(t.replace(/[^0-9]/g, ''));
                  setPinError('');
                }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPin}
                editable={!pinVerifying}
                autoFocus
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPin((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPin ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {pinError ? <Text style={styles.pinErrorText}>{pinError}</Text> : null}

            <View style={styles.pinActions}>
              <TouchableOpacity
                style={[styles.pinActionBtn, styles.pinCancelBtn]}
                onPress={() => {
                  if (!pinVerifying) {
                    setPinModalVisible(false);
                    setPinInput('');
                    setPinError('');
                  }
                }}
                disabled={pinVerifying}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pinActionBtn,
                  styles.pinConfirmBtn,
                  pinVerifying && { opacity: 0.6 },
                ]}
                onPress={verifyPinAndStop}
                disabled={pinVerifying}
              >
                {pinVerifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={18} color="#fff" />
                    <Text style={styles.pinConfirmText}>Stop</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  compactBody: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  compactText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
    marginTop: 2,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  statusActive: { backgroundColor: '#dc2626' },
  statusSending: { backgroundColor: '#f59e0b' },
  statusStopped: { backgroundColor: '#64748B' },
  statusError: { backgroundColor: '#ef4444' },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  contactCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Swipe track
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

  // Stop button (when live)
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
  },
  stopBtn: { backgroundColor: '#334155' },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
  },

  /* Message confirmation modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  messageInput: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  okBtn: {
    backgroundColor: '#dc2626',
  },
  okText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  /* PIN Modal */
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  pinBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  pinIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  pinSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  pinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pinInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#0F172A',
    paddingVertical: 14,
    textAlign: 'center',
  },
  eyeBtn: {
    padding: 6,
  },
  pinErrorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  pinActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  pinActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  pinCancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pinCancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  pinConfirmBtn: {
    backgroundColor: '#dc2626',
  },
  pinConfirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});