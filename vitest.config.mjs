import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react({
      babel: {
        presets: ['babel-preset-expo'],
        plugins: ['react-native-reanimated/plugin'],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./app/__tests__/setupTests.ts'],
    include: ['**/*.test.{ts,tsx}'],
    alias: [
      { find: 'react-native', replacement: 'react-native-web' },
      { find: /^@\/(.*)$/, replacement: resolve(__dirname, './$1') },
    ],
    deps: {
      inline: [
        'react-native',
        'react-native-web',
        'expo-router',
        'lucide-react-native',
        'nativewind',
        'tailwind-merge',
      ],
    },
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      '@': resolve(__dirname, './'),
    },
  },
});
