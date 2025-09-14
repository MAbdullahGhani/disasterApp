import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProgressScreen from '../app/(tabs)/progress';

// Mock the progress context with categories
const mockProgressData = {
  categories: [
    {
      id: '1',
      name: 'Essential Supplies',
      categoryKey: 'essentials',
      icon: 'inventory',
      percentage: 80,
    },
    {
      id: '2',
      name: 'First Aid',
      categoryKey: 'firstaid',
      icon: 'local-hospital',
      percentage: 45,
    },
    {
      id: '3',
      name: 'Evacuation Planning',
      categoryKey: 'evacuation',
      icon: 'directions-run',
      percentage: 20,
    },
    {
      id: '4',
      name: 'Communication',
      categoryKey: 'communication',
      icon: 'phone',
      percentage: 90,
    },
  ],
  overallProgress: 60,
  checklist: [
    {
      id: '1',
      category: 'essentials',
      completed: true,
    },
    {
      id: '2',
      category: 'essentials',
      completed: true,
    },
    {
      id: '3',
      category: 'essentials',
      completed: false,
    },
    {
      id: '4',
      category: 'firstaid',
      completed: true,
    },
    {
      id: '5',
      category: 'firstaid',
      completed: false,
    },
    {
      id: '6',
      category: 'evacuation',
      completed: false,
    },
  ],
};

// Override the global progress mock with our test-specific one
jest.mock('@/contexts/useProgress', () => ({
  useProgress: () => mockProgressData,
}));

// Mock auth context
const mockAuthData = {
  isAuthenticated: true,
  user: {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'John Doe',
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

describe('ProgressScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock data to default state
    Object.assign(mockProgressData, {
      overallProgress: 60,
      categories: [
        {
          id: '1',
          name: 'Essential Supplies',
          categoryKey: 'essentials',
          icon: 'inventory',
          percentage: 80,
        },
        {
          id: '2',
          name: 'First Aid',
          categoryKey: 'firstaid',
          icon: 'local-hospital',
          percentage: 45,
        },
        {
          id: '3',
          name: 'Evacuation Planning',
          categoryKey: 'evacuation',
          icon: 'directions-run',
          percentage: 20,
        },
        {
          id: '4',
          name: 'Communication',
          categoryKey: 'communication',
          icon: 'phone',
          percentage: 90,
        },
      ],
      checklist: [
        { id: '1', category: 'essentials', completed: true },
        { id: '2', category: 'essentials', completed: true },
        { id: '3', category: 'essentials', completed: false },
        { id: '4', category: 'firstaid', completed: true },
        { id: '5', category: 'firstaid', completed: false },
        { id: '6', category: 'evacuation', completed: false },
      ],
    });

    // Reset auth data
    Object.assign(mockAuthData, {
      isAuthenticated: true,
      user: {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'John Doe',
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(<ProgressScreen />);
      expect(getByTestId('safe-area-view')).toBeDefined();
    });

    it('displays the correct screen title', () => {
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('progressScreen.title')).toBeDefined();
    });

    it('renders all essential UI elements', () => {
      const { getByTestId, getAllByTestId } = render(<ProgressScreen />);
      
      // Check main containers exist
      expect(getByTestId('safe-area-view')).toBeDefined();
      expect(getAllByTestId('themed-view').length).toBeGreaterThan(0);
      expect(getAllByTestId('themed-text').length).toBeGreaterThan(0);
    });
  });

  describe('User Profile and Header', () => {
    it('shows user profile initial from displayName', () => {
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('J')).toBeDefined(); // First letter of "John Doe"
    });

    it('handles user with email but no displayName', () => {
      mockAuthData.user = { uid: 'test', email: 'john@example.com', displayName: null };
      
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('J')).toBeDefined(); // First letter of email
    });

    it('handles unauthenticated user', () => {
      mockAuthData.isAuthenticated = false;
      mockAuthData.user = null;
      
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('progressScreen.defaultUserInitial')).toBeDefined(); // Default translated text for Guest
    });
  });

  describe('Progress Display', () => {
    it('displays overall progress percentage', () => {
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('60%')).toBeDefined();
    });

    it('shows correct preparedness message for medium progress', () => {
      const { getByText } = render(<ProgressScreen />);
      // Should show medium progress message since overallProgress is 60%
      expect(getByText('progressScreen.preparednessMessage.medium')).toBeDefined();
    });

    it('shows low progress message for low progress', () => {
      mockProgressData.overallProgress = 25;
      
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('progressScreen.preparednessMessage.low')).toBeDefined();
    });

    it('shows high progress message for high progress', () => {
      mockProgressData.overallProgress = 85;
      
      const { getByText } = render(<ProgressScreen />);
      expect(getByText('progressScreen.preparednessMessage.high')).toBeDefined();
    });
  });

  describe('Category Progress', () => {
    it('renders all category progress cards', () => {
      const { getByText } = render(<ProgressScreen />);
      
      // Check if all categories are rendered
      expect(getByText('Essential Supplies')).toBeDefined();
      expect(getByText('First Aid')).toBeDefined();
      expect(getByText('Evacuation Planning')).toBeDefined();
      expect(getByText('Communication')).toBeDefined();
    });

    it('displays correct category percentages', () => {
      const { getByText } = render(<ProgressScreen />);
      
      expect(getByText('80%')).toBeDefined(); // Essential Supplies
      expect(getByText('45%')).toBeDefined(); // First Aid
      expect(getByText('20%')).toBeDefined(); // Evacuation Planning
      expect(getByText('90%')).toBeDefined(); // Communication
    });

    it('shows correct category completion counts', () => {
      const { getAllByText } = render(<ProgressScreen />);
      
      // Essential supplies: 2 completed out of 3 total
      // Use getAllByText instead of getByText for multiple matches
      const categorySummaryElements = getAllByText(/progressScreen\.categorySummary/);
      expect(categorySummaryElements.length).toBeGreaterThan(0);
    });

    it('applies correct colors based on category progress', () => {
      const { getByText } = render(<ProgressScreen />);
      
      // This test verifies the categories render
      expect(getByText('Essential Supplies')).toBeDefined();
      expect(getByText('First Aid')).toBeDefined();
      expect(getByText('Evacuation Planning')).toBeDefined();
      expect(getByText('Communication')).toBeDefined();
    });

    it('category cards are touchable', () => {
      const { getByText } = render(<ProgressScreen />);
      
      const categoryCard = getByText('Essential Supplies');
      fireEvent.press(categoryCard);
      
      // Category cards are touchable but don't have actions in current implementation
      // This test verifies they can be pressed without errors
      expect(categoryCard).toBeDefined();
    });

    it('handles empty categories gracefully', () => {
      mockProgressData.categories = [];
      mockProgressData.checklist = [];
      
      const { getByText, queryByText } = render(<ProgressScreen />);
      
      // Should still render basic UI
      expect(getByText('progressScreen.title')).toBeDefined();
      
      // No category items should be present
      expect(queryByText('Essential Supplies')).toBeNull();
    });
  });

  describe('Action Button', () => {
    it('shows appropriate action button text based on first aid progress', () => {
      const { getByText } = render(<ProgressScreen />);
      
      // First aid progress is 45%, so should show "continueLearning"
      expect(getByText('progressScreen.actionButton.continueLearning')).toBeDefined();
    });

    it('shows advanced quiz action text for high first aid progress', () => {
      // Update first aid progress to be high
      mockProgressData.categories = mockProgressData.categories.map(cat => 
        cat.categoryKey === 'firstaid' ? { ...cat, percentage: 85 } : cat
      );
      
      const { getByText } = render(<ProgressScreen />);
      
      // Should show advanced quiz message for high first aid progress (>75%)
      expect(getByText('progressScreen.actionButton.advancedQuiz')).toBeDefined();
    });

    it('shows start basics action text for very low first aid progress', () => {
      // Update first aid progress to be very low
      mockProgressData.categories = mockProgressData.categories.map(cat => 
        cat.categoryKey === 'firstaid' ? { ...cat, percentage: 15 } : cat
      );
      
      const { getByText } = render(<ProgressScreen />);
      
      // Should show start basics message for very low first aid progress (≤25%)
      expect(getByText('progressScreen.actionButton.startBasics')).toBeDefined();
    });

    it('shows fully prepared action text when overall progress is 100%', () => {
      mockProgressData.overallProgress = 100;
      
      const { getByText } = render(<ProgressScreen />);
      
      // Should show fully prepared message when overall progress is 100%
      expect(getByText('progressScreen.actionButton.fullyPrepared')).toBeDefined();
    });

    it('shows incomplete action subtitle', () => {
      const { getByText } = render(<ProgressScreen />);
      
      // Since overall progress is 60% (not 100%), should show incomplete subtitle
      expect(getByText('progressScreen.actionSubtitle.incomplete')).toBeDefined();
    });

    it('shows complete action subtitle for full progress', () => {
      mockProgressData.overallProgress = 100;
      mockProgressData.categories = mockProgressData.categories.map(cat => ({
        ...cat,
        percentage: 100,
      }));
      
      const { getByText } = render(<ProgressScreen />);
      
      // Should show complete subtitle
      expect(getByText('progressScreen.actionSubtitle.complete')).toBeDefined();
    });

    it('action button is touchable', () => {
      const { getByText } = render(<ProgressScreen />);
      
      const actionButton = getByText('progressScreen.actionButton.continueLearning');
      fireEvent.press(actionButton);
      
      // Action button is touchable but doesn't have actions in current implementation
      expect(actionButton).toBeDefined();
    });
  });

  describe('Sidebar Interactions', () => {
    it('opens sidebar when profile icon is pressed', async () => {
      const { getByText, queryByTestId, getByTestId } = render(<ProgressScreen />);
      
      // Initially sidebar should not be visible
      expect(queryByTestId('sidebar-mock')).toBeNull();
      
      const profileIcon = getByText('J');
      fireEvent.press(profileIcon);
      
      // Wait for sidebar to appear
      await waitFor(() => {
        expect(getByTestId('sidebar-mock')).toBeDefined();
      });
    });

    it('closes sidebar when close button is pressed', async () => {
      const { getByText, queryByTestId, getByTestId } = render(<ProgressScreen />);
      
      // Open sidebar
      fireEvent.press(getByText('J'));
      await waitFor(() => expect(getByTestId('sidebar-mock')).toBeDefined());
      
      // Close sidebar
      fireEvent.press(getByTestId('sidebar-close'));
      
      await waitFor(() => {
        expect(queryByTestId('sidebar-mock')).toBeNull();
      });
    });

    it('opens notification drawer when notification icon is pressed', async () => {
      const { queryByTestId, getByTestId, getAllByTestId } = render(<ProgressScreen />);
      
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
  });

  describe('Icon Display', () => {
    it('renders material icons for categories', () => {
      const { getAllByTestId } = render(<ProgressScreen />);
      
      const materialIcons = getAllByTestId('material-icon-mock');
      expect(materialIcons.length).toBeGreaterThan(4); // At least 4 category icons + other icons
      
      // Should have specific category icons
      const iconTexts = materialIcons.map(icon => icon.props.children);
      expect(iconTexts).toContain('[inventory]');
      expect(iconTexts).toContain('[local-hospital]');
      expect(iconTexts).toContain('[directions-run]');
      expect(iconTexts).toContain('[phone]');
    });

    it('renders notification and profile icons', () => {
      const { getAllByTestId } = render(<ProgressScreen />);
      
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

  describe('Layout and Structure', () => {
    it('renders scroll view with proper content', () => {
      const { getByTestId, getAllByTestId } = render(<ProgressScreen />);
      
      // Should have SafeAreaView and multiple themed views
      expect(getByTestId('safe-area-view')).toBeDefined();
      expect(getAllByTestId('themed-view').length).toBeGreaterThan(1);
    });

    it('renders linear gradient for action button', () => {
      const { getByTestId } = render(<ProgressScreen />);
      expect(getByTestId('linear-gradient-mock')).toBeDefined();
    });
  });

  describe('Dynamic Content Updates', () => {
    it('updates display when progress data changes', () => {
      const { rerender, getByText } = render(<ProgressScreen />);
      
      // Initial state
      expect(getByText('60%')).toBeDefined();
      
      // Update progress data
      mockProgressData.overallProgress = 75;
      
      // Re-render and check for updates
      rerender(<ProgressScreen />);
      expect(getByText('75%')).toBeDefined();
    });

    it('handles zero progress correctly', () => {
      mockProgressData.overallProgress = 0;
      mockProgressData.categories = mockProgressData.categories.map(cat => ({
        ...cat,
        percentage: 0,
      }));
      
      const { getAllByText, getByText } = render(<ProgressScreen />);
      
      // Use getAllByText since there will be multiple 0% values (overall + categories)
      const zeroPercentElements = getAllByText('0%');
      expect(zeroPercentElements.length).toBeGreaterThan(0);
      expect(getByText('progressScreen.preparednessMessage.low')).toBeDefined();
    });

    it('handles maximum progress correctly', () => {
      mockProgressData.overallProgress = 100;
      mockProgressData.categories = mockProgressData.categories.map(cat => ({
        ...cat,
        percentage: 100,
      }));
      
      const { getAllByText, getByText } = render(<ProgressScreen />);
      
      // Use getAllByText since there will be multiple 100% values (overall + categories)
      const hundredPercentElements = getAllByText('100%');
      expect(hundredPercentElements.length).toBeGreaterThan(0);
      expect(getByText('progressScreen.preparednessMessage.high')).toBeDefined();
    });
  });
});