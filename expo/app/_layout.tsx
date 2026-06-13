import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import WebNavigation from "@/components/WebNavigation";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ParkingProvider } from "@/providers/ParkingProvider";
import { ThemeProvider, useColors } from "@/providers/ThemeProvider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const colors = useColors();
  const { currentUser } = useAuth();

  const stack = (
    <Stack
      screenOptions={{
        headerBackTitle: "\u041d\u0430\u0437\u0430\u0434",
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          color: colors.text,
          fontSize: 17,
          fontWeight: '700' as const,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="client-card" options={{ title: "\u041a\u043b\u0438\u0435\u043d\u0442", presentation: "modal" }} />
      <Stack.Screen name="exit-modal" options={{ title: "\u0412\u044b\u0435\u0437\u0434", presentation: "modal" }} />
      <Stack.Screen name="add-client-modal" options={{ title: "\u041d\u043e\u0432\u044b\u0439 \u043a\u043b\u0438\u0435\u043d\u0442", presentation: "modal" }} />
      <Stack.Screen name="pay-debt-modal" options={{ title: "\u041e\u043f\u043b\u0430\u0442\u0430 \u0434\u043e\u043b\u0433\u0430", presentation: "modal" }} />
      <Stack.Screen name="pay-monthly-modal" options={{ title: "\u041e\u043f\u043b\u0430\u0442\u0430 \u043c\u0435\u0441\u044f\u0446\u0430", presentation: "modal" }} />
      <Stack.Screen name="add-violation-modal" options={{ title: "\u041d\u043e\u0432\u043e\u0435 \u043d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u0435", presentation: "modal" }} />
      <Stack.Screen name="checkin-modal" options={{ title: "\u041e\u0444\u043e\u0440\u043c\u0438\u0442\u044c \u0437\u0430\u0435\u0437\u0434", presentation: "modal" }} />
      <Stack.Screen name="global-search" options={{ title: "\u041f\u043e\u0438\u0441\u043a", presentation: "modal" }} />
      <Stack.Screen name="debtors-screen" options={{ title: "\u0414\u043e\u043b\u0436\u043d\u0438\u043a\u0438" }} />
      <Stack.Screen name="cashregister-screen" options={{ title: "\u041a\u0430\u0441\u0441\u0430" }} />
      <Stack.Screen name="history-screen" options={{ title: "\u0418\u0441\u0442\u043e\u0440\u0438\u044f" }} />
      <Stack.Screen name="totalcash-screen" options={{ title: "\u041e\u0431\u0449\u0430\u044f \u043a\u0430\u0441\u0441\u0430" }} />
      <Stack.Screen name="violations-screen" options={{ title: "\u041d\u0430\u0440\u0443\u0448\u0435\u043d\u0438\u044f" }} />
    </Stack>
  );

  if (Platform.OS === 'web' && currentUser) {
    return (
      <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.background }}>
        <WebNavigation />
        <View style={{ flex: 1, minHeight: 0 }}>
          {stack}
        </View>
      </View>
    );
  }

  return stack;
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <ParkingProvider>
              <RootLayoutNav />
            </ParkingProvider>
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
