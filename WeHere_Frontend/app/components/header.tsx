import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Dimensions
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.100.67.248:5000/api/notifications';
const { width, height } = Dimensions.get('window');

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [initial, setInitial] = useState('S');
  const [ambulanceCount, setAmbulanceCount] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Check if we're in donate app
  const isDonateApp = pathname?.startsWith('/(tabs_donate)');

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
            if (!isDonateApp) {
              fetchAllCounts(id);
            }
          }
        }
      } catch (error) {
        console.log('[Header] load user error:', error);
      }
    };
    loadUser();
  }, [isDonateApp]);

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
        setSosCount(sosJson.data.filter((n: any) => n.is_stopped === 0).length);
      } else {
        setSosCount(0);
      }

      setIsOnline(true);
    } catch (err) {
      console.log('[Header] fetch counts error:', err);
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    if (!userId || isDonateApp) return;
    const interval = setInterval(() => fetchAllCounts(userId), 20000);
    return () => clearInterval(interval);
  }, [userId, fetchAllCounts, isDonateApp]);

  const goToProfile = () => {
    // Navigate to the profile screen.
    // Adjust this path to match where profile.tsx actually lives in your app/ folder.
    // e.g. if the file is at app/profile.tsx        -> '/profile'
    //      if the file is at app/(tabs)/profile.tsx  -> '/(tabs)/profile'
    //      if the file is at app/components/profile.tsx -> '/components/profile'
    router.push('/components/profile');
  };

  const openNotifications = () => {
    if (!isDonateApp) {
      router.push('/components/notification');
    }
  };

  const totalNotifications = ambulanceCount + sosCount;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <View style={styles.logoWrapper}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>WeHere</Text>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        <View style={styles.rightContainer}>
          {!isDonateApp && (
            <TouchableOpacity
              style={styles.mainNotificationButton}
              onPress={openNotifications}
              activeOpacity={0.75}
            >
              <MaterialIcons name="notifications-none" size={28} color="#111111" />
              {totalNotifications > 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.badgeText}>
                    {totalNotifications > 99 ? '99+' : String(totalNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={goToProfile} 
            activeOpacity={0.8}
          >
            <Text style={styles.profileInitial}>{initial}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  logoWrapper: {
    position: 'relative',
  },
  logoContainer: {
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#2e7d32',
    letterSpacing: -0.5,
    fontFamily: 'Pacifico_400Regular',
  },
  appBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    marginLeft: 6,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#dc2626',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  onlineDot: {
    backgroundColor: '#22c55e',
  },
  offlineDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  onlineText: {
    color: '#22c55e',
  },
  offlineText: {
    color: '#ef4444',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainNotificationButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderRadius: 21,
  },
  mainBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#dc2626',
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2e7d32',
    marginLeft: 2,
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});