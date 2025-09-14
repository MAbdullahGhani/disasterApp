export default {
  initialize: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn(),
  getUnreadCount: jest.fn().mockResolvedValue(0),
  scheduleLocalNotification: jest.fn().mockResolvedValue(undefined),
  scheduleWeatherAlert: jest.fn().mockResolvedValue(undefined),
  scheduleNDMAAlert: jest.fn().mockResolvedValue(undefined),
  scheduleSeismicAlert: jest.fn().mockResolvedValue(undefined),
  scheduleFloodAlert: jest.fn().mockResolvedValue(undefined),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  clearAllNotifications: jest.fn().mockResolvedValue(undefined),
  markAsRead: jest.fn().mockResolvedValue(undefined),
  getAllNotifications: jest.fn().mockResolvedValue([]),
};