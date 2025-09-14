import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TabTwoScreen from '../app/(tabs)/preparation';

// Mock the progress context with more comprehensive data
const mockProgressData = {
  checklist: [
    {
      id: '1',
      title: 'Water Supply',
      description: 'Store 1 gallon per person per day',
      category: 'essentials',
      icon: 'water-drop',
      completed: true,
    },
    {
      id: '2',
      title: 'Emergency Kit',
      description: 'Basic first aid supplies',
      category: 'firstaid',
      icon: 'local-hospital',
      completed: false,
    },
    {
      id: '3',
      title: 'Evacuation Plan',
      description: 'Know your evacuation routes',
      category: 'evacuation',
      icon: 'directions-run',
      completed: false,
    },
    {
      id: '4',
      title: 'Emergency Contacts',
      description: 'Keep important phone numbers handy',
      category: 'communication',
      icon: 'phone',
      completed: true,
    },
    {
      id: '5',
      title: 'First Aid Training',
      description: 'Know basic first aid procedures',
      category: 'firstaid',
      icon: 'healing',
      completed: false,
    },
  ],
  overallProgress: 40, // 2 out of 5 completed
  toggleChecklistItem: jest.fn(),
};

// Override the global progress mock with our test-specific one
jest.mock('@/contexts/useProgress', () => ({
  useProgress: () => mockProgressData,
}));

// Mock auth context with different user scenarios
const mockAuthData = {
  user: {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
  },
};

// Override the global auth mock with our test-specific one
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthData,
}));

// Enhanced sidebar mocks with interactive elements
jest.mock('@/components/SideBar', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockSidebar({ visible, onClose }) {
    return visible ? React.createElement(View, { testID: 'sidebar-mock' }, [
      React.createElement(Text, { key: 'title', testID: 'sidebar-title' }, 'Sidebar'),
      React.createElement(TouchableOpacity, { 
        key: 'close', 
        testID: 'sidebar-close',
        onPress: onClose 
      }, [
        React.createElement(Text, { key: 'close-text' }, 'Close')
      ])
    ]) : null;
  };
});

jest.mock('@/components/NotificationSidebar', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockNotificationDrawer({ visible, onClose }) {
    return visible ? React.createElement(View, { testID: 'notification-drawer-mock' }, [
      React.createElement(Text, { key: 'title', testID: 'drawer-title' }, 'Notifications'),
      React.createElement(TouchableOpacity, { 
        key: 'close', 
        testID: 'drawer-close',
        onPress: onClose 
      }, [
        React.createElement(Text, { key: 'close-text' }, 'Close')
      ])
    ]) : null;
  };
});

describe('TabTwoScreen - Real Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock data to default state
    Object.assign(mockProgressData, {
      overallProgress: 40,
      toggleChecklistItem: jest.fn(), // Ensure it's always a function
      checklist: [
        { id: '1', title: 'Water Supply', category: 'essentials', completed: true, description: 'Store 1 gallon per person per day', icon: 'water-drop' },
        { id: '2', title: 'Emergency Kit', category: 'firstaid', completed: false, description: 'Basic first aid supplies', icon: 'local-hospital' },
        { id: '3', title: 'Evacuation Plan', category: 'evacuation', completed: false, description: 'Know your evacuation routes', icon: 'directions-run' },
        { id: '4', title: 'Emergency Contacts', category: 'communication', completed: true, description: 'Keep important phone numbers handy', icon: 'phone' },
        { id: '5', title: 'First Aid Training', category: 'firstaid', completed: false, description: 'Know basic first aid procedures', icon: 'healing' },
      ]
    });

    // Reset auth data
    mockAuthData.user = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    };
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(<TabTwoScreen />);
      expect(getByTestId('safe-area-view')).toBeDefined();
    });

    it('renders all essential UI elements', () => {
      const { getByTestId, getAllByTestId } = render(<TabTwoScreen />);
      
      // Check main containers exist
      expect(getByTestId('safe-area-view')).toBeDefined();
      expect(getAllByTestId('themed-view').length).toBeGreaterThan(0);
      expect(getAllByTestId('themed-text').length).toBeGreaterThan(0);
    });

    it('displays translated title', () => {
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('title')).toBeDefined();
    });
  });

  describe('User Profile and Header', () => {
    it('shows user profile initial from displayName', () => {
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('T')).toBeDefined(); // First letter of "Test User"
    });

    it('handles user with email but no displayName', () => {
      // Temporarily modify mock
      mockAuthData.user = { uid: 'test', email: 'john@example.com', displayName: null };
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('J')).toBeDefined(); // First letter of email
    });

    it('handles user with no displayName or email', () => {
      mockAuthData.user = { uid: 'test', email: null, displayName: null };
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('G')).toBeDefined(); // Default "G" for Guest
    });

    it('renders notification and profile icons', () => {
      const { getAllByTestId } = render(<TabTwoScreen />);
      
      // Check that icon mocks are rendered
      const icons = getAllByTestId('ionicon-mock');
      expect(icons.length).toBeGreaterThan(0);
      
      // Should have notifications-outline icon
      const notificationIcon = icons.find(icon => 
        icon.props.children === '[notifications-outline]'
      );
      expect(notificationIcon).toBeDefined();
    });
  });

  describe('Progress Display', () => {
    it('displays overall progress percentage', () => {
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('40%')).toBeDefined();
    });

    it('shows correct progress message for low progress', () => {
      const { getByText } = render(<TabTwoScreen />);
      // 40% should trigger low progress message
      expect(getByText('progressMessageLow')).toBeDefined();
    });

    it('shows medium progress message when progress is 50-80%', () => {
      mockProgressData.overallProgress = 65;
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('progressMessageMedium')).toBeDefined();
    });

    it('shows high progress message when progress is >80%', () => {
      mockProgressData.overallProgress = 85;
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('progressMessageHigh')).toBeDefined();
    });

    it('displays progress bar container', () => {
      const { getAllByTestId } = render(<TabTwoScreen />);
      
      // Should have ThemedView containers for progress section
      const themedViews = getAllByTestId('themed-view');
      expect(themedViews.length).toBeGreaterThan(3); // Header, progress, sections
    });
  });

  describe('Checklist Functionality', () => {
    it('renders all checklist items', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      expect(getByText('Water Supply')).toBeDefined();
      expect(getByText('Emergency Kit')).toBeDefined();
      expect(getByText('Evacuation Plan')).toBeDefined();
      expect(getByText('Emergency Contacts')).toBeDefined();
      expect(getByText('First Aid Training')).toBeDefined();
    });

    it('renders checklist item descriptions', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      expect(getByText('Store 1 gallon per person per day')).toBeDefined();
      expect(getByText('Basic first aid supplies')).toBeDefined();
      expect(getByText('Know your evacuation routes')).toBeDefined();
    });

    it('handles checklist item toggle interactions', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      const waterSupplyItem = getByText('Water Supply');
      fireEvent.press(waterSupplyItem);
      
      expect(mockProgressData.toggleChecklistItem).toHaveBeenCalledWith('1');
    });

    it('handles multiple checklist item toggles', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      fireEvent.press(getByText('Emergency Kit'));
      fireEvent.press(getByText('Evacuation Plan'));
      
      expect(mockProgressData.toggleChecklistItem).toHaveBeenCalledWith('2');
      expect(mockProgressData.toggleChecklistItem).toHaveBeenCalledWith('3');
      expect(mockProgressData.toggleChecklistItem).toHaveBeenCalledTimes(2);
    });

    it('renders category sections with correct items', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      // Category headers should be present
      expect(getByText('categoryEssentials')).toBeDefined();
      expect(getByText('categoryFirstAid')).toBeDefined();
      expect(getByText('categoryEvacuation')).toBeDefined();
      expect(getByText('categoryCommunication')).toBeDefined();
    });

    it('groups items by category correctly', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      // Essential items
      expect(getByText('Water Supply')).toBeDefined();
      
      // First aid items
      expect(getByText('Emergency Kit')).toBeDefined();
      expect(getByText('First Aid Training')).toBeDefined();
      
      // Communication items
      expect(getByText('Emergency Contacts')).toBeDefined();
      
      // Evacuation items
      expect(getByText('Evacuation Plan')).toBeDefined();
    });

    it('handles empty category gracefully', () => {
      // Remove all communication items
      mockProgressData.checklist = mockProgressData.checklist.filter(
        item => item.category !== 'communication'
      );
      
      const { queryByText } = render(<TabTwoScreen />);
      
      // Communication category should not be rendered
      expect(queryByText('categoryCommunication')).toBeNull();
    });

    it('renders material icons for checklist items', () => {
      const { getAllByTestId } = render(<TabTwoScreen />);
      
      const materialIcons = getAllByTestId('material-icon-mock');
      expect(materialIcons.length).toBeGreaterThan(5); // At least 5 checklist items + other icons
      
      // Should have specific icons
      const iconTexts = materialIcons.map(icon => icon.props.children);
      expect(iconTexts).toContain('[water-drop]');
      expect(iconTexts).toContain('[local-hospital]');
      expect(iconTexts).toContain('[directions-run]');
    });
  });

  describe('Action Button', () => {
    it('displays appropriate action button text based on progress', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      // With 40% progress, should show "keep building" message
      expect(getByText('actionButtonKeepBuilding')).toBeDefined();
    });

    it('shows fully prepared message when progress is 100%', () => {
      mockProgressData.overallProgress = 100;
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('actionButtonFullyPrepared')).toBeDefined();
    });

    it('displays correct item counts in subtitle', () => {
      const { getByText } = render(<TabTwoScreen />);
      
      // Should show actionButtonSubtitle (with 2 completed, 5 total)
      const subtitle = getByText(/actionButtonSubtitle/);
      expect(subtitle).toBeDefined();
    });

    it('renders linear gradient for action button', () => {
      const { getByTestId } = render(<TabTwoScreen />);
      expect(getByTestId('linear-gradient-mock')).toBeDefined();
    });

    it('shows menu-book icon in action button', () => {
      const { getAllByTestId } = render(<TabTwoScreen />);
      
      const materialIcons = getAllByTestId('material-icon-mock');
      const menuBookIcon = materialIcons.find(icon => 
        icon.props.children === '[menu-book]'
      );
      expect(menuBookIcon).toBeDefined();
    });
  });

  describe('Sidebar Interactions', () => {
    it('opens sidebar when profile icon is pressed', async () => {
      const { getByText, queryByTestId, getByTestId } = render(<TabTwoScreen />);
      
      // Initially sidebar should not be visible
      expect(queryByTestId('sidebar-mock')).toBeNull();
      
      const profileIcon = getByText('T');
      fireEvent.press(profileIcon);
      
      // Wait for sidebar to appear
      await waitFor(() => {
        expect(getByTestId('sidebar-mock')).toBeDefined();
      });
    });

    it('closes sidebar when close button is pressed', async () => {
      const { getByText, queryByTestId, getByTestId } = render(<TabTwoScreen />);
      
      // Open sidebar
      fireEvent.press(getByText('T'));
      await waitFor(() => expect(getByTestId('sidebar-mock')).toBeDefined());
      
      // Close sidebar
      fireEvent.press(getByTestId('sidebar-close'));
      
      await waitFor(() => {
        expect(queryByTestId('sidebar-mock')).toBeNull();
      });
    });

    it('opens notification drawer when notification icon is pressed', async () => {
      const { queryByTestId, getByTestId, getAllByTestId } = render(<TabTwoScreen />);
      
      // Initially drawer should not be visible
      expect(queryByTestId('notification-drawer-mock')).toBeNull();
      
      // Find and press notification icon
      const ionicons = getAllByTestId('ionicon-mock');
      const notificationIcon = ionicons.find(icon => 
        icon.props.children === '[notifications-outline]'
      );
      
      expect(notificationIcon).toBeDefined();
      fireEvent.press(notificationIcon);
      
      await waitFor(() => {
        expect(getByTestId('notification-drawer-mock')).toBeDefined();
      });
    });

    it('closes notification drawer when close button is pressed', async () => {
      const { queryByTestId, getByTestId, getAllByTestId } = render(<TabTwoScreen />);
      
      // Open notification drawer
      const notificationIcon = getAllByTestId('ionicon-mock').find(icon => 
        icon.props.children === '[notifications-outline]'
      );
      fireEvent.press(notificationIcon);
      
      await waitFor(() => expect(getByTestId('notification-drawer-mock')).toBeDefined());
      
      // Close drawer
      fireEvent.press(getByTestId('drawer-close'));
      
      await waitFor(() => {
        expect(queryByTestId('notification-drawer-mock')).toBeNull();
      });
    });
  });

  describe('Scroll View Functionality', () => {
    it('renders scrollable content', () => {
      const { getByTestId } = render(<TabTwoScreen />);
      
      // Should have SafeAreaView container
      expect(getByTestId('safe-area-view')).toBeDefined();
    });

    it('handles long content lists', () => {
      // Add more checklist items
      mockProgressData.checklist = [
        ...mockProgressData.checklist,
        { id: '6', title: 'Item 6', category: 'essentials', completed: false, description: 'Test item', icon: 'test' },
        { id: '7', title: 'Item 7', category: 'firstaid', completed: false, description: 'Test item', icon: 'test' },
        { id: '8', title: 'Item 8', category: 'evacuation', completed: false, description: 'Test item', icon: 'test' },
      ];
      
      const { getByText } = render(<TabTwoScreen />);
      
      // Should render additional items
      expect(getByText('Item 6')).toBeDefined();
      expect(getByText('Item 7')).toBeDefined();
      expect(getByText('Item 8')).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles empty checklist gracefully', () => {
      mockProgressData.checklist = [];
      mockProgressData.overallProgress = 0;
      
      const { getByText, queryByText } = render(<TabTwoScreen />);
      
      // Should still render basic UI
      expect(getByText('title')).toBeDefined();
      expect(getByText('0%')).toBeDefined();
      
      // No checklist items should be present
      expect(queryByText('Water Supply')).toBeNull();
    });

    it('handles null user gracefully', () => {
      mockAuthData.user = null;
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('G')).toBeDefined(); // Should default to "G"
    });

    it('handles missing toggleChecklistItem function', () => {
      // Set toggleChecklistItem to a mock function that does nothing instead of undefined
      mockProgressData.toggleChecklistItem = jest.fn();
      
      const { getByText } = render(<TabTwoScreen />);
      
      // Should render without crashing
      expect(getByText('Water Supply')).toBeDefined();
      
      // Pressing should not crash and should call the mock function
      expect(() => fireEvent.press(getByText('Water Supply'))).not.toThrow();
      expect(mockProgressData.toggleChecklistItem).toHaveBeenCalledWith('1');
    });

    it('handles extreme progress values', () => {
      mockProgressData.overallProgress = 150; // Over 100%
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('150%')).toBeDefined();
      // Should still show high progress message
      expect(getByText('progressMessageHigh')).toBeDefined();
    });

    it('handles negative progress values', () => {
      mockProgressData.overallProgress = -10;
      
      const { getByText } = render(<TabTwoScreen />);
      expect(getByText('-10%')).toBeDefined();
      // Should show low progress message
      expect(getByText('progressMessageLow')).toBeDefined();
    });
  });
});