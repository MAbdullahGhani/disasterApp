/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest-setup.js"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native" +
      "|@react-native" +
      "|@react-navigation" +
      "|@react-native-community" +
      "|expo(nent)?|@expo(nent)?/.*" +
      "|react-clone-referenced-element" +
      "|react-native-svg" +
      "|@unimodules" +
      "|unimodules-.*" +
      "|sentry-expo" +
      "|@/components/ThemedText" +
      "|@/components/ThemedView" +
      "|native-base" +
      "|firebase" +
      "|@firebase/auth" +
      "|@firebase/firestore" +
      "|@firebase/app" +
      "|react-i18next" +
      "|@gorhom))",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.expo/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Add this line to mock react-native-vector-icons
    "^react-native-vector-icons/(.*)$": "<rootDir>/__mocks__/react-native-vector-icons.js",
  },
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "components/**/*.{js,jsx,ts,tsx}",
    "services/**/*.{js,jsx,ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  testTimeout: 15000,
  maxWorkers: 1, // Run tests sequentially to avoid timing issues
  verbose: false, // Reduce test output noise
  // Bail on first failure to save time during development
  bail: 1,
};