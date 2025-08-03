import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  expoPushToken = null;

  async registerForPushNotifications() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      this.expoPushToken = token;
      console.log('Expo Push Token:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  async scheduleLocalNotification(title, body, trigger = null) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
        },
        trigger: trigger || { seconds: 1 },
      });
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async scheduleBadgeNotification(badgeName, badgeDescription) {
    return await this.scheduleLocalNotification(
      `🏆 New Badge Earned!`,
      `Congratulations! You've earned the "${badgeName}" badge. ${badgeDescription}`,
      { seconds: 2 }
    );
  }

  async scheduleReminderNotification(title, body, seconds) {
    return await this.scheduleLocalNotification(
      title,
      body,
      { seconds }
    );
  }

  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Listener for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived || ((notification) => {
        console.log('Notification received:', notification);
      })
    );

    // Listener for when user taps on notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse || ((response) => {
        console.log('Notification response:', response);
      })
    );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Get notification permissions status
  async getPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  // Send push notification (requires server implementation)
  async sendPushNotification(expoPushToken, title, body, data = {}) {
    const message = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Push notification sent:', result);
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
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

    return await this.scheduleLocalNotification(
      '🛡️ Safety Check-in',
      'Take a few minutes to review your emergency preparedness today!',
      trigger
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

    return await this.scheduleLocalNotification(
      '📊 Weekly Progress Review',
      'Check your safety progress and complete more preparedness tasks!',
      trigger
    );
  }
}

export default new NotificationService();