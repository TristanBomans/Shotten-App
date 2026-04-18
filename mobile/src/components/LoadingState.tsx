import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color={t.colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: t.spacing.xxxl,
    gap: t.spacing.md,
  },
  text: {
    color: t.colors.onSurfaceDim,
    ...t.typography.bodySmall,
  },
});
