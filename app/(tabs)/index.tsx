// HomeScreen.tsx - Fixed and Complete Location-Based Alerts Integration
import Sidebar from "@/components/SideBar";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import useDebouncedSearch from "@/hooks/useDebounce";
import { MaterialIcons as Icon, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { XMLParser } from "fast-xml-parser";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Import our services
import NotificationDrawer from "@/components/NotificationSidebar";
import locationAlertService from "@/services/locationAlertService";
import NotificationService, { NotificationData } from "@/services/notificationService";

// --- Constants ---
const PAKISTAN_BOUNDS = {
  minLat: 23.5,
  maxLat: 37.5,
  minLon: 60.5,
  maxLon: 77.5,
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
  type: "seismic" | "flood";
  title: string;
  magnitude?: number;
  location: string;
  time: string;
  severity: "high" | "moderate" | "low";
  depth?: number;
  description?: string;
  link?: string;
}

interface CitySuggestion {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface DisasterResource {
  id: string;
  title: string;
  description: string;
  source: string;
  lastUpdated: string;
  link: string;
  status: "active" | "warning" | "normal";
}

// --- Main Component ---
export default function HomeScreen() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [seismicAlerts, setSeismicAlerts] = useState<AlertType[]>([]);
  const [pakistanFloodAlerts, setPakistanFloodAlerts] = useState<AlertType[]>([]);
  const [internationalFloodAlerts, setInternationalFloodAlerts] = useState<AlertType[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [notiSidebarVisible, setNotiSidebarVisible] = useState(false);
  const [disasterResources, setDisasterResources] = useState<DisasterResource[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [locationAlerts, setLocationAlerts] = useState([]);

  const { user } = useAuth();
  const { suggestions: citySuggestions, loading: loadingSuggestions } = useDebouncedSearch(searchQuery);
  const appState = useRef(AppState.currentState);

  // --- Effects ---
  useEffect(() => {
    initializeServices();
    loadInitialData();
    
    const handleAppStateChange = (nextAppState: string) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, refresh data
        refreshLocationData();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
      cleanup();
    };
  }, []);

  // Initialize services
  const initializeServices = async () => {
    try {
      // Initialize notification service with callback
      await NotificationService.initialize((notification: NotificationData) => {
        updateNotificationCount();
        // Show immediate feedback for critical notifications
        if (notification.priority === 'critical') {
          Alert.alert(
            "🚨 CRITICAL ALERT",
            notification.message,
            [
              { text: "Dismiss", style: "cancel" },
              { text: "View Details", onPress: () => setNotiSidebarVisible(true) }
            ]
          );
        }
        console.log('New notification received in app:', notification.title);
      });

      // Initialize location alert service
      await locationAlertService.initialize();
      
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  };

  // Update notification count
  const updateNotificationCount = async () => {
    try {
      const notifications = await NotificationService.getStoredNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error updating notification count:', error);
    }
  };

  // Refresh location-based data
  const refreshLocationData = async () => {
    try {
      const alerts = await locationAlertService.getAllAlerts();
      // setLocationAlerts(alerts);
      await updateNotificationCount();
    } catch (error) {
      console.error('Error refreshing location data:', error);
    }
  };

  // Cleanup services
  const cleanup = () => {
    locationAlertService.cleanup();
    NotificationService.cleanup();
  };

  // --- Data Fetching ---
  const loadInitialData = async () => {
    setAlertsLoading(true);
    await Promise.all([
      requestLocationAndFetchWeather(),
      fetchSeismicData(),
      fetchFloodData(),
      loadDisasterResources(),
      updateNotificationCount(),
      refreshLocationData(),
    ]);
    setAlertsLoading(false);
  };

  const loadDisasterResources = async () => {
    const resources: DisasterResource[] = [
      {
        id: "1",
        title: "NDMA Pakistan",
        description: "National Disaster Management Authority updates",
        source: "NDMA",
        lastUpdated: "August 9, 2025",
        link: "http://ndma.gov.pk/",
        status: "active",
      },
      {
        id: "2",
        title: "PMD Weather",
        description: "Pakistan Meteorological Department forecasts",
        source: "PMD",
        lastUpdated: "August 9, 2025",
        link: "https://www.pmd.gov.pk/en/",
        status: "normal",
      },
      {
        id: "3",
        title: "PDMA Emergency",
        description: "Provincial Disaster Management response",
        source: "PDMA",
        lastUpdated: "August 9, 2025",
        link: "https://www.pdma.gov.pk/",
        status: "warning",
      },
      {
        id: "4",
        title: "Rescue 1122",
        description: "Emergency rescue services - Call 1122",
        source: "Rescue Service",
        lastUpdated: "August 9, 2025",
        link: "https://rescue.gov.pk/",
        status: "active",
      },
    ];
    setDisasterResources(resources);
  };

  const requestLocationAndFetchWeather = async () => {
    setLoadingWeather(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission denied. Using default location.");
        await fetchWeatherData(
          ISLAMABAD_COORDS.lat,
          ISLAMABAD_COORDS.lon,
          "Islamabad"
        );
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const cityName = await getCityName(
        location.coords.latitude,
        location.coords.longitude
      );
      
      await fetchWeatherData(
        location.coords.latitude,
        location.coords.longitude,
        cityName
      );

      // Trigger location-based alert checking
      await locationAlertService.handleLocationUpdate(location);
    } catch (error) {
      console.error("Error getting location or city name:", error);
      await fetchWeatherData(
        ISLAMABAD_COORDS.lat,
        ISLAMABAD_COORDS.lon,
        "Islamabad"
      );
    }
  };

  const getCityName = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "DisasterReadyApp/1.0",
          },
        }
      );
      const contentType = response.headers.get("content-type");
      if (
        !response.ok ||
        !contentType ||
        !contentType.includes("application/json")
      ) {
        const textResponse = await response.text();
        console.error(
          "Nominatim API returned a non-JSON response:",
          textResponse
        );
        throw new Error("Nominatim API error: Non-JSON response");
      }
      const data = await response.json();
      return (
        data.address.city ||
        data.address.town ||
        data.address.village ||
        "Current Location"
      );
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Current Location";
    }
  };

  const fetchWeatherData = async (lat: number, lon: number, city: string) => {
    setLoadingWeather(true);
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&hourly=precipitation_probability&timezone=auto`
      );
      if (!weatherRes.ok) throw new Error("Weather API request failed");
      const data = await weatherRes.json();

      const weather: WeatherData = {
        city,
        temp: Math.round(data.current_weather.temperature),
        condition: getWeatherCondition(data.current_weather.weathercode),
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
        forecast: data.daily.time.slice(1, 5).map((day: string, i: number) => ({
          day: new Date(day).toLocaleDateString("en-US", { weekday: "short" }),
          temp: `${Math.round(
            data.daily.temperature_2m_max[i + 1]
          )}°/${Math.round(data.daily.temperature_2m_min[i + 1])}°`,
          condition: getWeatherCondition(data.daily.weathercode[i + 1]),
        })),
      };
      setWeatherData(weather);

      // Check for weather-based alerts
      await checkWeatherAlerts(data, city);
    } catch (e) {
      console.error("Weather API Error:", e);
      setWeatherData(null);
    } finally {
      setLoadingWeather(false);
    }
  };

  // Check for weather-based alerts
  const checkWeatherAlerts = async (weatherData: any, city: string) => {
    try {
      if (weatherData.hourly?.precipitation_probability) {
        const next24Hours = weatherData.hourly.precipitation_probability.slice(0, 24);
        const maxPrecipitation = Math.max(...next24Hours);
        
        if (maxPrecipitation > 70) {
          await NotificationService.scheduleWeatherAlert(
            'Heavy Rain Warning',
            `High chance of rain (${maxPrecipitation}%) expected in ${city} within 24 hours. Take necessary precautions.`,
            maxPrecipitation > 90 ? 'critical' : 'high',
            city
          );
          
          // Update notification count after scheduling
          await updateNotificationCount();
        }
      }

      // Check for extreme temperatures
      if (weatherData.daily?.temperature_2m_max?.[0] > 40) {
        await NotificationService.scheduleWeatherAlert(
          'Extreme Heat Warning',
          `Dangerous high temperatures up to ${Math.round(weatherData.daily.temperature_2m_max[0])}°C expected in ${city}. Stay hydrated and avoid outdoor activities.`,
          'critical',
          city
        );
        
        // Update notification count after scheduling
        await updateNotificationCount();
      }

      // Check for cold weather alerts
      if (weatherData.daily?.temperature_2m_min?.[0] < 5) {
        await NotificationService.scheduleWeatherAlert(
          'Cold Weather Warning',
          `Extremely cold temperatures down to ${Math.round(weatherData.daily.temperature_2m_min[0])}°C expected in ${city}. Protect against hypothermia.`,
          'high',
          city
        );
        
        await updateNotificationCount();
      }
    } catch (error) {
      console.error('Error checking weather alerts:', error);
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
        return (
          place.includes("pakistan") ||
          place.includes("kashmir") ||
          place.includes("quetta") ||
          place.includes("islamabad") ||
          place.includes("lahore") ||
          place.includes("karachi") ||
          place.includes("gilgit") ||
          place.includes("peshawar") ||
          place.includes("multan") ||
          place.includes("skardu")
        );
      });

      if (pakistanFeatures.length === 0) {
        setSeismicAlerts([]);
        return;
      }

      const parsed: AlertType[] = pakistanFeatures
        .slice(0, 5)
        .map((eq: any) => ({
          id: eq.id,
          type: "seismic",
          title: eq.properties.place,
          location: eq.properties.place,
          magnitude: eq.properties.mag,
          depth: eq.geometry.coordinates[2],
          time: getTimeAgo(new Date(eq.properties.time)),
          severity:
            eq.properties.mag >= 5
              ? "high"
              : eq.properties.mag >= 4
              ? "moderate"
              : "low",
        }));

      setSeismicAlerts(parsed);

      // Check for recent significant earthquakes and send notifications
      await checkSeismicAlerts(pakistanFeatures);
    } catch (err) {
      console.error("Earthquake API error:", err);
      setSeismicAlerts([]);
    }
  };

  // Check for seismic alerts that warrant notifications
  const checkSeismicAlerts = async (earthquakes: any[]) => {
    try {
      for (const eq of earthquakes) {
        const magnitude = eq.properties.mag;
        const place = eq.properties.place;
        const time = new Date(eq.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);
        
        // Only notify for recent earthquakes (within last 2 hours) and magnitude >= 4.0
        if (hoursSince <= 2 && magnitude >= 4.0) {
          const severity = magnitude >= 6.0 ? 'critical' : magnitude >= 5.0 ? 'high' : 'moderate';
          
          await NotificationService.scheduleSeismicAlert(
            `Earthquake M${magnitude.toFixed(1)} Detected`,
            `A magnitude ${magnitude.toFixed(1)} earthquake occurred ${place}. Monitor for aftershocks and follow safety protocols.`,
            magnitude,
            place
          );
          
          // Update notification count after scheduling
          await updateNotificationCount();
        }
      }
    } catch (error) {
      console.error('Error checking seismic alerts:', error);
    }
  };

  const fetchFloodData = async () => {
    try {
      const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
      const targetUrl = "https://www.gdacs.org/xml/rss.xml";
      const res = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xmlText = await res.text();
      const parser = new XMLParser({ ignoreAttributes: false });
      const xmlDoc = parser.parse(xmlText);
      let items = xmlDoc.rss?.channel?.item
        ? Array.isArray(xmlDoc.rss.channel.item)
          ? xmlDoc.rss.channel.item
          : [xmlDoc.rss.channel.item]
        : [];
      
      const pakistanAlerts: AlertType[] = [];
      const internationalAlerts: AlertType[] = [];
      const pakistaniKeywords = [
        "pakistan",
        "karachi",
        "lahore",
        "islamabad",
        "sindh",
        "punjab",
        "balochistan",
        "kpk",
        "gilgit",
        "kashmir",
        "indus",
      ];
      
      items
        .filter((item: any) =>
          (item.title || "").toLowerCase().includes("flood")
        )
        .forEach((item: any, index: number) => {
          const title = (item.title || "").toLowerCase();
          const alert: AlertType = {
            id: `flood_${Date.now()}_${index}`,
            type: "flood",
            title: item.title,
            description: (item.description || "").substring(0, 100) + "...",
            location: "Various Regions",
            time: item.pubDate ? getTimeAgo(new Date(item.pubDate)) : "Recent",
            severity: "moderate",
            link: item.link,
          };
          
          if (pakistaniKeywords.some((keyword) => title.includes(keyword))) {
            pakistanAlerts.push(alert);
            
            // Send notification for Pakistan flood alerts
            NotificationService.scheduleLocationAlert(
              'Flood Alert in Pakistan',
              `Flood conditions reported: ${item.title}`,
              'high',
              'flood',
              'Pakistan Region'
            ).then(() => updateNotificationCount());
          } else {
            internationalAlerts.push(alert);
          }
        });
      
      setPakistanFloodAlerts(pakistanAlerts.slice(0, 3));
      setInternationalFloodAlerts(internationalAlerts.slice(0, 3));
    } catch (error) {
      console.error("🚨 Flood data fetch failed:", error);
    }
  };

  // --- Helper Functions ---
  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days > 1) return `${days} days ago`;
    if (days === 1) return `1 day ago`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 1) return `${hours} hours ago`;
    if (hours === 1) return `1 hour ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes > 1) return `${minutes} minutes ago`;
    return `Just now`;
  };

  const getWeatherCondition = (code: number): string => {
    const conditionMap: { [key: number]: string } = {
      0: "Clear",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing Rime Fog",
      51: "Light Drizzle",
      53: "Drizzle",
      55: "Dense Drizzle",
      56: "Light Freezing Drizzle",
      57: "Dense Freezing Drizzle",
      61: "Slight Rain",
      63: "Rain",
      65: "Heavy Rain",
      66: "Light Freezing Rain",
      67: "Heavy Freezing Rain",
      71: "Slight Snowfall",
      73: "Snowfall",
      75: "Heavy Snowfall",
      77: "Snow Grains",
      80: "Slight Rain Showers",
      81: "Rain Showers",
      82: "Violent Rain Showers",
      85: "Slight Snow Showers",
      86: "Heavy Snow Showers",
      95: "Thunderstorm",
      96: "Thunderstorm with Hail",
      99: "Thunderstorm with Heavy Hail",
    };
    return conditionMap[code] || "Clear";
  };

  const getWeatherIcon = (condition: string): keyof typeof Icon.glyphMap => {
    const c = condition.toLowerCase();
    if (c.includes("sun") || c.includes("clear")) return "wb-sunny";
    if (c.includes("cloud") || c.includes("overcast")) return "wb-cloudy";
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower"))
      return "grain";
    if (c.includes("snow") || c.includes("sleet") || c.includes("blizzard"))
      return "ac-unit";
    if (c.includes("thunder")) return "flash-on";
    if (c.includes("fog") || c.includes("mist")) return "dehaze";
    return "wb-cloudy";
  };

  const getUserDisplayName = () => {
    if (!user) return "G";
    if (user.displayName) return user.displayName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "G";
  };

  // --- Event Handlers ---
  const handleSelectCity = (city: CitySuggestion) => {
    fetchWeatherData(city.latitude, city.longitude, city.name);
    setSearchQuery("");
    setIsSearchVisible(false);
  };

  const handleResourcePress = (resource: DisasterResource) => {
    Alert.alert(
      resource.title,
      `${resource.description}\n\nWould you like to visit ${resource.source}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Visit Website",
          onPress: () => Linking.openURL(resource.link),
        },
      ]
    );
  };

  // Test notification functions for development
  const sendTestAlert = async () => {
    Alert.alert(
      "Send Test Alert",
      "What type of test alert would you like to send?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Weather Alert",
          onPress: async () => {
            await NotificationService.scheduleWeatherAlert(
              "TEST: Severe Weather",
              "This is a test weather alert for your current location.",
              "high",
              weatherData?.city || "Current Location"
            );
            await updateNotificationCount();
          },
        },
        {
          text: "Earthquake Alert",
          onPress: async () => {
            await NotificationService.scheduleSeismicAlert(
              "TEST: Earthquake Detected",
              "This is a test earthquake alert for development purposes.",
              4.5,
              weatherData?.city || "Current Location"
            );
            await updateNotificationCount();
          },
        },
        {
          text: "Evacuation Notice",
          onPress: async () => {
            await NotificationService.scheduleEvacuationNotice(
              "TEST: Evacuation Notice",
              "This is a test evacuation alert. Please follow evacuation procedures.",
              weatherData?.city || "Current Location"
            );
            await updateNotificationCount();
          },
        },
        {
          text: "Location Test Alerts",
          onPress: async () => {
            await locationAlertService.createTestAlerts();
            await updateNotificationCount();
          },
        },
      ]
    );
  };

  const handleNotificationPress = () => {
    setNotiSidebarVisible(true);
    // Update count when drawer opens
    updateNotificationCount();
  };

  // --- Render Functions ---
  const renderHeader = () => (
    <ThemedView style={styles.header}>
      {isSearchVisible ? (
        <ThemedView style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <ThemedInput
            style={styles.searchInput}
            placeholder="Search for any city..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            onPress={() => {
              setIsSearchVisible(false);
              setSearchQuery("");
            }}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <>
          <ThemedText type="title">Disaster Ready</ThemedText>
          <ThemedView style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSearchVisible(true)}>
              <Ionicons name="search-outline" size={24} color="#333" />
            </TouchableOpacity>
            
            {/* Test button for development */}
            <TouchableOpacity
              style={{ marginLeft: 15 }}
              onPress={sendTestAlert}
            >
              <Ionicons name="flask-outline" size={24} color="#333" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.notificationButton, { marginLeft: 15 }]}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={24} color="#333" />
              {notificationCount > 0 && (
                <ThemedView style={styles.notificationBadge}>
                  <ThemedText style={styles.notificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </ThemedText>
                </ThemedView>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.profileIcon}
              onPress={() => setSidebarVisible(true)}
            >
              <ThemedText style={styles.profileText}>
                {getUserDisplayName()}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </>
      )}
    </ThemedView>
  );

  const renderCitySuggestions = () => {
    if (!isSearchVisible || searchQuery.length <= 2) return null;
    return (
      <ThemedView style={styles.suggestionsContainer}>
        {loadingSuggestions ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00BCD4" />
            <ThemedText style={styles.loadingText}>Searching...</ThemedText>
          </ThemedView>
        ) : citySuggestions.length === 0 && searchQuery.length > 2 ? (
          <ThemedView style={styles.noResultsContainer}>
            <Ionicons name="location-outline" size={24} color="#ccc" />
            <ThemedText style={styles.noResultsText}>
              No cities found for "{searchQuery}"
            </ThemedText>
          </ThemedView>
        ) : (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          >
            {citySuggestions.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.7}
              >
                <ThemedView style={styles.suggestionIconContainer}>
                  <Ionicons name="location" size={18} color="#00BCD4" />
                </ThemedView>
                <ThemedView style={styles.suggestionContent}>
                  <ThemedText style={styles.suggestionName}>
                    {city.name}
                  </ThemedText>
                  <ThemedText style={styles.suggestionDetails}>
                    {city.admin1 ? `${city.admin1}, ` : ""}
                    {city.country}
                  </ThemedText>
                </ThemedView>
                <Ionicons
                  name="chevron-forward-outline"
                  size={16}
                  color="#ccc"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </ThemedView>
    );
  };

  // const renderLocationAlertsBanner = () => {
  //   const activeAlerts = locationAlerts.filter((alert: any) => alert.isActive);
  //   if (activeAlerts.length === 0) return null;

  //   return (
  //     <ThemedView style={styles.alertsBanner}>
  //       <Ionicons name="warning" size={20} color="#FF4444" />
  //       <ThemedText style={styles.alertsBannerText}>
  //         {activeAlerts.length} active location alert{activeAlerts.length !== 1 ? 's' : ''} in your area
  //       </ThemedText>
  //       <TouchableOpacity onPress={() => setNotiSidebarVisible(true)}>
  //         <ThemedText style={styles.alertsBannerLink}>View</ThemedText>
  //       </TouchableOpacity>
  //     </ThemedView>
  //   );
  // };

  const renderWeatherSection = () => (
    <ThemedView style={styles.section}>
      <ThemedView style={styles.weatherHeader}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Weather Forecast
        </ThemedText>
        {weatherData?.city && (
          <ThemedText style={styles.cityText}>{weatherData.city}</ThemedText>
        )}
      </ThemedView>
      {loadingWeather ? (
        <ActivityIndicator
          size="large"
          color="#00BCD4"
          style={{ marginVertical: 40 }}
        />
      ) : !weatherData ? (
        <ThemedView style={styles.weatherCard}>
          <ThemedText>Could not fetch weather data.</ThemedText>
        </ThemedView>
      ) : (
        <ThemedView style={styles.weatherCard}>
          <ThemedView style={styles.currentWeather}>
            <ThemedView style={styles.weatherInfo}>
              <Icon
                name={getWeatherIcon(weatherData.condition)}
                size={40}
                color="#00BCD4"
              />
              <ThemedView style={styles.weatherText}>
                <ThemedText style={styles.temperature}>
                  {weatherData.temp}°C
                </ThemedText>
                <ThemedText style={styles.condition}>
                  {weatherData.condition}
                </ThemedText>
              </ThemedView>
            </ThemedView>
            <ThemedView style={styles.weatherDetails}>
              <ThemedText style={styles.weatherDetail}>Today</ThemedText>
              <ThemedText style={styles.weatherDetail}>
                High: {weatherData.high}°C
              </ThemedText>
              <ThemedText style={styles.weatherDetail}>
                Low: {weatherData.low}°C
              </ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.forecastRow}>
            {weatherData.forecast.map((item, index) => (
              <ThemedView key={index} style={styles.forecastItem}>
                <ThemedText style={styles.forecastDay}>{item.day}</ThemedText>
                <Icon
                  name={getWeatherIcon(item.condition)}
                  size={20}
                  color="#00BCD4"
                />
                <ThemedText style={styles.forecastTemp}>{item.temp}</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView>
      )}
    </ThemedView>
  );

  const renderAlertItem = (alert: AlertType) => (
    <TouchableOpacity
      key={alert.id}
      onPress={() => alert.link && Linking.openURL(alert.link)}
    >
      <ThemedView style={styles.alertItem}>
        {alert.type === "seismic" && (
          <ThemedView style={styles.alertContent}>
            <ThemedText style={styles.alertMagnitude}>
              {alert.magnitude?.toFixed(1)}
            </ThemedText>
            <ThemedText style={styles.alertMagnitudeLabel}>Mag</ThemedText>
          </ThemedView>
        )}
        <ThemedView style={styles.alertInfo}>
          <ThemedText style={styles.alertLocation} numberOfLines={2}>
            {alert.title}
          </ThemedText>
          <ThemedText style={styles.alertTime}>{alert.time}</ThemedText>
          {alert.depth && (
            <ThemedText style={styles.alertDepth}>
              Depth: {alert.depth.toFixed(1)} km
            </ThemedText>
          )}
        </ThemedView>
        <ThemedView
          style={[
            styles.severityBar,
            {
              backgroundColor:
                alert.severity === "high"
                  ? "#FF5722"
                  : alert.severity === "moderate"
                  ? "#FF9800"
                  : "#4CAF50",
            },
          ]}
        />
      </ThemedView>
    </TouchableOpacity>
  );

  const renderAlertsSection = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Critical Alerts
      </ThemedText>
      {alertsLoading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginVertical: 40 }}
        />
      ) : (
        <>
          <ThemedView style={styles.alertHeader}>
            <Icon name="timeline" size={20} color="#FF5722" />
            <ThemedText
              type="defaultSemiBold"
              style={styles.alertCategoryTitle}
            >
              Seismic Activity
            </ThemedText>
          </ThemedView>
          {seismicAlerts.length > 0 ? (
            seismicAlerts.map(renderAlertItem)
          ) : (
            <ThemedText style={styles.noAlertsText}>
              No significant seismic activity in the region.
            </ThemedText>
          )}

          <ThemedView style={[styles.alertHeader, { marginTop: 20 }]}>
            <Icon name="waves" size={20} color="#2196F3" />
            <ThemedText
              type="defaultSemiBold"
              style={styles.alertCategoryTitle}
            >
              Flood Warnings
            </ThemedText>
          </ThemedView>
          {pakistanFloodAlerts.length > 0 ? (
            pakistanFloodAlerts.map(renderAlertItem)
          ) : (
            <ThemedText style={styles.noAlertsText}>
              No active flood warnings reported in Pakistan.
            </ThemedText>
          )}

          {internationalFloodAlerts.length > 0 && (
            <>
              <ThemedText
                type="defaultSemiBold"
                style={styles.subCategoryTitle}
              >
                International Alerts
              </ThemedText>
              {internationalFloodAlerts.map(renderAlertItem)}
            </>
          )}
        </>
      )}
    </ThemedView>
  );

  const renderPakistaniResources = () => (
    <ThemedView style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Local Resources
      </ThemedText>
      <ThemedView style={styles.resourcesGrid}>
        {disasterResources.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            onPress={() => handleResourcePress(resource)}
          >
            <ThemedView
              style={[
                styles.resourceCard,
                {
                  borderLeftColor:
                    resource.status === "active"
                      ? "#4CAF50"
                      : resource.status === "warning"
                      ? "#FF9800"
                      : "#2196F3",
                },
              ]}
            >
              <ThemedView style={styles.resourceContent}>
                <ThemedView style={styles.resourceHeader}>
                  <ThemedText style={styles.resourceTitle}>
                    {resource.title}
                  </ThemedText>
                  <ThemedView
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          resource.status === "active"
                            ? "#4CAF50"
                            : resource.status === "warning"
                            ? "#FF9800"
                            : "#2196F3",
                      },
                    ]}
                  >
                    <ThemedText style={styles.statusText}>
                      {resource.status.toUpperCase()}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText
                  style={styles.resourceDescription}
                  numberOfLines={1}
                >
                  {resource.description}
                </ThemedText>
                <ThemedText style={styles.resourceSource}>
                  {resource.source}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </TouchableOpacity>
        ))}
      </ThemedView>
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
        {/* {renderLocationAlertsBanner()} */}
        
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
        />
        <NotificationDrawer
          visible={notiSidebarVisible}
          onClose={() => setNotiSidebarVisible(false)}
        />
        
        {!isSearchVisible && (
          <>
            {renderWeatherSection()}
            {renderAlertsSection()}
            {renderPakistaniResources()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4ECDC4",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 15,
  },
  profileText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, height: 40 },
  alertsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  alertsBannerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  alertsBannerLink: {
    fontSize: 14,
    color: '#FF4444',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 250,
  },
  suggestionsList: { maxHeight: 230 },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  loadingText: { marginLeft: 10, fontSize: 14, color: "#666" },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "transparent",
  },
  noResultsText: { fontSize: 14, color: "#999", marginTop: 8 },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  suggestionIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  suggestionContent: { flex: 1, backgroundColor: "transparent" },
  suggestionName: { fontSize: 16, fontWeight: "500", marginBottom: 2 },
  suggestionDetails: { fontSize: 13, color: "#666" },
  section: { padding: 20, backgroundColor: "transparent" },
  sectionTitle: { marginBottom: 15 },
  resourcesGrid: { gap: 1, backgroundColor: "transparent" },
  resourceCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    position: "relative",
  },
  resourceContent: { flex: 1, backgroundColor: "transparent" },
  resourceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  resourceTitle: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: "bold", color: "white" },
  resourceDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    lineHeight: 16,
  },
  resourceSource: { fontSize: 11, fontWeight: "500" },
  weatherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "transparent",
  },
  cityText: { color: "#666", fontSize: 16 },
  weatherCard: { borderRadius: 15, padding: 20, minHeight: 100 },
  currentWeather: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "transparent",
  },
  weatherInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  weatherText: { marginLeft: 15, backgroundColor: "transparent" },
  temperature: { fontSize: 32, paddingTop: 5, fontWeight: "bold" },
  condition: { fontSize: 16, textTransform: "capitalize" },
  weatherDetails: { alignItems: "flex-end", backgroundColor: "transparent" },
  weatherDetail: { fontSize: 14, marginBottom: 2, color: "#666" },
  forecastRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "transparent",
  },
  forecastItem: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "transparent",
  },
  forecastDay: { fontSize: 12, marginBottom: 8, color: "#666" },
  forecastTemp: { fontSize: 12, marginTop: 8, color: "#666" },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  alertCategoryTitle: { fontSize: 16, marginLeft: 8 },
  subCategoryTitle: {
    fontSize: 14,
    marginLeft: 8,
    marginTop: 20,
    marginBottom: 10,
    color: "#666",
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  alertContent: {
    alignItems: "center",
    marginRight: 15,
    width: 50,
    backgroundColor: "transparent",
  },
  alertMagnitude: { fontSize: 18, fontWeight: "bold", color: "#FF5722" },
  alertMagnitudeLabel: { fontSize: 12, color: "#666" },
  alertInfo: { flex: 1, backgroundColor: "transparent" },
  alertLocation: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  alertTime: { fontSize: 12, color: "#666" },
  alertDepth: { fontSize: 11, color: "#999", marginTop: 2 },
  severityBar: {
    width: 5,
    height: "80%",
    borderRadius: 3,
    marginLeft: 10,
    alignSelf: "center",
  },
  noAlertsText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
    fontStyle: "italic",
  },
});