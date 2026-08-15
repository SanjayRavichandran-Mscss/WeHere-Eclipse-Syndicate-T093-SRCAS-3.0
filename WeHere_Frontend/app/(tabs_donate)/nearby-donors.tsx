// import React, { useEffect, useState, useRef, useMemo } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   ActivityIndicator,
//   RefreshControl,
//   TouchableOpacity,
//   SafeAreaView,
//   Alert,
// } from "react-native";
// import MapView, { Marker, Callout } from "react-native-maps";
// import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as Location from "expo-location";
// import { MaterialIcons } from "@expo/vector-icons";
// import Header from "../wedonate_components/Header";

// const API_URL = "http://192.168.10.168:5000";

// interface NearbyUser {
//   nearby_userId: number;
//   nearby_username: string;
//   blood_group?: string;
//   current_location?: string;
//   current_latitude: string;
//   current_longitude: string;
//   distance_km: number;
// }

// interface UserLocation {
//   latitude: number;
//   longitude: number;
//   current_location: string;
// }

// export default function NearbyDonors() {
//   const [userId, setUserId] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
//   const [myLocation, setMyLocation] = useState<UserLocation | null>(null);
//   const [selectedMarker, setSelectedMarker] = useState<NearbyUser | null>(null);

//   // Set of donor IDs that already have a pending request from current user
//   const [pendingRequests, setPendingRequests] = useState<Set<number>>(new Set());

//   const mapRef = useRef<MapView>(null);
//   const bottomSheetRef = useRef<BottomSheet>(null);
//   const snapPoints = useMemo(() => ["38%", "70%", "95%"], []);
//   const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   useEffect(() => {
//     initialize();

//     locationIntervalRef.current = setInterval(() => {
//       updateCurrentLocationPeriodically();
//     }, 60000);

//     return () => {
//       if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
//     };
//   }, []);

//   const initialize = async () => {
//     try {
//       const stored = await AsyncStorage.getItem("userId");
//       if (!stored) {
//         setLoading(false);
//         return;
//       }

//       const uid = Number(stored);
//       setUserId(uid);

//       const deviceLoc = await getAndProcessDeviceLocation();
//       if (deviceLoc) {
//         setMyLocation(deviceLoc);
//         await sendLocationToBackend(uid, deviceLoc);
//       }

//       // Load both nearby donors and pending requests status
//       await Promise.all([
//         fetchNearbyUsers(uid),
//         fetchPendingRequests(uid),
//       ]);

//       setLoading(false);
//     } catch (err) {
//       console.log("Initialization error:", err);
//       setLoading(false);
//     }
//   };

//   // Fetch ALL pending requests sent by current user
//   const fetchPendingRequests = async (uid: number) => {
//     try {
//       const res = await fetch(`${API_URL}/notification/check-request?neederId=${uid}`);
//       const json = await res.json();

//       if (json.success && Array.isArray(json.pendingDonorIds)) {
//         const donorIds = json.pendingDonorIds.map(Number);
//         setPendingRequests(new Set(donorIds));
//         console.log("Pending requests loaded for donors:", donorIds);
//       } else {
//         console.log("No pending requests or invalid response");
//         setPendingRequests(new Set());
//       }
//     } catch (err) {
//       console.error("Failed to fetch pending requests:", err);
//       setPendingRequests(new Set());
//     }
//   };

//   const updateCurrentLocationPeriodically = async () => {
//     if (!userId) return;
//     const deviceLoc = await getAndProcessDeviceLocation();
//     if (deviceLoc) {
//       setMyLocation(deviceLoc);
//       await sendLocationToBackend(userId, deviceLoc);
//     }
//   };

//   const getAndProcessDeviceLocation = async (): Promise<UserLocation | null> => {
//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") return null;

//       const pos = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.Balanced,
//       });

//       const { latitude, longitude } = pos.coords;

//       let readable = "Location detected";
//       try {
//         const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
//         if (geocoded?.[0]) {
//           const addr = geocoded[0];
//           const parts = [
//             addr.name || addr.streetNumber,
//             addr.street,
//             addr.district || addr.subregion,
//             addr.city || addr.locality,
//             addr.region,
//             addr.country,
//             addr.postalCode ? `(${addr.postalCode})` : "",
//           ].filter(Boolean);
//           readable = parts.join(", ") || `${addr.city || ""}, ${addr.region || ""}`.trim();
//         }
//       } catch {}

//       if (readable === "Location detected") {
//         readable = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
//       }

//       return { latitude, longitude, current_location: readable };
//     } catch (err) {
//       console.log("Location fetch failed:", err);
//       return null;
//     }
//   };

//   const sendLocationToBackend = async (uid: number, loc: UserLocation) => {
//     if (!loc.latitude || !loc.longitude) return;

//     try {
//       const res = await fetch(`${API_URL}/nearby-donor/store-currentuser-location`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           userId: uid,
//           latitude: loc.latitude,
//           longitude: loc.longitude,
//           current_location: loc.current_location,
//         }),
//       });

//       const json = await res.json();
//       if (json.success && !json.skipped) {
//         console.log(`[LOCATION] Sent OK → user ${uid}`);
//       }
//     } catch (err) {
//       console.log(`[LOCATION] Send failed:`, err);
//     }
//   };

//   const fetchNearbyUsers = async (uid: number) => {
//     try {
//       const res = await fetch(`${API_URL}/nearby-donor/nearby-donors?userId=${uid}`);
//       const json = await res.json();

//       if (json.success) {
//         const transformed = (json.nearby_users || []).map((u: any) => ({
//           ...u,
//           nearby_userId: Number(u.nearby_userId),
//           distance_km: Number(u.distance_km),
//         }));
//         setNearbyUsers(transformed);
//       }
//     } catch (err) {
//       console.log("Nearby fetch error:", err);
//     }
//   };

//   const onRefresh = () => {
//     if (!userId) return;
//     setRefreshing(true);
//     initialize().finally(() => setRefreshing(false));
//   };

//   const sendBloodRequest = async (donorId: number, donorName: string) => {
//     if (!userId) {
//       Alert.alert("Error", "User not logged in");
//       return;
//     }

//     try {
//       const res = await fetch(`${API_URL}/notification/send-request`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           neederId: userId,
//           donorId,
//         }),
//       });

//       const json = await res.json();

//       if (json.success) {
//         // Add to local pending list
//         setPendingRequests((prev) => new Set([...prev, donorId]));

//         Alert.alert("Success", `Request sent successfully to ${donorName}!`);
//       } else {
//         Alert.alert("Failed", json.message || "Could not send request");
//       }
//     } catch (err) {
//       console.error("Request send error:", err);
//       Alert.alert("Error", "Failed to connect to server. Please try again.");
//     }
//   };

//   const confirmSendRequest = (donor: NearbyUser) => {
//     const donorId = donor.nearby_userId;

//     if (pendingRequests.has(donorId)) {
//       Alert.alert("Info", `Request already sent to ${donor.nearby_username}.`);
//       return;
//     }

//     Alert.alert(
//       "Confirm Request",
//       `Send blood request to ${donor.nearby_username} (${donor.blood_group || "unknown"})?`,
//       [
//         { text: "Cancel", style: "cancel" },
//         {
//           text: "Send",
//           onPress: () => sendBloodRequest(donorId, donor.nearby_username),
//         },
//       ]
//     );
//   };

//   if (loading) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#dc2626" />
//         <Text style={styles.loadingText}>Loading nearby donors...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <SafeAreaView style={styles.safeArea}>
//         <Header showEmergency />

//         <MapView
//           ref={mapRef}
//           style={styles.map}
//           initialRegion={{
//             latitude: myLocation?.latitude ?? 11.0168,
//             longitude: myLocation?.longitude ?? 76.9558,
//             latitudeDelta: 0.1,
//             longitudeDelta: 0.1,
//           }}
//         >
//           {myLocation && (
//             <Marker
//               coordinate={{
//                 latitude: myLocation.latitude,
//                 longitude: myLocation.longitude,
//               }}
//               pinColor="navy"
//               title="You"
//             />
//           )}

//           {nearbyUsers.map((user) => {
//             const lat = parseFloat(user.current_latitude);
//             const lng = parseFloat(user.current_longitude);
//             if (isNaN(lat) || isNaN(lng)) return null;

//             const isPending = pendingRequests.has(user.nearby_userId);

//             return (
//               <Marker
//                 key={user.nearby_userId}
//                 coordinate={{ latitude: lat, longitude: lng }}
//                 pinColor="darkred"
//                 title={user.nearby_username}
//                 description={user.blood_group || "No blood group"}
//                 onPress={() => setSelectedMarker(user)}
//               >
//                 {selectedMarker?.nearby_userId === user.nearby_userId && (
//                   <Callout tooltip>
//                     <View style={styles.calloutContainer}>
//                       <Text style={styles.calloutName}>{user.nearby_username}</Text>

//                       {user.blood_group && (
//                         <View style={styles.bloodGroupBadge}>
//                           <Text style={styles.bloodGroupText}>{user.blood_group}</Text>
//                         </View>
//                       )}

//                       <Text style={styles.calloutDistance}>
//                         {user.distance_km.toFixed(2)} km away
//                       </Text>

//                       {isPending ? (
//                         <Text style={styles.requestSentText}>Request Sent</Text>
//                       ) : (
//                         <TouchableOpacity
//                           style={styles.requestButton}
//                           onPress={() => confirmSendRequest(user)}
//                         >
//                           <Text style={styles.requestButtonText}>Request Blood</Text>
//                         </TouchableOpacity>
//                       )}
//                     </View>
//                   </Callout>
//                 )}
//               </Marker>
//             );
//           })}
//         </MapView>

//         <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints}>
//           <View style={styles.sheetHeader}>
//             <Text style={styles.yourLocationTitle}>Your Location</Text>
//             {myLocation ? (
//               <>
//                 <Text style={styles.addressText}>{myLocation.current_location}</Text>
//                 <Text style={styles.coordsSmall}>
//                   {myLocation.latitude.toFixed(5)}, {myLocation.longitude.toFixed(5)}
//                 </Text>
//               </>
//             ) : (
//               <Text style={styles.noLocationText}>Location not available</Text>
//             )}

//             <Text style={styles.nearbyTitle}>Nearby Donors ({nearbyUsers.length})</Text>
//           </View>

//           <BottomSheetFlatList
//             data={nearbyUsers}
//             keyExtractor={(item) => item.nearby_userId.toString()}
//             refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//             ListEmptyComponent={
//               <View style={styles.emptyContainer}>
//                 <MaterialIcons name="people-outline" size={48} color="#ccc" />
//                 <Text style={styles.emptyText}>No nearby donors found</Text>
//               </View>
//             }
//             renderItem={({ item }) => {
//               const isPending = pendingRequests.has(item.nearby_userId);

//               return (
//                 <TouchableOpacity
//                   activeOpacity={0.8}
//                   style={styles.donorCard}
//                   onPress={() => confirmSendRequest(item)}
//                 >
//                   <View style={styles.nameRow}>
//                     <Text style={styles.donorName}>{item.nearby_username}</Text>
//                     <Text style={styles.distance}>{item.distance_km.toFixed(2)} km</Text>
//                   </View>

//                   {item.blood_group && (
//                     <Text style={styles.bloodGroup}>Blood Group: {item.blood_group}</Text>
//                   )}

//                   {isPending ? (
//                     <Text style={styles.requestSentTextSmall}>Request Sent</Text>
//                   ) : (
//                     <View style={styles.requestButtonContainer}>
//                       <TouchableOpacity
//                         style={styles.requestButtonSmall}
//                         onPress={() => confirmSendRequest(item)}
//                       >
//                         <Text style={styles.requestButtonTextSmall}>Request</Text>
//                       </TouchableOpacity>
//                     </View>
//                   )}
//                 </TouchableOpacity>
//               );
//             }}
//           />
//         </BottomSheet>
//       </SafeAreaView>
//     </GestureHandlerRootView>
//   );
// }

// const styles = StyleSheet.create({
//   safeArea: { flex: 1 },
//   map: { flex: 1 },

//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   loadingText: { marginTop: 12, color: "#666" },

//   calloutContainer: {
//     backgroundColor: "white",
//     padding: 16,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     width: 240,
//     alignItems: "center",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   calloutName: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#111",
//     marginBottom: 8,
//   },
//   bloodGroupBadge: {
//     backgroundColor: "#c53030",
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 16,
//     marginVertical: 8,
//     minWidth: 60,
//   },
//   bloodGroupText: {
//     color: "white",
//     fontSize: 14,
//     fontWeight: "bold",
//     textAlign: "center",
//   },
//   calloutDistance: {
//     fontSize: 13,
//     color: "#555",
//     marginTop: 4,
//   },
//   requestButton: {
//     backgroundColor: "#dc2626",
//     paddingVertical: 10,
//     paddingHorizontal: 24,
//     borderRadius: 20,
//     marginTop: 12,
//     width: "100%",
//     alignItems: "center",
//   },
//   requestButtonText: {
//     color: "white",
//     fontWeight: "bold",
//     fontSize: 16,
//   },
//   requestSentText: {
//     marginTop: 12,
//     paddingVertical: 10,
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#16a34a", // green
//     textAlign: "center",
//   },

//   sheetHeader: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderColor: "#eee",
//   },
//   yourLocationTitle: {
//     fontSize: 18,
//     fontWeight: "700",
//     color: "#1e40af",
//     marginBottom: 6,
//   },
//   addressText: {
//     fontSize: 16,
//     color: "#111",
//     marginBottom: 4,
//   },
//   coordsSmall: {
//     fontSize: 12,
//     color: "#666",
//     marginBottom: 12,
//   },
//   noLocationText: {
//     fontSize: 15,
//     color: "#e11d48",
//     marginBottom: 12,
//   },
//   nearbyTitle: {
//     fontSize: 19,
//     fontWeight: "bold",
//     color: "#7f1d1d",
//     marginTop: 8,
//   },

//   emptyContainer: {
//     alignItems: "center",
//     paddingVertical: 60,
//   },
//   emptyText: {
//     marginTop: 12,
//     fontSize: 16,
//     color: "#777",
//   },

//   donorCard: {
//     backgroundColor: "#fff",
//     marginHorizontal: 16,
//     marginVertical: 8,
//     padding: 16,
//     borderRadius: 12,
//     shadowColor: "#6366f1",
//     shadowOffset: { width: 0, height: 0 },
//     shadowOpacity: 0.15,
//     shadowRadius: 10,
//     elevation: 3,
//     borderWidth: 1,
//     borderColor: "#eee",
//   },
//   nameRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 6,
//   },
//   donorName: {
//     fontSize: 17,
//     fontWeight: "600",
//     color: "#111",
//   },
//   distance: {
//     fontSize: 14,
//     color: "#1e40af",
//     fontWeight: "500",
//   },
//   bloodGroup: {
//     fontSize: 15,
//     color: "#b91c1c",
//     marginBottom: 12,
//   },
//   requestButtonContainer: {
//     alignItems: "flex-start",
//     marginTop: 8,
//   },
//   requestButtonSmall: {
//     backgroundColor: "#dc2626",
//     paddingVertical: 8,
//     paddingHorizontal: 20,
//     borderRadius: 20,
//   },
//   requestButtonTextSmall: {
//     color: "white",
//     fontWeight: "600",
//     fontSize: 14,
//   },
//   requestSentTextSmall: {
//     marginTop: 10,
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#16a34a", // green
//     alignSelf: "flex-start",
//   },
// });








import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "../wedonate_components/Header";

const API_URL = "http://192.168.10.168:5000";

interface NearbyUser {
  nearby_userId: number;
  nearby_username: string;
  blood_group?: string;
  current_location?: string;
  current_latitude: string;
  current_longitude: string;
  distance_km: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  current_location: string;
}

export default function NearbyDonors() {
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [myLocation, setMyLocation] = useState<UserLocation | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<NearbyUser | null>(null);

  // Set of donor IDs that already have a pending request from current user
  const [pendingRequests, setPendingRequests] = useState<Set<number>>(new Set());

  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["38%", "70%", "95%"], []);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initialize();

    locationIntervalRef.current = setInterval(() => {
      updateCurrentLocationPeriodically();
    }, 60000);

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, []);

  const initialize = async () => {
    try {
      // Fetch userId from AsyncStorage (same as profile.tsx)
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        setLoading(false);
        Alert.alert('Error', 'User not found. Please login again.');
        return;
      }

      const user = JSON.parse(storedUser);
      if (!user || !user.id) {
        setLoading(false);
        Alert.alert('Error', 'User data not found. Please login again.');
        return;
      }

      const uid = Number(user.id);
      setUserId(uid);

      const deviceLoc = await getAndProcessDeviceLocation();
      if (deviceLoc) {
        setMyLocation(deviceLoc);
        await sendLocationToBackend(uid, deviceLoc);
      }

      // Load both nearby donors and pending requests status
      await Promise.all([
        fetchNearbyUsers(uid),
        fetchPendingRequests(uid),
      ]);

      setLoading(false);
    } catch (err) {
      console.log("Initialization error:", err);
      setLoading(false);
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    }
  };

  // Fetch ALL pending requests sent by current user
  const fetchPendingRequests = async (uid: number) => {
    try {
      const res = await fetch(`${API_URL}/notification/check-request?neederId=${uid}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.pendingDonorIds)) {
        const donorIds = json.pendingDonorIds.map(Number);
        setPendingRequests(new Set(donorIds));
        console.log("Pending requests loaded for donors:", donorIds);
      } else {
        console.log("No pending requests or invalid response");
        setPendingRequests(new Set());
      }
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
      setPendingRequests(new Set());
    }
  };

  const updateCurrentLocationPeriodically = async () => {
    if (!userId) return;
    const deviceLoc = await getAndProcessDeviceLocation();
    if (deviceLoc) {
      setMyLocation(deviceLoc);
      await sendLocationToBackend(userId, deviceLoc);
    }
  };

  const getAndProcessDeviceLocation = async (): Promise<UserLocation | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = pos.coords;

      let readable = "Location detected";
      try {
        const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocoded?.[0]) {
          const addr = geocoded[0];
          const parts = [
            addr.name || addr.streetNumber,
            addr.street,
            addr.district || addr.subregion,
            addr.city || addr.locality,
            addr.region,
            addr.country,
            addr.postalCode ? `(${addr.postalCode})` : "",
          ].filter(Boolean);
          readable = parts.join(", ") || `${addr.city || ""}, ${addr.region || ""}`.trim();
        }
      } catch {}

      if (readable === "Location detected") {
        readable = `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      return { latitude, longitude, current_location: readable };
    } catch (err) {
      console.log("Location fetch failed:", err);
      return null;
    }
  };

  const sendLocationToBackend = async (uid: number, loc: UserLocation) => {
    if (!loc.latitude || !loc.longitude) return;

    try {
      const res = await fetch(`${API_URL}/nearby-donor/store-currentuser-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: uid,
          latitude: loc.latitude,
          longitude: loc.longitude,
          current_location: loc.current_location,
        }),
      });

      const json = await res.json();
      if (json.success && !json.skipped) {
        console.log(`[LOCATION] Sent OK → user ${uid}`);
      }
    } catch (err) {
      console.log(`[LOCATION] Send failed:`, err);
    }
  };

  const fetchNearbyUsers = async (uid: number) => {
    try {
      const res = await fetch(`${API_URL}/nearby-donor/nearby-donors?userId=${uid}`);
      const json = await res.json();

      if (json.success) {
        const transformed = (json.nearby_users || []).map((u: any) => ({
          ...u,
          nearby_userId: Number(u.nearby_userId),
          distance_km: Number(u.distance_km),
        }));
        setNearbyUsers(transformed);
      }
    } catch (err) {
      console.log("Nearby fetch error:", err);
    }
  };

  const onRefresh = () => {
    if (!userId) return;
    setRefreshing(true);
    initialize().finally(() => setRefreshing(false));
  };

  const sendBloodRequest = async (donorId: number, donorName: string) => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notification/send-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neederId: userId,
          donorId,
        }),
      });

      const json = await res.json();

      if (json.success) {
        // Add to local pending list
        setPendingRequests((prev) => new Set([...prev, donorId]));

        Alert.alert("Success", `Request sent successfully to ${donorName}!`);
      } else {
        Alert.alert("Failed", json.message || "Could not send request");
      }
    } catch (err) {
      console.error("Request send error:", err);
      Alert.alert("Error", "Failed to connect to server. Please try again.");
    }
  };

  const confirmSendRequest = (donor: NearbyUser) => {
    const donorId = donor.nearby_userId;

    if (pendingRequests.has(donorId)) {
      Alert.alert("Info", `Request already sent to ${donor.nearby_username}.`);
      return;
    }

    Alert.alert(
      "Confirm Request",
      `Send blood request to ${donor.nearby_username} (${donor.blood_group || "unknown"})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => sendBloodRequest(donorId, donor.nearby_username),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Loading nearby donors...</Text>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <Header showEmergency />

        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: myLocation?.latitude ?? 11.0168,
            longitude: myLocation?.longitude ?? 76.9558,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
        >
          {myLocation && (
            <Marker
              coordinate={{
                latitude: myLocation.latitude,
                longitude: myLocation.longitude,
              }}
              pinColor="navy"
              title="You"
            />
          )}

          {nearbyUsers.map((user) => {
            const lat = parseFloat(user.current_latitude);
            const lng = parseFloat(user.current_longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            const isPending = pendingRequests.has(user.nearby_userId);

            return (
              <Marker
                key={user.nearby_userId}
                coordinate={{ latitude: lat, longitude: lng }}
                pinColor="darkred"
                title={user.nearby_username}
                description={user.blood_group || "No blood group"}
                onPress={() => setSelectedMarker(user)}
              >
                {selectedMarker?.nearby_userId === user.nearby_userId && (
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutName}>{user.nearby_username}</Text>

                      {user.blood_group && (
                        <View style={styles.bloodGroupBadge}>
                          <Text style={styles.bloodGroupText}>{user.blood_group}</Text>
                        </View>
                      )}

                      <Text style={styles.calloutDistance}>
                        {user.distance_km.toFixed(2)} km away
                      </Text>

                      {isPending ? (
                        <Text style={styles.requestSentText}>Request Sent</Text>
                      ) : (
                        <TouchableOpacity
                          style={styles.requestButton}
                          onPress={() => confirmSendRequest(user)}
                        >
                          <Text style={styles.requestButtonText}>Request Blood</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Callout>
                )}
              </Marker>
            );
          })}
        </MapView>

        <BottomSheet ref={bottomSheetRef} index={0} snapPoints={snapPoints}>
          <View style={styles.sheetHeader}>
            <Text style={styles.yourLocationTitle}>Your Location</Text>
            {myLocation ? (
              <>
                <Text style={styles.addressText}>{myLocation.current_location}</Text>
                <Text style={styles.coordsSmall}>
                  {myLocation.latitude.toFixed(5)}, {myLocation.longitude.toFixed(5)}
                </Text>
              </>
            ) : (
              <Text style={styles.noLocationText}>Location not available</Text>
            )}

            <Text style={styles.nearbyTitle}>Nearby Donors ({nearbyUsers.length})</Text>
          </View>

          <BottomSheetFlatList
            data={nearbyUsers}
            keyExtractor={(item) => item.nearby_userId.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No nearby donors found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isPending = pendingRequests.has(item.nearby_userId);

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.donorCard}
                  onPress={() => confirmSendRequest(item)}
                >
                  <View style={styles.nameRow}>
                    <Text style={styles.donorName}>{item.nearby_username}</Text>
                    <Text style={styles.distance}>{item.distance_km.toFixed(2)} km</Text>
                  </View>

                  {item.blood_group && (
                    <Text style={styles.bloodGroup}>Blood Group: {item.blood_group}</Text>
                  )}

                  {isPending ? (
                    <Text style={styles.requestSentTextSmall}>Request Sent</Text>
                  ) : (
                    <View style={styles.requestButtonContainer}>
                      <TouchableOpacity
                        style={styles.requestButtonSmall}
                        onPress={() => confirmSendRequest(item)}
                      >
                        <Text style={styles.requestButtonTextSmall}>Request</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </BottomSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  map: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 12, color: "#666" },

  calloutContainer: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    width: 240,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calloutName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  bloodGroupBadge: {
    backgroundColor: "#c53030",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginVertical: 8,
    minWidth: 60,
  },
  bloodGroupText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  calloutDistance: {
    fontSize: 13,
    color: "#555",
    marginTop: 4,
  },
  requestButton: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginTop: 12,
    width: "100%",
    alignItems: "center",
  },
  requestButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  requestSentText: {
    marginTop: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    color: "#16a34a", // green
    textAlign: "center",
  },

  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  yourLocationTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 6,
  },
  addressText: {
    fontSize: 16,
    color: "#111",
    marginBottom: 4,
  },
  coordsSmall: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  noLocationText: {
    fontSize: 15,
    color: "#e11d48",
    marginBottom: 12,
  },
  nearbyTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#7f1d1d",
    marginTop: 8,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: "#777",
  },

  donorCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#eee",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  donorName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111",
  },
  distance: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
  },
  bloodGroup: {
    fontSize: 15,
    color: "#b91c1c",
    marginBottom: 12,
  },
  requestButtonContainer: {
    alignItems: "flex-start",
    marginTop: 8,
  },
  requestButtonSmall: {
    backgroundColor: "#dc2626",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  requestButtonTextSmall: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  requestSentTextSmall: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a", // green
    alignSelf: "flex-start",
  },
});