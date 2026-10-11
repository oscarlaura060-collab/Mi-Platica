import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { useAppStore } from '@/store/useAppStore';

function Boot() {
  const t = useTheme();
  const bootstrap = useAppStore((s) => s.bootstrap);
  const ready = useAppStore((s) => s.ready);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bootstrap().catch((e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, [bootstrap]);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.bg,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <ActivityIndicator color={t.danger} />
      </View>
    );
  }

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="light" />
          <Boot />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
