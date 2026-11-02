import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '../navigation/RootNavigator';
import { queryClient } from '../api/query';
import { ThemeProvider } from '../theme/ThemeProvider';

export function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <RootNavigator />
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
