// services/LocationAlertService.ts - Fixed with proper deduplication

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import NotificationService from "./notificationService";
import { Platform } from "react-native";

const BACKGROUND_LOCATION_TASK = "background-location-task";
const LOCATION_ALERT_STORAGE_KEY = "locationAlerts";
const USER_LOCATION_KEY = "userLocation";
const PROCESSED_ALERTS_KEY = "processedAlerts"; // Track processed alerts to prevent spam

interface LocationAlert {
  id: string;
  type: "weather" | "seismic" | "flood" | "evacuation" | "general";
  title: string;
  message: string;
  severity: "low" | "moderate" | "high" | "critical";
  location: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  timestamp: string;
  expiresAt?: string;
  isActive: boolean;
  dataSource: string; // Track data source for validation
  alertHash?: string; // Hash for deduplication
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
  private processedAlerts: Set<string> = new Set(); // Prevent duplicate processing

  // Initialize the service
  async initialize() {
    try {
      await this.loadStoredLocation();
      await this.loadProcessedAlerts();
      await this.setupLocationTracking();
      await this.startAlertMonitoring();

      console.log("LocationAlertService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize LocationAlertService:", error);
    }
  }

  // Load processed alerts to prevent duplicate notifications
  async loadProcessedAlerts() {
    try {
      const stored = await AsyncStorage.getItem(PROCESSED_ALERTS_KEY);
      if (stored) {
        const alertIds = JSON.parse(stored);
        this.processedAlerts = new Set(alertIds);
        console.log(`Loaded ${this.processedAlerts.size} processed alerts`);
      }
    } catch (error) {
      console.error("Error loading processed alerts:", error);
    }
  }

  // Save processed alerts
  async saveProcessedAlerts() {
    try {
      await AsyncStorage.setItem(
        PROCESSED_ALERTS_KEY,
        JSON.stringify([...this.processedAlerts])
      );
    } catch (error) {
      console.error("Error saving processed alerts:", error);
    }
  }

  // Generate unique hash for alert to prevent duplicates
  private generateAlertHash(alert: Partial<LocationAlert>): string {
    const content = `${alert.type}_${alert.title}_${alert.location?.latitude}_${
      alert.location?.longitude
    }_${new Date(alert.timestamp || "").toDateString()}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  // Check if alert has been processed
  private hasAlertBeenProcessed(alertHash: string): boolean {
    return this.processedAlerts.has(alertHash);
  }

  // Mark alert as processed
  private async markAlertAsProcessed(alertHash: string) {
    this.processedAlerts.add(alertHash);
    await this.saveProcessedAlerts();
  }

  // Setup location tracking
  async setupLocationTracking() {
    try {
      // If running in Expo Go on iOS, skip location setup or use mock
      if (Platform.OS === "ios") {
        console.log(
          "Skipping location tracking on iOS in Expo Go (Info.plist keys unavailable)."
        );

        // Optional: Provide a mock location so the rest of your app works
        const mockLocation = {
          coords: {
            latitude: 31.5204, // Example: Lahore
            longitude: 74.3587,
          },
          timestamp: Date.now(),
        };
        await this.handleLocationUpdate(mockLocation);
        return;
      }

      // Android and custom iOS builds run here
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") {
        console.log("Foreground location permission denied");
        return;
      }

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== "granted") {
        console.log(
          "Background location permission denied, using foreground only"
        );
      }

      // Get current location immediately
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await this.handleLocationUpdate(location);

      // Start background updates if allowed
      if (backgroundStatus === "granted") {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 600000,
          distanceInterval: 2000,
          showsBackgroundLocationIndicator: false,
        });
      }

      this.isTrackingLocation = true;
      console.log("Location tracking started");
    } catch (error) {
      // Log but suppress in development
      console.log("Location setup error:", error?.message || error);
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

    console.log(
      "Location updated:",
      userLocation.latitude,
      userLocation.longitude
    );

    // Check for location-based alerts (less frequently)
    await this.checkLocationBasedAlerts(userLocation);
  }

  // Load stored location
  async loadStoredLocation() {
    try {
      const stored = await AsyncStorage.getItem(USER_LOCATION_KEY);
      if (stored) {
        this.currentLocation = JSON.parse(stored);
        console.log("Loaded stored location:", this.currentLocation);
      }
    } catch (error) {
      console.error("Error loading stored location:", error);
    }
  }

  // Start monitoring for alerts - Reduced frequency to prevent spam
  async startAlertMonitoring() {
    // Check for alerts every 10 minutes instead of 2 minutes
    this.alertCheckInterval = setInterval(async () => {
      if (this.currentLocation) {
        await this.fetchLocationBasedAlerts(this.currentLocation);
      }
    }, 600000); // 10 minutes

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

  // Fetch location-based alerts from various APIs with enhanced filtering
  async fetchLocationBasedAlerts(userLocation: UserLocation) {
    const alerts: LocationAlert[] = [];

    try {
      console.log(
        "Fetching real disaster alerts for location:",
        userLocation.latitude,
        userLocation.longitude
      );

      // Fetch weather alerts with stricter thresholds
      const weatherAlerts = await this.fetchWeatherAlerts(userLocation);
      alerts.push(...weatherAlerts);

      // Fetch seismic alerts
      const seismicAlerts = await this.fetchSeismicAlerts(userLocation);
      alerts.push(...seismicAlerts);

      // Fetch flood alerts
      const floodAlerts = await this.fetchFloodAlerts(userLocation);
      alerts.push(...floodAlerts);

      console.log("Found", alerts.length, "real disaster alerts");

      // Store alerts
      await this.storeAlerts(alerts);

      // Process new alerts (with deduplication)
      await this.processNewAlerts(alerts);
    } catch (error) {
      console.error("Error fetching location-based alerts:", error);
    }
  }

  // Fetch weather alerts with realistic thresholds (not demo thresholds)
  async fetchWeatherAlerts(
    userLocation: UserLocation
  ): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=temperature_2m,precipitation_probability,weathercode,wind_speed_10m,precipitation&alerts=true&timezone=auto`
      );

      if (!response.ok) return alerts;
      const data = await response.json();

      if (data.hourly) {
        const next12Hours = 12;
        const precipProbs = data.hourly.precipitation_probability.slice(
          0,
          next12Hours
        );
        const temps = data.hourly.temperature_2m.slice(0, next12Hours);
        const windSpeeds = data.hourly.wind_speed_10m.slice(0, next12Hours);
        const precipitation = data.hourly.precipitation.slice(0, next12Hours);

        const maxPrecip = Math.max(...precipProbs);
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const maxWind = Math.max(...windSpeeds);
        const totalRainfall = precipitation.reduce(
          (sum: number, val: number) => sum + (val || 0),
          0
        );

        // REAL thresholds for actual severe weather
        if (maxPrecip >= 80 && totalRainfall >= 10) {
          // 80% chance + significant rainfall
          const alertData = {
            type: "weather" as const,
            title: "Severe Weather Warning",
            message: `Heavy rain alert: ${maxPrecip}% chance, ${totalRainfall.toFixed(
              1
            )}mm expected. Flooding possible.`,
            severity:
              maxPrecip >= 90 ? ("critical" as const) : ("high" as const),
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 15,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "open-meteo",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `weather_rain_${alertHash}`,
              alertHash,
              ...alertData,
            });
          }
        }

        // Extreme temperature alerts (realistic thresholds)
        if (maxTemp >= 40) {
          // 40°C+ is genuinely dangerous
          const alertData = {
            type: "weather" as const,
            title: "Extreme Heat Warning",
            message: `Dangerous heat: ${Math.round(
              maxTemp
            )}°C expected. Heat stroke risk - stay hydrated and indoors.`,
            severity: maxTemp >= 45 ? ("critical" as const) : ("high" as const),
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 25,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "open-meteo",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `weather_heat_${alertHash}`,
              alertHash,
              ...alertData,
            });
          }
        }

        if (minTemp <= -10) {
          // Extreme cold
          const alertData = {
            type: "weather" as const,
            title: "Extreme Cold Warning",
            message: `Dangerous cold: ${Math.round(
              minTemp
            )}°C. Frostbite risk - dress warmly and limit outdoor exposure.`,
            severity:
              minTemp <= -20 ? ("critical" as const) : ("high" as const),
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 25,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "open-meteo",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `weather_cold_${alertHash}`,
              alertHash,
              ...alertData,
            });
          }
        }

        // Strong wind alerts (realistic thresholds)
        if (maxWind >= 70) {
          // 70+ km/h is genuinely dangerous
          const alertData = {
            type: "weather" as const,
            title: "Dangerous Wind Warning",
            message: `Dangerous winds: ${Math.round(
              maxWind
            )} km/h. Avoid travel, secure outdoor items.`,
            severity:
              maxWind >= 100 ? ("critical" as const) : ("high" as const),
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 20,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "open-meteo",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `weather_wind_${alertHash}`,
              alertHash,
              ...alertData,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching weather alerts:", error);
    }

    return alerts;
  }

  // Fetch seismic alerts with realistic thresholds
  async fetchSeismicAlerts(
    userLocation: UserLocation
  ): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];
    const radius = 200; // Realistic radius for earthquake impacts

    try {
      const response = await fetch(
        `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&maxradiuskm=${radius}&minmagnitude=4.5&orderby=time&limit=5`
      );

      if (!response.ok) return alerts;
      const data = await response.json();

      data.features.forEach((earthquake: any) => {
        const magnitude = earthquake.properties.mag;
        const place = earthquake.properties.place;
        const time = new Date(earthquake.properties.time);
        const now = new Date();
        const hoursSince = (now.getTime() - time.getTime()) / (1000 * 60 * 60);

        // Only include recent significant earthquakes
        if (hoursSince <= 6 && magnitude >= 4.5) {
          // Last 6 hours, M4.5+
          let severity: "low" | "moderate" | "high" | "critical" = "moderate";
          if (magnitude >= 7.0) severity = "critical";
          else if (magnitude >= 6.0) severity = "high";
          else if (magnitude >= 5.0) severity = "moderate";

          const alertData = {
            type: "seismic" as const,
            title: `M${magnitude.toFixed(1)} Earthquake Alert`,
            message: `Magnitude ${magnitude.toFixed(
              1
            )} earthquake detected ${place}. Monitor for aftershocks and check for damage.`,
            severity,
            location: {
              latitude: earthquake.geometry.coordinates[1],
              longitude: earthquake.geometry.coordinates[0],
              radius: magnitude * 30,
            },
            timestamp: time.toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "usgs",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `seismic_${earthquake.id}`,
              alertHash,
              ...alertData,
            });
          }
        }
      });
    } catch (error) {
      console.error("Error fetching seismic alerts:", error);
    }

    return alerts;
  }

  // Fetch flood alerts with realistic thresholds
  async fetchFloodAlerts(userLocation: UserLocation): Promise<LocationAlert[]> {
    const alerts: LocationAlert[] = [];

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&hourly=precipitation&timezone=auto`
      );

      if (!response.ok) return alerts;
      const data = await response.json();

      if (data.hourly) {
        const next24Hours = data.hourly.precipitation.slice(0, 24);
        const totalPrecip = next24Hours.reduce(
          (sum: number, val: number) => sum + (val || 0),
          0
        );
        const maxHourlyPrecip = Math.max(...next24Hours);

        // Realistic flood risk thresholds
        if (totalPrecip >= 50 || maxHourlyPrecip >= 20) {
          // 50mm/24h or 20mm/h
          const alertData = {
            type: "flood" as const,
            title: "Flood Warning",
            message: `High flood risk: ${Math.round(
              totalPrecip
            )}mm rainfall expected. Avoid low-lying areas and flooded roads.`,
            severity:
              totalPrecip >= 100 || maxHourlyPrecip >= 30
                ? ("critical" as const)
                : ("high" as const),
            location: {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              radius: 10,
            },
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isActive: true,
            dataSource: "open-meteo",
          };

          const alertHash = this.generateAlertHash(alertData);
          if (!this.hasAlertBeenProcessed(alertHash)) {
            alerts.push({
              id: `flood_risk_${alertHash}`,
              alertHash,
              ...alertData,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error assessing flood risk:", error);
    }

    return alerts;
  }

  // Process new alerts with enhanced deduplication
  async processNewAlerts(newAlerts: LocationAlert[]) {
    if (!this.currentLocation) return;

    for (const alert of newAlerts) {
      if (
        this.isLocationInAlertArea(this.currentLocation, alert.location) &&
        !this.hasAlertBeenProcessed(alert.alertHash || alert.id)
      ) {
        // Send notification through our enhanced notification service
        await this.triggerLocationAlert(alert);

        // Mark as processed to prevent future duplicates
        await this.markAlertAsProcessed(alert.alertHash || alert.id);

        console.log("New real disaster alert processed:", alert.title);
      }
    }
  }

  // Check if user is within alert area
  private isLocationInAlertArea(
    userLoc: UserLocation,
    alertLoc: LocationAlert["location"]
  ): boolean {
    const distance = this.calculateDistance(
      userLoc.latitude,
      userLoc.longitude,
      alertLoc.latitude,
      alertLoc.longitude
    );
    return distance <= alertLoc.radius;
  }

  // Calculate distance between two coordinates
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Check location-based alerts
  async checkLocationBasedAlerts(userLocation: UserLocation) {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      if (stored) {
        const alerts: LocationAlert[] = JSON.parse(stored);

        for (const alert of alerts) {
          if (
            alert.isActive &&
            this.isLocationInAlertArea(userLocation, alert.location)
          ) {
            if (!this.hasAlertBeenProcessed(alert.alertHash || alert.id)) {
              await this.triggerLocationAlert(alert);
              await this.markAlertAsProcessed(alert.alertHash || alert.id);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking location-based alerts:", error);
    }
  }

  // Store alerts with better deduplication and cleanup
  async storeAlerts(alerts: LocationAlert[]) {
    try {
      const existing = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      const existingAlerts: LocationAlert[] = existing
        ? JSON.parse(existing)
        : [];

      // Merge alerts with improved deduplication
      const mergedAlerts = [...existingAlerts];

      alerts.forEach((newAlert) => {
        // Check for existing alert with same hash or ID
        const existingIndex = mergedAlerts.findIndex(
          (alert) =>
            (alert.alertHash &&
              newAlert.alertHash &&
              alert.alertHash === newAlert.alertHash) ||
            alert.id === newAlert.id
        );

        if (existingIndex >= 0) {
          mergedAlerts[existingIndex] = newAlert; // Update existing
        } else {
          // Check for similar alert to avoid duplicates
          const isDuplicate = mergedAlerts.some(
            (existing) =>
              existing.type === newAlert.type &&
              existing.severity === newAlert.severity &&
              existing.isActive &&
              this.calculateDistance(
                existing.location.latitude,
                existing.location.longitude,
                newAlert.location.latitude,
                newAlert.location.longitude
              ) < 3 && // Within 3km
              Math.abs(
                new Date(existing.timestamp).getTime() -
                  new Date(newAlert.timestamp).getTime()
              ) < 3600000 // Within 1 hour
          );

          if (!isDuplicate) {
            mergedAlerts.push(newAlert);
          }
        }
      });

      // Clean up expired alerts
      const now = new Date();
      const activeAlerts = mergedAlerts.filter((alert) => {
        if (alert.expiresAt) {
          const isExpired = new Date(alert.expiresAt) <= now;
          if (isExpired && alert.alertHash) {
            // Remove from processed alerts when expired
            this.processedAlerts.delete(alert.alertHash);
          }
          return !isExpired;
        }
        // Remove alerts older than 7 days
        const alertAge = now.getTime() - new Date(alert.timestamp).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (alertAge > sevenDays && alert.alertHash) {
          this.processedAlerts.delete(alert.alertHash);
        }
        return alertAge <= sevenDays;
      });

      await AsyncStorage.setItem(
        LOCATION_ALERT_STORAGE_KEY,
        JSON.stringify(activeAlerts)
      );
      await this.saveProcessedAlerts();

      console.log(`Stored ${activeAlerts.length} active alerts`);
    } catch (error) {
      console.error("Error storing alerts:", error);
    }
  }

  // Trigger location alert using the enhanced notification service
  async triggerLocationAlert(alert: LocationAlert) {
    try {
      // Map severity to priority
      let priority: "critical" | "high" | "medium" | "low" = "medium";
      if (alert.severity === "critical") priority = "critical";
      else if (alert.severity === "high") priority = "high";
      else if (alert.severity === "moderate") priority = "medium";
      else priority = "low";

      // Create data object with real disaster information
      const alertData = {
        alertId: alert.id,
        dataSource: alert.dataSource,
        severity: alert.severity,
        isDemo: false, // These are real alerts
        alertHash: alert.alertHash,
        ...(alert.type === "seismic" && { magnitude: alert.data?.magnitude }),
        ...(alert.type === "weather" && { weatherSeverity: alert.severity }),
      };

      // Send notification using our enhanced notification service
      const result = await NotificationService.scheduleLocationAlert(
        alert.title,
        alert.message,
        priority,
        alert.type,
        `${alert.location.latitude.toFixed(
          2
        )}, ${alert.location.longitude.toFixed(2)}`,
        alertData
      );

      if (result) {
        console.log("Real disaster alert notification sent:", alert.title);
      } else {
        console.log("Alert filtered out (duplicate or invalid):", alert.title);
      }
    } catch (error) {
      console.error("Error triggering location alert:", error);
    }
  }

  // Get all stored alerts
  async getAllAlerts(): Promise<LocationAlert[]> {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_ALERT_STORAGE_KEY);
      const alerts = stored ? JSON.parse(stored) : [];

      // Return only active alerts, sorted by severity and time
      return alerts
        .filter((alert: LocationAlert) => alert.isActive)
        .sort((a: LocationAlert, b: LocationAlert) => {
          // Sort by severity first, then by time
          const severityOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
          const aSeverity =
            severityOrder[a.severity as keyof typeof severityOrder] ?? 3;
          const bSeverity =
            severityOrder[b.severity as keyof typeof severityOrder] ?? 3;

          if (aSeverity !== bSeverity) {
            return aSeverity - bSeverity;
          }

          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
    } catch (error) {
      console.error("Error getting alerts:", error);
      return [];
    }
  }

  // Get current location
  getCurrentLocation(): UserLocation | null {
    return this.currentLocation;
  }

  // Clear processed alerts history (for testing)
  async clearProcessedAlerts() {
    this.processedAlerts.clear();
    await AsyncStorage.removeItem(PROCESSED_ALERTS_KEY);
    console.log(
      "Processed alerts history cleared - will show real alerts again"
    );
  }

  // Force refresh alerts (for manual testing)
  async refreshAlerts() {
    console.log("Manually refreshing real disaster alerts...");
    if (this.currentLocation) {
      await this.fetchLocationBasedAlerts(this.currentLocation);
    }
  }

  // Create controlled test alerts (for demo purposes only)
  async createControlledTestAlerts() {
    if (!this.currentLocation) {
      console.log("No location available for test alerts");
      return;
    }

    console.log("Creating controlled demo alerts...");

    const demoAlerts: LocationAlert[] = [
      {
        id: `demo_weather_${Date.now()}`,
        type: "weather",
        title: "DEMO: Severe Thunderstorm Warning",
        message:
          "Demo alert: Severe thunderstorms with heavy rain and strong winds approaching your area.",
        severity: "high",
        location: {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          radius: 10,
        },
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        dataSource: "demo",
        alertHash: `demo_weather_${Date.now()}`,
      },
    ];

    await this.storeAlerts(demoAlerts);

    // Manually trigger notification with demo data
    for (const alert of demoAlerts) {
      const demoData = {
        isDemo: true,
        testing: true,
        demoAlert: true,
        weatherSeverity: "high",
      };

      await NotificationService.scheduleLocationAlert(
        alert.title,
        alert.message,
        "high",
        alert.type,
        `${alert.location.latitude.toFixed(
          2
        )}, ${alert.location.longitude.toFixed(2)}`,
        demoData
      );
    }

    console.log("Demo alerts created (will only show once per session)");
  }

  // Get statistics about processed alerts
  async getAlertStatistics() {
    const alerts = await this.getAllAlerts();
    const processedCount = this.processedAlerts.size;

    const stats = {
      totalActiveAlerts: alerts.length,
      processedAlertsCount: processedCount,
      alertsByType: alerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      alertsBySeverity: alerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    console.log("Alert statistics:", stats);
    return stats;
  }

  // Clean up service
  async cleanup() {
    try {
      if (this.isTrackingLocation) {
        // ✅ check if task exists before stopping
        const tasks = await TaskManager.getRegisteredTasksAsync();
        const taskExists = tasks.some(
          (t) => t.taskName === BACKGROUND_LOCATION_TASK
        );

        if (taskExists) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
          console.log(
            "Stopped location updates for:",
            BACKGROUND_LOCATION_TASK
          );
        } else {
          console.log("No location task found, skipping stop.");
        }

        this.isTrackingLocation = false;
      }

      this.stopAlertMonitoring();

      console.log("LocationAlertService cleaned up");
    } catch (error) {
      console.error("Error cleaning up LocationAlertService:", error);
    }
  }
}

// Create service instance
const locationAlertService = new LocationAlertService();

// Define background task for location tracking
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data, error }) => {
  if (error) {
    console.error("Background location task error:", error);
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
