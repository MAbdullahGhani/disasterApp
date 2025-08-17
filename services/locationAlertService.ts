// services/LocationAlertService.ts - Fixed for Expo Go
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import NotificationService from './notificationService';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_ALERT_STORAGE_KEY = 'locationAlerts';
const USER_LOCATION_KEY = 'userLocation';
const NOTIFIED_ALERTS_KEY = 'notifiedAlerts';

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

class LocationAlertService {
  private isTrackingLocation = false;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private currentLocation: UserLocation | null = null;
  private notifiedAlerts: Set<string> = new Set();

  // Initialize the service
  async initialize() {
    try {
      await this.loadStoredLocation();
      await this.loadNotifiedAlerts();
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

      // Get current location immediately
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      await this.handleLocationUpdate(location);

      // Start location tracking for background updates
      if (backgroundStatus === 'granted') {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 300000, // Update every 5 minutes
          distanceInterval: 1000, // Update if moved 1km
          showsBackgroundLocationIndicator: false,
        });
      }

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
    
    console.log('Location updated:', userLocation.latitude, userLocation.longitude);
    
    // Check for location-based alerts
    await this.checkLocationBasedAlerts(userLocation);
  }

  // Load stored location
  async loadStoredLocation() {
    try {
      const stored = await AsyncStorage.getItem(USER_LOCATION_KEY);
      if (stored) {
        this.currentLocation = JSON.parse(stored);
        console.log('Loaded stored location:', this.currentLocation);
      }
    } catch (error) {
      console.error('Error loading stored location:', error);
    }
  }

  // Load notified alerts to prevent spam
  async loadNotifiedAlerts() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFIED_ALERTS_KEY);
      if (stored) {
        const alertIds = JSON.parse(stored);
        this.notifiedAlerts = new Set(alertIds);
      }
    } catch (error) {
      console.error('Error loading notified alerts:', error);
    }
  }

  // Save notified alerts
  async saveNotifiedAlerts() {
    try {
      await AsyncStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify([...this.notifiedAlerts]));
    } catch (error) {
      console.error('Error saving notified alerts:', error);
    }
  }

  // Start monitoring for alerts - Check every 2 minutes for demo purposes
  async startAlertMonitoring() {
    // Check for alerts every 2 minutes for better demo experience
    this.alertCheckInterval = setInterval(async () => {
      if (this.currentLocation) {
        await this.fetchLocationBasedAlerts(this.currentLocation);
      }
    }, 120000); // 2 minutes

    // Initial check
    if (this.currentLocation) {
      await this.fetchLocationBasedAlerts(this.currentLocation);
    }
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
      console.log('Fetching alerts for location:', userLocation.latitude, userLocation.longitude);
      
      // Fetch weather alerts
      const weatherAlerts = await this.fetchWeatherAlerts(userLocation);
      alerts.push(...weatherAlerts);

      // Fetch seismic alerts
      const seismicAlerts = await this.fetchSeismicAlerts(userLocation);
      alerts.push(...seismicAlerts);

      // Fetch flood alerts
      const floodAlerts = await this.fetchFloodAlerts(userLocation);
      alerts.push(...floodAlerts);

      console.log('Found', alerts.length, 'alerts');

      // Store alerts
      await this.storeAlerts(alerts);

      // Process new alerts
      await this.processNewAlerts(alerts);

    } catch (error) {
      console.error('Error fetching location-based alerts:', error);
    }
  }

  // Fetch weather alerts with lower thresholds for demo
  async fetchWeatherAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=temperature_2m,precipitation_probability,weathercode,wind_speed_10m&alerts=true&timezone=auto`
      );
      
      if (!response.ok) return alerts;
      const data = await response.json();
      
      if (data.hourly) {
        const next12Hours = 12;
        const precipProbs = data.hourly.precipitation_probability.slice(0, next12Hours);
        const temps = data.hourly.temperature_2m.slice(0, next12Hours);
        const windSpeeds = data.hourly.wind_speed_10m.slice(0, next12Hours);
        
        const maxPrecip = Math.max(...precipProbs);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const maxWind = Math.max(...windSpeeds);

        // Lower thresholds for demo purposes
        if (maxPrecip >= 60) {
          alerts.push({
            id: `weather_rain_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Heavy Rain Alert',
            message: `High precipitation (${maxPrecip}%) expected in your area. Heavy rain possible.`,
            severity: maxPrecip >= 80 ? 'high' : 'moderate',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 15,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }

        if (maxTemp >= 35) {
          alerts.push({
            id: `weather_heat_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Heat Warning',
            message: `High temperatures up to ${Math.round(maxTemp)}°C expected. Stay hydrated.`,
            severity: maxTemp >= 40 ? 'critical' : 'high',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 25,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }

        if (minTemp <= 5) {
          alerts.push({
            id: `weather_cold_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Cold Weather Warning',
            message: `Cold temperatures down to ${Math.round(minTemp)}°C expected. Stay warm.`,
            severity: minTemp <= 0 ? 'critical' : 'high',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 25,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }

        if (maxWind >= 40) {
          alerts.push({
            id: `weather_wind_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Strong Wind Warning',
            message: `Strong winds up to ${Math.round(maxWind)} km/h expected. Secure loose objects.`,
            severity: maxWind >= 60 ? 'high' : 'moderate',
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 20,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            isActive: true,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching weather alerts:', error);
    }

    return alerts;
  }

  // Fetch seismic alerts with lower magnitude threshold
  async fetchSeismicAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    const radius = 500; // Increase radius for demo

    try {
      const response = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&maxradiuskm=${radius}&minmagnitude=3.5&orderby=time&limit=10`
      );
      
      if (!response.ok) return alerts;
      const data = await response.json();
      
      data.features.forEach((earthquake: any) => {
        const magnitude = earthquake.properties.mag;
        const place = earthquake.properties.place;
        const time = new Date(earthquake.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);
        
        // Include earthquakes from last 24 hours for demo
        if (hoursSince <= 24 && magnitude >= 3.5) {
          let severity: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
          if (magnitude >= 6.0) severity = 'critical';
          else if (magnitude >= 5.0) severity = 'high';
          else if (magnitude >= 4.0) severity = 'moderate';

          alerts.push({
            id: `seismic_${earthquake.id}`,
            type: 'seismic',
            title: `Earthquake M${magnitude.toFixed(1)} Detected`,
            message: `A magnitude ${magnitude.toFixed(1)} earthquake occurred ${place}. Monitor for aftershocks.`,
            severity,
            location: {
              latitude: earthquake.geometry.coordinates[1],
              longitude: earthquake.geometry.coordinates[0],
              radius: magnitude * 50,
            },
            timestamp: time.toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
      // Check weather-based flood risk
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=precipitation&timezone=auto`
      );
      
      if (!response.ok) return alerts;
      const data = await response.json();
      
      if (data.hourly) {
        const next24Hours = data.hourly.precipitation.slice(0, 24);
        const totalPrecip = next24Hours.reduce((sum: number, val: number) => sum + (val || 0), 0);
        const maxHourlyPrecip = Math.max(...next24Hours);
        
        // Lower threshold for demo
        if (totalPrecip >= 20 || maxHourlyPrecip >= 8) {
          alerts.push({
            id: `flood_risk_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'flood',
            title: 'Flood Risk Alert',
            message: `Heavy rainfall expected (${Math.round(totalPrecip)}mm/24h). Flood risk in low-lying areas.`,
            severity: totalPrecip >= 50 ? 'critical' : 'high',
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
      }
    } catch (error) {
      console.error('Error assessing flood risk:', error);
    }

    return alerts;
  }

  // Process new alerts
  async processNewAlerts(newAlerts: LocationAlert[]) {
    if (!this.currentLocation) return;

    for (const alert of newAlerts) {
      if (
        this.isLocationInAlertArea(this.currentLocation, alert.location) &&
        !this.notifiedAlerts.has(alert.id)
      ) {
        // Send notification
        await this.triggerLocationAlert(alert);
        
        // Mark as notified
        this.notifiedAlerts.add(alert.id);
        await this.saveNotifiedAlerts();
        
        console.log('New alert processed:', alert.title);
      }
    }
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
            if (!this.notifiedAlerts.has(alert.id)) {
              await this.triggerLocationAlert(alert);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking location-based alerts:', error);
    }
  }

  // Store alerts with better deduplication
  async storeAlerts(alerts: LocationAlert[]) {
    try {
      const existing = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      const existingAlerts: LocationAlert[] = existing ? JSON.parse(existing) : [];
      
      // More intelligent merging - avoid duplicates based on location and type
      const mergedAlerts = [...existingAlerts];
      
      alerts.forEach(newAlert => {
        // Check for existing alert with same ID
        const existingIndex = mergedAlerts.findIndex(alert => alert.id === newAlert.id);
        if (existingIndex >= 0) {
          mergedAlerts[existingIndex] = newAlert;
        } else {
          // Check for similar alert to avoid duplicates
          const isDuplicate = mergedAlerts.some(existing => 
            existing.type === newAlert.type &&
            existing.isActive &&
            this.calculateDistance(
              existing.location.latitude,
              existing.location.longitude,
              newAlert.location.latitude,
              newAlert.location.longitude
            ) < 5 && // Within 5km
            new Date(existing.timestamp).toDateString() === new Date(newAlert.timestamp).toDateString()
          );

          if (!isDuplicate) {
            mergedAlerts.push(newAlert);
          }
        }
      });

      // Clean up expired alerts
      const activeAlerts = mergedAlerts.filter(alert => {
        if (alert.expiresAt) {
          const isExpired = new Date(alert.expiresAt) <= new Date();
          if (isExpired) {
            this.notifiedAlerts.delete(alert.id);
          }
          return !isExpired;
        }
        return true;
      });

      await AsyncStorage.setItem(LOCATION_ALERT_STORAGE_KEY, JSON.stringify(activeAlerts));
      await this.saveNotifiedAlerts();
    } catch (error) {
      console.error('Error storing alerts:', error);
    }
  }

  // Trigger location alert
  async triggerLocationAlert(alert: LocationAlert) {
    try {
      // Map severity to priority
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (alert.severity === 'critical') priority = 'critical';
      else if (alert.severity === 'high') priority = 'high';
      else if (alert.severity === 'moderate') priority = 'medium';
      else priority = 'low';

      // Send notification using our notification service
      await NotificationService.scheduleLocationAlert(
        alert.title,
        alert.message,
        priority,
        alert.type,
        `${alert.location.latitude.toFixed(2)}, ${alert.location.longitude.toFixed(2)}`
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
      const alerts = stored ? JSON.parse(stored) : [];
      
      // Return only active alerts
      return alerts.filter((alert: LocationAlert) => alert.isActive);
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Get current location
  getCurrentLocation(): UserLocation | null {
    return this.currentLocation;
  }

  // Clear notification history (for testing)
  async clearNotificationHistory() {
    this.notifiedAlerts.clear();
    await AsyncStorage.removeItem(NOTIFIED_ALERTS_KEY);
    console.log('Notification history cleared');
  }

  // Create test alerts for demo - IMPROVED VERSION
  async createTestAlerts() {
    if (!this.currentLocation) {
      console.log('No location available for test alerts');
      return;
    }

    console.log('Creating test alerts...');

    const testAlerts: LocationAlert[] = [
      {
        id: `test_weather_${Date.now()}`,
        type: 'weather',
        title: 'DEMO: Severe Weather Warning',
        message: 'Heavy rainfall and strong winds expected in your area within the next 2 hours. Take necessary precautions.',
        severity: 'critical',
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 10,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      },
      {
        id: `test_seismic_${Date.now()}`,
        type: 'seismic',
        title: 'DEMO: Earthquake Alert',
        message: 'A magnitude 4.2 earthquake was detected 25km from your location. Monitor for aftershocks.',
        severity: 'high',
        location: {
          latitude: this.currentLocation.latitude + 0.1,
          longitude: this.currentLocation.longitude + 0.1,
          radius: 50,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      },
      {
        id: `test_flood_${Date.now()}`,
        type: 'flood',
        title: 'DEMO: Flash Flood Warning',
        message: 'Flash flood warning issued for your area due to heavy rainfall. Avoid low-lying areas.',
        severity: 'high',
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 15,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      }
    ];

    await this.storeAlerts(testAlerts);
    await this.processNewAlerts(testAlerts);
    
    console.log('Test alerts created and notifications sent!');
  }

  // Schedule delayed test notification for demo
  async scheduleDelayedTestNotification(delaySeconds: number = 30) {
    console.log(`Scheduling test notification in ${delaySeconds} seconds...`);
    
    // Schedule a notification to be sent after delay
    setTimeout(async () => {
      const testAlert: LocationAlert = {
        id: `delayed_test_${Date.now()}`,
        type: 'evacuation',
        title: 'DEMO: Emergency Evacuation Notice',
        message: 'Immediate evacuation required due to emergency conditions in your area. Follow local authorities instructions.',
        severity: 'critical',
        location: {
          latitude: this.currentLocation?.latitude || 0,
          longitude: this.currentLocation?.longitude || 0,
          radius: 5,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        isActive: true,
      };

      await this.storeAlerts([testAlert]);
      await this.triggerLocationAlert(testAlert);
      
      console.log('Delayed test notification sent!');
    }, delaySeconds * 1000);
    
    return `Test notification scheduled for ${delaySeconds} seconds from now.`;
  }

  // Force refresh alerts (for manual testing)
  async refreshAlerts() {
    console.log('Manually refreshing alerts...');
    if (this.currentLocation) {
      await this.fetchLocationBasedAlerts(this.currentLocation);
    }
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

// Create service instance
const locationAlertService = new LocationAlertService();

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
      locationAlertService.handleLocationUpdate(location);
    }
  }
});

export default locationAlertService;