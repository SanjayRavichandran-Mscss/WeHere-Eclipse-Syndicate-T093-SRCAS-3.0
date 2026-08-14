import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  // Theme Colors
  const themeGreen = '#166534'; // Deep forest green
  const sosRed = '#dc2626';     // Red for the SOS center

  // Calculate dynamic height to prevent "jumping" or collapsing
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 65 : 70;
  const safeBottomPadding = insets.bottom > 0 ? insets.bottom : 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeGreen,
        tabBarInactiveTintColor: '#6b7280',
        tabBarHideOnKeyboard: true, // Prevents tab bar from floating over keyboard
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 20,                // Higher elevation for Android stability
          shadowColor: '#000',          // shadow for iOS
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          position: 'absolute',         // Keeps layout stable during navigation
          bottom: 0,
          left: 0,
          right: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="support"
        options={{
          title: 'Support',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="sos"
        options={{
          title: '', // Empty title for floating button
          tabBarIcon: () => <SOSButton />,
        }}
      />

      <Tabs.Screen
        name="networks"
        options={{
          title: 'Networks',
          tabBarIcon: ({ color, size }) => (
<MaterialCommunityIcons name="hub-outline" size={size} color={color} />
     ),
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function SOSButton() {
  return (
    <View style={styles.sosContainer}>
      <View style={styles.sosCircle}>
        <Text style={styles.sosText}>SOS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sosContainer: {
    // This wrapper ensures the button "pops" out of the tab bar
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    width: 70,
    top: Platform.OS === 'ios' ? -18 : -22, // Pulls the button upwards
  },
  sosCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#ffffff',
    // Premium Shadow Effect
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15, 
  },
  sosText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.2,
  },
});