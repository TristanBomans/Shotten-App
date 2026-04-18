import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SessionProvider } from "../../state/session-context";
import { androidDarkTheme } from "../../theme/androidDark";

export default function TabLayout() {
  return (
    <SessionProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: androidDarkTheme.colors.surface,
            borderTopColor: androidDarkTheme.colors.outline,
            borderTopWidth: 1,
            paddingBottom: 4,
            paddingTop: 2,
            height: 56,
          },
          tabBarActiveTintColor: androidDarkTheme.colors.primary,
          tabBarInactiveTintColor: androidDarkTheme.colors.onSurfaceMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            marginTop: -2,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          headerStyle: {
            backgroundColor: androidDarkTheme.colors.surface,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: androidDarkTheme.colors.onSurface,
          headerTitleStyle: {
            color: androidDarkTheme.colors.onSurface,
            fontWeight: "700",
            fontSize: 18,
          },
          headerShadowVisible: false,
          sceneStyle: {
            backgroundColor: androidDarkTheme.colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Wedstrijden",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="soccer" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="league"
          options={{
            title: "Klassement",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="format-list-numbered" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Instellingen",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SessionProvider>
  );
}