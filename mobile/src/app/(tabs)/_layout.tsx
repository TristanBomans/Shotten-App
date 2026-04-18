import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SessionProvider } from "../../state/session-context";
import { PreferencesProvider } from "../../state/preferences-context";
import { androidDarkTheme } from "../../theme/androidDark";

export default function TabLayout() {
  return (
    <SessionProvider>
      <PreferencesProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: androidDarkTheme.colors.background,
            borderTopColor: "#111111",
            borderTopWidth: 0.5,
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
            backgroundColor: androidDarkTheme.colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomColor: androidDarkTheme.colors.outline,
            borderBottomWidth: 0.5,
          },
          headerTintColor: androidDarkTheme.colors.onSurface,
          headerTitleStyle: {
            color: androidDarkTheme.colors.onSurface,
            fontWeight: "700",
            fontSize: 18,
          },
          headerShadowVisible: false,
          headerTitleAlign: "left",
          sceneStyle: {
            backgroundColor: androidDarkTheme.colors.background,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Matches",
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
            title: "Standings",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="format-list-numbered" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </PreferencesProvider>
    </SessionProvider>
  );
}