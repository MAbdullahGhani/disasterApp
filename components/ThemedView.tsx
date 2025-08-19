import { I18nManager, View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  disableRTL?: boolean; // Option to disable RTL for specific cases
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  flexDirection,
  disableRTL = false,
  ...otherProps 
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  // Handle RTL flex direction
  const getRTLFlexDirection = () => {
    if (disableRTL || !flexDirection) return flexDirection;
    
    if (I18nManager.isRTL && flexDirection === 'row') {
      return 'row-reverse';
    }
    
    return flexDirection;
  };

  const rtlStyle = {
    flexDirection: getRTLFlexDirection(),
  };

  return (
    <View 
      style={[
        { backgroundColor }, 
        rtlStyle,
        style
      ]} 
      {...otherProps} 
    />
  );
}