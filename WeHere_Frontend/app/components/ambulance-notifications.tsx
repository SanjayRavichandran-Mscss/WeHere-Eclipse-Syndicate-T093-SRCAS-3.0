import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Ambulance } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.137.1:5000/api/notifications';

interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  alert_sender: number;
  sender_location: {
    latitude: number;
    longitude: number;
    location_name: string;
  };
  my_distance_km: number;
  my_received_status?: number;
  received_at?: string | null;
  created_at: string;
  priority: string;
}

export default function AmbulanceNotifications() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState<number | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const user = JSON.parse(raw);
          if (user?.id) setUserId(Number(user.id));
        }
      } catch (err) {
        console.error('[AmbulanceNotifications] load user error:', err);
      }
    };
    loadUser();
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/ambulance-alerts/${userId}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('[AmbulanceNotifications] fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [userId, fetchNotifications]);

  const markAsReceived = async (alertId: number) => {
    if (!userId) return;
    try {
      setMarkingId(alertId);
      const res = await fetch(`${API_BASE}/ambulance-alerts/${alertId}/received`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      if (json.success) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === alertId
              ? { ...n, my_received_status: 1, received_at: now }
              : n
          )
        );
      } else {
        Alert.alert('Error', json.message || 'Could not update');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
    } finally {
      setMarkingId(null);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const pendingCount = notifications.filter((n) => n.my_received_status !== 1).length;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isReceived = item.my_received_status === 1;
    return (
      <View style={[styles.card, isReceived && styles.cardReceived]}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, isReceived && styles.iconCircleReceived]}>
            <FontAwesome5
              name="ambulance"
              size={16}
              color={isReceived ? '#16a34a' : '#dc2626'}
            />
          </View>
          <View style={styles.content}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {item.my_distance_km} km · {item.sender_location?.location_name || 'Nearby'}
            </Text>
            <Text style={styles.timeText}>
              Sent {formatTime(item.created_at)}
              {isReceived && item.received_at
                ? `  ·  Received ${formatTime(item.received_at)}`
                : ''}
            </Text>
          </View>
          <View style={styles.actionCol}>
            {isReceived ? (
              <View style={styles.receivedState}>
                <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                <Text style={styles.receivedLabel}>Received</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.receiveBtn}
                onPress={() => markAsReceived(item.id)}
                disabled={markingId === item.id}
              >
                {markingId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Ambulance size={22} color="#dc2626" />
        <Text style={styles.title}>Ambulance</Text>
        {pendingCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyWrap : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchNotifications();
              }}
              colors={['#dc2626']}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ambulance size={48} color="#FECACA" />
              <Text style={styles.emptyTitle}>No ambulance alerts</Text>
              <Text style={styles.emptySub}>
                High-priority ambulance alerts will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 4, flex: 1 },
  countBadge: {
    backgroundColor: '#dc2626',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 24 },
  emptyWrap: { flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cardReceived: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  iconCircleReceived: { backgroundColor: '#DCFCE7' },
  content: { flex: 1, marginLeft: 10, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardBody: { fontSize: 12, color: '#475569', lineHeight: 16, marginTop: 2 },
  metaText: { fontSize: 11, color: '#64748B', marginTop: 4 },
  timeText: { fontSize: 10, color: '#94A3B8', marginTop: 3 },
  actionCol: { alignItems: 'center', justifyContent: 'center', minWidth: 52 },
  receiveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receivedState: { alignItems: 'center' },
  receivedLabel: { fontSize: 9, color: '#16a34a', fontWeight: '600', marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
});