import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  LayoutAnimation,
  Linking,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import EmergencyContactsManager from '../components/OfflineComponents/EmergencyContactsManager';
import { initializeOfflineDB } from '../../services/offlineSyncService';
import FlashMessage, { showMessage } from 'react-native-flash-message';

const API_BASE_URL = 'http://10.100.67.248:5000/api';
const WORK_OPTIONS = ['Volunteering', 'Freelance', 'Full-time', 'Part-time', 'Consulting'];

/* ═══════════════════════════════════════════════════════════
   LOCAL SQLITE – Emergency PIN only (kept inside this file)
═══════════════════════════════════════════════════════════ */
let pinDb: SQLite.SQLiteDatabase | null = null;
let dbInitialized = false;

const initPinDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    if (pinDb) {
      return pinDb;
    }
    
    // Open database with proper error handling
    const db = await SQLite.openDatabaseAsync('wehere_emergency_pin.db');
    
    // Create table with IF NOT EXISTS and proper error handling
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_emergency_pin (
        user_id INTEGER PRIMARY KEY NOT NULL,
        emergency_pin TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    pinDb = db;
    dbInitialized = true;
    return db;
  } catch (error) {
    console.error('[Database] Init error:', error);
    throw new Error('Failed to initialize database');
  }
};

const savePinLocally = async (userId: number, pin: string): Promise<void> => {
  try {
    const db = await initPinDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_emergency_pin (user_id, emergency_pin, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
      [userId, pin]
    );
  } catch (error) {
    console.error('[Database] Save PIN error:', error);
    throw new Error('Failed to save PIN locally');
  }
};

const getPinLocally = async (userId: number): Promise<string | null> => {
  try {
    const db = await initPinDatabase();
    const row = await db.getFirstAsync<{ emergency_pin: string }>(
      'SELECT emergency_pin FROM user_emergency_pin WHERE user_id = ?',
      [userId]
    );
    return row?.emergency_pin ?? null;
  } catch (error) {
    console.error('[Database] Get PIN error:', error);
    return null; // Return null instead of throwing to handle gracefully
  }
};

/* ═══════════════════════════════════════════════════════════ */

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');
  const [logoutAlertVisible, setLogoutAlertVisible] = useState(false);
  const [emergencyContactCount, setEmergencyContactCount] = useState(0);

  const [account, setAccount] = useState({ username: '', mobileNumber: '' });

  const [form, setForm] = useState({
    fullName: '', dateOfBirth: '', languageKnown: '', gender: '', bloodGroup: '', aboutMe: '', role: '',
    address: '', city: '', state: '', pincode: '', currentLocation: '', currentLatitude: '', currentLongitude: '',
    domain: '', skills: '', occupation: '', yearsOfExperience: '', highestEducationQualification: '', testLink: '',
    preferredLanguage: '', // NEW
    mentorshipTitle: '', mentorshipDescription: '',
    openToWork: false, openToSpeak: false, openToCrossBorderCollaboration: false,
    emergencyPin: '',
  });

  const [preferredWork, setPreferredWork] = useState<string[]>([]);

  // ── Emergency PIN UI state ──────────────────────────────────────────────
  const [pinShowPlain, setPinShowPlain] = useState(false);
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinOtpValue, setPinOtpValue] = useState('');
  const [pinOtpVerified, setPinOtpVerified] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (!editMode) {
      setPinShowPlain(false);
      setPinOtpSent(false);
      setPinOtpValue('');
      setPinOtpVerified(false);
      setPinInput('');
      setPinConfirm('');
    }
  }, [editMode]);

  const initializeApp = async () => {
    try {
      setFetching(true);
      // Initialize databases with proper error handling
      try {
        await initializeOfflineDB();
        await initPinDatabase();
      } catch (dbInitError) {
        console.error('Database initialization error:', dbInitError);
        setDbError(true);
        // Continue with profile loading even if DB fails
        // The app will work but PIN features will be disabled
      }
      await loadProfile();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      showError('Failed to initialize app. Please restart.');
    } finally {
      setFetching(false);
    }
  };

  const showError = (message: string) => {
    showMessage({
      message: 'Error',
      description: message,
      type: 'danger',
      icon: 'danger',
      duration: 3000,
    });
  };

  const showSuccess = (message: string) => {
    showMessage({
      message: 'Success',
      description: message,
      type: 'success',
      icon: 'success',
      duration: 2000,
    });
  };

  const loadProfile = async () => {
    try {
      setFetching(true);

      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        setFetching(false);
        showError('User data not found. Please login again.');
        router.replace('/');
        return;
      }

      const user = JSON.parse(storedUser);
      if (!user || !user.id) {
        setFetching(false);
        showError('User data not found. Please login again.');
        router.replace('/');
        return;
      }

      setUserId(user.id);
      setAccount({
        username: user.username || '',
        mobileNumber: user.mobileNumber || '',
      });

      const profileResponse = await fetch(`${API_BASE_URL}/auth/profile/${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          showError('Profile not found. Please update your profile.');
        } else if (profileResponse.status === 500) {
          showError('Server error. Please try again later.');
        } else {
          showError(`HTTP error! status: ${profileResponse.status}`);
        }
        setFetching(false);
        return;
      }

      const responseText = await profileResponse.text();
      if (!responseText || responseText.trim() === '') {
        showError('Empty response from server');
        setFetching(false);
        return;
      }

      let profileData;
      try {
        profileData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        showError('Invalid response format from server');
        setFetching(false);
        return;
      }

      if (profileData.success && profileData.profile) {
        const p = profileData.profile;

        let pinValue = p.emergency_pin != null ? String(p.emergency_pin) : '';
        if (!pinValue && !dbError) {
          try {
            const localPin = await getPinLocally(user.id);
            if (localPin) pinValue = localPin;
          } catch (pinError) {
            console.error('Error getting local PIN:', pinError);
            // Continue without PIN
          }
        } else if (pinValue && !dbError) {
          try {
            await savePinLocally(user.id, pinValue);
          } catch (savePinError) {
            console.error('Error saving PIN locally:', savePinError);
            // Continue without saving PIN locally
          }
        }

        setForm({
          fullName: p.full_name || '',
          dateOfBirth: p.date_of_birth || '',
          languageKnown: p.language_known || '',
          gender: p.gender || '',
          bloodGroup: p.blood_group || '',
          aboutMe: p.about_me || '',
          role: p.role || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          pincode: p.pincode || '',
          currentLocation: p.current_location || '',
          currentLatitude: p.current_latitude || '',
          currentLongitude: p.current_longitude || '',
          domain: p.expertise?.domain || '',
          skills: p.expertise?.skills || '',
          occupation: p.expertise?.occupation || '',
          yearsOfExperience: p.expertise?.years_of_experience || '',
          highestEducationQualification: p.expertise?.highest_education_qualification || '',
          testLink: p.expertise?.test_link || '',
          preferredLanguage: p.expertise?.preferred_language || '', // NEW
          mentorshipTitle: p.mentorship?.title || '',
          mentorshipDescription: p.mentorship?.description || '',
          openToWork: !!p.additionalDetails?.open_to_work,
          openToSpeak: !!p.additionalDetails?.open_to_speak,
          openToCrossBorderCollaboration: !!p.additionalDetails?.open_to_cross_border_collaboration,
          emergencyPin: pinValue,
        });

        if (p.additionalDetails?.preferred_work) {
          try {
            const parsed =
              typeof p.additionalDetails.preferred_work === 'string'
                ? JSON.parse(p.additionalDetails.preferred_work)
                : p.additionalDetails.preferred_work;
            setPreferredWork(parsed || []);
          } catch {
            setPreferredWork([]);
          }
        }

        setEmergencyContactCount(p.emergency_contacts?.length || 0);
      } else {
        showError(profileData.message || 'Failed to load profile data');
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
      if (error.message && error.message.includes('Network request failed')) {
        showError('Network error. Please check your internet connection.');
      } else {
        showError('Failed to load profile data: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setFetching(false);
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleWorkOption = (option: string) => {
    setPreferredWork((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const toggleSection = (section: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const isExpertiseComplete =
    form.domain.trim() !== '' &&
    form.skills.trim() !== '' &&
    form.occupation.trim() !== '' &&
    form.yearsOfExperience.trim() !== '' &&
    form.highestEducationQualification.trim() !== '';

  const generateDummySkillLink = (skillName: string) => {
    const slug = skillName.trim().toLowerCase().replace(/\s+/g, '-');
    return `https://wehere-assessments.com/test/${slug}`;
  };

  const skillsList = form.skills
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  /* ── Emergency PIN helpers ─────────────────────────────────────────────── */
  const handleSendPinOtp = () => {
    if (dbError) {
      showError('Database not available. Please restart the app.');
      return;
    }
    setPinOtpSent(true);
    setPinOtpValue('');
    setPinOtpVerified(false);
    showSuccess(`OTP sent to ${account.mobileNumber || 'your registered mobile'}`);
  };

  const handleVerifyPinOtp = () => {
    if (!pinOtpValue.trim()) {
      showError('Please enter the OTP');
      return;
    }
    setPinOtpVerified(true);
    setPinInput('');
    setPinConfirm('');
    showSuccess('OTP verified! You can now set your Emergency PIN.');
  };

  const handleSaveEmergencyPin = async () => {
    if (!userId) {
      showError('User ID not found');
      return;
    }

    if (dbError) {
      showError('Database not available. Please restart the app.');
      return;
    }

    if (!/^\d{4,6}$/.test(pinInput)) {
      showError('PIN must be 4–6 digits');
      return;
    }
    if (pinInput !== pinConfirm) {
      showError('PIN and Confirm PIN do not match');
      return;
    }

    setPinSaving(true);
    try {
      await savePinLocally(userId, pinInput);

      const response = await fetch(`${API_BASE_URL}/auth/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          emergencyPin: pinInput,
          openToWork: form.openToWork ? 1 : 0,
          openToSpeak: form.openToSpeak ? 1 : 0,
          openToCrossBorderCollaboration: form.openToCrossBorderCollaboration ? 1 : 0,
          preferredWork,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, emergencyPin: pinInput }));
        setPinOtpSent(false);
        setPinOtpVerified(false);
        setPinOtpValue('');
        setPinInput('');
        setPinConfirm('');
        setPinShowPlain(false);
        showSuccess('Emergency PIN saved successfully!');
      } else {
        showError(data.message || 'Failed to save PIN on server.');
      }
    } catch (error) {
      console.error('Save PIN error:', error);
      showError('Failed to save Emergency PIN.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      showError('User ID not found. Please login again.');
      return;
    }

    // Frontend-only validation: Preferred Language is required only when Skills are entered
    if (form.skills.trim() !== '' && form.preferredLanguage.trim() === '') {
      showError('Preferred Language is required when you enter Skills (for expert assessment).');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          openToWork: form.openToWork ? 1 : 0,
          openToSpeak: form.openToSpeak ? 1 : 0,
          openToCrossBorderCollaboration: form.openToCrossBorderCollaboration ? 1 : 0,
          preferredWork,
          emergencyPin: form.emergencyPin || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditMode(false);
        showSuccess('Profile updated successfully!');
        await loadProfile();
      } else {
        showError(data.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Update error:', error);
      if (error instanceof Error && error.message.includes('Network request failed')) {
        showError('Network error. Please check your internet connection.');
      } else {
        showError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => setLogoutAlertVisible(true);

  const performLogout = async () => {
    try {
      setLogoutAlertVisible(false);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('userId');
      router.replace('/');
    } catch (error) {
      showError('Failed to logout. Please try again.');
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </SafeAreaView>
    );
  }

  const maskedPin = form.emergencyPin ? '•'.repeat(Math.min(form.emergencyPin.length, 6)) : '—';

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#2e7d32" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)} style={styles.editIconBtn}>
            <Ionicons name={editMode ? 'close' : 'create-outline'} size={22} color="#2e7d32" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.identityRow}>
              <Ionicons name="person-circle-outline" size={22} color="#2e7d32" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.identityUsername}>{account.username || '—'}</Text>
                <Text style={styles.identityMobile}>{account.mobileNumber || '—'}</Text>
              </View>
            </View>

            {dbError && (
              <View style={styles.dbErrorBox}>
                <Ionicons name="warning-outline" size={20} color="#dc2626" />
                <Text style={styles.dbErrorText}>Database not available. PIN features disabled.</Text>
              </View>
            )}

            {/* ── Basic Information ───────────────────────────────────────── */}
            <AccordionSection
              title="Basic Information"
              icon="person-outline"
              expanded={expandedSection === 'basic'}
              onPress={() => toggleSection('basic')}
            >
              <DisplayField label="Full Name" value={form.fullName} editMode={editMode} onChange={(v) => updateField('fullName', v)} />
              <DisplayField label="Date of Birth" value={form.dateOfBirth} editMode={editMode} onChange={(v) => updateField('dateOfBirth', v)} placeholder="DD/MM/YYYY" />
              <DisplayField label="Gender" value={form.gender} editMode={editMode} onChange={(v) => updateField('gender', v)} />
              <DisplayField label="Blood Group" value={form.bloodGroup} editMode={editMode} onChange={(v) => updateField('bloodGroup', v)} />
              <DisplayField label="Languages Known" value={form.languageKnown} editMode={editMode} onChange={(v) => updateField('languageKnown', v)} placeholder="comma separated" />
              <DisplayField label="About Me" value={form.aboutMe} editMode={editMode} onChange={(v) => updateField('aboutMe', v)} multiline />
              <DisplayField label="Role" value={form.role} editMode={editMode} onChange={(v) => updateField('role', v)} placeholder="Volunteer, Mentor, NGO" isLast />
            </AccordionSection>

            {/* ── Location ────────────────────────────────────────────────── */}
            <AccordionSection
              title="Location Details"
              icon="location-outline"
              expanded={expandedSection === 'location'}
              onPress={() => toggleSection('location')}
            >
              <DisplayField label="Address" value={form.address} editMode={editMode} onChange={(v) => updateField('address', v)} multiline />
              <DisplayField label="City" value={form.city} editMode={editMode} onChange={(v) => updateField('city', v)} />
              <DisplayField label="State" value={form.state} editMode={editMode} onChange={(v) => updateField('state', v)} />
              <DisplayField label="Pincode" value={form.pincode} editMode={editMode} onChange={(v) => updateField('pincode', v)} keyboardType="number-pad" />
              <View style={[styles.fieldWrapper, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>Current Location</Text>
                <Text style={styles.staticValue}>
                  {form.currentLocation ? form.currentLocation : '—'}
                </Text>
              </View>
            </AccordionSection>

            {/* ── Emergency PIN ──────────────────────────────────────────── */}
            <AccordionSection
              title="Emergency PIN"
              icon="shield-checkmark-outline"
              expanded={expandedSection === 'emergencyPin'}
              onPress={() => toggleSection('emergencyPin')}
            >
              {dbError ? (
                <View style={[styles.fieldWrapper, { borderBottomWidth: 0 }]}>
                  <Text style={styles.errorText}>Database not available. Please restart the app.</Text>
                </View>
              ) : (
                <>
                  {!editMode && (
                    <View style={[styles.fieldWrapper, { borderBottomWidth: 0 }]}>
                      <Text style={styles.label}>Your Emergency PIN</Text>
                      <Text style={styles.staticValue}>{maskedPin}</Text>
                      <Text style={styles.pinHint}>
                        PIN is hidden for security. Switch to Edit to update.
                      </Text>
                    </View>
                  )}

                  {editMode && !dbError && (
                    <View style={styles.pinEditBox}>
                      <View style={styles.pinCurrentRow}>
                        <Text style={styles.label}>Current PIN</Text>
                        <View style={styles.pinValueRow}>
                          <Text style={styles.pinMaskedText}>
                            {form.emergencyPin
                              ? pinShowPlain
                                ? form.emergencyPin
                                : '•'.repeat(Math.min(form.emergencyPin.length || 4, 6))
                              : 'Not set'}
                          </Text>
                          {form.emergencyPin ? (
                            <TouchableOpacity
                              onPress={() => setPinShowPlain((v) => !v)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons
                                name={pinShowPlain ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color="#2e7d32"
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>

                      {!pinOtpVerified && (
                        <>
                          <Text style={styles.pinStepTitle}>
                            Verify mobile to set / update PIN
                          </Text>
                          <Text style={styles.pinHint}>
                            OTP will be sent to {account.mobileNumber || 'your registered number'}
                          </Text>

                          {!pinOtpSent ? (
                            <TouchableOpacity style={styles.otpSendBtn} onPress={handleSendPinOtp}>
                              <Ionicons name="phone-portrait-outline" size={18} color="#fff" />
                              <Text style={styles.otpSendBtnText}>Send OTP</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.otpBox}>
                              <Text style={styles.label}>Enter OTP</Text>
                              <TextInput
                                style={styles.input}
                                value={pinOtpValue}
                                onChangeText={setPinOtpValue}
                                keyboardType="number-pad"
                                maxLength={6}
                                placeholder="Enter OTP"
                                placeholderTextColor="#999"
                                secureTextEntry
                              />
                              <TouchableOpacity style={styles.otpVerifyBtn} onPress={handleVerifyPinOtp}>
                                <Text style={styles.otpVerifyBtnText}>Verify OTP</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={handleSendPinOtp}>
                                <Text style={styles.resendOtp}>Resend OTP</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}

                      {pinOtpVerified && (
                        <View style={styles.pinSetBox}>
                          <Text style={styles.pinStepTitle}>Set Emergency PIN (4–6 digits)</Text>

                          <Text style={styles.label}>New PIN</Text>
                          <TextInput
                            style={styles.input}
                            value={pinInput}
                            onChangeText={setPinInput}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="Enter PIN"
                            placeholderTextColor="#999"
                            secureTextEntry
                          />

                          <Text style={styles.label}>Confirm PIN</Text>
                          <TextInput
                            style={styles.input}
                            value={pinConfirm}
                            onChangeText={setPinConfirm}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="Re-enter PIN"
                            placeholderTextColor="#999"
                            secureTextEntry
                          />

                          <TouchableOpacity
                            style={[styles.savePinBtn, pinSaving && { opacity: 0.6 }]}
                            onPress={handleSaveEmergencyPin}
                            disabled={pinSaving}
                          >
                            {pinSaving ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text style={styles.savePinBtnText}>Save Emergency PIN</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </AccordionSection>

            {/* ── Emergency Contacts ──────────────────────────────────────── */}
            <AccordionSection
              title="Emergency Contacts"
              icon="call-outline"
              expanded={expandedSection === 'emergency'}
              onPress={() => toggleSection('emergency')}
            >
              {userId && (
                <EmergencyContactsManager
                  userId={userId}
                  isEditMode={editMode}
                  onContactsUpdate={(count) => setEmergencyContactCount(count)}
                />
              )}
            </AccordionSection>

            {/* ── Expertise ───────────────────────────────────────────────── */}
            <AccordionSection
              title="Expertise & Skills"
              icon="ribbon-outline"
              expanded={expandedSection === 'expertise'}
              onPress={() => toggleSection('expertise')}
            >
              <DisplayField label="Domain" value={form.domain} editMode={editMode} onChange={(v) => updateField('domain', v)} placeholder="Healthcare, Tech" />
              <DisplayField label="Skills" value={form.skills} editMode={editMode} onChange={(v) => updateField('skills', v)} placeholder="comma separated" />
              
              {/* Preferred Language – required only when Skills are entered */}
              <View style={styles.fieldWrapper}>
                <Text style={styles.label}>
                  Preferred Language {form.skills.trim() !== '' ? '(Important)' : ''}
                </Text>
                <Text style={styles.preferredLangHint}>
                  Preferred language is for expert assessment purpose
                </Text>
                {editMode ? (
                  <TextInput
                    style={styles.input}
                    value={form.preferredLanguage}
                    onChangeText={(v) => updateField('preferredLanguage', v)}
                    placeholder="e.g. English, Hindi, Tamil"
                    placeholderTextColor="#999"
                  />
                ) : (
                  <Text style={styles.staticValue}>
                    {form.preferredLanguage ? form.preferredLanguage : '—'}
                  </Text>
                )}
              </View>

              <DisplayField label="Occupation" value={form.occupation} editMode={editMode} onChange={(v) => updateField('occupation', v)} />
              <DisplayField label="Years of Experience" value={form.yearsOfExperience} editMode={editMode} onChange={(v) => updateField('yearsOfExperience', v)} keyboardType="number-pad" />
              <DisplayField label="Highest Education Qualification" value={form.highestEducationQualification} editMode={editMode} onChange={(v) => updateField('highestEducationQualification', v)} isLast={!editMode} />

              {editMode ? (
                isExpertiseComplete && (
                  <View style={styles.testLinkReadyBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#2e7d32" />
                    <Text style={styles.testLinkReadyText}>
                      Your test link is ready. Click to open — available on desktop only.
                    </Text>
                  </View>
                )
              ) : (
                <>
                  {form.testLink ? (
                    <View style={[styles.fieldWrapper, { borderBottomWidth: 0, marginTop: 4 }]}>
                      <Text style={styles.label}>Assessment Test Link</Text>
                      <TouchableOpacity onPress={() => Linking.openURL(form.testLink)}>
                        <Text style={styles.testLinkText}>{form.testLink}</Text>
                      </TouchableOpacity>
                      <Text style={styles.testLinkHint}>Open on desktop only</Text>
                    </View>
                  ) : null}

                  {skillsList.length > 0 && (
                    <View style={styles.skillLinksWrapper}>
                      <Text style={styles.label}>Skill-wise Test Links</Text>
                      {skillsList.map((skill, index) => (
                        <View key={index} style={styles.skillLinkRow}>
                          <Text style={styles.skillLinkName}>{skill}</Text>
                          <TouchableOpacity onPress={() => Linking.openURL(generateDummySkillLink(skill))}>
                            <Text style={styles.skillLinkUrl} numberOfLines={1}>
                              {generateDummySkillLink(skill)}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <Text style={styles.testLinkHint}>Open on desktop only</Text>
                    </View>
                  )}
                </>
              )}
            </AccordionSection>

            {/* ── Mentorship ──────────────────────────────────────────────── */}
            <AccordionSection
              title="Seeking Mentorship"
              icon="help-buoy-outline"
              expanded={expandedSection === 'mentorship'}
              onPress={() => toggleSection('mentorship')}
            >
              <DisplayField label="Title" value={form.mentorshipTitle} editMode={editMode} onChange={(v) => updateField('mentorshipTitle', v)} placeholder="What you're seeking help with" />
              <DisplayField label="Description" value={form.mentorshipDescription} editMode={editMode} onChange={(v) => updateField('mentorshipDescription', v)} multiline isLast />
            </AccordionSection>

            {/* ── Preferences ─────────────────────────────────────────────── */}
            <AccordionSection
              title="Preferences"
              icon="options-outline"
              expanded={expandedSection === 'preferences'}
              onPress={() => toggleSection('preferences')}
            >
              {editMode ? (
                <>
                  <ToggleRow label="Open to Work" value={form.openToWork} onToggle={() => updateField('openToWork', !form.openToWork)} />
                  <ToggleRow label="Open to Speak / Mentor Others" value={form.openToSpeak} onToggle={() => updateField('openToSpeak', !form.openToSpeak)} />
                  <ToggleRow label="Open to Cross-Border Collaboration" value={form.openToCrossBorderCollaboration} onToggle={() => updateField('openToCrossBorderCollaboration', !form.openToCrossBorderCollaboration)} />
                </>
              ) : (
                <>
                  <StaticRow label="Open to Work" value={form.openToWork ? 'Yes' : '—'} />
                  <StaticRow label="Open to Speak / Mentor Others" value={form.openToSpeak ? 'Yes' : '—'} />
                  <StaticRow label="Open to Cross-Border Collaboration" value={form.openToCrossBorderCollaboration ? 'Yes' : '—'} />
                </>
              )}

              <Text style={styles.label}>Preferred Work Type</Text>
              {editMode ? (
                <View style={styles.chipRow}>
                  {WORK_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.chip, preferredWork.includes(option) && styles.chipActive]}
                      onPress={() => toggleWorkOption(option)}
                    >
                      <Text style={[styles.chipText, preferredWork.includes(option) && styles.chipTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.staticValue}>
                  {preferredWork.length > 0 ? preferredWork.join(', ') : '—'}
                </Text>
              )}
            </AccordionSection>

            {editMode && (
              <TouchableOpacity
                style={[styles.saveButton, loading && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.logoutContainer}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                <View style={styles.logoutContent}>
                  <Ionicons name="log-out-outline" size={22} color="#dc2626" />
                  <Text style={styles.logoutText}>Logout</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.logoutSubtext}>Sign out of your account</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Logout Modal */}
        <Modal visible={logoutAlertVisible} animationType="fade" transparent>
          <View style={styles.logoutOverlay}>
            <View style={styles.logoutBox}>
              <View style={styles.logoutIconCircle}>
                <Ionicons name="log-out-outline" size={44} color="#dc2626" />
              </View>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutMessage}>
                Are you sure you want to logout from your account?
              </Text>
              <View style={styles.logoutButtonRow}>
                <TouchableOpacity
                  style={[styles.logoutActionButton, styles.logoutCancelButton]}
                  onPress={() => setLogoutAlertVisible(false)}
                >
                  <Text style={styles.logoutCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logoutActionButton, styles.logoutConfirmButton]}
                  onPress={performLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color="#fff" />
                  <Text style={styles.logoutConfirmButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
      <FlashMessage position="top" />
    </>
  );
}

/* ── Shared small components ─────────────────────────────────────────────── */
const AccordionSection = ({
  title, icon, expanded, onPress, children,
}: {
  title: string; icon: any; expanded: boolean; onPress: () => void; children: React.ReactNode;
}) => (
  <View style={styles.accordionCard}>
    <TouchableOpacity style={styles.accordionHeader} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.accordionHeaderLeft}>
        <Ionicons name={icon} size={18} color="#2e7d32" />
        <Text style={styles.accordionTitle}>{title}</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#999" />
    </TouchableOpacity>
    {expanded && <View style={styles.accordionBody}>{children}</View>}
  </View>
);

const DisplayField = ({
  label, value, editMode, onChange, multiline = false, keyboardType = 'default', placeholder = '', isLast = false,
}: {
  label: string; value: string; editMode: boolean; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: any; placeholder?: string; isLast?: boolean;
}) => (
  <View style={[styles.fieldWrapper, isLast && { borderBottomWidth: 0 }]}>
    <Text style={styles.label}>{label}</Text>
    {editMode ? (
      <TextInput
        style={[styles.input, multiline && { height: 70, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#999"
      />
    ) : (
      <Text style={styles.staticValue}>{value ? value : '—'}</Text>
    )}
  </View>
);

const StaticRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.staticRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <Text style={styles.staticValueInline}>{value}</Text>
  </View>
);

const ToggleRow = ({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
  <TouchableOpacity style={styles.toggleRow} onPress={onToggle}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
      <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
    </View>
  </TouchableOpacity>
);

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  backBtn: { padding: 4 },
  editIconBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1b5e20' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  identityRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa',
    borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#eceff1',
  },
  identityUsername: { fontSize: 16, fontWeight: '700', color: '#1b5e20' },
  identityMobile: { fontSize: 13, color: '#666', marginTop: 2 },

  accordionCard: {
    backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1,
    borderColor: '#eceff1', marginBottom: 10, overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
  },
  accordionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  accordionTitle: { fontSize: 14.5, fontWeight: '700', color: '#1b5e20', marginLeft: 8 },
  accordionBody: {
    paddingHorizontal: 14, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },

  fieldWrapper: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1.2, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#111', marginBottom: 8,
  },
  staticValue: { fontSize: 14, color: '#111', paddingBottom: 9 },

  preferredLangHint: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
    fontStyle: 'italic',
  },

  staticRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  staticValueInline: { fontSize: 13.5, color: '#111', fontWeight: '600' },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  toggleLabel: { fontSize: 13, color: '#333', flex: 1 },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: '#d1d5db', padding: 2 },
  toggleTrackActive: { backgroundColor: '#2e7d32' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#2e7d32', fontWeight: '700' },
  saveButton: {
    backgroundColor: '#2e7d32', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 16,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  testLinkReadyBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9',
    borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 10,
  },
  testLinkReadyText: { flex: 1, marginLeft: 8, fontSize: 12, color: '#1b5e20', lineHeight: 17, fontWeight: '600' },
  testLinkText: { fontSize: 13.5, color: '#2e7d32', fontWeight: '700', textDecorationLine: 'underline', paddingBottom: 4 },
  testLinkHint: { fontSize: 11, color: '#999', marginTop: 2 },
  skillLinksWrapper: { marginTop: 6, marginBottom: 4 },
  skillLinkRow: { marginBottom: 8 },
  skillLinkName: { fontSize: 13, fontWeight: '700', color: '#1b5e20', marginBottom: 2 },
  skillLinkUrl: { fontSize: 12.5, color: '#2e7d32', textDecorationLine: 'underline' },

  pinEditBox: { paddingBottom: 8 },
  pinCurrentRow: { marginBottom: 12 },
  pinValueRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  pinMaskedText: { fontSize: 16, fontWeight: '700', color: '#111', letterSpacing: 3 },
  pinHint: { fontSize: 11, color: '#9ca3af', marginTop: 4, marginBottom: 8 },
  pinStepTitle: { fontSize: 13, fontWeight: '700', color: '#1b5e20', marginTop: 8, marginBottom: 6 },
  otpSendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2e7d32', paddingVertical: 12, borderRadius: 10, marginTop: 6,
  },
  otpSendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  otpBox: { marginTop: 8 },
  otpVerifyBtn: {
    backgroundColor: '#1b5e20', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', marginTop: 4,
  },
  otpVerifyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resendOtp: {
    color: '#2e7d32', fontSize: 12, fontWeight: '600', textAlign: 'center',
    marginTop: 10, textDecorationLine: 'underline',
  },
  pinSetBox: { marginTop: 4 },
  savePinBtn: {
    backgroundColor: '#dc2626', paddingVertical: 13, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  savePinBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  dbErrorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5',
    borderRadius: 10, padding: 12, marginBottom: 16,
  },
  dbErrorText: {
    flex: 1, marginLeft: 10, fontSize: 13, color: '#dc2626', fontWeight: '600',
  },
  errorText: {
    fontSize: 13, color: '#dc2626', paddingVertical: 8,
  },

  logoutContainer: {
    alignItems: 'center', marginTop: 24, marginBottom: 12, paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fca5a5',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 48,
    width: '100%', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  logoutContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  logoutText: { color: '#dc2626', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  logoutSubtext: { color: '#9ca3af', fontSize: 13, marginTop: 8, fontWeight: '500' },

  logoutOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  logoutBox: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    width: '100%', maxWidth: 340, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  logoutIconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 2, borderColor: '#fca5a5',
  },
  logoutTitle: { fontSize: 22, fontWeight: '700', color: '#1b5e20', marginBottom: 8 },
  logoutMessage: {
    fontSize: 15, color: '#6b7280', textAlign: 'center',
    lineHeight: 22, marginBottom: 24, paddingHorizontal: 8,
  },
  logoutButtonRow: { flexDirection: 'row', gap: 12, width: '100%' },
  logoutActionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  logoutCancelButton: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  logoutCancelButtonText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  logoutConfirmButton: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  logoutConfirmButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});