// services/LocationAlertService.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './otificationService';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_ALERT_STORAGE_KEY = 'locationAlerts';
const USER_LOCATION_KEY = 'userLocation';

interface LocationAlert {
  id: string;
  type: 'weather' | 'seismic' | 'flood' | 'evacuation' | 'general';
  title: string;
  message: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  location: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  timestamp: string;
  expiresAt?: string;
  isActive: boolean;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// Define background task for location tracking
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (location) {
      LocationAlertService.handleLocationUpdate(location);
    }
  }
});

class LocationAlertService {
  private isTrackingLocation = false;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private currentLocation: UserLocation | null = null;

  // Initialize the service
  async initialize() {
    try {
      await this.loadStoredLocation();
      await this.setupLocationTracking();
      await this.startAlertMonitoring();
      console.log('LocationAlertService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocationAlertService:', error);
    }
  }

  // Setup location tracking
  async setupLocationTracking() {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.log('Foreground location permission denied');
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.log('Background location permission denied, using foreground only');
      }

      // Start location tracking
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Update every minute
        distanceInterval: 100, // Update if moved 100 meters
        showsBackgroundLocationIndicator: true,
      });

      this.isTrackingLocation = true;
      console.log('Location tracking started');
    } catch (error) {
      console.error('Error setting up location tracking:', error);
    }
  }

  // Handle location updates
  async handleLocationUpdate(location: Location.LocationObject) {
    const userLocation: UserLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      timestamp: location.timestamp,
    };

    this.currentLocation = userLocation;
    await AsyncStorage.setItem(USER_LOCATION_KEY, JSON.stringify(userLocation));
    
    // Check for location-based alerts
    await this.checkLocationBasedAlerts(userLocation);
  }

  // Load stored location
  async loadStoredLocation() {
    try {
      const stored = await AsyncStorage.getItem(USER_LOCATION_KEY);
      if (stored) {
        this.currentLocation = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading stored location:', error);
    }
  }

  // Start monitoring for alerts
  async startAlertMonitoring() {
    // Check for alerts every 5 minutes
    this.alertCheckInterval = setInterval(async () => {
      if (this.currentLocation) {
        await this.fetchLocationBasedAlerts(this.currentLocation);
      }
    }, 300000); // 5 minutes
  }

  // Stop alert monitoring
  stopAlertMonitoring() {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
  }

  // Fetch location-based alerts from various APIs
  async fetchLocationBasedAlerts(userLocation: UserLocation) {
    const alerts: LocationAlert[] = [];

    try {
      // Fetch weather alerts
      const weatherAlerts = await this.fetchWeatherAlerts(userLocation);
      alerts.push(...weatherAlerts);

      // Fetch seismic alerts
      const seismicAlerts = await this.fetchSeismicAlerts(userLocation);
      alerts.push(...seismicAlerts);

      // Fetch flood alerts
      const floodAlerts = await this.fetchFloodAlerts(userLocation);
      alerts.push(...floodAlerts);

      // Store alerts
      await this.storeAlerts(alerts);

      // Process new alerts
      await this.processNewAlerts(alerts);

    } catch (error) {
      console.error('Error fetching location-based alerts:', error);
    }
  }

  // Fetch weather alerts
  async fetchWeatherAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    
    try {
      // Using OpenWeatherMap One Call API (you'll need API key)
      // For demo, using Open-Meteo alerts (free)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=temperature_2m,precipitation_probability,weathercode&alerts=true&timezone=auto`
      );
      
      const data = await response.json();
      
      // Simulate weather alerts based on conditions
      if (data.hourly) {
        const nextHours = data.hourly.precipitation_probability.slice(0, 24);
        const maxPrecipitation = Math.max(...nextHours);
        
        if (maxPrecipitation > 70) {
          alerts.push({
            id: `weather_${Date.now()}`,
            type: 'weather',
            title: 'Heavy Rain Warning',
            message: `High precipitation probability (${maxPrecipitation}%) expected in your area within 24 hours.`,
            severity: maxPrecipitation > 90 ? 'high' : 'moderate',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 10,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }

        // Check for extreme temperatures
        const temps = data.hourly.temperature_2m.slice(0, 24);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);

        if (maxTemp > 40) {
          alerts.push({
            id: `heatwave_${Date.now()}`,
            type: 'weather',
            title: 'Extreme Heat Warning',
            message: `Dangerous high temperatures up to ${Math.round(maxTemp)}°C expected. Stay hydrated and avoid outdoor activities.`,
            severity: 'high',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 20,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
    }

    return alerts;
  }

  // Fetch seismic alerts
  async fetchSeismicAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    const radius = 100; // 100km radius

    try {
      const response = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&maxradiuskm=${radius}&minmagnitude=3.5&orderby=time&limit=10`
      );
      
      const data = await response.json();
      
      data.features.forEach((earthquake: any) => {
        const magnitude = earthquake.properties.mag;
        const place = earthquake.properties.place;
        const time = new Date(earthquake.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);
        
        // Only alert for recent earthquakes (within last 6 hours)
        if (hoursSince <= 6) {
          let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';
          if (magnitude >= 6.0) severity = 'critical';
          else if (magnitude >= 5.0) severity = 'high';
          else if (magnitude >= 4.0) severity = 'moderate';

          alerts.push({
            id: `seismic_${earthquake.id}`,
            type: 'seismic',
            title: `Earthquake Detected - M${magnitude.toFixed(1)}`,
            message: `A magnitude ${magnitude.toFixed(1)} earthquake occurred ${place}. Monitor for aftershocks.`,
            severity,
            location: {
              latitude: earthquake.geometry.coordinates[1],
              longitude: earthquake.geometry.coordinates[0],
              radius: magnitude * 20, // Larger earthquakes affect wider areas
            },
            timestamp: time.toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }
      });
    } catch (error) {
      console.error('Error fetching seismic alerts:', error);
    }

    return alerts;
  }

  // Fetch flood alerts
  async fetchFloodAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      // Using GDACS for global disaster alerts
      const proxyUrl = "https://api.codetabs.com/v1/proxy?quest=";
      const targetUrl = "https://www.gdacs.org/xml/rss.xml";
      const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const xmlText = await response.text();
      
      // Parse XML and check for nearby flood alerts
      // This is a simplified implementation - you might want to use a proper XML parser
      if (xmlText.toLowerCase().includes('flood')) {
        // Check if location is relevant (this is simplified)
        const locationNames = ['pakistan', 'punjab', 'sindh', 'faisalabad', 'lahore', 'karachi'];
        const isRelevant = locationNames.some(name => 
          xmlText.toLowerCase().includes(name.toLowerCase())
        );

        if (isRelevant) {
          alerts.push({
            id: `flood_${Date.now()}`,
            type: 'flood',
            title: 'Flood Warning in Region',
            message: 'Flood conditions reported in your region. Monitor local water levels and avoid low-lying areas.',
            severity: 'moderate',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 50,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching flood alerts:', error);
    }

    return alerts;
  }

  // Check if user is within alert area
  private isLocationInAlertArea(userLoc: UserLocation, alertLoc: LocationAlert['location']): boolean {
    const distance = this.calculateDistance(
      userLoc.latitude,
      userLoc.longitude,
      alertLoc.latitude,
      alertLoc.longitude
    );
    return distance <= alertLoc.radius;
  }

  // Calculate distance between two coordinates
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Check location-based alerts
  async checkLocationBasedAlerts(userLocation: UserLocation) {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      if (stored) {
        const alerts: LocationAlert[] = JSON.parse(stored);
        
        for (const alert of alerts) {
          if (alert.isActive && this.isLocationInAlertArea(userLocation, alert.location)) {
            await this.triggerLocationAlert(alert);
          }
        }
      }
    } catch (error) {
      console.error('Error checking location-based alerts:', error);
    }
  }

  // Store alerts
  async storeAlerts(alerts: LocationAlert[]) {
    try {
      const existing = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      const existingAlerts: LocationAlert[] = existing ? JSON.parse(existing) : [];
      
      // Merge alerts, avoiding duplicates
      const mergedAlerts = [...existingAlerts];
      
      alerts.forEach(newAlert => {
        const existingIndex = mergedAlerts.findIndex(alert => alert.id === newAlert.id);
        if (existingIndex >= 0) {
          mergedAlerts[existingIndex] = newAlert;
        } else {
          mergedAlerts.push(newAlert);
        }
      });

      // Clean up expired alerts
      const activeAlerts = mergedAlerts.filter(alert => {
        if (alert.expiresAt) {
          return new Date(alert.expiresAt) > new Date();
        }
        return true;
      });

      await AsyncStorage.setItem(LOCATION_ALERT_STORAGE_KEY, JSON.stringify(activeAlerts));
    } catch (error) {
      console.error('Error storing alerts:', error);
    }
  }

  // Process new alerts
  async processNewAlerts(newAlerts: LocationAlert[]) {
    if (!this.currentLocation) return;

    for (const alert of newAlerts) {
      if (this.isLocationInAlertArea(this.currentLocation, alert.location)) {
        await this.triggerLocationAlert(alert);
      }
    }
  }

  // Trigger location alert
  async triggerLocationAlert(alert: LocationAlert) {
    try {
      // Send push notification
      await NotificationService.scheduleLocalNotification(
        alert.title,
        alert.message,
        { seconds: 1 }
      );

      console.log('Location alert triggered:', alert.title);
    } catch (error) {
      console.error('Error triggering location alert:', error);
    }
  }

  // Get all stored alerts
  async getAllAlerts(): Promise<LocationAlert[]> {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Create test alerts for development
  async createTestAlerts() {
    if (!this.currentLocation) return;

    const testAlerts: LocationAlert[] = [
      {
        id: `test_weather_${Date.now()}`,
        type: 'weather',
        title: 'TEST: Severe Weather Alert',
        message: 'This is a test weather alert for development purposes.',
        severity: 'high',
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 10,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        isActive: true,
      },
      {
        id: `test_evacuation_${Date.now() + 1}`,
        type: 'evacuation',
        title: 'TEST: Evacuation Notice',
        message: 'This is a test evacuation alert. Please follow evacuation procedures.',
        severity: 'critical',
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 5,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        isActive: true,
      },
    ];

    await this.storeAlerts(testAlerts);
    await this.processNewAlerts(testAlerts);
  }

  // Clean up service
  async cleanup() {
    try {
      if (this.isTrackingLocation) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        this.isTrackingLocation = false;
      }
      
      this.stopAlertMonitoring();
      console.log('LocationAlertService cleaned up');
    } catch (error) {
      console.error('Error cleaning up LocationAlertService:', error);
    }
  }
}

export default new LocationAlertService();