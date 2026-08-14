import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons, AntDesign, FontAwesome5 } from '@expo/vector-icons';

import AmbulanceNotifications from './ambulance-notifications';
import ImportantNotifications from './important-notifications';
import GeneralNotifications from './general-notifications';

type TabKey = 'ambulance' | 'important' | 'general';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: 'ambulance',
    label: 'Ambulance',
    icon: <FontAwesome5 name="ambulance" size={20} color="#111" />,
  },
  {
    key: 'important',
    label: 'Important',
    icon: <MaterialIcons name="notification-important" size={22} color="#111" />,
  },
  {
    key: 'general',
    label: 'General',
    icon: <AntDesign name="notification" size={20} color="#111" />,
  },
];

export default function NotificationScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('ambulance');
  const [ambulancePendingCount, setAmbulancePendingCount] = useState(0);
  const [importantCount, setImportantCount] = useState(0);

  const renderContent = () => {
    switch (activeTab) {
      case 'ambulance':
        return <AmbulanceNotifications onPendingCountChange={setAmbulancePendingCount} />;
      case 'important':
        return <ImportantNotifications onCountChange={setImportantCount} />;
      case 'general':
        return <GeneralNotifications />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          let count = 0;
          
          if (tab.key === 'ambulance') {
            count = ambulancePendingCount;
          } else if (tab.key === 'important') {
            count = importantCount;
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                {tab.icon}
                {count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: 8,
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#F0FDF4',
  },
  tabIconContainer: {
    marginBottom: 4,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabLabelActive: {
    color: '#166534',
    fontWeight: '700',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#16a34a',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#dc2626',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
});