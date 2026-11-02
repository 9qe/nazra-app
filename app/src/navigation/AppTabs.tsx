import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { HomeMapScreen } from '../screens/HomeMap';
import { AlertDialogScreen } from '../screens/AlertDialog';
import { ReportScreen } from '../screens/Report';
import { RadarListScreen } from '../screens/RadarList';
import { SettingsScreen } from '../screens/Settings';
import type { AppTabParamList } from './types';
import { useTheme } from '../theme/useTheme';
import { useAppStatus } from '../store/useAppStatus';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_ICONS: Record<keyof AppTabParamList, string> = {
  HomeMap: '◎',
  Alerts: '⚠',
  Report: '+',
  RadarList: '☰',
  Settings: '⚙',
};

export function AppTabs() {
  const t = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.border,
          height: t.layout.tabBarHeight + 18,
          paddingBottom: 8,
        },
        tabBarLabel: ({ focused, color }) => (
          <Text
            style={[
              styles.tabLabel,
              StyleSheet.flatten(t.text.micro as object),
              { color, fontWeight: focused ? '700' : '500' },
            ]}
          >
            {route.name}
          </Text>
        ),
        tabBarIcon: ({ color, size }) => (
          <Text style={{ color, fontSize: Math.round(size * 0.95), lineHeight: Math.round(size * 1.1) }}>
            {TAB_ICONS[route.name as keyof AppTabParamList]}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="HomeMap" component={HomeMapScreen} />
      <Tab.Screen name="Alerts" component={AlertDialogScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="RadarList" component={RadarListScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: { fontSize: 10, letterSpacing: 0.2 },
});

/** Gate helper: onboarding screen mounts before tabs until onboarded flips true. */
export function useOnboardingGate(): boolean {
  return useAppStatus((st) => st.onboarded);
}
