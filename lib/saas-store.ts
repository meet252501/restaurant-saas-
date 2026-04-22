import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

interface SaaSState {
  appName: string;
  themeColor: ThemeColor;
  activeModel: string;
  isLoaded: boolean;
  setAppName: (name: string) => void;
  setThemeColor: (color: ThemeColor) => void;
  setActiveModel: (model: string) => void;
  loadFromStorage: () => Promise<void>;
}

export const useSaaSStore = create<SaaSState>((set, get) => ({
  appName: 'TableBook Setup',
  themeColor: 'emerald',
  activeModel: 'qwen2.5:0.5b',
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
  setActiveModel: (model) => {
    set({ activeModel: model });
    if (Platform.OS === 'web') window.localStorage.setItem('saas_active_model', model);
    else AsyncStorage.setItem('saas_active_model', model).catch(() => {});
  },
  loadFromStorage: async () => {
    if (get().isLoaded) return;
    try {
      let savedName = null;
      let savedColor = null;
      let savedModel = null;
      if (Platform.OS === 'web') {
        savedName = window.localStorage.getItem('saas_app_name');
        savedColor = window.localStorage.getItem('saas_theme_color');
        savedModel = window.localStorage.getItem('saas_active_model');
      } else {
        savedName = await AsyncStorage.getItem('saas_app_name');
        savedColor = await AsyncStorage.getItem('saas_theme_color');
        savedModel = await AsyncStorage.getItem('saas_active_model');
      }
      set({ 
        appName: savedName || 'TableBook Setup', 
        themeColor: (savedColor as ThemeColor) || 'emerald',
        activeModel: savedModel || 'qwen2.5:0.5b',
        isLoaded: true
      });
    } catch {
      set({ isLoaded: true });
    }
  }
}));
