import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Platform, StatusBar, TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import BottomSheet, { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Header from '../components/header';

const BACKEND_BASE_URL = 'http://192.168.31.30/api';
const GEOAPIFY_API_KEY = '58de3303bb5a44f79d8993a8e40b9a10';
const LOCATIONIQ_API_KEY = 'pk.8209fb7c261757f8ebd31e802376031f';
const SEARCH_RADIUS_METERS = 5000;
const SEARCH_RADIUS_KM = 5;
const GEOAPIFY_RESULT_LIMIT = 200;
const REFETCH_DISTANCE_METERS = 300;
const REFETCH_MIN_INTERVAL_MS = 45000;

const deg2rad = deg => deg * (Math.PI / 180);
const distanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const meters = distanceMeters(lat1, lon1, lat2, lon2);
  const km = meters / 1000;
  return km < 1 ? `${Math.round(meters)} m` : `${km.toFixed(1)} km`;
};

const getMarkerColor = type => {
  switch (type) {
    case 'Volunteer':
    case 'User': return '#DC2626'; // RED for volunteers
    case 'PHC':
    case 'Hospital': return '#2563EB';
    case 'Clinic': return '#0891B2';
    case 'Pharmacy': return '#9333EA';
    case 'Ambulance': return '#DC2626';
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

const getIconName = type => {
  switch (type) {
    case 'Ambulance': return 'ambulance';
    case 'PHC':
    case 'Hospital': return 'hospital-alt';
    case 'Clinic': return 'clinic-medical';
    case 'Pharmacy': return 'pills';
    case 'Volunteer':
    case 'User': return 'user-circle';
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

const normalizeBackendType = raw => {
  const t = String(raw || '').toLowerCase().trim();
  if (t.includes('volunteer') || t === 'vol') return 'Volunteer';
  if (t.includes('phc') || t.includes('primary')) return 'PHC';
  if (t.includes('pharma') || t.includes('chemist')) return 'Pharmacy';
  if (t.includes('ambulance') || t.includes('vehicle')) return 'Ambulance';
  if (t.includes('police')) return 'Police';
  if (t.includes('fire')) return 'FireStation';
  if (t.includes('bank')) return 'Bank';
  if (t.includes('atm')) return 'ATM';
  if (t.includes('bus')) return 'BusStation';
  if (t.includes('rail') || t.includes('train')) return 'RailwayStation';
  if (t.includes('air')) return 'Airport';
  if (t.includes('petrol') || t.includes('fuel') || t.includes('gas')) return 'PetrolPump';
  if (t.includes('college') || t.includes('university') || t.includes('institut')) return 'College';
  if (t.includes('hospital')) return 'Hospital';
  if (t.includes('clinic')) return 'Clinic';
  return 'User';
};

const geoapifyCategoryToType = (categories, name) => {
  const cats = categories || [];
  const has = prefix => cats.some(c => c.startsWith(prefix));
  const lowerName = (name || '').toLowerCase();
  if (has('healthcare.hospital')) return (lowerName.includes('phc') || lowerName.includes('primary health')) ? 'PHC' : 'Hospital';
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
  if (has('education.college') || has('education.university')) return 'College';
  return 'Hospital';
};

const CustomMarker = ({ type, color }) => (
  <View style={styles.customMarker}>
    <View style={[styles.markerIconBg, { backgroundColor: color }]}>
      <FontAwesome5 name={getIconName(type)} size={16} color="#fff" />
    </View>
    <View style={[styles.markerTail, { borderTopColor: color }]} />
  </View>
);

export default function Support() {
  const [bottomMode, setBottomMode] = useState('nearbyUsers');
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [resources, setResources] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [requestedUsers, setRequestedUsers] = useState({}); // track who was requested

  const staticNearbyUsers = useMemo(() => [
    { id: 'nearby-user-1', source: 'static-user', type: 'User', name: 'Arun Kumar', gender: 'Male', bloodGroup: 'O+', role: 'Volunteer', occupation: 'Mechanical Engineer', domain: 'Emergency Assistance', latitude: 11.0644, longitude: 76.9104, currentLocation: 'Kattur Main Road', distanceKm: 0.7, phone: '9876543210', status: 'available' },
    { id: 'nearby-user-2', source: 'static-user', type: 'User', name: 'Priya S', gender: 'Female', bloodGroup: 'B+', role: 'Volunteer', occupation: 'Nursing Assistant', domain: 'Medical Support', latitude: 11.0588, longitude: 76.9035, currentLocation: 'Kattur Bus Stand', distanceKm: 1.4, phone: '9876543211', status: 'available' },
    { id: 'nearby-user-3', source: 'static-user', type: 'User', name: 'Vignesh R', gender: 'Male', bloodGroup: 'A+', role: 'Volunteer', occupation: 'Automobile Technician', domain: 'Vehicle & Roadside Support', latitude: 11.069, longitude: 76.916, currentLocation: 'Industrial Area', distanceKm: 2.1, phone: '9876543212', status: 'available' },
    { id: 'nearby-user-4', source: 'static-user', type: 'User', name: 'Kavya M', gender: 'Female', bloodGroup: 'AB+', role: 'Volunteer', occupation: 'Software Developer', domain: 'Technology & Emergency Coordination', latitude: 11.0545, longitude: 76.9132, currentLocation: 'Kattur West', distanceKm: 2.8, phone: '9876543213', status: 'available' },
    { id: 'nearby-user-5', source: 'static-user', type: 'User', name: 'Suresh K', gender: 'Male', bloodGroup: 'B-', role: 'Volunteer', occupation: 'Paramedic', domain: 'First Aid & Trauma Care', latitude: 11.0612, longitude: 76.9198, currentLocation: 'Near City Hospital', distanceKm: 1.9, phone: '9876543214', status: 'available' },
  ], []);

  const mapRef = useRef(null);
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['32%', '62%', '88%'], []);
  const locationSubscription = useRef(null);
  const lastFetchLocation = useRef(null);
  const lastFetchTime = useRef(0);
  const isMounted = useRef(true);
  const currentUserId = null;

  const fetchBackendResources = useCallback(async (lat, lng) => {
    let url = `${BACKEND_BASE_URL}/resources/nearby?lat=${lat}&lng=${lng}&radius=${SEARCH_RADIUS_KM}`;
    if (currentUserId != null) url += `&userId=${currentUserId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Backend error');
      const rawList = Array.isArray(json.data) ? json.data : [];
      return rawList
        .filter(item => item?.latitude != null && item?.longitude != null && !isNaN(Number(item.latitude)) && !isNaN(Number(item.longitude)))
        .map(item => {
          const latNum = Number(item.latitude);
          const lngNum = Number(item.longitude);
          const type = normalizeBackendType(item.type);
          return {
            id: String(item.id || item.placeId || `${type}-${latNum}-${lngNum}`),
            placeId: item.placeId, source: 'backend', type,
            name: item.name || item.full_name || 'Unknown',
            latitude: latNum, longitude: lngNum,
            distance: calculateDistance(lat, lng, latNum, lngNum),
            distanceKm: distanceMeters(lat, lng, latNum, lngNum) / 1000,
            address: item.address || item.current_location || 'Location shared',
            phone: item.phone || item.mobile_number, available: item.available,
            bloodGroup: item.bloodGroup, vehicleType: item.vehicleType,
          };
        });
    } catch (err) {
      clearTimeout(timeoutId);
      console.log('[Backend]', err?.message || err);
      return [];
    }
  }, [currentUserId]);

  const fetchGeoapifyPlaces = useCallback(async (lat, lng) => {
    const categories = ['healthcare.hospital', 'healthcare.clinic_or_praxis', 'healthcare.pharmacy', 'service.ambulance_station', 'service.police', 'service.fire_station', 'service.financial.bank', 'service.financial.atm', 'public_transport.bus', 'public_transport.train', 'airport', 'service.vehicle.fuel', 'education.college', 'education.university'].join(',');
    const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},${SEARCH_RADIUS_METERS}&bias=proximity:${lng},${lat}&limit=${GEOAPIFY_RESULT_LIMIT}&apiKey=${GEOAPIFY_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const features = Array.isArray(json.features) ? json.features : [];
      return features
        .filter(f => f?.geometry?.coordinates?.length === 2)
        .map(f => {
          const props = f.properties || {};
          const [lonC, latC] = f.geometry.coordinates;
          const type = geoapifyCategoryToType(props.categories || [], props.name);
          return {
            id: props.place_id || `geo-${type}-${latC}-${lonC}`,
            placeId: props.place_id, source: 'geoapify', type,
            name: props.name || props.address_line1 || type,
            latitude: latC, longitude: lonC,
            distance: calculateDistance(lat, lng, latC, lonC),
            distanceKm: props.distance != null ? Number(props.distance) / 1000 : distanceMeters(lat, lng, latC, lonC) / 1000,
            address: props.formatted || props.address_line2 || 'Address unavailable',
          };
        });
    } catch (err) {
      clearTimeout(timeoutId);
      console.log('[Geoapify]', err?.message || err);
      return [];
    }
  }, []);

  const fetchLocationIQReverseGeocode = useCallback(async (lat, lng) => {
    const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&format=json`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (isMounted.current && json?.display_name) setUserAddress(json.display_name);
    } catch (err) {
      console.log('[LocationIQ]', err?.message || err);
    }
  }, []);

  const fetchLocationIQNearby = useCallback(async (lat, lng) => {
    const tagMap = { hospital: 'Hospital', clinic: 'Clinic', pharmacy: 'Pharmacy', bank: 'Bank', atm: 'ATM', police: 'Police', fire_station: 'FireStation', bus_station: 'BusStation', train_station: 'RailwayStation', airport: 'Airport', fuel: 'PetrolPump', college: 'College' };
    const tags = Object.keys(tagMap);
    const results = await Promise.all(tags.map(async (tag, index) => {
      await new Promise(resolve => setTimeout(resolve, index * 150));
      const url = `https://api.locationiq.com/v1/nearby?key=${LOCATIONIQ_API_KEY}&lat=${lat}&lon=${lng}&tag=${tag}&radius=${SEARCH_RADIUS_METERS}&limit=20&format=json`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const json = await res.json();
        const items = Array.isArray(json) ? json : [];
        return items.filter(item => item?.lat != null && item?.lon != null).map(item => {
          const latC = Number(item.lat);
          const lonC = Number(item.lon);
          const type = tagMap[tag];
          return {
            id: `locationiq-${item.place_id || `${type}-${latC}-${lonC}`}`,
            placeId: item.place_id, source: 'locationiq', type,
            name: item.name || (item.display_name || '').split(',')[0] || type,
            latitude: latC, longitude: lonC,
            distance: calculateDistance(lat, lng, latC, lonC),
            distanceKm: distanceMeters(lat, lng, latC, lonC) / 1000,
            address: item.display_name || 'Address unavailable',
          };
        });
      } catch {
        return [];
      }
    }));
    return results.flat();
  }, []);

  const dedupePlaces = list => {
    const seen = new Set();
    return list.filter(item => {
      const key = `${item.type}-${item.latitude.toFixed(4)}-${item.longitude.toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const loadResources = useCallback(async (lat, lng) => {
    if (!isMounted.current) return;
    setLoading(true);
    setLocationError(null);
    try {
      const [backendList, geoapifyList, locationiqList] = await Promise.all([
        fetchBackendResources(lat, lng),
        fetchGeoapifyPlaces(lat, lng),
        fetchLocationIQNearby(lat, lng),
      ]);
      fetchLocationIQReverseGeocode(lat, lng);
      const merged = dedupePlaces([...backendList, ...geoapifyList, ...locationiqList]).sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
      if (isMounted.current) setResources(merged);
      lastFetchLocation.current = { latitude: lat, longitude: lng };
      lastFetchTime.current = Date.now();
    } catch (err) {
      console.log('[Support]', err?.message || err);
      if (isMounted.current) setLocationError('Could not load nearby resources.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [fetchBackendResources, fetchGeoapifyPlaces, fetchLocationIQNearby, fetchLocationIQReverseGeocode]);

  useEffect(() => {
    isMounted.current = true;
    let cancelled = false;
    const start = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is required.');
          setLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setUserLocation(coords);
        await loadResources(coords.latitude, coords.longitude);
        locationSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
          update => {
            if (cancelled) return;
            const coords2 = { latitude: update.coords.latitude, longitude: update.coords.longitude };
            setUserLocation(coords2);
            const last = lastFetchLocation.current;
            const moved = last ? distanceMeters(last.latitude, last.longitude, coords2.latitude, coords2.longitude) >= REFETCH_DISTANCE_METERS : true;
            const enoughTime = Date.now() - lastFetchTime.current >= REFETCH_MIN_INTERVAL_MS;
            if (moved || enoughTime) loadResources(coords2.latitude, coords2.longitude);
          }
        );
      } catch (err) {
        console.log('[Location]', err);
        setLocationError('Unable to get current location.');
        setLoading(false);
      }
    };
    start();
    return () => {
      cancelled = true;
      isMounted.current = false;
      locationSubscription.current?.remove();
    };
  }, [loadResources]);

  const externalResources = useMemo(() => resources.filter(item => item.source !== 'backend' || item.type !== 'User'), [resources]);

  const nearbyUsers = useMemo(() => {
    if (!userLocation) return staticNearbyUsers;
    return staticNearbyUsers
      .map(user => {
        const km = distanceMeters(userLocation.latitude, userLocation.longitude, user.latitude, user.longitude) / 1000;
        return { ...user, distanceKm: km, distance: calculateDistance(userLocation.latitude, userLocation.longitude, user.latitude, user.longitude) };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [userLocation, staticNearbyUsers]);

  const displayedResources = bottomMode === 'nearbyUsers' ? nearbyUsers : externalResources;
  const mapResources = displayedResources;

  useEffect(() => {
    if (mapResources.length > 0 && mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current.fitToCoordinates(
            mapResources.map(item => ({ latitude: item.latitude, longitude: item.longitude })),
            { edgePadding: { top: 110, right: 45, bottom: 330, left: 45 }, animated: true }
          );
        } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mapResources]);

  const handleRequestVolunteer = user => {
    setRequestedUsers(prev => ({ ...prev, [user.id]: true }));
  };

  const getEstimatedTime = km => {
    if (km <= 1) return '5–6 min';
    if (km <= 2) return '6–8 min';
    if (km <= 3) return '8–10 min';
    if (km <= 4) return '10–12 min';
    return '12–15 min';
  };

  const handleResourcePress = async item => {
    setSelectedResource(item);
    if (mapRef.current) {
      mapRef.current.animateToRegion({ latitude: item.latitude, longitude: item.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }, 600);
    }
    bottomSheetRef.current?.snapToIndex(1);
    if (item.source === 'backend' && item.placeId && !item.phone) {
      setDetailsLoading(true);
      try {
        const res = await fetch(`${BACKEND_BASE_URL}/resources/place-details/${item.placeId}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setSelectedResource(prev => (prev ? { ...prev, ...json.data } : prev));
            setResources(prev => prev.map(resource => (resource.id === item.id ? { ...resource, ...json.data } : resource)));
          }
        }
      } catch (err) {
        console.log('[Details]', err);
      } finally {
        setDetailsLoading(false);
      }
    }
  };

  const openInMaps = item => {
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(item.name)}@${item.latitude},${item.longitude}`,
      android: `geo:0,0?q=${item.latitude},${item.longitude}(${encodeURIComponent(item.name)})`,
    });
    if (url) Linking.openURL(url);
  };

  const callPhone = phone => { if (phone) Linking.openURL(`tel:${phone}`); };
  const recenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({ ...userLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 600);
    }
  };
  const retryLoad = () => { if (userLocation) loadResources(userLocation.latitude, userLocation.longitude); };
  const changeBottomMode = mode => {
    Keyboard.dismiss();
    setBottomMode(mode);
    setSelectedResource(null);
    setSearchText('');
    bottomSheetRef.current?.snapToIndex(0);
  };
  const clearSearch = () => { setSearchText(''); Keyboard.dismiss(); };

  const filteredResources = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return externalResources;
    return externalResources.filter(item =>
      String(item.name || '').toLowerCase().includes(query) ||
      String(item.type || '').toLowerCase().includes(query) ||
      String(item.address || '').toLowerCase().includes(query)
    );
  }, [externalResources, searchText]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Header />

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            showsUserLocation
            showsMyLocationButton={false}
            initialRegion={{
              latitude: userLocation?.latitude ?? 11.062,
              longitude: userLocation?.longitude ?? 76.9079,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            }}
          >
            {mapResources.map(item => (
              <Marker
                key={item.id}
                coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                onPress={() => handleResourcePress(item)}
                tracksViewChanges={false}
              >
                <CustomMarker type={item.type} color={getMarkerColor(item.type)} />
                <Callout tooltip>
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.calloutDist}>
                      {item.distance || calculateDistance(userLocation?.latitude || item.latitude, userLocation?.longitude || item.longitude, item.latitude, item.longitude)}
                    </Text>
                    <Text style={styles.calloutType}>{item.type}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>

          <View style={styles.mapTopBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.mapTopText}>Nearby support</Text>
          </View>

          <TouchableOpacity style={styles.myLocationBtn} onPress={recenterOnUser} activeOpacity={0.8}>
            <MaterialIcons name="my-location" size={22} color="#2D5A27" />
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color="#2D5A27" />
              <Text style={styles.loadingText}>Finding nearby support...</Text>
            </View>
          )}

          {locationError && !loading && (
            <View style={styles.errorBanner}>
              <View style={styles.errorIcon}>
                <Ionicons name="warning-outline" size={18} color="#B91C1C" />
              </View>
              <Text style={styles.errorText}>{locationError}</Text>
              <TouchableOpacity onPress={retryLoad} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose={false}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <View style={styles.sheetContent}>
            {selectedResource ? (
              <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                <TouchableOpacity
                  style={styles.detailBack}
                  onPress={() => {
                    setSelectedResource(null);
                    bottomSheetRef.current?.snapToIndex(0);
                  }}
                >
                  <Ionicons name="arrow-back" size={20} color="#334155" />
                  <Text style={styles.detailBackText}>Back to nearby</Text>
                </TouchableOpacity>

                <View style={styles.detailCard}>
                  <View style={[styles.iconBoxLarge, { backgroundColor: getMarkerColor(selectedResource.type) + '18' }]}>
                    <FontAwesome5 name={getIconName(selectedResource.type)} size={30} color={getMarkerColor(selectedResource.type)} />
                  </View>
                  <View style={[styles.detailPill, { backgroundColor: getMarkerColor(selectedResource.type) + '18' }]}>
                    <Text style={[styles.detailPillText, { color: getMarkerColor(selectedResource.type) }]}>{selectedResource.type}</Text>
                  </View>
                  <Text style={styles.detailName}>{selectedResource.name}</Text>
                  {selectedResource.available && (
                    <View style={styles.availableBadge}>
                      <View style={styles.availableDot} />
                      <Text style={styles.availableText}>Available</Text>
                    </View>
                  )}

                  <View style={styles.detailInfoBox}>
                    <View style={styles.detailInfoRow}>
                      <View style={styles.detailInfoIcon}>
                        <Ionicons name="location-outline" size={19} color="#2D5A27" />
                      </View>
                      <View style={styles.detailInfoContent}>
                        <Text style={styles.detailInfoLabel}>Location</Text>
                        <Text style={styles.detailInfoValue}>
                          {selectedResource.distance}{' • '}{selectedResource.address || 'Address unavailable'}
                        </Text>
                      </View>
                    </View>
                    {selectedResource.phone && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoIcon}>
                          <Ionicons name="call-outline" size={19} color="#2563EB" />
                        </View>
                        <View style={styles.detailInfoContent}>
                          <Text style={styles.detailInfoLabel}>Contact</Text>
                          <Text style={styles.detailInfoValue}>{selectedResource.phone}</Text>
                        </View>
                      </View>
                    )}
                    {selectedResource.bloodGroup && (
                      <View style={styles.detailInfoRow}>
                        <View style={styles.detailInfoIcon}>
                          <Ionicons name="water-outline" size={19} color="#DC2626" />
                        </View>
                        <View style={styles.detailInfoContent}>
                          <Text style={styles.detailInfoLabel}>Blood Group</Text>
                          <Text style={styles.detailInfoValue}>{selectedResource.bloodGroup}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  {detailsLoading && <ActivityIndicator size="small" color="#2D5A27" style={styles.detailLoader} />}

                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.directionBtn]} onPress={() => openInMaps(selectedResource)} activeOpacity={0.8}>
                      <Ionicons name="navigate" size={19} color="#fff" />
                      <Text style={styles.actionBtnText}>Directions</Text>
                    </TouchableOpacity>
                    {selectedResource.phone && (
                      <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={() => callPhone(selectedResource.phone)} activeOpacity={0.8}>
                        <Ionicons name="call" size={19} color="#fff" />
                        <Text style={styles.actionBtnText}>Call</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </BottomSheetScrollView>
            ) : (
              <>
                <View style={styles.panelHeader}>
                  <View style={styles.panelTitleArea}>
                    <Text style={styles.panelTitle}>Support near you</Text>
                    <Text style={styles.panelSubtitle} numberOfLines={1}>
                      {userAddress || 'Showing nearby support and resources'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.refreshButton} onPress={retryLoad} disabled={loading} activeOpacity={0.8}>
                    <Ionicons name="refresh" size={19} color={loading ? '#CBD5E1' : '#2D5A27'} />
                  </TouchableOpacity>
                </View>

                {/* 3 MODE TABS */}
                <View style={styles.modeTabs}>
                  <TouchableOpacity
                    style={[styles.modeTab, bottomMode === 'nearbyUsers' && styles.activeModeTab]}
                    onPress={() => changeBottomMode('nearbyUsers')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={18} color={bottomMode === 'nearbyUsers' ? '#fff' : '#64748B'} />
                    <Text style={[styles.modeTabText, bottomMode === 'nearbyUsers' && styles.activeModeTabText]}>Users</Text>
                    <Text style={[styles.modeCountText, bottomMode === 'nearbyUsers' && styles.activeModeCountText]}>{nearbyUsers.length}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, bottomMode === 'resources' && styles.activeModeTab]}
                    onPress={() => changeBottomMode('resources')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="medkit" size={18} color={bottomMode === 'resources' ? '#fff' : '#64748B'} />
                    <Text style={[styles.modeTabText, bottomMode === 'resources' && styles.activeModeTabText]}>Resources</Text>
                    <Text style={[styles.modeCountText, bottomMode === 'resources' && styles.activeModeCountText]}>{externalResources.length}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeTab, bottomMode === 'search' && styles.activeModeTab]}
                    onPress={() => changeBottomMode('search')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search" size={18} color={bottomMode === 'search' ? '#fff' : '#64748B'} />
                    <Text style={[styles.modeTabText, bottomMode === 'search' && styles.activeModeTabText]}>Search</Text>
                  </TouchableOpacity>
                </View>

                {/* SEARCH BAR (only in Search tab) */}
                {bottomMode === 'search' && (
                  <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#64748B" />
                    <TextInput
                      value={searchText}
                      onChangeText={setSearchText}
                      placeholder="Search hospitals, pharmacy, police..."
                      placeholderTextColor="#94A3B8"
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                    {searchText.length > 0 && (
                      <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* NEARBY USERS */}
                {bottomMode === 'nearbyUsers' ? (
                  <BottomSheetFlatList
                    data={nearbyUsers}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.userListContent}
                    ListHeaderComponent={
                      <View style={styles.userListHeader}>
                        <View style={styles.userHeaderIcon}>
                          <Ionicons name="people" size={20} color="#2D5A27" />
                        </View>
                        <View style={styles.userHeaderText}>
                          <Text style={styles.userListTitle}>Volunteers nearby</Text>
                          <Text style={styles.userListSubtitle}>People who may be able to assist you</Text>
                        </View>
                        <View style={styles.countBadge}>
                          <Text style={styles.countText}>{nearbyUsers.length}</Text>
                        </View>
                      </View>
                    }
                    ListEmptyComponent={
                      <View style={styles.empty}>
                        <View style={styles.emptyIcon}>
                          <FontAwesome5 name="users" size={30} color="#94A3B8" />
                        </View>
                        <Text style={styles.emptyText}>No nearby users</Text>
                        <Text style={styles.emptySub}>No volunteers are currently available nearby.</Text>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const isRequested = requestedUsers[item.id];
                      const estimatedTime = getEstimatedTime(item.distanceKm);
                      return (
                        <View style={styles.profileCard}>
                          <View style={styles.profileTop}>
                            <View style={styles.avatar}>
                              <Text style={styles.avatarText}>{item.name?.charAt(0)?.toUpperCase()}</Text>
                              <View style={styles.onlineIndicator} />
                            </View>
                            <View style={styles.profileIdentity}>
                              <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.bloodUnderName}>{item.bloodGroup}</Text>
                              <View style={styles.roleRow}>
                                <View style={styles.roleBadge}>
                                  <Ionicons name="heart" size={10} color="#15803D" />
                                  <Text style={styles.roleBadgeText}>{item.role}</Text>
                                </View>
                                <Text style={styles.profileDistance}>{item.distance}</Text>
                              </View>
                            </View>
                            <View style={styles.availableSmall}>
                              <View style={styles.smallGreenDot} />
                              <Text style={styles.availableSmallText}>Available</Text>
                            </View>
                          </View>

                          <View style={styles.currentLocationBox}>
                            <View style={styles.locationPin}>
                              <Ionicons name="location" size={17} color="#2D5A27" />
                            </View>
                            <View style={styles.locationTextBox}>
                              <Text style={styles.locationLabel}>CURRENT LOCATION</Text>
                              <Text style={styles.locationValue} numberOfLines={2}>{item.currentLocation}</Text>
                            </View>
                            <View style={styles.etaBox}>
                              <Ionicons name="time-outline" size={15} color="#2D5A27" />
                              <Text style={styles.etaText}>{estimatedTime}</Text>
                            </View>
                          </View>

                          {/* REQUEST BUTTON */}
                          {!isRequested ? (
                            <TouchableOpacity
                              style={styles.requestButton}
                              onPress={() => handleRequestVolunteer(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="paper-plane" size={18} color="#fff" />
                              <Text style={styles.requestButtonText}>Request</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.requestedBox}>
                              <Ionicons name="checkmark-circle" size={20} color="#15803D" />
                              <Text style={styles.requestedText}>
                                Request sent • Expected in {estimatedTime}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    }}
                  />
                ) : (
                  /* RESOURCES + SEARCH */
                  <>
                    <View style={styles.listHeader}>
                      <View>
                        <Text style={styles.listTitle}>
                          {bottomMode === 'search' ? 'Search results' : 'Available resources'}
                        </Text>
                        <Text style={styles.listSubtitle}>
                          {searchText.trim() ? `Results for "${searchText.trim()}"` : 'Sorted by distance'}
                        </Text>
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>
                          {bottomMode === 'search' ? filteredResources.length : externalResources.length}
                        </Text>
                      </View>
                    </View>

                    <BottomSheetFlatList
                      data={bottomMode === 'search' ? filteredResources : externalResources}
                      keyExtractor={item => item.id}
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.listContent}
                      ListEmptyComponent={
                        !loading ? (
                          <View style={styles.empty}>
                            <View style={styles.emptyIcon}>
                              <FontAwesome5 name="map-marker-alt" size={30} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyText}>
                              {searchText.trim() ? 'Nothing found' : 'No resources found'}
                            </Text>
                            <Text style={styles.emptySub}>
                              {searchText.trim() ? 'Try a different name, type or location.' : 'Nearby data will appear here when available.'}
                            </Text>
                          </View>
                        ) : null
                      }
                      renderItem={({ item }) => (
                        <TouchableOpacity style={styles.resourceCard} onPress={() => handleResourcePress(item)} activeOpacity={0.75}>
                          <View style={styles.cardLeft}>
                            <View style={[styles.iconBox, { backgroundColor: getMarkerColor(item.type) + '14' }]}>
                              <FontAwesome5 name={getIconName(item.type)} size={18} color={getMarkerColor(item.type)} />
                            </View>
                            <View style={styles.resourceInfo}>
                              <Text style={styles.resourceName} numberOfLines={1}>{item.name}</Text>
                              <View style={styles.typeDistanceRow}>
                                <Text style={styles.resourceType}>{item.type}</Text>
                                <View style={styles.dotSeparator} />
                                <Text style={styles.resourceDistance}>{item.distance}</Text>
                              </View>
                              <Text style={styles.resourceAddr} numberOfLines={1}>{item.address || 'Address unavailable'}</Text>
                            </View>
                          </View>
                          <View style={styles.chevronContainer}>
                            <MaterialIcons name="chevron-right" size={23} color="#94A3B8" />
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </>
                )}
              </>
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#fff' },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  customMarker: { alignItems: 'center' },
  markerIconBg: {
    padding: 10, borderRadius: 20, elevation: 6,
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  markerTail: {
    width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -2,
  },
  calloutContainer: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', minWidth: 150, maxWidth: 220,
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  calloutName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  calloutDist: { fontSize: 12, color: '#64748B', marginTop: 3 },
  calloutType: { fontSize: 11, color: '#2D5A27', marginTop: 3, fontWeight: '700' },
  mapTopBadge: {
    position: 'absolute', top: 18, left: 16, backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A', marginRight: 7 },
  mapTopText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  myLocationBtn: {
    position: 'absolute', right: 16, bottom: 22, width: 48, height: 48, borderRadius: 16,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 7, shadowOffset: { width: 0, height: 3 },
  },
  loadingOverlay: {
    position: 'absolute', top: 18, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22, flexDirection: 'row', alignItems: 'center', elevation: 5,
  },
  loadingText: { marginLeft: 9, fontSize: 13, color: '#334155', fontWeight: '600' },
  errorBanner: {
    position: 'absolute', top: 18, left: 16, right: 16, backgroundColor: '#FFF7ED',
    borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'center', elevation: 4,
  },
  errorIcon: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: '#FEE2E2',
    justifyContent: 'center', alignItems: 'center', marginRight: 9,
  },
  errorText: { color: '#991B1B', fontSize: 12, flex: 1, lineHeight: 17 },
  retryButton: { paddingHorizontal: 8, paddingVertical: 6 },
  retryText: { color: '#2D5A27', fontWeight: '800', fontSize: 12 },
  sheetBackground: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: '#CBD5E1', width: 42, height: 5 },
  sheetContent: { flex: 1, paddingHorizontal: 18 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, marginBottom: 14 },
  panelTitleArea: { flex: 1, paddingRight: 12 },
  panelTitle: { fontSize: 21, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  panelSubtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },
  refreshButton: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: '#F0FDF4',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7',
  },
  modeTabs: {
    flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, marginBottom: 12, gap: 4,
  },
  modeTab: {
    flex: 1, minHeight: 52, borderRadius: 13, flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2,
  },
  activeModeTab: { backgroundColor: '#2D5A27', elevation: 2 },
  modeTabText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  activeModeTabText: { color: '#fff' },
  modeCountText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  activeModeCountText: { color: '#DCFCE7' },
  searchContainer: {
    height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 13,
  },
  searchInput: { flex: 1, marginLeft: 9, fontSize: 14, color: '#1E293B', paddingVertical: 0 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  listTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  listSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  countBadge: {
    minWidth: 34, height: 28, paddingHorizontal: 9, borderRadius: 14,
    backgroundColor: '#EAF4E8', justifyContent: 'center', alignItems: 'center',
  },
  countText: { color: '#2D5A27', fontSize: 13, fontWeight: '800' },
  listContent: { paddingBottom: 40 },
  resourceCard: {
    minHeight: 74, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  resourceInfo: { flex: 1, marginLeft: 12, paddingRight: 8 },
  resourceName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  typeDistanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  resourceType: { fontSize: 10, color: '#2D5A27', fontWeight: '800' },
  dotSeparator: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 6 },
  resourceDistance: { fontSize: 10, color: '#64748B', fontWeight: '600' },
  resourceAddr: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  chevronContainer: { width: 28, height: 36, justifyContent: 'center', alignItems: 'center' },
  userListContent: { paddingBottom: 45 },
  userListHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, marginBottom: 12 },
  userHeaderIcon: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: '#EAF4E8',
    justifyContent: 'center', alignItems: 'center',
  },
  userHeaderText: { flex: 1, marginLeft: 10 },
  userListTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  userListSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 14, padding: 15,
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 3,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56, height: 56, borderRadius: 18, backgroundColor: '#EAF4E8',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  avatarText: { fontSize: 21, fontWeight: '900', color: '#2D5A27' },
  onlineIndicator: {
    position: 'absolute', width: 13, height: 13, borderRadius: 7, backgroundColor: '#22C55E',
    right: -1, bottom: -1, borderWidth: 2, borderColor: '#fff',
  },
  profileIdentity: { flex: 1, marginLeft: 12 },
  profileName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  bloodUnderName: { fontSize: 13, fontWeight: '800', color: '#DC2626', marginTop: 2 },
  roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8,
  },
  roleBadgeText: { fontSize: 10, color: '#15803D', fontWeight: '800', marginLeft: 4 },
  profileDistance: { fontSize: 11, color: '#64748B', fontWeight: '700', marginLeft: 8 },
  availableSmall: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 5,
    backgroundColor: '#F0FDF4', borderRadius: 10,
  },
  smallGreenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A', marginRight: 4 },
  availableSmallText: { fontSize: 9, color: '#15803D', fontWeight: '800' },
  currentLocationBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#DCFCE7', borderRadius: 14, padding: 10, marginTop: 11,
  },
  locationPin: {
    width: 35, height: 35, borderRadius: 11, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  locationTextBox: { flex: 1, marginLeft: 9 },
  locationLabel: { fontSize: 8, color: '#65A30D', fontWeight: '900', letterSpacing: 0.5 },
  locationValue: { fontSize: 11, color: '#334155', fontWeight: '700', marginTop: 2 },
  etaBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 9, paddingHorizontal: 7, paddingVertical: 6,
  },
  etaText: { fontSize: 10, color: '#2D5A27', fontWeight: '900', marginLeft: 3 },

  // Request button styles
  requestButton: {
    marginTop: 13, minHeight: 47, borderRadius: 13, backgroundColor: '#2D5A27',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2,
  },
  requestButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  requestedBox: {
    marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 13, paddingVertical: 12, gap: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  requestedText: { color: '#15803D', fontSize: 13, fontWeight: '700' },

  empty: { paddingVertical: 55, alignItems: 'center', paddingHorizontal: 30 },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 22, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { color: '#475569', fontSize: 16, marginTop: 15, fontWeight: '800' },
  emptySub: { color: '#94A3B8', fontSize: 12, marginTop: 6, textAlign: 'center', lineHeight: 18 },
  detailScroll: { paddingBottom: 40 },
  detailBack: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, marginBottom: 14 },
  detailBackText: { marginLeft: 7, color: '#334155', fontSize: 13, fontWeight: '700' },
  detailCard: { alignItems: 'center', paddingBottom: 30 },
  iconBoxLarge: { width: 82, height: 82, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  detailPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 8 },
  detailPillText: { fontSize: 11, fontWeight: '800' },
  detailName: { fontSize: 21, fontWeight: '800', color: '#0F172A', textAlign: 'center', lineHeight: 27, paddingHorizontal: 15 },
  availableBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 9, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, backgroundColor: '#F0FDF4',
  },
  availableDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A', marginRight: 6 },
  availableText: { fontSize: 11, fontWeight: '800', color: '#15803D' },
  detailInfoBox: {
    width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 5, marginTop: 22,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  detailInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 11 },
  detailInfoIcon: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  detailInfoContent: { flex: 1, marginLeft: 11 },
  detailInfoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailInfoValue: { fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 2, lineHeight: 18 },
  detailLoader: { marginTop: 12 },
  actionRow: { flexDirection: 'row', marginTop: 18, gap: 10, width: '100%' },
  actionBtn: {
    flex: 1, minHeight: 49, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 14, gap: 8,
  },
  directionBtn: { backgroundColor: '#2D5A27' },
  callBtn: { backgroundColor: '#2563EB' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});