// import { Stack } from 'expo-router';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { initializeOfflineDB } from '../services/offlineSyncService';
// import { useEffect } from 'react';


// export default function RootLayout() {
//    useEffect(() => {
//     // Initialize offline database when app starts
//     initializeOfflineDB().catch(error => {
//       console.error('Failed to initialize offline database:', error);
//     });
//   }, []);
//   return (
//     <SafeAreaProvider>
//       <Stack
//         screenOptions={{
//           headerShown: false,
//           contentStyle: { backgroundColor: '#ffffff' },
//         }}
//       />
//     </SafeAreaProvider>
//   );
// }


// app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <Stack
        screenOptions={{
          headerShown: false, // Hide all headers globally
        }}
      >
        {/* Main tabs - no header */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />
        
        {/* SingleProfile screen - header hidden, custom back button in component */}
        <Stack.Screen 
          name="SingleProfile" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
        
        {/* Feedback screen - if you have it */}
        <Stack.Screen 
          name="Feedback" 
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }} 
        />
      </Stack>
    </GestureHandlerRootView>
  );
}