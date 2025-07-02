import { useContext } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeContext } from '../components/ThemeContext';

export function useColorScheme(): ColorSchemeName {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.theme;
  return Appearance.getColorScheme() ?? 'light';
}
