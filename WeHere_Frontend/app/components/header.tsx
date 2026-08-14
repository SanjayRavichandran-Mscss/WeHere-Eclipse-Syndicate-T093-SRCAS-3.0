// import { useState, useEffect, useCallback } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { useRouter } from 'expo-router';
// import { MaterialIcons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE = 'http://192.168.137.1:5000/api/notifications';
// const ICON_SIZE = 26;

// export default function Header() {
//   const router = useRouter();
//   const [initial, setInitial] = useState('S');
//   const [ambulanceCount, setAmbulanceCount] = useState(0);
//   const [sosCount, setSosCount] = useState(0);
//   const [userId, setUserId] = useState<number | null>(null);

//   useEffect(() => {
//     const loadUser = async () => {
//       try {
//         const storedUser = await AsyncStorage.getItem('user');
//         if (storedUser) {
//           const user = JSON.parse(storedUser);
//           if (user?.username) {
//             setInitial(user.username.charAt(0).toUpperCase());
//           }
//           if (user?.id) {
//             const id = Number(user.id);
//             setUserId(id);
//             fetchAllCounts(id);
//           }
//         }
//       } catch (error) {
//         console.log('[Header] load user error:', error);
//       }
//     };
//     loadUser();
//   }, []);

//   const fetchAllCounts = useCallback(async (id: number) => {
//     try {
//       // Fetch ambulance alerts count
//       const ambulanceRes = await fetch(`${API_BASE}/ambulance-alerts/${id}`);
//       const ambulanceJson = await ambulanceRes.json();
//       if (ambulanceJson.success && Array.isArray(ambulanceJson.data)) {
//         const pending = ambulanceJson.data.filter(
//           (n: any) => n.my_received_status !== 1
//         ).length;
//         setAmbulanceCount(pending);
//       } else {
//         setAmbulanceCount(0);
//       }

//       // Fetch SOS broadcasts count
//       const sosRes = await fetch(`${API_BASE}/sos-broadcasts/${id}`);
//       const sosJson = await sosRes.json();
//       if (sosJson.success && Array.isArray(sosJson.data)) {
//         // Count only active broadcasts (is_stopped = 0)
//         const activeSos = sosJson.data.filter(
//           (n: any) => n.is_stopped === 0
//         ).length;
//         setSosCount(activeSos);
//       } else {
//         setSosCount(0);
//       }
//     } catch (err) {
//       console.log('[Header] fetch counts error:', err);
//     }
//   }, []);

//   useEffect(() => {
//     if (!userId) return;
//     const interval = setInterval(() => {
//       fetchAllCounts(userId);
//     }, 20000);
//     return () => clearInterval(interval);
//   }, [userId, fetchAllCounts]);

//   const goToProfile = () => {
//     router.push('/components/profile');
//   };

//   return (
//     <View style={styles.header}>
//       <TouchableOpacity style={styles.logoContainer} onPress={() => router.push('/')}>
//         <Text style={styles.logoText}>WeHere</Text>
//       </TouchableOpacity>

//       <View style={styles.rightContainer}>
//         {/* 1. Ambulance / Emergency */}
//         <TouchableOpacity
//           style={styles.iconButton}
//           onPress={() => router.push('/components/ambulance-notifications')}
//           activeOpacity={0.7}
//         >
//           <MaterialCommunityIcons name="car-emergency" size={ICON_SIZE + 2} color="#111111" />
//           {ambulanceCount > 0 ? (
//             <View style={styles.badge}>
//               <Text style={styles.badgeText}>
//                 {ambulanceCount > 99 ? '99+' : String(ambulanceCount)}
//               </Text>
//             </View>
//           ) : null}
//         </TouchableOpacity>

//         {/* 2. Important / SOS */}
//         <TouchableOpacity
//           style={styles.iconButton}
//           onPress={() => router.push('/components/important-notifications')}
//           activeOpacity={0.7}
//         >
//           <MaterialIcons name="notification-important" size={ICON_SIZE + 2} color="#111111" />
//           {sosCount > 0 ? (
//             <View style={[styles.badge, styles.sosBadge]}>
//               <Text style={styles.badgeText}>
//                 {sosCount > 99 ? '99+' : String(sosCount)}
//               </Text>
//             </View>
//           ) : null}
//         </TouchableOpacity>

//         {/* 3. General */}
//         <TouchableOpacity
//           style={styles.iconButton}
//           onPress={() => router.push('/components/general-notifications')}
//           activeOpacity={0.7}
//         >
//           <AntDesign name="notification" size={ICON_SIZE} color="#111111" />
//         </TouchableOpacity>

//         {/* Profile */}
//         <TouchableOpacity style={styles.profileButton} onPress={goToProfile} activeOpacity={0.8}>
//           <Text style={styles.profileInitial}>{initial}</Text>
//         </TouchableOpacity>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingHorizontal: 20,
//     paddingTop: 44,
//     paddingBottom: 12,
//     backgroundColor: '#ffffff',
//     elevation: 3,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.07,
//     shadowRadius: 4,
//   },
//   logoContainer: {},
//   logoText: {
//     fontSize: 28,
//     fontWeight: '400',
//     color: '#2e7d32',
//     letterSpacing: -0.5,
//     fontFamily: 'Pacifico_400Regular',
//   },
//   rightContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 12,
//   },
//   iconButton: {
//     width: 38,
//     height: 38,
//     alignItems: 'center',
//     justifyContent: 'center',
//     position: 'relative',
//   },
//   badge: {
//     position: 'absolute',
//     top: 0,
//     right: 0,
//     backgroundColor: '#dc2626',
//     minWidth: 16,
//     height: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingHorizontal: 3,
//     borderWidth: 1.5,
//     borderColor: '#fff',
//     zIndex: 10,
//   },
//   sosBadge: {
//     backgroundColor: '#dc2626',
//   },
//   badgeText: {
//     color: '#fff',
//     fontSize: 9,
//     fontWeight: '800',
//   },
//   profileButton: {
//     width: 38,
//     height: 38,
//     borderRadius: 19,
//     backgroundColor: '#4caf50',
//     justifyContent: 'center',
//     alignItems: 'center',
//     borderWidth: 2,
//     borderColor: '#2e7d32',
//     marginLeft: 2,
//   },
//   profileInitial: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#ffffff',
//   },
// });






import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MaterialIcons,
  AntDesign,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.9.146:5000/api/notifications';
const ICON_SIZE = 26;

export default function Header() {
  const router = useRouter();
  const [initial, setInitial] = useState('S');
  const [ambulanceCount, setAmbulanceCount] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user?.username) setInitial(user.username.charAt(0).toUpperCase());
          if (user?.id) {
            const id = Number(user.id);
            setUserId(id);
            fetchAllCounts(id);
          }
        }
      } catch (error) {
        console.log('[Header] load user error:', error);
      }
    };
    loadUser();
  }, []);

  const fetchAllCounts = useCallback(async (id: number) => {
    try {
      const ambulanceRes = await fetch(`${API_BASE}/ambulance-alerts/${id}`);
      const ambulanceJson = await ambulanceRes.json();
      if (ambulanceJson.success && Array.isArray(ambulanceJson.data)) {
        setAmbulanceCount(
          ambulanceJson.data.filter((n: any) => n.my_received_status !== 1).length
        );
      } else {
        setAmbulanceCount(0);
      }

      const sosRes = await fetch(`${API_BASE}/sos-broadcasts/${id}`);
      const sosJson = await sosRes.json();
      if (sosJson.success && Array.isArray(sosJson.data)) {
        setSosCount(
          sosJson.data.filter((n: any) => n.is_stopped === 0).length
        );
      } else {
        setSosCount(0);
      }
    } catch (err) {
      console.log('[Header] fetch counts error:', err);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => fetchAllCounts(userId), 20000);
    return () => clearInterval(interval);
  }, [userId, fetchAllCounts]);

  const goToProfile = () => {
    setShowNotificationMenu(false);
    router.push('/components/profile');
  };

  const openNotification = (
    route:
      | '/components/ambulance-notifications'
      | '/components/important-notifications'
      | '/components/general-notifications'
  ) => {
    setShowNotificationMenu(false);
    router.push(route);
  };

  const totalNotifications = ambulanceCount + sosCount;

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.logoContainer}
        onPress={() => {
          setShowNotificationMenu(false);
          router.push('/');
        }}
      >
        <Text style={styles.logoText}>WeHere</Text>
      </TouchableOpacity>

      <View style={styles.rightContainer}>
        <View style={styles.notificationWrapper}>
          <TouchableOpacity
            style={[
              styles.mainNotificationButton,
              showNotificationMenu && styles.mainNotificationButtonActive,
            ]}
            onPress={() => setShowNotificationMenu((v) => !v)}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={showNotificationMenu ? 'notifications' : 'notifications-none'}
              size={28}
              color="#111111"
            />
            {!showNotificationMenu && totalNotifications > 0 && (
              <View style={styles.mainBadge}>
                <Text style={styles.badgeText}>
                  {totalNotifications > 99 ? '99+' : String(totalNotifications)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {showNotificationMenu && (
            <View style={styles.notificationPopup}>
              <Text style={styles.popupTitle}>Notifications</Text>

              <TouchableOpacity
                style={styles.notificationOption}
                onPress={() => openNotification('/components/ambulance-notifications')}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <MaterialCommunityIcons name="car-emergency" size={27} color="#111111" />
                  {ambulanceCount > 0 && (
                    <View style={styles.optionBadge}>
                      <Text style={styles.badgeText}>
                        {ambulanceCount > 99 ? '99+' : String(ambulanceCount)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Emergency</Text>
                  <Text style={styles.optionSubtitle}>Ambulance requests and alerts</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.notificationOption}
                onPress={() => openNotification('/components/important-notifications')}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="notification-important" size={29} color="#111111" />
                  {sosCount > 0 && (
                    <View style={styles.optionBadge}>
                      <Text style={styles.badgeText}>
                        {sosCount > 99 ? '99+' : String(sosCount)}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Important</Text>
                  <Text style={styles.optionSubtitle}>SOS and important notifications</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.notificationOption, styles.lastNotificationOption]}
                onPress={() => openNotification('/components/general-notifications')}
                activeOpacity={0.7}
              >
                <View style={styles.optionIconContainer}>
                  <AntDesign name="notification" size={27} color="#111111" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>General</Text>
                  <Text style={styles.optionSubtitle}>General notifications</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#777777" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.profileButton} onPress={goToProfile} activeOpacity={0.8}>
          <Text style={styles.profileInitial}>{initial}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 44, paddingBottom: 12,
    backgroundColor: '#ffffff', elevation: 3, zIndex: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  logoContainer: {},
  logoText: {
    fontSize: 28, fontWeight: '400', color: '#2e7d32', letterSpacing: -0.5,
    fontFamily: 'Pacifico_400Regular',
  },
  rightContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, zIndex: 101 },
  notificationWrapper: { position: 'relative', zIndex: 200 },
  mainNotificationButton: {
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
    position: 'relative', borderRadius: 21,
  },
  mainNotificationButtonActive: { backgroundColor: '#f1f8f2' },
  mainBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: '#dc2626',
    minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5,
    borderColor: '#ffffff', zIndex: 10,
  },
  notificationPopup: {
    position: 'absolute', top: 48, right: -8, width: 285,
    backgroundColor: '#ffffff', borderRadius: 16, paddingTop: 14,
    paddingBottom: 4, paddingHorizontal: 8, elevation: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18, shadowRadius: 10, borderWidth: 1,
    borderColor: '#e5e7eb', zIndex: 500,
  },
  popupTitle: {
    fontSize: 17, fontWeight: '700', color: '#111111',
    paddingHorizontal: 12, paddingBottom: 8,
  },
  notificationOption: {
    flexDirection: 'row', alignItems: 'center', minHeight: 66,
    paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1,
    borderBottomColor: '#eeeeee', borderRadius: 10,
  },
  lastNotificationOption: { borderBottomWidth: 0 },
  optionIconContainer: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center', position: 'relative', marginRight: 11,
  },
  optionBadge: {
    position: 'absolute', top: -3, right: -5, backgroundColor: '#dc2626',
    minWidth: 17, height: 17, borderRadius: 9, alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  optionTextContainer: { flex: 1, paddingRight: 5 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#111111', marginBottom: 2 },
  optionSubtitle: { fontSize: 11, color: '#777777', lineHeight: 15 },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '800' },
  profileButton: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#4caf50',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
    borderColor: '#2e7d32', marginLeft: 2,
  },
  profileInitial: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
});