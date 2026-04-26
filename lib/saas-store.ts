import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type ThemeColor = 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

interface User {
  id: number | string;
  name: string | null;
  email: string | null;
  role: string | null;
  restaurantId: string | null;
}

interface SaaSState {
  appName: string;
  themeColor: ThemeColor;
  activeModel: string;
  useGlassmorphism: boolean;
  masterPin: string;
  authToken: string | null;
  user: User | null;
  restaurantId: string | null;
  isLocked: boolean;
  isAuthenticated: boolean;
  isLoaded: boolean;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  setAppName: (name: string) => void;
  setThemeColor: (color: ThemeColor) => void;
  setActiveModel: (model: string) => void;
  setUseGlassmorphism: (enabled: boolean) => void;
  setMasterPin: (pin: string) => void;
  setSession: (token: string, user: User) => void;
  setLocked: (locked: boolean) => void;
  setAuthenticated: (authed: boolean) => void;
  logout: () => Promise<void>;
  resetAll: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useSaaSStore = create<SaaSState>((set, get) => ({
  appName: '',
  themeColor: 'emerald',
  activeModel: 'qwen2.5:0.5b',
  useGlassmorphism: true,
  masterPin: '1234',
  authToken: null,
  user: null,
  restaurantId: null,
  isLocked: true,
  isAuthenticated: false,
  isLoaded: false,
  baseUrl: 'http://localhost:3000',
  setBaseUrl: (url) => {
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    set({ baseUrl: cleanUrl });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_base_url', cleanUrl);
  },
  setAppName: (name) => {
    set({ appName: name });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_app_name', name);
  },
  setThemeColor: (color) => {
    set({ themeColor: color });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_theme_color', color);
  },
  setActiveModel: (model) => {
    set({ activeModel: model });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_active_model', model);
  },
  setUseGlassmorphism: (enabled) => {
    set({ useGlassmorphism: enabled });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_use_glass', enabled ? '1' : '0');
  },
  setMasterPin: (pin) => {
    set({ masterPin: pin });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_master_pin', pin);
  },
  setSession: (token, user) => {
    set({ authToken: token, user, restaurantId: user.restaurantId, isAuthenticated: true, isLocked: false });
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    storage.setItem('saas_token', token);
    storage.setItem('saas_user', JSON.stringify(user));
  },
  setLocked: (locked) => set({ isLocked: locked }),
  setAuthenticated: (authed) => set({ isAuthenticated: authed }),
  logout: async () => {
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    await Promise.all([
      storage.removeItem('saas_token'),
      storage.removeItem('saas_user')
    ]);
    set({ authToken: null, user: null, restaurantId: null, isAuthenticated: false, isLocked: true });
  },
  resetAll: async () => {
    const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
    await Promise.all([
      storage.removeItem('saas_app_name'),
      storage.removeItem('saas_theme_color'),
      storage.removeItem('saas_active_model'),
      storage.removeItem('saas_use_glass'),
      storage.removeItem('saas_master_pin'),
      storage.removeItem('saas_token'),
      storage.removeItem('saas_user'),
      storage.removeItem('saas_base_url')
    ]);
    set({
      appName: 'TableBook Setup',
      themeColor: 'emerald',
      activeModel: 'qwen2.5:0.5b',
      useGlassmorphism: true,
      masterPin: '1234',
      authToken: null,
      user: null,
      restaurantId: null,
      isAuthenticated: false,
      isLocked: true,
      baseUrl: 'http://localhost:3000'
    });
  },
  loadFromStorage: async () => {
    if (get().isLoaded) return;
    try {
      const storage = Platform.OS === 'web' ? window.localStorage : AsyncStorage;
      const [name, color, model, glass, pin, token, userStr, savedBaseUrl] = await Promise.all([
        storage.getItem('saas_app_name'),
        storage.getItem('saas_theme_color'),
        storage.getItem('saas_active_model'),
        storage.getItem('saas_use_glass'),
        storage.getItem('saas_master_pin'),
        storage.getItem('saas_token'),
        storage.getItem('saas_user'),
        storage.getItem('saas_base_url'),
      ]);

      const user = userStr ? JSON.parse(userStr) : null;

      set({ 
        appName: name || 'TableBook Setup', 
        themeColor: (color as ThemeColor) || 'emerald',
        activeModel: model || 'qwen2.5:0.5b',
        useGlassmorphism: glass === null ? true : glass === '1',
        masterPin: pin || '1234',
        authToken: token,
        user,
        restaurantId: user?.restaurantId || null,
        isAuthenticated: !!token,
        baseUrl: savedBaseUrl || 'http://localhost:3000',
        isLoaded: true
      });
    } catch {
      set({ isLoaded: true });
    }
  }
}));
