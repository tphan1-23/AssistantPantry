import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Tabs, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import { migrateDatabase } from '@/services/database';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <SQLiteProvider databaseName="pantry.db" onInit={migrateDatabase}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#2f9e44',
            headerShown: useClientOnlyValue(false, true),
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Pantry',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'refrigerator', android: 'kitchen', web: 'kitchen' }}
                  tintColor={color}
                  size={28}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="scan"
            options={{
              title: 'Scan',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'camera', android: 'photo_camera', web: 'photo_camera' }}
                  tintColor={color}
                  size={28}
                />
              ),
            }}
          />
          <Tabs.Screen
            name="recipes"
            options={{
              title: 'Recipes',
              tabBarIcon: ({ color }) => (
                <SymbolView
                  name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
                  tintColor={color}
                  size={28}
                />
              ),
            }}
          />
        </Tabs>
      </ThemeProvider>
    </SQLiteProvider>
  );
}
