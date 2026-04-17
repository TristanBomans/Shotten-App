import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { androidDarkTheme } from "../theme/androidDark";

export default function RootLayout() {
  const { colors } = androidDarkTheme;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.surface} />
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: colors.background
          },
          headerStyle: {
            backgroundColor: colors.surface
          },
          headerTintColor: colors.onSurface,
          headerTitleStyle: {
            color: colors.onSurface,
            fontWeight: "700"
          },
          headerShadowVisible: false,
          statusBarStyle: "light"
        }}
      >
        <Stack.Screen name="index" options={{ title: "Kies speler" }} />
        <Stack.Screen name="matches" options={{ title: "Upcoming matches" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
