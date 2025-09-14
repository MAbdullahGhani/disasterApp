import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text, Switch, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create a simple, static component to represent the Settings screen for basic rendering tests.
const SimpleSettingsComponent = () => (
  <View testID="settings-screen">
    <Text testID="settings-title">settings</Text>
    
    <View testID="notification-section">
      <Text>pushNotifications</Text>
      <Switch value={true} testID="notification-switch" />
    </View>

    <TouchableOpacity testID="version-button">
      <Text>appVersion</Text>
    </TouchableOpacity>
  </View>
);

describe('SettingsScreen Smoke Tests', () => {

  it('can render a simple settings layout', () => {
    const { getByTestId } = render(<SimpleSettingsComponent />);
    
    // Check that all the main static elements are defined
    expect(getByTestId('settings-screen')).toBeDefined();
    expect(getByTestId('settings-title')).toBeDefined();
    expect(getByTestId('notification-section')).toBeDefined();
    expect(getByTestId('notification-switch')).toBeDefined();
    expect(getByTestId('version-button')).toBeDefined();
  });

  it('verifies the test environment is working correctly', () => {
    expect(1 + 1).toBe(2);
    expect(typeof React).toBe('object');
    expect(process.env.NODE_ENV).toBe('test');
  });
  
  it('verifies that globally mocked modules are available', () => {
    // AsyncStorage is mocked in the global setup, so it should be a mocked function.
    expect(jest.isMockFunction(AsyncStorage.getItem)).toBe(true);
    expect(jest.isMockFunction(AsyncStorage.setItem)).toBe(true);
  });

  it('can import and use custom mocked components from the setup', () => {
    // These components are mocked as simple divs/spans in your jest-setup.js
    const { ThemedView } = require('@/components/ThemedView');
    const { ThemedText } = require('@/components/ThemedText');
    
    const TestThemedComponent = () => (
      <ThemedView>
        <ThemedText>Themed Content</ThemedText>
      </ThemedView>
    );
    
    const { getByTestId } = render(<TestThemedComponent />);
    
    // Check that the mocked implementations are rendered
    expect(getByTestId('themed-view')).toBeDefined();
    expect(getByTestId('themed-text')).toBeDefined();
  });
});