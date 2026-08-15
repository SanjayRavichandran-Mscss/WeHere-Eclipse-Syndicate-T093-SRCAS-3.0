// import { Tabs } from "expo-router";
// import { Ionicons } from "@expo/vector-icons";

// export default function TabLayout() {
//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: "red",
//       }}
//     >
//       {/* 1️⃣ Nearby */}
//       <Tabs.Screen
//         name="nearby-donors"
//         options={{
//           title: "Nearby Donors",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="location-outline" size={size} color={color} />
//           ),
//         }}
//       />

//       {/* 2️⃣ Donate Blood */}
//       <Tabs.Screen
//         name="donate-blood"
//         options={{
//           title: "Donate Blood",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="heart-outline" size={size} color={color} />
//           ),
//         }}
//       />



//       {/* 4️⃣ Donate Cash */}
//       <Tabs.Screen
//         name="donate-cash"
//         options={{
//           title: "Donate Cash",
//           tabBarIcon: ({ color, size }) => (
//             <Ionicons name="cash-outline" size={size} color={color} />
//           ),
//         }}
//       />
//     </Tabs>
//   );
// }






// app/(tabs_donate)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Theme Colors - Red theme for donation
  const themeRed = '#dc2626';
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 65 : 70;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeRed,
        tabBarInactiveTintColor: '#6b7280',
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          position: 'absolute',
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
      {/* 1️⃣ Nearby Donors */}
      <Tabs.Screen
        name="nearby-donors"
        options={{
          title: "Nearby",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 2️⃣ Donate Blood */}
      <Tabs.Screen
        name="donate-blood"
        options={{
          title: "Donate Blood",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}