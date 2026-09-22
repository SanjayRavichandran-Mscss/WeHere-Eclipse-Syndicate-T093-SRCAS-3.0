import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StatusBar,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Linking,
  FlatList,
  Dimensions,
  PanResponder,
  Animated,
  Keyboard,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import RenderHtml from 'react-native-render-html';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import Header from '../components/header';
import { useLocalSearchParams } from 'expo-router';

const API_BASE = 'http://10.100.67.248:5000/api/home';
const MEDIA_BASE = 'http://10.100.67.248:5000/';

const DEFAULT_CONTEXT_TYPES = ['Awareness', 'Guidance', 'Collaboration', 'Support'];
const SCREEN_WIDTH = Dimensions.get('window').width;

type SelectedFile = {
  uri: string;
  name: string;
  mimeType: string;
  kind: 'image' | 'video' | 'document' | 'audio';
};

type CommentItem = {
  id: string;
  user_id: number;
  author_name: string;
  content_html: string;
  created_at: string;
};

type Post = {
  id: number;
  user_id: number;
  title: string | null;
  content: string | null;
  context_type: string;
  tags: string[];
  media_path: string | null;
  media_type: string;
  media_original_name: string | null;
  country: string | null;
  state: string | null;
  city?: string | null;
  is_nearby: number;
  appreciations: number;
  comments_count: number;
  collaborations?: number;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
  author_role?: string | null;
  author_city?: string | null;
  author_state?: string | null;
  post_like?: number[];
  post_save?: number[];
  comments?: CommentItem[];
};

type UserPostGroup = {
  userId: number;
  authorName: string;
  latestAt: number;
  posts: Post[];
};

// ─── Video component for posts ───
const PostVideo = ({
  uri,
  isFullscreen,
  onToggleFullscreen,
}: {
  uri: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });

  const duration = player.duration || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  return (
    <View style={styles.videoContainer}>
      <VideoView
        style={[styles.videoPlayer, isFullscreen && styles.fullscreenVideo]}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
      <View style={styles.videoControls}>
        <TouchableOpacity
          style={styles.videoControlButton}
          onPress={() => (player.playing ? player.pause() : player.play())}
        >
          <Ionicons
            name={player.playing ? 'pause' : 'play'}
            size={28}
            color="#FFF"
          />
        </TouchableOpacity>
        <Text style={styles.videoTime}>
          {duration
            ? `${minutes}:${seconds.toString().padStart(2, '0')}`
            : '--:--'}
        </Text>
        <TouchableOpacity
          style={styles.videoControlButton}
          onPress={onToggleFullscreen}
        >
          <Ionicons
            name={isFullscreen ? 'contract' : 'expand'}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Audio component for posts ───
const PostAudio = ({
  uri,
  name,
  isPlaying,
  onToggle,
}: {
  uri: string;
  name: string;
  isPlaying: boolean;
  onToggle: () => void;
}) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [isPlaying, player]);

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity style={styles.audioPlayButton} onPress={onToggle}>
        <Ionicons
          name={status.playing ? 'pause-circle' : 'play-circle'}
          size={48}
          color="#0A7A6E"
        />
      </TouchableOpacity>
      <View style={styles.audioInfo}>
        <Text style={styles.audioName}>{name}</Text>
        <View style={styles.audioWave}>
          {[...Array(12)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: 8 + Math.random() * 16,
                  opacity: status.playing ? 0.8 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

export default function Home() {
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ postId?: string }>();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userIdLoading, setUserIdLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCountry] = useState('All');
  const [selectedState] = useState('All');
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const [postHtml, setPostHtml] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);

  const [contextTypes, setContextTypes] = useState<string[]>(DEFAULT_CONTEXT_TYPES);
  const [contextType, setContextType] = useState('Awareness');
  const [addTypeModalVisible, setAddTypeModalVisible] = useState(false);
  const [newContextType, setNewContextType] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);

  const [likedMap, setLikedMap] = useState<{ [postId: number]: boolean }>({});
  const [savedMap, setSavedMap] = useState<{ [postId: number]: boolean }>({});

  const [commentSheetVisible, setCommentSheetVisible] = useState(false);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentHtml, setCommentHtml] = useState('');
  const [commentPosting, setCommentPosting] = useState(false);
  const commentEditor = useRef<RichEditor>(null);

  const [audioPlaying, setAudioPlaying] = useState<{ [key: number]: boolean }>({});
  const [isFullscreen, setIsFullscreen] = useState<{ [key: number]: boolean }>({});

  const richText = useRef<RichEditor>(null);
  const sheetHeight = useRef(new Animated.Value(height * 0.82)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // ─── Scroll‑to‑post refs and state ───
  const scrollViewRef = useRef<ScrollView>(null);
  const groupYPositions = useRef<{ [userId: number]: number }>({}).current;
  const flatListRefs = useRef<{ [userId: number]: FlatList<any> | null }>({}).current;
  const [highlightedPostId, setHighlightedPostId] = useState<number | null>(null);
  const scrolledForPostId = useRef<string | null>(null);

  // ─── Group posts by user ───
  const userGroups: UserPostGroup[] = useMemo(() => {
    const map = new Map<number, Post[]>();
    posts.forEach((p) => {
      const uid = Number(p.user_id);
      if (!map.has(uid)) map.set(uid, []);
      map.get(uid)!.push(p);
    });

    const groups: UserPostGroup[] = [];
    map.forEach((list, userId) => {
      const sorted = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      groups.push({
        userId,
        authorName: sorted[0]?.author_name || 'WeHere User',
        latestAt: new Date(sorted[0].created_at).getTime(),
        posts: sorted,
      });
    });

    return groups.sort((a, b) => b.latestAt - a.latestAt);
  }, [posts]);

  // ─── Load user ID ───
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const raw =
          (await AsyncStorage.getItem('user_id')) ||
          (await AsyncStorage.getItem('userId')) ||
          (await AsyncStorage.getItem('currentUserId')) ||
          (await AsyncStorage.getItem('user'));

        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const id =
              typeof parsed === 'object' && parsed !== null
                ? parsed.id || parsed.user_id || parsed.userId
                : parsed;
            const num = Number(id);
            if (!Number.isNaN(num) && num > 0) {
              setCurrentUserId(num);
            }
          } catch {
            const num = Number(raw);
            if (!Number.isNaN(num) && num > 0) {
              setCurrentUserId(num);
            }
          }
        }
      } catch (e) {
        console.log('AsyncStorage user_id error:', e);
      } finally {
        setUserIdLoading(false);
      }
    };
    loadUserId();
  }, []);

  // ─── Keyboard listeners ───
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        Animated.timing(sheetHeight, {
          toValue: Math.min(height * 0.92, height - e.endCoordinates.height + 20),
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(sheetHeight, {
          toValue: height * 0.82,
          duration: 220,
          useNativeDriver: false,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [height, sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => {
        const base = height * 0.82;
        const next = Math.min(height * 0.95, Math.max(height * 0.4, base - g.dy));
        sheetHeight.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const full = height * 0.95;
        const collapsed = height * 0.5;
        let target = height * 0.82;
        if (g.dy < -40) target = full;
        else if (g.dy > 80) target = collapsed;
        else if (g.vy < -0.5) target = full;
        else if (g.vy > 0.8) {
          setModalVisible(false);
          return;
        }
        Animated.spring(sheetHeight, {
          toValue: target,
          useNativeDriver: false,
          bounciness: 4,
        }).start();
      },
    })
  ).current;

  // ─── Fetch posts ───
  const fetchPosts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCountry !== 'All') params.append('country', selectedCountry);
      if (selectedState !== 'All') params.append('state', selectedState);
      if (nearbyOnly) params.append('nearby', '1');
      if (currentUserId) params.append('current_user_id', String(currentUserId));

      const res = await fetch(`${API_BASE}/posts?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const normalized: Post[] = json.data.map((row: any) => {
          let tags: string[] = [];
          try {
            if (Array.isArray(row.tags)) tags = row.tags;
            else if (typeof row.tags === 'string') tags = JSON.parse(row.tags || '[]');
          } catch {
            tags = [];
          }

          const likes = Array.isArray(row.post_like)
            ? row.post_like
            : typeof row.post_like === 'string'
            ? (() => {
                try {
                  return JSON.parse(row.post_like || '[]');
                } catch {
                  return [];
                }
              })()
            : [];

          const saves = Array.isArray(row.post_save)
            ? row.post_save
            : typeof row.post_save === 'string'
            ? (() => {
                try {
                  return JSON.parse(row.post_save || '[]');
                } catch {
                  return [];
                }
              })()
            : [];

          return {
            ...row,
            tags,
            city: row.city || row.author_city || null,
            state: row.state || row.author_state || null,
            author_city: row.author_city || row.city || null,
            author_state: row.author_state || row.state || null,
            post_like: likes,
            post_save: saves,
            appreciations: likes.length || row.appreciations || 0,
            comments_count: row.comments_count || (Array.isArray(row.comments) ? row.comments.length : 0),
          };
        });

        setPosts(normalized);

        if (currentUserId) {
          const likeMap: { [id: number]: boolean } = {};
          const saveMap: { [id: number]: boolean } = {};
          normalized.forEach((p) => {
            const likes = p.post_like || [];
            const saves = p.post_save || [];
            likeMap[p.id] = likes.some((x) => Number(x) === Number(currentUserId));
            saveMap[p.id] = saves.some((x) => Number(x) === Number(currentUserId));
          });
          setLikedMap(likeMap);
          setSavedMap(saveMap);
        }

        setContextTypes((prev) => {
          const set = new Set(prev.map((c) => c.toLowerCase()));
          const extra: string[] = [];
          normalized.forEach((p) => {
            if (p.context_type && !set.has(p.context_type.toLowerCase())) {
              set.add(p.context_type.toLowerCase());
              extra.push(p.context_type);
            }
          });
          return extra.length ? [...prev, ...extra] : prev;
        });
      } else {
        setPosts([]);
      }
    } catch (err: any) {
      console.log('Fetch posts error:', err?.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCountry, selectedState, nearbyOnly, currentUserId]);

  useEffect(() => {
    if (!userIdLoading) {
      fetchPosts();
    }
  }, [fetchPosts, userIdLoading]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  useEffect(() => {
    if (modalVisible) {
      sheetHeight.setValue(height * 0.82);
      setTimeout(() => richText.current?.setContentHTML(postHtml || ''), 50);
    }
  }, [modalVisible]);

  // ─── Scroll‑to‑post effect ────────────────────────────────────
  useEffect(() => {
    const targetPostId = params.postId ? Number(params.postId) : null;
    if (!targetPostId || userGroups.length === 0) return;
    if (scrolledForPostId.current === params.postId) return;

    let targetGroup: UserPostGroup | null = null;
    let targetIndex = -1;

    for (const group of userGroups) {
      const idx = group.posts.findIndex((p) => p.id === targetPostId);
      if (idx !== -1) {
        targetGroup = group;
        targetIndex = idx;
        break;
      }
    }

    if (!targetGroup) return;

    scrolledForPostId.current = params.postId as string;
    setHighlightedPostId(targetPostId);

    setTimeout(() => {
      const y = groupYPositions[targetGroup!.userId];
      if (typeof y === 'number') {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
      }
      if (targetIndex >= 0) {
        flatListRefs[targetGroup!.userId]?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewPosition: 0,
        });
      }
    }, 300);

    const clearTimer = setTimeout(() => setHighlightedPostId(null), 3000);
    return () => clearTimeout(clearTimer);
  }, [params.postId, userGroups]);

  // ─── Like ─────────────────────────────────────
  const handleLike = async (postId: number) => {
    if (!currentUserId) {
      Alert.alert('Not logged in', 'Please log in to like posts.');
      return;
    }

    const wasLiked = !!likedMap[postId];
    setLikedMap((prev) => ({ ...prev, [postId]: !wasLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const nextCount = Math.max(0, (p.appreciations || 0) + (wasLiked ? -1 : 1));
        return { ...p, appreciations: nextCount };
      })
    );

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      const json = await res.json();

      if (json.success) {
        setLikedMap((prev) => ({ ...prev, [postId]: !!json.liked }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  appreciations: json.count ?? p.appreciations,
                  post_like: json.post_like || p.post_like,
                }
              : p
          )
        );
      } else {
        setLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              appreciations: Math.max(0, (p.appreciations || 0) + (wasLiked ? 1 : -1)),
            };
          })
        );
      }
    } catch (e) {
      setLikedMap((prev) => ({ ...prev, [postId]: wasLiked }));
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          return {
            ...p,
            appreciations: Math.max(0, (p.appreciations || 0) + (wasLiked ? 1 : -1)),
          };
        })
      );
    }
  };

  // ─── Save ─────────────────────────────────────
  const handleSave = async (postId: number) => {
    if (!currentUserId) {
      Alert.alert('Not logged in', 'Please log in to save posts.');
      return;
    }

    const wasSaved = !!savedMap[postId];
    setSavedMap((prev) => ({ ...prev, [postId]: !wasSaved }));

    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUserId }),
      });
      const json = await res.json();

      if (json.success) {
        setSavedMap((prev) => ({ ...prev, [postId]: !!json.saved }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  post_save: json.post_save || p.post_save,
                }
              : p
          )
        );
      } else {
        setSavedMap((prev) => ({ ...prev, [postId]: wasSaved }));
        Alert.alert('Error', json.message || 'Failed to save post');
      }
    } catch (e) {
      setSavedMap((prev) => ({ ...prev, [postId]: wasSaved }));
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // ─── Share ─────────────────────────────────────
  const handleShare = async (post: Post) => {
    try {
      const title = post.title?.trim() || 'Impact on WeHere';
      const plain =
        (post.content || '').replace(/<(.|\n)*?>/g, ' ').replace(/\s+/g, ' ').trim();
      const message = `${title}\n\n${plain.slice(0, 280)}${
        plain.length > 280 ? '…' : ''
      }\n\nShared via WeHere`;

      await Share.share({
        message,
        title,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // ─── Comments ─────────────────────────────────
  const openComments = async (postId: number) => {
    setActivePostId(postId);
    setCommentSheetVisible(true);
    setCommentHtml('');
    setCommentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setComments(json.data);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
      setTimeout(() => commentEditor.current?.setContentHTML(''), 80);
    }
  };

  const submitComment = async () => {
    if (!currentUserId || !activePostId) {
      Alert.alert('Not logged in', 'Please log in to comment.');
      return;
    }
    const plain = commentHtml.replace(/<(.|\n)*?>/g, '').trim();
    if (!plain) {
      Alert.alert('Empty', 'Write a comment first.');
      return;
    }

    setCommentPosting(true);
    try {
      const res = await fetch(`${API_BASE}/posts/${activePostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          content: commentHtml,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const list = Array.isArray(json.data) ? json.data : [...comments, json.comment];
        setComments(list);
        setCommentHtml('');
        commentEditor.current?.setContentHTML('');
        setPosts((prev) =>
          prev.map((p) =>
            p.id === activePostId
              ? { ...p, comments_count: json.count ?? list.length }
              : p
          )
        );
      } else {
        Alert.alert('Error', json.message || 'Failed to post comment');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Network error');
    } finally {
      setCommentPosting(false);
    }
  };

  // ─── Media pickers ─────────────────────────────
  const pickImageOrVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === 'video';
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || `media_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        kind: isVideo ? 'video' : 'image',
      });
    }
  };

  const pickDocumentOrAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      let kind: 'document' | 'audio' = 'document';
      if (asset.mimeType?.startsWith('audio/')) kind = 'audio';
      setSelectedFile({
        uri: asset.uri,
        name: asset.name || `file_${Date.now()}`,
        mimeType: asset.mimeType || 'application/octet-stream',
        kind,
      });
    }
  };

  const openAttachMenu = () => {
    Alert.alert(
      'Attach file',
      'Choose file type',
      [
        { text: 'Image / Video', onPress: pickImageOrVideo },
        { text: 'Document / Audio', onPress: pickDocumentOrAudio },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleAddContextType = () => {
    const trimmed = newContextType.trim();
    if (!trimmed) {
      Alert.alert('Empty', 'Please enter a context type name.');
      return;
    }
    if (trimmed.length > 50) {
      Alert.alert('Too long', 'Keep it under 50 characters.');
      return;
    }
    const existing = contextTypes.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setContextType(existing);
    } else {
      setContextTypes((prev) => [...prev, trimmed]);
      setContextType(trimmed);
    }
    setNewContextType('');
    setAddTypeModalVisible(false);
  };

  const handleCreatePost = async () => {
    if (!currentUserId) {
      Alert.alert('Not logged in', 'User ID not found. Please log in again.');
      return;
    }
    const plainCheck = postHtml.replace(/<(.|\n)*?>/g, '').trim();
    if (!plainCheck && !postTitle.trim() && !selectedFile) {
      Alert.alert('Empty post', 'Please write something or attach a file.');
      return;
    }

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('user_id', String(currentUserId));
      formData.append('title', postTitle.trim());
      formData.append('content', postHtml);
      formData.append('context_type', contextType);
      formData.append('tags', JSON.stringify([contextType]));
      formData.append('country', selectedCountry === 'All' ? '' : selectedCountry);
      formData.append('state', selectedState === 'All' ? '' : selectedState);
      formData.append('is_nearby', nearbyOnly ? '1' : '0');

      if (selectedFile) {
        formData.append('media', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        } as any);
      }

      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        Alert.alert('Success', 'Impact shared successfully!');
        setModalVisible(false);
        setPostHtml('');
        richText.current?.setContentHTML('');
        setPostTitle('');
        setSelectedFile(null);
        setContextType('Awareness');
        fetchPosts();
      } else {
        Alert.alert('Error', json.message || 'Failed to post');
      }
    } catch (err: any) {
      console.log('Create post error:', err?.message);
      Alert.alert('Error', 'Network error. Check server IP and backend.');
    } finally {
      setPosting(false);
    }
  };

  const toggleFullscreen = (postId: number) => {
    setIsFullscreen((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleAudioPlay = (postId: number) => {
    const isCurrentlyPlaying = audioPlaying[postId];
    // Pause all other audio first
    setAudioPlaying((prev) => {
      const next: { [key: number]: boolean } = {};
      Object.keys(prev).forEach((key) => {
        next[parseInt(key, 10)] = false;
      });
      next[postId] = !isCurrentlyPlaying;
      return next;
    });
  };

  const openDocument = async (uri: string, name: string) => {
    try {
      const fileUri = uri.startsWith('http') ? uri : `${MEDIA_BASE}${uri}`;
      if (name.toLowerCase().endsWith('.pdf')) {
        Alert.alert('Open PDF', 'This file will be opened in your default PDF viewer.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => Linking.openURL(fileUri) },
        ]);
      } else {
        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) await Linking.openURL(fileUri);
        else await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.log('Open document error:', error);
      Alert.alert('Error', 'Could not open document.');
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  const getMediaUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${MEDIA_BASE}${path}`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.toLowerCase().split('.').pop() || '';
    switch (ext) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return 'document-text';
      case 'xls':
      case 'xlsx':
        return 'grid';
      case 'ppt':
      case 'pptx':
        return 'cube';
      case 'mp3':
      case 'wav':
      case 'aac':
      case 'm4a':
        return 'musical-notes';
      default:
        return 'document-text';
    }
  };

  const getDisplayTitle = (title: string | null) => {
    if (!title) return null;
    const t = title.trim();
    if (!t || t.toLowerCase() === 'untitled impact') return null;
    return t;
  };

  const getLocationLabel = (post: Post) => {
    const city = post.author_city || post.city || '';
    const state = post.author_state || post.state || '';
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    if (post.country) return post.country;
    return 'Global';
  };

  const isPdf = (post: Post) => {
    const name = (post.media_original_name || post.media_path || '').toLowerCase();
    return (
      post.media_type === 'pdf' ||
      name.endsWith('.pdf') ||
      (post.media_type || '').toLowerCase().includes('pdf')
    );
  };

  const renderPostCard = (post: Post, cardWidth?: number) => {
    const displayTitle = getDisplayTitle(post.title);
    const location = getLocationLabel(post);
    const isLiked = !!likedMap[post.id];
    const isSaved = !!savedMap[post.id];

    return (
      <View
        key={post.id}
        style={[
          styles.postCard,
          cardWidth ? { width: cardWidth, marginHorizontal: 8 } : null,
          post.id === highlightedPostId && styles.highlightedCard,
        ]}
      >
        {post.is_nearby === 1 && nearbyOnly && (
          <View style={styles.nearbyBadge}>
            <Ionicons name="navigate" size={11} color="#0A7A6E" />
            <Text style={styles.nearbyBadgeText}>Nearby</Text>
          </View>
        )}

        <View style={styles.postHeader}>
          <Image
            source={{
              uri:
                post.author_avatar ||
                'https://ui-avatars.com/api/?name=' +
                  encodeURIComponent(post.author_name || 'User') +
                  '&background=0A7A6E&color=fff',
            }}
            style={styles.authorAvatar}
          />
          <View style={styles.authorMeta}>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author_name || 'WeHere User'}
              </Text>
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={11} color="#0A7A6E" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {location}
                </Text>
              </View>
            </View>
            <Text style={styles.authorRole}>
              {post.author_role || post.context_type}
            </Text>
            <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
          </View>
        </View>

        {!!displayTitle && <Text style={styles.postTitle}>{displayTitle}</Text>}

        {!!post.content && (
          <View style={styles.postBodyWrap}>
            <RenderHtml
              contentWidth={(cardWidth || width) - 56}
              source={{ html: post.content }}
              baseStyle={styles.renderHtmlBase}
              tagsStyles={renderHtmlTagStyles}
            />
          </View>
        )}

        {post.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.map((tag, i) => (
              <View key={`${post.id}-tag-${i}`} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {post.media_path && (
          <>
            {post.media_type === 'image' && (
              <TouchableOpacity
                onPress={() => {
                  const url = getMediaUrl(post.media_path);
                  if (url) Linking.openURL(url);
                }}
              >
                <Image
                  source={{ uri: getMediaUrl(post.media_path)! }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}

            {post.media_type === 'video' && (
              <PostVideo
                uri={getMediaUrl(post.media_path)!}
                isFullscreen={!!isFullscreen[post.id]}
                onToggleFullscreen={() => toggleFullscreen(post.id)}
              />
            )}

            {post.media_type === 'audio' && (
              <PostAudio
                uri={getMediaUrl(post.media_path)!}
                name={post.media_original_name || 'Audio file'}
                isPlaying={!!audioPlaying[post.id]}
                onToggle={() => toggleAudioPlay(post.id)}
              />
            )}

            {(isPdf(post) ||
              (post.media_type !== 'image' &&
                post.media_type !== 'video' &&
                post.media_type !== 'audio')) && (
              <TouchableOpacity
                style={styles.pdfLikeCard}
                activeOpacity={0.85}
                onPress={() =>
                  openDocument(
                    post.media_path!,
                    post.media_original_name || 'Document'
                  )
                }
              >
                <View style={styles.pdfPreviewArea}>
                  <Ionicons
                    name={getFileIcon(post.media_original_name || '')}
                    size={48}
                    color="#0A7A6E"
                  />
                  <Text style={styles.pdfPreviewLabel}>
                    {isPdf(post) ? 'PDF Document' : 'Document'}
                  </Text>
                </View>
                <View style={styles.pdfMetaRow}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {post.media_original_name || 'Document'}
                  </Text>
                  <Ionicons name="open-outline" size={18} color="#0A7A6E" />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.engagementRow}>
          <TouchableOpacity
            style={styles.engageBtn}
            onPress={() => handleLike(post.id)}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? '#E05A5A' : '#0A7A6E'}
            />
            <Text style={[styles.engageText, isLiked && { color: '#E05A5A' }]}>
              {post.appreciations || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.engageBtn}
            onPress={() => openComments(post.id)}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#0A7A6E" />
            <Text style={styles.engageText}>{post.comments_count || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.engageBtn}
            onPress={() => handleSave(post.id)}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? '#0A7A6E' : '#0A7A6E'}
            />
            <Text style={[styles.engageText, isSaved && { color: '#0A7A6E' }]}>
              {isSaved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const cardWidth = SCREEN_WIDTH - 32;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3FAF8" />
      <Header />

      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={styles.shareTrigger}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.75}
        >
          <View style={styles.shareAvatar}>
            <Ionicons name="person" size={18} color="#0A7A6E" />
          </View>
          <Text style={styles.sharePlaceholder} numberOfLines={1}>
            Share knowledge, impact or collaboration...
          </Text>
          <Ionicons name="image-outline" size={16} color="#0A7A6E" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtn, filterOpen && styles.filterBtnActive]}
          onPress={() => setFilterOpen((p) => !p)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={filterOpen ? 'options' : 'options-outline'}
            size={22}
            color={filterOpen ? '#FFF' : '#0A7A6E'}
          />
        </TouchableOpacity>
      </View>

      {filterOpen && (
        <View style={styles.filterPanel}>
          <View style={styles.chipRow}>
            <TouchableOpacity style={styles.chip}>
              <Ionicons name="globe-outline" size={14} color="#0A7A6E" />
              <Text style={styles.chipText}>Country · {selectedCountry}</Text>
              <Feather name="chevron-down" size={13} color="#0A7A6E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.chip}>
              <Ionicons name="map-outline" size={14} color="#0A7A6E" />
              <Text style={styles.chipText}>State · {selectedState}</Text>
              <Feather name="chevron-down" size={13} color="#0A7A6E" />
            </TouchableOpacity>
          </View>

          <View style={styles.nearbyRow}>
            <View style={styles.nearbyLeft}>
              <View style={styles.nearbyIconWrap}>
                <Ionicons name="navigate-circle" size={18} color="#0A7A6E" />
              </View>
              <View>
                <Text style={styles.nearbyTitle}>Nearby</Text>
                <Text style={styles.nearbySub}>Local first</Text>
              </View>
            </View>
            <Switch
              value={nearbyOnly}
              onValueChange={setNearbyOnly}
              trackColor={{ false: '#C8DDD8', true: '#7BC9B8' }}
              thumbColor={nearbyOnly ? '#0A7A6E' : '#F4F4F4'}
            />
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#5A8A80" />
            <TextInput
              placeholder="Search..."
              placeholderTextColor="#8AABA3"
              style={styles.searchInput}
            />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28, paddingTop: 6 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0A7A6E']}
          />
        }
      >
        {userIdLoading || loading ? (
          <ActivityIndicator size="large" color="#0A7A6E" style={{ marginTop: 50 }} />
        ) : userGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={48} color="#0A7A6E" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyBtnText}>Share Impact</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userGroups.map((group) => (
            <View
              key={`user-${group.userId}`}
              style={styles.userGroup}
              onLayout={(e) => { groupYPositions[group.userId] = e.nativeEvent.layout.y; }}
            >
              {group.posts.length > 1 && (
                <Text style={styles.swipeHint}>
                  {group.posts.length} posts · swipe →
                </Text>
              )}
              <FlatList
                ref={(ref) => { flatListRefs[group.userId] = ref; }}
                data={group.posts}
                keyExtractor={(item) => `p-${item.id}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH - 16}
                snapToAlignment="start"
                contentContainerStyle={{ paddingHorizontal: 8 }}
                renderItem={({ item }) => renderPostCard(item, cardWidth)}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH - 16,
                  offset: (SCREEN_WIDTH - 16) * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    flatListRefs[group.userId]?.scrollToIndex({ index: info.index, animated: true });
                  }, 300);
                }}
              />
            </View>
          ))
        )}
      </ScrollView>

      {/* ─── Create post modal ────────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setModalVisible(false);
            }}
          />
          <Animated.View style={[styles.modalSheet, { height: sheetHeight }]}>
            <View {...panResponder.panHandlers} style={styles.dragZone}>
              <View style={styles.dragHandle} />
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.modalClose}
                >
                  <Ionicons name="close" size={24} color="#123D38" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Share Impact</Text>
                <TouchableOpacity
                  style={[styles.publishBtn, posting && { opacity: 0.6 }]}
                  onPress={handleCreatePost}
                  disabled={posting}
                >
                  {posting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.publishText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                  paddingBottom:
                    keyboardHeight > 0
                      ? Math.max(12, keyboardHeight * 0.08)
                      : 16,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.contextChips}>
                  {contextTypes.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.contextChip,
                        contextType === c && styles.contextChipActive,
                      ]}
                      onPress={() => setContextType(c)}
                    >
                      <Text
                        style={
                          contextType === c
                            ? styles.contextChipTextActive
                            : styles.contextChipText
                        }
                        numberOfLines={1}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.addContextChip}
                    onPress={() => setAddTypeModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={16} color="#0A7A6E" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Title (optional)"
                  placeholderTextColor="#8AABA3"
                  style={styles.titleInput}
                  value={postTitle}
                  onChangeText={setPostTitle}
                />

                <View style={styles.editorScroll}>
                  <RichEditor
                    ref={richText}
                    initialContentHTML={postHtml}
                    onChange={setPostHtml}
                    placeholder="What knowledge, story or opportunity are you sharing today?"
                    initialHeight={140}
                    editorStyle={richEditorStyle}
                    style={styles.richEditor}
                    useContainer
                  />
                </View>

                <RichToolbar
                  editor={richText}
                  selectedIconTint="#0A7A6E"
                  iconTint="#5A8A80"
                  style={styles.richToolbar}
                  actions={[
                    actions.setBold,
                    actions.setItalic,
                    actions.setUnderline,
                    actions.insertBulletsList,
                    actions.insertOrderedList,
                    actions.insertLink,
                    actions.undo,
                    actions.redo,
                  ]}
                />

                <View style={styles.compactAttachRow}>
                  <TouchableOpacity
                    style={styles.singleAttachBtn}
                    onPress={openAttachMenu}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="attach" size={20} color="#0A7A6E" />
                  </TouchableOpacity>
                  {selectedFile ? (
                    <View style={styles.selectedFileChip}>
                      <Ionicons name="document" size={14} color="#0A7A6E" />
                      <Text style={styles.selectedFileName} numberOfLines={1}>
                        {selectedFile.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setSelectedFile(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={18} color="#E05A5A" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.attachHint}>Image, video, document or audio</Text>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* ─── Comment bottom sheet ────────────────────────────── */}
      <Modal
        animationType="slide"
        transparent
        visible={commentSheetVisible}
        onRequestClose={() => setCommentSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setCommentSheetVisible(false);
            }}
          />
          <View style={[styles.commentSheet, { maxHeight: height * 0.88 }]}>
            <View style={styles.dragZone}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.commentHeader}>
              <Text style={styles.commentTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentSheetVisible(false)}>
                <Ionicons name="close" size={24} color="#123D38" />
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator color="#0A7A6E" style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                style={{ flexGrow: 0, maxHeight: height * 0.45 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
                ListEmptyComponent={
                  <Text style={styles.noComments}>No comments yet. Be the first.</Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{item.author_name}</Text>
                      <Text style={styles.commentTime}>
                        {formatTime(item.created_at)}
                      </Text>
                    </View>
                    <RenderHtml
                      contentWidth={width - 64}
                      source={{ html: item.content_html || '' }}
                      baseStyle={styles.commentBody}
                      tagsStyles={renderHtmlTagStyles}
                    />
                  </View>
                )}
              />
            )}

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={8}
            >
              <View style={styles.commentComposer}>
                <View style={styles.commentEditorWrap}>
                  <RichEditor
                    ref={commentEditor}
                    initialContentHTML={commentHtml}
                    onChange={setCommentHtml}
                    placeholder="Write a comment..."
                    initialHeight={72}
                    editorStyle={richEditorStyle}
                    style={{ minHeight: 72 }}
                    useContainer
                  />
                </View>
                <RichToolbar
                  editor={commentEditor}
                  selectedIconTint="#0A7A6E"
                  iconTint="#5A8A80"
                  style={styles.commentToolbar}
                  actions={[
                    actions.setBold,
                    actions.setItalic,
                    actions.setUnderline,
                    actions.insertBulletsList,
                  ]}
                />
                <TouchableOpacity
                  style={[styles.commentSendBtn, commentPosting && { opacity: 0.6 }]}
                  onPress={submitComment}
                  disabled={commentPosting}
                >
                  {commentPosting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.commentSendText}>Post</Text>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* ─── Add context type modal ───────────────────────────── */}
      <Modal
        visible={addTypeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddTypeModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.addTypeOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.addTypeCard}>
            <Text style={styles.addTypeTitle}>New Context Type</Text>
            <TextInput
              autoFocus
              placeholder="e.g. Mentorship, Fundraiser..."
              placeholderTextColor="#8AABA3"
              style={styles.addTypeInput}
              value={newContextType}
              onChangeText={setNewContextType}
              maxLength={50}
              onSubmitEditing={handleAddContextType}
              returnKeyType="done"
            />
            <View style={styles.addTypeActions}>
              <TouchableOpacity
                style={styles.addTypeCancelBtn}
                onPress={() => {
                  setAddTypeModalVisible(false);
                  setNewContextType('');
                }}
              >
                <Text style={styles.addTypeCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addTypeConfirmBtn}
                onPress={handleAddContextType}
              >
                <Text style={styles.addTypeConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const richEditorStyle = {
  backgroundColor: '#FFFFFF',
  color: '#123D38',
  placeholderColor: '#8AABA3',
  contentCSSText: 'font-size: 15px; line-height: 22px; padding: 4px 2px;',
};

const renderHtmlTagStyles = {
  p: { marginTop: 0, marginBottom: 6 },
  strong: { fontWeight: '700' as const },
  b: { fontWeight: '700' as const },
  em: { fontStyle: 'italic' as const },
  i: { fontStyle: 'italic' as const },
  u: { textDecorationLine: 'underline' as const },
  li: { marginBottom: 2 },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3FAF8' },

  stickyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D6EBE4',
    gap: 10,
    elevation: 3,
    shadowColor: '#0A7A6E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  shareTrigger: {
    flex: 0.72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#C8E6DC',
  },
  shareAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4EFE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sharePlaceholder: { flex: 1, fontSize: 13, color: '#5A8A80' },
  filterBtn: {
    flex: 0.28,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF8F5',
    borderWidth: 1,
    borderColor: '#C8E6DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#0A7A6E', borderColor: '#0A7A6E' },

  filterPanel: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D6EBE4',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#C8E6DC',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#0A7A6E' },
  nearbyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3FAF8',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D6EBE4',
  },
  nearbyLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  nearbyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#D4EFE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nearbyTitle: { fontSize: 13, fontWeight: '700', color: '#123D38' },
  nearbySub: { fontSize: 11, color: '#5A8A80', marginTop: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3FAF8',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D6EBE4',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#123D38' },

  container: { flex: 1 },
  userGroup: { marginBottom: 6 },
  swipeHint: {
    fontSize: 11,
    color: '#8AABA3',
    paddingHorizontal: 16,
    marginBottom: 2,
    marginTop: 4,
  },

  postCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D6EBE4',
    overflow: 'hidden',
  },
  highlightedCard: {
    borderColor: '#0A7A6E',
    borderWidth: 2,
    shadowColor: '#0A7A6E',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  nearbyBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4EFE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    zIndex: 1,
  },
  nearbyBadgeText: { fontSize: 10, fontWeight: '700', color: '#0A7A6E' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22 },
  authorMeta: { flex: 1, marginLeft: 10 },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  authorName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: '#123D38' },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    maxWidth: '48%',
  },
  locationText: { fontSize: 11, fontWeight: '600', color: '#0A7A6E', flexShrink: 1 },
  authorRole: { fontSize: 12, color: '#0A7A6E', marginTop: 1 },
  postTime: { fontSize: 11, color: '#8AABA3', marginTop: 1 },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#123D38',
    marginBottom: 6,
  },
  postBodyWrap: { marginBottom: 10 },
  renderHtmlBase: { fontSize: 14, color: '#2E5A52', lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: {
    backgroundColor: '#EEF8F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: '#0A7A6E' },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },

  videoContainer: {
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  videoPlayer: { width: '100%', height: 200 },
  fullscreenVideo: { height: 400 },
  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoControlButton: { padding: 8 },
  videoTime: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  audioPlayButton: { justifyContent: 'center', alignItems: 'center' },
  audioInfo: { flex: 1 },
  audioName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#123D38',
    marginBottom: 4,
  },
  audioWave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  waveBar: {
    flex: 1,
    backgroundColor: '#0A7A6E',
    borderRadius: 2,
    width: 3,
  },

  pdfLikeCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D6EBE4',
    backgroundColor: '#F8FBF9',
  },
  pdfPreviewArea: {
    height: 160,
    backgroundColor: '#EEF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfPreviewLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0A7A6E',
  },
  pdfMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  documentName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#123D38' },

  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E4F0EC',
    paddingTop: 10,
  },
  engageBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  engageText: { fontSize: 12, fontWeight: '600', color: '#3A6B62' },

  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#123D38',
    marginTop: 10,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#0A7A6E',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,50,45,0.45)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 10,
  },
  dragZone: { alignItems: 'center', paddingVertical: 8 },
  dragHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C8DDD8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalClose: { padding: 4 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#123D38' },
  publishBtn: {
    backgroundColor: '#0A7A6E',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center',
  },
  publishText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  contextChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEF8F5',
    maxWidth: 140,
  },
  contextChipActive: { backgroundColor: '#0A7A6E' },
  contextChipText: { fontSize: 12, fontWeight: '600', color: '#5A8A80' },
  contextChipTextActive: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  addContextChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF8F5',
    borderWidth: 1,
    borderColor: '#C8E6DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#123D38',
    borderBottomWidth: 1,
    borderBottomColor: '#D6EBE4',
    paddingVertical: 8,
    marginBottom: 6,
  },
  editorScroll: {
    borderWidth: 1,
    borderColor: '#E4F0EC',
    borderRadius: 10,
    marginBottom: 4,
    minHeight: 130,
  },
  richEditor: { minHeight: 130 },
  richToolbar: {
    backgroundColor: '#F3FAF8',
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E4F0EC',
  },

  compactAttachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E4F0EC',
  },
  singleAttachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF8F5',
    borderWidth: 1,
    borderColor: '#C8E6DC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedFileChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF8F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  selectedFileName: { flex: 1, fontSize: 13, color: '#123D38' },
  attachHint: { flex: 1, fontSize: 12, color: '#8AABA3' },

  commentSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  commentTitle: { fontSize: 17, fontWeight: '700', color: '#123D38' },
  noComments: {
    textAlign: 'center',
    color: '#8AABA3',
    fontSize: 13,
    paddingVertical: 20,
  },
  commentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E4F0EC',
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: '#123D38' },
  commentTime: { fontSize: 11, color: '#8AABA3' },
  commentBody: { fontSize: 14, color: '#2E5A52', lineHeight: 20 },
  commentComposer: {
    borderTopWidth: 1,
    borderTopColor: '#D6EBE4',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  commentEditorWrap: {
    borderWidth: 1,
    borderColor: '#E4F0EC',
    borderRadius: 10,
    minHeight: 72,
    marginBottom: 4,
  },
  commentToolbar: {
    backgroundColor: '#F3FAF8',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E4F0EC',
  },
  commentSendBtn: {
    backgroundColor: '#0A7A6E',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  commentSendText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  addTypeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,50,45,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  addTypeCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
  },
  addTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#123D38',
    marginBottom: 12,
  },
  addTypeInput: {
    borderWidth: 1,
    borderColor: '#D6EBE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#123D38',
    marginBottom: 16,
  },
  addTypeActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  addTypeCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#EEF8F5',
  },
  addTypeCancelText: { fontSize: 13, fontWeight: '600', color: '#5A8A80' },
  addTypeConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#0A7A6E',
  },
  addTypeConfirmText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});