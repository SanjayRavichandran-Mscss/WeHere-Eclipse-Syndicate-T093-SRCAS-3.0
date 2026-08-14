import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import {
  getLocalContacts,
  upsertLocalContact,
  deleteLocalContact,
  syncContacts,
  EmergencyContact,
  getSyncStatus,
  initializeOfflineDB,
} from '../../../services/offlineSyncService';

interface EmergencyContactsManagerProps {
  userId: number;
  isEditMode: boolean;
  onContactsUpdate?: (count: number) => void;
}

const COUNTRY_CODES = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'UAE', code: '+971', flag: '🇦🇪' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
];

export default function EmergencyContactsManager({ 
  userId, 
  isEditMode,
  onContactsUpdate 
}: EmergencyContactsManagerProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [phoneContacts, setPhoneContacts] = useState<Contacts.Contact[]>([]);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_number: '',
    country_code: '+91',
  });

  // Initialize database and load contacts on mount
  useEffect(() => {
    initializeAndLoad();
  }, [userId]);

  const initializeAndLoad = async () => {
    try {
      setIsInitializing(true);
      console.log('📱 Initializing offline database...');
      await initializeOfflineDB();
      console.log('✅ Database initialized, loading contacts...');
      await loadContacts();
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      Alert.alert('Error', 'Failed to initialize offline database');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadContacts = async () => {
    try {
      setLoading(true);
      console.log(`📂 Loading contacts for user: ${userId}`);
      const localContacts = await getLocalContacts(userId);
      setContacts(localContacts);
      console.log(`✅ Loaded ${localContacts.length} contacts`);
      
      const status = await getSyncStatus(userId);
      setSyncStatus(status);
      console.log('📊 Sync status:', status);
      
      if (onContactsUpdate) {
        onContactsUpdate(localContacts.length);
      }
    } catch (error) {
      console.error('❌ Failed to load contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered');
      const result = await syncContacts(userId);
      if (result.success) {
        await loadContacts();
        Alert.alert('Success', 'Contacts synced successfully');
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('❌ Refresh error:', error);
      Alert.alert('Error', 'Failed to sync contacts');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddContact = () => {
    setFormData({
      contact_name: '',
      contact_number: '',
      country_code: selectedCountry.code,
    });
    setEditingContact(null);
    setShowAddModal(true);
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setFormData({
      contact_name: contact.contact_name,
      contact_number: contact.contact_number,
      country_code: contact.country_code || '+91',
    });
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const handleSaveContact = async () => {
    if (!formData.contact_name.trim() || !formData.contact_number.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      const contactData: EmergencyContact = {
        id: editingContact?.id,
        contact_name: formData.contact_name.trim(),
        contact_number: formData.contact_number.trim(),
        country_code: formData.country_code,
      };

      console.log('💾 Saving contact:', contactData);
      await upsertLocalContact(userId, contactData);
      await loadContacts();
      
      // Try to sync immediately
      console.log('🔄 Syncing after save...');
      await syncContacts(userId);
      
      setShowAddModal(false);
      Alert.alert('Success', 'Contact saved successfully');
    } catch (error) {
      console.error('❌ Failed to save contact:', error);
      Alert.alert('Error', 'Failed to save contact');
    }
  };

  const handleDeleteContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.contact_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!contact.id) return;
              console.log(`🗑️ Deleting contact: ${contact.id}`);
              await deleteLocalContact(userId, contact.id);
              await loadContacts();
              await syncContacts(userId);
              Alert.alert('Success', 'Contact deleted successfully');
            } catch (error) {
              console.error('❌ Failed to delete contact:', error);
              Alert.alert('Error', 'Failed to delete contact');
            }
          }
        }
      ]
    );
  };

  const requestContactsPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        {
          title: 'Contacts Permission',
          message: 'WeHere needs access to your contacts to add emergency contacts.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  };

  const importFromContacts = async () => {
    try {
      const hasPermission = await requestContactsPermission();
      if (!hasPermission) {
        Alert.alert('Permission Denied', 'Cannot access contacts without permission.');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found in your phone.');
        return;
      }

      const contactsWithNumbers = data.filter(
        contact => contact.phoneNumbers && contact.phoneNumbers.length > 0
      );
      
      if (contactsWithNumbers.length === 0) {
        Alert.alert('No Contacts', 'No contacts with phone numbers found.');
        return;
      }

      setPhoneContacts(contactsWithNumbers);
      setSelectedContacts(new Set());
      setShowContactPicker(true);
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      Alert.alert('Error', 'Failed to fetch contacts.');
    }
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const importSelectedContacts = async () => {
    const selected = phoneContacts.filter(
      contact => contact.id && selectedContacts.has(contact.id)
    );

    if (selected.length === 0) {
      Alert.alert('No Selection', 'Please select at least one contact.');
      return;
    }

    try {
      for (const contact of selected) {
        const phoneNumber = contact.phoneNumbers?.[0]?.number || '';
        const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
        
        let countryCode = '+91';
        let number = cleaned;
        
        for (const country of COUNTRY_CODES) {
          if (cleaned.startsWith(country.code.replace('+', ''))) {
            countryCode = country.code;
            number = cleaned.substring(country.code.length - 1);
            break;
          }
        }

        await upsertLocalContact(userId, {
          contact_name: contact.name || 'Unknown',
          contact_number: number,
          country_code: countryCode,
        });
      }

      await loadContacts();
      await syncContacts(userId);
      setShowContactPicker(false);
      Alert.alert('Success', `${selected.length} contact(s) imported successfully!`);
    } catch (error) {
      console.error('❌ Failed to import contacts:', error);
      Alert.alert('Error', 'Failed to import contacts');
    }
  };

  const renderContactItem = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.contact_name}</Text>
        <Text style={styles.contactNumber}>
          {item.country_code} {item.contact_number}
        </Text>
      </View>
      {isEditMode && (
        <View style={styles.contactActions}>
          <TouchableOpacity
            onPress={() => handleEditContact(item)}
            style={styles.actionButton}
          >
            <Ionicons name="pencil-outline" size={20} color="#2e7d32" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteContact(item)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isInitializing || loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#2e7d32" />
        <Text style={styles.loaderText}>
          {isInitializing ? 'Initializing database...' : 'Loading contacts...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Sync Status */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="call-outline" size={18} color="#2e7d32" />
          <Text style={styles.headerTitle}>Emergency Contacts</Text>
          <Text style={styles.contactCount}>({contacts.length})</Text>
        </View>
        {isEditMode && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={importFromContacts} style={styles.importButton}>
              <Ionicons name="people-outline" size={18} color="#2e7d32" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddContact} style={styles.addButton}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Sync Status Bar */}
      {syncStatus && (
        <View style={styles.statusBar}>
          <Ionicons
            name={syncStatus.isSynced ? 'checkmark-circle' : 'sync-outline'}
            size={14}
            color={syncStatus.isSynced ? '#2e7d32' : '#f59e0b'}
          />
          <Text style={styles.statusText}>
            {syncStatus.isSynced 
              ? `Last synced: ${new Date(syncStatus.lastSync).toLocaleString()}`
              : 'Not synced yet'}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.syncNowButton}>
            <Ionicons name="refresh-outline" size={14} color="#2e7d32" />
          </TouchableOpacity>
        </View>
      )}

      {/* Contact List */}
      {contacts.length > 0 ? (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderContactItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="call-outline" size={32} color="#ccc" />
          <Text style={styles.emptyText}>No emergency contacts</Text>
          {isEditMode && (
            <TouchableOpacity onPress={handleAddContact} style={styles.emptyAddButton}>
              <Text style={styles.emptyAddButtonText}>Add your first contact</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Add/Edit Contact Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.input}
                value={formData.contact_name}
                onChangeText={(text) => setFormData({ ...formData, contact_name: text })}
                placeholder="Enter contact name"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity 
                  style={styles.countryCodeButton}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <Text style={styles.countryCodeText}>{formData.country_code}</Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                <TextInput
                  style={styles.phoneInput}
                  value={formData.contact_number}
                  onChangeText={(text) => setFormData({ ...formData, contact_number: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveContact}
              >
                <Text style={styles.saveButtonText}>
                  {editingContact ? 'Update' : 'Add'} Contact
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country Picker Modal */}
      <Modal visible={countryPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryPickerVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryRow}
                  onPress={() => {
                    setFormData({ ...formData, country_code: item.code });
                    setSelectedCountry(item);
                    setCountryPickerVisible(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryCodeText}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={showContactPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Contacts</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSubHeader}>
              <Text style={styles.modalSubText}>
                {selectedContacts.size} contact(s) selected
              </Text>
              <TouchableOpacity
                style={styles.importSelectedBtn}
                onPress={importSelectedContacts}
              >
                <Text style={styles.importSelectedText}>Import Selected</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={phoneContacts}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => item.id && toggleContactSelection(item.id)}
                >
                  <View style={styles.checkboxContainer}>
                    {item.id && selectedContacts.has(item.id) ? (
                      <Ionicons name="checkbox" size={22} color="#2e7d32" />
                    ) : (
                      <Ionicons name="square-outline" size={22} color="#999" />
                    )}
                  </View>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactAvatarText}>
                      {item.name ? item.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactNameText}>{item.name || 'Unknown'}</Text>
                    <Text style={styles.contactPhoneText}>
                      {item.phoneNumbers && item.phoneNumbers.length > 0
                        ? item.phoneNumbers[0].number
                        : 'No number'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eceff1',
    marginBottom: 10,
    overflow: 'hidden',
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1b5e20',
    marginLeft: 8,
  },
  contactCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  addButton: {
    backgroundColor: '#2e7d32',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    marginLeft: 6,
  },
  syncNowButton: {
    padding: 4,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111',
  },
  contactNumber: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  emptyAddButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
  },
  emptyAddButtonText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1b5e20',
  },
  modalBody: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    gap: 4,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  saveButton: {
    backgroundColor: '#2e7d32',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSubText: {
    fontSize: 14,
    color: '#666',
  },
  importSelectedBtn: {
    backgroundColor: '#2e7d32',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  importSelectedText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2e7d32',
  },
  contactNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  contactPhoneText: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  countryName: {
    flex: 1,
    fontSize: 14,
    color: '#111',
  },
});