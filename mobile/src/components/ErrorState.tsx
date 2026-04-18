import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { androidDarkTheme } from "../theme/androidDark";

const t = androidDarkTheme;

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle-outline" size={24} color={t.colors.errorAccent} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {onRetry ? (
        <Pressable
          android_ripple={{ color: "rgba(255, 95, 133, 0.12)", borderless: false }}
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: t.colors.errorContainer,
    borderRadius: t.radius.md,
    flexDirection: "row",
    gap: t.spacing.md,
    padding: t.spacing.lg,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: t.colors.onError,
    fontWeight: "700",
    fontSize: 14,
  },
  message: {
    color: t.colors.onError,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    opacity: 0.8,
  },
  button: {
    backgroundColor: t.colors.errorAccent,
    borderRadius: t.radius.pill,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#1a0008",
    fontWeight: "700",
    fontSize: 13,
  },
});
