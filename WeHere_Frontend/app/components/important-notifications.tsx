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
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.137.1:5000/api';

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

export default function ImportantNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SOSBroadcastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [helpingId, setHelpingId] = useState<number | null>(null);

  // Fetch user ID from AsyncStorage
  const getUserId = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user && user.id) {
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

  // Fetch SOS broadcast notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const id = await getUserId();
      if (!id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/notifications/sos-broadcasts/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Keep ALL broadcasts (including stopped ones)
        const allData = data.data || [];

        // Check if user has already helped for each broadcast
        const notificationsWithHelpStatus = allData.map((item: SOSBroadcastNotification) => {
          const hasHelped = item.users_received?.some((u) => u.user_id === id) || false;
          return {
            ...item,
            has_user_helped: hasHelped
          };
        });

        setNotifications(notificationsWithHelpStatus);
      } else {
        console.error('Failed to fetch notifications:', data.message);
        setNotifications([]);
      }
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

  // Open maps with sender location
  const openMaps = (latitude: string, longitude: string, locationName: string) => {
    if (!latitude || !longitude) {
      Alert.alert('Location Not Available', 'Sender location coordinates are not available.');
      return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${encodeURIComponent(locationName || 'Emergency Location')}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps. Please try again.');
    });
  };

  // Call emergency contact
  const callContact = (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'This contact has no phone number.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Could not make call. Please try again.');
    });
  };

  // Handle "I will help" button press
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
        {
          text: 'Yes, I\'ll Help',
          onPress: () => confirmOfferHelp(broadcastId)
        }
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
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        // Update notification to show user has helped
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === broadcastId
              ? { 
                  ...item, 
                  has_user_helped: true,
                  users_received: data.data.users_received 
                }
              : item
          )
        );

        Alert.alert(
          'Thank You!',
          'You have offered help. The person in need will be notified.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to offer help');
      }
    } catch (error: any) {
      console.error('Error offering help:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to offer help. Please try again.'
      );
    } finally {
      setHelpingId(null);
    }
  };

  // View helpers list
  const viewHelpers = (helpers: HelperUser[] = []) => {
    if (!helpers || helpers.length === 0) {
      Alert.alert('No Helpers', 'No one has offered help yet.');
      return;
    }

    const helperNames = helpers
      .map((h) => `${h.full_name || h.username} (${h.mobile_number})`)
      .join('\n');

    Alert.alert(
      `👥 ${helpers.length} People Offered Help`,
      helperNames,
      [{ text: 'OK' }]
    );
  };

  // Format timestamp
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

  // Render each notification item
  const renderNotification = ({ item }: { item: SOSBroadcastNotification }) => {
    const senderName = item.sender.full_name || item.sender.username || 'Unknown User';
    const hasMessage = item.broadcast.message && item.broadcast.message.trim() !== '';
    const isNearby = parseFloat(item.distance_km) < 2;
    const hasHelped = item.has_user_helped || false;
    const helpersCount = item.users_received?.length || 0;
    const isStopped = item.is_stopped === 1;

    return (
      <View style={[
        styles.card, 
        isNearby && !isStopped && styles.cardNearby,
        isStopped && styles.cardStopped
      ]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, isStopped && styles.iconContainerStopped]}>
            <Ionicons 
              name={isStopped ? "checkmark-circle" : "alert-circle"} 
              size={28} 
              color={isStopped ? "#94A3B8" : "#dc2626"} 
            />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={[styles.senderName, isStopped && styles.textStopped]}>
              {senderName}
            </Text>
            <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
          </View>
          {isNearby && !isStopped && (
            <View style={styles.nearbyBadge}>
              <Text style={styles.nearbyText}>Nearby</Text>
            </View>
          )}
          {isStopped && (
            <View style={styles.stoppedBadge}>
              <Text style={styles.stoppedBadgeText}>Stopped</Text>
            </View>
          )}
        </View>

        <Text style={[styles.distanceText, isStopped && styles.textStopped]}>
          <Ionicons name="location" size={14} color={isStopped ? "#94A3B8" : "#64748B"} />
          {' '}{item.distance_km} km away
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
          <>
            {/* Help Button Section - Only for active broadcasts */}
            <View style={styles.helpSection}>
              {hasHelped ? (
                <View style={styles.helpedContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  <Text style={styles.helpedText}>You offered help ✓</Text>
                  {helpersCount > 1 && (
                    <TouchableOpacity 
                      onPress={() => viewHelpers(item.users_received)}
                      style={styles.viewHelpersBtn}
                    >
                      <Text style={styles.viewHelpersText}>
                        ({helpersCount} others)
                      </Text>
                    </TouchableOpacity>
                  )}
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

              {helpersCount > 0 && hasHelped && (
                <TouchableOpacity
                  style={styles.helpersCountBtn}
                  onPress={() => viewHelpers(item.users_received)}
                >
                  <Ionicons name="people" size={16} color="#64748B" />
                  <Text style={styles.helpersCountText}>
                    {helpersCount} {helpersCount === 1 ? 'person' : 'people'} helping
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.locationBtn, isStopped && styles.actionBtnDisabled]}
            onPress={() => openMaps(
              item.sender.latitude || item.broadcast.latitude,
              item.sender.longitude || item.broadcast.longitude,
              item.sender.location || 'Emergency Location'
            )}
            disabled={isStopped}
          >
            <Ionicons name="navigate" size={16} color={isStopped ? "#94A3B8" : "#fff"} />
            <Text style={[styles.actionBtnText, isStopped && styles.textStopped]}>Location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.callBtn, isStopped && styles.actionBtnDisabled]}
            onPress={() => callContact(item.sender.mobile_number)}
            disabled={isStopped}
          >
            <Ionicons name="call" size={16} color={isStopped ? "#94A3B8" : "#fff"} />
            <Text style={[styles.actionBtnText, isStopped && styles.textStopped]}>Call</Text>
          </TouchableOpacity>
        </View>

        {/* Show nearby users count */}
        {item.nearby_users && item.nearby_users.length > 0 && (
          <View style={styles.nearbyUsersContainer}>
            <Text style={[styles.nearbyUsersLabel, isStopped && styles.textStopped]}>
              👥 {item.nearby_users.length} other nearby users
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  // Count active notifications for badge
  const activeCount = notifications.filter((n) => n.is_stopped === 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <MaterialIcons name="notification-important" size={22} color="#dc2626" />
        <Text style={styles.title}>SOS Alerts</Text>
        {activeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeCount}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => `sos-${item.id}`}
        contentContainerStyle={notifications.length === 0 ? styles.emptyWrap : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#dc2626']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="notification-important" size={64} color="#FECACA" />
            <Text style={styles.emptyTitle}>No SOS Alerts</Text>
            <Text style={styles.emptySub}>
              Emergency alerts from nearby users will appear here
            </Text>
          </View>
        }
        renderItem={renderNotification}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  badge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    padding: 12,
  },
  emptyWrap: {
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
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
  cardNearby: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#FEF2F2',
  },
  cardStopped: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerStopped: {
    backgroundColor: '#F1F5F9',
  },
  cardHeaderContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  textStopped: {
    color: '#94A3B8',
  },
  nearbyBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  nearbyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  stoppedBadge: {
    backgroundColor: '#94A3B8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stoppedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  distanceText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
  },
  messageBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  messageBoxStopped: {
    backgroundColor: '#F1F5F9',
    borderLeftColor: '#94A3B8',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
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
  helpButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  helpedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16a34a',
    marginLeft: 6,
  },
  viewHelpersBtn: {
    marginLeft: 8,
  },
  viewHelpersText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  helpersCountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    gap: 4,
  },
  helpersCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  stoppedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  stoppedMessageText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
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
  actionBtnDisabled: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationBtn: {
    backgroundColor: '#2563EB',
  },
  callBtn: {
    backgroundColor: '#22C55E',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  nearbyUsersContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nearbyUsersLabel: {
    fontSize: 12,
    color: '#64748B',
  },
});