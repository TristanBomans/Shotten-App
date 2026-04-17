import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Laden..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={androidDarkTheme.colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10
  },
  text: {
    color: androidDarkTheme.colors.onSurfaceMuted,
    fontSize: 14
  }
});
