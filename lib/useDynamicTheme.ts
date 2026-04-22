import { useSaaSStore, ThemeColor } from './saas-store';

type ThemeValues = {
  primary: string;
  primaryDim: string;
  surface: string;
  background: string;
};

const THEMES: Record<ThemeColor, ThemeValues> = {
  emerald: {
    primary: '#10b981', // Emerald 500
    primaryDim: 'rgba(16, 185, 129, 0.1)',
    surface: '#18181b',
    background: '#09090b',
  },
  blue: {
    primary: '#3b82f6', // Blue 500
    primaryDim: 'rgba(59, 130, 246, 0.1)',
    surface: '#18181b',
    background: '#09090b',
  },
  rose: {
    primary: '#f43f5e', // Rose 500
    primaryDim: 'rgba(244, 63, 94, 0.1)',
    surface: '#18181b',
    background: '#09090b',
  },
  amber: {
    primary: '#f59e0b', // Amber 500
    primaryDim: 'rgba(245, 158, 11, 0.1)',
    surface: '#18181b',
    background: '#09090b',
  },
  violet: {
    primary: '#8b5cf6', // Violet 500
    primaryDim: 'rgba(139, 92, 246, 0.1)',
    surface: '#18181b',
    background: '#09090b',
  }
};

export function useDynamicTheme() {
  const themeColor = useSaaSStore(state => state.themeColor);
  return THEMES[themeColor] || THEMES.emerald;
}
