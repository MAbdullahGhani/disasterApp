const React = require('react');
const { Text } = require('react-native');

const createMockIconSet = (glyphMap, fontFamily) => {
  const MockIcon = (props) => {
    return React.createElement(Text, {
      ...props,
      children: props.name ? `[${props.name}]` : '[icon]',
      testID: `${fontFamily}-icon-mock`,
    });
  };
  MockIcon.displayName = `${fontFamily}Icon`;
  return MockIcon;
};

const createIconSetFromFontello = createMockIconSet;
const createIconSetFromIcoMoon = createMockIconSet;

// Mock the ensure native module function
const mockEnsureNativeModule = () => ({
  RNVectorIconsManager: {
    getImageSource: jest.fn().mockResolvedValue('mocked-image-source'),
    loadFont: jest.fn().mockResolvedValue(),
    getFontFamily: jest.fn().mockReturnValue('mocked-font-family'),
  }
});

module.exports = {
  createIconSet: createMockIconSet,
  createIconSetFromFontello,
  createIconSetFromIcoMoon,
  ensureNativeModuleAvailable: mockEnsureNativeModule,
};