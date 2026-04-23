// Redirect old analytics route to Today's Dashboard
import { Redirect } from 'expo-router';
export default function AnalyticsRedirect() {
  return <Redirect href="/today" />;
}
