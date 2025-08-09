// services/LocationAlertService.ts
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from './notificationService';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

const BACKGROUND_LOCATION_TASK = 'background-location-task';
const LOCATION_ALERT_STORAGE_KEY = 'locationAlerts';
const USER_LOCATION_KEY = 'userLocation';
const NOTIFIED_ALERTS_KEY = 'notifiedAlerts';
const FCM_TOKEN_KEY = 'fcmToken';

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
  fcmSent?: boolean; // Track if FCM notification was sent
}

interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface FCMUserData {
  fcmToken: string;
  location: UserLocation;
  userId: string;
  lastUpdated: string;
  alertPreferences: {
    weather: boolean;
    seismic: boolean;
    flood: boolean;
    evacuation: boolean;
    minSeverity: 'low' | 'moderate' | 'high' | 'critical';
  };
}

class LocationAlertService {
  private isTrackingLocation = false;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private currentLocation: UserLocation | null = null;
  private notifiedAlerts: Set<string> = new Set();
  private fcmToken: string | null = null;
  private userId: string | null = null;

  // Initialize the service with FCM
  async initialize(userId?: string) {
    try {
      this.userId = userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.loadStoredLocation();
      await this.loadNotifiedAlerts();
      await this.setupFCM();
      await this.setupLocationTracking();
      await this.startAlertMonitoring();
      
      console.log('LocationAlertService with FCM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LocationAlertService:', error);
    }
  }

  // Setup Firebase Cloud Messaging
  async setupFCM() {
    try {
      // Request permission for notifications
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('FCM permission denied');
        return;
      }

      // Get FCM token
      const token = await messaging().getToken();
      this.fcmToken = token;
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
      
      console.log('FCM Token:', token);

      // Register user location and token with Firestore
      await this.registerUserWithFirestore();

      // Setup FCM message handlers
      this.setupFCMHandlers();

      // Subscribe to location-based topics
      await this.subscribeToLocationTopics();

    } catch (error) {
      console.error('Error setting up FCM:', error);
    }
  }

  // Register user data with Firestore for server-side alert targeting
  async registerUserWithFirestore() {
    if (!this.fcmToken || !this.userId || !this.currentLocation) return;

    try {
      const userData: FCMUserData = {
        fcmToken: this.fcmToken,
        location: this.currentLocation,
        userId: this.userId,
        lastUpdated: new Date().toISOString(),
        alertPreferences: {
          weather: true,
          seismic: true,
          flood: true,
          evacuation: true,
          minSeverity: 'moderate',
        },
      };

      await firestore()
        .collection('alertUsers')
        .doc(this.userId)
        .set(userData, { merge: true });

      console.log('User registered with Firestore for location alerts');
    } catch (error) {
      console.error('Error registering user with Firestore:', error);
    }
  }

  // Setup FCM message handlers
  setupFCMHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
      
      if (remoteMessage.data?.alertType) {
        await this.handleFCMAlert(remoteMessage);
      }
    });

    // Handle foreground messages
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived!', remoteMessage);
      
      if (remoteMessage.data?.alertType) {
        await this.handleFCMAlert(remoteMessage);
        
        // Show local notification for immediate visibility
        if (remoteMessage.notification) {
          await NotificationService.scheduleLocalNotification(
            remoteMessage.notification.title || 'Location Alert',
            remoteMessage.notification.body || 'New alert for your area',
            { seconds: 1 }
          );
        }
      }
    });

    return unsubscribe;
  }

  // Handle incoming FCM alerts
  async handleFCMAlert(remoteMessage: any) {
    try {
      const alertData = remoteMessage.data;
      
      const fcmAlert: LocationAlert = {
        id: alertData.alertId || `fcm_${Date.now()}`,
        type: alertData.alertType,
        title: remoteMessage.notification?.title || alertData.title,
        message: remoteMessage.notification?.body || alertData.message,
        severity: alertData.severity || 'moderate',
        location: {
          latitude: parseFloat(alertData.latitude),
          longitude: parseFloat(alertData.longitude),
          radius: parseFloat(alertData.radius) || 10,
        },
        timestamp: alertData.timestamp || new Date().toISOString(),
        expiresAt: alertData.expiresAt,
        isActive: true,
        fcmSent: true,
      };

      // Store the FCM alert locally
      await this.storeAlerts([fcmAlert]);
      
      console.log('FCM alert processed:', fcmAlert.title);
    } catch (error) {
      console.error('Error handling FCM alert:', error);
    }
  }

  // Subscribe to location-based topics
  async subscribeToLocationTopics() {
    if (!this.currentLocation) return;

    try {
      // Create location-based topics (you can customize these)
      const lat = Math.round(this.currentLocation.latitude * 10) / 10; // Round to 1 decimal
      const lon = Math.round(this.currentLocation.longitude * 10) / 10;
      
      const topics = [
        `alerts_${lat}_${lon}`,
        `weather_alerts_region`,
        `emergency_alerts_global`,
        `seismic_alerts_region`,
      ];

      for (const topic of topics) {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic}`);
      }
    } catch (error) {
      console.error('Error subscribing to topics:', error);
    }
  }

  // Update user location in Firestore for server-side targeting
  async updateUserLocationInFirestore(userLocation: UserLocation) {
    if (!this.userId || !this.fcmToken) return;

    try {
      await firestore()
        .collection('alertUsers')
        .doc(this.userId)
        .update({
          location: userLocation,
          lastUpdated: new Date().toISOString(),
        });

      // Update topic subscriptions based on new location
      await this.updateLocationTopics(userLocation);
      
    } catch (error) {
      console.error('Error updating user location in Firestore:', error);
    }
  }

  // Update topic subscriptions when location changes significantly
  async updateLocationTopics(newLocation: UserLocation) {
    try {
      // Unsubscribe from old location topics if location changed significantly
      if (this.currentLocation) {
        const distance = this.calculateDistance(
          this.currentLocation.latitude,
          this.currentLocation.longitude,
          newLocation.latitude,
          newLocation.longitude
        );

        if (distance > 10) { // If moved more than 10km
          const oldLat = Math.round(this.currentLocation.latitude * 10) / 10;
          const oldLon = Math.round(this.currentLocation.longitude * 10) / 10;
          await messaging().unsubscribeFromTopic(`alerts_${oldLat}_${oldLon}`);
          
          // Subscribe to new location topics
          const newLat = Math.round(newLocation.latitude * 10) / 10;
          const newLon = Math.round(newLocation.longitude * 10) / 10;
          await messaging().subscribeToTopic(`alerts_${newLat}_${newLon}`);
          
          console.log(`Updated location topics: ${oldLat},${oldLon} → ${newLat},${newLon}`);
        }
      }
    } catch (error) {
      console.error('Error updating location topics:', error);
    }
  }

  // Send alert via FCM (for server-side usage)
  async sendFCMAlert(alert: LocationAlert, targetTokens: string[]) {
    try {
      // This would typically be called from your backend server
      // Including here for reference - you'd implement this on your server
      const message = {
        notification: {
          title: alert.title,
          body: alert.message,
        },
        data: {
          alertId: alert.id,
          alertType: alert.type,
          severity: alert.severity,
          latitude: alert.location.latitude.toString(),
          longitude: alert.location.longitude.toString(),
          radius: alert.location.radius.toString(),
          timestamp: alert.timestamp,
          expiresAt: alert.expiresAt || '',
        },
        tokens: targetTokens,
      };

      // This would be called from your server using Firebase Admin SDK
      console.log('FCM message ready to send:', message);
      
    } catch (error) {
      console.error('Error preparing FCM alert:', error);
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
        timeInterval: 300000, // Update every 5 minutes
        distanceInterval: 500, // Update if moved 500 meters
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
    
    // Update location in Firestore for FCM targeting
    await this.updateUserLocationInFirestore(userLocation);
    
    // Check for location-based alerts (less frequently)
    const stored = await AsyncStorage.getItem(USER_LOCATION_KEY);
    if (stored) {
      const lastLocation = JSON.parse(stored);
      const distance = this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lastLocation.latitude,
        lastLocation.longitude
      );
      
      const timeDiff = userLocation.timestamp - lastLocation.timestamp;
      if (distance > 1 || timeDiff > 1800000) { // 30 minutes
        await this.checkLocationBasedAlerts(userLocation);
      }
    }
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

  // Start monitoring for alerts - MUCH less frequent
  async startAlertMonitoring() {
    // Check for alerts every 30 minutes instead of 5
    this.alertCheckInterval = setInterval(async () => {
      if (this.currentLocation) {
        await this.fetchLocationBasedAlerts(this.currentLocation);
      }
    }, 1800000); // 30 minutes
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
      // Fetch weather alerts (only severe ones)
      const weatherAlerts = await this.fetchSevereWeatherAlerts(userLocation);
      alerts.push(...weatherAlerts);

      // Fetch seismic alerts (only significant ones)
      const seismicAlerts = await this.fetchSignificantSeismicAlerts(userLocation);
      alerts.push(...seismicAlerts);

      // Fetch flood alerts (only verified ones)
      const floodAlerts = await this.fetchVerifiedFloodAlerts(userLocation);
      alerts.push(...floodAlerts);

      // Store alerts
      await this.storeAlerts(alerts);

      // Process new alerts (with spam prevention and FCM)
      await this.processNewAlertsWithFCM(alerts);

    } catch (error) {
      console.error('Error fetching location-based alerts:', error);
    }
  }

  // Fetch only severe weather alerts
  async fetchSevereWeatherAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=temperature_2m,precipitation_probability,weathercode,wind_speed_10m&alerts=true&timezone=auto`
      );
      
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

        // Only alert for SEVERE conditions
        if (maxPrecip >= 90) {
          alerts.push({
            id: `severe_weather_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Severe Weather Warning',
            message: `Extreme precipitation (${maxPrecip}%) expected. Severe flooding possible.`,
            severity: 'high',
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

        if (maxTemp >= 45) {
          alerts.push({
            id: `extreme_heat_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Extreme Heat Warning',
            message: `Dangerous temperatures up to ${Math.round(maxTemp)}°C. Heat stroke risk high.`,
            severity: 'critical',
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

        if (minTemp <= -20) {
          alerts.push({
            id: `extreme_cold_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'Extreme Cold Warning',
            message: `Dangerous cold temperatures down to ${Math.round(minTemp)}°C. Frostbite risk high.`,
            severity: 'critical',
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

        if (maxWind >= 70) {
          alerts.push({
            id: `high_wind_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'weather',
            title: 'High Wind Warning',
            message: `Dangerous winds up to ${Math.round(maxWind)} km/h expected. Avoid outdoor activities.`,
            severity: 'high',
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
      console.error('Error fetching severe weather alerts:', error);
    }

    return alerts;
  }

  // Fetch only significant seismic alerts
  async fetchSignificantSeismicAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    const radius = 200;

    try {
      const response = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&maxradiuskm=${radius}&minmagnitude=5.0&orderby=time&limit=5`
      );
      
      const data = await response.json();
      
      data.features.forEach((earthquake: any) => {
        const magnitude = earthquake.properties.mag;
        const place = earthquake.properties.place;
        const time = new Date(earthquake.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);
        
        if (hoursSince <= 3 && magnitude >= 5.0) {
          let severity: 'low' | 'moderate' | 'high' | 'critical' = 'moderate';
          if (magnitude >= 7.0) severity = 'critical';
          else if (magnitude >= 6.0) severity = 'high';

          alerts.push({
            id: `seismic_${earthquake.id}`,
            type: 'seismic',
            title: `Significant Earthquake - M${magnitude.toFixed(1)}`,
            message: `A magnitude ${magnitude.toFixed(1)} earthquake occurred ${place}. Monitor for aftershocks and check local advisories.`,
            severity,
            location: {
              latitude: earthquake.geometry.coordinates[1],
              longitude: earthquake.geometry.coordinates[0],
              radius: magnitude * 30,
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

  // Fetch only verified flood alerts with stricter criteria
  async fetchVerifiedFloodAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      const gdacsAlerts = await this.fetchGDACSFloodAlerts(userLocation);
      const weatherFloodRisk = await this.assessWeatherFloodRisk(userLocation);
      
      alerts.push(...gdacsAlerts);
      alerts.push(...weatherFloodRisk);

    } catch (error) {
      console.error('Error fetching flood alerts:', error);
    }

    return alerts;
  }

  // Get GDACS flood alerts with better parsing
  async fetchGDACSFloodAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      const response = await fetch(
        `https://www.gdacs.org/gdacsapi/api/events/geteventlist/JSON?eventtype=FL&alertlevel=Red,Orange`
      );
      
      if (!response.ok) return alerts;
      const data = await response.json();
      
      if (data.features) {
        for (const event of data.features) {
          const eventLat = event.geometry?.coordinates?.[1];
          const eventLon = event.geometry?.coordinates?.[0];
          
          if (!eventLat || !eventLon) continue;
          
          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            eventLat,
            eventLon
          );

          if (distance <= 50) {
            const alertLevel = event.properties?.alertlevel || '';
            const severity = alertLevel === 'Red' ? 'critical' : 'high';
            
            alerts.push({
              id: `gdacs_flood_${event.properties?.eventid || Date.now()}`,
              type: 'flood',
              title: 'Major Flood Warning',
              message: `${alertLevel} level flood alert: ${event.properties?.name || 'Severe flooding reported in your area.'}`,
              severity,
              location: {
                latitude: eventLat,
                longitude: eventLon,
                radius: 50,
              },
              timestamp: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
              isActive: true,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching GDACS flood alerts:', error);
    }

    return alerts;
  }

  // Assess flood risk from extreme weather conditions
  async assessWeatherFloodRisk(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=precipitation,precipitation_probability&timezone=auto`
      );
      
      const data = await response.json();
      
      if (data.hourly) {
        const next24Hours = data.hourly.precipitation.slice(0, 24);
        const precipProbs = data.hourly.precipitation_probability.slice(0, 24);
        
        const totalPrecip = next24Hours.reduce((sum: number, val: number) => sum + (val || 0), 0);
        const maxHourlyPrecip = Math.max(...next24Hours);
        const avgPrecipProb = precipProbs.reduce((sum: number, val: number) => sum + val, 0) / precipProbs.length;
        
        // Only alert for EXTREME precipitation
        if (totalPrecip >= 50 || (maxHourlyPrecip >= 15 && avgPrecipProb >= 85)) {
          alerts.push({
            id: `weather_flood_${userLocation.latitude}_${userLocation.longitude}_${new Date().toDateString()}`,
            type: 'flood',
            title: 'Flash Flood Risk',
            message: `Extreme rainfall expected (${Math.round(totalPrecip)}mm/24h). Flash flooding possible in low-lying areas.`,
            severity: totalPrecip >= 100 ? 'critical' : 'high',
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
      console.error('Error assessing weather flood risk:', error);
    }

    return alerts;
  }

  // Subscribe to location-based FCM topics
  async subscribeToLocationTopics() {
    if (!this.currentLocation) return;

    try {
      const lat = Math.round(this.currentLocation.latitude * 10) / 10;
      const lon = Math.round(this.currentLocation.longitude * 10) / 10;
      
      const topics = [
        `alerts_${lat}_${lon}`,
        `weather_alerts_region`,
        `emergency_alerts_global`,
        `seismic_alerts_region`,
      ];

      for (const topic of topics) {
        await messaging().subscribeToTopic(topic);
        console.log(`Subscribed to topic: ${topic}`);
      }
    } catch (error) {
      console.error('Error subscribing to topics:', error);
    }
  }

  // Process new alerts with FCM integration and spam prevention
  async processNewAlertsWithFCM(newAlerts: LocationAlert[]) {
    if (!this.currentLocation) return;

    for (const alert of newAlerts) {
      if (
        this.isLocationInAlertArea(this.currentLocation, alert.location) &&
        !this.notifiedAlerts.has(alert.id) &&
        (alert.severity === 'high' || alert.severity === 'critical')
      ) {
        // Send local notification
        await this.triggerLocationAlert(alert);
        
        // Send to Firestore for FCM distribution (server will handle sending)
        await this.sendAlertToFirestore(alert);
        
        // Mark as notified
        this.notifiedAlerts.add(alert.id);
        await this.saveNotifiedAlerts();
      }
    }
  }

  // Send alert to Firestore for FCM distribution
  async sendAlertToFirestore(alert: LocationAlert) {
    try {
      await firestore()
        .collection('pendingAlerts')
        .doc(alert.id)
        .set({
          ...alert,
          createdBy: this.userId,
          needsFCMDistribution: true,
          targetLocation: {
            latitude: alert.location.latitude,
            longitude: alert.location.longitude,
            radius: alert.location.radius,
          },
        });

      console.log('Alert sent to Firestore for FCM distribution:', alert.title);
    } catch (error) {
      console.error('Error sending alert to Firestore:', error);
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
        // Check for existing alert with same type and nearby location
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
          const existingIndex = mergedAlerts.findIndex(alert => alert.id === newAlert.id);
          if (existingIndex >= 0) {
            mergedAlerts[existingIndex] = newAlert;
          } else {
            mergedAlerts.push(newAlert);
          }
        }
      });

      // Clean up expired alerts and old notified alerts
      const activeAlerts = mergedAlerts.filter(alert => {
        if (alert.expiresAt) {
          const isExpired = new Date(alert.expiresAt) <= new Date();
          if (isExpired) {
            // Remove from notified set if expired
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

  // Trigger location alert (both local and FCM preparation)
  async triggerLocationAlert(alert: LocationAlert) {
    try {
      // Send local push notification
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

  // Get FCM token
  async getFCMToken(): Promise<string | null> {
    return this.fcmToken;
  }

  // Update alert preferences
  async updateAlertPreferences(preferences: Partial<FCMUserData['alertPreferences']>) {
    if (!this.userId) return;

    try {
      await firestore()
        .collection('alertUsers')
        .doc(this.userId)
        .update({
          alertPreferences: preferences,
          lastUpdated: new Date().toISOString(),
        });

      console.log('Alert preferences updated');
    } catch (error) {
      console.error('Error updating alert preferences:', error);
    }
  }

  // Clear notification history (for testing)
  async clearNotificationHistory() {
    this.notifiedAlerts.clear();
    await AsyncStorage.removeItem(NOTIFIED_ALERTS_KEY);
    console.log('Notification history cleared');
  }

  // Create test alerts for development (less spammy)
  async createTestAlerts() {
    if (!this.currentLocation) return;

    const testAlerts: LocationAlert[] = [
      {
        id: `test_critical_${Date.now()}`,
        type: 'weather',
        title: 'TEST: Critical Weather Alert',
        message: 'This is a test critical weather alert for development purposes.',
        severity: 'critical',
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 10,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes only
        isActive: true,
      },
    ];

    await this.storeAlerts(testAlerts);
    await this.processNewAlertsWithFCM(testAlerts);
  }

  // Clean up service
  async cleanup() {
    try {
      if (this.isTrackingLocation) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        this.isTrackingLocation = false;
      }
      
      this.stopAlertMonitoring();
      
      // Unsubscribe from FCM topics
      if (this.currentLocation) {
        const lat = Math.round(this.currentLocation.latitude * 10) / 10;
        const lon = Math.round(this.currentLocation.longitude * 10) / 10;
        
        const topics = [
          `alerts_${lat}_${lon}`,
          `weather_alerts_region`,
          `emergency_alerts_global`,
          `seismic_alerts_region`,
        ];

        for (const topic of topics) {
          try {
            await messaging().unsubscribeFromTopic(topic);
          } catch (error) {
            console.error(`Error unsubscribing from topic ${topic}:`, error);
          }
        }
      }
      
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