import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialIcons } from '@expo/vector-icons';
import { getSocket } from '../../../lib/socket';

const API_BASE_URL = 'http://10.100.67.248:5000/api/sos';

interface SosClip {
  id: number;
  userId: number;
  username: string;
  cid: string;
  gatewayUrl: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface ClipFeedHandle {
  refresh: () => void;
}

const ClipVideo = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });

  return (
    <VideoView
      style={styles.video}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

export default function ClipFeed() {
  const [clips, setClips] = useState<SosClip[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchClips = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/clips`);
      const data = await res.json();
      if (data.success) setClips(data.clips);
    } catch (err) {
      console.warn('Failed to fetch SOS clips:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();

    // Live updates: any user's newly uploaded clip appears instantly for everyone
    const socket = getSocket();
    const handleNewClip = (clip: SosClip) => {
      setClips((prev) => [clip, ...prev]);
    };
    socket.on('new-sos-clip', handleNewClip);

    return () => {
      socket.off('new-sos-clip', handleNewClip);
    };
  }, [fetchClips]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClips();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  if (clips.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="videocam-off" size={48} color="#FCA5A5" />
        <Text style={styles.emptyTitle}>No SOS clips yet</Text>
        <Text style={styles.emptyText}>Be the first to share an emergency recording.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={clips}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#dc2626']}
          tintColor="#dc2626"
        />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          {/* Video */}
          <ClipVideo uri={item.gatewayUrl} />

          {/* Meta info */}
          <View style={styles.meta}>
            <View style={styles.userRow}>
              <MaterialIcons name="account-circle" size={18} color="#dc2626" />
              <Text style={styles.username}>{item.username}</Text>
            </View>

            <Text style={styles.timestamp}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>

            {item.latitude != null && item.longitude != null && (
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={14} color="#64748B" />
                <Text style={styles.location}>
                  {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                </Text>
              </View>
            )}

            <Text style={styles.cid} numberOfLines={1}>
              IPFS: {item.cid}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  // Card – matches SOS list style
  card: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
  },
  meta: {
    padding: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  timestamp: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: '#475569',
  },
  cid: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});