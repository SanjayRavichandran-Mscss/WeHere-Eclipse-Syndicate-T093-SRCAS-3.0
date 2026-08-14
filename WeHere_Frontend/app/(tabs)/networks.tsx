// app/(tabs)/networks.tsx
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Header from '../components/header';

const { width, height } = Dimensions.get('window');

const SIDE_PADDING = 16;
const CARD_MARGIN = 10;
const CARD_WIDTH = width - SIDE_PADDING * 2 - 8;
const API_BASE = 'http://192.168.137.1:5000/api/networks';

// ─── Types ──────────────────────────────────────────────────────

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

interface SkillGroup {
  skill: string;
  data: ProfessionalProfile[];
}

type ConnectionStatus = 'none' | 'pending' | 'active' | 'declined';

export default function NetworksScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState<ProfessionalProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Status map: stores the connection status for each user
  const [statusMap, setStatusMap] = useState<{ [userId: number]: ConnectionStatus }>({});

  // Bottom sheet state
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Feedback form state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // ─── Helpers ────────────────────────────────────────────────

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
          const id = typeof parsed === 'object' && parsed !== null
            ? parsed.id || parsed.user_id || parsed.userId
            : parsed;
          const num = Number(id);
          if (!Number.isNaN(num) && num > 0) {
            setUserId(String(num));
            return String(num);
          }
        } catch {
          const num = Number(raw);
          if (!Number.isNaN(num) && num > 0) {
            setUserId(String(num));
            return String(num);
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting userId:', error);
      return null;
    }
  };

  // ─── Check status for all users ─────────────────────────────

  const checkStatusForUsers = async (users: ProfessionalProfile[]) => {
    if (!userId || users.length === 0) return;
    const statusMapObj: { [id: number]: ConnectionStatus } = {};
    const promises = users.map(async (user) => {
      try {
        const response = await fetch(`${API_BASE}/status/${user.id}`, {
          headers: { 'user-id': userId },
        });
        const data = await response.json();
        if (data.success) {
          statusMapObj[user.id] = data.status || 'none';
        }
      } catch (error) {
        console.error('Error checking status for user', user.id, error);
      }
    });
    await Promise.all(promises);
    setStatusMap(statusMapObj);
  };

  // ─── Fetch professionals ─────────────────────────────────────

  const fetchProfessionals = async () => {
    try {
      const uid = await getUserId();
      if (!uid) {
        setLoading(false);
        return;
      }

      const url = `${API_BASE}/professionals/${uid}`;
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        const users = data.users || [];
        setProfessionals(users);
        setFilteredProfessionals(users);
        await checkStatusForUsers(users);
      } else {
        Alert.alert('Error', data.message || 'Failed to load professionals');
        setProfessionals([]);
        setFilteredProfessionals([]);
      }
    } catch (error) {
      console.error('Error fetching professionals:', error);
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── Handlers ────────────────────────────────────────────────

 const handleProfilePress = (profile: ProfessionalProfile) => {
  router.push({
    pathname: '../components/SingleProfile',
    params: {
      profileId: String(profile.id),
      profileData: JSON.stringify(profile),
    },
  });
};

  const handleGetInTouch = async (profile: ProfessionalProfile) => {
    try {
      const storedUserId = await getUserId();
      if (!storedUserId) {
        Alert.alert('Login Required', 'Please login first');
        return;
      }

      if (String(storedUserId) === String(profile.id)) {
        Alert.alert('Invalid Action', 'You cannot Get in Touch with yourself');
        return;
      }

      const currentStatus = statusMap[profile.id] || 'none';

      // Prevent new request if already pending or active
      if (currentStatus === 'pending') {
        Alert.alert('Request Sent', 'Your request is pending. Please wait for the response.');
        return;
      }
      if (currentStatus === 'active') {
        Alert.alert('Already Connected', 'You are already connected with this professional.');
        return;
      }

      // If declined or none, we can send a new request
      const response = await fetch(`${API_BASE}/get-in-touch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': storedUserId,
        },
        body: JSON.stringify({ profileId: profile.id }),
      });

      const data = await response.json();
      if (data.success) {
        // Update status to 'pending'
        setStatusMap(prev => ({ ...prev, [profile.id]: 'pending' }));
        Alert.alert('Success', 'Get in Touch request sent!');
      } else {
        Alert.alert('Error', data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error in Get in Touch:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // ─── Feedback handlers ──────────────────────────────────────────

  const fetchFeedbacks = async (profileId: number) => {
    setLoadingFeedbacks(true);
    try {
      const response = await fetch(`${API_BASE}/feedbacks/${profileId}`);
      const data = await response.json();
      if (data.success) {
        setFeedbacks(data.data || []);
      } else {
        setFeedbacks([]);
      }
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      setFeedbacks([]);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleViewFeedback = (profile: ProfessionalProfile) => {
    setSelectedProfileId(profile.id);
    setFeedbackModalVisible(true);
    fetchFeedbacks(profile.id);
    setFeedbackRating(5);
    setFeedbackText('');
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeFeedbackModal = () => {
    Animated.spring(slideAnim, {
      toValue: height,
      useNativeDriver: true,
      bounciness: 4,
    }).start(() => {
      setFeedbackModalVisible(false);
      setFeedbacks([]);
      setSelectedProfileId(null);
    });
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please write your feedback');
      return;
    }
    const storedUserId = await getUserId();
    if (!storedUserId || !selectedProfileId) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': storedUserId,
        },
        body: JSON.stringify({
          profileId: selectedProfileId,
          feedback: feedbackText,
          feedback_star: feedbackRating,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Feedback submitted!');
        setFeedbackText('');
        setFeedbackRating(5);
        fetchFeedbacks(selectedProfileId);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // ─── Effects ──────────────────────────────────────────────────

  // Search filter
  useEffect(() => {
    let filtered = professionals;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          (p.username && p.username.toLowerCase().includes(query)) ||
          (p.role && p.role.toLowerCase().includes(query)) ||
          (p.location && p.location.toLowerCase().includes(query)) ||
          (p.skills && p.skills.toLowerCase().includes(query))
      );
    }
    setFilteredProfessionals(filtered);
  }, [searchQuery, professionals]);

  // Initial load
  useEffect(() => {
    getUserId();
    fetchProfessionals();
  }, []);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchProfessionals();
    }, [])
  );

  // ─── Group professionals by skill ──────────────────────────

  const groupedProfessionals: SkillGroup[] = useMemo(() => {
    const map: { [skill: string]: ProfessionalProfile[] } = {};
    const order: string[] = [];

    filteredProfessionals.forEach((item) => {
      const skillsArray = item.skills
        ? item.skills.split(',').map((s) => s.trim()).filter((s) => s)
        : [];
      const primarySkill = skillsArray.length > 0 ? skillsArray[0] : 'Other';

      if (!map[primarySkill]) {
        map[primarySkill] = [];
        order.push(primarySkill);
      }
      map[primarySkill].push(item);
    });

    return order.map((skill) => ({ skill, data: map[skill] }));
  }, [filteredProfessionals]);

  // ─── Render helpers ──────────────────────────────────────────

  const renderStars = useCallback((count: number) => {
    return (
      <View style={styles.starsRow}>
        {Array.from({ length: 10 }).map((_, index) => (
          <Ionicons
            key={index}
            name={index < count ? 'star' : 'star-outline'}
            size={15}
            color={index < count ? '#D97706' : '#CBD5E1'}
            style={styles.starMargin}
          />
        ))}
      </View>
    );
  }, []);

  const renderProfileCard = ({ item }: { item: ProfessionalProfile }) => {
    const displayName = item.username || item.full_name || 'Unknown User';
    const occupationDisplay = item.occupation || '---';
    const skillsArray = item.skills ? item.skills.split(',').map(s => s.trim()).filter(s => s) : [];
    const displaySkills = skillsArray.slice(0, 2);
    const remainingCount = skillsArray.length - 2;
    const locationDisplay = (item.city && item.state) ? `${item.city}, ${item.state}` : '---';
    const bioDisplay = item.about_me || 'No bio available';

    const status = statusMap[item.id] || 'none';

    // Determine button text, style, and disabled state
    let buttonText = 'GET IN TOUCH';
    let buttonStyle = styles.getInTouchBtn;
    let isDisabled = false;
    let iconName = 'paper-plane-outline';
    let declinedLabel = null; // hint for declined status

    if (status === 'pending') {
      buttonText = 'PENDING';
      buttonStyle = styles.getInTouchPending;
      isDisabled = true;
      iconName = 'time-outline';
    } else if (status === 'active') {
      buttonText = 'CONNECTED';
      buttonStyle = styles.getInTouchConnected;
      isDisabled = true;
      iconName = 'checkmark-circle';
    } else if (status === 'declined') {
      // Keep button as "GET IN TOUCH" with normal style
      buttonText = 'GET IN TOUCH';
      buttonStyle = styles.getInTouchBtn;
      isDisabled = false;
      iconName = 'paper-plane-outline';
      declinedLabel = 'Previous request declined – tap to try again';
    }

    return (
      <TouchableOpacity
        activeOpacity={0.96}
        style={styles.profileCard}
        onPress={() => handleProfilePress(item)}
      >
        {/* Expert rating row */}
        <View style={styles.ratingTableRow}>
          <Text style={styles.expertBadgeText}>EXPERT</Text>
          <View style={styles.ratingRightGroup}>
            {renderStars(item.assessmentStars || 8)}
          </View>
        </View>

        <View style={styles.profileMainRow}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarSquare}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            {item.isOnline && <View style={styles.onlineBadge} />}
          </View>

          <View style={styles.profileInfoDetails}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.profileName}>
                {displayName}
              </Text>
              {item.isVerified && (
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#2563EB"
                  style={styles.verifiedIcon}
                />
              )}
            </View>

            <Text numberOfLines={1} style={styles.roleTitle}>
              {occupationDisplay}
            </Text>

            {skillsArray.length > 0 ? (
              <View style={styles.skillsContainer}>
                {displaySkills.map((skill, index) => (
                  <View key={index} style={styles.skillPill}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
                {remainingCount > 0 && (
                  <View style={styles.skillPill}>
                    <Text style={styles.skillText}>+{remainingCount}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.skillPlaceholder}>---</Text>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#64748B" />
              <Text numberOfLines={1} style={styles.locationText}>
                {locationDisplay}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.accentDivider} />

        <Text numberOfLines={3} style={styles.bioText}>
          {bioDisplay}
        </Text>

        <View style={styles.lightDivider} />

        <View style={styles.ratingTableRow}>
          <Text style={styles.feedbackPillText}>FEEDBACK</Text>
          <View style={styles.ratingRightGroup}>
            {renderStars(item.feedbackStars || 7)}
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={buttonStyle}
            onPress={() => handleGetInTouch(item)}
            disabled={isDisabled}
          >
            <Ionicons name={iconName} size={13} color="#FFFFFF" />
            <Text style={styles.getInTouchText}>{buttonText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.viewFeedbackBtn}
            onPress={() => handleViewFeedback(item)}
          >
            <Ionicons name="chatbubbles-outline" size={13} color="#7C3AED" />
            <Text style={styles.viewFeedbackText}>VIEW FEEDBACK</Text>
          </TouchableOpacity>
        </View>

        {/* Show declined hint if status is declined */}
        {declinedLabel && (
          <Text style={styles.declinedHint}>{declinedLabel}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderSkillSection = (group: SkillGroup) => (
    <View key={group.skill} style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionHeaderDot} />
          <Text style={styles.sectionHeaderText} numberOfLines={1}>
            {group.skill}
          </Text>
        </View>
        <Text style={styles.sectionCountText}>
          {group.data.length} {group.data.length === 1 ? 'Professional' : 'Professionals'}
        </Text>
      </View>

      <FlatList
        horizontal
        data={group.data}
        renderItem={renderProfileCard}
        keyExtractor={(item) => `${group.skill}-${item.id}`}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        decelerationRate="fast"
        contentContainerStyle={styles.horizontalScrollContent}
      />
    </View>
  );

  // ─── Main render ─────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14532D" />
          <Text style={styles.loadingText}>Loading professionals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header />

      <View style={styles.searchSection}>
        <Ionicons name="search-outline" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInputText}
          placeholder="Search professionals..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.verticalListContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchProfessionals}
            colors={['#14532D']}
          />
        }
      >
        {groupedProfessionals.length > 0 ? (
          groupedProfessionals.map((group) => renderSkillSection(group))
        ) : (
          <View style={styles.emptyView}>
            <Ionicons name="people-outline" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTextTitle}>No professionals found</Text>
            <Text style={styles.emptyTextSubtitle}>
              Try adjusting your search
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Feedback Bottom Sheet Modal */}
      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeFeedbackModal}
      >
        <TouchableWithoutFeedback onPress={closeFeedbackModal}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.bottomSheetHandle} />
          <Text style={styles.bottomSheetTitle}>Feedbacks</Text>

          {loadingFeedbacks ? (
            <ActivityIndicator size="small" color="#14532D" style={{ marginTop: 20 }} />
          ) : feedbacks.length > 0 ? (
            <FlatList
              data={feedbacks}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.feedbackItem}>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackReviewer}>{item.reviewer}</Text>
                    <Text style={styles.feedbackDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.feedbackStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= item.stars ? 'star' : 'star-outline'}
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                  <Text style={styles.feedbackText}>"{item.feedback}"</Text>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <Text style={styles.noFeedbackText}>No feedbacks yet</Text>
          )}

          {selectedProfileId && statusMap[selectedProfileId] === 'active' ? (
            <View style={styles.feedbackFormContainer}>
              <Text style={styles.feedbackFormTitle}>Submit Your Feedback</Text>
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingLabel}>Rating:</Text>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                      <Ionicons
                        name={star <= feedbackRating ? 'star' : 'star-outline'}
                        size={28}
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
                numberOfLines={3}
                value={feedbackText}
                onChangeText={setFeedbackText}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.submitFeedbackBtn, submittingFeedback && { opacity: 0.6 }]}
                onPress={submitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitFeedbackText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            selectedProfileId && (
              <View style={styles.connectMessageContainer}>
                <Ionicons name="lock-closed" size={20} color="#94A3B8" />
                <Text style={styles.connectMessageText}>
                  {statusMap[selectedProfileId] === 'pending'
                    ? 'Request pending – wait for acceptance'
                    : 'Connect to submit feedback'}
                </Text>
              </View>
            )
          )}

          <TouchableOpacity style={styles.closeBottomSheetBtn} onPress={closeFeedbackModal}>
            <Text style={styles.closeBottomSheetText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInputText: { flex: 1, marginLeft: 8, fontSize: 13.5, color: '#0F172A' },
  verticalListContainer: { paddingTop: 10, paddingBottom: 40 },
  sectionBlock: { marginBottom: 18 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE_PADDING,
    marginBottom: 8,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 8 },
  sectionHeaderDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#14532D',
    marginRight: 6,
  },
  sectionHeaderText: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  sectionCountText: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
  horizontalScrollContent: {
    paddingLeft: SIDE_PADDING,
    paddingRight: SIDE_PADDING,
    gap: CARD_MARGIN,
  },
  profileCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FAFBFC',
    marginBottom: 12,
  },
  expertBadgeText: { fontSize: 13, fontWeight: '900', color: '#D97706', letterSpacing: 0.5 },
  feedbackPillText: { fontSize: 13, fontWeight: '900', color: '#7C3AED', letterSpacing: 0.4 },
  ratingRightGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  starMargin: { marginRight: 1 },
  profileMainRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatarSquare: {
    width: 66,
    height: 66,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#334155' },
  onlineBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfoDetails: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  profileName: { fontSize: 15.5, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  verifiedIcon: { marginLeft: 4 },
  roleTitle: { fontSize: 12.5, fontWeight: '700', color: '#1E3A8A', marginTop: 1 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  skillPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  skillText: { fontSize: 10.5, fontWeight: '700', color: '#15803D' },
  skillPlaceholder: { fontSize: 10.5, color: '#94A3B8', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locationText: { fontSize: 11, fontWeight: '500', color: '#64748B', marginLeft: 2 },
  accentDivider: { width: 28, height: 2, backgroundColor: '#FCD34D', borderRadius: 1, marginVertical: 6 },
  lightDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  bioText: { fontSize: 11.5, lineHeight: 17, color: '#475569' },
  actionButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  getInTouchBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#14532D',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  getInTouchPending: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  getInTouchConnected: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  getInTouchText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  viewFeedbackBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  viewFeedbackText: { fontSize: 10.5, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.2 },
  declinedHint: {
    fontSize: 10,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  emptyView: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTextTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 10 },
  emptyTextSubtitle: { fontSize: 12.5, color: '#94A3B8', marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  // Bottom Sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.8,
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
  bottomSheetHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  feedbackItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  feedbackReviewer: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  feedbackDate: { fontSize: 11, color: '#94A3B8' },
  feedbackStarsRow: { flexDirection: 'row', gap: 2, marginBottom: 4 },
  feedbackText: { fontSize: 13, color: '#475569', lineHeight: 19, fontStyle: 'italic' },
  noFeedbackText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },
  closeBottomSheetBtn: {
    backgroundColor: '#14532D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  closeBottomSheetText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // Feedback Form
  feedbackFormContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  feedbackFormTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 10 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ratingLabel: { fontSize: 14, fontWeight: '500', color: '#0F172A', marginRight: 8 },
  ratingStars: { flexDirection: 'row', gap: 4 },
  ratingStar: { marginRight: 2 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
  },
  submitFeedbackBtn: {
    backgroundColor: '#14532D',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submitFeedbackText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  connectMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  connectMessageText: { marginLeft: 8, fontSize: 14, color: '#64748B' },
}); 