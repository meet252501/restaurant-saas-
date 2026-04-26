import { Redirect } from 'expo-router';
import { useSaaSStore } from '../lib/saas-store';
import { View } from 'react-native';

export default function Index() {
  const isLoaded = useSaaSStore(s => s.isLoaded);
  const appName = useSaaSStore(s => s.appName);

  if (!isLoaded) return <View style={{ flex: 1, backgroundColor: '#020617' }} />;
  
  // Redirect to login if not authenticated (handled by login screen or layout)
  return <Redirect href="/login" />;
}
