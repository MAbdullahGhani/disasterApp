export const requestForegroundPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true })
);
export const getCurrentPositionAsync = jest.fn(() =>
  Promise.resolve({ coords: { latitude: 0, longitude: 0 } })
);
