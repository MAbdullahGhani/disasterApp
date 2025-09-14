// __mocks__/expo-file-system.js
export const downloadAsync = jest.fn(() =>
  Promise.resolve({ uri: "file:///mock.pdf" })
);
