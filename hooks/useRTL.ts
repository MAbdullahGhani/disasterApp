import { I18nManager } from 'react-native';

export const useRTL = () => {
  const isRTL = I18nManager.isRTL;

  const getTextAlign = (align?: 'left' | 'right' | 'center' | 'justify') => {
    if (!align || align === 'center' || align === 'justify') return align;
    
    if (isRTL) {
      return align === 'left' ? 'right' : 'left';
    }
    return align;
  };

  const getFlexDirection = (direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse') => {
    if (!direction || direction !== 'row') return direction;
    return isRTL ? 'row-reverse' : 'row';
  };

  const getMargin = (left?: number, right?: number) => {
    if (isRTL) {
      return {
        marginLeft: right,
        marginRight: left,
      };
    }
    return {
      marginLeft: left,
      marginRight: right,
    };
  };

  const getPadding = (left?: number, right?: number) => {
    if (isRTL) {
      return {
        paddingLeft: right,
        paddingRight: left,
      };
    }
    return {
      paddingLeft: left,
      paddingRight: right,
    };
  };

  const getPosition = (left?: number, right?: number) => {
    if (isRTL) {
      return {
        left: right,
        right: left,
      };
    }
    return {
      left: left,
      right: right,
    };
  };

  return {
    isRTL,
    getTextAlign,
    getFlexDirection,
    getMargin,
    getPadding,
    getPosition,
  };
};