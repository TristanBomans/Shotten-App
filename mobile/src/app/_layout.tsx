import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { androidDarkTheme } from "../theme/androidDark";

export default function RootLayout() {
  const { colors } = androidDarkTheme;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.onSurface,
          headerTitleStyle: { color: colors.onSurface, fontWeight: "700" },
          headerShadowVisible: false,
          statusBarStyle: "light",
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player-management" options={{ title: "Manage Players" }} />
        <Stack.Screen name="respond-as-player" options={{ title: "Respond as Player" }} />
        <Stack.Screen name="version-history" options={{ title: "Version History" }} />
      </Stack>
    </SafeAreaProvider>
  );
}