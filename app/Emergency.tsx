// EmergencyContactsScreen.tsx

import { CustomCallAlert } from '@/components/CustomCallAlert';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


type SelectedContact = EmergencyContact | null;

export interface EmergencyContact {
  id: string;
  name: string; // Will be populated from locale
  number: string;
  category: 'emergency' | 'disaster' | 'medical' | 'police' | 'fire' | 'utility' | 'government';
  description: string; // Will be populated from locale
  province?: string;
  icon: keyof typeof Icon.glyphMap;
  color: string;
  available24x7: boolean;
}

// This array now contains only the data that DOES NOT change with language.
export const staticEmergencyContacts = [
  // National Emergency Services
  { id: '1', number: '1122', category: 'emergency', icon: 'local-hospital', color: '#FF4444', available24x7: true },
  { id: '2', number: '15', category: 'police', icon: 'local-police', color: '#2196F3', available24x7: true },
  { id: '3', number: '115', category: 'medical', icon: 'medical-services', color: '#4CAF50', available24x7: true },
  
  // Disaster Management
  { id: '4', number: '051-9205609', category: 'disaster', icon: 'crisis-alert', color: '#FF9800', available24x7: true },
  { id: '5', number: '1129', category: 'disaster', province: 'Provincial', icon: 'warning', color: '#FF9800', available24x7: true },

  // Fire Services
  { id: '6', number: '16', category: 'fire', province: 'Sindh', icon: 'local-fire-department', color: '#F44336', available24x7: true },
  { id: '7', number: '042-99258222', category: 'fire', province: 'Punjab', icon: 'local-fire-department', color: '#F44336', available24x7: true },
  { id: '8', number: '051-9261111', category: 'fire', province: 'Islamabad', icon: 'local-fire-department', color: '#F44336', available24x7: true },

  // Medical Emergency
  { id: '9', number: '1020', category: 'medical', icon: 'medical-services', color: '#4CAF50', available24x7: true },
  { id: '10', number: '021-111-111-343', category: 'medical', province: 'Sindh', icon: 'medical-services', color: '#4CAF50', available24x7: true },
  { id: '11', number: '051-9250404', category: 'medical', icon: 'medical-services', color: '#4CAF50', available24x7: true },

  // Utilities Emergency
  { id: '12', number: '118', category: 'utility', province: 'Sindh', icon: 'electrical-services', color: '#9C27B0', available24x7: true },
  { id: '13', number: '042-111-111-253', category: 'utility', province: 'Punjab', icon: 'electrical-services', color: '#9C27B0', available24x7: true },
  { id: '14', number: '1199', category: 'utility', icon: 'local-gas-station', color: '#607D8B', available24x7: true },
  { id: '15', number: '042-111-111-092', category: 'utility', province: 'Punjab', icon: 'water-drop', color: '#00BCD4', available24x7: true },

  // Government Helplines
  { id: '16', number: '080-080-080', category: 'government', icon: 'account-balance', color: '#795548', available24x7: false },
  { id: '17', number: '1091', category: 'government', icon: 'support', color: '#E91E63', available24x7: true },
  { id: '18', number: '1121', category: 'government', icon: 'child-care', color: '#FF5722', available24x7: true },
  { id: '19', number: '1991', category: 'government', icon: 'security', color: '#3F51B5', available24x7: false },
];

export default function EmergencyContactsScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAlertVisible, setAlertVisible] = useState(false);
  const [selectedContact, setSelectedContact] = useState<SelectedContact>(null);
  const { t } = useTranslation();

  // Combine static data with translated text
  const emergencyContacts: EmergencyContact[] = useMemo(() => {
    // 1. Fetch the entire 'contacts' object from your JSON translations.
    // The `{ returnObjects: true }` option ensures you get the object, not a string.
    const translatedContacts = t('contacts', { returnObjects: true }) as { [key: string]: { name: string; description: string } };
    
    // 2. Map over your static data and merge it with the translated text.
    return staticEmergencyContacts.map(contact => {
      const translated = translatedContacts[contact.id] || {};
      return {
        ...contact,
        name: translated.name || `Contact ${contact.id}`, // Fallback name
        description: translated.description || 'No description', // Fallback description
      };
    });
  }, [t]); // Add `t` to dependency array to update on language change

  const handleCall = (contact: EmergencyContact) => {
    setSelectedContact(contact);
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    setSelectedContact(null);
  };

  const filteredContacts = emergencyContacts.filter(contact => {
    const searchMatch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.number.includes(searchQuery);
    const categoryMatch = selectedCategory === 'all' || contact.category === selectedCategory;
    return searchMatch && categoryMatch;
  });

  const categories = useMemo(() => [
    { key: 'all', label: t('emergencyCategories.all'), icon: 'apps', color: '#666' },
    { key: 'emergency', label: t('emergencyCategories.emergency'), icon: 'emergency', color: '#FF4444' },
    { key: 'disaster', label: t('emergencyCategories.disaster'), icon: 'warning', color: '#FF9800' },
    { key: 'medical', label: t('emergencyCategories.medical'), icon: 'local-hospital', color: '#4CAF50' },
    { key: 'police', label: t('emergencyCategories.police'), icon: 'local-police', color: '#2196F3' },
    { key: 'fire', label: t('emergencyCategories.fire'), icon: 'local-fire-department', color: '#F44336' },
    { key: 'utility', label: t('emergencyCategories.utility'), icon: 'electrical-services', color: '#9C27B0' },
    { key: 'government', label: t('emergencyCategories.government'), icon: 'account-balance', color: '#795548' },
  ], [t]); // Add `t` to dependency array

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView style={{ position: 'absolute', left: 16, top: 16, zIndex: 10 }}>
          <TouchableOpacity onPress={() => { if (typeof navigation !== 'undefined' && navigation.goBack) { navigation.goBack(); } }}>
            <Ionicons name="arrow-back" size={24} color="#aaa" />
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.header}>
          <Icon name="phone-in-talk" size={24} color="#FF4444" />
          <ThemedText type="title" style={styles.title}>{t('screenTitle')}</ThemedText>
          <ThemedText style={styles.subtitle}>{t('subtitle')}</ThemedText>
        </ThemedView>

        {/* Search Bar */}
        <ThemedView style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <ThemedInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#aaa"
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#aaa" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {/* Category Filter */}
        <ScrollView horizontal contentContainerStyle={styles.categoryList} showsHorizontalScrollIndicator={false}>
          {categories.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.categoryButton, selectedCategory === c.key && { backgroundColor: c.color }]}
              onPress={() => setSelectedCategory(c.key)}
            >
              <Icon name={c.icon as any} size={16} color={selectedCategory === c.key ? '#fff' : c.color} />
              <ThemedText style={[styles.categoryLabel, selectedCategory === c.key && { color: '#fff' }]}> {c.label} </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <ThemedView style={styles.quickRow}>
          {emergencyContacts.length >= 3 && [0, 1, 2].map(i => (
            <TouchableOpacity key={i} onPress={() => handleCall(emergencyContacts[i])} style={styles.quickCard}>
              <Icon name={emergencyContacts[i].icon} size={24} color={emergencyContacts[i].color} />
              <ThemedText style={styles.quickText}>{emergencyContacts[i].name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Emergency Contact Cards */}
        <ThemedView style={styles.contactList}>
          {filteredContacts.length === 0 ? (
            <ThemedText style={styles.emptyText}>{t('common.noContactsFound', 'No contacts found.')}</ThemedText>
          ) : (
            filteredContacts.map(contact => (
              <TouchableOpacity key={contact.id} onPress={() => handleCall(contact)} style={styles.contactCard}>
                <ThemedView style={styles.cardLeft}>
                  <ThemedView style={[styles.iconCircle, { backgroundColor: contact.color + '22' }]}>
                    <Icon name={contact.icon} size={20} color={contact.color} />
                  </ThemedView>
                </ThemedView>
                <ThemedView style={styles.cardContent}>
                  <ThemedText style={styles.cardTitle}>{contact.name}</ThemedText>
                  <ThemedText style={styles.cardDesc}>{contact.description}</ThemedText>
                  <ThemedView style={styles.cardMeta}>
                    <ThemedText style={styles.cardPhone}>{contact.number}</ThemedText>
                    {contact.province && <ThemedText style={styles.cardProvince}>{contact.province}</ThemedText>}
                  </ThemedView>
                </ThemedView>
                {contact.available24x7 && (
                  <ThemedView style={styles.badge}><ThemedText style={styles.badgeText}>{t('badge247')}</ThemedText></ThemedView>
                )}
              </TouchableOpacity>
            ))
          )}
        </ThemedView>
      </ScrollView>

      {selectedContact && (
        <CustomCallAlert
          isVisible={isAlertVisible}
          onClose={handleCloseAlert}
          title={t('alerts.call.title', { name: selectedContact.name, defaultValue: `Call ${selectedContact.name}?` })}
          message={`${selectedContact.description}\n${t('alerts.call.message', { number: selectedContact.number, defaultValue: `Number: ${selectedContact.number}` })}`}
          buttons={[
            {
              text: t('cancelButton'),
              onPress: () => {},
              style: 'cancel',
            },
            {
              text: t('callButton'),
              onPress: () => Linking.openURL(`tel:${selectedContact.number}`)
                .catch(() => {
                  console.error("Failed to open phone dialer.");
                }),
            },
          ]}
        />
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    header: { alignItems: 'center', padding: 20 },
    title: { marginTop: 8 },
    subtitle: { fontSize: 14, textAlign: 'center', marginTop: 4 },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      marginHorizontal: 20,
      marginBottom: 10,
      marginTop: 10,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 14,
      color: '#000' // Example color
    },
    categoryList: { paddingHorizontal: 20, gap: 8 },
    categoryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 20,
      marginRight: 10,
    },
    categoryLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginLeft: 6,
    },
    quickRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginVertical: 15,
      paddingHorizontal: 10,
    },
    quickCard: {
      alignItems: 'center',
      padding: 10,
      borderRadius: 10,
      width: 100,
    },
    quickText: {
      fontSize: 12,
      textAlign: 'center',
      marginTop: 6,
    },
    contactList: {
      paddingHorizontal: 20,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 15,
      marginBottom: 12,
      borderRadius: 12,
    },
    cardLeft: { marginRight: 15 },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardContent: { flex: 1, backgroundColor: 'transparent' },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2},
    cardDesc: { fontSize: 13, marginBottom: 6 },
    cardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: 'transparent'
    },
    cardPhone: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    cardProvince: {
      fontSize: 12,
    },
    badge: {
      backgroundColor: '#4CAF50', // Example color
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginLeft: 10,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    emptyText: { textAlign: 'center', paddingVertical: 40},
});