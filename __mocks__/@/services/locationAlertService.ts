export default {
  initialize: jest.fn().mockResolvedValue(undefined),
  getAllAlerts: jest.fn().mockResolvedValue([]),
  refreshAlerts: jest.fn().mockResolvedValue(undefined),
  fetchLocationBasedAlerts: jest.fn().mockResolvedValue(undefined),
  cleanup: jest.fn(),
  getSettings: jest.fn().mockResolvedValue({}),
  updateSettings: jest.fn().mockResolvedValue(undefined),
  isInitialized: jest.fn().mockReturnValue(true),
};