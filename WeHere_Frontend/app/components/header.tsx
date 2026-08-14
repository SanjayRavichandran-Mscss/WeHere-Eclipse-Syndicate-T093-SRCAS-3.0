import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://192.168.9.146:5000/api/notifications';

export default function Header() {
  const router = useRouter();
  const [initial, setInitial] = useState('S');
  const [ambulanceCount, setAmbulanceCount] = useState(0);
  const [sosCount, setSosCount] = useState(0);
  const [userId, setUserId] = useState<number | null>(null);

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
      // Fetch ambulance alerts count
      const ambulanceRes = await fetch(`${API_BASE}/ambulance-alerts/${id}`);
      const ambulanceJson = await ambulanceRes.json();
      if (ambulanceJson.success && Array.isArray(ambulanceJson.data)) {
        setAmbulanceCount(
          ambulanceJson.data.filter((n: any) => n.my_received_status !== 1).length
        );
      } else {
        setAmbulanceCount(0);
      }

      // Fetch SOS broadcasts count
      const sosRes = await fetch(`${API_BASE}/sos-broadcasts/${id}`);
      const sosJson = await sosRes.json();
      if (sosJson.success && Array.isArray(sosJson.data)) {
        setSosCount(sosJson.data.filter((n: any) => n.is_stopped === 0).length);
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
    router.push('/components/profile');
  };

  const openNotifications = () => {
    router.push('/components/notification');
  };

  const totalNotifications = ambulanceCount + sosCount;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => router.push('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.logoText}>WeHere</Text>
        </TouchableOpacity>

        <View style={styles.rightContainer}>
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
  logoContainer: {
    paddingVertical: 4,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '400',
    color: '#2e7d32',
    letterSpacing: -0.5,
    fontFamily: 'Pacifico_400Regular',
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