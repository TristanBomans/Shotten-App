import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { SessionProvider } from "../../state/session-context";
import { PreferencesProvider } from "../../state/preferences-context";
import { androidDarkTheme } from "../../theme/androidDark";

const t = androidDarkTheme;

function TabIcon({
  name,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabIconWrap}>
      {focused ? <View style={styles.activeIndicator} /> : null}
      <MaterialCommunityIcons name={name} size={24} color={color} />
    </View>
  );
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
            tabBarIconStyle: styles.tabBarIcon,
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
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="soccer" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="stats"
            options={{
              title: "Leaderboard",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="trophy" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="league"
            options={{
              title: "Standings",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="format-list-numbered" color={color} focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: "Settings",
              tabBarIcon: ({ color, focused }) => (
                <TabIcon name="cog" color={color} focused={focused} />
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
    marginTop: -2,
  },
  tabBarIcon: {
    marginTop: 2,
  },
  tabIconWrap: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    position: "relative",
    width: 48,
  },
  activeIndicator: {
    backgroundColor: t.colors.primaryMuted,
    borderRadius: t.radius.pill,
    height: 32,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
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