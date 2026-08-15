import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Platform, StatusBar, TextInput, Keyboard, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/header';

// ─────────────────────────────────────────────────────────────
const BACKEND_BASE_URL = 'http://192.168.8.60:5000/api'; // ← change IP
const GEOAPIFY_API_KEY = '58de3303bb5a44f79d8993a8e40b9a10';
const LOCATIONIQ_API_KEY = 'pk.8209fb7c261757f8ebd31e802376031f';

const SEARCH_RADIUS_METERS = 5000;
const SEARCH_RADIUS_KM = 5;
const GEOAPIFY_RESULT_LIMIT = 200;
const REFETCH_DISTANCE_METERS = 300;
const REFETCH_MIN_INTERVAL_MS = 45000;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const deg2rad = (deg: number) => deg * (Math.PI / 180);
const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const m = distanceMeters(lat1, lon1, lat2, lon2);
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
};

const getMarkerColor = (type: string) => {
  switch (type) {
    case 'User':
    case 'Volunteer': return '#DC2626';          // RED for users
    case 'Hospital':
    case 'PHC': return '#2563EB';
    case 'Clinic': return '#0891B2';
    case 'Pharmacy': return '#9333EA';
    case 'Ambulance': return '#B91C1C';
    case 'Police': return '#4338CA';
    case 'FireStation': return '#EA580C';
    case 'Bank': return '#65A30D';
    case 'ATM': return '#4D7C0F';
    case 'BusStation': return '#EA8A00';
    case 'RailwayStation': return '#795548';
    case 'Airport': return '#475569';
    case 'PetrolPump': return '#DB2777';
    case 'College': return '#3949AB';
    default: return '#2D5A27';
  }
};

const getIconName = (type: string) => {
  switch (type) {
    case 'User':
    case 'Volunteer': return 'user-circle';
    case 'Hospital':
    case 'PHC': return 'hospital-alt';
    case 'Clinic': return 'clinic-medical';
    case 'Pharmacy': return 'pills';
    case 'Ambulance': return 'ambulance';
    case 'Police': return 'shield-alt';
    case 'FireStation': return 'fire-extinguisher';
    case 'Bank': return 'university';
    case 'ATM': return 'money-check-alt';
    case 'BusStation': return 'bus';
    case 'RailwayStation': return 'train';
    case 'Airport': return 'plane';
    case 'PetrolPump': return 'gas-pump';
    case 'College': return 'graduation-cap';
    default: return 'map-marker-alt';
  }
};

const geoapifyCategoryToType = (categories: string[], name: string) => {
  const cats = categories || [];
  const has = (p: string) => cats.some((c) => c.startsWith(p));
  const n = (name || '').toLowerCase();
  if (has('healthcare.hospital')) return n.includes('phc') || n.includes('primary') ? 'PHC' : 'Hospital';
  if (has('healthcare.clinic_or_praxis')) return 'Clinic';
  if (has('healthcare.pharmacy')) return 'Pharmacy';
  if (has('service.ambulance_station') || has('emergency.ambulance_station')) return 'Ambulance';
  if (has('service.police')) return 'Police';
  if (has('service.fire_station')) return 'FireStation';
  if (has('service.financial.bank')) return 'Bank';
  if (has('service.financial.atm')) return 'ATM';
  if (has('public_transport.bus')) return 'BusStation';
  if (has('public_transport.train') || has('railway.train')) return 'RailwayStation';
  if (has('airport')) return 'Airport';
  if (has('service.vehicle.fuel')) return 'PetrolPump';
  if (has('education.college') || has('education.university') || has('education.school')) return 'College';
  return 'Hospital';
};

const CustomMarker = ({ type, color }: { type: string; color: string }) => (
  <View style={styles.customMarker}>
    <View style={[styles.markerIconBg, { backgroundColor: color }]}>
      <FontAwesome5 name={getIconName(type) as any} size={15} color="#fff" />
    </View>
    <View style={[styles.markerTail, { borderTopColor: color }]} />
  </View>
);

// ─────────────────────────────────────────────────────────────
export default function Support() {
  const [bottomMode, setBottomMode] = useState<'nearbyUsers' | 'resources'>('nearbyUsers');
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [resources, setResources] = useState<any[]>([]);          // only places
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);      // only users
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [myRequests, setMyRequests] = useState<Record<string, any>>({});

  // Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['34%', '65%', '90%'], []);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastFetchLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const lastFetchTime = useRef(0);
  const isMounted = useRef(true);

  // ── Load userId
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user');
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.id) setCurrentUserId(Number(u.id));
        }
      } catch {}
    })();
  }, []);

  // ── My sent requests (Pending status)
  const fetchMySentRequests = useCallback(async (userId: number) => {
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/support/my-requests/${userId}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const map: Record<string, any> = {};
        json.data.forEach((r: any) => { map[String(r.volunteer_id)] = r; });
        setMyRequests(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentUserId) fetchMySentRequests(currentUserId);
  }, [currentUserId, fetchMySentRequests]);

  // ── Nearby Users (SQL only)
  const fetchNearbyUsers = useCallback(async (userId: number, lat?: number, lng?: number) => {
    if (!userId) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/support/nearby-users/${userId}`);
      const json = await res.json();
      console.log('[nearby-users]', json.count);

      if (!json.success) { setNearbyUsers([]); return; }

      const mapped = (json.data || [])
        .filter((u: any) => u.latitude != null && u.longitude != null)
        .map((u: any) => {
          const latNum = Number(u.latitude);
          const lngNum = Number(u.longitude);
          let distanceKm = 999;
          let distanceStr = '—';
          if (lat != null && lng != null) {
            distanceKm = distanceMeters(lat, lng, latNum, lngNum) / 1000;
            distanceStr = calculateDistance(lat, lng, latNum, lngNum);
          }
          return {
            id: String(u.id),
            type: 'User',
            name: u.fullName || u.username || 'User',
            bloodGroup: u.bloodGroup || '—',
            role: u.role || 'User',
            latitude: latNum,
            longitude: lngNum,
            currentLocation: u.location || 'Location shared',
            phone: u.mobileNumber,
            distanceKm,
            distance: distanceStr,
          };
        })
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

      if (isMounted.current) setNearbyUsers(mapped);
    } catch (e) {
      console.error(e);
      if (isMounted.current) setNearbyUsers([]);
    } finally {
      if (isMounted.current) setUsersLoading(false);
    }
  }, []);

 // ── Geoapify places (main source)
const fetchGeoapifyPlaces = useCallback(async (lat: number, lng: number) => {
  const categories = [
    'healthcare.hospital',
    'healthcare.clinic_or_praxis',
    'healthcare.pharmacy',
    'service.ambulance_station',
    'emergency.ambulance_station',
    'service.police',
    'service.fire_station',
    'service.financial.bank',
    'service.financial.atm',
    'public_transport.bus',
    'public_transport.train',
    'railway.train',
    'airport',
    'service.vehicle.fuel',
    'education.college',
    'education.university',
    'education.school',
  ].join(',');

  const url =
    `https://api.geoapify.com/v2/places?categories=${categories}` +
    `&filter=circle:${lng},${lat},${SEARCH_RADIUS_METERS}` +
    `&bias=proximity:${lng},${lat}` +
    `&limit=${GEOAPIFY_RESULT_LIMIT}` +
    `&apiKey=${GEOAPIFY_API_KEY}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    const json = await res.json();

    console.log('[Geoapify] features →', json?.features?.length ?? 0);

    if (!res.ok || json.error) {
      console.warn('[Geoapify] error →', json);
      return [];
    }

    return (json.features || [])
      .filter((f: any) => f?.geometry?.coordinates?.length === 2)
      .map((f: any) => {
        const props = f.properties || {};
        const [lonC, latC] = f.geometry.coordinates;
        const type = geoapifyCategoryToType(props.categories || [], props.name);

        return {
          id: props.place_id || `geo-${type}-${latC}-${lonC}`,
          type,
          name: props.name || props.address_line1 || type,
          latitude: latC,
          longitude: lonC,
          distance: calculateDistance(lat, lng, latC, lonC),
          distanceKm: props.distance != null
            ? Number(props.distance) / 1000
            : distanceMeters(lat, lng, latC, lonC) / 1000,
          address: props.formatted || props.address_line2 || 'Address unavailable',
          source: 'geoapify',
        };
      });
  } catch (e: any) {
    clearTimeout(timeoutId);
    console.error('[Geoapify] failed →', e?.message || e);
    return [];
  }
}, []);

// ── LocationIQ nearby (fallback / extra coverage)
const fetchLocationIQNearby = useCallback(async (lat: number, lng: number) => {
  const tagMap: Record<string, string> = {
    hospital: 'Hospital',
    clinic: 'Clinic',
    pharmacy: 'Pharmacy',
    bank: 'Bank',
    atm: 'ATM',
    police: 'Police',
    fire_station: 'FireStation',
    bus_station: 'BusStation',
    train_station: 'RailwayStation',
    airport: 'Airport',
    fuel: 'PetrolPump',
    college: 'College',
  };

  const tags = Object.keys(tagMap);
  const results = await Promise.all(
    tags.map(async (tag, index) => {
      await new Promise((r) => setTimeout(r, index * 120)); // small delay to avoid rate limit
      const url = `https://api.locationiq.com/v1/nearby?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&tag=${tag}&radius=${SEARCH_RADIUS_METERS}&limit=20&format=json`;

      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        const items = Array.isArray(json) ? json : [];

        return items
          .filter((item: any) => item?.lat != null && item?.lon != null)
          .map((item: any) => {
            const latC = Number(item.lat);
            const lonC = Number(item.lon);
            const type = tagMap[tag];
            return {
              id: `locationiq-${item.place_id || `${type}-${latC}-${lonC}`}`,
              type,
              name: item.name || (item.display_name || '').split(',')[0] || type,
              latitude: latC,
              longitude: lonC,
              distance: calculateDistance(lat, lng, latC, lonC),
              distanceKm: distanceMeters(lat, lng, latC, lonC) / 1000,
              address: item.display_name || 'Address unavailable',
              source: 'locationiq',
            };
          });
      } catch {
        return [];
      }
    })
  );

  return results.flat();
}, []);

  // ── Reverse geocode
  const fetchReverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`
      );
      const json = await res.json();
      if (isMounted.current && json?.display_name) setUserAddress(json.display_name);
    } catch {}
  }, []);

  // ── Load places only
 // ── Load places (Geoapify + LocationIQ)
const loadResources = useCallback(async (lat: number, lng: number) => {
  if (!isMounted.current) return;
  setLoading(true);
  setLocationError(null);

  try {
    const [geoList, locationiqList] = await Promise.all([
      fetchGeoapifyPlaces(lat, lng),
      fetchLocationIQNearby(lat, lng),
    ]);

    fetchReverseGeocode(lat, lng);

    // Deduplicate by type + rounded coordinates
    const seen = new Set<string>();
    const merged = [...geoList, ...locationiqList].filter((item) => {
      const key = `${item.type}-${Number(item.latitude).toFixed(4)}-${Number(item.longitude).toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const sorted = merged.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

    console.log('[loadResources] final count →', sorted.length);

    if (isMounted.current) setResources(sorted);

    lastFetchLocation.current = { latitude: lat, longitude: lng };
    lastFetchTime.current = Date.now();
  } catch (err) {
    console.error('[loadResources]', err);
    if (isMounted.current) setLocationError('Could not load nearby resources.');
  } finally {
    if (isMounted.current) setLoading(false);
  }
}, [fetchGeoapifyPlaces, fetchLocationIQNearby, fetchReverseGeocode]);
  // ── Location + initial load
  useEffect(() => {
    isMounted.current = true;
    let cancelled = false;

    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission required');
          setLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);

        await loadResources(coords.latitude, coords.longitude);
        if (currentUserId) {
          fetchNearbyUsers(currentUserId, coords.latitude, coords.longitude);
        }

        locationSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
          (u) => {
            if (cancelled) return;
            const c2 = { latitude: u.coords.latitude, longitude: u.coords.longitude };
            setUserLocation(c2);

            const last = lastFetchLocation.current;
            const moved = last
              ? distanceMeters(last.latitude, last.longitude, c2.latitude, c2.longitude) >= REFETCH_DISTANCE_METERS
              : true;
            const enough = Date.now() - lastFetchTime.current >= REFETCH_MIN_INTERVAL_MS;

            if (moved || enough) {
              loadResources(c2.latitude, c2.longitude);
              if (currentUserId) fetchNearbyUsers(currentUserId, c2.latitude, c2.longitude);
            }
          }
        );
      } catch {
        setLocationError('Unable to get location');
        setLoading(false);
      }
    };

    start();
    return () => {
      cancelled = true;
      isMounted.current = false;
      locationSubscription.current?.remove();
    };
  }, [loadResources, fetchNearbyUsers, currentUserId]);

  useEffect(() => {
    if (currentUserId && userLocation) {
      fetchNearbyUsers(currentUserId, userLocation.latitude, userLocation.longitude);
    }
  }, [currentUserId, userLocation, fetchNearbyUsers]);

  // ── Filtered lists
  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return nearbyUsers;
    return nearbyUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q) ||
        u.bloodGroup?.toLowerCase().includes(q)
    );
  }, [nearbyUsers, searchText]);

  const filteredResources = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q)
    );
  }, [resources, searchText]);

  // Map shows either users (red) or places (colored)
  const mapResources = bottomMode === 'nearbyUsers' ? filteredUsers : filteredResources;

  useEffect(() => {
    if (mapResources.length > 0 && mapRef.current) {
      const t = setTimeout(() => {
        try {
          mapRef.current?.fitToCoordinates(
            mapResources.map((i) => ({ latitude: i.latitude, longitude: i.longitude })),
            { edgePadding: { top: 100, right: 40, bottom: 340, left: 40 }, animated: true }
          );
        } catch {}
      }, 350);
      return () => clearTimeout(t);
    }
  }, [mapResources]);

  // ── Handlers
  const getEstimatedTime = (km: number) => {
    if (km <= 1) return '5–6 min';
    if (km <= 2) return '6–8 min';
    if (km <= 3) return '8–10 min';
    if (km <= 4) return '10–12 min';
    return '12–15 min';
  };

  const handlePress = (item: any) => {
    setSelectedResource(item);
    mapRef.current?.animateToRegion(
      { latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
      500
    );
    bottomSheetRef.current?.snapToIndex(1);
  };

  const openInMaps = (item: any) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(item.name)}@${item.latitude},${item.longitude}`,
      android: `geo:0,0?q=${item.latitude},${item.longitude}(${encodeURIComponent(item.name)})`,
    });
    if (url) Linking.openURL(url);
  };

  const callPhone = (phone?: string) => { if (phone) Linking.openURL(`tel:${phone}`); };

  const recenter = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500);
    }
  };

  const retry = () => {
    if (userLocation) {
      loadResources(userLocation.latitude, userLocation.longitude);
      if (currentUserId) fetchNearbyUsers(currentUserId, userLocation.latitude, userLocation.longitude);
    }
  };

  const changeMode = (mode: 'nearbyUsers' | 'resources') => {
    Keyboard.dismiss();
    setBottomMode(mode);
    setSelectedResource(null);
    setSearchText('');
    bottomSheetRef.current?.snapToIndex(0);
  };

  const openRequestModal = (user: any) => {
    setSelectedVolunteer(user);
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const handleSendRequest = async () => {
    if (!currentUserId || !selectedVolunteer) return;
    setSendingRequest(true);
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/support/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUserId,
          volunteer_id: Number(selectedVolunteer.id),
          message: requestMessage.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchMySentRequests(currentUserId);
        setShowRequestModal(false);
        Alert.alert('Request sent', 'Waiting for response…');
      } else {
        Alert.alert('Failed', json.message || 'Could not send');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error');
    } finally {
      setSendingRequest(false);
    }
  };

  // ── Render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header />

        {/* MAP */}
        <View style={styles.mapBox}>
         <MapView
  ref={mapRef}
  provider={PROVIDER_GOOGLE}
  style={StyleSheet.absoluteFill}
  showsUserLocation
  showsMyLocationButton={false}
  initialRegion={{
    latitude: userLocation?.latitude ?? 11.06,
    longitude: userLocation?.longitude ?? 76.91,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  }}
>
  {/* Current user – navy */}
  {userLocation && (
    <Marker
      coordinate={{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      }}
      pinColor="navy"
      title="You"
    >
      <Callout tooltip>
        <View style={styles.callout}>
          <Text style={styles.calloutName}>You</Text>
          <Text style={styles.calloutType}>Current User</Text>
        </View>
      </Callout>
    </Marker>
  )}

  {/* Users + Resources */}
  {mapResources.map((item) => {
    const isUser = item.type === 'User' || item.type === 'Volunteer';

    let pinColor = 'green';
    if (isUser) {
      pinColor = 'darkred';
    } else {
      switch (item.type) {
        case 'Hospital':
        case 'PHC':
          pinColor = 'blue';
          break;
        case 'Clinic':
          pinColor = 'cyan';
          break;
        case 'Pharmacy':
          pinColor = 'purple';
          break;
        case 'Ambulance':
          pinColor = 'red';
          break;
        case 'Police':
          pinColor = 'indigo';
          break;
        case 'FireStation':
          pinColor = 'orange';
          break;
        case 'Bank':
          pinColor = 'green';
          break;
        case 'ATM':
          pinColor = 'lime';
          break;
        case 'BusStation':
          pinColor = 'yellow';
          break;
        case 'RailwayStation':
          pinColor = 'brown';
          break;
        case 'Airport':
          pinColor = 'gray';
          break;
        case 'PetrolPump':
          pinColor = 'magenta';
          break;
        case 'College':
          pinColor = 'teal';
          break;
        default:
          pinColor = 'green';
      }
    }

    return (
      <Marker
        key={item.id}
        coordinate={{ latitude: item.latitude, longitude: item.longitude }}
        pinColor={pinColor}
        title={item.name}
        onPress={() => handlePress(item)}
        tracksViewChanges={false}
      >
        <Callout tooltip>
          <View style={styles.callout}>
            <Text style={styles.calloutName} numberOfLines={1}>
              {item.name}
            </Text>
            {isUser && (
              <Text style={styles.calloutType}>
                {item.role || 'User'}
              </Text>
            )}
          </View>
        </Callout>
      </Marker>
    );
  })}
</MapView>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Nearby support</Text>
          </View>

          <TouchableOpacity style={styles.myLocBtn} onPress={recenter}>
            <MaterialIcons name="my-location" size={22} color="#2D5A27" />
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingPill}>
              <ActivityIndicator size="small" color="#2D5A27" />
              <Text style={styles.loadingTxt}>Finding nearby…</Text>
            </View>
          )}

          {locationError && !loading && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={18} color="#B91C1C" />
              <Text style={styles.errorTxt}>{locationError}</Text>
              <TouchableOpacity onPress={retry}><Text style={styles.retryTxt}>Retry</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* BOTTOM SHEET */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.handle}
        >
          <View style={styles.sheetInner}>
            {selectedResource ? (
              <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                <TouchableOpacity
                  style={styles.backRow}
                  onPress={() => {
                    setSelectedResource(null);
                    bottomSheetRef.current?.snapToIndex(0);
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#334155" />
                  <Text style={styles.backTxt}>Back</Text>
                </TouchableOpacity>

                <View style={styles.detailCard}>
                  <View style={[styles.bigIcon, { backgroundColor: getMarkerColor(selectedResource.type) + '18' }]}>
                    <FontAwesome5
                      name={getIconName(selectedResource.type) as any}
                      size={28}
                      color={getMarkerColor(selectedResource.type)}
                    />
                  </View>
                  <View style={[styles.pill, { backgroundColor: getMarkerColor(selectedResource.type) + '18' }]}>
                    <Text style={[styles.pillTxt, { color: getMarkerColor(selectedResource.type) }]}>
                      {selectedResource.type}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>{selectedResource.name}</Text>

                  <View style={styles.infoBox}>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={18} color="#2D5A27" />
                      <Text style={styles.infoVal}>
                        {selectedResource.distance} • {selectedResource.address || selectedResource.currentLocation || '—'}
                      </Text>
                    </View>
                    {selectedResource.phone && (
                      <View style={styles.infoRow}>
                        {/* <Ionicons name="call-outline" size={18} color="#2563EB" /> */}
                        {/* <Text style={styles.infoVal}>{selectedResource.phone}</Text> */}
                      </View>
                    )}
                    {selectedResource.bloodGroup && (
                      <View style={styles.infoRow}>
<                        Ionicons name="water-outline" size={18} color="#DC2626" />
                        <Text style={styles.infoVal}>{selectedResource.bloodGroup}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#2D5A27' }]} onPress={() => openInMaps(selectedResource)}>
                      <Ionicons name="navigate" size={18} color="#fff" />
                      <Text style={styles.actTxt}>Directions</Text>
                    </TouchableOpacity>
                  
                  </View>
                </View>
              </BottomSheetScrollView>
            ) : (
              <>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Support near you</Text>
                    <Text style={styles.sub} numberOfLines={1}>{userAddress || 'Nearby help & places'}</Text>
                  </View>
                  <TouchableOpacity style={styles.refreshBtn} onPress={retry} disabled={loading || usersLoading}>
                    <Ionicons name="refresh" size={18} color={loading || usersLoading ? '#CBD5E1' : '#2D5A27'} />
                  </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                  <TouchableOpacity
                    style={[styles.tab, bottomMode === 'nearbyUsers' && styles.tabActive]}
                    onPress={() => changeMode('nearbyUsers')}
                  >
                    <Ionicons name="people" size={17} color={bottomMode === 'nearbyUsers' ? '#fff' : '#64748B'} />
                    <Text style={[styles.tabTxt, bottomMode === 'nearbyUsers' && styles.tabTxtActive]}>Users</Text>
                    <Text style={[styles.tabCount, bottomMode === 'nearbyUsers' && { color: '#DCFCE7' }]}>
                      {nearbyUsers.length}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tab, bottomMode === 'resources' && styles.tabActive]}
                    onPress={() => changeMode('resources')}
                  >
                    <Ionicons name="medkit" size={17} color={bottomMode === 'resources' ? '#fff' : '#64748B'} />
                    <Text style={[styles.tabTxt, bottomMode === 'resources' && styles.tabTxtActive]}>Resources</Text>
                    <Text style={[styles.tabCount, bottomMode === 'resources' && { color: '#DCFCE7' }]}>
                      {resources.length}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchBox}>
                  <Ionicons name="search-outline" size={18} color="#64748B" />
                  <TextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder={bottomMode === 'nearbyUsers' ? 'Search users…' : 'Search places…'}
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                    autoCapitalize="none"
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  )}
                </View>

                {bottomMode === 'nearbyUsers' ? (
                  usersLoading ? (
                    <View style={styles.center}>
                      <ActivityIndicator size="large" color="#2D5A27" />
                      <Text style={{ marginTop: 10, color: '#64748B' }}>Loading users…</Text>
                    </View>
                  ) : (
                    <BottomSheetFlatList
                      data={filteredUsers}
                      keyExtractor={(i) => i.id}
                      contentContainerStyle={{ paddingBottom: 40 }}
                      ListEmptyComponent={
                        <View style={styles.empty}>
                          <FontAwesome5 name="users" size={32} color="#94A3B8" />
                          <Text style={styles.emptyTitle}>No nearby users</Text>
                        </View>
                      }
                      renderItem={({ item }) => {
                        const req = myRequests[item.id];
                        const pending = req && req.request_status === null;
                        const accepted = req && req.request_status === 1;
                        const declined = req && req.request_status === 0;
                        const eta = getEstimatedTime(item.distanceKm);

                        return (
                          <View style={styles.userCard}>
                            <View style={styles.userTop}>
                              <View style={styles.avatar}>
                                <Text style={styles.avatarTxt}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                                <View style={styles.onlineDot} />
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.blood}>{item.bloodGroup}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                  <View style={styles.roleBadge}>
                                    <Text style={styles.roleTxt}>{item.role}</Text>
                                  </View>
                                  <Text style={styles.dist}>{item.distance}</Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.locBox}>
                              <Ionicons name="location" size={16} color="#2D5A27" />
                              <Text style={styles.locTxt} numberOfLines={1}>{item.currentLocation}</Text>
                              <Text style={styles.eta}>{eta}</Text>
                            </View>

                            {pending ? (
                              <View style={[styles.statusBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                                <Ionicons name="time-outline" size={18} color="#D97706" />
                                <Text style={[styles.statusTxt, { color: '#D97706' }]}>Pending response</Text>
                              </View>
                            ) : accepted ? (
                              <View style={styles.statusBox}>
                                <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                                <Text style={styles.statusTxt}>Accepted</Text>
                              </View>
                            ) : declined ? (
                              <View style={[styles.statusBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                <Ionicons name="close-circle" size={18} color="#DC2626" />
                                <Text style={[styles.statusTxt, { color: '#DC2626' }]}>Declined</Text>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.reqBtn} onPress={() => openRequestModal(item)}>
                                <Ionicons name="paper-plane" size={17} color="#fff" />
                                <Text style={styles.reqBtnTxt}>Request Emergency Help</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      }}
                    />
                  )
                ) : (
                  <BottomSheetFlatList
                    data={filteredResources}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListEmptyComponent={
                      !loading ? (
                        <View style={styles.empty}>
                          <FontAwesome5 name="map-marker-alt" size={32} color="#94A3B8" />
                          <Text style={styles.emptyTitle}>No resources found</Text>
                        </View>
                      ) : null
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.resCard} onPress={() => handlePress(item)}>
                        <View style={[styles.resIcon, { backgroundColor: getMarkerColor(item.type) + '18' }]}>
                          <FontAwesome5 name={getIconName(item.type) as any} size={17} color={getMarkerColor(item.type)} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.resName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.resMeta}>{item.type} • {item.distance}</Text>
                          <Text style={styles.resAddr} numberOfLines={1}>{item.address}</Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  />
                )}
              </>
            )}
          </View>
        </BottomSheet>

        {/* Request Modal */}
        <Modal visible={showRequestModal} transparent animationType="slide" onRequestClose={() => setShowRequestModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>Request Help</Text>
                <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              {selectedVolunteer && (
                <>
                  <View style={styles.modalUser}>
                    <View style={styles.modalAvatar}>
                      <Text style={styles.modalAvatarTxt}>{selectedVolunteer.name?.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.modalName}>{selectedVolunteer.name}</Text>
                      <Text style={styles.modalRole}>{selectedVolunteer.role}</Text>
                    </View>
                  </View>

                  <TextInput
                    style={styles.msgInput}
                    placeholder="Optional message…"
                    placeholderTextColor="#94A3B8"
                    value={requestMessage}
                    onChangeText={setRequestMessage}
                    multiline
                    maxLength={500}
                  />

                  <TouchableOpacity
                    style={[styles.sendBtn, sendingRequest && { opacity: 0.7 }]}
                    onPress={handleSendRequest}
                    disabled={sendingRequest}
                  >
                    {sendingRequest ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={18} color="#fff" />
                        <Text style={styles.sendTxt}>Send Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  mapBox: { flex: 1 },
  customMarker: { alignItems: 'center' },
  markerIconBg: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4,
  },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    marginTop: -2,
  },
  callout: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', minWidth: 140, alignItems: 'center',
  },
  calloutName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  calloutDist: { fontSize: 12, color: '#64748B', marginTop: 2 },
  calloutType: { fontSize: 11, color: '#2D5A27', fontWeight: '700', marginTop: 2 },
  liveBadge: {
    position: 'absolute', top: 16, left: 14,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', elevation: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginRight: 7 },
  liveText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  myLocBtn: {
    position: 'absolute', right: 14, bottom: 20,
    width: 46, height: 46, borderRadius: 15, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  loadingPill: {
    position: 'absolute', top: 16, alignSelf: 'center',
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    flexDirection: 'row', alignItems: 'center', elevation: 4,
  },
  loadingTxt: { marginLeft: 8, fontSize: 13, color: '#334155', fontWeight: '600' },
  errorBanner: {
    position: 'absolute', top: 16, left: 14, right: 14,
    backgroundColor: '#FFF7ED', borderRadius: 12, padding: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 4,
  },
  errorTxt: { flex: 1, fontSize: 12, color: '#991B1B' },
  retryTxt: { color: '#2D5A27', fontWeight: '800', fontSize: 12 },
  sheetBg: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { backgroundColor: '#CBD5E1', width: 40 },
  sheetInner: { flex: 1, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingTop: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FDF4',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7',
  },
  tabs: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 12, gap: 4,
  },
  tab: {
    flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  tabActive: { backgroundColor: '#2D5A27' },
  tabTxt: { fontSize: 12, fontWeight: '800', color: '#475569' },
  tabTxtActive: { color: '#fff' },
  tabCount: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  searchBox: {
    height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#1E293B' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  empty: { paddingVertical: 50, alignItems: 'center' },
  emptyTitle: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#475569' },

  // User card
  userCard: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 12, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 2,
  },
  userTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#EAF4E8',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarTxt: { fontSize: 20, fontWeight: '900', color: '#2D5A27' },
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1,
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  userName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  blood: { fontSize: 13, fontWeight: '800', color: '#DC2626', marginTop: 1 },
  roleBadge: {
    backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  roleTxt: { fontSize: 10, color: '#15803D', fontWeight: '800' },
  dist: { fontSize: 11, color: '#64748B', fontWeight: '700', marginLeft: 8 },
  locBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    borderRadius: 12, padding: 9, marginTop: 10, gap: 6,
  },
  locTxt: { flex: 1, fontSize: 12, color: '#334155', fontWeight: '600' },
  eta: { fontSize: 11, color: '#2D5A27', fontWeight: '800' },
  reqBtn: {
    marginTop: 12, height: 44, borderRadius: 12, backgroundColor: '#DC2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  reqBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statusBox: {
    marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 12, paddingVertical: 11, gap: 7,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  statusTxt: { color: '#15803D', fontSize: 13, fontWeight: '700' },

  // Resource card
  resCard: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  resIcon: {
    width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center',
  },
  resName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  resMeta: { fontSize: 11, color: '#2D5A27', fontWeight: '700', marginTop: 2 },
  resAddr: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  // Detail
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  backTxt: { fontSize: 14, fontWeight: '700', color: '#334155' },
  detailCard: { alignItems: 'center' },
  bigIcon: {
    width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  pillTxt: { fontSize: 11, fontWeight: '800' },
  detailName: {
    fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', paddingHorizontal: 12,
  },
  infoBox: {
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginTop: 18,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoVal: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' },
  actBtn: {
    flex: 1, height: 46, borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  actTxt: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 22, width: '90%', maxWidth: 380,
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalUser: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, padding: 12, marginBottom: 16, gap: 12,
  },
  modalAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#EAF4E8',
    justifyContent: 'center', alignItems: 'center',
  },
  modalAvatarTxt: { fontSize: 18, fontWeight: '900', color: '#2D5A27' },
  modalName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  modalRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  msgInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12,
    fontSize: 14, color: '#1E293B', minHeight: 100, textAlignVertical: 'top', marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: '#DC2626', borderRadius: 12, height: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  sendTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});