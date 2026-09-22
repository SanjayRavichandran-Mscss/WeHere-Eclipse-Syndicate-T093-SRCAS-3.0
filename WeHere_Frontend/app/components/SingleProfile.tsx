// app/SingleProfile.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Linking,
  Modal,
  TextInput,
  Animated,
  TouchableWithoutFeedback,
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useFocusEffect } from '@react-navigation/native';

const { height } = Dimensions.get('window');
const API_BASE = 'http://10.100.67.248:5000/api/home'; // base for posts

interface ProfessionalProfile {
  id: number;
  username: string | null;
  full_name: string | null;
  role: string | null;
  city: string | null;
  state: string | null;
  current_location: string | null;
  about_me: string | null;
  blood_group: string | null;
  language_known: string | null;
  gender: string | null;
  occupation: string | null;
  skills: string | null;
  domain: string | null;
  years_of_experience: string | null;
  highest_education_qualification: string | null;
  open_to_work: boolean;
  open_to_speak: boolean;
  open_to_cross_border_collaboration: boolean;
  mentorship_title: string | null;
  mentorship_description: string | null;
  location: string;
  expertise: string;
  assessmentStars: number;
  feedbackStars: number;
  isVerified: boolean;
  isOnline: boolean;
}

interface FeedbackItem {
  reviewer: string;
  feedback: string;
  stars: number;
  createdAt: string;
}

interface Post {
  id: number;
  title: string | null;
  content: string | null;
  created_at: string;
}

type ConnectionStatus = 'none' | 'pending' | 'active' | 'declined';

// Helper to strip HTML for preview
const stripHtml = (html: string | null) =>
  html ? html.replace(/<(.|\n)*?>/g, ' ').replace(/\s+/g, ' ').trim() : '';

export default function SingleProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profileId, profileData } = params as { profileId: string; profileData?: string };

  const parsedInitialProfile: ProfessionalProfile | null = useMemo(() => {
    if (!profileData) return null;
    try {
      return JSON.parse(profileData) as ProfessionalProfile;
    } catch {
      return null;
    }
  }, [profileData]);

  const [profile, setProfile] = useState<ProfessionalProfile | null>(parsedInitialProfile);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(!parsedInitialProfile);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [status, setStatus] = useState<ConnectionStatus>('none');
  const [isActive, setIsActive] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  const [totalRequests, setTotalRequests] = useState(0);
  const [uniqueRequesters, setUniqueRequesters] = useState(0);

  const [expandedSections, setExpandedSections] = useState({
    about: true,
    mentorship: true,
    personal: true,
    feedbacks: true,
    posts: true,
    stats: true,
  });

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getUserId = useCallback(async () => {
    try {
      const raw =
        (await AsyncStorage.getItem('user_id')) ||
        (await AsyncStorage.getItem('userId')) ||
        (await AsyncStorage.getItem('currentUserId')) ||
        (await AsyncStorage.getItem('user'));
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const id = typeof parsed === 'object' && parsed !== null
            ? parsed.id || parsed.user_id || parsed.userId
            : parsed;
          const num = Number(id);
          if (!isNaN(num) && num > 0) return String(num);
        } catch {
          const num = Number(raw);
          if (!isNaN(num) && num > 0) return String(num);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting userId:', error);
      return null;
    }
  }, []);

  const fetchProfileDetails = async () => {
    if (profile) return;
    try {
      const response = await fetch(`http://10.100.67.248:5000/api/networks/profile/${profileId}`);
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      } else {
        Alert.alert('Error', data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const response = await fetch(`http://10.100.67.248:5000/api/networks/feedbacks/${profileId}`);
      const data = await response.json();
      if (data.success) setFeedbacks(data.data || []);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // ─── Fetch posts from /api/home/user/:userId ───
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const response = await fetch(`${API_BASE}/user/${profileId}`);
      const data = await response.json();
      if (data.success) {
        setPosts(data.data || []);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // ─── FIXED: Safe stats fetching with fallback ───
  const fetchStats = async () => {
    try {
      const response = await fetch(`http://10.100.67.248:5000/api/networks/stats/${profileId}`);
      if (!response.ok) {
        console.warn('Stats API returned non-OK status:', response.status);
        setTotalRequests(0);
        setUniqueRequesters(0);
        return;
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success) {
          setTotalRequests(data.total || 0);
          setUniqueRequesters(data.unique || 0);
        } else {
          setTotalRequests(0);
          setUniqueRequesters(0);
        }
      } else {
        console.warn('Stats API did not return JSON, content-type:', contentType);
        setTotalRequests(0);
        setUniqueRequesters(0);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setTotalRequests(0);
      setUniqueRequesters(0);
    }
  };

  const checkStatus = async () => {
    const uid = await getUserId();
    if (!uid) return;
    try {
      const response = await fetch(`http://10.100.67.248:5000/api/networks/status/${profileId}`, {
        headers: { 'user-id': uid },
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data.status || 'none');
        setIsActive(data.isActive || false);
        setDaysLeft(data.daysLeft || 0);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      fetchProfileDetails(),
      fetchFeedbacks(),
      fetchPosts(),
      fetchStats(),
      checkStatus(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (profileId) loadAllData();
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      if (profileId) loadAllData();
    }, [profileId])
  );

  const handleGetInTouch = async () => {
    try {
      const storedUserId = await getUserId();
      if (!storedUserId) {
        Alert.alert('Login Required', 'Please login first');
        return;
      }
      if (String(storedUserId) === String(profileId)) {
        Alert.alert('Invalid Action', 'You cannot Get in Touch with yourself');
        return;
      }
      if (status === 'pending') {
        Alert.alert('Request Sent', 'Your request is pending. Please wait for the response.');
        return;
      }
      if (status === 'active') {
        Alert.alert('Already Connected', 'You are already connected with this professional.');
        return;
      }

      const response = await fetch('http://10.100.67.248:5000/api/networks/get-in-touch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': storedUserId,
        },
        body: JSON.stringify({ profileId }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('pending');
        Alert.alert('Success', 'Get in Touch request sent!');
      } else {
        Alert.alert('Error', data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error in Get in Touch:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  const openFeedbackModal = () => {
    if (!isActive) {
      Alert.alert('Not Available', 'You need to be connected (Get in Touch) to give feedback.');
      return;
    }
    setFeedbackModalVisible(true);
    setFeedbackRating(5);
    setFeedbackText('');
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeFeedbackModal = () => {
    Animated.spring(slideAnim, { toValue: height, useNativeDriver: true, bounciness: 4 }).start(() => {
      setFeedbackModalVisible(false);
    });
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please write your feedback');
      return;
    }
    const storedUserId = await getUserId();
    if (!storedUserId) {
      Alert.alert('Login Required', 'Please login first');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('http://10.100.67.248:5000/api/networks/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': storedUserId,
        },
        body: JSON.stringify({
          profileId,
          feedback: feedbackText,
          feedback_star: feedbackRating,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Feedback submitted!');
        closeFeedbackModal();
        fetchFeedbacks();
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Navigate to home with postId ───
  const handlePostPress = (postId: number) => {
    router.push(`/home?postId=${postId}`);
  };

  const openMaps = () => {
    if (profile?.location) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${profile.location}`);
    }
  };

  const skillsArray = useMemo(
    () => (profile?.skills ? profile.skills.split(',').map(s => s.trim()).filter(Boolean) : []),
    [profile?.skills]
  );

  const avgFeedbackStars = useMemo(() => {
    if (!feedbacks.length) return 0;
    const total = feedbacks.reduce((sum, f) => sum + (f.stars || 0), 0);
    return Math.round((total / feedbacks.length) * 10) / 10;
  }, [feedbacks]);

  const renderStars = (count: number, size = 13, max = 10) => (
    <View style={styles.starsRow}>
      {Array.from({ length: max }).map((_, index) => (
        <Ionicons
          key={index}
          name={index < count ? 'star' : 'star-outline'}
          size={size}
          color={index < count ? '#D97706' : '#CBD5E1'}
          style={{ marginRight: 1 }}
        />
      ))}
    </View>
  );

  // Static stars for skills table (always show filled based on overall assessment, capped at 5)
  const staticSkillStars = Math.min(5, Math.max(0, Math.round((profile?.assessmentStars || 0) / 2)));

  const displayName = profile?.username || profile?.full_name || 'Unknown User';
  const displayOccupation = profile?.occupation && profile.occupation.trim() ? profile.occupation : '----';
  const displayLocation = profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : '----';
  const displayBio = profile?.about_me || 'No bio available';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14532D" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ff6b6b" />
          <Text style={styles.errorText}>Profile not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  let buttonText = 'GET IN TOUCH';
  let buttonStyle = styles.getInTouchBtn;
  let isDisabled = false;
  let iconName: keyof typeof Ionicons.glyphMap = 'paper-plane-outline';
  let declinedHint = null;

  if (status === 'pending') {
    buttonText = 'PENDING';
    buttonStyle = styles.getInTouchPending;
    isDisabled = true;
    iconName = 'time-outline';
  } else if (status === 'active') {
    buttonText = `ACTIVE · ${daysLeft}d left`;
    buttonStyle = styles.getInTouchConnected;
    isDisabled = true;
    iconName = 'checkmark-circle';
  } else if (status === 'declined') {
    buttonText = 'GET IN TOUCH';
    buttonStyle = styles.getInTouchBtn;
    isDisabled = false;
    iconName = 'paper-plane-outline';
    declinedHint = 'Previous request declined – tap to try again';
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ─── Top Back Button (aligned with profile box) ─── */}
      <View style={styles.topBackRow}>
        <TouchableOpacity
          style={styles.backArrowBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: 4 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadAllData} colors={['#14532D']} />
        }
      >
        {/* ─── Profile Header Card ─── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.profileImage}>
              <Text style={styles.profileImageText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
            {profile.isOnline && <View style={styles.onlineBadge} />}
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            {profile.isVerified && (
              <Ionicons name="checkmark-circle" size={18} color="#2563EB" style={{ marginLeft: 5 }} />
            )}
          </View>

          <Text style={styles.profileRole}>{displayOccupation}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#64748B" />
            <Text style={styles.locationText}>{displayLocation}</Text>
            {profile.location ? (
              <TouchableOpacity onPress={openMaps}>
                <Ionicons name="navigate-outline" size={16} color="#14532D" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Expert (left) + Feedback (right) */}
          <View style={styles.ratingSummaryRow}>
            <View style={styles.ratingSummaryItemLeft}>
              <Text style={styles.ratingSummaryLabel}>EXPERT</Text>
              {renderStars(profile.assessmentStars || 0, 13, 10)}
            </View>

            <View style={styles.ratingSummaryItemRight}>
              <Text style={[styles.ratingSummaryLabel, { color: '#7C3AED' }]}>FEEDBACK</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {renderStars(Math.round(avgFeedbackStars), 13, 5)}
                <Text style={styles.ratingSummaryValue}>
                  {feedbacks.length > 0 ? `${avgFeedbackStars} (${feedbacks.length})` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* ─── Skills Table View ─── */}
          {skillsArray.length > 0 && (
            <View style={styles.skillsTable}>
              {/* Table Header */}
              <View style={styles.skillsTableHeader}>
                <Text style={[styles.skillsHeaderText, { flex: 1 }]}>Skills</Text>
                <Text style={[styles.skillsHeaderText, { width: 110, textAlign: 'right' }]}>
                  Expert Star
                </Text>
              </View>

              {/* Table Rows */}
              {skillsArray.map((skill, index) => (
                <View
                  key={index}
                  style={[
                    styles.skillsTableRow,
                    index === skillsArray.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <Text style={styles.skillName} numberOfLines={1}>
                    {skill}
                  </Text>
                  <View style={styles.skillStarsCell}>
                    {renderStars(staticSkillStars, 12, 5)}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Action Buttons ─── */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.getInTouchButton, buttonStyle]}
            onPress={handleGetInTouch}
            disabled={isDisabled}
            activeOpacity={0.85}
          >
            <Ionicons name={iconName} size={18} color="#fff" />
            <Text style={styles.actionButtonText}>{buttonText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.feedbackButton, !isActive && styles.actionButtonDisabled]}
            onPress={openFeedbackModal}
            disabled={!isActive}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Feedback</Text>
          </TouchableOpacity>
        </View>
        {declinedHint && <Text style={styles.declinedHint}>{declinedHint}</Text>}

        {/* ─── Posts ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('posts')} activeOpacity={0.8}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="newspaper-outline" size={16} color="#14532D" />
              <Text style={styles.sectionTitle}>Posts</Text>
            </View>
            <Ionicons name={expandedSections.posts ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.posts && (
            <View style={styles.postsContainer}>
              {loadingPosts ? (
                <ActivityIndicator size="small" color="#14532D" style={{ paddingVertical: 16 }} />
              ) : posts.length > 0 ? (
                posts.map((post) => {
                  const preview = post.title?.trim() || stripHtml(post.content) || 'Untitled post';
                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postItem}
                      onPress={() => handlePostPress(post.id)}
                    >
                      <View style={styles.postContent}>
                        <Text style={styles.postTitle} numberOfLines={2}>{preview}</Text>
                        <Text style={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noDataText}>No posts available</Text>
              )}
            </View>
          )}
        </View>

        {/* ─── Stats ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('stats')} activeOpacity={0.8}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="people-outline" size={16} color="#14532D" />
              <Text style={styles.sectionTitle}>Get-in-Touch Stats</Text>
            </View>
            <Ionicons name={expandedSections.stats ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Requests</Text>
                <Text style={styles.statValue}>{totalRequests}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Unique Requesters</Text>
                <Text style={styles.statValue}>{uniqueRequesters}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ─── About ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('about')} activeOpacity={0.8}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="person-outline" size={16} color="#14532D" />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Ionicons name={expandedSections.about ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.about && <Text style={styles.bioText}>{displayBio}</Text>}
        </View>

        {/* ─── Mentorship ────────────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('mentorship')} activeOpacity={0.8}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="school-outline" size={16} color="#14532D" />
              <Text style={styles.sectionTitle}>Mentorship</Text>
            </View>
            <Ionicons name={expandedSections.mentorship ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.mentorship && (
            <>
              {profile.mentorship_title ? (
                <View style={{ paddingBottom: 14 }}>
                  <Text style={styles.mentorshipTitle}>{profile.mentorship_title}</Text>
                  {profile.mentorship_description && (
                    <Text style={styles.mentorshipDescription}>{profile.mentorship_description}</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>No mentorship info available</Text>
              )}
            </>
          )}
        </View>

        {/* ─── Personal Details ─────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('personal')} activeOpacity={0.8}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="information-circle-outline" size={16} color="#14532D" />
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>
            <Ionicons name={expandedSections.personal ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.personal && (
            <>
              {(profile.blood_group || profile.language_known || profile.gender) ? (
                <View style={styles.personalDetailsGrid}>
                  {profile.blood_group && (
                    <View style={styles.personalDetailItem}>
                      <Text style={styles.personalDetailLabel}>Blood Group</Text>
                      <Text style={styles.personalDetailValue}>{profile.blood_group}</Text>
                    </View>
                  )}
                  {profile.language_known && (
                    <View style={styles.personalDetailItem}>
                      <Text style={styles.personalDetailLabel}>Language</Text>
                      <Text style={styles.personalDetailValue}>{profile.language_known}</Text>
                    </View>
                  )}
                  {profile.gender && (
                    <View style={styles.personalDetailItem}>
                      <Text style={styles.personalDetailValue}>
                        {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.noDataText}>No personal details available</Text>
              )}
            </>
          )}
        </View>

        {/* ─── Feedbacks ─────────────────────────────────────────── */}
        <View style={[styles.section, styles.lastSection]}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('feedbacks')} activeOpacity={0.8}>
            <View style={styles.feedbackHeaderLeft}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="chatbubbles-outline" size={16} color="#14532D" />
                <Text style={styles.sectionTitle}>Feedbacks</Text>
              </View>
              {feedbacks.length > 0 && (
                <View style={styles.feedbackCountPill}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.feedbackCount}>{avgFeedbackStars} · {feedbacks.length} reviews</Text>
                </View>
              )}
            </View>
            <Ionicons name={expandedSections.feedbacks ? 'chevron-up' : 'chevron-down'} size={20} color="#14532D" />
          </TouchableOpacity>
          {expandedSections.feedbacks && (
            <>
              {loadingFeedbacks ? (
                <ActivityIndicator size="small" color="#14532D" style={{ paddingVertical: 16 }} />
              ) : feedbacks.length > 0 ? (
                feedbacks.map((feedback, index) => (
                  <View key={index} style={styles.feedbackCard}>
                    <View style={styles.feedbackHeaderRow}>
                      <View style={styles.feedbackReviewerContainer}>
                        <View style={styles.feedbackAvatar}>
                          <Text style={styles.feedbackAvatarText}>
                            {feedback.reviewer.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.feedbackReviewer}>{feedback.reviewer}</Text>
                          <View style={styles.feedbackStars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Ionicons
                                key={star}
                                name={star <= feedback.stars ? 'star' : 'star-outline'}
                                size={14}
                                color="#F59E0B"
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <Text style={styles.feedbackDate}>
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.feedbackText}>"{feedback.feedback}"</Text>
                  </View>
                ))
              ) : (
                <View style={{ height: 10 }} />
              )}

              {!isActive && (
                <View style={styles.connectHintRow}>
                  <Ionicons name="lock-closed" size={16} color="#94A3B8" />
                  <Text style={styles.connectHintText}>Get in Touch to leave feedback</Text>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ─── Feedback Bottom Sheet ──────────────────────────────── */}
      <Modal visible={feedbackModalVisible} transparent animationType="none" onRequestClose={closeFeedbackModal}>
        <TouchableWithoutFeedback onPress={closeFeedbackModal}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Submit Feedback</Text>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Rating:</Text>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Ionicons
                    name={star <= feedbackRating ? 'star' : 'star-outline'}
                    size={32}
                    color={star <= feedbackRating ? '#F59E0B' : '#CBD5E1'}
                    style={styles.ratingStar}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            style={styles.feedbackInput}
            placeholder="Write your feedback..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={feedbackText}
            onChangeText={setFeedbackText}
            textAlignVertical="top"
          />

          <View style={styles.feedbackButtonsRow}>
            <TouchableOpacity style={[styles.feedbackButtonAction, styles.cancelButton]} onPress={closeFeedbackModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedbackButtonAction, styles.submitButton, submitting && { opacity: 0.6 }]}
              onPress={submitFeedback}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollView: { flex: 1 },

  // ─── Top Back Arrow ───
  topBackRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 2,
    backgroundColor: '#F8FAFC',
  },
  backArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // ─── Profile Header Card ───
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  avatarWrapper: { position: 'relative' },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  profileImageText: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  onlineBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', maxWidth: 240 },
  profileRole: { fontSize: 14, color: '#14532D', fontWeight: '600', marginTop: 2, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  locationText: { fontSize: 13.5, color: '#64748B' },

  // Expert left + Feedback right
  ratingSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  ratingSummaryItemLeft: {
    alignItems: 'flex-start',
    flex: 1,
  },
  ratingSummaryItemRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  ratingSummaryLabel: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D97706',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  ratingSummaryValue: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '600',
  },
  starsRow: { flexDirection: 'row', alignItems: 'center' },

  // ─── Skills Table ───
  skillsTable: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
  },
  skillsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  skillsHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#14532D',
    letterSpacing: 0.3,
  },
  skillsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  skillName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 10,
  },
  skillStarsCell: {
    width: 110,
    alignItems: 'flex-end',
  },

  // ─── Action Buttons ───
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  actionButtonDisabled: { opacity: 0.55 },
  feedbackButton: { backgroundColor: '#F59E0B' },
  getInTouchButton: { backgroundColor: '#22C55E' },
  getInTouchPending: { backgroundColor: '#F59E0B' },
  getInTouchConnected: { backgroundColor: '#14532D' },
  getInTouchBtn: { backgroundColor: '#22C55E' },
  actionButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  declinedHint: {
    fontSize: 10,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 6,
    fontWeight: '500',
  },

  // ─── Sections ───
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lastSection: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#FAFBFC',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  postsContainer: { paddingHorizontal: 14, paddingBottom: 14 },
  postItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  postContent: { flex: 1, marginRight: 8 },
  postTitle: { fontSize: 13, fontWeight: '500', color: '#0F172A' },
  postDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statsContainer: { paddingHorizontal: 14, paddingBottom: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  statValue: { fontSize: 13, color: '#0F172A', fontWeight: '600' },
  bioText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  mentorshipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  mentorshipDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  personalDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  personalDetailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  personalDetailLabel: { fontSize: 11, color: '#64748B', marginBottom: 3 },
  personalDetailValue: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  feedbackHeaderLeft: { flexDirection: 'column', gap: 4 },
  feedbackCountPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  feedbackCount: { fontSize: 11.5, color: '#64748B', fontWeight: '600' },
  feedbackCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackReviewerContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14532D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  feedbackReviewer: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  feedbackStars: { flexDirection: 'row', gap: 2 },
  feedbackDate: { fontSize: 11, color: '#94A3B8' },
  feedbackText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  connectHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 14,
    paddingVertical: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  connectHintText: { fontSize: 12.5, color: '#64748B', fontWeight: '500' },
  noDataText: {
    fontSize: 13.5,
    color: '#94A3B8',
    paddingHorizontal: 14,
    paddingVertical: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorText: { fontSize: 18, color: '#666', marginTop: 12 },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#14532D',
    borderRadius: 8,
  },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // ─── Modal / Bottom Sheet ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  ratingLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginRight: 12 },
  ratingStars: { flexDirection: 'row', gap: 4 },
  ratingStar: { marginRight: 2 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  feedbackButtonsRow: { flexDirection: 'row', gap: 12 },
  feedbackButtonAction: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#F1F5F9' },
  cancelButtonText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
  submitButton: { backgroundColor: '#14532D' },
  submitButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});