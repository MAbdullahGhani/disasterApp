// services/NotificationService.ts (Enhanced Version)
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_STORAGE_KEY = "storedNotifications";

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
  source: "location" | "system" | "manual";
  data?: any;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Check notification priority for behavior
    const priority = notification.request.content.data?.priority || "medium";

    return {
      shouldShowAlert: true,
      shouldPlaySound: priority === "critical" || priority === "high",
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  expoPushToken: string | null = null;
  private listeners: (() => void)[] = [];
  private onNotificationReceived?: (notification: NotificationData) => void;

  async initialize(
    onNotificationReceived?: (notification: NotificationData) => void
  ) {
    this.onNotificationReceived = onNotificationReceived;
    await this.registerForPushNotifications();
    this.setupNotificationListeners();
    await this.setupNotificationChannels();
    console.log("NotificationService initialized");
  }

  async setupNotificationChannels() {
    if (Platform.OS === "android") {
      // Critical alerts channel
      await Notifications.setNotificationChannelAsync("critical", {
        name: "Critical Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF0000",
        sound: "default",
        bypassDnd: true,
      });

      // High priority alerts channel
      await Notifications.setNotificationChannelAsync("high", {
        name: "High Priority Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF4500",
        sound: "default",
      });

      // Medium priority channel
      await Notifications.setNotificationChannelAsync("medium", {
        name: "Medium Priority",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: "#FF9500",
      });

      // Low priority channel
      await Notifications.setNotificationChannelAsync("low", {
        name: "Low Priority",
        importance: Notifications.AndroidImportance.LOW,
        lightColor: "#4ECDC4",
      });
    }
  }

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
        console.log("Failed to get push token for push notification!");
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log("Expo Push Token:", token);
    } else {
      console.log("Must use physical device for Push Notifications");
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
      const notificationData: NotificationData = {
        id: `location_${Date.now()}`,
        type,
        title,
        message: body,
        timestamp: new Date().toISOString(),
        read: false,
        location,
        priority,
        source: "location",
        data,
      };

      // Store notification for in-app display
      await this.storeNotification(notificationData);

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.getNotificationTitle(title, priority),
          body,
          sound:
            priority === "critical" || priority === "high"
              ? "default"
              : undefined,
          data: {
            notificationId: notificationData.id,
            priority,
            type,
            location,
            ...data,
          },
        },
        trigger: { seconds: 1 },
      });

      // Call callback if provided
      if (this.onNotificationReceived) {
        this.onNotificationReceived(notificationData);
      }

      return notificationId;
    } catch (error) {
      console.error("Error scheduling location alert:", error);
      return null;
    }
  }

  // Get notification title with priority indicators
  private getNotificationTitle(title: string, priority: string): string {
    switch (priority) {
      case "critical":
        return `🚨 CRITICAL: ${title}`;
      case "high":
        return `⚠️ HIGH: ${title}`;
      case "medium":
        return `⚡ ${title}`;
      default:
        return title;
    }
  }

  // Weather-specific notification
  async scheduleWeatherAlert(
    title: string,
    body: string,
    severity: "low" | "moderate" | "high" | "critical",
    location?: string
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
      { weatherSeverity: severity }
    );
  }

  // Seismic-specific notification
  async scheduleSeismicAlert(
    title: string,
    body: string,
    magnitude: number,
    location?: string
  ) {
    const priority =
      magnitude >= 6.0 ? "critical" : magnitude >= 5.0 ? "high" : "medium";

    return await this.scheduleLocationAlert(
      title,
      body,
      priority,
      "seismic",
      location,
      { magnitude }
    );
  }

  // Evacuation notice
  async scheduleEvacuationNotice(
    title: string,
    body: string,
    location?: string
  ) {
    return await this.scheduleLocationAlert(
      title,
      body,
      "critical",
      "evacuation",
      location,
      { isEvacuation: true }
    );
  }

  // Store notification for in-app display
  async storeNotification(notification: NotificationData) {
    try {
      const existing = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const notifications: NotificationData[] = existing
        ? JSON.parse(existing)
        : [];

      // Add new notification at the beginning
      notifications.unshift(notification);

      // Keep only the last 50 notifications
      const trimmedNotifications = notifications.slice(0, 50);

      await AsyncStorage.setItem(
        NOTIFICATION_STORAGE_KEY,
        JSON.stringify(trimmedNotifications)
      );
    } catch (error) {
      console.error("Error storing notification:", error);
    }
  }

  // Get all stored notifications
  async getStoredNotifications(): Promise<NotificationData[]> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error getting stored notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: string) {
    try {
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map((notification) =>
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
      const notifications = await this.getStoredNotifications();
      const updatedNotifications = notifications.map((notification) => ({
        ...notification,
        read: true,
      }));
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
      const notifications = await this.getStoredNotifications();
      const filteredNotifications = notifications.filter(
        (notification) => notification.id !== notificationId
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
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error clearing all notifications:", error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        console.log("Notification received:", notification);

        // Extract notification data
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
      }
    );

    // Listener for when user taps on notification
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification response:", response);

          const data = response.notification.request.content.data;
          if (data?.notificationId) {
            // Mark as read when user taps
            await this.markNotificationAsRead(data.notificationId);

            // Handle specific notification types
            if (data.type === "evacuation" && data.isEvacuation) {
              // Handle evacuation notification tap
              console.log("Evacuation notification tapped");
            }
          }
        }
      );

    this.listeners.push(() => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    });
  }

  // Legacy methods for backward compatibility
  async scheduleLocalNotification(title: string, body: string, trigger = null) {
    return await this.scheduleLocationAlert(title, body, "medium", "info");
  }

  async scheduleBadgeNotification(badgeName: string, badgeDescription: string) {
    return await this.scheduleLocationAlert(
      `🏆 New Badge Earned!`,
      `Congratulations! You've earned the "${badgeName}" badge. ${badgeDescription}`,
      "low",
      "success"
    );
  }

  async scheduleReminderNotification(
    title: string,
    body: string,
    seconds: number
  ) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: "default",
        },
        trigger: { seconds },
      });
      return id;
    } catch (error) {
      console.error("Error scheduling reminder notification:", error);
      return null;
    }
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

  // Get notification permissions status
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Send push notification (requires server implementation)
  async sendPushNotification(
    expoPushToken: string,
    title: string,
    body: string,
    data = {}
  ) {
    const message = {
      to: expoPushToken,
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

  // Schedule daily reminder
  async scheduleDailyReminder(hour = 9, minute = 0) {
    const trigger = {
      hour,
      minute,
      repeats: true,
    };

    return await this.scheduleReminderNotification(
      "🛡️ Safety Check-in",
      "Take a few minutes to review your emergency preparedness today!",
      0
    );
  }

  // Schedule weekly progress reminder
  async scheduleWeeklyProgressReminder() {
    const trigger = {
      weekday: 7, // Sunday
      hour: 10,
      minute: 0,
      repeats: true,
    };

    return await this.scheduleReminderNotification(
      "📊 Weekly Progress Review",
      "Check your safety progress and complete more preparedness tasks!",
      0
    );
  }

  // Create test notifications for development
  async createTestNotifications() {
    const testNotifications = [
      {
        title: "Test Weather Alert",
        body: "This is a test weather notification",
        type: "weather" as const,
        priority: "high" as const,
      },
      {
        title: "Test Emergency Alert",
        body: "This is a test emergency notification",
        type: "emergency" as const,
        priority: "critical" as const,
      },
      {
        title: "Test Info",
        body: "This is a test info notification",
        type: "info" as const,
        priority: "low" as const,
      },
    ];

    for (const notification of testNotifications) {
      await this.scheduleLocationAlert(
        notification.title,
        notification.body,
        notification.priority,
        notification.type,
        "Test Location"
      );
    }
  }

  // Cleanup
  cleanup() {
    this.listeners.forEach((removeListener) => removeListener());
    this.listeners = [];
  }
}

export default new NotificationService();
