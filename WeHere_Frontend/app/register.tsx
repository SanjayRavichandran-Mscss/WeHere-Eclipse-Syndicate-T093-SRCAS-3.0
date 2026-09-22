import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE_URL = ' http://10.100.67.248:5000/api/auth'; // replace with your machine IP for physical device/emulator

const COUNTRY_CODES = [
  { name: 'India', code: '+91', flag: '🇮🇳', length: 10 },
  { name: 'United States', code: '+1', flag: '🇺🇸', length: 10 },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', length: 10 },
  { name: 'Australia', code: '+61', flag: '🇦🇺', length: 9 },
  { name: 'Canada', code: '+1', flag: '🇨🇦', length: 10 },
  { name: 'UAE', code: '+971', flag: '🇦🇪', length: 9 },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', length: 8 },
  { name: 'Germany', code: '+49', flag: '🇩🇪', length: 10 },
  { name: 'France', code: '+33', flag: '🇫🇷', length: 9 },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰', length: 9 },
];

const getPasswordStrength = (password: string) => {
  if (!password) return { label: '', score: 0, color: '#e5e7eb' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score: 1, color: '#ef4444' };
  if (score <= 3) return { label: 'Medium', score: 2, color: '#f59e0b' };
  return { label: 'Strong', score: 3, color: '#2e7d32' };
};

const generateSuggestedPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const nums = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + nums + symbols;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += nums[Math.floor(Math.random() * nums.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 4; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
};

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const [checks, setChecks] = useState({
    camera: false,
    directory: false,
    voice: false,
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = checks.camera && checks.directory && checks.voice;
  const otpValue = otp.join('');
  const strength = getPasswordStrength(formData.password);

  const handleOtpChange = (value: string, index: number) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSendOTP = () => {
    if (!formData.username.trim()) {
      Alert.alert('Missing Info', 'Please enter your username.');
      return;
    }
    if (formData.mobileNumber.length !== selectedCountry.length) {
      Alert.alert('Invalid Number', `Please enter a valid ${selectedCountry.length}-digit mobile number.`);
      return;
    }
    setLoading(true);
    // Dummy OTP - no actual SMS sent for prototype
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
    }, 800);
  };

  const handleVerifyAndContinue = () => {
    if (otpValue.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }
    // Dummy verification - any 6 digits accepted
    setStep(2);
  };

  const handleUseSuggestedPassword = () => {
    const suggested = generateSuggestedPassword();
    setFormData((prev) => ({ ...prev, password: suggested, confirmPassword: suggested }));
    setShowPassword(true);
    setShowConfirmPassword(true);
  };

  const handleRegister = async () => {
    if (!formData.password || !formData.confirmPassword) {
      Alert.alert('Missing Info', 'Please enter password and confirm password.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (!allChecked) {
      Alert.alert('Permissions Required', 'Please accept all permissions to continue.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          mobileNumber: `${selectedCountry.code}${formData.mobileNumber}`,
          password: formData.password,
        }),
      });
      const data = await response.json();
      setLoading(false);

      if (data.success) {
        Alert.alert('Success', 'Your account has been created successfully!', [
          { text: 'Get Started', onPress: () => router.replace('/(tabs)/home') },
        ]);
      } else {
        Alert.alert('Registration Failed', data.message || 'Something went wrong.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Could not connect to server. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (step === 1 ? router.back() : setStep(1))}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#2e7d32" />
            </TouchableOpacity>
            <View style={styles.stepBadge}>
              <Text style={styles.stepIndicator}>Step {step} of 2</Text>
            </View>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join weHere and become part of a network where people help people —
            connecting you to the right support, mentor, or opportunity, exactly when you need it.
          </Text>

          {/* STEP 1: Username, Mobile, OTP */}
          {step === 1 && (
            <View style={styles.formSection}>
              <InputLabel label="Username" />
              <TextInput
                style={styles.input}
                placeholder="sanjay_r"
                placeholderTextColor="#999"
                autoCapitalize="none"
                editable={!otpSent}
                value={formData.username}
                onChangeText={(v) => updateField('username', v)}
              />

              <InputLabel label="Phone Number" />
              <View style={[styles.phoneInputWrapper, otpSent && styles.disabledInput]}>
                <TouchableOpacity
                  style={styles.countryBox}
                  onPress={() => !otpSent && setCountryPickerVisible(true)}
                  disabled={otpSent}
                >
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                  <Text style={styles.prefix}>{selectedCountry.code}</Text>
                  {!otpSent && <Ionicons name="chevron-down" size={14} color="#666" style={{ marginLeft: 2 }} />}
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9876543210"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={selectedCountry.length}
                  editable={!otpSent}
                  value={formData.mobileNumber}
                  onChangeText={(v) => updateField('mobileNumber', v)}
                />
              </View>

              {otpSent && (
                <View style={styles.otpAckBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                  <Text style={styles.otpAckText}>
                    A 6-digit code has been sent to {selectedCountry.code} {formData.mobileNumber}
                  </Text>
                </View>
              )}

              {otpSent && (
                <View style={{ marginTop: 16 }}>
                  <InputLabel label="Enter 6-Digit OTP" />
                  <View style={styles.otpRow}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => (otpRefs.current[index] = ref)}
                        style={styles.otpBox}
                        keyboardType="number-pad"
                        maxLength={1}
                        value={digit}
                        onChangeText={(v) => handleOtpChange(v, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      />
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(['', '', '', '', '', '']); }} style={{ marginTop: 10 }}>
                    <Text style={styles.resendText}>Change number or Resend OTP?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* STEP 2: Password + Permissions */}
          {step === 2 && (
            <View style={styles.formSection}>
              <View style={styles.labelRow}>
                <InputLabel label="Password" />
                <TouchableOpacity onPress={handleUseSuggestedPassword}>
                  <Text style={styles.suggestText}>Suggest Password</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={formData.password}
                  onChangeText={(v) => updateField('password', v)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#666" />
                </TouchableOpacity>
              </View>

              {formData.password.length > 0 && (
                <View style={styles.strengthWrapper}>
                  <View style={styles.strengthBarTrack}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        { width: `${(strength.score / 3) * 100}%`, backgroundColor: strength.color },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}

              <InputLabel label="Confirm Password" />
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={formData.confirmPassword}
                  onChangeText={(v) => updateField('confirmPassword', v)}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color="#666" />
                </TouchableOpacity>
              </View>
              {formData.confirmPassword.length > 0 && (
                <Text
                  style={[
                    styles.matchText,
                    { color: formData.password === formData.confirmPassword ? '#2e7d32' : '#ef4444' },
                  ]}
                >
                  {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>Permissions & Acknowledgement</Text>

              <CheckboxItem
                checked={checks.camera}
                onPress={() => toggleCheck('camera')}
                title="Camera Access"
                description="Allow weHere to access your camera to capture and share visual proof during emergency situations (e.g. SOS incidents, on-ground assistance requests)."
              />

              <CheckboxItem
                checked={checks.directory}
                onPress={() => toggleCheck('directory')}
                title="Dedicated App Directory"
                description="Allow weHere to create a private, restricted folder on your device. Our Agentic AI Assistant will operate only within this folder and will not access any other files or data on your phone."
              />

              <CheckboxItem
                checked={checks.voice}
                onPress={() => toggleCheck('voice')}
                title="Microphone / Voice Recording Access"
                description="Allow weHere to record and transmit voice during emergencies, enabling responders and nearby volunteers to understand your situation quickly and accurately."
              />
            </View>
          )}

          {/* Navigation Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loading || (step === 2 && !allChecked)) && { opacity: 0.6 },
            ]}
            onPress={() => {
              if (step === 1) {
                if (!otpSent) handleSendOTP();
                else handleVerifyAndContinue();
              } else {
                handleRegister();
              }
            }}
            disabled={loading || (step === 2 && !allChecked)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {step === 1 ? (otpSent ? 'Verify & Continue' : 'Send OTP') : 'Register'}
              </Text>
            )}
          </TouchableOpacity>

          {step === 1 && !otpSent && (
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={styles.footerText}>
                Already have an account? <Text style={styles.link}>Login</Text>
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal visible={countryPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryRow}
                  onPress={() => {
                    setSelectedCountry(item);
                    updateField('mobileNumber', '');
                    setCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const InputLabel = ({ label }: { label: string }) => <Text style={styles.label}>{label}</Text>;

const CheckboxItem = ({
  checked,
  onPress,
  title,
  description,
}: {
  checked: boolean;
  onPress: () => void;
  title: string;
  description: string;
}) => (
  <TouchableOpacity style={styles.checkboxCard} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={styles.checkboxTitle}>{title}</Text>
      <Text style={styles.checkboxDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 6, marginLeft: -6 },
  stepBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  stepIndicator: { color: '#2e7d32', fontWeight: '700', fontSize: 11.5 },
  title: { fontSize: 24, fontWeight: '700', color: '#1b5e20', marginBottom: 6 },
  subtitle: { fontSize: 13.5, color: '#666', marginBottom: 20, lineHeight: 19 },
  formSection: { marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggestText: { fontSize: 12, fontWeight: '700', color: '#2e7d32', marginTop: 12 },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14.5,
    color: '#111',
  },
  disabledInput: { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' },
  phoneInputWrapper: {
    flexDirection: 'row',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  countryFlag: { fontSize: 16, marginRight: 4 },
  prefix: { fontWeight: '700', color: '#374151', fontSize: 14 },
  phoneInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14.5, color: '#111' },
  otpAckBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  otpAckText: { flex: 1, marginLeft: 8, fontSize: 12.5, color: '#1b5e20', lineHeight: 17 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  otpBox: {
    width: 40,
    height: 46,
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#2e7d32',
    borderRadius: 8,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2e7d32',
  },
  resendText: { textAlign: 'center', color: '#2e7d32', fontSize: 13, fontWeight: '500' },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  passwordInput: { flex: 1, paddingVertical: 10, fontSize: 14.5, color: '#111' },
  eyeIcon: { padding: 4 },
  strengthWrapper: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  strengthBarTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  strengthBarFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontSize: 11.5, fontWeight: '700', width: 55 },
  matchText: { fontSize: 11.5, fontWeight: '600', marginTop: 6 },
  checkboxCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2e7d32',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: '#2e7d32' },
  checkboxTitle: { fontSize: 13.5, fontWeight: '700', color: '#1b5e20', marginBottom: 3 },
  checkboxDescription: { fontSize: 12, color: '#666', lineHeight: 17 },
  primaryButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footerText: { textAlign: 'center', marginTop: 20, color: '#666', fontSize: 14 },
  link: { color: '#2e7d32', fontWeight: '700', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1b5e20' },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryName: { flex: 1, marginLeft: 10, fontSize: 14, color: '#111' },
  countryCode: { fontSize: 14, fontWeight: '600', color: '#666' },
});