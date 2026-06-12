import { Tabs, useRouter } from "expo-router";
import { LayoutDashboard, CarFront, ParkingCircle, Users, Menu } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useColors } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const isNavigating = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser && !isNavigating.current) {
      isNavigating.current = true;
      console.log('[TabLayout] No user, redirecting to login');
      setTimeout(() => {
        router.replace('/login');
        setTimeout(() => { isNavigating.current = false; }, 500);
      }, 50);
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        sceneStyle: { backgroundColor: colors.background },
        tabBarStyle: Platform.OS === 'web' ? { display: 'none' } : {
          display: 'flex',
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 72,
          paddingTop: 6,
          paddingBottom: 10,
          elevation: 0,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600' as const,
          letterSpacing: 0.1,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: "\u0417\u0430\u0435\u0437\u0434",
          tabBarIcon: ({ color, size }) => <CarFront size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="parking"
        options={{
          title: "\u041f\u0430\u0440\u043a\u043e\u0432\u043a\u0430",
          tabBarIcon: ({ color, size }) => <ParkingCircle size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "\u041a\u043b\u0438\u0435\u043d\u0442\u044b",
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "\u0415\u0449\u0435",
          tabBarIcon: ({ color, size }) => <Menu size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
