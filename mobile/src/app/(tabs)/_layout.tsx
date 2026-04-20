import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { SessionProvider } from "../../state/session-context";
import { PreferencesProvider } from "../../state/preferences-context";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;

function TabIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
}) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <SessionProvider>
      <PreferencesProvider>
        <Tabs
          screenOptions={{
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: t.colors.primary,
            tabBarInactiveTintColor: t.colors.onSurfaceDim,
            tabBarLabelStyle: styles.tabBarLabel,
            headerStyle: styles.header,
            headerTintColor: t.colors.onSurface,
            headerTitleStyle: styles.headerTitle,
            headerShadowVisible: false,
            headerTitleAlign: "left",
            sceneStyle: { backgroundColor: t.colors.background },
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: "Matches",
              tabBarIcon: ({ color }) => (
                <TabIcon name="soccer" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="stats"
            options={{
              title: "Leaderboard",
              tabBarIcon: ({ color }) => (
                <TabIcon name="trophy" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="league"
            options={{
              title: "Standings",
              tabBarIcon: ({ color }) => (
                <TabIcon name="format-list-numbered" color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ color }) => (
                <TabIcon name="cog" color={color} />
              ),
            }}
          />
        </Tabs>
      </PreferencesProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: t.colors.tabBarBg,
    borderTopColor: t.colors.tabBarBorder,
    borderTopWidth: 1,
    elevation: 0,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabBarLabel: {
    ...t.typography.tabLabel,
    marginTop: 2,
  },
  header: {
    backgroundColor: t.colors.background,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    color: t.colors.onSurface,
    ...t.typography.title,
  },
});