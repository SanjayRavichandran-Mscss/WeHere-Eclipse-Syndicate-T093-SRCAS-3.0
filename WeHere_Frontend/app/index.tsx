import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import FlashMessage, { showMessage } from 'react-native-flash-message';

const API_BASE_URL = 'http://10.100.67.248:5000/api/auth';

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

export default function LoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);

  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (message: string) => {
    showMessage({
      message: 'Error',
      description: message,
      type: 'danger',
      icon: 'danger',
      duration: 3000,
    });
  };

  const getAndProcessCurrentLocation = async (): Promise<{
    latitude: number;
    longitude: number;
    currentLocation: string;
  } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LOCATION] Permission not granted');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = position.coords;
      let fullAddress = 'Location detected';

      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          const addressParts = [
            place.name || place.streetNumber,
            place.street,
            place.district || place.subregion,
            place.city || place.locality,
            place.region,
            place.country,
            place.postalCode ? `(${place.postalCode})` : '',
          ].filter(Boolean);

          fullAddress = addressParts.join(', ');

          if (fullAddress === 'Location detected' || fullAddress.trim().length < 5) {
            fullAddress =
              `${place.city || ''}, ${place.region || ''}`.trim() ||
              `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        }
      } catch (geoError) {
        console.log('[LOCATION] Reverse geocode error:', geoError);
        fullAddress = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      return { latitude, longitude, currentLocation: fullAddress };
    } catch (error) {
      console.log('[LOCATION] Fetch failed:', error);
      return null;
    }
  };

  const sendCurrentLocation = async (userId: number) => {
    try {
      const locationData = await getAndProcessCurrentLocation();

      if (!locationData) {
        console.log('[LOCATION] No location data available');
        return;
      }

      const { latitude, longitude, currentLocation } = locationData;

      const response = await fetch(`${API_BASE_URL}/location/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLocation,
          currentLatitude: latitude.toString(),
          currentLongitude: longitude.toString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`[LOCATION] Sent successfully for user ${userId}: ${currentLocation}`);
      } else {
        console.log('[LOCATION] Failed to send location:', result.message);
      }
    } catch (error) {
      console.log('[LOCATION] Update error:', error);
      if (error instanceof Error) {
        console.log('[LOCATION] Error message:', error.message);
        console.log('[LOCATION] Error name:', error.name);
        console.log('[LOCATION] Error stack:', error.stack);
      }
    }
  };

  const startLocationTracking = async (userId: number) => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('[LOCATION] Permission not granted for tracking');
      return;
    }

    await sendCurrentLocation(userId);

    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    locationIntervalRef.current = setInterval(() => {
      sendCurrentLocation(userId);
    }, 60000);
  };

  const handleSubmit = async () => {
    const cleaned = mobile.trim().replace(/\D/g, '');

    if (cleaned.length !== selectedCountry.length) {
      showError(`Please enter a valid ${selectedCountry.length}-digit mobile number.`);
      return;
    }
    if (!password) {
      showError('Please enter your password to continue.');
      return;
    }

    const loginUrl = `${API_BASE_URL}/login`;
    console.log('[LOGIN] Request URL:', loginUrl);
    console.log('[LOGIN] Payload:', {
      mobileNumber: `${selectedCountry.code}${cleaned}`,
      password: '***',
    });

    setLoading(true);
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobileNumber: `${selectedCountry.code}${cleaned}`,
          password: password,
        }),
      });

      console.log('[LOGIN] Response status:', response.status);
      console.log('[LOGIN] Response ok:', response.ok);
      console.log(
        '[LOGIN] Response content-type:',
        response.headers.get('content-type')
      );

      const responseText = await response.text();
      console.log('[LOGIN] Raw response body:', responseText);

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('[LOGIN] JSON parse error:', parseError);
        console.log('[LOGIN] Non-JSON body (first 300 chars):', responseText.slice(0, 300));
        setLoading(false);
        showError('Server returned an invalid response. Check console for details.');
        return;
      }

      setLoading(false);
      console.log('[LOGIN] Parsed response:', data);

      if (data.success) {
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        await startLocationTracking(data.user.id);

        // IMMEDIATE REDIRECT - NO ALERT MESSAGE
        router.replace('/(tabs)/home');
      } else {
        console.log('[LOGIN] Failed:', data.message);
        showError(data.message || 'Invalid mobile number or password.');
      }
    } catch (error) {
      setLoading(false);

      console.log('========== LOGIN CONNECTION ERROR ==========');
      console.log('[LOGIN] Error object:', error);

      if (error instanceof Error) {
        console.log('[LOGIN] Error name:', error.name);
        console.log('[LOGIN] Error message:', error.message);
        console.log('[LOGIN] Error stack:', error.stack);
      } else {
        console.log('[LOGIN] Non-Error throw:', JSON.stringify(error));
      }

      console.log('[LOGIN] API_BASE_URL used:', API_BASE_URL);
      console.log('[LOGIN] Full login URL:', loginUrl);
      console.log('============================================');

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Could not connect to server. Please try again.';

      showError(errorMessage);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Everything scrolls together – text + image + form */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Short & crisp single-line text ABOVE the image */}
          {/* <Text style={styles.tagline} numberOfLines={1}>
            Connecting the right peopleright now...
          </Text> */}

          {/* Image (scrolls with the content) */}
          <Image
            source={require('../assets/images/loginimg.png')}
            style={styles.topImage}
            resizeMode="contain"
          />

          {/* Form fields */}
          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputWrapper}>
            <TouchableOpacity
              style={styles.countryBox}
              onPress={() => setCountryPickerVisible(true)}
              disabled={loading}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={styles.prefix}>{selectedCountry.code}</Text>
              <Ionicons name="chevron-down" size={14} color="#666" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={selectedCountry.length}
              value={mobile}
              onChangeText={setMobile}
              editable={!loading}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={19}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Login</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('./register')} disabled={loading}>
            <Text style={styles.registerText}>
              New to weHere? <Text style={styles.registerLink}>Register</Text>
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            By continuing, you agree to our Terms of Service & Privacy Policy
          </Text>
        </ScrollView>

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
                      setMobile('');
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
      </KeyboardAvoidingView>
      
      <FlashMessage position="top" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 40,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1b5e20',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  topImage: {
    width: '100%',
    height: 220,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  countryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  countryFlag: {
    fontSize: 17,
    marginRight: 4,
  },
  prefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#111111',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: '#111111',
  },
  eyeIcon: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#1b5e20',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#2e7d32',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerText: {
    fontSize: 15,
    color: '#555555',
    marginBottom: 24,
    textAlign: 'center',
  },
  registerLink: {
    color: '#1b5e20',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  note: {
    fontSize: 13,
    color: '#777777',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1b5e20',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryName: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111',
  },
  countryCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});