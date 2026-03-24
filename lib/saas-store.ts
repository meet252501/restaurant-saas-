import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

interface SaaSState {
  appName: string;
  themeColor: ThemeColor;
  isLoaded: boolean;
  setAppName: (name: string) => void;
  setThemeColor: (color: ThemeColor) => void;
  loadFromStorage: () => Promise<void>;
}

export const useSaaSStore = create<SaaSState>((set, get) => ({
  appName: 'TableBook Setup',
  themeColor: 'emerald',
  isLoaded: false,
  setAppName: (name) => {
    set({ appName: name });
    if (Platform.OS === 'web') window.localStorage.setItem('saas_app_name', name);
    else AsyncStorage.setItem('saas_app_name', name).catch(() => {});
  },
  setThemeColor: (color) => {
    set({ themeColor: color });
    if (Platform.OS === 'web') window.localStorage.setItem('saas_theme_color', color);
    else AsyncStorage.setItem('saas_theme_color', color).catch(() => {});
  },
  loadFromStorage: async () => {
    if (get().isLoaded) return;
    try {
      let savedName = null;
      let savedColor = null;
      if (Platform.OS === 'web') {
        savedName = window.localStorage.getItem('saas_app_name');
        savedColor = window.localStorage.getItem('saas_theme_color');
      } else {
        savedName = await AsyncStorage.getItem('saas_app_name');
        savedColor = await AsyncStorage.getItem('saas_theme_color');
      }
      set({ 
        appName: savedName || 'TableBook Setup', 
        themeColor: (savedColor as ThemeColor) || 'emerald',
        isLoaded: true
      });
    } catch {
      set({ isLoaded: true });
    }
  }
}));
