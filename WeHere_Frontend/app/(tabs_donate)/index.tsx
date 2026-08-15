// app/(tabs_donate)/index.tsx
import { Redirect } from 'expo-router';

export default function DonateIndex() {
  // Redirect to donate-blood as the default tab
  return <Redirect href="/(tabs_donate)/donate-blood" />;
}