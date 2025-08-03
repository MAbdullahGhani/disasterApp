import { StatusBar } from 'expo-status-bar';
import { registerRootComponent } from 'expo';
import HomeScreen from './app/(tabs)';
import React from 'react';

export default function App() {
  return (
    <>
      <HomeScreen />
      <StatusBar style="auto" />
    </>
  );
}

registerRootComponent(App);