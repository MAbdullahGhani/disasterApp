// services/NotificationService.ts - Complete FCM Integration with Error Handling

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform, AppState } from "react-native";
import Constants from "expo-constants";

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
  source: "location" | "system" | "manual" | "fcm" | "expo" | "ndma";
  data?: any;
  alertHash?: string;
}

// Configure notification behavior for guaranteed banner display
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const priority = notification.request.content.data?.priority || "medium";
    const source = notification.request.content.data?.source || "system";
    const showBanner = notification.request.content.data?.showBanner !== false;

    console.log("NotificationHandler called:", {
      title: notification.request.content.title,
      source,
      priority,
      showBanner,
    });

    // Always show alerts for FCM notifications or high priority
    const shouldShowAlert =
      source === "fcm" ||
      showBanner === true ||
      priority === "critical" ||
      priority === "high" ||
      source === "expo";

    return {
      shouldShowAlert: shouldShowAlert,
      shouldPlaySound: priority === "critical" || priority === "high",
      shouldSetBadge: true,
    };
  },
});

// Safe Firebase messaging import with error handling
let messaging: any = null;
let isFCMSupported = false;

// Helper to check if running in Expo environment or iOS
const isExpoGo = (): boolean => {
  try {
    if (Platform.OS === "ios") {
      return true;
    }
    return __DEV__ && Constants.executionEnvironment === "storeClient";
  } catch {
    return false;
  }
};

// Safe FCM availability check - always false for iOS
const checkFCMAvailability = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "ios") {
      console.log(
        "🍎 iOS detected - FCM disabled, using Expo notifications only"
      );
      return false;
    }

    if (isExpoGo()) {
      console.log(
        "🏃 Running in Expo Go - FCM not available, using Expo notifications"
      );
      return false;
    }

    const firebaseMessaging = await import(
      "@react-native-firebase/messaging"
    ).catch(() => null);

    if (!firebaseMessaging) {
      console.log(
        "📦 Firebase messaging not installed - using Expo notifications only"
      );
      return false;
    }

    messaging = firebaseMessaging.default;
    isFCMSupported = true;

    console.log("✅ FCM is available for Android");
    return true;
  } catch (error: any) {
    console.log("❌ FCM not available:", error?.message || "Unknown error");
    return false;
  }
};

class NotificationService {
  private expoPushToken: string | null = null;
  private fcmToken: string | null = null;
  private listeners: (() => void)[] = [];
  private onNotificationReceived?: (notification: NotificationData) => void;
  private isInitialized = false;
  private shownAlerts: Set<string> = new Set();
  private isFCMAvailable = false;
  private appStateListener: any = null;

  async initialize(
    onNotificationReceived?: (notification: NotificationData) => void
  ) {
    if (this.isInitialized) {
      console.log("🔄 NotificationService already initialized");
      return;
    }

    console.log("🚀 Initializing NotificationService...");
    this.onNotificationReceived = onNotificationReceived;

    try {
      await this.loadShownAlerts();
      await this.setupNotificationChannels();

      this.isFCMAvailable = await checkFCMAvailability();

      if (this.isFCMAvailable) {
        console.log("🔥 Setting up FCM...");
        await this.setupFCM();
      } else {
        console.log("📱 Setting up Expo notifications...");
        await this.setupExpoNotifications();
      }

      this.setupNotificationListeners();
      this.setupAppStateListener();

      this.isInitialized = true;
      console.log(
        `✅ NotificationService initialized successfully - FCM: ${this.isFCMAvailable}`
      );

      await this.loadStoredTokens();
    } catch (error: any) {
      console.error(
        "❌ NotificationService initialization failed:",
        error?.message
      );
      await this.setupExpoNotifications();
      this.setupNotificationListeners();
      this.isInitialized = true;
    }
  }

  // Complete FCM Setup for all app states
  private async setupFCM() {
    if (!this.isFCMAvailable || !messaging) {
      throw new Error("FCM not available");
    }
    try {
      console.log("🔧 Configuring FCM for all app states...");

      const authStatus = await messaging().requestPermission({
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      });

      const permissionGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!permissionGranted) {
        console.log("⚠️ FCM permission denied, falling back to Expo");
        await this.setupExpoNotifications();
        return;
      }

      console.log("✅ FCM permission granted");

      if (Platform.OS === "ios" && !isFCMSupported) {
        try {
          await messaging().registerDeviceForRemoteMessages();
          console.log("📱 iOS device registered for remote messages");
          isFCMSupported = true;
        } catch (regError: any) {
          console.log("⚠️ iOS registration failed:", regError?.message);
        }
      }

      try {
        const token = await messaging().getToken();
        if (token) {
          this.fcmToken = token;
          await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
          console.log("🎟️ FCM Token obtained:", token);
        } else {
          console.log("⚠️ No FCM token received");
        }
      } catch (tokenError: any) {
        console.log("⚠️ FCM token error:", tokenError?.message);
      }

      const unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (newToken: string) => {
          console.log("🔄 FCM token refreshed");
          this.fcmToken = newToken;
          await AsyncStorage.setItem(FCM_TOKEN_KEY, newToken);
        }
      );

      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        console.log(
          "📨 Background FCM message:",
          remoteMessage.notification?.title
        );
        await this.handleFCMMessage(remoteMessage, false);
        return Promise.resolve();
      });

      const unsubscribeForeground = messaging().onMessage(
        async (remoteMessage: any) => {
          console.log(
            "🔔 Foreground FCM message:",
            remoteMessage.notification?.title
          );
          await this.showFCMBanner(remoteMessage);
          await this.handleFCMMessage(remoteMessage, true);
        }
      );

      messaging().onNotificationOpenedApp((remoteMessage: any) => {
        console.log("👆 FCM notification opened from background");
        this.handleNotificationTap(remoteMessage);
      });

      messaging()
        .getInitialNotification()
        .then((remoteMessage: any) => {
          if (remoteMessage) {
            console.log("🚀 FCM notification opened app from killed state");
            this.handleNotificationTap(remoteMessage);
          }
        });

      this.listeners.push(() => {
        unsubscribeTokenRefresh();
        unsubscribeForeground();
      });

      console.log("✅ FCM setup completed for all app states");
    } catch (error: any) {
      console.error("❌ FCM setup failed:", error?.message);
      throw error;
    }
  }

  // Expo notifications setup (fallback and development)
  private async setupExpoNotifications() {
    try {
      console.log("📱 Setting up Expo push notifications...");

      if (!Device.isDevice) {
        console.log("⚠️ Push notifications don't work on simulator");
        return;
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: false,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("⚠️ Push notification permission denied");
        return;
      }

      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.easConfig?.projectId ||
          "fdd0ee21-9313-44ae-850a-445938ce044d";

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });

        this.expoPushToken = tokenData.data;
        this.fcmToken = this.expoPushToken;

        await AsyncStorage.setItem(FCM_TOKEN_KEY, this.expoPushToken);
        console.log(
          "🎟️ Expo Push Token:",
          this.expoPushToken.substring(0, 30) + "..."
        );
      } catch (tokenError: any) {
        console.error("⚠️ Error getting Expo push token:", tokenError?.message);
      }

      console.log("✅ Expo notifications setup completed");
    } catch (error: any) {
      console.error("❌ Expo notifications setup failed:", error?.message);
    }
  }

  // Schedule location-based alert
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
        console.log(`🔄 Duplicate location alert prevented: ${title}`);
        return null;
      }

      const notificationData: NotificationData = {
        id: `location_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        type,
        title,
        message: body,
        timestamp: new Date().toISOString(),
        read: false,
        location,
        priority,
        source: this.isFCMAvailable ? "location" : "expo",
        data: {
          ...data,
          isLocationBased: true,
          locationAlert: true,
        },
        alertHash,
      };

      await this.storeNotification(notificationData);
      await this.markAlertAsShown(alertHash);

      const formattedTitle = this.formatNotificationTitle(title, priority);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: formattedTitle,
          body,
          sound:
            priority === "critical" || priority === "high" ? "default" : false,
          badge: 1,
          data: {
            notificationId: notificationData.id,
            priority,
            type,
            location,
            timestamp: notificationData.timestamp,
            alertHash,
            source: notificationData.source,
            isLocationBased: true,
            ...data,
          },
          categoryIdentifier: type,
        },
        trigger: { seconds: 1 },
      });

      if (this.onNotificationReceived) {
        this.onNotificationReceived(notificationData);
      }

      console.log(
        `✅ Location alert scheduled: ${title} (${priority}) - ${
          location || "Unknown location"
        }`
      );
      return notificationId;
    } catch (error: any) {
      console.error("❌ Error scheduling location alert:", error?.message);
      return null;
    }
  }

  // Show FCM notification banner in foreground
  private async showFCMBanner(remoteMessage: any) {
    try {
      const { notification, data } = remoteMessage;
      if (!notification) return;

      const priority = data?.priority || "high";
      const title = this.formatNotificationTitle(
        notification.title || "Alert",
        priority
      );

      console.log("🔔 Showing FCM banner:", title);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: notification.body || "",
          sound:
            priority === "critical" || priority === "high" ? "default" : false,
          badge: 1,
          data: {
            ...data,
            source: "fcm",
            fcmMessageId: remoteMessage.messageId,
            showBanner: true,
            timestamp: new Date().toISOString(),
          },
          categoryIdentifier: data?.type || "emergency",
        },
        trigger: null, // Show immediately
      });

      console.log("✅ FCM banner displayed");
    } catch (error: any) {
      console.error("❌ Error showing FCM banner:", error?.message);
    }
  }

  // Handle FCM messages for all app states
  private async handleFCMMessage(remoteMessage: any, isForeground: boolean) {
    try {
      const { notification, data } = remoteMessage;
      if (!notification) return;

      const alertHash = this.generateAlertHash(
        notification.title || "",
        notification.body || "",
        data?.location
      );

      if (isForeground && this.hasAlertBeenShown(alertHash)) {
        console.log("🔄 Duplicate FCM message prevented:", notification.title);
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
          receivedAt: new Date().toISOString(),
        },
        alertHash,
      };

      await this.storeNotification(notificationData);

      if (isForeground) {
        await this.markAlertAsShown(alertHash);
      }

      if (this.onNotificationReceived && isForeground) {
        this.onNotificationReceived(notificationData);
      }

      console.log(
        `✅ FCM message processed: ${notification.title} (${
          isForeground ? "foreground" : "background"
        })`
      );
    } catch (error: any) {
      console.error("❌ Error handling FCM message:", error?.message);
    }
  }

  // Handle notification tap
  private handleNotificationTap(remoteMessage: any) {
    try {
      const { notification, data } = remoteMessage;

      console.log("👆 Processing tapped notification:", notification?.title);

      switch (data?.type) {
        case "evacuation":
          console.log("🚨 Evacuation notification tapped");
          break;
        case "emergency":
          console.log("🆘 Emergency notification tapped");
          break;
        // ... other cases
      }

      if (data?.id) {
        this.markNotificationAsRead(data.id);
      }

      if (this.onNotificationReceived && notification) {
        const notificationData: NotificationData = {
          id: data?.id || `tapped_${Date.now()}`,
          type: data?.type || "info",
          title: notification.title || "",
          message: notification.body || "",
          timestamp: new Date().toISOString(),
          read: true,
          location: data?.location,
          priority: data?.priority || "medium",
          source: "fcm",
          data: data || {},
        };
        this.onNotificationReceived(notificationData);
      }
    } catch (error: any) {
      console.error("❌ Error handling notification tap:", error?.message);
    }
  }

  // Setup notification listeners
  private setupNotificationListeners() {
    try {
      const notificationListener =
        Notifications.addNotificationReceivedListener(async (notification) => {
          console.log(
            "📨 Local notification received:",
            notification.request.content.title
          );
          const data = notification.request.content.data;
          if (data?.notificationId) {
            const storedNotifications = await this.getStoredNotifications();
            const storedNotification = storedNotifications.find(
              (n) => n.id === data.notificationId
            );
            if (storedNotification && this.onNotificationReceived) {
              this.onNotificationReceived(storedNotification);
            }
          }
        });

      const responseListener =
        Notifications.addNotificationResponseReceivedListener(
          async (response) => {
            console.log(
              "👆 Notification response:",
              response.notification.request.content.title
            );
            const data = response.notification.request.content.data;
            if (data?.notificationId) {
              await this.markNotificationAsRead(data.notificationId);
            }
          }
        );

      this.listeners.push(() => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      });

      console.log("✅ Notification listeners setup completed");
    } catch (error: any) {
      console.error(
        "❌ Error setting up notification listeners:",
        error?.message
      );
    }
  }

  // Setup app state listener
  private setupAppStateListener() {
    this.appStateListener = AppState.addEventListener(
      "change",
      (nextAppState) => {
        console.log(`📱 App state changed to: ${nextAppState}`);
        if (nextAppState === "active") {
          this.checkForMissedNotifications();
        }
      }
    );
  }

  // Check for missed notifications when app becomes active
  private async checkForMissedNotifications() {
    try {
      if (this.isFCMAvailable && messaging) {
        const initialNotification = await messaging().getInitialNotification();
        if (initialNotification) {
          console.log("📨 Found initial notification on app resume");
          this.handleNotificationTap(initialNotification);
        }
      }
    } catch (error: any) {
      console.log("ℹ️ No missed notifications found:", error?.message);
    }
  }

  // Load stored tokens
  private async loadStoredTokens() {
    try {
      const storedToken = await AsyncStorage.getItem(FCM_TOKEN_KEY);
      if (storedToken && !this.fcmToken) {
        this.fcmToken = storedToken;
        console.log("🔄 Loaded stored FCM token");
      }
    } catch (error: any) {
      console.log("ℹ️ No stored tokens found:", error?.message);
    }
  }

  // Setup notification channels (Android)
  private async setupNotificationChannels() {
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
          sound: "default",
        },
        { id: "medium", name: "Standard Alerts", importance: Notifications.AndroidImportance.DEFAULT },
        { id: "low", name: "Information", importance: Notifications.AndroidImportance.LOW },
      ];
      for (const channel of channels) {
        await Notifications.setNotificationChannelAsync(channel.id, channel);
      }
      console.log("✅ Android notification channels configured");
    }
  }

  // Format notification title with priority
  private formatNotificationTitle(title: string, priority: string): string {
    switch (priority) {
      case "critical":
        return `🚨 CRITICAL: ${title}`;
      case "high":
        return `⚠️ ${title}`;
      default:
        return title;
    }
  }

  // Generate hash for alert deduplication
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

  private hasAlertBeenShown(alertHash: string): boolean {
    return this.shownAlerts.has(alertHash);
  }

  private async markAlertAsShown(alertHash: string) {
    this.shownAlerts.add(alertHash);
    await this.saveShownAlerts();
  }

  private async loadShownAlerts() {
    try {
      const stored = await AsyncStorage.getItem(SHOWN_ALERTS_KEY);
      if (stored) {
        this.shownAlerts = new Set(JSON.parse(stored));
      }
    } catch (error: any) {
      console.error("❌ Error loading shown alerts:", error?.message);
    }
  }

  private async saveShownAlerts() {
    try {
      await AsyncStorage.setItem(
        SHOWN_ALERTS_KEY,
        JSON.stringify([...this.shownAlerts])
      );
    } catch (error: any) {
      console.error("❌ Error saving shown alerts:", error?.message);
    }
  }

  // PUBLIC METHODS

  /**
   * Schedules a structured NDMA alert.
   * This is a specific wrapper around the general scheduleLocalAlert method.
   */
  async scheduleNDMAAlert(
    title: string,
    message: string,
    severity: "critical" | "high" | "moderate" | "low",
    location: string,
    affectedAreas: string,
    instructions: string,
    alertType?: string
  ) {
    const priorityMap = {
      low: "low" as const,
      moderate: "medium" as const,
      high: "high" as const,
      critical: "critical" as const,
    };
    const priority = priorityMap[severity] || "medium";

    const typeMap: { [key: string]: NotificationData["type"] } = {
      flood: "flood",
      seismic: "seismic",
      earthquake: "seismic",
      landslide: "warning",
      cyclone: "weather",
      drought: "warning",
      weather: "weather",
    };
    const type = alertType ? typeMap[alertType] || "emergency" : "emergency";

    return this.scheduleLocalAlert(
      title,
      message,
      priority,
      type,
      location,
      {
        isNDMA: true,
        affectedAreas,
        instructions,
        alertType,
      }
    );
  }

  async scheduleEmergencyAlert(
    title: string,
    body: string,
    priority: "critical" | "high" | "medium" | "low" = "critical",
    location?: string,
    data?: any
  ) {
    return this.scheduleLocalAlert(
      title,
      body,
      priority,
      "emergency",
      location,
      { ...data, isEmergency: true }
    );
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
    return this.scheduleLocalAlert(
      title,
      body,
      priorityMap[severity],
      "weather",
      location,
      { weatherSeverity: severity, ...weatherData }
    );
  }

  async scheduleSeismicAlert(
    title: string,
    body: string,
    magnitude: number,
    location?: string,
    seismicData?: any
  ) {
    const priority =
      magnitude >= 6.0 ? "critical" : magnitude >= 5.0 ? "high" : "medium";
    return this.scheduleLocalAlert(
      title,
      body,
      priority,
      "seismic",
      location,
      { magnitude, ...seismicData }
    );
  }

  async scheduleLocalAlert(
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
        console.log(`🔄 Duplicate alert prevented: ${title}`);
        return null;
      }

      const notificationData: NotificationData = {
        id: `local_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        type,
        title,
        message: body,
        timestamp: new Date().toISOString(),
        read: false,
        location,
        priority,
        source: data?.isNDMA ? "ndma" : (this.isFCMAvailable ? "system" : "expo"),
        data,
        alertHash,
      };

      await this.storeNotification(notificationData);
      await this.markAlertAsShown(alertHash);

      const formattedTitle = this.formatNotificationTitle(title, priority);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: formattedTitle,
          body,
          sound:
            priority === "critical" || priority === "high" ? "default" : false,
          badge: 1,
          data: {
            notificationId: notificationData.id,
            priority,
            type,
            location,
            timestamp: notificationData.timestamp,
            alertHash,
            source: notificationData.source,
            ...data,
          },
          categoryIdentifier: type,
        },
        trigger: { seconds: 1 },
      });

      if (this.onNotificationReceived) {
        this.onNotificationReceived(notificationData);
      }

      console.log(`✅ Local alert scheduled: ${title} (${priority})`);
      return notificationId;
    } catch (error: any) {
      console.error("❌ Error scheduling local alert:", error?.message);
      return null;
    }
  }

  async storeNotification(notification: NotificationData) {
    try {
      const existing = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications: NotificationData[] = existing
        ? JSON.parse(existing)
        : [];

      const isDuplicate = notifications.some(
        (n) => n.alertHash === notification.alertHash && n.alertHash
      );

      if (!isDuplicate) {
        notifications.unshift(notification);
        const trimmed = notifications.slice(0, 100);
        await AsyncStorage.setItem(
          NOTIFICATION_STORAGE_KEY,
          JSON.stringify(trimmed)
        );
      }
    } catch (error: any) {
      console.error("❌ Error storing notification:", error?.message);
    }
  }

  async getStoredNotifications(): Promise<NotificationData[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async getUnreadCount(): Promise<number> {
    const notifications = await this.getStoredNotifications();
    return notifications.filter((n) => !n.read).length;
  }

  async markNotificationAsRead(notificationId: string) {
    const notifications = await this.getStoredNotifications();
    const updated = notifications.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  async markAllNotificationsAsRead() {
    const notifications = await this.getStoredNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  async deleteNotification(notificationId: string) {
    const notifications = await this.getStoredNotifications();
    const filtered = notifications.filter((n) => n.id !== notificationId);
    await AsyncStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  }

  async clearAllNotifications() {
    await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
    await AsyncStorage.removeItem(SHOWN_ALERTS_KEY);
    await Notifications.cancelAllScheduledNotificationsAsync();
    this.shownAlerts.clear();
  }

  cleanup() {
    this.listeners.forEach((remove) => remove());
    this.listeners = [];
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    this.onNotificationReceived = undefined;
    console.log("🧹 NotificationService cleanup completed");
  }
}

export default new NotificationService();