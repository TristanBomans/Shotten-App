import { Pressable, StyleSheet, Text, View } from "react-native";
import { androidDarkTheme } from "../theme/androidDark";

interface ResponseButtonsProps {
  currentState: "yes" | "no" | "undecided" | "unanswered";
  isUpdating: boolean;
  onYes: () => void;
  onNo: () => void;
}

export function ResponseButtons({ currentState, isUpdating, onYes, onNo }: ResponseButtonsProps) {
  const yesIsActive = currentState === "yes";
  const noIsActive = currentState === "no";

  return (
    <View style={styles.row}>
      <Pressable
        android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
        disabled={isUpdating}
        onPress={onYes}
        style={({ pressed }) => [
          styles.button,
          styles.yesButton,
          yesIsActive && styles.yesButtonActive,
          pressed && !isUpdating && styles.buttonPressed,
          isUpdating && styles.buttonDisabled
        ]}
      >
        <Text style={[styles.buttonText, yesIsActive && styles.activeButtonText]}>
          {isUpdating && yesIsActive ? "Opslaan..." : "Ja"}
        </Text>
      </Pressable>
      <Pressable
        android_ripple={{ color: androidDarkTheme.colors.ripple, borderless: false }}
        disabled={isUpdating}
        onPress={onNo}
        style={({ pressed }) => [
          styles.button,
          styles.noButton,
          noIsActive && styles.noButtonActive,
          pressed && !isUpdating && styles.buttonPressed,
          isUpdating && styles.buttonDisabled
        ]}
      >
        <Text style={[styles.buttonText, noIsActive && styles.activeButtonText]}>
          {isUpdating && noIsActive ? "Opslaan..." : "Nee"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  button: {
    alignItems: "center",
    borderRadius: androidDarkTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
    paddingVertical: 10
  },
  yesButton: {
    backgroundColor: androidDarkTheme.colors.successContainer,
    borderColor: "#2f5f44"
  },
  yesButtonActive: {
    backgroundColor: androidDarkTheme.colors.primary,
    borderColor: androidDarkTheme.colors.primary
  },
  noButton: {
    backgroundColor: androidDarkTheme.colors.errorContainer,
    borderColor: "#693747"
  },
  noButtonActive: {
    backgroundColor: "#ff5f85",
    borderColor: "#ff5f85"
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }]
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: androidDarkTheme.colors.onSurface,
    fontSize: 14,
    fontWeight: "700"
  },
  activeButtonText: {
    color: androidDarkTheme.colors.onPrimary
  }
});
