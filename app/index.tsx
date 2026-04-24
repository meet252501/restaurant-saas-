import { Redirect } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { View } from 'react-native';

export default function Index() {
  const isLoaded = useSaaSStore(s => s.isLoaded);
  const appName = useSaaSStore(s => s.appName);

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#020617' }} />;
  
  // If app is not setup yet, go to login (which handles onboarding)
  if (!appName || appName === 'TableBook Setup') {
    return <Redirect href="/login" />;
  }

  // Otherwise go to dashboard (which is protected by PinLock)
  return <Redirect href="/(tabs)" />;
}
