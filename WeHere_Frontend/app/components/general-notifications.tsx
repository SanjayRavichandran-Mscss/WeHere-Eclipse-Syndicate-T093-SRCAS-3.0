// app/components/GeneralNotifications.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.137.1:5000/api';

interface ConnectionRequest {
  network_id: number;
  requester_id: number;
  requester_name: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined';
}

export default function GeneralNotifications() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserId = async () => {
    try {
      const raw =
        (await AsyncStorage.getItem('user_id')) ||
        (await AsyncStorage.getItem('userId')) ||
        (await AsyncStorage.getItem('currentUserId')) ||
        (await AsyncStorage.getItem('user'));
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          return parsed.id || parsed.user_id || parsed.userId;
        } catch {
          return Number(raw);
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchRequests = async () => {
    try {
      const userId = await getUserId();
      if (!userId) {
        setLoading(false);
        return;
      }
      // Get pending and recently resolved (optional: include all? we'll filter pending only for now)
      const response = await fetch(`${API_BASE}/notifications/connection-requests/${userId}`);
      const data = await response.json();
      if (data.success) {
        // Mark all as pending initially
        const withStatus = data.data.map((req: any) => ({ ...req, status: 'pending' as const }));
        setRequests(withStatus);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching connection requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (networkId: number, action: 'accept' | 'decline') => {
    try {
      const userId = await getUserId();
      if (!userId) {
        Alert.alert('Error', 'User not found');
        return;
      }
      // Use the notification endpoint
      const response = await fetch(`${API_BASE}/notifications/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkId, action }),
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', `Request ${action}ed`);
        // Update the status locally instead of removing
        setRequests(prev =>
          prev.map(req =>
            req.network_id === networkId
              ? { ...req, status: action === 'accept' ? 'accepted' : 'declined' }
              : req
          )
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to respond');
      }
    } catch (error) {
      console.error('Error responding:', error);
      Alert.alert('Error', 'Network error');
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <AntDesign name="notification" size={20} color="#333" />
          <Text style={styles.title}>General</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14532D" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <AntDesign name="notification" size={20} color="#333" />
        <Text style={styles.title}>General</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.network_id.toString()}
        contentContainerStyle={requests.length === 0 ? styles.emptyWrap : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AntDesign name="notification" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>Connection requests will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.requester_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{item.requester_name}</Text>
                <Text style={styles.requestTime}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
                <Text style={styles.requestStatus}>
                  {item.status === 'pending' && 'wants to connect with you'}
                  {item.status === 'accepted' && '✅ You accepted this request'}
                  {item.status === 'declined' && '❌ You declined this request'}
                </Text>
              </View>
            </View>

            {item.status === 'pending' ? (
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() => handleRespond(item.network_id, 'accept')}
                >
                  <Text style={styles.actionText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.declineBtn]}
                  onPress={() => handleRespond(item.network_id, 'decline')}
                >
                  <Text style={styles.actionText}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resolvedBadge}>
                <Text style={styles.resolvedText}>
                  {item.status === 'accepted' ? 'Connected' : 'Declined'}
                </Text>
              </View>
            )}
          </View>
        )}
      />
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
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginLeft: 4 },
  list: { padding: 12 },
  emptyWrap: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#64748B', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  requestTime: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  requestStatus: { fontSize: 14, color: '#64748B', marginTop: 2 },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: '#22C55E' },
  declineBtn: { backgroundColor: '#EF4444' },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  resolvedBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  resolvedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
});