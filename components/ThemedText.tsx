import { I18nManager, StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
  textAlign?: 'left' | 'right' | 'center' | 'justify' | 'auto';
  disableRTL?: boolean; // Option to disable RTL for specific cases
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  textAlign,
  disableRTL = false,
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  // Determine text alignment based on RTL and props
  const getTextAlign = () => {
    if (disableRTL) return textAlign;
    
    if (textAlign) {
      // If specific alignment is provided, respect RTL flipping
      if (I18nManager.isRTL) {
        switch (textAlign) {
          case 'left': return 'right';
          case 'right': return 'left';
          default: return textAlign;
        }
      }
      return textAlign;
    }
    
    // Default text alignment based on RTL
    return I18nManager.isRTL ? 'right' : 'left';
  };

  const rtlStyle = {
    textAlign: getTextAlign(),
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
  };

  return (
    <Text
      style={[
        { color },
        rtlStyle,
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});