// services/NotificationService.ts - Fixed FCM Integration with Banner Notifications

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_STORAGE_KEY = "storedNotifications";
const SHOWN_ALERTS_KEY = "shownAlerts";
const FCM_TOKEN_KEY = "fcmToken";

export interface NotificationData {
  id: string;
  type:
    | "emergency"
    | "weather"
    | "seismic"
    | "flood"
    | "evacuation"
    | "warning"
    | "info"
    | "success";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  location?: string;
  priority: "critical" | "high" | "medium" | "low";
  source: "location" | "system" | "manual" | "fcm";
  data?: any;
  alertHash?: string;
}

// Configure notification behavior - FIXED for GUARANTEED banner display
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority || "medium";
    const source = notification.request.content.data?.source || "system";
    const showBanner = notification.request.content.data?.showBanner || false;
    const originalFCM = notification.request.content.data?.originalFCM || false;

    console.log("NotificationHandler called:", {
      title: notification.request.content.title,
      source,
      priority,
      showBanner,
      originalFCM,
    });

    // FORCE show alerts for FCM notifications, banner requests, or high priority
    const shouldShowAlert =
      source === "fcm" ||
      showBanner === true ||
      originalFCM === true ||
      priority === "critical" ||
      priority === "high";

    console.log("Notification decision:", { shouldShowAlert });

    return {
      shouldShowAlert: shouldShowAlert,
      shouldPlaySound: priority === "critical" || priority === "high",
      shouldSetBadge: true,
    };
  },
});

// FCM Integration variables
let messaging: any = null;
let isFCMSupported = false;

// Helper function to detect if we're in Expo Go
const isExpoGo = () => {
  try {
    return __DEV__ && !Device.isDevice;
  } catch {
    return false;
  }
};

// Helper function to check if FCM is available
const isFCMAvailable = async (): Promise<boolean> => {
  try {
    // Check if we're in Expo Go (FCM not available)
    if (isExpoGo()) {
      console.log("Running in Expo Go - FCM not available");
      return false;
    }

    // Use a dynamic import within a try-catch block to check for module existence.
    // This is the modern, asynchronous way to handle optional modules.
    await import("@react-native-firebase/messaging");
    console.log("Firebase messaging module is available.");
    return true;
  } catch (error: any) {
    console.log("Firebase messaging not available:", error.message || error);
    return false;
  }
};

// Initialize FCM conditionally
const initializeFCM = async () => {
  try {
    // First check if FCM is available
    if (!isFCMAvailable()) {
      console.log("FCM not available - using Expo notifications only");
      return false;
    }

    console.log("Attempting to initialize FCM...");

    // Dynamic import to avoid loading Firebase in Expo Go
    const fcmModule = await import("@react-native-firebase/messaging");
    messaging = fcmModule.default;

    // Check if device is registered for remote messages
    if (Platform.OS === "ios") {
      isFCMSupported = await messaging().isDeviceRegisteredForRemoteMessages;
    } else {
      isFCMSupported = true; // Android doesn't need registration check
    }

    console.log("FCM initialized successfully, supported:", isFCMSupported);
    return true;
  } catch (error) {
    console.log("FCM initialization failed:", error.message);
    return false;
  }
};

class NotificationService {
  expoPushToken: string | null = null;
  fcmToken: string | null = null;
  private listeners: (() => void)[] = [];
  private onNotificationReceived?: (notification: NotificationData) => void;
  private isInitialized = false;
  private shownAlerts: Set<string> = new Set();
  private isFCMAvailable = false;

  async initialize(
    onNotificationReceived?: (notification: NotificationData) => void
  ) {
    if (this.isInitialized) {
      console.log("NotificationService already initialized");
      return;
    }

    this.onNotificationReceived = onNotificationReceived;

    // Initialize FCM first (only if available)
    this.isFCMAvailable = await initializeFCM();

    if (this.isFCMAvailable) {
      await this.setupFCM();
    } else {
      // Always fallback to Expo notifications
      await this.registerForPushNotifications();
      await this.setupFallbackFCM();
    }

    await this.loadShownAlerts();
    this.setupNotificationListeners();
    await this.setupNotificationChannels();
    this.isInitialized = true;

    console.log(
      `NotificationService initialized - FCM Available: ${this.isFCMAvailable}`
    );
  }

  // FIXED: Complete FCM Setup for ALL App States (Foreground, Background, Closed)
  async setupFCM() {
    if (!this.isFCMAvailable || !messaging) {
      console.log("FCM not available, skipping FCM setup");
      return;
    }

    try {
      console.log("Setting up Firebase Cloud Messaging for all app states...");

      // Request permission for notifications with all required permissions
      const authStatus = await messaging().requestPermission({
        alert: true,
        announcement: false,
        badge: true,
        carPlay: true,
        criticalAlert: true,
        provisional: false,
        sound: true,
      });

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log("FCM permission not granted");
        // Fallback to Expo notifications
        await this.registerForPushNotifications();
        return;
      }

      // Register device for remote messages (iOS only)
      if (Platform.OS === "ios" && !isFCMSupported) {
        await messaging().registerDeviceForRemoteMessages();
        console.log("iOS device registered for remote messages");
      }

      // Get FCM registration token
      const token = await messaging().getToken();
      if (token) {
        this.fcmToken = token;
        await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
        console.log("FCM Token obtained:", token.substring(0, 20) + "...");

        // Send token to your server for targeting
        await this.sendTokenToServer(token);
      } else {
        console.log("No FCM token received");
      }

      // Listen for token refresh
      const unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (newToken) => {
          console.log("FCM token refreshed");
          this.fcmToken = newToken;
          await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
          await this.sendTokenToServer(newToken);
        }
      );

      // CRITICAL: Handle background messages (when app is in background/closed)
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log("Background/Closed FCM message received:", remoteMessage);

        // Store the notification for when app opens
        await this.handleFCMMessage(remoteMessage, false);

        // Background messages automatically show system notifications
        // No need to schedule local notifications here
        console.log("Background FCM message processed and stored");

        return Promise.resolve();
      });

      // ENHANCED: Handle foreground messages with GUARANTEED banner display
      const unsubscribeForeground = messaging().onMessage(
        async (remoteMessage) => {
          console.log("🔥 FOREGROUND FCM message received:", remoteMessage);

          // CRITICAL: Show banner FIRST, then process
          console.log("🎯 Showing banner immediately...");
          await this.showFCMNotificationBanner(remoteMessage);

          // Then handle and store the message
          console.log("📝 Processing and storing message...");
          await this.handleFCMMessage(remoteMessage, true);

          console.log("✅ Foreground FCM processing complete");
        }
      );

      // Handle notification opened from background/closed state
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log(
          "FCM notification opened app from background:",
          remoteMessage
        );
        this.handleNotificationOpen(remoteMessage);
      });

      // Handle notification that opened app from closed/killed state
      messaging()
        .getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log(
              "FCM notification opened app from closed state:",
              remoteMessage
            );
            this.handleNotificationOpen(remoteMessage);
          }
        });

      // Store cleanup functions
      this.listeners.push(() => {
        unsubscribeTokenRefresh();
        unsubscribeForeground();
      });

      console.log(
        "FCM setup completed for all app states (foreground, background, closed)"
      );
    } catch (error) {
      console.error("FCM setup error:", error);
      // Fallback to Expo notifications on FCM failure
      await this.registerForPushNotifications();
      await this.setupFallbackFCM();
    }
  }

  // NEW: Handle notification opened from background/closed state
  private handleNotificationOpen(remoteMessage: any) {
    try {
      console.log("Processing opened notification:", remoteMessage);

      const { notification, data } = remoteMessage;

      if (data?.type === "evacuation") {
        console.log(
          "Evacuation notification opened - should navigate to evacuation screen"
        );
        // Add navigation logic here if needed
      } else if (data?.type === "emergency") {
        console.log(
          "Emergency notification opened - should show emergency details"
        );
        // Add emergency handling logic here
      }

      // Mark as read if we have the notification ID
      if (data?.id) {
        this.markNotificationAsRead(data.id);
      }

      // Notify callback about opened notification
      if (this.onNotificationReceived && notification) {
        const notificationData: NotificationData = {
          id: data?.id || `fcm_opened_${Date.now()}`,
          type: data?.type || "info",
          title: notification.title || "",
          message: notification.body || "",
          timestamp: new Date().toISOString(),
          read: true, // Mark as read since user opened it
          location: data?.location,
          priority: data?.priority || "medium",
          source: "fcm",
          data: data || {},
        };

        this.onNotificationReceived(notificationData);
      }
    } catch (error) {
      console.error("Error handling notification open:", error);
    }
  }

  // COMPLETELY FIXED: Show FCM notification as guaranteed banner/popup
  private async showFCMNotificationBanner(remoteMessage: any) {
    try {
      const { notification, data } = remoteMessage;

      if (!notification) {
        console.log("No notification content in FCM message");
        return;
      }

      const priority = data?.priority || "high"; // Default to high for visibility
      const notificationTitle = this.getNotificationTitle(
        notification.title || "New Alert",
        priority
      );

      console.log("🔔 Forcing FCM banner notification:", notificationTitle);

      // CRITICAL: Use immediate trigger (null) and force banner flags
      const notificationRequest = {
        content: {
          title: notificationTitle,
          body: notification.body || "",
          sound: "default", // Always use sound for attention
          priority: Notifications.AndroidNotificationPriority.MAX, // Maximum priority
          vibrate: [0, 250, 250, 250], // Strong vibration pattern
          sticky: false, // Allow dismissal
          autoDismiss: true,
          data: {
            ...data,
            source: "fcm",
            fcmMessageId: remoteMessage.messageId || `fcm_${Date.now()}`,
            showBanner: true,
            originalFCM: true,
            forceDisplay: true,
            priority: priority,
          },
          categoryIdentifier: data?.type || "emergency",
        },
        trigger: null, // Show IMMEDIATELY
      };

      console.log(
        "📱 Scheduling immediate FCM banner with request:",
        notificationRequest
      );

      const notificationId = await Notifications.scheduleNotificationAsync(
        notificationRequest
      );

      console.log(
        "✅ FCM banner notification scheduled with ID:",
        notificationId
      );

      // ADDITIONAL: Try alternative approach with presentNotificationAsync if available
      try {
        await Notifications.presentNotificationAsync({
          title: notificationTitle,
          body: notification.body || "",
          sound: true,
          vibrate: true,
          data: notificationRequest.content.data,
        });
        console.log("✅ Alternative present method also called");
      } catch (presentError) {
        console.log(
          "ℹ️ Present method not available, relying on schedule method"
        );
      }
    } catch (error) {
      console.error("❌ Error showing FCM notification banner:", error);

      // FALLBACK: Try basic notification as last resort
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 Emergency Alert",
            body: notification?.body || "You have a new emergency notification",
            sound: "default",
            data: { source: "fcm_fallback", showBanner: true },
          },
          trigger: null,
        });
        console.log("✅ Fallback notification sent");
      } catch (fallbackError) {
        console.error("❌ Even fallback notification failed:", fallbackError);
      }
    }
  }

  // NEW: Get proper notification priority for different platforms
  private getNotificationPriority(priority: string) {
    if (Platform.OS === "android") {
      switch (priority) {
        case "critical":
          return Notifications.AndroidNotificationPriority.MAX;
        case "high":
          return Notifications.AndroidNotificationPriority.HIGH;
        case "medium":
          return Notifications.AndroidNotificationPriority.DEFAULT;
        case "low":
          return Notifications.AndroidNotificationPriority.LOW;
        default:
          return Notifications.AndroidNotificationPriority.DEFAULT;
      }
    }
    return undefined; // iOS uses different priority system
  }

  // Fallback FCM setup for Expo Go
  async setupFallbackFCM() {
    try {
      if (this.expoPushToken) {
        this.fcmToken = this.expoPushToken;
        await AsyncStorage.setItem(FCM_TOKEN_KEY, this.fcmToken);
        console.log(
          "Fallback FCM token (Expo) stored:",
          this.fcmToken.substring(0, 20) + "..."
        );
      }
    } catch (error) {
      console.error("Error setting up fallback FCM:", error);
    }
  }

  // ENHANCED: Handle incoming FCM messages for all app states
  async handleFCMMessage(remoteMessage: any, isForeground: boolean = false) {
    try {
      const { notification, data } = remoteMessage;

      if (!notification) {
        console.log("FCM message without notification content");
        return;
      }

      console.log(
        `Processing FCM message (foreground: ${isForeground}):`,
        notification.title
      );

      // Generate hash to prevent duplicates
      const alertHash = this.generateAlertHash(
        notification.title || "",
        notification.body || "",
        data?.location
      );

      // For background messages, be less strict about duplicates since they might be important
      const isDuplicate = isForeground && this.hasAlertBeenShown(alertHash);

      if (isDuplicate) {
        console.log(
          "Duplicate FCM message prevented (foreground only):",
          notification.title
        );
        return;
      }

      const notificationData: NotificationData = {
        id:
          data?.id ||
          `fcm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data?.type || "info",
        title: notification.title || "",
        message: notification.body || "",
        timestamp: new Date().toISOString(),
        read: false,
        location: data?.location,
        priority: data?.priority || "medium",
        source: "fcm",
        data: {
          ...data,
          fcmMessageId: remoteMessage.messageId,
          isForeground,
          appState: isForeground ? "foreground" : "background",
        },
        alertHash,
      };

      // Store notification
      await this.storeNotification(notificationData);

      // Only mark as shown for foreground to allow background duplicates if needed
      if (isForeground) {
        await this.markAlertAsShown(alertHash);
      }

      // Notify callback (only works when app is active)
      if (this.onNotificationReceived && isForeground) {
        this.onNotificationReceived(notificationData);
      }

      console.log(
        `FCM notification processed: ${notification.title} (${
          isForeground ? "foreground" : "background"
        })`
      );
    } catch (error) {
      console.error("Error handling FCM message:", error);
    }
  }

  // REMOVED: Old duplicate method - keeping only the new banner method

  async sendLocalNotification(title: string, body: string, data?: any) {
    await this.showLocalNotification({ title, body, data });
  }

  // Send FCM token to your server
  async sendTokenToServer(token: string) {
    try {
      // TODO: Replace with your actual server endpoint
      const serverEndpoint = "YOUR_SERVER_ENDPOINT/api/register-token";

      const response = await fetch(serverEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: Device.osInternalBuildId || "unknown",
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        console.log("FCM token sent to server successfully");
      } else {
        console.log("Failed to send FCM token to server:", response.status);
      }
    } catch (error) {
      console.log(
        "Error sending token to server (server might not be available):",
        error.message
      );
    }
  }

  // Subscribe to FCM topics (only if FCM is available)
  async subscribeToTopic(topic: string) {
    if (!this.isFCMAvailable || !messaging) {
      console.log("FCM not available for topic subscription");
      return false;
    }

    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to FCM topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
      return false;
    }
  }

  // Unsubscribe from FCM topics (only if FCM is available)
  async unsubscribeFromTopic(topic: string) {
    if (!this.isFCMAvailable || !messaging) {
      console.log("FCM not available for topic unsubscription");
      return false;
    }

    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from FCM topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
      return false;
    }
  }

  // Setup location-based subscriptions (only if FCM is available)
  async setupLocationSubscriptions(latitude: number, longitude: number) {
    if (!this.isFCMAvailable) {
      console.log("FCM not available for location subscriptions");
      return;
    }

    const region = this.getRegionFromCoordinates(latitude, longitude);
    const topics = [
      `region_${region}`,
      "disaster_alerts",
      "emergency_notifications",
      "weather_alerts",
      "seismic_alerts",
    ];

    for (const topic of topics) {
      await this.subscribeToTopic(topic);
    }

    console.log(`Subscribed to location-based topics for region: ${region}`);
  }

  // FIXED: Local notification display method
  private async showLocalNotification(notificationContent: {
    title?: string;
    body?: string;
    data?: any;
  }) {
    try {
      const priority = notificationContent.data?.priority || "medium";

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationContent.title || "New Notification",
          body: notificationContent.body || "",
          data: {
            ...notificationContent.data,
            source: "local",
          },
          sound:
            priority === "critical" || priority === "high"
              ? "default"
              : undefined,
          priority: this.getNotificationPriority(priority),
          vibrate: priority === "critical" ? [0, 250, 250, 250] : [0, 250],
        },
        trigger: null, // Show immediately
      });

      console.log("Local notification shown:", notificationContent.title);
    } catch (error) {
      console.error("Error showing local notification:", error);
    }
  }

  // Get region from coordinates (Pakistan-focused)
  private getRegionFromCoordinates(lat: number, lon: number): string {
    // Pakistan regional boundaries (approximate)
    if (lat >= 33.5 && lat <= 37.1 && lon >= 71.0 && lon <= 77.0) {
      return "pakistan_north"; // KPK, Northern Punjab, GB, AJK
    } else if (lat >= 29.0 && lat <= 33.5 && lon >= 68.0 && lon <= 75.0) {
      return "pakistan_central"; // Central Punjab, parts of Sindh
    } else if (lat >= 24.0 && lat <= 29.0 && lon >= 66.0 && lon <= 71.0) {
      return "pakistan_south"; // Sindh, Balochistan coast
    } else if (lat >= 25.0 && lat <= 32.0 && lon >= 61.0 && lon <= 68.0) {
      return "pakistan_west"; // Balochistan
    }
    return "pakistan_general";
  }

  // Load previously shown alerts
  async loadShownAlerts() {
    try {
      const stored = await AsyncStorage.getItem(SHOWN_ALERTS_KEY);
      if (stored) {
        const alertIds = JSON.parse(stored);
        this.shownAlerts = new Set(alertIds);
        console.log(`Loaded ${this.shownAlerts.size} previously shown alerts`);
      }
    } catch (error) {
      console.error("Error loading shown alerts:", error);
    }
  }

  // Save shown alerts
  async saveShownAlerts() {
    try {
      await AsyncStorage.setItem(
        SHOWN_ALERTS_KEY,
        JSON.stringify([...this.shownAlerts])
      );
    } catch (error) {
      console.error("Error saving shown alerts:", error);
    }
  }

  // Generate hash for alert content
  private generateAlertHash(
    title: string,
    message: string,
    location?: string
  ): string {
    const content = `${title}|${message}|${location || "unknown"}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString();
  }

  // Check if alert has been shown
  private hasAlertBeenShown(alertHash: string): boolean {
    return this.shownAlerts.has(alertHash);
  }

  // Mark alert as shown
  private async markAlertAsShown(alertHash: string) {
    this.shownAlerts.add(alertHash);
    await this.saveShownAlerts();
  }

  // Setup notification channels (Android)
  async setupNotificationChannels() {
    if (Platform.OS === "android") {
      const channels = [
        {
          id: "critical",
          name: "Critical Emergency Alerts",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF0000",
          sound: "default",
          bypassDnd: true,
          showBadge: true,
        },
        {
          id: "high",
          name: "High Priority Alerts",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF4500",
          sound: "default",
          showBadge: true,
        },
        {
          id: "medium",
          name: "Standard Alerts",
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: "#FF9500",
          showBadge: true,
        },
        {
          id: "low",
          name: "Information",
          importance: Notifications.AndroidImportance.LOW,
          lightColor: "#4ECDC4",
          showBadge: false,
        },
      ];

      for (const channel of channels) {
        await Notifications.setNotificationChannelAsync(channel.id, channel);
      }

      console.log("Android notification channels configured");
    }
  }

  // Register for Expo push notifications (fallback)
  async registerForPushNotifications() {
    let token;

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permission denied");
        return null;
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "fdd0ee21-9313-44ae-850a-445938ce044d",
        });
        token = tokenData.data;
        this.expoPushToken = token;
        console.log("Expo Push Token:", token.substring(0, 20) + "...");
      } catch (error) {
        console.error("Error getting Expo push token:", error);
      }
    } else {
      console.log("Physical device required for push notifications");
    }

    return token;
  }

  // Enhanced local notification scheduling
  async scheduleLocationAlert(
    title: string,
    body: string,
    priority: "critical" | "high" | "medium" | "low" = "medium",
    type: NotificationData["type"] = "warning",
    location?: string,
    data?: any
  ) {
    try {
      const alertHash = this.generateAlertHash(title, body, location);

      if (this.hasAlertBeenShown(alertHash)) {
        console.log(`Duplicate alert prevented: ${title}`);
        return null;
      }

      const notificationData: NotificationData = {
        id: `location_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message: body,
        timestamp: new Date().toISOString(),
        read: false,
        location,
        priority,
        source: "location",
        data,
        alertHash,
      };

      // Validate if this is a real disaster notification
      const isRealDisasterData = this.isRealDisasterNotification(type, data);
      if (!isRealDisasterData) {
        console.log(`Skipping non-disaster notification: ${title}`);
        return null;
      }

      await this.storeNotification(notificationData);
      await this.markAlertAsShown(alertHash);

      const channelId = Platform.OS === "android" ? priority : undefined;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.getNotificationTitle(title, priority),
          body,
          sound:
            priority === "critical" || priority === "high"
              ? "default"
              : undefined,
          priority: this.getNotificationPriority(priority),
          data: {
            notificationId: notificationData.id,
            priority,
            type,
            location,
            timestamp: notificationData.timestamp,
            alertHash,
            source: "location",
            ...data,
          },
          categoryIdentifier: type,
        },
        trigger: {
          seconds: 1,
          channelId,
        },
      });

      if (this.onNotificationReceived) {
        this.onNotificationReceived(notificationData);
      }

      console.log(`Notification scheduled: ${title} (${priority})`);
      return notificationId;
    } catch (error) {
      console.error("Error scheduling location alert:", error);
      return null;
    }
  }

  // Validate real disaster notifications
  private isRealDisasterNotification(
    type: NotificationData["type"],
    data?: any
  ): boolean {
    const realDisasterTypes = [
      "weather",
      "seismic",
      "flood",
      "evacuation",
      "emergency",
    ];

    if (!realDisasterTypes.includes(type)) {
      return false;
    }

    if (data) {
      if (type === "seismic" && data.magnitude && data.magnitude >= 3.5)
        return true;
      if (
        type === "weather" &&
        (data.weatherSeverity || data.temperature || data.precipitation)
      )
        return true;
      if (type === "flood" && data.floodLevel) return true;
      if (type === "emergency" || type === "evacuation") return true;
      if (data?.isDemo || data?.testing) return true;
    }

    return false;
  }

  // Get notification title with priority indicators
  private getNotificationTitle(title: string, priority: string): string {
    switch (priority) {
      case "critical":
        return `🚨 CRITICAL: ${title}`;
      case "high":
        return `⚠️ ${title}`;
      case "medium":
        return `⚡ ${title}`;
      default:
        return title;
    }
  }

  async scheduleWeatherAlert(
    title: string,
    body: string,
    severity: "low" | "moderate" | "high" | "critical",
    location?: string,
    weatherData?: any
  ) {
    const priorityMap = {
      low: "low" as const,
      moderate: "medium" as const,
      high: "high" as const,
      critical: "critical" as const,
    };

    return await this.scheduleLocationAlert(
      title,
      body,
      priorityMap[severity],
      "weather",
      location,
      { weatherSeverity: severity, ...weatherData, isDemo: false }
    );
  }

  // Enhanced seismic alert with real data validation
  async scheduleSeismicAlert(
    title: string,
    body: string,
    magnitude: number,
    location?: string,
    seismicData?: any
  ) {
    const priority =
      magnitude >= 6.0 ? "critical" : magnitude >= 5.0 ? "high" : "medium";

    return await this.scheduleLocationAlert(
      title,
      body,
      priority,
      "seismic",
      location,
      { magnitude, ...seismicData, isDemo: false }
    );
  }

  // NEW: Schedule emergency alert
  async scheduleEmergencyAlert(
    title: string,
    body: string,
    location?: string,
    emergencyType?: string
  ) {
    return await this.scheduleLocationAlert(
      title,
      body,
      "critical",
      "emergency",
      location,
      { emergencyType, isDemo: false }
    );
  }

  // Store notification with deduplication
  async storeNotification(notification: NotificationData) {
    try {
      const existing = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications: NotificationData[] = existing
        ? JSON.parse(existing)
        : [];

      const isDuplicate = notifications.some((existingNotif) => {
        if (notification.alertHash && existingNotif.alertHash) {
          return existingNotif.alertHash === notification.alertHash;
        }

        const timeDiff = Math.abs(
          new Date(notification.timestamp).getTime() -
            new Date(existingNotif.timestamp).getTime()
        );
        return (
          existingNotif.title === notification.title &&
          existingNotif.message === notification.message &&
          timeDiff < 300000
        );
      });

      if (!isDuplicate) {
        notifications.unshift(notification);
        const trimmedNotifications = notifications.slice(0, 50);

        await AsyncStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(trimmedNotifications)
        );
        console.log(`Notification stored: ${notification.title}`);
      } else {
        console.log(`Duplicate notification prevented: ${notification.title}`);
      }
    } catch (error) {
      console.error("Error storing notification:", error);
    }
  }

  // ENHANCED: Setup notification listeners for all app states
  setupNotificationListeners() {
    // Handle notifications received while app is active (foreground)
    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log(
          "Local notification received in app:",
          notification.request.content.title
        );

        const data = notification.request.content.data;

        // Handle FCM notifications specially
        if (data?.source === "fcm" && data?.fcmMessageId) {
          console.log("Processing received FCM notification in foreground");

          // Find corresponding stored notification
          if (data?.notificationId || data?.fcmMessageId) {
            const storedNotifications = await this.getStoredNotifications();
            const storedNotification = storedNotifications.find(
              (n) =>
                n.id === data.notificationId ||
                n.data?.fcmMessageId === data.fcmMessageId ||
                (n.source === "fcm" &&
                  n.title === notification.request.content.title)
            );

            if (storedNotification && this.onNotificationReceived) {
              console.log("Found matching stored FCM notification");
              this.onNotificationReceived(storedNotification);
            }
          }
        } else if (data?.notificationId) {
          // Handle regular local notifications
          const storedNotifications = await this.getStoredNotifications();
          const storedNotification = storedNotifications.find(
            (n) => n.id === data.notificationId
          );

          if (storedNotification && this.onNotificationReceived) {
            this.onNotificationReceived(storedNotification);
          }
        }
      }
    );

    // Handle notification taps (when user taps on notification)
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log(
            "Notification tapped:",
            response.notification.request.content.title
          );

          const data = response.notification.request.content.data;

          // Handle different notification types when tapped
          if (data?.type === "evacuation") {
            console.log(
              "Evacuation notification tapped - should navigate to evacuation screen"
            );
            // Add your navigation logic here
          } else if (data?.type === "emergency") {
            console.log(
              "Emergency notification tapped - should show emergency details"
            );
            // Add your emergency handling logic here
          } else if (data?.type === "seismic") {
            console.log(
              "Seismic notification tapped - should show earthquake details"
            );
            // Add your earthquake details logic here
          } else if (data?.type === "weather") {
            console.log(
              "Weather notification tapped - should show weather details"
            );
            // Add your weather details logic here
          }

          // Mark as read
          if (data?.notificationId) {
            await this.markNotificationAsRead(data.notificationId);
          } else if (data?.fcmMessageId) {
            // Find and mark FCM notification as read
            const storedNotifications = await this.getStoredNotifications();
            const fcmNotification = storedNotifications.find(
              (n) => n.data?.fcmMessageId === data.fcmMessageId
            );
            if (fcmNotification) {
              await this.markNotificationAsRead(fcmNotification.id);
            }
          }
        }
      );

    this.listeners.push(() => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    });

    console.log("Notification listeners setup for all app states");
  }

  // Get stored notifications
  async getStoredNotifications(): Promise<NotificationData[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications = stored ? JSON.parse(stored) : [];

      return notifications
        .filter((notif: NotificationData) =>
          this.isRealDisasterNotification(notif.type, notif.data)
        )
        .sort(
          (a: NotificationData, b: NotificationData) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    } catch (error) {
      console.error("Error getting stored notifications:", error);
      return [];
    }
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter((n) => !n.read).length;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications = stored ? JSON.parse(stored) : [];

      const updatedNotifications = notifications.map(
        (notification: NotificationData) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
      );

      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications = stored ? JSON.parse(stored) : [];

      const updatedNotifications = notifications.map(
        (notification: NotificationData) => ({
          ...notification,
          read: true,
        })
      );

      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(updatedNotifications)
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string) {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications = stored ? JSON.parse(stored) : [];

      const filteredNotifications = notifications.filter(
        (notification: NotificationData) => notification.id !== notificationId
      );

      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(filteredNotifications)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }

  // Clear all notifications
  async clearAllNotifications() {
    try {
      await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      await AsyncStorage.removeItem(SHOWN_ALERTS_KEY);
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.shownAlerts.clear();
      console.log("All notifications cleared");
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }

  // Reset notification history
  async resetNotificationHistory() {
    try {
      await AsyncStorage.removeItem(SHOWN_ALERTS_KEY);
      this.shownAlerts.clear();
      console.log("Notification history reset");
    } catch (error) {
      console.error("Error resetting notification history:", error);
    }
  }

  // Create test notifications
  async createTestNotifications() {
    console.log("Creating test notifications...");

    const currentTime = new Date().getTime();
    const testNotifications = [
      {
        title: "DEMO: Severe Weather Alert",
        body: "Strong thunderstorms approaching with heavy rain and 60 km/h winds.",
        type: "weather" as const,
        priority: "high" as const,
        data: {
          weatherSeverity: "high",
          isDemo: true,
          testId: `weather_${currentTime}`,
        },
      },
      {
        title: "DEMO: Earthquake Detected",
        body: "Magnitude 4.2 earthquake occurred 30km from your location.",
        type: "seismic" as const,
        priority: "medium" as const,
        data: {
          magnitude: 4.2,
          isDemo: true,
          testId: `seismic_${currentTime}`,
        },
      },
    ];

    for (const notification of testNotifications) {
      await this.scheduleLocationAlert(
        notification.title,
        notification.body,
        notification.priority,
        notification.type,
        "Test Location",
        notification.data
      );
    }
  }

  // NEW: Force show a test banner notification (for debugging)
  async forceShowTestBanner() {
    console.log("🧪 FORCING test banner notification...");

    try {
      // Test 1: Maximum priority notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 FORCE TEST: Banner Check",
          body: "If you see this banner/popup, FCM notifications should work!",
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: {
            source: "fcm",
            showBanner: true,
            originalFCM: true,
            forceDisplay: true,
            testBanner: true,
          },
          categoryIdentifier: "emergency",
        },
        trigger: null, // Immediate
      });

      console.log("✅ Force test banner sent");

      // Test 2: Try alternative method after 3 seconds
      setTimeout(async () => {
        try {
          await Notifications.presentNotificationAsync({
            title: "🔔 PRESENT TEST: Alternative Method",
            body: "Testing alternative notification present method",
            sound: true,
            vibrate: true,
            data: { testMethod: "present" },
          });
          console.log("✅ Alternative present method test sent");
        } catch (error) {
          console.log("ℹ️ Present method not available:", error.message);
        }
      }, 3000);
    } catch (error) {
      console.error("❌ Force test banner failed:", error);
    }
  }

  // Send push notification via Expo
  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data = {}
  ) {
    const message = {
      to: pushToken,
      sound: "default",
      title,
      body,
      data,
    };

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log("Push notification sent:", result);
      return result;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  }

  // Utility methods
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  async cancelNotification(notificationId: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error canceling all notifications:", error);
    }
  }

  // Token getters
  getFCMToken(): string | null {
    return this.fcmToken;
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  isFCMSupported(): boolean {
    return this.isFCMAvailable;
  }

  // NEW: Get notification statistics
  async getNotificationStats() {
    try {
      const notifications = await this.getStoredNotifications();
      const total = notifications.length;
      const unread = notifications.filter((n) => !n.read).length;
      const byType = notifications.reduce((acc, notif) => {
        acc[notif.type] = (acc[notif.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const bySource = notifications.reduce((acc, notif) => {
        acc[notif.source] = (acc[notif.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total,
        unread,
        byType,
        bySource,
        fcmAvailable: this.isFCMAvailable,
        hasToken: !!this.fcmToken,
      };
    } catch (error) {
      console.error("Error getting notification stats:", error);
      return {
        total: 0,
        unread: 0,
        byType: {},
        bySource: {},
        fcmAvailable: false,
        hasToken: false,
      };
    }
  }

  // Cleanup
  cleanup() {
    this.listeners.forEach((removeListener) => removeListener());
    this.listeners = [];
    console.log("NotificationService cleaned up");
  }
}

export default new NotificationService();
