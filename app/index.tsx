import { Redirect } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { View } from 'react-native';

export default function Index() {
  const isLoaded = useSaaSStore(s => s.isLoaded);
  const appName = useSaaSStore(s => s.appName);

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#0b0f0b' }} />;

  if (appName === 'TableBook Setup' || !appName) {
    return <Redirect href="/setup" />;
  }

  return <Redirect href="/(tabs)" />;
}
