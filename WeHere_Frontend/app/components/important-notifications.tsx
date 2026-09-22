import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://10.100.67.248:5000/api';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface NearbyUser {
  user_id: number;
  username: string;
  mobile_number: string;
  distance: number;
}

interface HelperUser {
  user_id: number;
  username: string;
  full_name: string;
  mobile_number: string;
  offered_help_at: string;
}

interface SOSBroadcastNotification {
  id: number;
  type: 'sos_broadcast';
  priority: 'urgent';
  title: string;
  body: string;
  sender: {
    user_id: number;
    username: string;
    full_name: string;
    mobile_number: string;
    latitude: string;
    longitude: string;
    location: string;
  };
  broadcast: {
    message: string | null;
    latitude: string;
    longitude: string;
    created_at: string;
  };
  distance_km: string;
  distance_meters: number;
  is_stopped: number;
  created_at: string;
  emergency_contacts: any[];
  nearby_users: NearbyUser[];
  users_received?: HelperUser[];
  has_user_helped?: boolean;
}

interface SupportRequestNotification {
  id: number;
  type: 'support_request';
  user_id: number;
  volunteer_id: number;
  message: string | null;
  request_status: string | null;
  volunteer_response: string | null;
  created_at: string;
  updated_at: string;
  sender: {
    user_id: number;
    username: string;
    full_name: string;
    mobile_number: string;
    location: string | null;
    latitude: string | null;
    longitude: string | null;
    blood_group?: string | null;
    gender?: string | null;
  };
}

type AnyNotification = SOSBroadcastNotification | SupportRequestNotification;

export default function ImportantNotifications() {
  const [notifications, setNotifications] = useState<AnyNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [helpingId, setHelpingId] = useState<number | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseMessages, setResponseMessages] = useState<{ [key: number]: string }>({});

  const getUserId = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id) {
          setUserId(user.id);
          return user.id;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }, []);

  // ── Fetch SOS + Support Requests ──────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const id = await getUserId();
      if (!id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. SOS broadcasts
      let sosList: SOSBroadcastNotification[] = [];
      try {
        const sosRes = await fetch(`${API_BASE_URL}/notifications/sos-broadcasts/${id}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (sosRes.ok) {
          const sosData = await sosRes.json();
          if (sosData.success) {
            sosList = (sosData.data || []).map((item: SOSBroadcastNotification) => ({
              ...item,
              type: 'sos_broadcast' as const,
              has_user_helped: item.users_received?.some((u) => u.user_id === id) || false,
            }));
          }
        }
      } catch (e) {
        console.log('SOS fetch error', e);
      }

      // 2. Support requests (only for this volunteer)
      let supportList: SupportRequestNotification[] = [];
      try {
        const supportRes = await fetch(`${API_BASE_URL}/support/requests/${id}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (supportRes.ok) {
          const supportData = await supportRes.json();
          if (supportData.success) {
            supportList = supportData.data || [];
          }
        }
      } catch (e) {
        console.log('Support requests fetch error', e);
      }

      // Merge & sort by date (newest first)
      const merged = [...sosList, ...supportList].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(merged);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getUserId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const openMaps = (latitude: string | null, longitude: string | null, locationName: string) => {
    if (!latitude || !longitude) {
      Alert.alert('Location Not Available', 'Sender location coordinates are not available.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(locationName || 'Location')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps.');
    });
  };

  const callContact = (phoneNumber: string | null) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This contact has no phone number.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Could not make call.');
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // ── SOS: Offer help ───────────────────────────────────────────────────
  const handleOfferHelp = async (broadcastId: number) => {
    if (!userId) {
      Alert.alert('Error', 'User not found');
      return;
    }
    Alert.alert(
      'Offer Help',
      'Are you sure you want to offer help for this emergency?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: "Yes, I'll Help", onPress: () => confirmOfferHelp(broadcastId) },
      ]
    );
  };

  const confirmOfferHelp = async (broadcastId: number) => {
    try {
      setHelpingId(broadcastId);
      const response = await fetch(
        `${API_BASE_URL}/notifications/sos-broadcasts/${broadcastId}/help`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.type === 'sos_broadcast' && item.id === broadcastId
              ? { ...item, has_user_helped: true, users_received: data.data.users_received }
              : item
          )
        );
        Alert.alert('Thank You!', 'You have offered help.');
      } else {
        Alert.alert('Error', data.message || 'Failed to offer help');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to offer help');
    } finally {
      setHelpingId(null);
    }
  };

  // ── Support Request: Respond with message ──────────────────────────
  const handleSupportResponse = async (requestId: number, response: 'will_help' | 'cant_help') => {
    if (!userId) {
      Alert.alert('Error', 'User not found');
      return;
    }

    const message = responseMessages[requestId] || '';
    
    // If user selected "will_help" and no message, ask if they want to add one
    if (response === 'will_help' && !message.trim()) {
      Alert.alert(
        'Add Message',
        'Would you like to add a message to the requester?',
        [
          { text: 'Skip', onPress: () => confirmSupportResponse(requestId, response, '') },
          { text: 'Add Message', onPress: () => showMessageInput(requestId, response) },
        ]
      );
      return;
    }

    // If user selected "cant_help", ask for confirmation
    if (response === 'cant_help') {
      Alert.alert(
        "I Can't Help",
        "Confirm that you cannot help at this time?",
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => confirmSupportResponse(requestId, response, message),
          },
        ]
      );
      return;
    }

    // For "will_help" with message
    confirmSupportResponse(requestId, response, message);
  };

  const showMessageInput = (requestId: number, response: 'will_help' | 'cant_help') => {
    Alert.prompt(
      'Your Message',
      'Enter a message to the requester (optional):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: (inputMessage) => {
            const message = inputMessage || '';
            setResponseMessages(prev => ({ ...prev, [requestId]: message }));
            confirmSupportResponse(requestId, response, message);
          },
        },
      ],
      'plain-text',
      responseMessages[requestId] || '',
    );
  };

  const confirmSupportResponse = async (
    requestId: number,
    volunteer_response: 'will_help' | 'cant_help',
    message: string
  ) => {
    try {
      setRespondingId(requestId);

      const res = await fetch(`${API_BASE_URL}/support/request/${requestId}/respond`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          volunteer_response,
          message: message || null // Send message to backend
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update response');
      }

      // Update local state - volunteer_response now stores the message
      setNotifications((prev) =>
        prev.map((item) =>
          item.type === 'support_request' && item.id === requestId
            ? {
                ...item,
                volunteer_response: data.data.volunteer_response || message || volunteer_response,
                request_status: volunteer_response === 'will_help' ? 'accepted' : 'rejected',
              }
            : item
        )
      );

      // Clear the message for this request
      setResponseMessages(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });

      Alert.alert(
        'Response Sent',
        volunteer_response === 'will_help'
          ? 'You offered help. The requester will be notified.'
          : 'Response recorded.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send response');
    } finally {
      setRespondingId(null);
    }
  };

  // ── Get notification label ──────────────────────────────────────────
  const getNotificationLabel = (item: AnyNotification) => {
    if (item.type === 'sos_broadcast') {
      const sosItem = item as SOSBroadcastNotification;
      if (sosItem.is_stopped === 1) {
        return { label: 'Stopped Broadcast', icon: 'checkmark-circle', color: '#94A3B8', bgColor: '#F1F5F9' };
      }
      return { label: '🚨 SOS Broadcast', icon: 'alert-circle', color: '#dc2626', bgColor: '#FEE2E2' };
    }
    return { label: '🤝 Support Request', icon: 'hand-left', color: '#2D5A27', bgColor: '#DCFCE7' };
  };

  // ── Render SOS card ───────────────────────────────────────────────────
  const renderSOS = (item: SOSBroadcastNotification) => {
    const senderName = item.sender.full_name || item.sender.username || 'Unknown User';
    const hasMessage = item.broadcast.message && item.broadcast.message.trim() !== '';
    const isNearby = parseFloat(item.distance_km) < 2;
    const hasHelped = item.has_user_helped || false;
    const isStopped = item.is_stopped === 1;
    const label = getNotificationLabel(item);

    return (
      <View
        style={[
          styles.card,
          isNearby && !isStopped && styles.cardNearby,
          isStopped && styles.cardStopped,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isStopped && styles.iconContainerStopped]}>
            <Ionicons
              name={label.icon as any}
              size={28}
              color={label.color}
            />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={[styles.senderName, isStopped && styles.textStopped]}>{senderName}</Text>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        {/* Notification Label */}
        <View style={[styles.labelContainer, { backgroundColor: label.bgColor }]}>
          <Text style={[styles.labelText, { color: label.color }]}>
            {label.label}
          </Text>
          {isNearby && !isStopped && (
            <View style={[styles.nearbyBadge, { marginLeft: 8 }]}>
              <Text style={styles.nearbyText}>Nearby</Text>
            </View>
          )}
          {isStopped && (
            <View style={[styles.stoppedBadge, { marginLeft: 8 }]}>
              <Text style={styles.stoppedBadgeText}>Stopped</Text>
            </View>
          )}
        </View>

        <Text style={[styles.distanceText, isStopped && styles.textStopped]}>
          <Ionicons name="location" size={14} color={isStopped ? '#94A3B8' : '#64748B'} />{' '}
          {item.distance_km} km away
        </Text>

        {item.sender.location && (
          <Text style={[styles.locationText, isStopped && styles.textStopped]}>
            📍 {item.sender.location}
          </Text>
        )}

        {hasMessage && (
          <View style={[styles.messageBox, isStopped && styles.messageBoxStopped]}>
            <Text style={[styles.messageLabel, isStopped && styles.textStopped]}>📝 Message:</Text>
            <Text style={[styles.messageText, isStopped && styles.textStopped]}>
              {item.broadcast.message}
            </Text>
          </View>
        )}

        {isStopped ? (
          <View style={styles.stoppedMessageContainer}>
            <Ionicons name="information-circle" size={18} color="#94A3B8" />
            <Text style={styles.stoppedMessageText}>
              This emergency broadcast has been stopped by the sender
            </Text>
          </View>
        ) : (
          <View style={styles.helpSection}>
            {hasHelped ? (
              <View style={styles.helpedContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                <Text style={styles.helpedText}>You offered help ✓</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.helpButton}
                onPress={() => handleOfferHelp(item.id)}
                disabled={helpingId === item.id}
              >
                {helpingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="heart" size={18} color="#fff" />
                    <Text style={styles.helpButtonText}>I Will Help</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.locationBtn, isStopped && styles.actionBtnDisabled]}
            onPress={() =>
              openMaps(
                item.sender.latitude || item.broadcast.latitude,
                item.sender.longitude || item.broadcast.longitude,
                item.sender.location || 'Emergency Location'
              )
            }
            disabled={isStopped}
          >
            <Ionicons name="navigate" size={16} color={isStopped ? '#94A3B8' : '#fff'} />
            <Text style={[styles.actionBtnText, isStopped && styles.textStopped]}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn, isStopped && styles.actionBtnDisabled]}
            onPress={() => callContact(item.sender.mobile_number)}
            disabled={isStopped}
          >
            <Ionicons name="call" size={16} color={isStopped ? '#94A3B8' : '#fff'} />
            <Text style={[styles.actionBtnText, isStopped && styles.textStopped]}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Render Support Request card ───────────────────────────────────────
  const renderSupportRequest = (item: SupportRequestNotification) => {
    const senderName = item.sender.full_name || item.sender.username || 'Unknown User';
    const hasResponded = !!item.volunteer_response;
    const isWillHelp = item.request_status === 'accepted';
    const isCantHelp = item.request_status === 'rejected';
    const label = getNotificationLabel(item);
    const currentMessage = responseMessages[item.id] || '';

    return (
      <View style={[styles.card, styles.supportCard]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, styles.supportIconContainer]}>
            <Ionicons name={label.icon as any} size={26} color={label.color} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          </View>
        </View>

        {/* Notification Label */}
        <View style={[styles.labelContainer, { backgroundColor: label.bgColor }]}>
          <Text style={[styles.labelText, { color: label.color }]}>
            {label.label}
          </Text>
          <View style={[styles.supportBadge, { marginLeft: 8 }]}>
            <Text style={styles.supportBadgeText}>Volunteer</Text>
          </View>
        </View>

        {item.sender.location && (
          <Text style={styles.locationText}>📍 {item.sender.location}</Text>
        )}

        {/* Requester's Message */}
        {item.message ? (
          <View style={[styles.messageBox, { borderLeftColor: '#2D5A27' }]}>
            <Text style={styles.messageLabel}>📝 Requester's Message:</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        ) : (
          <Text style={styles.noMessageText}>No message provided</Text>
        )}

        {/* Show volunteer's response if they've responded */}
        {hasResponded && (
          <View style={[styles.messageBox, { 
            borderLeftColor: isWillHelp ? '#16a34a' : '#dc2626',
            backgroundColor: isWillHelp ? '#F0FDF4' : '#FEF2F2'
          }]}>
            <Text style={[styles.messageLabel, { color: isWillHelp ? '#16a34a' : '#dc2626' }]}>
              {isWillHelp ? '✅ Your Response (Will Help):' : '❌ Your Response:'}
            </Text>
            <Text style={styles.messageText}>
              {item.volunteer_response || (isWillHelp ? 'Will help' : 'Cannot help')}
            </Text>
          </View>
        )}

        {/* Response buttons / status */}
        {!hasResponded ? (
          <View style={styles.responseSection}>
            {/* Message input for volunteer */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Optional: Enter your response message..."
                placeholderTextColor="#94A3B8"
                value={currentMessage}
                onChangeText={(text) => 
                  setResponseMessages(prev => ({ ...prev, [item.id]: text }))
                }
                multiline
                numberOfLines={2}
                editable={respondingId !== item.id}
              />
            </View>

            <View style={styles.responseButtons}>
              <TouchableOpacity
                style={[styles.responseBtn, styles.willHelpBtn]}
                onPress={() => handleSupportResponse(item.id, 'will_help')}
                disabled={respondingId === item.id}
              >
                {respondingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.responseBtnText}>I Will Help</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.responseBtn, styles.cantHelpBtn]}
                onPress={() => handleSupportResponse(item.id, 'cant_help')}
                disabled={respondingId === item.id}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.responseBtnText}>I Can't Help</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.responseStatus,
              isWillHelp ? styles.responseStatusHelp : styles.responseStatusCant,
            ]}
          >
            <Ionicons
              name={isWillHelp ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={isWillHelp ? '#16a34a' : '#dc2626'}
            />
            <Text
              style={[
                styles.responseStatusText,
                { color: isWillHelp ? '#16a34a' : '#dc2626' },
              ]}
            >
              {isWillHelp ? 'You will help ✓' : "You can't help"}
            </Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.locationBtn]}
            onPress={() =>
              openMaps(
                item.sender.latitude,
                item.sender.longitude,
                item.sender.location || 'Requester Location'
              )
            }
          >
            <Ionicons name="navigate" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn]}
            onPress={() => callContact(item.sender.mobile_number)}
          >
            <Ionicons name="call" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderNotification = ({ item }: { item: AnyNotification }) => {
    if (item.type === 'support_request') {
      return renderSupportRequest(item);
    }
    return renderSOS(item as SOSBroadcastNotification);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) =>
          item.type === 'support_request' ? `support-${item.id}` : `sos-${item.id}`
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="notification-important" size={64} color="#FECACA" />
            <Text style={styles.emptyTitle}>No Important Alerts</Text>
            <Text style={styles.emptySub}>
              SOS alerts and support requests will appear here
            </Text>
          </View>
        }
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#64748B', marginTop: 16 },
  emptySub: { fontSize: 14, color: '#94A3B8', marginTop: 8, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNearby: { borderColor: '#dc2626', borderWidth: 2, backgroundColor: '#FEF2F2' },
  cardStopped: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.85 },
  supportCard: { borderColor: '#86EFAC', borderWidth: 1.5, backgroundColor: '#F0FDF4' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconContainer: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEE2E2',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconContainerStopped: { backgroundColor: '#F1F5F9' },
  supportIconContainer: { backgroundColor: '#DCFCE7' },

  cardHeaderContent: { flex: 1 },
  senderName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  timestamp: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  textStopped: { color: '#94A3B8' },

  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
  },

  nearbyBadge: { 
    backgroundColor: '#dc2626', 
    borderRadius: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 2 
  },
  nearbyText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  stoppedBadge: { 
    backgroundColor: '#94A3B8', 
    borderRadius: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 2 
  },
  stoppedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  supportBadge: { 
    backgroundColor: '#2D5A27', 
    borderRadius: 12, 
    paddingHorizontal: 10, 
    paddingVertical: 2 
  },
  supportBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  distanceText: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  locationText: { fontSize: 13, color: '#475569', marginBottom: 8 },
  noMessageText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic', marginVertical: 8 },

  messageBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  messageBoxStopped: { backgroundColor: '#F1F5F9', borderLeftColor: '#94A3B8' },
  messageLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  messageText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },

  helpSection: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  helpButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  helpedContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  helpedText: { fontSize: 14, fontWeight: '600', color: '#16a34a', marginLeft: 6 },

  // Support request response section
  responseSection: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 10,
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 50,
    textAlignVertical: 'top',
  },

  responseButtons: { flexDirection: 'row', gap: 10 },
  responseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  willHelpBtn: { backgroundColor: '#16a34a' },
  cantHelpBtn: { backgroundColor: '#64748B' },
  responseBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  responseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 8,
  },
  responseStatusHelp: { backgroundColor: '#DCFCE7' },
  responseStatusCant: { backgroundColor: '#FEE2E2' },
  responseStatusText: { fontSize: 14, fontWeight: '700' },

  stoppedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  stoppedMessageText: { flex: 1, fontSize: 13, color: '#64748B', fontWeight: '500' },

  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    gap: 6,
  },
  actionBtnDisabled: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  locationBtn: { backgroundColor: '#2563EB' },
  callBtn: { backgroundColor: '#22C55E' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});