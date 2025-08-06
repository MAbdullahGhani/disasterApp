import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Cleaned-up version for better structure and usability
interface EmergencyContact {
    id: string;
    name: string;
    number: string;
    category: 'emergency' | 'disaster' | 'medical' | 'police' | 'fire' | 'utility' | 'government';
    description: string;
    province?: string;
    icon: keyof typeof Icon.glyphMap;
    color: string;
    available24x7: boolean;
  }
  
  // --- Emergency Contacts Data ---
  const emergencyContacts: EmergencyContact[] = [
    // National Emergency Services
    {
      id: '1',
      name: 'Rescue 1122',
      number: '1122',
      category: 'emergency',
      description: 'National Emergency Service - Fire, Ambulance, Rescue',
      icon: 'local-hospital',
      color: '#FF4444',
      available24x7: true,
    },
    {
      id: '2',
      name: 'Police Emergency',
      number: '15',
      category: 'police',
      description: 'Pakistan Police Emergency Helpline',
      icon: 'local-police',
      color: '#2196F3',
      available24x7: true,
    },
    {
      id: '3',
      name: 'Edhi Ambulance',
      number: '115',
      category: 'medical',
      description: 'Edhi Foundation Emergency Ambulance Service',
      icon: 'medical-services',
      color: '#4CAF50',
      available24x7: true,
    },
    
    // Disaster Management
    {
      id: '4',
      name: 'NDMA Emergency',
      number: '051-9205609',
      category: 'disaster',
      description: 'National Disaster Management Authority Emergency Line',
      icon: 'crisis-alert',
      color: '#FF9800',
      available24x7: true,
    },
    {
      id: '5',
      name: 'PDMA Punjab',
      number: '042-99203357',
      category: 'disaster',
      description: 'Punjab Disaster Management Authority',
      province: 'Punjab',
      icon: 'warning',
      color: '#FF9800',
      available24x7: true,
    },
    {
      id: '6',
      name: 'PDMA Sindh',
      number: '021-99206330',
      category: 'disaster',
      description: 'Sindh Disaster Management Authority',
      province: 'Sindh',
      icon: 'warning',
      color: '#FF9800',
      available24x7: true,
    },
    {
      id: '7',
      name: 'PDMA KPK',
      number: '091-9212264',
      category: 'disaster',
      description: 'KPK Disaster Management Authority',
      province: 'KPK',
      icon: 'warning',
      color: '#FF9800',
      available24x7: true,
    },
    {
      id: '8',
      name: 'PDMA Balochistan',
      number: '081-9202064',
      category: 'disaster',
      description: 'Balochistan Disaster Management Authority',
      province: 'Balochistan',
      icon: 'warning',
      color: '#FF9800',
      available24x7: true,
    },
  
    // Fire Services
    {
      id: '9',
      name: 'Fire Brigade Karachi',
      number: '16',
      category: 'fire',
      description: 'Karachi Metropolitan Corporation Fire Brigade',
      province: 'Sindh',
      icon: 'local-fire-department',
      color: '#F44336',
      available24x7: true,
    },
    {
      id: '10',
      name: 'Fire Brigade Lahore',
      number: '042-99258222',
      category: 'fire',
      description: 'Lahore Fire & Rescue Service',
      province: 'Punjab',
      icon: 'local-fire-department',
      color: '#F44336',
      available24x7: true,
    },
    {
      id: '11',
      name: 'Fire Brigade Islamabad',
      number: '051-9261111',
      category: 'fire',
      description: 'Capital Development Authority Fire Service',
      province: 'Islamabad',
      icon: 'local-fire-department',
      color: '#F44336',
      available24x7: true,
    },
  
    // Medical Emergency
    {
      id: '12',
      name: 'Chippa Ambulance',
      number: '1020',
      category: 'medical',
      description: 'Chippa Welfare Association Ambulance Service',
      icon: 'medical-services',
      color: '#4CAF50',
      available24x7: true,
    },
    {
      id: '13',
      name: 'Aman Ambulance',
      number: '021-111-111-343',
      category: 'medical',
      description: 'Aman Health Care Ambulance Service',
      province: 'Sindh',
      icon: 'medical-services',
      color: '#4CAF50',
      available24x7: true,
    },
    {
      id: '14',
      name: 'Red Crescent',
      number: '051-9250404',
      category: 'medical',
      description: 'Pakistan Red Crescent Society Emergency',
      icon: 'medical-services',
      color: '#4CAF50',
      available24x7: true,
    },
  
    // Utilities Emergency
    {
      id: '15',
      name: 'K-Electric Emergency',
      number: '118',
      category: 'utility',
      description: 'K-Electric Power Emergency Hotline',
      province: 'Sindh',
      icon: 'electrical-services',
      color: '#9C27B0',
      available24x7: true,
    },
    {
      id: '16',
      name: 'LESCO Emergency',
      number: '042-111-111-253',
      category: 'utility',
      description: 'Lahore Electric Supply Company Emergency',
      province: 'Punjab',
      icon: 'electrical-services',
      color: '#9C27B0',
      available24x7: true,
    },
    {
      id: '17',
      name: 'SSGC Emergency',
      number: '1199',
      category: 'utility',
      description: 'Sui Southern Gas Company Emergency',
      icon: 'local-gas-station',
      color: '#607D8B',
      available24x7: true,
    },
    {
      id: '18',
      name: 'WASA Emergency',
      number: '042-111-111-092',
      category: 'utility',
      description: 'Water & Sanitation Agency Emergency',
      province: 'Punjab',
      icon: 'water-drop',
      color: '#00BCD4',
      available24x7: true,
    },
  
    // Government Helplines
    {
      id: '19',
      name: 'PM Citizens Portal',
      number: '080-080-080',
      category: 'government',
      description: 'Prime Minister Citizens Portal Helpline',
      icon: 'account-balance',
      color: '#795548',
      available24x7: false,
    },
    {
      id: '20',
      name: 'Women Helpline',
      number: '1091',
      category: 'government',
      description: 'National Commission on Status of Women Helpline',
      icon: 'support',
      color: '#E91E63',
      available24x7: true,
    },
    {
      id: '21',
      name: 'Child Protection',
      number: '1121',
      category: 'government',
      description: 'Madadgaar National Child Protection Helpline',
      icon: 'child-care',
      color: '#FF5722',
      available24x7: true,
    },
    {
      id: '22',
      name: 'Cyber Crime FIA',
      number: '1991',
      category: 'government',
      description: 'FIA Cyber Crime Reporting Helpline',
      icon: 'security',
      color: '#3F51B5',
      available24x7: false,
    },
  ];
  
export default function EmergencyContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const filteredContacts = emergencyContacts.filter(contact => {
    const searchMatch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.number.includes(searchQuery);
    const categoryMatch = selectedCategory === 'all' || contact.category === selectedCategory;
    return searchMatch && categoryMatch;
  });

  const handleCall = (contact) => {
    Alert.alert(
      `Call ${contact.name}?`,
      `${contact.description}\n\nNumber: ${contact.number}${contact.available24x7 ? '\n🕐 Available 24/7' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL(`tel:${contact.number}`)
            .catch(() => Alert.alert('Error', 'Cannot make a phone call.'))
        }
      ]
    );
  };

  const categories = [
    { key: 'all', label: 'All', icon: 'apps', color: '#666' },
    { key: 'emergency', label: 'Emergency', icon: 'emergency', color: '#FF4444' },
    { key: 'disaster', label: 'Disaster', icon: 'warning', color: '#FF9800' },
    { key: 'medical', label: 'Medical', icon: 'local-hospital', color: '#4CAF50' },
    { key: 'police', label: 'Police', icon: 'local-police', color: '#2196F3' },
    { key: 'fire', label: 'Fire', icon: 'local-fire-department', color: '#F44336' },
    { key: 'utility', label: 'Utility', icon: 'electrical-services', color: '#9C27B0' },
    { key: 'government', label: 'Government', icon: 'account-balance', color: '#795548' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <Icon name="phone-in-talk" size={24} color="#FF4444" />
          <ThemedText type="title" style={styles.title}>Emergency Contacts</ThemedText>
          <ThemedText style={styles.subtitle}>Pakistan Emergency & Disaster Helplines</ThemedText>
        </ThemedView>

        {/* Search Bar */}
        <ThemedView style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <ThemedInput
            style={styles.searchInput}
            placeholder="Search..."
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
              <Icon name={c.icon} size={16} color={selectedCategory === c.key ? '#fff' : c.color} />
              <ThemedText style={[styles.categoryLabel, selectedCategory === c.key && { color: '#fff' }]}> {c.label} </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Quick Actions */}
        <ThemedView style={styles.quickRow}>
          {[0, 1, 2].map(i => (
            <TouchableOpacity key={i} onPress={() => handleCall(emergencyContacts[i])} style={styles.quickCard}>
              <Icon name={emergencyContacts[i].icon} size={24} color={emergencyContacts[i].color} />
              <ThemedText style={styles.quickText}>{emergencyContacts[i].name}</ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Emergency Contact Cards */}
        <ThemedView style={styles.contactList}>
          {filteredContacts.length === 0 ? (
            <ThemedText style={styles.emptyText}>No contacts found.</ThemedText>
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
                  <ThemedView style={styles.badge}><ThemedText style={styles.badgeText}>24/7</ThemedText></ThemedView>
                )}
              </TouchableOpacity>
            ))
          )}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

// Basic styles optimized for clarity and accessibility
// Replace the `styles` section with this version

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
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    cardDesc: { fontSize: 13, marginBottom: 6 },
    cardMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cardPhone: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    cardProvince: {
      fontSize: 12,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'center',
      marginLeft: 10,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    emptyText: { textAlign: 'center', paddingVertical: 40 },
  });
  

// Assume emergencyContacts is imported or declared above this file
