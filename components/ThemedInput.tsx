import { useThemeColor } from '@/hooks/useThemeColor';
import { TextInput, TextInputProps } from 'react-native';

type ThemedInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedInput({
  style,
  lightColor,
  darkColor,
  placeholderTextColor,
  ...otherProps
}: ThemedInputProps) {
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const placeholderColor = placeholderTextColor || useThemeColor({}, 'textSecondary');

  return (
    <TextInput
      style={[
        {
          color: textColor,
          backgroundColor,
          // borderWidth: 1,
          // borderColor: useThemeColor({}, 'border'),
          padding: 10,
          borderRadius: 8,
        },
        style,
      ]}
      placeholderTextColor={placeholderColor}
      {...otherProps}
    />
  );
}
