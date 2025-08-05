import Sidebar from '@/components/SideBar';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { XMLParser } from 'fast-xml-parser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Constants ---
const PAKISTAN_BOUNDS = {
  minLat: 23.5, maxLat: 37.5,
  minLon: 60.5, maxLon: 77.5,
};
const ISLAMABAD_COORDS = { lat: 33.6844, lon: 73.0479 };

// --- Type Interfaces ---
interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  high: number;
  low: number;
  forecast: Array<{
    day: string;
    temp: string;
    condition: string;
  }>;
}

interface AlertType {
  id: string;
  type: 'seismic' | 'flood';
  title: string;
  magnitude?: number;
  location: string;
  time: string;
  severity: 'high' | 'moderate' | 'low';
  depth?: number;
  severityColor?: string;
  description?: string;
  link?: string;
}

interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Province
}

interface DisasterResource {
  id: string;
  title: string;
  description: string;
  source: string;
  lastUpdated: string;
  link: string;
  status: 'active' | 'warning' | 'normal';
}

// --- Main Component ---
export default function HomeScreen() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [seismicAlerts, setSeismicAlerts] = useState<AlertType[]>([]);
  const [floodAlerts, setFloodAlerts] = useState<AlertType[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [disasterResources, setDisasterResources] = useState<DisasterResource[]>([]);
  const { isAuthenticated, user } = useAuth();

  // --- Effects ---
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fixed: Reduced delay and added loading state for better UX
  useEffect(() => {
    if (searchQuery.length > 2) {
      // Reduced from 300ms to 150ms for faster response
      const handler = setTimeout(() => {
        fetchCitySuggestions(searchQuery);
      }, 150);
      return () => clearTimeout(handler);
    } else {
      setCitySuggestions([]);
      setLoadingSuggestions(false);
    }
  }, [searchQuery]);

  // --- Data Fetching ---
  const loadInitialData = async () => {
    setAlertsLoading(true);
    await Promise.all([
      requestLocationAndFetchWeather(),
      fetchSeismicData(),
      fetchFloodData(),
      loadDisasterResources(),
    ]);
    setAlertsLoading(false);
  };

  const loadDisasterResources = async () => {
    // Mock data for Pakistani disaster resources
    const resources: DisasterResource[] = [
      {
        id: '1',
        title: 'NDMA Pakistan',
        description: 'National Disaster Management Authority - Weather alerts and emergency updates',
        source: 'NDMA',
        lastUpdated: new Date().toLocaleDateString(),
        link: 'http://ndma.gov.pk/',
        status: 'active'
      },
      {
        id: '2',
        title: 'PMD Weather',
        description: 'Pakistan Meteorological Department - Current weather and forecasts',
        source: 'PMD',
        lastUpdated: new Date().toLocaleDateString(),
        link: 'https://www.pmd.gov.pk/en/',
        status: 'normal'
      },
      {
        id: '3',
        title: 'PDMA Emergency',
        description: 'Provincial Disaster Management - Local emergency response',
        source: 'PDMA',
        lastUpdated: new Date().toLocaleDateString(),
        link: 'https://www.pdma.gov.pk/',
        status: 'warning'
      },
      {
        id: '4',
        title: 'Rescue 1122',
        description: 'Emergency rescue services - Call 1122 for immediate help',
        source: 'Rescue Service',
        lastUpdated: new Date().toLocaleDateString(),
        link: 'https://rescue.gov.pk/',
        status: 'active'
      }
    ];
    
    setDisasterResources(resources);
  };

  const requestLocationAndFetchWeather = async () => {
    setLoadingWeather(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied. Using default location.');
        await fetchWeatherData(ISLAMABAD_COORDS.lat, ISLAMABAD_COORDS.lon, "Islamabad");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.Balanced 
      });
      const cityName = await getCityName(location.coords.latitude, location.coords.longitude);
      await fetchWeatherData(location.coords.latitude, location.coords.longitude, cityName);
    } catch (error) {
      console.error("Error getting location or city name:", error);
      await fetchWeatherData(ISLAMABAD_COORDS.lat, ISLAMABAD_COORDS.lon, "Islamabad");
    }
  };

  const getCityName = async (lat: number, lon: number): Promise<string> => {
    try {
      // Use English language parameter to ensure English response
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'DisasterReadyApp/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service error');
      }
      
      const data = await response.json();
      
      // Extract city name in English, with fallbacks
      const address = data.address || {};
      const cityName = address.city || address.town || address.village || 
                      address.municipality || address.county || 'Current Location';
      
      return cityName;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Current Location";
    }
  };

  const fetchWeatherData = async (lat: number, lon: number, city: string) => {
    setLoadingWeather(true);
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=Asia%2FKarachi`
      );
      
      if (!weatherRes.ok) {
        throw new Error('Weather API request failed');
      }
      
      const data = await weatherRes.json();

      const weather: WeatherData = {
        city,
        temp: Math.round(data.current_weather.temperature),
        condition: getWeatherCondition(data.current_weather.weathercode),
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        forecast: data.daily.time.slice(1, 5).map((day: string, i: number) => ({
          day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
          temp: `${Math.round(data.daily.temperature_2m_max[i + 1])}°/${Math.round(data.daily.temperature_2m_min[i + 1])}°`,
          condition: getWeatherCondition(data.daily.weathercode[i + 1]),
        })),
      };
      setWeatherData(weather);
    } catch (e) {
      console.error('Weather API Error:', e);
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  const fetchSeismicData = async () => {
    try {
      const res = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${PAKISTAN_BOUNDS.minLat}&maxlatitude=${PAKISTAN_BOUNDS.maxLat}&minlongitude=${PAKISTAN_BOUNDS.minLon}&maxlongitude=${PAKISTAN_BOUNDS.maxLon}&minmagnitude=3.0&orderby=time&limit=20`
      );
      const data = await res.json();

      const pakistanFeatures = data.features.filter((eq: any) => {
        const place = eq.properties.place.toLowerCase();
        return place.includes("pakistan") || place.includes("kashmir") || 
               place.includes("quetta") || place.includes("islamabad") || 
               place.includes("lahore") || place.includes("karachi") || 
               place.includes("gilgit") || place.includes("peshawar") || 
               place.includes("multan") || place.includes("skardu");
      });

      if (pakistanFeatures.length === 0) {
        setSeismicAlerts([]);
        return;
      }

      const parsed: AlertType[] = pakistanFeatures.slice(0, 5).map((eq: any) => ({
        id: eq.id,
        type: 'seismic',
        title: eq.properties.place,
        location: eq.properties.place,
        magnitude: eq.properties.mag,
        depth: eq.geometry.coordinates[2],
        time: getTimeAgo(new Date(eq.properties.time)),
        severity: eq.properties.mag >= 5 ? 'high' : eq.properties.mag >= 4 ? 'moderate' : 'low',
      }));

      setSeismicAlerts(parsed);
    } catch (err) {
      console.error('Earthquake API error:', err);
      setSeismicAlerts([]);
    }
  };

  const fetchFloodData = async () => {
    try {
      console.log('🌊 Starting simplified flood data fetch...');
      
      // Try direct fetch first, then fallback to mock data
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        // Try a simpler approach with just one proxy
        const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
        const targetUrl = 'https://www.gdacs.org/xml/rss.xml';
        
        const res = await fetch(proxyUrl + encodeURIComponent(targetUrl), {
          signal: controller.signal,
          headers: {
            'Accept': 'text/xml, application/xml, text/plain, */*',
            'User-Agent': 'DisasterApp/1.0'
          }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const xmlText = await res.text();

        if (!xmlText || xmlText.length < 100) {
          throw new Error('Invalid XML response');
        }

        const parser = new XMLParser({
          ignoreAttributes: false,
          parseAttributeValue: true,
          trimValues: true,
        });

        const xmlDoc = parser.parse(xmlText);
        let items = [];

        if (xmlDoc.rss?.channel?.item) {
          items = Array.isArray(xmlDoc.rss.channel.item) 
            ? xmlDoc.rss.channel.item 
            : [xmlDoc.rss.channel.item];
        }

        const floodItems = items
          .filter((item: any) => {
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            return title.includes('flood') || description.includes('flood');
          })
          .slice(0, 3)
          .map((item: any, index: number) => ({
            id: `flood_${Date.now()}_${index}`,
            type: 'flood' as const,
            title: item.title || `Flood Alert ${index + 1}`,
            description: (item.description || '').substring(0, 100) + '...',
            location: 'Various Regions',
            time: item.pubDate ? getTimeAgo(new Date(item.pubDate)) : 'Recent',
            severity: 'moderate' as const,
            severityColor: '#FFA500',
          }));

        if (floodItems.length > 0) {
          setFloodAlerts(floodItems);
          console.log(`✅ Successfully fetched ${floodItems.length} flood alerts`);
          return;
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log('❌ Direct fetch failed:', fetchError.message);
      }

      // Fallback to empty array if fetch fails
      console.log('⚠️ Using fallback: No flood data available');
      setFloodAlerts([]);

    } catch (error) {
      console.error('🚨 Flood data fetch completely failed:', error);
      setFloodAlerts([]);
    }
  };

  // Fixed: Added loading state and improved error handling
  const fetchCitySuggestions = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=8&language=en&format=json`
      );
      
      if (!res.ok) {
        throw new Error('Geocoding API error');
      }
      
      const data = await res.json();
      console.log('city data', data);
      
      if (data.results && data.results.length > 0) {
        setCitySuggestions(data.results);
      } else {
        setCitySuggestions([]);
      }
    } catch (error) {
      console.error("City suggestion error:", error);
      setCitySuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // --- Helper Functions ---
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    return `${Math.floor(seconds)} seconds ago`;
  };

  const getWeatherCondition = (code: number): string => {
    const conditionMap: { [key: number]: string } = { 
      0: 'Clear', 1: 'Clear', 2: 'Cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 
      51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain', 
      71: 'Snow', 73: 'Snow', 75: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Showers', 
      95: 'Thunderstorm', 99: 'Thunderstorm' 
    };
    return conditionMap[code] || 'Clear';
  };

  const getWeatherIcon = (condition: string): keyof typeof Icon.glyphMap => {
    const c = condition.toLowerCase();
    if (c.includes('sun') || c.includes('clear')) return 'wb-sunny';
    if (c.includes('cloud') || c.includes('fog')) return 'wb-cloudy';
    if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'grain';
    if (c.includes('snow')) return 'ac-unit';
    if (c.includes('thunder')) return 'flash-on';
    return 'wb-cloudy';
  };

  const getUserDisplayName = () => {
    if (!user) return 'A';
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'A';
  };

  // --- Event Handlers ---
  const handleSelectCity = (city: CitySuggestion) => {
    fetchWeatherData(city.latitude, city.longitude, city.name);
    setSearchQuery('');
    setCitySuggestions([]);
    setIsSearchVisible(false);
  };

  const handleResourcePress = (resource: DisasterResource) => {
    Alert.alert(
      resource.title,
      `${resource.description}\n\nWould you like to visit ${resource.source}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Visit Website', 
          onPress: () => Linking.openURL(resource.link).catch(err => 
            console.error('Error opening URL:', err)
          )
        }
      ]
    );
  };

  // --- Render Functions ---
  const renderHeader = () => (
    <View style={styles.header}>
      {isSearchVisible ? (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={() => {
            setIsSearchVisible(false);
            setSearchQuery('');
            setCitySuggestions([]);
          }}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ThemedText type="title">Disaster Ready</ThemedText>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSearchVisible(true)}>
              <Ionicons name="search-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={{ marginLeft: 15 }}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileIcon}
              onPress={() => setSidebarVisible(true)}
            >
              <ThemedText style={styles.profileText}>
                {getUserDisplayName()}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  // Fixed: Improved city suggestions rendering with better styling and loading states
  const renderCitySuggestions = () => {
    if (!isSearchVisible || searchQuery.length <= 2) {
      return null;
    }

    return (
      <View style={styles.suggestionsContainer}>
        {loadingSuggestions ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00BCD4" />
            <ThemedText style={styles.loadingText}>Searching cities...</ThemedText>
          </View>
        ) : citySuggestions.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="location-outline" size={24} color="#ccc" />
            <ThemedText style={styles.noResultsText}>No cities found</ThemedText>
          </View>
        ) : (
          <ScrollView 
            keyboardShouldPersistTaps="handled" 
            style={styles.suggestionsList}
            showsVerticalScrollIndicator={false}
          >
            {citySuggestions.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionIconContainer}>
                  <Ionicons name="location" size={18} color="#00BCD4" />
                </View>
                <View style={styles.suggestionContent}>
                  <ThemedText style={styles.suggestionName}>{city.name}</ThemedText>
                  <ThemedText style={styles.suggestionDetails}>
                    {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward-outline" size={16} color="#ccc" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderPakistaniResources = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Pakistani Resources
      </ThemedText>
      <View style={styles.resourcesGrid}>
        {disasterResources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            style={[
              styles.resourceCard,
              { borderLeftColor: resource.status === 'active' ? '#4CAF50' : 
                resource.status === 'warning' ? '#FF9800' : '#2196F3' }
            ]}
            onPress={() => handleResourcePress(resource)}
          >
            <View style={styles.resourceContent}>
              <View style={styles.resourceHeader}>
                <ThemedText style={styles.resourceTitle}>{resource.title}</ThemedText>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: resource.status === 'active' ? '#4CAF50' : 
                    resource.status === 'warning' ? '#FF9800' : '#2196F3' }
                ]}>
                  <ThemedText style={styles.statusText}>
                    {resource.status.toUpperCase()}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.resourceDescription} numberOfLines={1}>
                {resource.description}
              </ThemedText>
              <ThemedText style={styles.resourceSource}>
                {resource.source}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ThemedView>
  );

  const renderWeatherSection = () => (
    <ThemedView style={styles.section}>
      <View style={styles.weatherHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Weather Forecast</ThemedText>
        {weatherData?.city && <ThemedText style={styles.cityText}>{weatherData.city}</ThemedText>}
      </View>
      {loadingWeather ? (
        <ActivityIndicator size="large" color="#00BCD4" style={{ marginVertical: 40 }} />
      ) : !weatherData ? (
        <ThemedView style={styles.weatherCard}>
          <ThemedText>Could not fetch weather data. Please check your connection.</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.weatherCard}>
          <View style={styles.currentWeather}>
            <View style={styles.weatherInfo}>
              <Icon name={getWeatherIcon(weatherData.condition)} size={40} color="#00BCD4" />
              <View style={styles.weatherText}>
                <ThemedText style={styles.temperature}>{weatherData.temp}°C</ThemedText>
                <ThemedText style={styles.condition}>{weatherData.condition}</ThemedText>
              </View>
            </View>
            <View style={styles.weatherDetails}>
              <ThemedText style={styles.weatherDetail}>Today</ThemedText>
              <ThemedText style={styles.weatherDetail}>High: {weatherData.high}°C</ThemedText>
              <ThemedText style={styles.weatherDetail}>Low: {weatherData.low}°C</ThemedText>
            </View>
          </View>
          <View style={styles.forecastRow}>
            {weatherData.forecast.map((item, index) => (
              <View key={index} style={styles.forecastItem}>
                <ThemedText style={styles.forecastDay}>{item.day}</ThemedText>
                <Icon name={getWeatherIcon(item.condition)} size={20} color="#00BCD4" />
                <ThemedText style={styles.forecastTemp}>{item.temp}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>
      )}
    </ThemedView>
  );

  const renderAlertItem = (alert: AlertType) => (
    <ThemedView key={alert.id} style={styles.alertItem}>
      {alert.type === 'seismic' && (
        <View style={styles.alertContent}>
          <ThemedText style={styles.alertMagnitude}>{alert.magnitude?.toFixed(1)}</ThemedText>
          <ThemedText style={styles.alertMagnitudeLabel}>Mag</ThemedText>
        </View>
      )}
      <View style={styles.alertInfo}>
        <ThemedText style={styles.alertLocation} numberOfLines={2}>{alert.title}</ThemedText>
        <ThemedText style={styles.alertTime}>{alert.time}</ThemedText>
        {alert.depth && <ThemedText style={styles.alertDepth}>Depth: {alert.depth.toFixed(1)} km</ThemedText>}
      </View>
      <View style={[
        styles.severityBar, 
        { backgroundColor: alert.severity === 'high' ? '#FF5722' : 
          alert.severity === 'moderate' ? '#FF9800' : '#4CAF50' }
      ]} />
    </ThemedView>
  );

  const renderAlertsSection = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Critical Alerts</ThemedText>
      {alertsLoading ? (
        <ActivityIndicator size="large" color="#FF5722" style={{ marginVertical: 40 }} />
      ) : (
        <>
          <View style={styles.alertHeader}>
            <Icon name="timeline" size={20} color="#FF5722" />
            <ThemedText type="defaultSemiBold" style={styles.alertCategoryTitle}>
              Seismic Activity
            </ThemedText>
          </View>
          {seismicAlerts.length > 0 ? 
            seismicAlerts.map(renderAlertItem) : 
            <ThemedText style={styles.noAlertsText}>
              No significant seismic activity detected in Pakistan region recently.
            </ThemedText>
          }

          <View style={[styles.alertHeader, { marginTop: 20 }]}>
            <Icon name="waves" size={20} color="#2196F3" />
            <ThemedText type="defaultSemiBold" style={styles.alertCategoryTitle}>
              Flood Warnings
            </ThemedText>
          </View>
          {floodAlerts.length > 0 ? 
            floodAlerts.map(renderAlertItem) : 
            <ThemedText style={styles.noAlertsText}>
              No active flood warnings available at the moment.
            </ThemedText>
          }
        </>
      )}
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader()}
        {renderCitySuggestions()}
        
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />

        {!isSearchVisible && (
          <>
            {renderWeatherSection()}
            {renderPakistaniResources()}
            {renderAlertsSection()}
          </>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  profileText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
    color: '#333'
  },
  
  // Fixed: Improved suggestions container styling
  suggestionsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 250,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  suggestionIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  suggestionDetails: {
    fontSize: 13,
    color: '#666',
  },
  
  section: {
    padding: 20,
    backgroundColor: 'transparent'
  },
  sectionTitle: {
    marginBottom: 15
  },
  
  // Pakistani Resources Styles - Made smaller and more compact
  resourcesGrid: {
    gap: 10,
  },
  resourceCard: {
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 60,
  },
  resourceContent: {
    flex: 1,
  },
  resourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  resourceDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  resourceSource: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },

  // Weather Styles
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  cityText: {
    color: '#666',
    fontSize: 16
  },
  weatherCard: {
    borderRadius: 15,
    padding: 20,
    minHeight: 100
  },
  currentWeather: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  weatherText: {
    marginLeft: 15
  },
  temperature: {
    fontSize: 32,
    paddingTop: 5,
    fontWeight: 'bold'
  },
  condition: {
    fontSize: 16,
    textTransform: 'capitalize'
  },
  weatherDetails: {
    alignItems: 'flex-end'
  },
  weatherDetail: {
    fontSize: 14,
    marginBottom: 2,
    color: '#666'
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1
  },
  forecastDay: {
    fontSize: 12,
    marginBottom: 8,
    color: '#666'
  },
  forecastTemp: {
    fontSize: 12,
    marginTop: 8,
    color: '#666'
  },

  // Alert Styles
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  alertCategoryTitle: {
    fontSize: 16,
    marginLeft: 8
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  alertContent: {
    alignItems: 'center',
    marginRight: 15,
    width: 50
  },
  alertMagnitude: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722'
  },
  alertMagnitudeLabel: {
    fontSize: 12,
    color: '#666'
  },
  alertInfo: {
    flex: 1
  },
  alertLocation: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  alertTime: {
    fontSize: 12,
    color: '#666'
  },
  alertDepth: {
    fontSize: 11,
    color: '#999',
    marginTop: 2
  },
  severityBar: {
    width: 5,
    height: '100%',
    borderRadius: 3,
    marginLeft: 10,
    alignSelf: 'stretch'
  },
  noAlertsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20
  },
});