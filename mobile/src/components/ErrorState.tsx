import { Pressable, StyleSheet, Text, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Er ging iets mis</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable
          android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Opnieuw proberen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: androidDarkTheme.colors.errorContainer,
    borderColor: "#693747",
    borderWidth: 1,
    borderRadius: androidDarkTheme.radius.md,
    padding: 14,
    gap: 10
  },
  title: {
    color: androidDarkTheme.colors.onError,
    fontWeight: "700",
    fontSize: 15
  },
  message: {
    color: "#f6a6bb",
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#ff5f85",
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  buttonPressed: {
    opacity: 0.88
  },
  buttonText: {
    color: "#3a0719",
    fontWeight: "700",
    fontSize: 13
  }
});
