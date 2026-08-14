import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, CheckCircle, Clock3, Film, Heart, MessageCircle, UserPlus, XCircle } from 'lucide-react-native';
import { Video as ExpoVideo, ResizeMode } from 'expo-av';
import Header from '../components/header';

const API_BASE = 'http://192.168.9.146:5000/api';
const SERVER_BASE = 'http://192.168.9.146:5000';

type Comment = {
  id?: string | number;
  user_id?: number;
  author_name?: string;
  content_html?: string;
  content?: string;
  created_at?: string;
};

type Post = {
  id: number;
  title: string;
  text: string;
  content: string;
  context_type: string;
  media_path?: string | null;
  media_type?: string;
  media_original_name?: string | null;
  created_at: string;
  like_count: number;
  like_users: { id: number; name: string }[];
  comment_count: number;
  comments: Comment[];
};

type RequestItem = {
  network_id: number;
  requester_id: number;
  requester_name: string;
  requester_full_name?: string | null;
  requester_role?: string | null;
  requester_location?: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined';
};

type SosClip = {
  id: number;
  userId: number;
  username: string;
  cid: string;
  gatewayUrl: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
};

type ActivityData = {
  stats: {
    posts: number;
    likes: number;
    comments: number;
    requests: number;
    acceptedRequests: number;
  };
  posts: Post[];
  recentComments: (Comment & { post_id: number; post_title: string; content: string })[];
  requests: RequestItem[];
  acceptedRequests: RequestItem[];
};

const emptyData: ActivityData = {
  stats: { posts: 0, likes: 0, comments: 0, requests: 0, acceptedRequests: 0 },
  posts: [],
  recentComments: [],
  requests: [],
  acceptedRequests: [],
};

function timeAgo(value?: string) {
  if (!value) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function mediaUrl(path?: string | null) {
  if (!path || path === 'none') return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_BASE}/${String(path).replace(/^\/+/, '')}`;
}

async function getStoredUserId(): Promise<number | null> {
  const keys = ['user_id', 'userId', 'currentUserId', 'user'];
  for (const key of keys) {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id ?? parsed?.user_id ?? parsed?.userId);
      if (Number.isFinite(id) && id > 0) return id;
    } catch {
      const id = Number(raw);
      if (Number.isFinite(id) && id > 0) return id;
    }
  }
  return null;
}

export default function Activities() {
  const [data, setData] = useState<ActivityData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'requests' | 'sosClips'>('overview');
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [sosClips, setSosClips] = useState<SosClip[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);

  const fetchActivities = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const id = userId ?? await getStoredUserId();
      if (!id) {
        setData(emptyData);
        return;
      }
      setUserId(id);

      const response = await fetch(`${API_BASE}/activities/${id}`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Failed to load activities');
      setData(json.data ?? emptyData);
    } catch (error: any) {
      console.error('[Activities] fetch error:', error);
      if (showLoader) Alert.alert('Activities', 'Unable to load activity data. Check that the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchActivities(true);
  }, [fetchActivities]);

  const fetchSosClips = useCallback(async () => {
    setClipsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/sos/clips`);
      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.message || 'Failed to load SOS clips');
      }
      setSosClips(Array.isArray(json.clips) ? json.clips : []);
    } catch (error) {
      console.error('[Activities] SOS clips fetch error:', error);
    } finally {
      setClipsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSosClips();
  }, [fetchSosClips]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchActivities(false);
      fetchSosClips();
    }, 20000);
    return () => clearInterval(timer);
  }, [fetchActivities, fetchSosClips]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchActivities(false), fetchSosClips()]).finally(() => {
      setRefreshing(false);
    });
  };

  const respondToRequest = async (networkId: number, action: 'accept' | 'decline') => {
    if (respondingId) return;
    setRespondingId(networkId);
    try {
      const response = await fetch(`${API_BASE}/notifications/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkId, action }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.message || 'Request failed');
      await fetchActivities(false);
    } catch (error: any) {
      Alert.alert('Request', error.message || 'Unable to respond to request');
    } finally {
      setRespondingId(null);
    }
  };

  const renderPost = (post: Post) => {
    const media = mediaUrl(post.media_path);
    const isImage = post.media_type === 'image' && media;

    return (
      <View key={post.id} style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.postAvatar}><Text style={styles.avatarText}>W</Text></View>
          <View style={styles.postHeaderInfo}>
            <Text style={styles.postTitle}>{post.title || 'Untitled post'}</Text>
            <Text style={styles.postMeta}>{post.context_type} · {timeAgo(post.created_at)}</Text>
          </View>
        </View>

        {!!post.text && <Text style={styles.postText}>{post.text}</Text>}

        {isImage && <Image source={{ uri: media! }} style={styles.postImage} resizeMode="cover" />}
        {!!media && post.media_type === 'video' && (
          <View style={styles.mediaPlaceholder}>
            <Text style={styles.mediaIcon}>▶</Text>
            <Text style={styles.mediaText}>{post.media_original_name || 'Video attachment'}</Text>
          </View>
        )}
        {!!media && post.media_type === 'document' && (
          <View style={styles.mediaPlaceholder}>
            <Text style={styles.mediaIcon}>📄</Text>
            <Text style={styles.mediaText}>{post.media_original_name || 'Document attachment'}</Text>
          </View>
        )}

        <View style={styles.reactionRow}>
          <View style={styles.reactionItem}>
            <Heart size={18} color="#E53E3E" />
            <Text style={styles.reactionText}>{post.like_count} {post.like_count === 1 ? 'Like' : 'Likes'}</Text>
          </View>
          <View style={styles.reactionItem}>
            <MessageCircle size={18} color="#3182CE" />
            <Text style={styles.reactionText}>{post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}</Text>
          </View>
        </View>

        {post.like_users.length > 0 && (
          <Text style={styles.likePeople} numberOfLines={2}>
            Liked by {post.like_users.slice(0, 3).map(user => user.name).join(', ')}
            {post.like_users.length > 3 ? ` and ${post.like_users.length - 3} others` : ''}
          </Text>
        )}

        {post.comments.length > 0 && (
          <View style={styles.commentsBox}>
            <Text style={styles.commentsTitle}>Comments</Text>
            {post.comments.slice(-3).map((comment, index) => (
              <View key={String(comment.id ?? `${post.id}-${index}`)} style={styles.commentRow}>
                <View style={styles.smallAvatar}><Text style={styles.smallAvatarText}>{(comment.author_name || 'U').charAt(0).toUpperCase()}</Text></View>
                <View style={styles.commentBody}>
                  <View style={styles.commentTop}>
                    <Text style={styles.commentAuthor}>{comment.author_name || 'Unknown user'}</Text>
                    <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content || 'Comment'}</Text>
                </View>
              </View>
            ))}
            {post.comment_count > 3 && <Text style={styles.moreComments}>+ {post.comment_count - 3} more comments</Text>}
          </View>
        )}
      </View>
    );
  };

  const renderRequest = (request: RequestItem) => (
    <View key={`pending-${request.network_id}`} style={styles.requestCard}>
      <View style={styles.requestAvatar}>
        <Text style={styles.requestAvatarText}>
          {(request.requester_name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.requester_name}</Text>
        {!!request.requester_role && (
          <Text style={styles.requestRole}>{request.requester_role}</Text>
        )}
        {!!request.requester_location && (
          <Text style={styles.requestLocation}>{request.requester_location}</Text>
        )}
        <Text style={styles.requestTime}>
          {timeAgo(request.created_at)} · wants to connect with you
        </Text>
        <View style={styles.requestActions}>
          <TouchableOpacity
            disabled={respondingId === request.network_id}
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => respondToRequest(request.network_id, 'accept')}
          >
            <CheckCircle size={16} color="#fff" />
            <Text style={styles.actionText}>
              {respondingId === request.network_id ? '...' : 'Accept'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={respondingId === request.network_id}
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => respondToRequest(request.network_id, 'decline')}
          >
            <XCircle size={16} color="#fff" />
            <Text style={styles.actionText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAcceptedRequest = (request: RequestItem) => (
    <View key={`accepted-${request.network_id}`} style={styles.acceptedRequestCard}>
      <View style={styles.acceptedAvatar}>
        <Text style={styles.acceptedAvatarText}>
          {(request.requester_name || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.acceptedInfo}>
        <Text style={styles.acceptedRequestName}>
          {request.requester_name}
        </Text>
        {!!request.requester_full_name &&
          request.requester_full_name !== request.requester_name && (
            <Text style={styles.acceptedRequestFullName}>
              {request.requester_full_name}
            </Text>
          )}
        <View style={styles.acceptedStatusRow}>
          <CheckCircle size={16} color="#15803D" />
          <Text style={styles.acceptedStatusText}>Accepted request</Text>
        </View>
        <Text style={styles.acceptedRequestTime}>
          Accepted · {timeAgo(request.updated_at || request.created_at)}
        </Text>
      </View>
    </View>
  );


  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Activities</Text>
            <Text style={styles.headerSubtitle}>Everything here comes from your database</Text>
          </View>
          <View style={styles.bellWrap}>
            <Bell size={24} color="#14532D" />
            {data.stats.requests > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{data.stats.requests > 99 ? '99+' : data.stats.requests}</Text></View>}
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, selectedTab === 'overview' && styles.activeTab]} onPress={() => setSelectedTab('overview')}>
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, selectedTab === 'requests' && styles.activeTab]} onPress={() => setSelectedTab('requests')}>
            <UserPlus size={16} color={selectedTab === 'requests' ? '#14532D' : '#666'} />
            <Text style={[styles.tabText, selectedTab === 'requests' && styles.activeTabText]}>Requests</Text>
            {data.stats.requests > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{data.stats.requests}</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, selectedTab === 'sosClips' && styles.activeTab]} onPress={() => setSelectedTab('sosClips')}>
            <Film size={16} color={selectedTab === 'sosClips' ? '#14532D' : '#666'} />
            <Text style={[styles.tabText, selectedTab === 'sosClips' && styles.activeTabText]}>SOS Clips</Text>
            {sosClips.length > 0 && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{sosClips.length > 99 ? '99+' : sosClips.length}</Text></View>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="large" color="#14532D" /><Text style={styles.loadingText}>Loading activities...</Text></View>
        ) : selectedTab === 'overview' ? (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}><Text style={styles.statIcon}>📝</Text><Text style={styles.statValue}>{data.stats.posts}</Text><Text style={styles.statLabel}>Posts</Text></View>
              <View style={styles.statCard}><Text style={styles.statIcon}>❤️</Text><Text style={styles.statValue}>{data.stats.likes}</Text><Text style={styles.statLabel}>Likes</Text></View>
              <View style={styles.statCard}><Text style={styles.statIcon}>💬</Text><Text style={styles.statValue}>{data.stats.comments}</Text><Text style={styles.statLabel}>Comments</Text></View>
              <View style={styles.statCard}><Text style={styles.statIcon}>🔔</Text><Text style={styles.statValue}>{data.stats.requests}</Text><Text style={styles.statLabel}>Requests</Text></View>
            </View>

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>My Posts</Text><Text style={styles.sectionCount}>{data.stats.posts}</Text></View>
            {data.posts.length ? data.posts.map(renderPost) : (
              <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyText}>Your posts will appear here once they are stored in the database.</Text></View>
            )}

            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Recent Comments</Text><Text style={styles.sectionCount}>{data.stats.comments}</Text></View>
            {data.recentComments.length ? data.recentComments.slice(0, 10).map((comment, index) => (
              <View key={String(comment.id ?? `recent-${index}`)} style={styles.recentCommentCard}>
                <MessageCircle size={18} color="#3182CE" />
                <View style={styles.recentCommentBody}>
                  <Text style={styles.recentCommentAuthor}>{comment.author_name || 'Unknown user'} <Text style={styles.recentCommentTime}>· {timeAgo(comment.created_at)}</Text></Text>
                  <Text style={styles.recentCommentText}>{comment.content}</Text>
                  <Text style={styles.commentOn}>On: {comment.post_title || 'Your post'}</Text>
                </View>
              </View>
            )) : (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>No comments on your posts yet.</Text></View>
            )}
          </>
        ) : selectedTab === 'requests' ? (
          <>
            <View style={styles.requestSummary}>
              <Bell size={22} color="#14532D" />
              <View>
                <Text style={styles.requestSummaryValue}>{data.stats.requests}</Text>
                <Text style={styles.requestSummaryText}>pending requests received</Text>
              </View>
            </View>

            {data.requests.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>New Requests</Text>
                  <Text style={styles.sectionCount}>{data.requests.length}</Text>
                </View>
                {data.requests.map(renderRequest)}
              </>
            ) : null}

            {data.acceptedRequests.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Accepted Requests</Text>
                  <Text style={styles.acceptedSectionCount}>{data.acceptedRequests.length}</Text>
                </View>
                {data.acceptedRequests.map(renderAcceptedRequest)}
              </>
            ) : null}

            {data.requests.length === 0 && data.acceptedRequests.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No requests yet</Text>
                <Text style={styles.emptyText}>
                  New connection requests will appear here automatically.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.sosClipsHeader}>
              <View style={styles.sosClipsTitleWrap}>
                <Text style={styles.sectionTitle}>SOS Clips</Text>
                <Text style={styles.sosClipsSubtitle}>Emergency videos stored on IPFS</Text>
              </View>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{sosClips.length}</Text>
              </View>
            </View>

            {clipsLoading && sosClips.length === 0 ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#14532D" />
                <Text style={styles.loadingText}>Loading SOS clips...</Text>
              </View>
            ) : sosClips.length ? (
              sosClips.map((clip) => (
                <View key={clip.id} style={styles.clipCard}>
                  <ExpoVideo
                    source={{ uri: clip.gatewayUrl }}
                    style={styles.clipVideo}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isLooping={false}
                  />
                  <View style={styles.clipMeta}>
                    <View style={styles.clipUserRow}>
                      <View style={styles.clipAvatar}>
                        <Text style={styles.clipAvatarText}>{(clip.username || 'U').charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.clipUserInfo}>
                        <Text style={styles.clipUsername}>{clip.username || 'Anonymous'}</Text>
                        <Text style={styles.clipTime}>{timeAgo(clip.createdAt)}</Text>
                      </View>
                    </View>
                    {clip.latitude !== null && clip.longitude !== null && (
                      <Text style={styles.clipLocation}>📍 {Number(clip.latitude).toFixed(4)}, {Number(clip.longitude).toFixed(4)}</Text>
                    )}
                    <Text style={styles.clipIpfs} numberOfLines={1}>IPFS: {clip.cid}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No SOS clips yet</Text>
                <Text style={styles.emptyText}>SOS videos uploaded to IPFS will appear here automatically.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9F7' },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 135 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerTitle: { fontSize: 27, fontWeight: '800', color: '#111827' },
  headerSubtitle: { color: '#6B7280', marginTop: 3, fontSize: 13 },
  bellWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F3EA', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: -3, top: -4, minWidth: 19, height: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F7F9F7' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E9EFEA', borderRadius: 12, padding: 4, marginBottom: 18 },
  tab: { flex: 1, minHeight: 42, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { color: '#666', fontSize: 12, fontWeight: '600' },
  activeTabText: { color: '#14532D' },
  tabBadge: { minWidth: 19, height: 19, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  sectionCountText: { color: '#14532D', textAlign: 'center', fontWeight: '800' },
  sosClipsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 12 },
  sosClipsTitleWrap: { flex: 1 },
  sosClipsSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  clipCard: { backgroundColor: '#fff', borderRadius: 15, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  clipVideo: { width: '100%', height: 220, backgroundColor: '#000' },
  clipMeta: { padding: 13 },
  clipUserRow: { flexDirection: 'row', alignItems: 'center' },
  clipAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center' },
  clipAvatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  clipUserInfo: { marginLeft: 10, flex: 1 },
  clipUsername: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clipTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  clipLocation: { fontSize: 12, color: '#4B5563', marginTop: 9 },
  clipIpfs: { fontSize: 10, color: '#9CA3AF', marginTop: 6 },
  loadingText: { marginTop: 10, color: '#6B7280' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: { width: '48.5%', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  statIcon: { fontSize: 23, marginBottom: 7 },
  statValue: { fontSize: 25, fontWeight: '800', color: '#111827' },
  statLabel: { color: '#6B7280', marginTop: 2, fontSize: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  sectionTitle: { flex: 1, fontSize: 19, fontWeight: '800', color: '#111827' },
  sectionCount: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: '#E8F3EA', color: '#14532D', textAlign: 'center', textAlignVertical: 'center', paddingTop: 4, fontWeight: '800', overflow: 'hidden' },
  postCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  postHeaderInfo: { marginLeft: 10, flex: 1 },
  postTitle: { fontSize: 16, fontWeight: '750', color: '#111827' },
  postMeta: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  postText: { fontSize: 14, lineHeight: 21, color: '#374151', marginBottom: 10 },
  postImage: { width: '100%', height: 210, borderRadius: 11, marginBottom: 10 },
  mediaPlaceholder: { minHeight: 70, borderRadius: 11, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 10, padding: 10 },
  mediaIcon: { fontSize: 22 },
  mediaText: { color: '#4B5563', marginTop: 4, fontSize: 12 },
  reactionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10, gap: 22 },
  reactionItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionText: { color: '#4B5563', fontSize: 13, fontWeight: '600' },
  likePeople: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  commentsBox: { marginTop: 12, backgroundColor: '#F8FAF8', borderRadius: 11, padding: 10 },
  commentsTitle: { fontWeight: '800', color: '#374151', marginBottom: 7, fontSize: 13 },
  commentRow: { flexDirection: 'row', marginBottom: 8 },
  smallAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#DDEBE0', alignItems: 'center', justifyContent: 'center' },
  smallAvatarText: { color: '#14532D', fontWeight: '800', fontSize: 11 },
  commentBody: { flex: 1, marginLeft: 8 },
  commentTop: { flexDirection: 'row', alignItems: 'center' },
  commentAuthor: { fontWeight: '700', color: '#374151', fontSize: 12, flex: 1 },
  commentTime: { color: '#9CA3AF', fontSize: 10 },
  commentText: { color: '#4B5563', fontSize: 12, lineHeight: 18, marginTop: 2 },
  moreComments: { color: '#14532D', fontSize: 12, fontWeight: '700', marginTop: 2 },
  recentCommentCard: { backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  recentCommentBody: { flex: 1 },
  recentCommentAuthor: { fontSize: 13, fontWeight: '750', color: '#111827' },
  recentCommentTime: { color: '#9CA3AF', fontWeight: '400' },
  recentCommentText: { color: '#374151', fontSize: 13, marginTop: 3 },
  commentOn: { color: '#9CA3AF', fontSize: 11, marginTop: 5 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 18, borderWidth: 1, borderColor: '#E5E7EB' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#374151' },
  emptyText: { textAlign: 'center', color: '#6B7280', fontSize: 13, lineHeight: 19, marginTop: 6 },
  requestSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EAF4EC', borderRadius: 14, padding: 16, marginBottom: 12 },
  requestSummaryValue: { fontSize: 22, fontWeight: '800', color: '#14532D' },
  requestSummaryText: { color: '#4B5563', fontSize: 12 },
  acceptedSectionCount: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: '#DCFCE7', color: '#15803D', textAlign: 'center', textAlignVertical: 'center', paddingTop: 4, fontWeight: '800', overflow: 'hidden' },
  acceptedRequestCard: { flexDirection: 'row', backgroundColor: '#F0FDF4', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  acceptedAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  acceptedAvatarText: { color: '#15803D', fontWeight: '800', fontSize: 17 },
  acceptedInfo: { flex: 1, marginLeft: 11 },
  acceptedRequestName: { color: '#14532D', fontSize: 15, fontWeight: '800' },
  acceptedRequestFullName: { color: '#4B5563', fontSize: 12, marginTop: 2 },
  acceptedStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  acceptedStatusText: { color: '#15803D', fontSize: 12, fontWeight: '800' },
  acceptedRequestTime: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  requestCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  requestAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#E8F3EA', alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { color: '#14532D', fontWeight: '800', fontSize: 17 },
  requestInfo: { flex: 1, marginLeft: 11 },
  requestName: { color: '#111827', fontSize: 15, fontWeight: '800' },
  requestRole: { color: '#4B5563', fontSize: 12, marginTop: 2 },
  requestLocation: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  requestTime: { color: '#9CA3AF', fontSize: 11, marginTop: 5 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: { flex: 1, minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  acceptButton: { backgroundColor: '#15803D' },
  declineButton: { backgroundColor: '#DC2626' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
