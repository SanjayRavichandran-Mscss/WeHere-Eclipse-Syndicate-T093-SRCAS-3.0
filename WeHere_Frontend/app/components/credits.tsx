import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Credits() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Health Credits</Text>
      </View>
      
      <View style={styles.balanceContainer}>
        <MaterialCommunityIcons name="molecule" size={60} color="#2e7d32" />
        <Text style={styles.balance}>1,250</Text>
        <Text style={styles.label}>Total Credits Earned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15 },
  balanceContainer: { alignItems: 'center', marginTop: 50 },
  balance: { fontSize: 48, fontWeight: 'bold', color: '#333', marginTop: 10 },
  label: { fontSize: 16, color: '#666' }
});