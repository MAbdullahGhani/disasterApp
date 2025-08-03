import { MaterialIcons as Icon, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { XMLParser } from 'fast-xml-parser';

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
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
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

  // --- Data for other sections ---
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: '1', task: 'Assemble an emergency kit', completed: false },
    { id: '2', task: 'Develop a family communication plan', completed: false },
    { id: '3', task: 'Secure heavy furniture', completed: false },
    { id: '4', task: 'Know evacuation routes', completed: false },
  ]);

  const [tasks] = useState([
    { id: '1', title: 'Complete Earthquake Safety Quiz', points: 150 },
    { id: '2', title: 'Attend First Aid Online Course', points: 200 },
  ]);

  // --- Effects ---
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2) {
      const handler = setTimeout(() => {
        fetchCitySuggestions(searchQuery);
      }, 300); // Debounce API calls
      return () => clearTimeout(handler);
    } else {
      setCitySuggestions([]);
    }
  }, [searchQuery]);

  // --- Data Fetching ---
  const loadInitialData = async () => {
    setAlertsLoading(true);
    await Promise.all([
      requestLocationAndFetchWeather(),
      fetchSeismicData(),
      fetchFloodData(),
    ]);
    setAlertsLoading(false);
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
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const cityName = await getCityName(location.coords.latitude, location.coords.longitude);
      await fetchWeatherData(location.coords.latitude, location.coords.longitude, cityName);
    } catch (error) {
      console.error("Error getting location or city name:", error);
      await fetchWeatherData(ISLAMABAD_COORDS.lat, ISLAMABAD_COORDS.lon, "Islamabad");
    }
  };

  const getCityName = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
        headers: {
          'User-Agent': 'DisasterReadyApp/1.0'
        }
      });
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text();
        console.error("Nominatim API returned a non-JSON response:", textResponse);
        throw new Error('Nominatim API error: Non-JSON response');
      }
      const data = await response.json();
      return data.address.city || data.address.town || data.address.village || 'Current Location';
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Current Location";
    }
  };

  const fetchWeatherData = async (lat: number, lon: number, city: string) => {
    setLoadingWeather(true);
    try {
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=Asia%2FKarachi`);
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
      const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${PAKISTAN_BOUNDS.minLat}&maxlatitude=${PAKISTAN_BOUNDS.maxLat}&minlongitude=${PAKISTAN_BOUNDS.minLon}&maxlongitude=${PAKISTAN_BOUNDS.maxLon}&minmagnitude=3.0&orderby=time&limit=20`);
      const data = await res.json();

      // Filter strictly for Pakistan-related entries only
      const pakistanFeatures = data.features.filter((eq: any) => {
        const place = eq.properties.place.toLowerCase();
        return place.includes("pakistan") || place.includes("kashmir") || place.includes("quetta") || place.includes("islamabad") || place.includes("lahore") || place.includes("karachi") || place.includes("gilgit") || place.includes("peshawar") || place.includes("multan") || place.includes("skardu");
      });

      if (pakistanFeatures.length === 0) {
        setSeismicAlerts([]);
        console.log("No seismic activity found in Pakistan.");
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
      console.log('🌊 Starting flood data fetch...');

      const proxyServices = [
        {
          url: 'https://api.allorigins.win/get?url=',
          type: 'json'
        },
        {
          url: 'https://api.codetabs.com/v1/proxy?quest=',
          type: 'text'
        },
        {
          url: 'https://cors-anywhere.herokuapp.com/',
          type: 'text'
        }
      ];

      const targetUrl = 'https://www.gdacs.org/xml/rss.xml';
      let xmlText = null;
      let successfulProxy = null;

      // Try each proxy service
      for (const proxyService of proxyServices) {
        try {
          console.log(`🔄 Trying proxy: ${proxyService.url}`);

          let fetchUrl;
          if (proxyService.url.includes('cors-anywhere.herokuapp.com')) {
            fetchUrl = proxyService.url + targetUrl;
          } else {
            fetchUrl = proxyService.url + encodeURIComponent(targetUrl);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

          const res = await fetch(fetchUrl, {
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'DisasterApp/1.0'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          // Handle different proxy response formats
          if (proxyService.type === 'json') {
            const data = await res.json();
            if (data.contents && data.contents.length > 0) {
              xmlText = data.contents;
              successfulProxy = proxyService.url;
              console.log("✅ Successfully fetched with JSON proxy");
              break;
            } else {
              throw new Error('Empty response from JSON proxy');
            }
          } else {
            const textData = await res.text();
            if (textData && textData.length > 0 && textData.includes('<?xml')) {
              xmlText = textData;
              successfulProxy = proxyService.url;
              console.log("✅ Successfully fetched with text proxy");
              break;
            } else {
              throw new Error('Invalid XML response from text proxy');
            }
          }

        } catch (proxyError) {
          console.log(`❌ Failed with ${proxyService.url}:`, proxyError.message);
          continue;
        }
      }

      // If all proxies failed, throw error
      if (!xmlText || xmlText.length === 0) {
        throw new Error('All proxy services failed to fetch flood data');
      }

      console.log(`📊 XML data length: ${xmlText.length} characters`);

      // Parse XML and extract flood data
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        trimValues: true,
        parseTrueNumberOnly: false
      });

      let xmlDoc;
      try {
        xmlDoc = parser.parse(xmlText);
      } catch (parseError) {
        console.error('❌ XML parsing failed:', parseError);
        throw new Error('Failed to parse XML data');
      }

      let items = [];

      // Handle different XML structures
      if (xmlDoc.rss?.channel?.item) {
        items = Array.isArray(xmlDoc.rss.channel.item)
          ? xmlDoc.rss.channel.item
          : [xmlDoc.rss.channel.item];
      } else if (xmlDoc.feed?.entry) {
        // Handle Atom feed format
        items = Array.isArray(xmlDoc.feed.entry)
          ? xmlDoc.feed.entry
          : [xmlDoc.feed.entry];
      }

      console.log(`🔍 Total items found: ${items.length}`);

      const floodData = [];
      const pakistanFloodData = [];
      const generalFloodData = [];

      // Process items and categorize flood events
      items.forEach((item, index) => {
        try {
          // Extract data with fallbacks for different XML structures
          const title = extractTextContent(item.title) || `Flood Alert ${index + 1}`;
          const description = extractTextContent(item.description) || extractTextContent(item.summary) || '';
          const pubDate = extractTextContent(item.pubDate) || extractTextContent(item.published) || null;
          const link = extractTextContent(item.link) || item.link?.['@_href'] || '';

          const titleLower = title.toLowerCase();
          const descLower = description.toLowerCase();
          const combinedText = (title + ' ' + description).toLowerCase();

          // Check if it's a flood event
          const isFloodEvent = titleLower.includes('flood') ||
            titleLower.includes('flooding') ||
            descLower.includes('flood') ||
            descLower.includes('flooding');

          if (isFloodEvent) {
            // Determine severity based on alert level keywords
            let severity = 'moderate';
            let severityColor = '#FFA500'; // Orange for moderate

            if (combinedText.includes('red') || combinedText.includes('extreme')) {
              severity = 'high';
              severityColor = '#FF4444';
            } else if (combinedText.includes('orange') || combinedText.includes('severe')) {
              severity = 'high';
              severityColor = '#FF6600';
            } else if (combinedText.includes('yellow') || combinedText.includes('moderate')) {
              severity = 'moderate';
              severityColor = '#FFD700';
            } else if (combinedText.includes('green') || combinedText.includes('minor')) {
              severity = 'low';
              severityColor = '#32CD32';
            }

            // Format date
            let formattedDate = 'Recent';
            if (pubDate) {
              try {
                const date = new Date(pubDate);
                if (!isNaN(date.getTime())) {
                  formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
              } catch (dateError) {
                console.warn('Date parsing failed:', dateError);
              }
            }

            // Extract location from title/description
            let location = 'Unknown Location';
            if (titleLower.includes('pakistan') || descLower.includes('pakistan')) {
              location = 'Pakistan';
            } else {
              // Try to extract country/region from text
              const locationMatch = combinedText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/);
              if (locationMatch) {
                location = locationMatch[1];
              }
            }

            const floodAlert = {
              id: `flood_${Date.now()}_${index}`,
              type: 'flood',
              title: title.trim(),
              description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
              location: location,
              time: formattedDate,
              severity: severity,
              severityColor: severityColor,
              source: 'GDACS',
              link: link,
              timestamp: Date.now()
            };

            // Prioritize Pakistan floods
            if (location === 'Pakistan') {
              pakistanFloodData.push(floodAlert);
            } else {
              generalFloodData.push(floodAlert);
            }
          }

        } catch (itemError) {
          console.warn(`⚠️ Error processing item ${index}:`, itemError);
        }
      });

      // Combine data with Pakistan floods first
      const combinedFloodData = [...pakistanFloodData];

      // Limit to top 5 most recent alerts
      const finalFloodData = combinedFloodData
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);

      console.log(`✅ Processed flood data: ${finalFloodData.length} alerts`);
      console.log('Pakistan specific floods:', pakistanFloodData.length);
      console.log('General floods:', generalFloodData.length);

      // Set the flood alerts state
      setFloodAlerts(finalFloodData);

      return {
        success: true,
        data: finalFloodData,
        pakistanAlerts: pakistanFloodData.length,
        totalAlerts: finalFloodData.length,
        source: successfulProxy
      };

    } catch (error) {
      console.error('🚨 Flood data fetch failed:', error);

      // Set fallback data or empty array
      const fallbackData = [
        {
          id: 'fallback_1',
          type: 'flood',
          title: 'Flood Monitoring Service Unavailable',
          description: 'Unable to fetch real-time flood data. Please check your internet connection.',
          location: 'Pakistan',
          time: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          severity: 'low',
          severityColor: '#808080',
          source: 'System',
          link: '',
          timestamp: Date.now()
        }
      ];

      setFloodAlerts(fallbackData);

      // Return error info
      return {
        success: false,
        error: error.message,
        data: fallbackData
      };
    }
  };

  // Helper function to extract text content from XML nodes
  const extractTextContent = (node) => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node['#text']) return node['#text'];
    if (node._text) return node._text;
    if (typeof node === 'object' && node.toString) return node.toString();
    return '';
  };

  const fetchCitySuggestions = async (query: string) => {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=en&format=json`);
      const data = await res.json();
      if (data.results) {
        setCitySuggestions(data.results);
      }
    } catch (error) {
      console.error("City suggestion error:", error);
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
    const conditionMap: { [key: number]: string } = { 0: 'Clear', 1: 'Clear', 2: 'Cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Rain', 71: 'Snow', 73: 'Snow', 75: 'Snow', 80: 'Showers', 81: 'Showers', 82: 'Showers', 95: 'Thunderstorm', 99: 'Thunderstorm' };
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

  // --- Event Handlers ---
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, completed: !item.completed } : item));
  };

  const handleSelectCity = (city: CitySuggestion) => {
    fetchWeatherData(city.latitude, city.longitude, city.name);
    setSearchQuery('');
    setCitySuggestions([]);
    setIsSearchVisible(false);
  };

  // --- Render Functions ---
  const renderHeader = () => (
    <ThemedView style={styles.header}>
      {isSearchVisible ? (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a city..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          <TouchableOpacity onPress={() => setIsSearchVisible(false)}>
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
            <View style={styles.profileIcon}>
              <ThemedText style={styles.profileText}>A</ThemedText>
            </View>
          </View>
        </>
      )}
    </ThemedView>
  );

  const renderCitySuggestions = () => {
    if (!isSearchVisible || searchQuery.length <= 2 || citySuggestions.length === 0) {
      return null;
    }

    return (
      <View style={styles.suggestionsContainer}>
        {citySuggestions.map((city) => (
          <TouchableOpacity 
            key={city.id} 
            style={styles.suggestionItem} 
            onPress={() => handleSelectCity(city)}
          >
            <ThemedText>{city.name}, {city.country}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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
          <ThemedText>Could not fetch weather data.</ThemedText>
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
      <View style={[styles.severityBar, { backgroundColor: alert.severity === 'high' ? '#FF5722' : alert.severity === 'moderate' ? '#FF9800' : '#4CAF50' }]} />
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
            <ThemedText type="defaultSemiBold" style={styles.alertCategoryTitle}>Seismic Activity</ThemedText>
          </View>
          {seismicAlerts.length > 0 ? seismicAlerts.map(renderAlertItem) : <ThemedText style={styles.noAlertsText}>No significant seismic activity detected in Pakistan region recently.</ThemedText>}

          <View style={[styles.alertHeader, { marginTop: 20 }]}>
            <Icon name="waves" size={20} color="#2196F3" />
            <ThemedText type="defaultSemiBold" style={styles.alertCategoryTitle}>Flood Warnings</ThemedText>
          </View>
          {floodAlerts.length > 0 ? floodAlerts.map(renderAlertItem) : <ThemedText style={styles.noAlertsText}>No active flood warnings reported for Pakistan by GDACS.</ThemedText>}
        </>
      )}
    </ThemedView>
  );

  const renderPrepareEarnSection = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>Prepare & Earn</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.subsectionTitle}>Your Checklist</ThemedText>
      {checklist.map(item => (
        <TouchableOpacity key={item.id} style={styles.checklistItem} onPress={() => toggleChecklistItem(item.id)}>
          <Icon name={item.completed ? 'check-circle' : 'radio-button-unchecked'} size={24} color={item.completed ? '#4CAF50' : '#E0E0E0'} />
          <ThemedText
            style={[
              styles.checklistText,
              { textDecorationLine: item.completed ? 'line-through' : 'none' },
              // Conditionally apply the color style only when the item is completed
              item.completed ? { color: '#999' } : {}
            ]}
          >
            {item.task}
          </ThemedText>
        </TouchableOpacity>
      ))}
      <ThemedText type="defaultSemiBold" style={[styles.subsectionTitle, { marginTop: 20 }]}>Tasks for Rewards</ThemedText>
      {tasks.map(task => (
        <TouchableOpacity key={task.id}>
          <ThemedView style={styles.taskItem}>
            <View style={styles.taskIcon}><Icon name="emoji-events" size={20} color="#FF9800" /></View>
            <View style={styles.taskInfo}>
              <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
              <ThemedText style={styles.taskPoints}>+{task.points} Points</ThemedText>
            </View>
            <Icon name="chevron-right" size={20} color="#999" />
          </ThemedView>
        </TouchableOpacity>
      ))}
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderCitySuggestions()}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {!isSearchVisible && (
          <>
            {renderWeatherSection()}
            {renderAlertsSection()}
            {renderPrepareEarnSection()}
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
    height: 40
  },
  suggestionsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  section: {
    padding: 20,
    backgroundColor: 'transparent'
  },
  sectionTitle: {
    marginBottom: 15
  },
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
  subsectionTitle: {
    fontSize: 16,
    marginBottom: 10
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  checklistText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10
  },
  taskIcon: {
    marginRight: 15
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2
  },
  taskPoints: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600'
  },
});