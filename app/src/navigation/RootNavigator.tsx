import { NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { OnboardingScreen } from '../screens/Onboarding';
import { AboutScreen } from '../screens/About';
import { SearchScreen } from '../screens/Search';
import { RoutePreviewScreen } from '../screens/RoutePreview';
import { NavigationScreen } from '../screens/Navigation';
import { AppTabs, useOnboardingGate } from './AppTabs';
import type { RootStackParamList } from './types';
import { useTheme } from '../theme/useTheme';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const t = useTheme();
  const onboarded = useOnboardingGate();
  const navTheme: Theme = {
    dark: true,
    colors: {
      primary: t.colors.primary,
      background: t.colors.background,
      card: t.colors.surface,
      text: t.colors.textPrimary,
      border: t.colors.border,
      notification: t.colors.accent,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: '700' as const },
      heavy: { fontFamily: 'System', fontWeight: '800' as const },
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootStack.Navigator screenOptions={{ headerShown: false, contentStyle: styles.stackContent }}>
        {onboarded ? (
          <>
            <RootStack.Screen name="Tabs" component={AppTabs} />
            <RootStack.Screen
              name="About"
              component={AboutScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen name="Search" component={SearchScreen} />
            <RootStack.Screen name="RoutePreview" component={RoutePreviewScreen} />
            <RootStack.Screen name="Navigation" component={NavigationScreen} />
          </>
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  stackContent: { backgroundColor: 'transparent' },
});
