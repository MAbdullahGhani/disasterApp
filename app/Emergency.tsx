import { ThemedText } from '@/components/ThemedText';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Type Interfaces ---
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
    icon: 'ambulance',
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

// --- Main Component ---
export default function EmergencyContactsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // --- Helper Functions ---
  const filteredContacts = emergencyContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.number.includes(searchQuery);
    
    const matchesCategory = selectedCategory === 'all' || contact.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { key: 'all', label: 'All', icon: 'apps', color: '#666' },
    { key: 'emergency', label: 'Emergency', icon: 'emergency', color: '#FF4444' },
    { key: 'disaster', label: 'Disaster', icon: 'warning', color: '#FF9800' },
    { key: 'medical', label: 'Medical', icon: 'local-hospital', color: '#4CAF50' },
    { key: 'police', label: 'Police', icon: 'local-police', color: '#2196F3' },
    { key: 'fire', label: 'Fire', icon: 'local-fire-department', color: '#F44336' },
    { key: 'utility', label: 'Utilities', icon: 'build', color: '#9C27B0' },
    { key: 'government', label: 'Government', icon: 'account-balance', color: '#795548' },
  ];

  // --- Event Handlers ---
  const handleCall = (contact: EmergencyContact) => {
    const phoneNumber = `tel:${contact.number}`;
    
    Alert.alert(
      `Call ${contact.name}?`,
      `${contact.description}\n\nNumber: ${contact.number}${contact.available24x7 ? '\n🕐 Available 24/7' : '\n⏰ Business hours only'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Call Now', 
          style: 'default',
          onPress: () => {
            Linking.openURL(phoneNumber).catch(err => {
              Alert.alert('Error', 'Unable to make phone call. Please dial manually.');
              console.error('Error making phone call:', err);
            });
          }
        }
      ]
    );
  };

  // --- Render Functions ---
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Icon name="phone-in-talk" size={24} color="#FF4444" />
          <ThemedText type="title" style={styles.headerTitle}>Emergency Contacts</ThemedText>
        </View>
        <ThemedText style={styles.headerSubtitle}>Pakistan Emergency & Disaster Helplines</ThemedText>
      </View>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search emergency contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && [
                styles.categoryButtonActive,
                { backgroundColor: category.color }
              ]
            ]}
            onPress={() => setSelectedCategory(category.key)}
          >
            <Icon 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.key ? 'white' : category.color} 
            />
            <ThemedText 
              style={[
                styles.categoryLabel,
                selectedCategory === category.key && styles.categoryLabelActive
              ]}
            >
              {category.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderEmergencyContact = (contact: EmergencyContact) => (
    <TouchableOpacity
      key={contact.id}
      style={styles.contactCard}
      onPress={() => handleCall(contact)}
      activeOpacity={0.7}
    >
      <View style={styles.contactContent}>
        <View style={[styles.contactIcon, { backgroundColor: contact.color + '15' }]}>
          <Icon name={contact.icon} size={24} color={contact.color} />
        </View>
        
        <View style={styles.contactInfo}>
          <View style={styles.contactHeader}>
            <ThemedText style={styles.contactName}>{contact.name}</ThemedText>
            {contact.available24x7 && (
              <View style={styles.availabilityBadge}>
                <ThemedText style={styles.availabilityText}>24/7</ThemedText>
              </View>
            )}
          </View>
          
          <ThemedText style={styles.contactDescription} numberOfLines={2}>
            {contact.description}
          </ThemedText>
          
          <View style={styles.contactFooter}>
            <ThemedText style={styles.contactNumber}>{contact.number}</ThemedText>
            {contact.province && (
              <ThemedText style={styles.contactProvince}>{contact.province}</ThemedText>
            )}
          </View>
        </View>
        
        <View style={styles.callButton}>
          <Icon name="phone" size={20} color={contact.color} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="search-off" size={48} color="#ccc" />
      <ThemedText style={styles.emptyStateText}>No contacts found</ThemedText>
      <ThemedText style={styles.emptyStateSubtext}>
        Try adjusting your search or category filter
      </ThemedText>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <ThemedText style={styles.quickActionsTitle}>Quick Actions</ThemedText>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: '#FF4444' }]}
          onPress={() => handleCall(emergencyContacts[0])} // Rescue 1122
        >
          <Icon name="local-hospital" size={20} color="#FF4444" />
          <ThemedText style={styles.quickActionText}>Emergency</ThemedText>
          <ThemedText style={styles.quickActionNumber}>1122</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: '#2196F3' }]}
          onPress={() => handleCall(emergencyContacts[1])} // Police
        >
          <Icon name="local-police" size={20} color="#2196F3" />
          <ThemedText style={styles.quickActionText}>Police</ThemedText>
          <ThemedText style={styles.quickActionNumber}>15</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionCard, { borderLeftColor: '#4CAF50' }]}
          onPress={() => handleCall(emergencyContacts[2])} // Edhi
        >
          <Icon name="ambulance" size={20} color="#4CAF50" />
          <ThemedText style={styles.quickActionText}>Ambulance</ThemedText>
          <ThemedText style={styles.quickActionNumber}>115</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {renderHeader()}
        {renderSearchBar()}
        {renderCategoryFilter()}
        {renderQuickActions()}
        
        <View style={styles.contactsSection}>
          <ThemedText style={styles.sectionTitle}>
            All Emergency Contacts ({filteredContacts.length})
          </ThemedText>
          
          {filteredContacts.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.contactsList}>
              {filteredContacts.map(renderEmergencyContact)}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerTitle: {
    marginLeft: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Search Bar
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Category Filter
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categoryScroll: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  categoryButtonActive: {
    backgroundColor: '#FF4444',
  },
  categoryLabel: {
    fontSize: 12,
    marginLeft: 5,
    color: '#666',
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: 'white',
  },
  
  // Quick Actions
  quickActionsContainer: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    marginBottom: 2,
  },
  quickActionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  
  // Contacts Section
  contactsSection: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  contactsList: {
    gap: 12,
  },
  
  // Contact Card
  contactCard: {
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  availabilityBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availabilityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  contactDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  contactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  contactProvince: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
});