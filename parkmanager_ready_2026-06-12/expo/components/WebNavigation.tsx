import { usePathname, useRouter } from "expo-router";
import { LayoutDashboard, CarFront, ParkingCircle, Users, Menu } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { useColors } from "@/providers/ThemeProvider";

type WebNavItem = {
  href: "/" | "/checkin" | "/parking" | "/clients" | "/more";
  label: string;
  icon: React.ElementType<{ size: number; color: string }>;
  isActive: (pathname: string) => boolean;
};

const WEB_NAV_ITEMS: WebNavItem[] = [
  {
    href: "/",
    label: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f",
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === "/" || pathname === "",
  },
  {
    href: "/checkin",
    label: "\u0417\u0430\u0435\u0437\u0434",
    icon: CarFront,
    isActive: (pathname) => pathname.startsWith("/checkin"),
  },
  {
    href: "/parking",
    label: "\u041f\u0430\u0440\u043a\u043e\u0432\u043a\u0430",
    icon: ParkingCircle,
    isActive: (pathname) => pathname.startsWith("/parking"),
  },
  {
    href: "/clients",
    label: "\u041a\u043b\u0438\u0435\u043d\u0442\u044b",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/clients"),
  },
  {
    href: "/more",
    label: "\u0415\u0449\u0435",
    icon: Menu,
    isActive: (pathname) => pathname.startsWith("/more"),
  },
];

export default function WebNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isCompact = width < 600;
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.nav, isCompact && styles.navCompact]}>
      <View style={[styles.inner, isCompact && styles.innerCompact]}>
        {WEB_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);
          const color = active ? colors.primary : colors.textSecondary;

          return (
            <TouchableOpacity
              key={item.href}
              style={[styles.item, isCompact && styles.itemCompact, active && styles.itemActive]}
              onPress={() => router.push(item.href)}
              activeOpacity={0.75}
            >
              <Icon size={isCompact ? 17 : 18} color={color} />
              <Text
                style={[styles.label, isCompact && styles.labelCompact, active && styles.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    nav: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 10,
      flexShrink: 0,
    },
    navCompact: {
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    inner: {
      width: '100%',
      maxWidth: 1280,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    innerCompact: {
      gap: 4,
    },
    item: {
      minHeight: 44,
      minWidth: 116,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: 'transparent',
    },
    itemCompact: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      flexDirection: 'column',
      gap: 2,
      paddingHorizontal: 4,
      paddingVertical: 5,
    },
    itemActive: {
      backgroundColor: colors.primary + '18',
    },
    label: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    labelCompact: {
      fontSize: 11,
      maxWidth: '100%',
    },
    labelActive: {
      color: colors.primary,
    },
  });
}
